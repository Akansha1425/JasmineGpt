import sys
from general_rag import GeneralRAG

sys.stdout.reconfigure(encoding="utf-8")

rag = GeneralRAG()
rag.initialize()

queries = [
    "What is the recommended spacing for Jasminum sambac?",
    "What soil and planting conditions are recommended for jasmine cultivation?",
    "How should jasmine be irrigated?",
    "What pruning practices are recommended?",
]

for q in queries:
    print("=" * 75)
    print("QUERY:", q)
    res = rag.retrieve(q, top_k=2)
    print("Top Score:", res["top_score"])
    for i, c in enumerate(res["chunks"], 1):
        print(f"  {i}. [{c['category']}] {c['title']} ({c['author']}, {c['year']})")
        print(f"     Source: {c['source']} | DOI: {c['doi']} | URL: {c['url']}")
        print(f"     Score: {c['score']:.4f} | Filename: {c['filename']} | Page: {c['page']}")
        print(f"     Snippet: {c['text'][:250]}...\n")
