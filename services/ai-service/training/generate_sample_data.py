"""Write the deterministic synthetic product and relevance files."""

import argparse
import json
import sys
from pathlib import Path

from training.sample_catalog import (
    dataset_manifest,
    render_products_jsonl,
    render_relevance_jsonl,
)

SERVICE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = SERVICE_ROOT / "datasets" / "synthetic"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate the synthetic product dataset and separate relevance labels.",
    )
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args(argv)
    output_dir: Path = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    _write(output_dir / "products.jsonl", render_products_jsonl())
    _write(output_dir / "relevance.jsonl", render_relevance_jsonl())
    _write(
        output_dir / "dataset_manifest.json",
        json.dumps(dataset_manifest(), indent=2, sort_keys=True) + "\n",
    )
    print(f"Wrote synthetic dataset to {output_dir}")
    return 0


def _write(path: Path, contents: str) -> None:
    path.write_text(contents, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    sys.exit(main())
