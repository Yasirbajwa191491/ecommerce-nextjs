"""Load the packaged synthetic dataset. Callers cannot choose a filesystem path."""

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


def synthetic_dataset_path() -> Path:
    return Path(__file__).resolve().parents[2] / "evaluation" / "datasets" / "rag_synthetic.json"


@lru_cache(maxsize=1)
def load_synthetic_dataset() -> dict[str, Any]:
    path = synthetic_dataset_path()
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or "index" not in payload or "queries" not in payload:
        raise ValueError("Synthetic RAG dataset is invalid")
    return payload
