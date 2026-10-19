"""Deterministic grounding checks.

String checks catch known failure modes. They do not prove an answer is free of
every hallucination.
"""

import json
import re

from app.rag.schemas import Citation, GroundingMode, ProductFact, RagChunk

_CITE = re.compile(r"\[cite:([A-Za-z0-9_.:#-]{1,180})\]")
_MONEY = re.compile(r"(?:\$|USD\s*)(\d+(?:\.\d{1,2})?)")
_ORDER_CLAIM = re.compile(
    r"\b(order (has been|was) placed|I placed your order|payment (is|was) complete)\b", re.I
)
_LEAK = re.compile(
    r"(ignore previous instructions|api[_ ]?key|sk-[A-Za-z0-9]{8,}|BEGIN SYSTEM|system prompt)",
    re.I,
)
_IN_STOCK = re.compile(r"\bin stock\b", re.I)
_OUT_OF_STOCK = re.compile(r"\bout of stock\b", re.I)
_URL = re.compile(r"https?://\S+|www\.\S+", re.I)

SAFE_FALLBACK = (
    "I don't have enough verified store information to answer that. "
    "Please check the product page or the shipping and return policies."
)

_POLICY_URLS = {
    "shipping_policy": "/shipping",
    "return_policy": "/return",
    "privacy_policy": "/privacy",
    "terms": "/terms",
    "faq": "/ai-shopping",
}


def safe_citation(chunk: RagChunk) -> Citation:
    if (
        chunk.source_type == "product"
        and chunk.product_id
        and re.fullmatch(r"[A-Za-z0-9_-]{1,128}", chunk.product_id)
    ):
        url = f"/product/{chunk.product_id}"
        product_id = chunk.product_id
    else:
        url = _POLICY_URLS.get(chunk.source_type, "/ai-shopping")
        product_id = None
    return Citation(
        source_type=chunk.source_type,
        source_id=chunk.source_id,
        product_id=product_id,
        title=chunk.title[:200],
        section=chunk.section[:160],
        url=url,
        chunk_id=chunk.chunk_id,
    )


def parse_model_payload(raw: str) -> tuple[str, list[str]]:
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        return raw.strip(), _CITE.findall(raw)
    try:
        payload = json.loads(match.group(0))
    except json.JSONDecodeError:
        return raw.strip(), _CITE.findall(raw)
    if not isinstance(payload, dict):
        return raw.strip(), []
    answer = payload.get("answer")
    ids = payload.get("citation_ids")
    text = answer.strip() if isinstance(answer, str) else raw.strip()
    citation_ids = [item for item in ids if isinstance(item, str)] if isinstance(ids, list) else []
    return text, citation_ids


def _money_values(answer: str) -> list[float]:
    return [float(match) for match in _MONEY.findall(answer)]


def _price_matches(amount: float, fact: ProductFact) -> bool:
    for candidate in (fact.final_price, fact.price):
        if candidate is not None and abs(candidate - amount) < 0.02:
            return True
    return False


def sanitize_answer(answer: str) -> str:
    text = _URL.sub("", answer)
    text = re.sub(r"\[[^\]]+\]\([^)]+\)", "", text)
    return re.sub(r"\s+", " ", text).strip()


def validate_grounding(
    *,
    answer: str,
    citation_ids: list[str],
    chunks: list[RagChunk],
    facts: list[ProductFact],
    mode: GroundingMode,
) -> dict[str, object]:
    """Return a shopper-safe answer and the citations that survived validation."""

    cleaned = sanitize_answer(answer)
    by_id = {chunk.chunk_id: chunk for chunk in chunks}
    known = [chunk_id for chunk_id in citation_ids if chunk_id in by_id]
    unknown = [chunk_id for chunk_id in citation_ids if chunk_id not in by_id]
    cited_chunks = [by_id[chunk_id] for chunk_id in known]
    fact_map = {fact.product_id: fact for fact in facts}
    reasons: list[str] = []

    if _LEAK.search(cleaned) or _ORDER_CLAIM.search(cleaned):
        reasons.append("unsafe_output")
    amounts = _money_values(cleaned)
    cited_facts = [
        fact_map[chunk.product_id]
        for chunk in cited_chunks
        if chunk.product_id and chunk.product_id in fact_map
    ]
    price_conflict = bool(amounts) and (
        not cited_facts
        or any(not any(_price_matches(amount, fact) for fact in cited_facts) for amount in amounts)
    )
    if price_conflict:
        reasons.append("price_mismatch")
    if (
        cited_facts
        and _IN_STOCK.search(cleaned)
        and all(fact.stock == 0 or not fact.available for fact in cited_facts)
    ):
        reasons.append("stock_mismatch")
    if (
        cited_facts
        and _OUT_OF_STOCK.search(cleaned)
        and all(
            fact.stock is not None and fact.stock > 0 and fact.available for fact in cited_facts
        )
    ):
        reasons.append("stock_mismatch")
    if unknown:
        reasons.append("invalid_citation")
    if chunks and not known and cleaned and not _is_abstention(cleaned):
        reasons.append("missing_citation")
    if not chunks and cleaned and not _is_abstention(cleaned):
        reasons.append("unsupported")

    citations = [safe_citation(chunk) for chunk in cited_chunks]
    fatal = set(reasons)
    if mode == "strict" and fatal:
        return {
            "answer": SAFE_FALLBACK,
            "citations": [],
            "grounded": False,
            "reasons": reasons,
        }
    if mode == "standard" and (
        "unsafe_output" in fatal
        or "unsupported" in fatal
        or "price_mismatch" in fatal
        or "stock_mismatch" in fatal
    ):
        if "price_mismatch" in fatal or "stock_mismatch" in fatal:
            note = " I can't confirm that price or stock from current store data."
            kept = SAFE_FALLBACK if "unsafe_output" in fatal else f"{cleaned}{note}"
            return {
                "answer": SAFE_FALLBACK if "unsafe_output" in fatal else kept,
                "citations": [] if "unsafe_output" in fatal else citations,
                "grounded": False,
                "reasons": reasons,
            }
        return {
            "answer": SAFE_FALLBACK,
            "citations": [],
            "grounded": False,
            "reasons": reasons,
        }
    if mode == "standard" and "invalid_citation" in fatal:
        reasons.append("dropped_invalid_citations")
    grounded = not fatal or (
        mode == "standard"
        and fatal <= {"invalid_citation", "missing_citation", "dropped_invalid_citations"}
    )
    if mode == "standard" and "missing_citation" in fatal and citations == [] and chunks:
        citations = [safe_citation(chunk) for chunk in chunks[:3]]
    return {
        "answer": cleaned or SAFE_FALLBACK,
        "citations": citations,
        "grounded": grounded and bool(cleaned),
        "reasons": reasons,
    }


def _is_abstention(answer: str) -> bool:
    lowered = answer.lower()
    return (
        "don't have" in lowered
        or "do not have" in lowered
        or "not included" in lowered
        or "cannot confirm" in lowered
    )
