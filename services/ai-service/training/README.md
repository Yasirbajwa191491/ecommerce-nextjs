# Training

Offline training for the content recommendation model. The API process does not import this package and does not train on startup.

```bash
uv run python -m training.generate_sample_data
uv run python -m training.validate_dataset
uv run python -m training.train_recommendations
```

`generate_sample_data` writes a synthetic JSONL catalog under `datasets/synthetic/`. It is marked synthetic and is not a production export.

`validate_dataset` reports accepted and rejected rows. The sample file includes bad rows on purpose, so a non-strict run can succeed while still listing rejections. `--strict` exits 1 when any row is rejected. A file with no accepted rows exits 1.

`train_recommendations` fits TF-IDF and one-hot features, then publishes `artifacts/recommendations/content-v1/`. Re-run it after you change the dataset. Do not point it at production credentials.

See [docs/python-ml-recommendations.md](../../../docs/python-ml-recommendations.md).
