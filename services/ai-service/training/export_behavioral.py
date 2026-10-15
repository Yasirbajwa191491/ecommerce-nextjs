"""Optional Convex behavioral export.

This command does nothing unless BEHAVIORAL_EXPORT_ENABLED=true. It does not
print the token. Local training does not need to run it.
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from app.ml.behavioral.extract import adapt_convex_record, assert_export_enabled
from app.ml.errors import MachineLearningError


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export minimized Convex behavioral events.")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args(argv)
    enabled = os.environ.get("BEHAVIORAL_EXPORT_ENABLED", "").strip().lower() == "true"
    base_url = os.environ.get("BEHAVIORAL_EXPORT_URL", "").strip()
    token = os.environ.get("BEHAVIORAL_EXPORT_TOKEN", "").strip()
    try:
        assert_export_enabled(enabled)
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    if not base_url or not token:
        print(
            "error: BEHAVIORAL_EXPORT_URL and BEHAVIORAL_EXPORT_TOKEN are required",
            file=sys.stderr,
        )
        return 1
    try:
        count = export_behavioral(base_url, token, args.output, limit=args.limit)
    except (MachineLearningError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(
        json.dumps({"records": count, "output": str(args.output), "data_origin": "convex_export"})
    )
    return 0


def export_behavioral(base_url: str, token: str, output: Path, *, limit: int) -> int:
    rows: list[dict[str, object]] = []
    for kind in ("behavior", "recommendation", "purchase"):
        rows.extend(_pages(base_url, token, kind=kind, limit=limit))
    adapted = [adapt_convex_record(row).to_dict() for row in rows]
    output.parent.mkdir(parents=True, exist_ok=True)
    lines = [json.dumps(row, sort_keys=True, separators=(",", ":")) for row in adapted]
    output.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8", newline="\n")
    return len(adapted)


def _pages(base_url: str, token: str, *, kind: str, limit: int) -> list[dict[str, object]]:
    cursor: str | None = None
    rows: list[dict[str, object]] = []
    for _page in range(10_000):
        query = {"limit": str(limit), "kind": kind}
        if cursor:
            query["cursor"] = cursor
        url = base_url.rstrip("/") + "/ml/behavioral/events?" + urllib.parse.urlencode(query)
        request = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raise RuntimeError(f"behavioral export failed with status {exc.code}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError("behavioral export could not be reached") from exc
        page = payload.get("page")
        if not isinstance(page, list):
            raise RuntimeError("behavioral export returned an invalid page")
        rows.extend(item for item in page if isinstance(item, dict))
        if payload.get("isDone") is True:
            return rows
        next_cursor = payload.get("continueCursor")
        if not isinstance(next_cursor, str) or not next_cursor or next_cursor == cursor:
            raise RuntimeError("behavioral export pagination stopped early")
        cursor = next_cursor
    raise RuntimeError("behavioral export exceeded the page limit")


if __name__ == "__main__":
    raise SystemExit(main())
