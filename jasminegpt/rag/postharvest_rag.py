"""
JasmineGPT — Post-Harvest RAG Service
======================================
Handles retrieval and evidence validation for the 5-paper production corpus.
Uses hybrid semantic (sentence-transformers) + lexical (TF-IDF) retrieval,
restricted to routed documents only.

Source: JasmineGPT_Final_PostHarvest_Evidence_Grounded_RAG_v2.ipynb
"""
from __future__ import annotations

import logging
import os
import re
from typing import Any

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

from verified_profiles import (
    PRODUCTION_DOCS,
    VERIFIED_PROFILES,
    get_profile_text,
)
from router import route_postharvest_query

logger = logging.getLogger(__name__)

SEMANTIC_WEIGHT = 0.65
LEXICAL_WEIGHT = 0.35
TOP_K_CHUNKS = 8
EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def _build_corpus_chunks() -> pd.DataFrame:
    """
    Build text chunks from verified profiles for embedding.
    Each fact + context block becomes a chunk tied to its document.
    """
    rows = []
    chunk_id = 0
    for doc_id in PRODUCTION_DOCS:
        p = VERIFIED_PROFILES[doc_id]
        # Chunk 0: full profile text
        rows.append({
            "chunk_id": chunk_id,
            "document_id": doc_id,
            "page": 0,
            "text": get_profile_text(doc_id),
            "chunk_type": "profile",
        })
        chunk_id += 1
        # Individual fact chunks
        for fact in p["verified_facts"]:
            rows.append({
                "chunk_id": chunk_id,
                "document_id": doc_id,
                "page": 0,
                "text": f"{p['title']} ({doc_id}): {fact}",
                "chunk_type": "fact",
            })
            chunk_id += 1
        # Concept chunk
        rows.append({
            "chunk_id": chunk_id,
            "document_id": doc_id,
            "page": 0,
            "text": (
                f"{p['title']} — key concepts: "
                + ", ".join(p["concepts"] + p["aliases"])
            ),
            "chunk_type": "concepts",
        })
        chunk_id += 1

    return pd.DataFrame(rows)


