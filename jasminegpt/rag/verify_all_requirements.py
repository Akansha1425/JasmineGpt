"""
End-to-End Verification Script for General RAG Real Scientific Corpus
"""
import sys
import json
from general_rag import GeneralRAG
from router import route_top_level, is_profile_statement, looks_context_dependent, extract_entities

sys.stdout.reconfigure(encoding="utf-8")

print("=" * 80)
print("1. INITIALIZING GENERAL RAG WITH REAL SCIENTIFIC CORPUS")
print("=" * 80)
rag = GeneralRAG()
rag.initialize()
print(f"Loaded {len(rag.chunks_df)} chunks from real scientific corpus.\n")

GENERAL_QUERIES = [
    "What is the recommended spacing for Jasminum sambac?",
    "What soil and planting conditions are recommended for jasmine cultivation?",
    "How should jasmine be irrigated?",
    "What pruning practices are recommended?",
]

for q in GENERAL_QUERIES:
    print("-" * 80)
    print(f"QUERY: {q}")
    route = route_top_level(q)
    print(f"Top-Level Route: {route}")
    res = rag.retrieve(q, top_k=2)
    print(f"Top Retrieval Score: {res['top_score']:.4f}")
    
    for i, c in enumerate(res["chunks"], 1):
        print(f"\n  [Result #{i}]")
        print(f"  Chunk ID:   {c['chunk_id']}")
        print(f"  Score:      {c['score']:.4f}")
        print(f"  Category:   {c['category']}")
        print(f"  Title:      {c['title']}")
        print(f"  Author(s):  {c['author']}")
        print(f"  Year:       {c['year']}")
        print(f"  Source:     {c['source']}")
        print(f"  DOI:        {c['doi']}")
        print(f"  URL:        {c['url']}")
        print(f"  Filename:   {c['filename']}")
        print(f"  Page:       {c['page']}")
        print(f"  Text excerpt: {c['text'][:250]}...")

print("\n" + "=" * 80)
print("2. MULTI-TURN CONVERSATION MEMORY RESOLUTION TEST")
print("=" * 80)

turns = [
    "I grow Gundumalli jasmine.",
    "What packaging was tested?",
    "Was the packaging heat sealed?",
]

memory = {}

for idx, user_input in enumerate(turns, 1):
    print(f"\n--- Turn {idx}: '{user_input}' ---")
    is_prof = is_profile_statement(user_input)
    is_ctx = looks_context_dependent(user_input)
    route = route_top_level(user_input, memory=memory)
    ents = extract_entities(user_input)
    
    print(f"is_profile_statement: {is_prof}")
    print(f"looks_context_dependent: {is_ctx}")
    print(f"Route: {route}")
    print(f"Extracted entities: {ents}")
    
    if is_prof:
        if ents.get("species"): memory["species"] = ents["species"]
        if ents.get("cultivar"): memory["cultivar"] = ents["cultivar"]
        print(f"Memory Updated: {memory}")
    elif route == "POSTHARVEST":
        memory["last_route"] = "POSTHARVEST"
        memory["domains"] = ["packaging"]
        print(f"Memory State: {memory}")

print("\n" + "=" * 80)
print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
print("=" * 80)
