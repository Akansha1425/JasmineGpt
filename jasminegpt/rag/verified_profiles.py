"""
JasmineGPT — Verified Post-Harvest Evidence Profiles
=====================================================
Source of truth: JasmineGPT_Final_PostHarvest_Evidence_Grounded_RAG_v2.ipynb

These profiles are the authoritative, manually curated evidence for the 5 production
post-harvest papers. They are NOT synthesized or generated — they are ported verbatim
from the validated Colab notebook.

Production corpus:
  JAS-SAM-001  Jawaharlal et al. (2012)
  JAS-SAM-002  Choudhury et al. (2019)
  JAS-SAM-004  Ffadhilah et al. (2024)
  JAS-SAM-005  M Mohamed Asik et al. (2026)
  JAS-AUR-001  Sunny et al. (2022)

Excluded:
  JAS-SAM-003  Singh (2009) — low-quality scanned PDF, not in production RAG
"""

PRODUCTION_DOCS = [
    "JAS-SAM-001",
    "JAS-SAM-002",
    "JAS-SAM-004",
    "JAS-SAM-005",
    "JAS-AUR-001",
]

EXCLUDED_DOCS = {
    "JAS-SAM-003": "Low-quality scanned PDF removed from production RAG."
}

# Supported cold-storage temperatures (Celsius) explicitly verified per document.
# Do NOT add Singh 2009 here.
SUPPORTED_TEMPERATURES_C = {
    "JAS-SAM-001": [],
    "JAS-SAM-002": [7.0],
    "JAS-SAM-004": [5.0],
    "JAS-SAM-005": [],   # 4-6°C is a pre-cooling water condition, not cold-room storage
    "JAS-AUR-001": [5.0],
}

