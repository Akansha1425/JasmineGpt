"""
JasmineGPT — Post-Harvest Query Router
=======================================
Ported verbatim from:
  JasmineGPT_Final_PostHarvest_Evidence_Grounded_RAG_v2.ipynb
  JasmineGPT_Phase1_Conversational_Memory_Colab_UPDATED_v1_1.ipynb

This module handles:
  1. Top-level domain routing: MEMORY_UPDATE / GENERAL_RAG / POSTHARVEST
  2. Post-harvest evidence gating: DIRECT_EVIDENCE / MULTIPLE_STUDIES / INSUFFICIENT_EVIDENCE
  3. Profile-statement detection (Phase 1.1)
  4. Follow-up context dependency detection (Phase 1.4)

DO NOT modify the routing logic without regression testing against cases A-I.
"""
from __future__ import annotations
import re
from typing import Any
from verified_profiles import (
    VERIFIED_PROFILES,
    PRODUCTION_DOCS,
    SUPPORTED_TEMPERATURES_C,
)

# ─────────────────────────────────────────────────────────────────────────────
# Constants (ported from v2 notebook)
# ─────────────────────────────────────────────────────────────────────────────
TOP_K_DOCS = 4

SPECIES_ALIASES: dict[str, list[str]] = {
    "Jasminum sambac": [
        "jasminum sambac", "sambac", "gundumalli", "ramanathapuram gundumalli",
    ],
    "Jasminum auriculatum": [
        "jasminum auriculatum", "auriculatum", "pacha mullai",
    ],
}

# Post-harvest domain patterns — triggers POSTHARVEST routing
POSTHARVEST_DOMAIN_PATTERNS: dict[str, list[str]] = {
    "storage": [
        r"\bstor(?:e|ing|age)\b", r"\bcold stor", r"\brefrigerat",
        r"\btemperature", r"\bhow long can", r"\bshelf life",
        r"\bkeep.*fresh", r"\bpreserv", r"\bdegrees? c",
        r"\bdegree c", r"\bcold room",
    ],
    "packaging": [
        r"\bpackag", r"\bpack\b", r"\bpolythene", r"\bpolyethylene",
        r"\bfilm\b", r"\bbox\b", r"\bthermocol", r"\bchitosan",
        r"\bmycelium", r"\beps\b", r"\bmicron", r"\bgauge",
    ],
    "transportation": [
        r"\btransport", r"\bshipping", r"\bexport", r"\breefer",
        r"\bair.*transport", r"\blong[- ]distance", r"\bjourney", r"\btransit",
    ],
    "harvesting": [
        r"\bharvesting\b", r"\bpluck(?:ing)?\b", r"\bcollect(?:ion|ed)?\b",
        r"\bpick(?:ing)?\b", r"\bharvest time\b", r"\bharvest timing\b",
        r"\bwhen should (?:i|we) harvest\b",
    ],
}

# General-RAG domain terms — triggers GENERAL_RAG routing
GENERAL_DOMAIN_TERMS: dict[str, list[str]] = {
    "pest": [
        "pest", "pesticide", "insecticide", "bud worm", "thrips",
        "mite", "aphid", "whitefly", "borer",
    ],
    "nutrition": [
        "fertilizer", "fertiliser", "npk", "nutrition", "fertigation",
        "micronutrient", "manure", "compost",
    ],
    "irrigation": [
        "irrigation", "drip", "water stress", "watering", "soil moisture",
    ],
    "pruning": [
        "pruning", "prune", "off season", "flowering strategy", "bloom",
        "defoliation", "paclobutrazol",
    ],
    "disease": [
        "disease", "fungicide", "leaf spot", "virus", "pathogen", "blight",
    ],
    "breeding": [
        "chromosome", "mutagen", "genotype", "floral biology", "speciation",
        "breeding",
    ],
    "variety": [
        "varieties", "morphological", "qualitative", "visual flower quality",
    ],
}

