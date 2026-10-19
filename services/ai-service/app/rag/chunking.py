"""Deterministic chunking that keeps headings and specification lines together."""

import hashlib

from app.rag.schemas import DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE, RagChunk, RagDocument


def chunk_id_for(document_id: str, section: str, content: str) -> str:
    digest = hashlib.sha256(f"{document_id}\n{section}\n{content}".encode()).hexdigest()
    return f"{document_id}#{digest[:16]}"


def _heading_sections(content: str, fallback: str) -> list[tuple[str, str]]:
    sections: list[tuple[str, str]] = []
    current_heading = fallback
    buffer: list[str] = []
    for line in content.splitlines():
        if line.startswith("# "):
            if buffer:
                text = "\n".join(buffer).strip()
                if text:
                    sections.append((current_heading, text))
            current_heading = line[2:].strip() or fallback
            buffer = []
            continue
        buffer.append(line)
    tail = "\n".join(buffer).strip()
    if tail:
        sections.append((current_heading, tail))
    if not sections and content.strip():
        sections.append((fallback, content.strip()))
    return sections


def _is_spec_section(heading: str) -> bool:
    lowered = heading.lower()
    return "specification" in lowered or lowered == "features"


def _pack_lines(lines: list[str], size: int) -> list[str]:
    groups: list[str] = []
    current: list[str] = []
    current_len = 0
    for line in lines:
        piece = line.strip()
        if not piece:
            continue
        extra = len(piece) + 1
        if current and current_len + extra > size:
            groups.append("\n".join(current))
            current = [piece]
            current_len = len(piece)
            continue
        current.append(piece)
        current_len += extra
    if current:
        groups.append("\n".join(current))
    return groups


def _window(text: str, size: int, overlap: int) -> list[str]:
    cleaned = text.strip()
    if not cleaned:
        return []
    if len(cleaned) <= size:
        return [cleaned]
    pieces: list[str] = []
    start = 0
    while start < len(cleaned):
        end = min(len(cleaned), start + size)
        if end < len(cleaned):
            break_at = cleaned.rfind("\n", start, end)
            if break_at <= start:
                break_at = cleaned.rfind(" ", start, end)
            if break_at > start + size // 2:
                end = break_at
        piece = cleaned[start:end].strip()
        if piece:
            pieces.append(piece)
        if end >= len(cleaned):
            break
        next_start = max(end - overlap, start + 1)
        start = next_start
    return pieces


def chunk_document(
    document: RagDocument,
    *,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[RagChunk]:
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk overlap must be smaller than chunk size")
    chunks: list[RagChunk] = []
    for heading, body in _heading_sections(document.content, document.title):
        parts = (
            _pack_lines(body.splitlines(), chunk_size)
            if _is_spec_section(heading)
            else _window(body, chunk_size, chunk_overlap)
        )
        for part in parts:
            content = f"{heading}\n{part}".strip()
            if not content:
                continue
            metadata = dict(document.metadata)
            metadata["section"] = heading
            chunks.append(
                RagChunk(
                    chunk_id=chunk_id_for(document.document_id, heading, part),
                    document_id=document.document_id,
                    source_type=document.source_type,
                    source_id=document.source_id,
                    product_id=document.product_id,
                    title=document.title,
                    section=heading,
                    content=content,
                    metadata=metadata,
                    content_hash=document.content_hash,
                    visibility="public",
                    embedding_version=document.embedding_version,
                )
            )
    return chunks
