import sys
from general_rag import GeneralRAG

sys.stdout.reconfigure(encoding="utf-8")

rag = GeneralRAG()
rag.initialize()

queries = [
    "What is the recommended spacing for Jasminum sambac?",
    "What soil and planting conditions are recommended for jasmine cultivation?",
    "What pruning practices are recommended for jasmine?",
]

for q in queries:
    print("=" * 80)
    print(f"QUERY: {q}")
    res = rag.retrieve(q, top_k=3)
    print(f"Top Score: {res['top_score']:.4f}\n")
    for i, c in enumerate(res["chunks"], 1):
        print(f"Result #{i}:")
        print(f"  Score:        {c['score']:.4f}")
        print(f"  Chunk ID:     {c['chunk_id']}")
        print(f"  Title:        {c['title']}")
        print(f"  Species:      {c['species']}")
        print(f"  Category:     {c['category']}")
        print(f"  Year:         {c['year']}")
        print(f"  DOI:          {c['doi']}")
        print(f"  Source:       {c['source']}")
        print(f"  Filename:     {c['filename']}")
        print(f"  Page:         {c['page']}")
        print(f"  Text preview: {c['text'][:250]}...\n")
