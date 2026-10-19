"""Local hashing embeddings for tests and offline evaluation.

Production customer indexing sends 384-dimension vectors from the existing
Convex embedding providers (the same width as `products.by_embedding`). This
module does not call a paid embedding API. The hashing embedder is deterministic
and is not a substitute for all-MiniLM or the configured provider model.
"""

import hashlib
import math
import re

from app.rag.schemas import EMBEDDING_DIMENSIONS, HASHING_EMBEDDING_VERSION

_TOKEN = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    return _TOKEN.findall(text.lower())


def validate_dimensions(vector: list[float], *, expected: int = EMBEDDING_DIMENSIONS) -> None:
    if len(vector) != expected:
        raise ValueError(f"embedding dimension {len(vector)} does not match {expected}")
    if not all(math.isfinite(value) for value in vector):
        raise ValueError("embedding contains a non-finite value")


def _normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]


def hash_embed(text: str) -> list[float]:
    vector = [0.0] * EMBEDDING_DIMENSIONS
    tokens = tokenize(text) or ["empty"]
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        bucket = int.from_bytes(digest[:2], "big") % EMBEDDING_DIMENSIONS
        sign = 1.0 if digest[2] % 2 == 0 else -1.0
        vector[bucket] += sign
    return _normalize(vector)


def hash_embed_batch(texts: list[str]) -> list[list[float]]:
    return [hash_embed(text) for text in texts]


def cosine(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        return 0.0
    return sum(a * b for a, b in zip(left, right, strict=True))


def embedding_version_label(mode: str, provided_version: str) -> str:
    if mode == "hashing":
        return HASHING_EMBEDDING_VERSION
    cleaned = provided_version.strip()
    if not cleaned:
        raise ValueError("provided embeddings require an embedding version")
    return cleaned[:80]
