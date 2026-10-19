"""Versioned JSON index. Writes are atomic and idempotent by document id."""

import json
from pathlib import Path

from app.rag.chunking import chunk_document
from app.rag.documents import normalize_faq, normalize_policy, normalize_product
from app.rag.embeddings import (
    embedding_version_label,
    hash_embed,
    validate_dimensions,
)
from app.rag.schemas import (
    INDEX_VERSION,
    FaqSource,
    IndexRequest,
    PolicySource,
    ProductSource,
    RagChunk,
    RagDocument,
)


class IndexError_(Exception):
    """Indexing failure that is safe to show to the calling backend."""


class RagIndex:
    def __init__(self) -> None:
        self.index_version = INDEX_VERSION
        self.embedding_version = ""
        self.documents: dict[str, RagDocument] = {}
        self.chunks: dict[str, RagChunk] = {}
        self.failed: dict[str, dict[str, str | int]] = {}

    def to_dict(self) -> dict[str, object]:
        return {
            "index_version": self.index_version,
            "embedding_version": self.embedding_version,
            "documents": {key: value.model_dump() for key, value in self.documents.items()},
            "chunks": {key: value.model_dump() for key, value in self.chunks.items()},
            "failed": self.failed,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, object]) -> "RagIndex":
        index = cls()
        version = payload.get("index_version")
        index.index_version = str(version or INDEX_VERSION)
        index.embedding_version = str(payload.get("embedding_version") or "")
        documents = payload.get("documents")
        chunks = payload.get("chunks")
        failed = payload.get("failed")
        if isinstance(documents, dict):
            for key, value in documents.items():
                if isinstance(value, dict):
                    index.documents[str(key)] = RagDocument.model_validate(value)
        if isinstance(chunks, dict):
            for key, value in chunks.items():
                if isinstance(value, dict):
                    index.chunks[str(key)] = RagChunk.model_validate(value)
        if isinstance(failed, dict):
            for key, value in failed.items():
                if isinstance(value, dict):
                    index.failed[str(key)] = {
                        "error": str(value.get("error", "failed"))[:180],
                        "attempts": int(value.get("attempts", 1)),
                    }
        return index

    @classmethod
    def load(cls, path: Path) -> "RagIndex":
        if not path.exists():
            return cls()
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise IndexError_("Retrieval index is unreadable")
        return cls.from_dict(payload)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps(self.to_dict()), encoding="utf-8")
        temporary.replace(path)

    def prune(self, document_ids: list[str]) -> int:
        removed = 0
        for document_id in document_ids:
            if document_id in self.documents:
                del self.documents[document_id]
                removed += 1
            self.failed.pop(document_id, None)
            stale = [
                chunk_id
                for chunk_id, chunk in self.chunks.items()
                if chunk.document_id == document_id
            ]
            for chunk_id in stale:
                del self.chunks[chunk_id]
        return removed

    def _record_failure(self, document_id: str, message: str) -> None:
        previous = self.failed.get(document_id, {})
        attempts = int(previous.get("attempts", 0)) + 1
        self.failed[document_id] = {"error": message[:180], "attempts": attempts}

    def _unchanged(self, document: RagDocument) -> bool:
        existing = self.documents.get(document.document_id)
        if existing is None or existing.content_hash != document.content_hash:
            return False
        if existing.embedding_version != document.embedding_version:
            return False
        related = [
            chunk for chunk in self.chunks.values() if chunk.document_id == document.document_id
        ]
        return bool(related) and all(len(chunk.embedding) > 0 for chunk in related)

    def upsert_documents(
        self,
        documents: list[RagDocument],
        *,
        embedding_mode: str,
        embedding_version: str,
        chunk_embeddings: dict[str, list[float]],
        chunk_size: int,
        chunk_overlap: int,
    ) -> dict[str, int]:
        version = embedding_version_label(embedding_mode, embedding_version)
        self.embedding_version = version
        indexed = 0
        skipped = 0
        failed = 0
        for document in documents:
            document.embedding_version = version
            if self._unchanged(document):
                skipped += 1
                self.failed.pop(document.document_id, None)
                continue
            chunks = chunk_document(document, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
            if not chunks:
                self._record_failure(document.document_id, "Document produced no chunks")
                failed += 1
                continue
            prepared: list[RagChunk] = []
            chunk_error = ""
            for chunk in chunks:
                chunk.embedding_version = version
                if embedding_mode == "hashing":
                    chunk.embedding = hash_embed(f"{chunk.section}\n{chunk.content}")
                else:
                    vector = chunk_embeddings.get(chunk.chunk_id)
                    if vector is None:
                        chunk_error = "Missing embedding for changed chunk"
                        break
                    try:
                        validate_dimensions(vector)
                    except ValueError as error:
                        chunk_error = str(error)
                        break
                    chunk.embedding = vector
                prepared.append(chunk)
            if chunk_error:
                self._record_failure(document.document_id, chunk_error)
                failed += 1
                continue
            stale = [
                chunk_id
                for chunk_id, chunk in self.chunks.items()
                if chunk.document_id == document.document_id
            ]
            for chunk_id in stale:
                del self.chunks[chunk_id]
            for chunk in prepared:
                self.chunks[chunk.chunk_id] = chunk
            self.documents[document.document_id] = document
            self.failed.pop(document.document_id, None)
            indexed += 1
        return {
            "indexed": indexed,
            "skipped": skipped,
            "failed": failed,
            "chunks": len(self.chunks),
        }


def collect_documents(
    products: list[ProductSource],
    policies: list[PolicySource],
    faqs: list[FaqSource],
    *,
    embedding_version: str,
) -> tuple[list[RagDocument], list[str]]:
    documents: list[RagDocument] = []
    inactive: list[str] = []
    for product in products:
        document = normalize_product(product, embedding_version=embedding_version)
        if document is None:
            inactive.append(f"product:{product.source_id}")
            continue
        documents.append(document)
    for policy in policies:
        document = normalize_policy(policy, embedding_version=embedding_version)
        if document is None:
            inactive.append(f"{policy.source_type}:{policy.source_id}")
            continue
        documents.append(document)
    for faq in faqs:
        document = normalize_faq(faq, embedding_version=embedding_version)
        if document is None:
            inactive.append(f"faq:{faq.source_id}")
            continue
        documents.append(document)
    return documents, inactive


def apply_index_request(index: RagIndex, request: IndexRequest) -> dict[str, int]:
    if request.chunk_overlap >= request.chunk_size:
        raise IndexError_("chunk overlap must be smaller than chunk size")
    if len(request.chunk_embeddings) > 200:
        raise IndexError_("Too many chunk embeddings")
    version = ""
    try:
        version = embedding_version_label(request.embedding_mode, request.embedding_version)
    except ValueError as error:
        raise IndexError_(str(error)) from error
    documents, inactive = collect_documents(
        request.products,
        request.policies,
        request.faqs,
        embedding_version=version,
    )
    removed = index.prune([*request.prune_document_ids, *inactive])
    if not documents:
        return {
            "indexed": 0,
            "skipped": 0,
            "failed": 0,
            "chunks": len(index.chunks),
            "pruned": removed,
        }
    stats = index.upsert_documents(
        documents,
        embedding_mode=request.embedding_mode,
        embedding_version=request.embedding_version,
        chunk_embeddings=request.chunk_embeddings,
        chunk_size=request.chunk_size,
        chunk_overlap=request.chunk_overlap,
    )
    stats["pruned"] = removed
    return stats
