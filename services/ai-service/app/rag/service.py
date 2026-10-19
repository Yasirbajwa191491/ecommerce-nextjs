"""Index, retrieve, and prompt assembly. No LLM provider calls."""

import time
from pathlib import Path

from app.rag.context import assemble_context
from app.rag.grounding import safe_citation
from app.rag.index_store import RagIndex, apply_index_request, collect_documents
from app.rag.prompts import build_prompt
from app.rag.query import understand_query
from app.rag.retrieval import retrieve_chunks
from app.rag.schemas import (
    INDEX_VERSION,
    CandidateChunk,
    ConversationTurn,
    GroundingMode,
    IndexRequest,
    PrepareRequest,
    ProductFact,
    RetrievalFilters,
    RetrievalStrategy,
)


class RagServiceError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


def index_file(artifacts_dir: str) -> Path:
    root = Path(artifacts_dir).expanduser().resolve()
    target = (root / "rag" / "index-v1.json").resolve()
    if root != target and root not in target.parents:
        raise RagServiceError("Index path is not allowed", 500)
    return target


def prepare_documents(request: PrepareRequest) -> dict[str, object]:
    documents, inactive = collect_documents(
        request.products,
        request.policies,
        request.faqs,
        embedding_version="",
    )
    from app.rag.chunking import chunk_document

    chunks = []
    for document in documents:
        for chunk in chunk_document(
            document,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
        ):
            payload = chunk.model_dump()
            payload.pop("embedding", None)
            chunks.append(payload)
    return {
        "index_version": INDEX_VERSION,
        "chunks": chunks,
        "inactive_document_ids": inactive,
    }


def index_documents(path: Path, request: IndexRequest) -> dict[str, object]:
    index = RagIndex.load(path)
    if index.index_version != INDEX_VERSION:
        raise RagServiceError("Index version mismatch", 409)
    stats = apply_index_request(index, request)
    index.save(path)
    return {
        "index_version": index.index_version,
        "embedding_version": index.embedding_version,
        **stats,
    }


def retrieve_context(
    *,
    index: RagIndex | None,
    query: str,
    strategy: RetrievalStrategy,
    top_k: int,
    filters: RetrievalFilters,
    conversation: list[ConversationTurn],
    facts: list[ProductFact],
    semantic_candidates: list[CandidateChunk],
    keyword_candidates: list[CandidateChunk],
    expected_index_version: str,
    max_context_tokens: int,
    grounding: GroundingMode,
) -> dict[str, object]:
    started = time.perf_counter()
    cleaned = " ".join(query.split())
    if not cleaned:
        raise RagServiceError("Query is empty", 400)
    if (
        index is not None
        and expected_index_version
        and index.index_version != expected_index_version
    ):
        return {
            "documents": [],
            "citations": [],
            "context": "",
            "prompt": None,
            "strategy": strategy,
            "index_version": index.index_version,
            "embedding_version": index.embedding_version,
            "intent": "general_shopping",
            "empty": True,
            "index_version_mismatch": True,
            "latency_ms": round((time.perf_counter() - started) * 1000, 3),
            "grounding": grounding,
        }
    local_ready = index is not None and bool(index.chunks)
    has_candidates = bool(semantic_candidates or keyword_candidates)
    if not local_ready and not has_candidates:
        raise RagServiceError("Retrieval index is not available", 409)
    intent, effective_filters = understand_query(cleaned, conversation, filters)
    hits, method = retrieve_chunks(
        index=index if local_ready else None,
        query=cleaned,
        strategy=strategy,
        limit=top_k,
        filters=effective_filters,
        facts=facts,
        semantic_candidates=semantic_candidates,
        keyword_candidates=keyword_candidates,
    )
    chunks = [chunk for chunk, _score in hits]
    context, used, missing = assemble_context(
        chunks,
        facts=facts,
        intent=intent,
        max_tokens=max_context_tokens,
    )
    prompt = build_prompt(question=cleaned, context=context, intent=intent) if used else None
    documents = [
        {
            "chunk_id": chunk.chunk_id,
            "document_id": chunk.document_id,
            "source_type": chunk.source_type,
            "source_id": chunk.source_id,
            "product_id": chunk.product_id,
            "title": chunk.title,
            "section": chunk.section,
            "content": chunk.content,
            "score": round(score, 6),
        }
        for chunk, score in hits
        if chunk.chunk_id in {item.chunk_id for item in used}
    ]
    latency_ms = round((time.perf_counter() - started) * 1000, 3)
    return {
        "documents": documents,
        "citations": [safe_citation(chunk).model_dump() for chunk in used],
        "context": context,
        "prompt": prompt.model_dump() if prompt else None,
        "strategy": strategy,
        "retrieval_method": method,
        "index_version": index.index_version if index else INDEX_VERSION,
        "embedding_version": index.embedding_version if index else "",
        "intent": intent,
        "empty": not documents,
        "missing_facts": missing,
        "index_version_mismatch": False,
        "latency_ms": latency_ms,
        "grounding": grounding,
    }
