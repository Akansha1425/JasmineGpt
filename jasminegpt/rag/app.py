"""
JasmineGPT RAG Sidecar — FastAPI Application
==============================================
Port: 8000

Endpoints:
  GET  /health
  POST /rag/general        — General jasmine RAG retrieval
  POST /rag/postharvest    — Post-harvest RAG retrieval + evidence gating
  POST /route              — Top-level domain routing only (no retrieval)
  POST /entities           — Entity extraction from a question

This sidecar is called by the Node.js backend (port 4000).
It NEVER calls the LLM — that is the backend's responsibility.
"""
from __future__ import annotations
import fastapi
import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure local modules are importable
sys.path.insert(0, os.path.dirname(__file__))

from general_rag import GeneralRAG
from postharvest_rag import PostHarvestRAG
from router import (
    extract_entities,
    is_profile_statement,
    looks_context_dependent,
    route_top_level,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("jasminegpt.rag")

# ─────────────────────────────────────────────────────────────────────────────
# Singletons
# ─────────────────────────────────────────────────────────────────────────────
general_rag = GeneralRAG()
postharvest_rag = PostHarvestRAG()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("JasmineGPT RAG sidecar starting up...")
    general_rag.initialize()
    postharvest_rag.initialize()
    logger.info("RAG sidecar ready.")
    yield
    logger.info("RAG sidecar shutting down.")


app = FastAPI(
    title="JasmineGPT RAG Sidecar",
    description="Evidence-grounded retrieval for the JasmineGPT conversational assistant.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow calls from the Node.js backend
BACKEND_ORIGIN = os.getenv("BACKEND_ORIGIN", "http://localhost:4000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[BACKEND_ORIGIN, "http://localhost:4000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=20)
    memory: dict[str, Any] | None = Field(default=None)
    species: str | None = Field(default=None)
    cultivar: str | None = Field(default=None)
    allow_cross_species: bool = Field(default=False)


class RouteRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    memory: dict[str, Any] | None = Field(default=None)


class EntityRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "general_rag_ready": general_rag._ready,
        "postharvest_rag_ready": postharvest_rag._ready,
    }


@app.post("/route")
async def route_question(req: RouteRequest):
    """Top-level routing only — returns MEMORY_UPDATE | GENERAL_RAG | POSTHARVEST."""
    try:
        route = route_top_level(req.question, memory=req.memory)
        entities = extract_entities(req.question)
        return {
            "route": route,
            "is_profile_statement": is_profile_statement(req.question),
            "is_context_dependent": looks_context_dependent(req.question),
            "entities": entities,
        }
    except Exception as exc:
        logger.exception("Error in /route: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/rag/general")
async def general_retrieve(req: QueryRequest):
    """General jasmine RAG retrieval."""
    if not general_rag._ready:
        raise HTTPException(status_code=503, detail="General RAG not ready")
    try:
        # Resolve target species from request, memory, or default
        species = req.species
        if not species and req.memory and isinstance(req.memory, dict):
            species = req.memory.get("species")
        if not species:
            species = "Jasminum sambac"

        result = general_rag.retrieve(
            req.query,
            top_k=req.top_k,
            species=species,
            allow_cross_species=req.allow_cross_species,
        )
        return result
    except Exception as exc:
        logger.exception("Error in /rag/general: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/rag/postharvest")
async def postharvest_retrieve(req: QueryRequest):
    """Post-harvest RAG retrieval with evidence gating."""
    if not postharvest_rag._ready:
        raise HTTPException(status_code=503, detail="PostHarvest RAG not ready")
    try:
        result = postharvest_rag.retrieve(req.query)
        return result
    except Exception as exc:
        logger.exception("Error in /rag/postharvest: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/entities")
async def extract_entity(req: EntityRequest):
    """Extract species, cultivar, and domain entities from text."""
    entities = extract_entities(req.text)
    return entities


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("RAG_PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