CONCEPT_PATTERNS: dict[str, list[str]] = {
    "mycelium":       ["mycelium", "mycelium foam"],
    "passive_map":    ["passive map", "modified atmosphere package", "passive modified atmosphere"],
    "boric_acid":     ["boric acid", "4% boric acid", "4 percent boric"],
    "sixty_micron":   ["60 micron", "60 µm", "60 um"],
    "gundumalli":     ["gundumalli", "ramanathapuram gundumalli"],
    "pacha_mullai":   ["pacha mullai"],
    "chitosan":       ["chitosan", "chitosan glycerol", "chitosan-tween", "tween 80"],
    "export_gel_ice": ["gel ice", "reefer van", "new jersey", "export packaging"],
}

QUESTION_PATTERNS: dict[str, list[str]] = {
    "temperature_tested": [
        r"what temperatures?$", r"what temperatures were tested",
        r"temperatures were tested", r"what temperature.*tested",
        r"temperature.*storage",
    ],
    "best_method": [
        r"best .*packag", r"best .*storage",
        r"which .*packag", r"which .*treatment",
    ],
}

# Phase 1.4 — context-dependency patterns (deterministic follow-up detection)
CONTEXT_REFERENCE_PATTERNS = [
    r"\bit\b",
    r"\bthis\b",
    r"\bthat\b",
    r"\bthese\b",
    r"\bthose\b",
    r"\bthe packaging\b",
    r"\bthe treatment\b",
    r"\bthe method\b",
    r"\bthe flowers\b",
    r"\bthe storage\b",
    r"\bthe temperature\b",
    r"\bthe bags?\b",
    r"\bthe results?\b",
    r"\bthe study\b",
    r"\bhow long did\b",
    r"\bwhat temperature (?:was|were|is|are)\b",
    r"\bwhat packaging (?:was|were|is|are)\b",
    r"\bhow was .* packaged\b",
    r"\bwas .* heat[- ]sealed\b",
    r"\bwas .* heat sealed\b",
    r"\bwhat was .* used\b",
    r"\bwhat was the\b",
    r"\bwhich .* does this\b",
    r"\bwhat about\b",
]

# Phase 1.1 — profile statement patterns (update memory, skip RAG)
PROFILE_PATTERNS = [
    r"^i grow ",
    r"^i am growing ",
    r"^i'm growing ",
    r"^my crop is ",
    r"^i cultivate ",
    r"^i am cultivating ",
    r"^i'm cultivating ",
    r"^my farm (?:has|grows|produces) ",
    r"^i (?:mainly |primarily )?(?:farm|grow) ",
    r"^we grow ",
    r"^we cultivate ",
    r"^our crop is ",
    r"^our farm grows ",
    r"^i (?:have |own )?a jasmine farm",
    r"^my jasmine (?:variety|cultivar|crop|farm) is ",
]

# Species / cultivar entity extraction (Phase 1.3)
PHASE1_SPECIES: dict[str, str] = {
    "ramanathapuram gundumalli": "Jasminum sambac",
    "jasminum sambac": "Jasminum sambac",
    "gundumalli": "Jasminum sambac",
    "sambac": "Jasminum sambac",
    "double mogra": "Jasminum sambac",
    "single mogra": "Jasminum sambac",
    "mogra": "Jasminum sambac",
    "arabian jasmine": "Jasminum sambac",
    "pacha mullai": "Jasminum auriculatum",
    "jasminum auriculatum": "Jasminum auriculatum",
    "auriculatum": "Jasminum auriculatum",
    "mullai": "Jasminum auriculatum",
    "juhi": "Jasminum auriculatum",
    "jasminum grandiflorum": "Jasminum grandiflorum",
    "grandiflorum": "Jasminum grandiflorum",
    "royal jasmine": "Jasminum grandiflorum",
    "jathimalli": "Jasminum grandiflorum",
    "pitchi": "Jasminum grandiflorum",
    "jasminum multiflorum": "Jasminum multiflorum",
    "multiflorum": "Jasminum multiflorum",
    "star jasmine": "Jasminum multiflorum",
    "kakada": "Jasminum multiflorum",
}

PHASE1_CULTIVARS: dict[str, str] = {
    "ramanathapuram gundumalli": "Ramanathapuram Gundumalli",
    "gundumalli": "Gundumalli",
    "pacha mullai": "Pacha Mullai ecotype",
    "double mogra": "Double Mogra",
    "single mogra": "Single Mogra",
    "mogra": "Mogra",
    "muthu mullai": "Muthu Mullai",
}

