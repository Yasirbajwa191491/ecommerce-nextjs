"""Offline retrieval and grounded-answer checks on the synthetic dataset.

Scores describe that dataset only. They are not production quality.
"""

import math
import re
import time
from typing import Any

from app.rag.grounding import validate_grounding
from app.rag.index_store import RagIndex, apply_index_request
from app.rag.retrieval import retrieve_chunks
from app.rag.schemas import (
    HASHING_EMBEDDING_VERSION,
    EvaluateRequest,
    IndexRequest,
    ProductFact,
    RagChunk,
    RetrievalFilters,
    RetrievalStrategy,
)
from app.rag.service import retrieve_context


def _dcg(gains: list[float]) -> float:
    return sum(gain / math.log2(index + 2) for index, gain in enumerate(gains))


def _ndcg(ranked: list[str], relevant: set[str], k: int) -> float:
    gains = [1.0 if item in relevant else 0.0 for item in ranked[:k]]
    ideal = [1.0] * min(k, len(relevant))
    idcg = _dcg(ideal)
    if idcg == 0:
        return 0.0
    return _dcg(gains) / idcg


def _source_ids(hits: list[tuple[RagChunk, float]]) -> list[str]:
    ordered: list[str] = []
    for chunk, _score in hits:
        if chunk.source_id not in ordered:
            ordered.append(chunk.source_id)
    return ordered


def score_retrieval(
    *,
    index: RagIndex,
    queries: list[dict[str, Any]],
    strategy: RetrievalStrategy,
    k: int,
) -> dict[str, float | int | str]:
    recalls: list[float] = []
    precisions: list[float] = []
    reciprocal: list[float] = []
    ndcgs: list[float] = []
    empty = 0
    coverage_hits = 0
    coverage_total = 0
    latencies: list[float] = []
    for case in queries:
        expected = set(case.get("expected_source_ids") or [])
        expected_types = set(case.get("expected_source_types") or [])
        started = time.perf_counter()
        hits, _method = retrieve_chunks(
            index=index,
            query=str(case["query"]),
            strategy=strategy,
            limit=k,
            filters=RetrievalFilters.model_validate(case.get("filters") or {}),
            facts=[ProductFact.model_validate(item) for item in case.get("current_facts") or []],
            semantic_candidates=[],
            keyword_candidates=[],
        )
        latencies.append((time.perf_counter() - started) * 1000)
        ranked = _source_ids(hits)
        if not ranked:
            empty += 1
        if expected:
            found = [item for item in ranked[:k] if item in expected]
            recalls.append(len(set(found)) / len(expected))
            precisions.append(len(set(found)) / k)
            rank = next((index + 1 for index, item in enumerate(ranked) if item in expected), None)
            reciprocal.append(0.0 if rank is None else 1 / rank)
            ndcgs.append(_ndcg(ranked, expected, k))
        if expected_types:
            coverage_total += len(expected_types)
            got = {chunk.source_type for chunk, _score in hits}
            coverage_hits += len(expected_types & got)
    count = len(queries) or 1
    graded = max(1, len(recalls))
    return {
        "strategy": strategy,
        "queries": len(queries),
        "recall_at_k": round(sum(recalls) / graded, 4) if recalls else 0.0,
        "precision_at_k": round(sum(precisions) / graded, 4) if precisions else 0.0,
        "mrr": round(sum(reciprocal) / graded, 4) if reciprocal else 0.0,
        "ndcg_at_k": round(sum(ndcgs) / graded, 4) if ndcgs else 0.0,
        "empty_result_rate": round(empty / count, 4),
        "source_coverage": round(coverage_hits / coverage_total, 4) if coverage_total else 0.0,
        "mean_latency_ms": round(sum(latencies) / count, 3),
        "embedding_version": HASHING_EMBEDDING_VERSION,
        "label": "synthetic_not_production",
    }


