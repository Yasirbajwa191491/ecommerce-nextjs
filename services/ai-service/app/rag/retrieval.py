"""Keyword, semantic, and hybrid retrieval over the local index or Convex candidates."""

import math
import re
from collections import Counter

from app.rag.embeddings import cosine, hash_embed, tokenize
from app.rag.index_store import RagIndex
from app.rag.ranking import reciprocal_rank_fusion
from app.rag.schemas import (
    CandidateChunk,
    ProductFact,
    RagChunk,
    RetrievalFilters,
    RetrievalStrategy,
)

_TOKEN = re.compile(r"[a-z0-9]+")
_SAFE_ID = re.compile(r"^[A-Za-z0-9_.:-]{1,160}$")

_STOPWORDS = frozenset(
    {
        "a",
        "an",
        "and",
        "are",
        "be",
        "can",
        "do",
        "does",
        "for",
        "how",
        "i",
        "in",
        "is",
        "it",
        "me",
        "my",
        "of",
        "on",
        "or",
        "the",
        "this",
        "to",
        "what",
        "with",
        "you",
    }
)


def query_terms(text: str) -> list[str]:
    return [token for token in tokenize(text) if token not in _STOPWORDS]


def _bm25_scores(query: str, chunks: list[RagChunk]) -> dict[str, float]:
    terms = query_terms(query)
    if not terms or not chunks:
        return {}
    documents = [tokenize(f"{chunk.title} {chunk.section} {chunk.content}") for chunk in chunks]
    average = sum(len(tokens) for tokens in documents) / len(documents)
    df: Counter[str] = Counter()
    for tokens in documents:
        df.update(set(tokens))
    scores: dict[str, float] = {}
    k1 = 1.2
    b = 0.75
    total = len(chunks)
    for chunk, tokens in zip(chunks, documents, strict=True):
        tf = Counter(tokens)
        length = len(tokens) or 1
        score = 0.0
        for term in terms:
            if term not in tf:
                continue
            idf = math.log(1 + (total - df[term] + 0.5) / (df[term] + 0.5))
            frequency = tf[term]
            score += (
                idf * (frequency * (k1 + 1)) / (frequency + k1 * (1 - b + b * length / average))
            )
        if score > 0:
            scores[chunk.chunk_id] = score
    return scores


def _passes_filters(
    chunk: RagChunk,
    filters: RetrievalFilters,
    facts: dict[str, ProductFact],
    *,
    available_only: bool,
) -> bool:
    if chunk.visibility != "public":
        return False
    if filters.source_types and chunk.source_type not in filters.source_types:
        return False
    if filters.product_ids and chunk.product_id not in filters.product_ids:
        return False
    category = chunk.metadata.get("category", "")
    brand = chunk.metadata.get("brand", "")
    if filters.category and filters.category.lower() not in category.lower():
        return False
    if filters.brand and filters.brand.lower() not in brand.lower():
        return False
    if available_only and chunk.source_type == "product" and chunk.product_id:
        fact = facts.get(chunk.product_id)
        if fact is not None and (
            not fact.available or (fact.stock is not None and fact.stock <= 0)
        ):
            return False
    return True


def _from_candidate(candidate: CandidateChunk) -> RagChunk | None:
    if not _SAFE_ID.match(candidate.chunk_id) or not _SAFE_ID.match(candidate.document_id):
        return None
    if candidate.product_id and not _SAFE_ID.match(candidate.product_id):
        return None
    metadata = {
        key: value
        for key, value in candidate.metadata.items()
        if key in {"brand", "category", "name", "section"} and len(value) <= 200
    }
    return RagChunk(
        chunk_id=candidate.chunk_id,
        document_id=candidate.document_id,
        source_type=candidate.source_type,
        source_id=candidate.source_id,
        product_id=candidate.product_id,
        title=candidate.title,
        section=candidate.section,
        content=candidate.content,
        metadata=metadata,
        content_hash="",
        visibility="public",
    )


def _rank_ids(scores: dict[str, float]) -> list[str]:
    return [
        item_id for item_id, _score in sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    ]


def retrieve_chunks(
    *,
    index: RagIndex | None,
    query: str,
    strategy: RetrievalStrategy,
    limit: int,
    filters: RetrievalFilters,
    facts: list[ProductFact],
    semantic_candidates: list[CandidateChunk],
    keyword_candidates: list[CandidateChunk],
    candidate_pool: int = 20,
) -> tuple[list[tuple[RagChunk, float]], str]:
    fact_map = {fact.product_id: fact for fact in facts}
    pool: dict[str, RagChunk] = {}
    semantic_scores: dict[str, float] = {}
    keyword_scores: dict[str, float] = {}
    candidate_mode = bool(semantic_candidates or keyword_candidates)

    if candidate_mode:
        for candidate in semantic_candidates:
            chunk = _from_candidate(candidate)
            if chunk is None:
                continue
            pool[chunk.chunk_id] = chunk
            previous = semantic_scores.get(chunk.chunk_id, 0)
            semantic_scores[chunk.chunk_id] = max(previous, candidate.score)
        for candidate in keyword_candidates:
            chunk = _from_candidate(candidate)
            if chunk is None:
                continue
            pool.setdefault(chunk.chunk_id, chunk)
            previous = keyword_scores.get(chunk.chunk_id, 0)
            keyword_scores[chunk.chunk_id] = max(previous, candidate.score)
        used = "convex_candidates"
    else:
        used = "local_index"
        if index is None or not index.chunks:
            return [], used
        for chunk in index.chunks.values():
            pool[chunk.chunk_id] = chunk

    filtered = [
        chunk
        for chunk in pool.values()
        if _passes_filters(
            chunk,
            filters,
            fact_map,
            available_only=filters.available_only,
        )
    ]
    if not filtered:
        return [], used

    if strategy in {"keyword", "hybrid"} and not keyword_scores and not candidate_mode:
        keyword_scores = _bm25_scores(query, filtered)
    if strategy in {"semantic", "hybrid"} and not semantic_scores and not candidate_mode:
        query_vector = hash_embed(" ".join(query_terms(query)) or query)
        for chunk in filtered:
            vector = chunk.embedding or hash_embed(f"{chunk.section}\n{chunk.content}")
            similarity = cosine(query_vector, vector)
            if similarity >= 0.2:
                semantic_scores[chunk.chunk_id] = similarity

    if strategy == "keyword":
        ranking = _rank_ids(keyword_scores)[:candidate_pool]
        fused = [(item_id, keyword_scores[item_id]) for item_id in ranking]
        method = f"{used}:keyword"
    elif strategy == "semantic":
        ranking = _rank_ids(semantic_scores)[:candidate_pool]
        fused = [(item_id, semantic_scores[item_id]) for item_id in ranking]
        method = f"{used}:semantic"
    else:
        fused = reciprocal_rank_fusion(
            [
                _rank_ids(keyword_scores)[:candidate_pool],
                _rank_ids(semantic_scores)[:candidate_pool],
            ]
        )
        method = f"{used}:hybrid"

    by_id = {chunk.chunk_id: chunk for chunk in filtered}
    selected: list[tuple[RagChunk, float]] = []
    seen_content: set[str] = set()
    for chunk_id, score in fused:
        chunk = by_id.get(chunk_id)
        if chunk is None:
            continue
        fingerprint = _TOKEN.sub("", chunk.content.lower())
        if fingerprint in seen_content:
            continue
        seen_content.add(fingerprint)
        selected.append((chunk, score))
        if len(selected) >= limit:
            break
    return selected, method
