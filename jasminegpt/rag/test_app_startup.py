import sys
from fastapi.testclient import TestClient
from app import app

sys.stdout.reconfigure(encoding="utf-8")

with TestClient(app) as client:
    res = client.get("/health")
    print("Health response:", res.status_code, res.json())

    rag_res = client.post("/rag/general", json={"query": "What is the recommended spacing for Jasminum sambac?", "top_k": 2})
    print("RAG General status:", rag_res.status_code)
    data = rag_res.json()
    print("Top Score:", data.get("top_score"))
    for c in data.get("chunks", []):
        print(f"  - [{c['category']}] {c['filename']} (Score: {c['score']:.4f})")
