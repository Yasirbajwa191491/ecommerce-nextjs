"""Validate a forecasting dataset file."""

import json
import sys
from pathlib import Path

from app.ml.forecasting.service import validate_dataset


def main() -> None:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "datasets/forecasting/synthetic.json")
    if not path.is_file():
        print("Dataset file was not found", file=sys.stderr)
        sys.exit(2)
    payload = json.loads(path.read_text(encoding="utf-8"))
    errors = validate_dataset(payload)
    print(json.dumps({"path": str(path), "valid": not errors, "errors": errors[:12]}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
