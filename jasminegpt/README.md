# JasmineGPT — Evidence-Grounded Conversational RAG Assistant

> Standalone assistant for jasmine farmers. Separate from the JasmineSathi schemes application.

## Ports

| Service | Port | Description |
|---------|------|-------------|
| Python RAG Sidecar | 8000 | FastAPI, FAISS, sentence-transformers |
| Node.js Backend | 4000 | REST API, MongoDB, LLM orchestration |
| React Frontend | 5173 | Vite dev server (ChatGPT-style UI) |

> **Do NOT modify** the JasmineSathi schemes app (port 3000, `jasminesathi` DB).

---

## Quick Start

### 1. Python RAG Sidecar

```bash
cd rag
pip install -r requirements.txt
cp .env.example .env
python app.py
```

### 2. Node.js Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in OPENROUTER_API_KEY in .env
npm run dev
```

### 3. React Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)
```
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=jasminesathi_gpt     # ← separate DB, not jasminesathi
OPENROUTER_API_KEY=<your-key>
RAG_SIDECAR_URL=http://localhost:8000
PORT=4000
```

### RAG Sidecar (`rag/.env`)
```
RAG_PORT=8000
```

---

## Running Tests

```bash
# Node.js routing regression tests (A-I, no DB/RAG needed)
cd backend && npm test

# Python routing tests (no ML models needed)
cd rag && python -m pytest test_routing.py -v
```

---

## Architecture

```
Frontend (5173)
    ↓
Backend (4000)  ←→  Python RAG Sidecar (8000)
    ↓                    ↓
MongoDB                FAISS + Sentence-Transformers
(jasminesathi_gpt)     (verified_profiles.py)
```

### Routing Pipeline

```
User message
  ↓
[1] resolveFollowup()         deterministic follow-up resolution
  ↓
[2] routeQuestion()           MEMORY_UPDATE | GENERAL_RAG | POSTHARVEST
  ↓
[3a] MEMORY_UPDATE            → update memory, return confirmation
[3b] GENERAL_RAG              → retrieveGeneral() → LLM → respond
[3c] POSTHARVEST              → retrievePostHarvest()
                                  ↓ evidence gating
                                  INSUFFICIENT_EVIDENCE → no LLM, safe message
                                  DIRECT/MULTIPLE       → LLM → respond
```

### Evidence Gating (Post-Harvest)

The 5 verified production papers:
- **JAS-SAM-001** Jawaharlal et al. (2012) — Export packaging
- **JAS-SAM-002** Choudhury et al. (2019) — Gundumalli cold storage (7°C)
- **JAS-SAM-004** Ffadhilah et al. (2024) — Chitosan packaging (5°C)
- **JAS-SAM-005** M Mohamed Asik et al. (2026) — Mycelium foam transport
- **JAS-AUR-001** Sunny et al. (2022) — Pacha Mullai (5°C)

> **JAS-SAM-003** (Singh 2009) is excluded — low-quality scanned PDF.

---

## Regression Tests A–I

| Case | Input | Expected Route | Evidence |
|------|-------|---------------|---------|
| A | `I grow Gundumalli jasmine.` | MEMORY_UPDATE | N/A |
| B | `What packaging was tested?` | POSTHARVEST | DIRECT_EVIDENCE |
| C | `Was the packaging heat sealed?` (follow-up) | POSTHARVEST | — |
| D | `What temperature was used?` (follow-up) | POSTHARVEST | — |
| E | `How long did it last?` (follow-up) | POSTHARVEST | — |
| F | `I have a jasmine bud worm problem.` | GENERAL_RAG | N/A |
| G | `What pesticide studies are available?` | GENERAL_RAG | N/A |
| H | `What is passive MAP for Jasminum sambac storage?` | POSTHARVEST | INSUFFICIENT_EVIDENCE |
| I | `What is the best harvesting time for jasmine?` | POSTHARVEST | INSUFFICIENT_EVIDENCE |
