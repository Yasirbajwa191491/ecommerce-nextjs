"""Write the deterministic synthetic forecasting dataset."""

import json
from pathlib import Path

from app.ml.forecasting.synthetic import generate_synthetic_lines


def main() -> None:
    target = Path("datasets/forecasting")
    target.mkdir(parents=True, exist_ok=True)
    payload = generate_synthetic_lines()
    path = target / "synthetic.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    print(
        json.dumps({"path": str(path), "lines": len(payload["lines"]), "label": payload["label"]})
    )


if __name__ == "__main__":
    main()
