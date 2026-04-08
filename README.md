# Vectorless RAG System

A production-grade **Vectorless Retrieval-Augmented Generation (RAG) chatbot** built with **FastAPI, Groq, and PageIndex**, designed to deliver **grounded, document-aware responses without relying on traditional vector databases**.

This system implements a **tree-structured retrieval workflow** where the LLM first identifies the most relevant document nodes using structural summaries, then generates a final answer grounded in the retrieved content.

---

## Key Highlights

* Built a **vectorless document retrieval pipeline**
* Eliminated dependency on **FAISS / Pinecone / Chroma**
* Implemented **two-stage LLM reasoning and answer generation**
* Designed a **clean interactive chat UI**
* Supports **PDF upload, indexing, status tracking, and Q&A**
* Exposes **reasoning traces and retrieved node IDs**
* Built using **production-ready FastAPI architecture**

---

## Tech Stack

* **Backend:** FastAPI
* **LLM:** Groq
* **Document Retrieval:** PageIndex
* **Frontend:** HTML, CSS, JavaScript
* **Templating:** Jinja2
* **Environment Management:** python-dotenv

---

## Project Structure

```text
Vectorless-RAG/
├── page_index.py
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── app.js
├── .env.example
├── .gitignore
└── README.md
```

---

## Core Capabilities

### Document Upload & Indexing

* Upload PDF documents
* Submit documents to PageIndex
* Track processing status
* Validate readiness before querying

### Intelligent Retrieval Pipeline

* Fetch document tree summaries
* Perform structure-aware node selection
* Retrieve relevant node content
* Generate grounded final answers

### Explainable Responses

Each response includes:

* **Final answer**
* **LLM reasoning trace**
* **retrieved node IDs**

This improves transparency and debugging during evaluation.

---

## Architecture

```text
User Query
    ↓
FastAPI API Layer
    ↓
PageIndex Tree Retrieval
    ↓
LLM-based Relevant Node Selection
    ↓
Context Construction from Selected Nodes
    ↓
Groq Final Answer Generation
    ↓
Grounded Response to UI
```

---

## Retrieval Workflow

### Stage 1 — Structural Retrieval

The system retrieves the **document tree and node summaries** from PageIndex.

Instead of embeddings, the LLM analyzes:

* node summaries
* hierarchical structure
* section relevance

to identify the most relevant nodes.

### Stage 2 — Grounded Answer Generation

Selected node content is assembled into a context window and passed to the LLM for final answer generation.

This ensures:

* reduced hallucination
* document-grounded responses
* explainable retrieval flow

---

## API Endpoints

### `POST /api/documents/upload`

Uploads a PDF and initiates indexing.

### `GET /api/documents/{doc_id}/status`

Checks whether indexing is complete.

### `POST /api/query`

Processes user query against indexed document.

---

## Sample Query Response

```json
{
  "doc_id": "pi-xxxxxxxx",
  "query": "Summarize the key policies",
  "thinking": "Selected relevant compliance sections",
  "node_list": ["node_2", "node_5"],
  "answer": "The key policies include..."
}
```

---

## Why This Project Stands Out

Traditional RAG systems rely heavily on vector databases and embeddings.

This project demonstrates an alternative **vectorless retrieval architecture** that leverages:

* document hierarchy
* structural summaries
* LLM reasoning

This reduces infrastructure complexity while preserving relevance.

---

## Production Enhancements

* streaming response support
* persistent session storage
* retry and backoff logic
* logging and observability
* rate limiting and auth
* HTTPS reverse proxy deployment

---

## Security Best Practices

* secrets stored in `.env`
* `.env` excluded from Git
* API key rotation supported
* safe production deployment ready

---

## Run Locally

```bash
uvicorn page_index:app --reload
```

Open:

```text
http://127.0.0.1:8000
```
