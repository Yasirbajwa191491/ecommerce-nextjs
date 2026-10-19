"""Offline entry point. Prefer `python -m app.rag.cli evaluate`."""

from app.rag.cli import main

if __name__ == "__main__":
    raise SystemExit(main(["evaluate"]))