def score_generation(cases: list[dict[str, Any]]) -> dict[str, float | int | str]:
    total = len(cases) or 1
    citation_ok = 0
    product_ok = 0
    price_ok = 0
    stock_ok = 0
    unsupported = 0
    abstain_ok = 0
    abstain_cases = 0
    injection_ok = 0
    injection_cases = 0
    relevant = 0
    for case in cases:
        chunks = [RagChunk.model_validate(item) for item in case.get("chunks") or []]
        facts = [ProductFact.model_validate(item) for item in case.get("current_facts") or []]
        result = validate_grounding(
            answer=str(case.get("draft_answer") or ""),
            citation_ids=list(case.get("citation_ids") or []),
            chunks=chunks,
            facts=facts,
            mode=case.get("grounding") or "strict",
        )
        reasons = set(result["reasons"]) if isinstance(result["reasons"], list) else set()
        if "invalid_citation" not in reasons:
            citation_ok += 1
        product_ids = {chunk.product_id for chunk in chunks if chunk.product_id}
        answer = str(result["answer"])
        mentioned = set(re.findall(r"\bp-[a-z0-9-]+\b", answer.lower()))
        if not mentioned - {item.lower() for item in product_ids}:
            product_ok += 1
        if "price_mismatch" not in reasons:
            price_ok += 1
        if "stock_mismatch" not in reasons:
            stock_ok += 1
        if reasons & {"unsupported", "price_mismatch", "stock_mismatch", "unsafe_output"}:
            unsupported += 1
        if case.get("expect_abstention"):
            abstain_cases += 1
            if result["grounded"] is False or "don't have enough verified" in answer.lower():
                abstain_ok += 1
        if case.get("injection"):
            injection_cases += 1
            if (
                "unsafe_output" in reasons
                or "price_mismatch" in reasons
                or result["grounded"] is False
            ):
                injection_ok += 1
        expected_terms = [str(term).lower() for term in case.get("relevant_terms") or []]
        if not expected_terms or any(term in answer.lower() for term in expected_terms):
            relevant += 1
    return {
        "cases": len(cases),
        "citation_validity": round(citation_ok / total, 4),
        "product_reference_validity": round(product_ok / total, 4),
        "price_correctness": round(price_ok / total, 4),
        "stock_correctness": round(stock_ok / total, 4),
        "unsupported_claim_rate": round(unsupported / total, 4),
        "answer_relevance": round(relevant / total, 4),
        "abstention_correctness": round(abstain_ok / abstain_cases, 4) if abstain_cases else 1.0,
        "prompt_injection_resistance": round(injection_ok / injection_cases, 4)
        if injection_cases
        else 1.0,
        "label": "deterministic_checks_not_llm_judge",
    }


def run_evaluation(dataset: dict[str, Any], request: EvaluateRequest) -> dict[str, Any]:
    index = RagIndex()
    stats = apply_index_request(index, IndexRequest.model_validate(dataset["index"]))
    queries = list(dataset.get("queries") or [])
    strategies: tuple[RetrievalStrategy, ...] = ("keyword", "semantic", "hybrid")
    retrieval = {
        strategy: score_retrieval(index=index, queries=queries, strategy=strategy, k=request.k)
        for strategy in strategies
    }
    # Touch the public retrieve path once so end-to-end latency is measured separately.
    started = time.perf_counter()
    if queries:
        retrieve_context(
            index=index,
            query=str(queries[0]["query"]),
            strategy="hybrid",
            top_k=request.k,
            filters=RetrievalFilters(),
            conversation=[],
            facts=[],
            semantic_candidates=[],
            keyword_candidates=[],
            expected_index_version="",
            max_context_tokens=800,
            grounding="strict",
        )
    generation_latency_ms = round((time.perf_counter() - started) * 1000, 3)
    judge: dict[str, str]
    if request.llm_judge:
        judge = {
            "status": "skipped",
            "reason": (
                "LLM-as-judge is opt-in and is not an objective score. "
                "This service does not call the Convex provider chain."
            ),
        }
    else:
        judge = {"status": "not_requested"}
    return {
        "dataset": "synthetic",
        "index": stats,
        "embedding_version": HASHING_EMBEDDING_VERSION,
        "retrieval": retrieval,
        "generation": score_generation(list(dataset.get("generation_cases") or [])),
        "retrieval_versus_generation_latency_ms": {
            "retrieval_mean_ms": retrieval["hybrid"]["mean_latency_ms"],
            "context_assembly_ms": generation_latency_ms,
            "llm_generation_ms": None,
        },
        "llm_judge": judge,
        "disclaimer": "Synthetic evaluation only. Not a production-quality score.",
    }
