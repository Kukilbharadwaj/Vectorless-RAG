import json
import os
import tempfile
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import Request
from groq import AsyncGroq
from pageindex import PageIndexClient
from pydantic import BaseModel, Field


load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
PAGEINDEX_API_KEY = os.getenv("PAGEINDEX_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DEFAULT_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

if not PAGEINDEX_API_KEY:
    raise RuntimeError("Missing PAGEINDEX_API_KEY in environment")
if not GROQ_API_KEY:
    raise RuntimeError("Missing GROQ_API_KEY in environment")

app = FastAPI(title="Vectorless RAG System", version="1.0.0")
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

pi_client = PageIndexClient(api_key=PAGEINDEX_API_KEY)


class AskRequest(BaseModel):
    doc_id: str = Field(..., description="Document ID returned by upload")
    query: str = Field(..., min_length=2)
    model: str = Field(default=DEFAULT_MODEL)
    temperature: float = Field(default=0, ge=0, le=2)


async def call_llm(prompt: str, model: str = DEFAULT_MODEL, temperature: float = 0) -> str:
    client = AsyncGroq(api_key=GROQ_API_KEY)
    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
    )
    return response.choices[0].message.content.strip()


def _extract_json_block(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("LLM did not return JSON")
    return json.loads(text[start : end + 1])


@app.get("/", response_class=HTMLResponse)
async def home(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "index.html")


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    suffix = Path(file.filename).suffix or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_path = temp_file.name
        content = await file.read()
        temp_file.write(content)

    try:
        submission = pi_client.submit_document(temp_path)
        doc_id = submission["doc_id"]
        return {"doc_id": doc_id, "message": "Document submitted"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to submit document: {exc}") from exc
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/api/documents/{doc_id}/status")
async def document_status(doc_id: str) -> dict[str, Any]:
    try:
        ready = pi_client.is_retrieval_ready(doc_id)
        return {"doc_id": doc_id, "ready": ready}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Status check failed: {exc}") from exc


@app.post("/api/query")
async def query_document(payload: AskRequest) -> dict[str, Any]:
    try:
        if not pi_client.is_retrieval_ready(payload.doc_id):
            raise HTTPException(status_code=409, detail="Document is still processing")

        tree = pi_client.get_tree(payload.doc_id, node_summary=True)["result"]

        tree_without_text = _remove_fields(tree, fields=["text"])

        search_prompt = f"""
You are given a question and a tree structure of a document.
Each node contains a node id, node title, and a corresponding summary.
Your task is to find all nodes that are likely to contain the answer to the question.

Question: {payload.query}

Document tree structure:
{json.dumps(tree_without_text, indent=2)}

Please reply in the following JSON format:
{{
    "thinking": "<Your thinking process on which nodes are relevant to the question>",
    "node_list": ["node_id_1", "node_id_2", "...", "node_id_n"]
}}
Directly return the final JSON structure. Do not output anything else.
"""
        search_result = await call_llm(
            search_prompt,
            model=payload.model,
            temperature=payload.temperature,
        )

        search_result_json = _extract_json_block(search_result)
        node_list = search_result_json.get("node_list", [])

        node_map = _create_node_mapping(tree)
        valid_nodes = [node_id for node_id in node_list if node_id in node_map]
        if not valid_nodes:
            raise HTTPException(status_code=422, detail="No relevant nodes returned by model")

        relevant_content = "\n\n".join(node_map[node_id].get("text", "") for node_id in valid_nodes)

        answer_prompt = f"""
Answer the question based on the context:

Question: {payload.query}
Context: {relevant_content}

Provide a clear, concise answer based only on the context provided.
"""
        answer = await call_llm(
            answer_prompt,
            model=payload.model,
            temperature=payload.temperature,
        )

        return {
            "doc_id": payload.doc_id,
            "query": payload.query,
            "thinking": search_result_json.get("thinking", ""),
            "node_list": valid_nodes,
            "answer": answer,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Query failed: {exc}") from exc


# Lightweight helpers so this file can run without notebook-only utilities.
def _remove_fields(node: Any, fields: list[str]) -> Any:
    if isinstance(node, dict):
        return {
            key: _remove_fields(value, fields)
            for key, value in node.items()
            if key not in fields
        }
    if isinstance(node, list):
        return [_remove_fields(item, fields) for item in node]
    return node


def _create_node_mapping(tree: Any) -> dict[str, dict[str, Any]]:
    mapping: dict[str, dict[str, Any]] = {}

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            node_id = node.get("node_id")
            if isinstance(node_id, str):
                mapping[node_id] = node
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(tree)
    return mapping


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("page_index:app", host="0.0.0.0", port=8000, reload=True)
