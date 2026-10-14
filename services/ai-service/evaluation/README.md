# Evaluation

Offline comparison of the content model against a same-category baseline. The API process does not import this package and does not score live traffic.

```bash
uv run python -m evaluation.evaluate_recommendations
```

The command reads:

- `datasets/synthetic/products.jsonl`
- `datasets/synthetic/relevance.jsonl` (labels only; not model features)
- `artifacts/recommendations/content-v1/`

It writes `evaluation/reports/content-v1-report.json` and `evaluation/reports/content-v1-summary.md`. Those reports are gitignored.

Precision@K, Recall@K, and HitRate@K skip queries with an empty relevance set. Coverage uses the eligible catalog as the denominator. The synthetic labels were written alongside similar product text, so the report is a pipeline check, not a claim about store conversion.

See [docs/python-ml-recommendations.md](../../../docs/python-ml-recommendations.md).
