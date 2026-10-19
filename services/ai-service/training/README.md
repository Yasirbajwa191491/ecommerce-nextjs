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

Phase 3 behavioral commands are separate and do not overwrite `content-v1`:

```bash
uv run python -m training.generate_behavioral_data
uv run python -m training.validate_behavioral_dataset --dataset datasets/synthetic/behavioral_events.jsonl
uv run python -m training.aggregate_interactions --dataset datasets/synthetic/behavioral_events.jsonl --catalog datasets/synthetic/behavioral_products.jsonl --output datasets/synthetic/behavioral_interactions.jsonl
uv run python -m training.train_collaborative --events datasets/synthetic/behavioral_events.jsonl --catalog datasets/synthetic/behavioral_products.jsonl --min-product-interactions 1
uv run python -m training.configure_hybrid
uv run python -m evaluation.evaluate_behavioral --events datasets/synthetic/behavioral_events.jsonl --catalog datasets/synthetic/behavioral_products.jsonl
```

Phase 4 neural training is separate and does not overwrite `content-v1`, `collaborative-v1`, or `hybrid-v1`:

```bash
uv run python -m training.train_neural --events datasets/synthetic/behavioral_events.jsonl --catalog datasets/synthetic/behavioral_products.jsonl --epochs 12 --device cpu
uv run python -m app.ml.inference.neural_cli --product-id hp-1 --top-k 3
```

The API process does not import the trainer. See [docs/python-pytorch-neural-recommendations.md](../../../docs/python-pytorch-neural-recommendations.md).