class PostHarvestRAG:
    def __init__(self) -> None:
        self._ready = False
        self.chunks_df: pd.DataFrame | None = None
        self.X_sem: np.ndarray | None = None
        self.X_lex = None
        self.vectorizer: TfidfVectorizer | None = None
        self.embedder = None

    def initialize(self) -> None:
        """Load embedding model and build in-memory hybrid index from profiles."""
        logger.info("Initializing PostHarvestRAG...")

        # Lazy import to avoid startup delay if not used
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise RuntimeError(
                "sentence-transformers not installed. Run: pip install sentence-transformers"
            ) from exc

        self.chunks_df = _build_corpus_chunks()
        texts = self.chunks_df["text"].tolist()

        logger.info(f"Loading embedding model: {EMBED_MODEL_NAME}")
        self.embedder = SentenceTransformer(EMBED_MODEL_NAME)

        logger.info("Encoding %d post-harvest chunks...", len(texts))
        self.X_sem = self.embedder.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True,
        ).astype("float32")

        self.vectorizer = TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),
            min_df=1,
            max_df=0.98,
            sublinear_tf=True,
        )
        self.X_lex = self.vectorizer.fit_transform(texts)

        self._ready = True
        logger.info("PostHarvestRAG ready. %d chunks indexed.", len(texts))

    def _retrieve_chunks(
        self,
        query: str,
        allowed_docs: list[str],
        top_k: int = TOP_K_CHUNKS,
    ) -> list[dict]:
        assert self._ready, "Call initialize() first"
        if not allowed_docs:
            return []

        q_emb = self.embedder.encode(
            [query], normalize_embeddings=True, convert_to_numpy=True
        )[0].astype("float32")
        sem_scores = self.X_sem @ q_emb

        q_lex = self.vectorizer.transform([query])
        lex_scores = (self.X_lex @ q_lex.T).toarray().ravel()
        if lex_scores.max() > 0:
            lex_scores = lex_scores / lex_scores.max()

        df = self.chunks_df.copy()
        df["semantic_score"] = sem_scores
        df["lexical_score"] = lex_scores
        df["hybrid_score"] = (
            SEMANTIC_WEIGHT * df["semantic_score"]
            + LEXICAL_WEIGHT * df["lexical_score"]
        )
        df = df[df["document_id"].isin(allowed_docs)].copy()
        top = df.sort_values("hybrid_score", ascending=False).head(top_k)
        return top[
            ["chunk_id", "document_id", "page", "hybrid_score", "text"]
        ].to_dict(orient="records")

    def _build_evidence_packet(self, query: str, route: dict) -> dict:
        if route["status"] == "INSUFFICIENT_EVIDENCE":
            return {"documents": [], "chunks": [], "profile_facts": []}

        selected = route["selected_docs"]
        rchunks = self._retrieve_chunks(query, selected, TOP_K_CHUNKS)

        docs = []
        for rank, doc_id in enumerate(selected, 1):
            p = VERIFIED_PROFILES[doc_id]
            docs.append({
                "rank": rank,
                "document_id": doc_id,
                "title": p["title"],
                "authors": p["authors"],
                "year": p["year"],
                "doi": p["doi"],
                "species": p["species"],
                "cultivar": p["cultivar"],
                "limitations": p["limitations"],
                "route_reasons": route.get("route_reasons", {}).get(doc_id, []),
            })

        return {
            "documents": docs,
            "chunks": rchunks,
            "profile_facts": [
                {
                    "document_id": doc_id,
                    "facts": VERIFIED_PROFILES[doc_id]["verified_facts"],
                }
                for doc_id in selected
            ],
        }

    def _validate_evidence(self, route: dict, packet: dict) -> dict:
        """Evidence gating gate — determines if LLM may be called."""
        if route["status"] == "INSUFFICIENT_EVIDENCE":
            return {
                "supported": False,
                "status": "INSUFFICIENT_EVIDENCE",
                "message": route["reason"],
            }
        # Manually-verified profile facts count as direct evidence
        if packet["profile_facts"] and packet["documents"]:
            return {
                "supported": True,
                "status": route["status"],
                "message": "Direct source profile exists; chunks are supplemental textual evidence.",
            }
        if packet["chunks"]:
            return {
                "supported": True,
                "status": route["status"],
                "message": "Textual evidence retrieved from routed documents.",
            }
        return {
            "supported": False,
            "status": "SOURCE_REVIEW_REQUIRED",
            "message": "The routed document was found but no usable extracted text was available.",
        }

    def retrieve(self, query: str) -> dict[str, Any]:
        """
        Full post-harvest retrieval pipeline.

        Returns:
          route_status: DIRECT_EVIDENCE | MULTIPLE_STUDIES | INSUFFICIENT_EVIDENCE
          evidence_status: same as route_status or SOURCE_REVIEW_REQUIRED
          supported: bool — whether LLM may be called
          selected_docs: list of doc IDs
          documents: list of document metadata dicts
          chunks: list of retrieved text chunks
          profile_facts: list of verified fact blocks
          reason: (if INSUFFICIENT_EVIDENCE)
          species, domains, concepts, temperatures, question_type
        """
        assert self._ready, "Call initialize() first"
        route = route_postharvest_query(query)
        packet = self._build_evidence_packet(query, route)
        evidence = self._validate_evidence(route, packet)

        return {
            "route_status": route["status"],
            "evidence_status": evidence["status"],
            "supported": evidence["supported"],
            "llm_called": False,  # set by caller after LLM call
            "selected_docs": route.get("selected_docs", []),
            "species": route.get("species", []),
            "domains": route.get("domains", []),
            "concepts": route.get("concepts", []),
            "temperatures": route.get("temperatures", []),
            "question_type": route.get("question_type", "general"),
            "documents": packet["documents"],
            "chunks": packet["chunks"][:5],  # top 5 for response
            "profile_facts": packet["profile_facts"],
            "reason": route.get("reason", ""),
            "evidence_message": evidence.get("message", ""),
        }
