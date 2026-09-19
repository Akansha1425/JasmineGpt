# 🌸 JasmineGPT

### An Evidence-Grounded Multilingual RAG Chatbot for Jasmine Farmers

JasmineGPT is an AI-powered agricultural assistant developed to help **Jasminum sambac** farmers make informed cultivation decisions using **Retrieval-Augmented Generation (RAG)**. The chatbot provides reliable, research-backed answers with multilingual support in **English and Kannada**, conversational memory, and evidence-based citations.

---

## ✨ Features

* 🌱 **Evidence-Grounded RAG** – Answers generated only from retrieved research papers.
* 🌐 **Multilingual Support** – Automatic English ↔ Kannada input and output.
* 💬 **Conversational Memory** – Remembers crop context during the current session.
* 📖 **Research-Based Q&A** – Cultivation, pruning, irrigation, nutrition, storage, and packaging.
* 📑 **Evidence Citations** – Every response is supported by the retrieved research.
* 🚫 **No Hallucinated Recommendations** – Clearly distinguishes direct evidence from related evidence.

---

## 🏗️ Tech Stack

| Layer           | Technology                |
| --------------- | ------------------------- |
| Frontend        | React + Vite + TypeScript |
| Backend         | Express + TypeScript      |
| RAG Service     | FastAPI + Python          |
| Vector Database | ChromaDB                  |
| Framework       | LangChain                 |
| LLM             | Gemini                    |
| Languages       | English, Kannada          |

---

## 📂 Project Structure

```text
jasminegpt/
├── frontend/        # React + Vite UI
├── backend/         # Express API
├── rag/             # FastAPI RAG Service
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### RAG Service

```bash
cd rag
.venv\Scripts\activate
uvicorn app:app --reload --port 8000
```

---

## 🌍 Multilingual Example

**Kannada Input**

> ಮಲ್ಲಿಗೆಗೆ ಹೂ ಬಿಡುವಿಕೆ ಹೆಚ್ಚಿಸಲು ಯಾವ ಗೊಬ್ಬರ ವಿಧಾನವನ್ನು ಸಂಶೋಧನೆಯಲ್ಲಿ ಪರೀಕ್ಷಿಸಲಾಗಿದೆ?

**JasmineGPT**

* Detects Kannada automatically
* Retrieves English research papers
* Generates an evidence-grounded response
* Returns the answer in Kannada while preserving English paper citations

---

## 🎯 Research Scope

JasmineGPT currently supports:

* Fertilizer & Nutrient Management
* Pruning & Flowering
* Irrigation Management
* Post-Harvest Storage
* Packaging Technology
* Shelf-Life Management

---

## 🔒 Evidence Policy

JasmineGPT answers **only from retrieved research evidence**. If no direct evidence exists, it explicitly states the evidence gap instead of generating unsupported recommendations.

---

## 👩‍💻 Author

**Akansha Zambare**

**Final Year B.E. Project** — An intelligent multilingual decision-support chatbot for jasmine farmers using Retrieval-Augmented Generation (RAG).
