"""Authenticated RAG routes. Generation stays in Convex."""

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.config import Settings
from app.core.security import service_auth
from app.rag.dataset import load_synthetic_dataset
from app.rag.evaluation import run_evaluation
from app.rag.index_store import RagIndex
from app.rag.schemas import EvaluateRequest, IndexRequest, PrepareRequest, RetrieveRequest
from app.rag.service import RagServiceError, index_documents, index_file, prepare_documents, retrieve_context

router = APIRouter(
    prefix="/internal/rag",
    tags=["rag"],
    dependencies=[Depends(service_auth)],
)


def _settings(request: Request) -> Settings:
    return request.app.state.settings


@router.post("/prepare")
async def prepare_rag(body: PrepareRequest) -> dict[str, object]:
    return prepare_documents(body)


@router.post("/index")
async def index_rag(body: IndexRequest, request: Request) -> dict[str, object]:
    try:
        return index_documents(index_file(_settings(request).artifacts_dir), body)
    except RagServiceError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error


@router.post("/retrieve")
async def retrieve_rag(body: RetrieveRequest, request: Request) -> dict[str, object]:
    path = index_file(_settings(request).artifacts_dir)
    try:
        index = RagIndex.load(path)
    except (OSError, ValueError) as error:
        raise HTTPException(status_code=409, detail="Retrieval index is not available") from error
    try:
        return retrieve_context(
            index=index,
            query=body.query,
            strategy=body.strategy,
            top_k=body.top_k,
            filters=body.filters,
            conversation=body.conversation,
            facts=body.current_facts,
            semantic_candidates=body.semantic_candidates,
            keyword_candidates=body.keyword_candidates,
            expected_index_version=body.expected_index_version,
            max_context_tokens=body.max_context_tokens,
            grounding=body.grounding,
        )
    except RagServiceError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error


@router.post("/evaluate")
async def evaluate_rag(body: EvaluateRequest) -> dict[str, object]:
    if body.dataset != "synthetic":
        raise HTTPException(status_code=400, detail="Only the synthetic dataset is available")
    return run_evaluation(load_synthetic_dataset(), body)
