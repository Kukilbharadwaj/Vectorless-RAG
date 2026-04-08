# Vectorless RAG System

A FastAPI-based Vectorless RAG app with a clean chat UI.

This system lets you:
- Upload a PDF to PageIndex
- Wait for indexing to complete
- Ask questions against the indexed document
- Get grounded answers from Groq model output
- View reasoning and retrieved node IDs from the UI menu

## 1. Tech Stack

- Backend: FastAPI
- LLM: Groq 
- Document index/retrieval: PageIndex
- Frontend: HTML + CSS + JavaScript


## 2. Project Structure

```text
Vectorless RAG/
├── page_index.py            # FastAPI app (API + UI route)
├── templates/
│   └── index.html           # Main UI
├── static/
│   ├── style.css            # UI styling
│   └── app.js               # UI behavior
├── env.example              # Required env variables
├── .env                     # Your local secrets (create this)
└── README.md
```

## 3. Prerequisites

- Python 3.10+
- PageIndex API key
- Groq API key

## 4. Environment Variables

Create a `.env` file in the project root.

Use `env.example` as reference:

```env
PAGEINDEX_API_KEY=
GROQ_API_KEY=
```

Optional variable:

```env
GROQ_MODEL=llama-3.3-70b-versatile
```

If `GROQ_MODEL` is not set, default is `llama-3.3-70b-versatile`.

## 5. Installation

### Windows (PowerShell)

```powershell
cd "E:\AI_Agent\Vectorless RAG"
python -m venv env
.\env\Scripts\Activate.ps1
pip install --upgrade pip
pip install fastapi uvicorn python-dotenv groq pageindex python-multipart jinja2
```

### macOS/Linux

```bash
cd /path/to/Vectorless\ RAG
python3 -m venv env
source env/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn python-dotenv groq pageindex python-multipart jinja2
```

## 6. Run the App

From project root:

```powershell
uvicorn page_index:app --reload
```

Open in browser:

```text
http://127.0.0.1:8000
```

## 7. How to Use

1. Open the app.
2. Click top-right `...`.
3. Choose `Documents`.
4. Confirm current `doc_id` or upload a new PDF.
5. Click `Refresh Status` until the document is `Ready`.
6. Ask questions in the chat input.
7. Click top-right `...` -> `Result` to inspect:
   - Reasoning
   - Node list

## 8. API Endpoints

### `GET /`
Serves the chat UI.

### `POST /api/documents/upload`
Uploads a PDF and submits it to PageIndex.

Response example:

```json
{
  "doc_id": "pi-xxxxxxxxxxxxxxxx",
  "message": "Document submitted"
}
```

### `GET /api/documents/{doc_id}/status`
Checks document indexing status.

Response example:

```json
{
  "doc_id": "pi-xxxxxxxxxxxxxxxx",
  "ready": true
}
```

### `POST /api/query`
Queries an indexed document.

Request body:

```json
{
  "doc_id": "pi-xxxxxxxxxxxxxxxx",
  "query": "What are the key policies?",
  "model": "llama-3.3-70b-versatile",
  "temperature": 0
}
```

Response example:

```json
{
  "doc_id": "pi-xxxxxxxxxxxxxxxx",
  "query": "What are the key policies?",
  "thinking": "...",
  "node_list": ["node_1", "node_4"],
  "answer": "..."
}
```

## 9. System Architecture

```mermaid
flowchart TD
    U[User Browser UI] -->|Upload PDF| B1[/POST /api/documents/upload/]
    U -->|Check status| B2[/GET /api/documents/{doc_id}/status/]
    U -->|Ask question| B3[/POST /api/query/]

    B1 --> PI[PageIndex API]
    B2 --> PI
    B3 --> PI

    PI -->|Tree + Node Summaries| B3
    B3 -->|Search Prompt| G[Groq LLM]
    G -->|JSON with node_list + thinking| B3
    B3 -->|Answer Prompt with selected node text| G
    G -->|Final grounded answer| B3

    B3 --> U
```

### Query Processing Pipeline

1. Validate `doc_id` is ready via PageIndex.
2. Fetch document tree with summaries.
3. Remove full text from tree for search-stage prompt.
4. Ask Groq to select relevant node IDs.
5. Build context from selected node texts.
6. Ask Groq for final answer based on context.
7. Return answer + reasoning + node list to UI.

## 10. Common Errors and Fixes

### Missing env keys
Error:
- `Missing PAGEINDEX_API_KEY in environment`
- `Missing GROQ_API_KEY in environment`

Fix:
- Add both keys in `.env`
- Restart server

### `500` on `/`
Fix:
- Ensure `templates/index.html` exists
- Ensure dependencies installed (`jinja2`, `fastapi`, `uvicorn`)

### Upload fails
Fix:
- Upload only `.pdf`
- Check API key validity
- Check internet access

### Query returns processing conflict
Error:
- `Document is still processing`

Fix:
- Wait and call status endpoint until `ready=true`

## 11. Security Notes

- Do not commit `.env` to git.
- Rotate keys if accidentally exposed.
- In production, add auth/rate limiting before public exposure.

## 12. Production Suggestions

- Add request logging and tracing
- Add retry/backoff for external API calls
- Add streaming responses for better UX
- Add persistent storage for document sessions
- Deploy with reverse proxy (Nginx/Caddy) and HTTPS
