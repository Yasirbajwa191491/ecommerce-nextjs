"""Page through the authenticated Convex catalog export and write JSONL.

The token is read from the environment and is never printed. Output under
datasets/ is gitignored.
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export the Convex catalog for content training.")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args(argv)
    base_url = os.environ.get("CATALOG_EXPORT_URL", "").strip()
    token = os.environ.get("CATALOG_EXPORT_TOKEN", "").strip()
    if not base_url or not token:
        print("error: CATALOG_EXPORT_URL and CATALOG_EXPORT_TOKEN are required", file=sys.stderr)
        return 1
    try:
        count = export_catalog(base_url, token, args.output, limit=args.limit)
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps({"records": count, "output": str(args.output)}))
    return 0


def export_catalog(base_url: str, token: str, output: Path, *, limit: int) -> int:
    cursor: str | None = None
    rows: list[dict[str, object]] = []
    for _page in range(10_000):
        query = {"limit": str(limit)}
        if cursor:
            query["cursor"] = cursor
        url = base_url.rstrip("/") + "/ml/catalog/export?" + urllib.parse.urlencode(query)
        request = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raise RuntimeError(f"catalog export failed with status {exc.code}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError("catalog export could not be reached") from exc
        page = payload.get("page")
        if not isinstance(page, list):
            raise RuntimeError("catalog export returned an invalid page")
        rows.extend(item for item in page if isinstance(item, dict))
        if payload.get("isDone") is True:
            break
        next_cursor = payload.get("continueCursor")
        if not isinstance(next_cursor, str) or not next_cursor or next_cursor == cursor:
            raise RuntimeError("catalog export pagination stopped early")
        cursor = next_cursor
    else:
        raise RuntimeError("catalog export exceeded the page limit")
    output.parent.mkdir(parents=True, exist_ok=True)
    lines = [json.dumps(row, sort_keys=True, separators=(",", ":")) for row in rows]
    output.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8", newline="\n")
    return len(rows)


if __name__ == "__main__":
    raise SystemExit(main())
