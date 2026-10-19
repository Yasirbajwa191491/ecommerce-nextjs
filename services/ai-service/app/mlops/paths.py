"""Trusted artifact roots. Callers never choose a filesystem path."""

from __future__ import annotations

from pathlib import Path

from app.core.config import Settings


class UnsafePathError(ValueError):
    """A path escaped the trusted artifact root or named a parent directory."""


def resolve_trusted(root: Path, relative: str) -> Path:
    """Resolve a relative file name and reject traversal."""

    if not relative or relative != Path(relative).name:
        raise UnsafePathError("Artifact file name is not allowed")
    if relative in {".", ".."} or ".." in Path(relative).parts:
        raise UnsafePathError("Artifact file name is not allowed")
    base = root.resolve()
    candidate = (base / relative).resolve()
    if not candidate.is_relative_to(base):
        raise UnsafePathError("Artifact path escaped the trusted root")
    return candidate


def configured_family_dir(settings: Settings, family: str) -> Path | None:
    """Return the env-configured directory for a family, never a request path."""

    artifacts = Path(settings.artifacts_dir)
    mapping = {
        "content": settings.content_model_dir or str(artifacts / "content-v1"),
        "collaborative": settings.collaborative_model_dir or str(artifacts / "collaborative-v1"),
        "hybrid": settings.hybrid_model_dir or str(artifacts / "hybrid-v1"),
        "neural": settings.neural_model_dir or str(artifacts / "neural-v1"),
        "demand_forecast": str(artifacts / "forecasting" / "demand-forecast-v1"),
    }
    raw = mapping.get(family, "").strip()
    if not raw:
        return None
    path = Path(raw)
    if ".." in path.parts:
        raise UnsafePathError("Configured artifact directory is not allowed")
    return path