PHASE1_DOMAIN_TERMS: dict[str, list[str]] = {
    "packaging": [
        "packaging", "package", "packing", "bag", "polythene", "polyethylene",
        "micron", "thermocol", "chitosan", "mycelium",
    ],
    "storage": [
        "storage", "store", "cold storage", "temperature", "shelf life",
        "freshness",
    ],
    "transportation": [
        "transport", "transportation", "long-distance", "export",
        "gel ice", "reefer",
    ],
    "pest": [
        "pest", "pesticide", "insecticide", "bud worm", "thrips",
        "mite", "aphid", "whitefly",
    ],
    "nutrition": [
        "fertilizer", "fertiliser", "npk", "nutrition", "fertigation",
    ],
    "irrigation": ["irrigation", "drip", "water stress", "watering"],
    "pruning": ["pruning", "prune", "off season", "flowering", "bloom"],
    "disease": ["disease", "fungicide", "leaf spot", "virus", "pathogen"],
}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _norm(s: str) -> str:
    s = str(s).lower()
    s = re.sub(r"[^a-z0-9.]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


# ─────────────────────────────────────────────────────────────────────────────
# Phase 1.1 — Profile statement detection
# ─────────────────────────────────────────────────────────────────────────────
def is_profile_statement(question: str) -> bool:
    """Return True only for explicit farmer profile/context statements.
    These update conversation memory WITHOUT triggering RAG retrieval.
    Intentionally narrow — do not include 'I have ... jasmine' which can
    describe pest/disease problems."""
    q = question.lower().strip()
    return any(re.match(pat, q) for pat in PROFILE_PATTERNS)


# ─────────────────────────────────────────────────────────────────────────────
# Phase 1.3 — Entity extraction
# ─────────────────────────────────────────────────────────────────────────────
def extract_entities(text: str) -> dict[str, Any]:
    q = text.lower()
    species = None
    cultivar = None
    for alias, canonical in sorted(
        PHASE1_SPECIES.items(), key=lambda x: len(x[0]), reverse=True
    ):
        if alias in q:
            species = canonical
            break
    for alias, canonical in sorted(
        PHASE1_CULTIVARS.items(), key=lambda x: len(x[0]), reverse=True
    ):
        if alias in q:
            cultivar = canonical
            break
    domains: list[str] = []
    for d, terms in PHASE1_DOMAIN_TERMS.items():
        if any(term in q for term in terms):
            domains.append(d)
    return {"species": species, "cultivar": cultivar, "domains": domains}


# ─────────────────────────────────────────────────────────────────────────────
# Phase 1.4 — Follow-up context dependency
# ─────────────────────────────────────────────────────────────────────────────
def looks_context_dependent(question: str) -> bool:
    """Detect questions that naturally depend on previous turns."""
    q = question.lower().strip()
    return any(re.search(pat, q) for pat in CONTEXT_REFERENCE_PATTERNS)


def is_followup_question(question: str) -> bool:
    q = question.strip()
    low = q.lower()
    if looks_context_dependent(q):
        return True
    words = q.split()
    if len(words) <= 7 and any(
        w in low for w in ["how", "what", "which", "where"]
    ):
        return True
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Post-harvest routing helpers (ported from v2 notebook)
# ─────────────────────────────────────────────────────────────────────────────
def _detect_species(q: str) -> list[str]:
    qn = _norm(q)
    hits = []
    for species, aliases in SPECIES_ALIASES.items():
        if any(a in qn for a in aliases):
            hits.append(species)
    return hits


def _detect_postharvest_domains(q: str) -> list[str]:
    qn = _norm(q)
    out = []
    for d, pats in POSTHARVEST_DOMAIN_PATTERNS.items():
        if any(re.search(p, qn) for p in pats):
            out.append(d)
    return out


def _detect_concepts(q: str) -> list[str]:
    qn = _norm(q)
    out = []
    for c, aliases in CONCEPT_PATTERNS.items():
        if any(_norm(a) in qn for a in aliases):
            out.append(c)
    return out


def _detect_question_type(q: str) -> str:
    qn = _norm(q)
    for qt, pats in QUESTION_PATTERNS.items():
        if any(re.search(p, qn) for p in pats):
            return qt
    return "general"


def _extract_temperatures(q: str) -> list[float]:
    qn = q.lower().replace("°", " ")
    temps = []
    for m in re.finditer(r"(?<!\d)(-?\d+(?:\.\d+)?)\s*(?:degrees?\s*)?c\b", qn):
        try:
            temps.append(float(m.group(1)))
        except ValueError:
            pass
    return sorted(set(temps))


def _doc_profile_matches(
    doc_id: str,
    q: str,
    species: list[str],
    domains: list[str],
    concepts: list[str],
) -> tuple[float, list[str]]:
    p = VERIFIED_PROFILES[doc_id]
    score = 0.0
    reasons: list[str] = []
    if species and p["species"] in species:
        score += 5.0
        reasons.append("species")
    if any(d in p["domains"] for d in domains):
        score += 3.0 * sum(d in p["domains"] for d in domains)
        reasons.append("domain")
    for c in concepts:
        joined = _norm(" ".join(p["concepts"] + p["aliases"]))
        aliases = CONCEPT_PATTERNS.get(c, [c])
        if any(_norm(a) in joined for a in aliases):
            score += 6.0
            reasons.append(c)
    if "storage" in domains and "storage" in p["domains"]:
        score += 2.0
    if "post_harvest" in p["domains"]:
        score += 0.5
    return score, sorted(set(reasons))


# ─────────────────────────────────────────────────────────────────────────────
# Top-level domain router
# ─────────────────────────────────────────────────────────────────────────────
def is_general_rag_question(q: str) -> bool:
    """True if the question belongs to the general-RAG domain (pests, nutrition, etc.)"""
    qn = q.lower()
    for domain, terms in GENERAL_DOMAIN_TERMS.items():
        if any(term in qn for term in terms):
            return True
    return False


def is_postharvest_question(q: str) -> bool:
    """True if the question belongs to the post-harvest domain."""
    qn = _norm(q)
    postharvest_domains = _detect_postharvest_domains(q)
    # exclude harvesting — gated to INSUFFICIENT_EVIDENCE but still postharvest
    return bool(postharvest_domains)


def route_top_level(
    question: str,
    memory: dict | None = None,
) -> str:
    """
    Returns: MEMORY_UPDATE | GENERAL_RAG | POSTHARVEST

    Note: POSTHARVEST may further resolve to INSUFFICIENT_EVIDENCE inside
    route_postharvest_query(). This function only determines the top-level domain.
    """
    if is_profile_statement(question):
        return "MEMORY_UPDATE"

    # Use memory context if available
    ph_domains = _detect_postharvest_domains(question)
    gen_question = is_general_rag_question(question)

    # Post-harvest takes priority when domain is clear
    if ph_domains:
        # But if it's also a general-RAG topic (e.g. "pest treatment")
        # and NOT a post-harvest concept, prefer GENERAL_RAG
        if gen_question and not any(
            d in ph_domains for d in ["packaging", "storage", "transportation", "harvesting"]
        ):
            return "GENERAL_RAG"
        return "POSTHARVEST"

    if gen_question:
        return "GENERAL_RAG"

    # If memory says last route was POSTHARVEST and question looks like a follow-up
    if memory and memory.get("last_route") == "POSTHARVEST" and looks_context_dependent(question):
        return "POSTHARVEST"

    # Default to GENERAL_RAG for jasmine questions without clear domain
    return "GENERAL_RAG"


# ─────────────────────────────────────────────────────────────────────────────
# Post-harvest evidence router (ported verbatim from v2 notebook route_query())
# ─────────────────────────────────────────────────────────────────────────────
def route_postharvest_query(q: str) -> dict[str, Any]:
    """
    Routes a post-harvest question against the 5-paper production corpus.

    Returns a dict with:
      status: DIRECT_EVIDENCE | MULTIPLE_STUDIES | INSUFFICIENT_EVIDENCE
      selected_docs: list[str]
      reason: str (for INSUFFICIENT_EVIDENCE)
      species, domains, concepts, temperatures, question_type
    """
    species = _detect_species(q)
    domains = _detect_postharvest_domains(q)
    concepts = _detect_concepts(q)
    qtype = _detect_question_type(q)
    temperatures = _extract_temperatures(q)

    base = {
        "species": species,
        "domains": domains,
        "concepts": concepts,
        "temperatures": temperatures,
        "question_type": qtype,
    }

    # ── Safety gate: harvesting not in production corpus ──────────────────
    if "harvesting" in domains:
        return {
            **base,
            "status": "INSUFFICIENT_EVIDENCE",
            "selected_docs": [],
            "route_reasons": {},
            "reason": "No selected production document contains direct harvesting evidence.",
        }

    # ── Score all production documents ────────────────────────────────────
    scored: list[tuple[float, str, list[str]]] = []
    for doc_id in PRODUCTION_DOCS:
        s, r = _doc_profile_matches(doc_id, q, species, domains, concepts)
        scored.append((s, doc_id, r))
    scored.sort(reverse=True)

    # ── Concept routing gate ──────────────────────────────────────────────
    concept_supported_docs: list[tuple[float, str, list[str]]] = []
    for score, doc_id, reasons in scored:
        if concepts and all(c in reasons for c in concepts):
            concept_supported_docs.append((score, doc_id, reasons))

    if concepts and not concept_supported_docs:
        return {
            **base,
            "status": "INSUFFICIENT_EVIDENCE",
            "selected_docs": [],
            "route_reasons": {},
            "reason": "The requested concept is not present in the selected production corpus.",
        }

    # ── Temperature gate ──────────────────────────────────────────────────
    if temperatures:
        temp_supported: list[tuple[float, str, list[str]]] = []
        for score, doc_id, reasons in scored:
            supported_temps = SUPPORTED_TEMPERATURES_C.get(doc_id, [])
            species_ok = (not species) or (
                VERIFIED_PROFILES[doc_id]["species"] in species
            )
            if species_ok and all(
                any(abs(t - s) < 1e-9 for s in supported_temps)
                for t in temperatures
            ):
                if "storage" in domains or "storage" in VERIFIED_PROFILES[doc_id]["domains"]:
                    temp_supported.append((score, doc_id, reasons))
        if not temp_supported:
            return {
                **base,
                "status": "INSUFFICIENT_EVIDENCE",
                "selected_docs": [],
                "route_reasons": {},
                "reason": f"No included study explicitly reports the requested temperature condition(s): {temperatures}.",
            }
        scored = temp_supported

    # ── Select documents ──────────────────────────────────────────────────
    route_reasons = {doc_id: reasons for _, doc_id, reasons in scored}

    if concepts and concept_supported_docs:
        selected = concept_supported_docs[:TOP_K_DOCS]
        status = "DIRECT_EVIDENCE" if len(selected) == 1 else "MULTIPLE_STUDIES"
        sel_ids = [doc_id for _, doc_id, _ in selected]
    elif species and domains:
        strong = [x for x in scored if x[0] >= 8.0]
        if strong:
            selected = strong[:TOP_K_DOCS]
            status = "DIRECT_EVIDENCE" if len(selected) == 1 else "MULTIPLE_STUDIES"
            sel_ids = [doc_id for _, doc_id, _ in selected]
        else:
            return {
                **base,
                "status": "INSUFFICIENT_EVIDENCE",
                "selected_docs": [],
                "route_reasons": route_reasons,
                "reason": "No directly matched source domain for this species.",
            }
    elif domains:
        # Domain only — no species filter
        relevant = [x for x in scored if x[0] >= 3.5]
        if relevant:
            selected = relevant[:TOP_K_DOCS]
            status = "DIRECT_EVIDENCE" if len(selected) == 1 else "MULTIPLE_STUDIES"
            sel_ids = [doc_id for _, doc_id, _ in selected]
        else:
            return {
                **base,
                "status": "INSUFFICIENT_EVIDENCE",
                "selected_docs": [],
                "route_reasons": route_reasons,
                "reason": "No document scored above the relevance threshold for this domain.",
            }
    else:
        return {
            **base,
            "status": "INSUFFICIENT_EVIDENCE",
            "selected_docs": [],
            "route_reasons": route_reasons,
            "reason": "Query does not match any species, domain, or concept in the production post-harvest corpus.",
        }

    return {
        **base,
        "status": status,
        "selected_docs": sel_ids,
        "route_reasons": route_reasons,
    }
