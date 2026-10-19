"""CLI for indexing, retrieval, and synthetic evaluation."""

import argparse
import json
import sys
from pathlib import Path

from app.rag.dataset import load_synthetic_dataset
from app.rag.evaluation import run_evaluation
from app.rag.index_store import RagIndex
from app.rag.schemas import EvaluateRequest, IndexRequest, RetrievalFilters
from app.rag.service import index_documents, index_file, retrieve_context


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m app.rag.cli")
    parser.add_argument("--artifacts-dir", default="./artifacts")
    sub = parser.add_subparsers(dest="command", required=True)

    index = sub.add_parser("index")
    index.add_argument("--input", required=True)

    retrieve = sub.add_parser("retrieve")
    retrieve.add_argument("--query", required=True)
    retrieve.add_argument("--strategy", default="hybrid", choices=["semantic", "keyword", "hybrid"])
    retrieve.add_argument("--top-k", type=int, default=5)

    sub.add_parser("evaluate")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    artifacts = Path(args.artifacts_dir)
    if args.command == "index":
        source = Path(args.input)
        if not source.is_file():
            print("Input file was not found", file=sys.stderr)
            return 2
        payload = json.loads(source.read_text(encoding="utf-8"))
        if "index" in payload and isinstance(payload["index"], dict):
            payload = payload["index"]
        stats = index_documents(index_file(str(artifacts)), IndexRequest.model_validate(payload))
        print(json.dumps(stats))
        return 0
    if args.command == "retrieve":
        path = index_file(str(artifacts))
        index = RagIndex.load(path)
        result = retrieve_context(
            index=index,
            query=args.query,
            strategy=args.strategy,
            top_k=args.top_k,
            filters=RetrievalFilters(),
            conversation=[],
            facts=[],
            semantic_candidates=[],
            keyword_candidates=[],
            expected_index_version="",
            max_context_tokens=1200,
            grounding="strict",
        )
        public = {
            "intent": result["intent"],
            "strategy": result["strategy"],
            "empty": result["empty"],
            "index_version": result["index_version"],
            "latency_ms": result["latency_ms"],
            "citations": result["citations"],
            "documents": [
                {"title": item["title"], "source_id": item["source_id"], "score": item["score"]}
                for item in result["documents"]
            ],
        }
        print(json.dumps(public))
        return 0
    report = run_evaluation(load_synthetic_dataset(), EvaluateRequest())
    print(json.dumps(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
