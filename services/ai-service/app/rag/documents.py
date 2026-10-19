"""Normalize catalog, policy, and FAQ records into public RAG documents.

Dynamic prices and stock are intentionally omitted. Callers pass those as
current facts at answer time.
"""

import hashlib
import json
import re
from datetime import UTC, datetime

from app.rag.schemas import (
    FaqSource,
    PolicySource,
    ProductSource,
    RagDocument,
    SourceType,
)

_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_PHONE = re.compile(r"(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}")
_SECRET = re.compile(r"(?i)\b(api[_ ]?key|secret|password|bearer|sk-[a-z0-9]{8,}|service token)\b")
_PRIVATE_LABELS = (
    "admin note",
    "private note",
    "customer email",
    "payment",
    "card number",
)


def content_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def document_id(source_type: str, source_id: str) -> str:
    return f"{source_type}:{source_id.strip()}"


def redact_customer_data(value: str) -> str:
    text = _EMAIL.sub("[redacted]", value)
    text = _PHONE.sub("[redacted]", text)
    text = _SECRET.sub("[redacted]", text)
    return text


def plain_text(value: str) -> str:
    raw = value.strip()
    if not raw.startswith("{"):
        return redact_customer_data(raw)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return redact_customer_data(raw)
    parts: list[str] = []

    def walk(node: object) -> None:
        if isinstance(node, dict):
            node_type = node.get("type")
            if node_type == "text" and isinstance(node.get("text"), str):
                parts.append(node["text"])
            children = node.get("content")
            if isinstance(children, list):
                for child in children:
                    walk(child)
        elif isinstance(node, list):
            for child in node:
                walk(child)

    walk(parsed)
    return redact_customer_data("\n".join(part for part in parts if part.strip()))


def _clean_lines(lines: list[str], limit: int) -> list[str]:
    cleaned: list[str] = []
    for line in lines:
        text = plain_text(line).strip()
        lowered = text.lower()
        if not text or any(label in lowered for label in _PRIVATE_LABELS):
            continue
        cleaned.append(text)
        if len(cleaned) >= limit:
            break
    return cleaned


def _stamp() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def normalize_product(
    source: ProductSource,
    *,
    embedding_version: str = "",
    updated_at: str | None = None,
) -> RagDocument | None:
    if not source.active:
        return None
    highlights = _clean_lines(source.highlights, 12)
    specifications = _clean_lines(source.specifications, 24)
    delivery = _clean_lines(source.delivery_options, 8)
    warranty = plain_text(source.warranty).strip()
    description = plain_text(source.description).strip()
    sections = [
        f"# {source.name}",
        f"Brand: {plain_text(source.brand)}".strip(),
        f"Category: {plain_text(source.category)}".strip(),
        "# Description",
        description or "No description is published for this product.",
    ]
    if highlights:
        sections.extend(["# Features", "\n".join(f"- {item}" for item in highlights)])
    if specifications:
        sections.extend(["# Specifications", "\n".join(f"- {item}" for item in specifications)])
    sections.extend(
        [
            "# Warranty",
            warranty or "No warranty terms are published for this product.",
            "# Delivery options",
            "\n".join(f"- {item}" for item in delivery)
            if delivery
            else "Delivery options are confirmed on the product page. Charges are not indexed.",
            "Current price, discount, and stock are not part of this document.",
        ]
    )
    content = "\n".join(line for line in sections if line).strip()
    if not content:
        return None
    metadata = {
        "brand": plain_text(source.brand)[:120],
        "category": plain_text(source.category)[:120],
        "name": source.name[:200],
    }
    return RagDocument(
        document_id=document_id("product", source.source_id),
        source_type="product",
        source_id=source.source_id,
        title=source.name,
        content=content,
        metadata=metadata,
        content_hash=content_hash(content),
        updated_at=updated_at or _stamp(),
        visibility="public",
        embedding_version=embedding_version,
        product_id=source.source_id,
    )


def normalize_policy(
    source: PolicySource,
    *,
    embedding_version: str = "",
    updated_at: str | None = None,
) -> RagDocument | None:
    if not source.active:
        return None
    body = plain_text(source.content).strip()
    if not body:
        return None
    content = f"# {source.title}\n{body}"
    return RagDocument(
        document_id=document_id(source.source_type, source.source_id),
        source_type=source.source_type,
        source_id=source.source_id,
        title=source.title,
        content=content,
        metadata={"section": source.title},
        content_hash=content_hash(content),
        updated_at=updated_at or _stamp(),
        visibility="public",
        embedding_version=embedding_version,
    )


def normalize_faq(
    source: FaqSource,
    *,
    embedding_version: str = "",
    updated_at: str | None = None,
) -> RagDocument | None:
    if not source.active:
        return None
    question = plain_text(source.question).strip()
    answer = plain_text(source.answer).strip()
    if not question or not answer:
        return None
    content = f"# {question}\n{answer}"
    return RagDocument(
        document_id=document_id("faq", source.source_id),
        source_type="faq",
        source_id=source.source_id,
        title=question,
        content=content,
        metadata={"section": "FAQ"},
        content_hash=content_hash(content),
        updated_at=updated_at or _stamp(),
        visibility="public",
        embedding_version=embedding_version,
    )


def source_type_of(document_id_value: str) -> SourceType | None:
    prefix = document_id_value.split(":", 1)[0]
    allowed: tuple[SourceType, ...] = (
        "product",
        "shipping_policy",
        "return_policy",
        "privacy_policy",
        "terms",
        "faq",
    )
    if prefix in allowed:
        return prefix
    return None