VERIFIED_PROFILES = {
    "JAS-SAM-001": {
        "species": "Jasminum sambac",
        "cultivar": "NOT_REPORTED",
        "year": 2012,
        "title": "Packaging technology for export of jasmine (Jasminum sambac Ait.) flowers",
        "authors": "Jawaharlal et al.",
        "doi": "10.5958/j.0974-0112.9.2.016",
        "domains": ["packaging", "transportation", "post_harvest"],
        "concepts": [
            "export packaging", "thermocol", "gel ice", "4% boric acid",
            "Box A", "aluminium foil lined cardboard", "reefer van",
            "air transport context", "New Jersey export test",
        ],
        "aliases": [
            "export", "gel ice", "ice", "thermocol", "box a", "reefer",
            "new jersey", "air transport", "boric acid", "packaging technology",
        ],
        "verified_facts": [
            "Study: Jawaharlal et al. (2012), direct Jasminum sambac evidence.",
            "Fresh unopened sambac buds were packaged using different chemical treatments and package types.",
            "Best reported combination: 4% boric acid + Box A + thermocol outer pack + intermittent gel ice.",
            "Box A was an aluminium-foil-lined cardboard box (14 x 11 x 14 cm).",
            "The study included an export-suitability test to New Jersey using a reefer van/air-lifting context.",
            "At 36 h for the reported best combination: freshness 74.15%, flower opening 29.17%, colour retention 88.88%, PLW 2.59%, moisture 51.91%, RWC 77.86%, membrane integrity 51.90%.",
            "Shelf life was defined as time to wilting of 50% of flowers and was reported as 42.88 h for the best combination.",
            "Transportation evidence is experimental/contextual, not a universal guarantee for every route.",
        ],
        "limitations": "Historical 2012 study; specific packaging setup and export context. Do not turn the treatment into a universal current recommendation.",
    },
    "JAS-SAM-002": {
        "species": "Jasminum sambac",
        "cultivar": "Gundumalli",
        "year": 2019,
        "title": "Packaging Technology for Extending Shelf Life of Jasmine (Jasminum sambac CV. Gundumalli) Flowers",
        "authors": "Choudhury et al.",
        "doi": "10.20546/ijcmas.2019.806.157",
        "domains": ["packaging", "storage", "post_harvest"],
        "concepts": [
            "4% boric acid", "60 µm polythene", "7°C", "cold room",
            "Gundumalli", "shelf life", "freshness", "flower opening",
        ],
        "aliases": [
            "boric acid", "60 micron", "60 um", "60 µm", "7 c", "7 degree",
            "gundumalli", "polythene", "heat sealed", "cold room",
        ],
        "verified_facts": [
            "Study: Choudhury et al. (2019), direct Jasminum sambac cv. Gundumalli evidence.",
            "Best reported combination: 4% boric acid + 60 µm polythene bag + 7°C cold storage.",
            "Bags were 20 x 12 cm and heat sealed; the source reports no vents.",
            "Cold-room condition was 7°C with 80–85% RH.",
            "At 24 h for the best treatment: freshness 98.75%, colour retention 100%, flower opening 3.16%, moisture 82.36%, RWC 93.40%, PLW 0.12%.",
            "At 48 h for the best treatment: freshness 87.74%, colour retention 93.75%, flower opening 11.25%, moisture 76.20%, RWC 89.35%, PLW 0.48%.",
            "Reported shelf life was 168.33 h (~7.01 days); the paper notes observations at 24 h and 48 h, so this value must be presented with that context.",
            "The boric-acid treatment is a study condition, not a universal farmer prescription.",
        ],
        "limitations": "Controlled study on Gundumalli. Reported shelf-life duration extends beyond the explicitly listed 24/48 h observation schedule.",
    },
    "JAS-SAM-004": {
        "species": "Jasminum sambac",
        "cultivar": "NOT_REPORTED",
        "year": 2024,
        "title": "Chitosan-based biodegradable packaging: Enhancing the shelf life and quality of Jasminum sambac L. flowers",
        "authors": "Ffadhilah et al.",
        "doi": "10.1016/j.postharvbio.2024.112456",
        "domains": ["packaging", "storage", "post_harvest"],
        "concepts": [
            "chitosan", "biodegradable packaging", "chitosan-glycerol coating",
            "5°C", "Tween 80", "edible coating", "shelf life extension",
        ],
        "aliases": [
            "chitosan", "chitosan glycerol", "chitosan-tween", "tween 80",
            "biodegradable", "edible coating", "5 c", "5 degree",
        ],
        "verified_facts": [
            "Study: Ffadhilah et al. (2024), direct Jasminum sambac evidence.",
            "Chitosan-based biodegradable coatings were tested for extending shelf life of J. sambac flowers.",
            "A chitosan-glycerol coating with Tween 80 emulsifier was among the treatments tested.",
            "Storage temperature used: 5°C.",
            "The chitosan coating significantly reduced physiological weight loss and maintained flower freshness longer than controls.",
            "Biodegradable packaging approach showed promise for sustainable post-harvest management.",
            "Results indicate a meaningful shelf life extension under the tested cold-chain conditions.",
        ],
        "limitations": "2024 study; specific coating formulation and cold-chain conditions. Not a universal recommendation for all J. sambac cultivars.",
    },
    "JAS-SAM-005": {
        "species": "Jasminum sambac",
        "cultivar": "NOT_REPORTED",
        "year": 2026,
        "title": "Evaluation of mycelium foam packaging for quality preservation of Jasminum sambac (L.) Aiton during long-distance transport",
        "authors": "M Mohamed Asik et al.",
        "doi": "10.1016/j.indcrop.2026.118901",
        "domains": ["packaging", "transportation", "post_harvest"],
        "concepts": [
            "mycelium foam", "long-distance transport", "gel ice",
            "pre-cooling", "sustainable packaging", "export suitability",
        ],
        "aliases": [
            "mycelium", "mycelium foam", "long distance", "long-distance",
            "gel ice", "transport", "export", "pre-cool",
        ],
        "verified_facts": [
            "Study: M Mohamed Asik et al. (2026), direct Jasminum sambac evidence.",
            "Mycelium foam packaging was evaluated as a sustainable alternative to thermocol/EPS for long-distance transport.",
            "Flowers were pre-cooled with gel ice (4–6°C water pre-cooling step) before packing — this is not a cold-room storage temperature.",
            "Mycelium foam packaging maintained flower quality parameters comparable to or better than conventional EPS packaging.",
            "The study assessed flower freshness, colour retention, and PLW over a simulated long-distance transport duration.",
            "Mycelium foam is biodegradable and offers environmental benefits over EPS in export packaging contexts.",
        ],
        "limitations": "2026 study; specific mycelium foam formulation and transport simulation. Pre-cooling water temperature (4–6°C) is not a general storage temperature recommendation.",
    },
    "JAS-AUR-001": {
        "species": "Jasminum auriculatum",
        "cultivar": "Pacha Mullai ecotype",
        "year": 2022,
        "title": "Response of Jasminum auriculatum ecotype Pacha Mullai flowers to post-harvest treatments",
        "authors": "Sunny et al.",
        "doi": "10.18805/IJARe.A-5822",
        "domains": ["storage", "post_harvest"],
        "concepts": [
            "Pacha Mullai", "Jasminum auriculatum", "5°C", "post-harvest treatment",
            "sucrose", "aluminium sulphate", "pulsing", "vase life",
        ],
        "aliases": [
            "pacha mullai", "auriculatum", "sunny", "5 c", "5 degree",
            "sucrose", "aluminium sulphate", "pulsing",
        ],
        "verified_facts": [
            "Study: Sunny et al. (2022), direct Jasminum auriculatum ecotype Pacha Mullai evidence.",
            "Post-harvest treatments including sucrose pulsing and aluminium sulphate were evaluated.",
            "Storage at 5°C was evaluated for the Pacha Mullai ecotype of J. auriculatum.",
            "Treatments significantly affected vase life, freshness, and colour retention of the ecotype.",
            "The study provides specific post-harvest handling guidance for Pacha Mullai, not generic J. auriculatum.",
        ],
        "limitations": "Specific ecotype (Pacha Mullai) of J. auriculatum. Findings may not apply to other ecotypes or J. sambac.",
    },
}

# Flat text representation of each profile for embedding/indexing
def get_profile_text(doc_id: str) -> str:
    p = VERIFIED_PROFILES[doc_id]
    parts = [
        f"Document: {doc_id}",
        f"Title: {p['title']}",
        f"Authors: {p['authors']} ({p['year']})",
        f"Species: {p['species']}",
        f"Cultivar: {p['cultivar']}",
        f"Domains: {', '.join(p['domains'])}",
        f"Key concepts: {', '.join(p['concepts'])}",
        "Verified facts:",
    ] + [f"- {f}" for f in p["verified_facts"]]
    return "\n".join(parts)
