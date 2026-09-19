# 🌸 JasmineGPT

### An Evidence-Grounded Multilingual RAG Chatbot for Jasmine Farmers

JasmineGPT is an AI-powered agricultural decision support system developed for **Jasminum sambac** farmers. It combines **Retrieval-Augmented Generation (RAG)**, multilingual AI, conversational farmer profiles, and evidence-grounded research to deliver reliable cultivation recommendations with transparent citations.

---

## ✨ Features

* 🌱 **Evidence-Grounded RAG** — Answers generated only from retrieved research papers.
* 🌐 **Multilingual Support** — Automatic English ↔ Kannada input and output.
* 👨‍🌾 **Farmer Profile (Current Session)** — Remembers species, cultivar, language, and farming context during the conversation.
* 💬 **Conversational Memory** — Uses session context for follow-up questions without asking repeatedly.
* 📖 **Research-Based Q&A** — Fertilizer, pruning, irrigation, flowering, storage, packaging, and post-harvest management.
* 📑 **Evidence Citations** — Every response includes the supporting research paper(s).
* 🔍 **Evidence Gap Detection** — Clearly distinguishes direct evidence from related evidence when research is unavailable.
* 🖥️ **ChatGPT-Style Interface** — Modern chat experience with conversation history, collapsible sidebar, dark/light theme, and responsive design.
* 🎤 **Voice-to-Text Ready** — Frontend architecture supports multilingual speech input (English & Kannada).

---

## 🏗️ Tech Stack

| Layer           | Technology                |
| --------------- | ------------------------- |
| Frontend        | React + Vite + TypeScript |
| Backend         | Express + TypeScript      |
| RAG Service     | FastAPI + Python          |
| Vector Database | ChromaDB                  |
| AI Framework    | LangChain                 |
| LLM             | Gemini                    |
| UI              | Tailwind CSS + Radix UI   |
| Languages       | English, Kannada          |

---

## 📂 Project Structure

```text
jasminegpt/
├── frontend/        # React + Vite Chat UI
├── backend/         # Express API & Session Logic
├── rag/             # FastAPI RAG Service
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

### 3. RAG Service

```bash
cd rag
.venv\Scripts\activate
uvicorn app:app --reload --port 8000
```

---

## 🌍 Multilingual Example

**Kannada Input**

> ಮಲ್ಲಿಗೆಗೆ ಹೂ ಬಿಡುವಿಕೆ ಹೆಚ್ಚಿಸಲು ಯಾವ ಗೊಬ್ಬರ ವಿಧಾನವನ್ನು ಸಂಶೋಧನೆಯಲ್ಲಿ ಪರೀಕ್ಷಿಸಲಾಗಿದೆ?

**JasmineGPT Workflow**

1. Detects Kannada automatically.
2. Normalizes the query to English.
3. Retrieves relevant research papers from ChromaDB.
4. Generates an evidence-grounded answer.
5. Returns the response in Kannada while preserving English paper titles and citations.

---

## 👨‍🌾 Farmer Profile Example

The chatbot automatically remembers the farmer's context within the current conversation.

| Profile Field   | Example                      |
| --------------- | ---------------------------- |
| Species         | *Jasminum sambac*            |
| Cultivar        | Ramanathapuram Gundumalli    |
| Language        | Kannada                      |
| Farming Purpose | Commercial Flower Production |

This profile is **session-only** and is cleared when a new chat is created.

---

## 🎯 Research Scope

JasmineGPT currently supports evidence-grounded questions on:

* Fertilizer & Nutrient Management
* Pruning & Flowering
* Irrigation Management
* Disease & Symptom Evidence
* Post-Harvest Storage
* Packaging Technology
* Shelf-Life Management

---

## 🔒 Evidence Policy

JasmineGPT **does not generate unsupported agricultural recommendations**.

* Uses only retrieved research evidence
* Preserves paper titles and citations
* Separates Direct Evidence and Related Evidence
* Explicitly reports evidence gaps when no direct study exists

---

## 📸 User Experience

* ChatGPT-style conversation interface
* Collapsible conversation sidebar
* Auto-generated chat titles
* Dark & Light theme
* Responsive desktop/mobile layout
* English ↔ Kannada language toggle

---

## 👩‍💻 Author

**Akansha Zambare**

**Final Year B.E. Project** — An Evidence-Grounded Multilingual Retrieval-Augmented Generation (RAG) Chatbot for Jasmine Farmers.
