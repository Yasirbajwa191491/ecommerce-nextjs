# MLOps model lifecycle

Phase 7 adds a control plane for the models this repository already trains. It does not replace content recommendations, collaborative filtering, the hybrid ranker, the neural model, demand forecasting, or the RAG shopping assistant.

## 1. What MLOps is

MLOps is the operational record around a model: which version exists, whether its files match their checksum, how it was evaluated, who approved it, and whether the running process has actually loaded it. The store still serves customers through the existing feature gates.

## 2. Why a registry is useful

Training writes files on disk. A registry records the version, dataset fingerprint, and checksum in Convex so an administrator can see what was trained without copying model weights into the database. Old versions stay. A new registration does not overwrite them.

## 3. Model versioning

Supported families are `content`, `collaborative`, `hybrid`, `neural`, and `demand_forecast`. Versions look like `content-v1` or `demand-forecast-v1`. The stable id is `family:modelVersion:artifactVersion`. `rag-v1` can be recorded as a retrieval index. It is not a trained weight file and cannot be activated as one.

## 4. Artifact integrity

The Python service validates only the directories configured by environment variables (`CONTENT_MODEL_DIR`, `COLLABORATIVE_MODEL_DIR`, `HYBRID_MODEL_DIR`, `NEURAL_MODEL_DIR`, and `MODEL_ARTIFACTS_DIR/forecasting/demand-forecast-v1`). Callers cannot send a filesystem path. Validation reads the manifest, checks the version and feature schema, and compares SHA-256 checksums. Joblib and PyTorch files are not deserialized during validation. A manifest that declares `pickle` is rejected.

## 5. Lifecycle states

`registered → validated → evaluated → approved → active`

Additional states are `rejected`, `archived`, and `failed`. A file on disk does not make a model approved. `active` is reserved for a runtime that has confirmed the serving process loaded the weights. This phase does not do that automatically, so a successful request stays `approved` with runtime `pending_deployment`.

## 6. Evaluation tracking

Each evaluation stores the dataset fingerprint, dataset type, protocol, sample count, and metrics. Recommendation metrics include Precision@K, Recall@K, HitRate@K, NDCG@K, coverage, candidate count, and latency. Forecast metrics include MAE, RMSE, WAPE, MASE, and bias, plus horizon and cutoff. RAG retrieval metrics (Recall@K, MRR, NDCG@K, citation validity) stay on `rag_index` records. Synthetic, authorized historical, shadow, and live labels are stored separately and are not treated as the same evidence.

## 7. Quality gates

Local defaults live in `convex/lib/mlops/evaluation.ts` and `services/ai-service/app/mlops/evaluation.py`:

- Recommendations: candidate coverage at least 0.2, latency at most 2000 ms, NDCG drop at most 0.1, at least 20 samples.
- Forecasting: absolute bias at most 1, at least 8 backtest samples, relative MAE regression at most 0.5.
- Artifacts: checksum, schema, and a diagnostic smoke check.

These numbers are for local development. Production thresholds need operational evidence from this store. Synthetic evaluation cannot pass the gate unless an administrator explicitly accepts that limitation, and the audit reason records that it is not production proof.

## 8. Promotion versus deployment

Approving a registry row writes metadata and an audit event. It does not load weights into the recommendation cache, publish a forecast, or change a customer-facing flag. `ENABLE_MODEL_INFERENCE`, Python recommendation serve mode, `DEMAND_FORECASTING_ENABLED`, and `RAG_SHOPPING_ASSISTANT_ENABLED` are unchanged.

## 9. Model activation

`ActivationManager` loads a candidate in memory, runs a smoke check, and swaps a diagnostic slot only if the smoke succeeds. A failure leaves the previous slot in place. Overlapping activations return `conflict`. The customer-serving caches are not swapped. The API reports `customer_deployment: not_changed` and `runtime_status: pending_deployment`. A missing artifact reports `artifact_unavailable`.

## 10. Rollback

Rollback selects the previous compatible version with the same feature schema. If that artifact is still marked available, the diagnostic slot is restored and the registry runtime becomes `pending_deployment`. The response says serving weights were not swapped. Previously published forecasts are not rewritten. A new forecast still requires the existing publish action.

## 11. Monitoring

Aggregates store request, success, failure, timeout, and fallback counts plus latency sum and max for a calendar day. Raw prompts, emails, and payment fields are rejected. Writes require both `enable_mlops_monitoring` and `MLOPS_MONITORING_ENABLED`. The admin page also shows the latest recommendation shadow run, the published forecast cutoff, and the RAG index version. Shadow overlap is labeled as not being relevance.

## 12. Data drift

Numeric features use Population Stability Index on quantile bins. Categorical features use Jensen-Shannon divergence, which includes categories that appear only in the current sample. Missing-value rate is a separate check. Constant features are reported as constant rather than as a mean shift. Fewer than 30 samples, or an empty sample, returns `insufficient_data` and no score. RAG index changes are summarized as retrieval-index stats, not as numeric feature drift.

Reference summaries keep product frequencies, interaction types, daily units, and source-type counts. Visitor ids and emails are dropped.

## 13. Performance drift

Recommendation relevance needs interaction outcomes. Forecast error needs sales after the horizon. RAG quality needs labels or a reviewed outcome. Shadow overlap, synthetic metrics, missing future actuals treated as zero, and LLM confidence return `not_measured`.

## 14. Drift thresholds

Local PSI bands are below 0.1 normal, below 0.25 warning, otherwise critical. Jensen-Shannon bands are below 0.05 and 0.15. Missing-rate bands are below 0.05 and 0.15. Change these only with evidence from production traffic. They are not universal.

## 15. Alert handling

An alert opens only after two consecutive warning or critical windows. The same fingerprint is not inserted twice. An acknowledged fingerprint stays in cooldown. `insufficient_data` does not open an alert. Administrators acknowledge or resolve alerts in `/admin/mlops`. No external notification is sent.

## 16. Controlled retraining

Jobs move `requested → authorized → preparing → training → evaluating → awaiting_approval → completed`, or `failed` / `cancelled`. The allowlist is `content_retrain`, `collaborative_retrain`, `neural_retrain`, `forecast_retrain`, and `hybrid_config_refresh`. RAG reindexing stays on the existing indexing actions. Completing a job does not approve or activate a model.

## 17. Retraining authorization

A Convex mutation stores the request. A worker may claim an authorized job through an internal mutation and report a later state. The report cannot set `completed`; an administrator does that after review. The Python planner names the existing training module and returns `executed: false`. Shell commands, module names, paths, environment variables, and branches in the request are rejected. `MLOPS_RETRAINING_ENABLED` and `enable_ml_retraining_requests` both have to be true before a request is accepted.

## 18. Synthetic versus real datasets

Synthetic plans run without production credentials. Visitor-level exports, raw events, and email datasets are rejected. Authorized forecast aggregates still require `DEMAND_FORECAST_EXPORT_ENABLED`. Collaborative and neural jobs accept synthetic data here; a real behavioral export remains a separate, already-gated workflow.

## 19. Forecasting data quality

`forecastQuality` walks orders in bounded pages, oldest first, up to a cutoff fixed when the run starts. Eligible paid Stripe and COD lines are counted once per order-item claim. Refunds and gifts are excluded. Repeating a page does not add the units again. The run note says a partial walk is not complete history, and observed days are not filled with zeros. The existing forecast publish path is unchanged and still must not be described as full history until a quality run finishes.

## 20. Stock snapshots

If `INVENTORY_SNAPSHOTS_ENABLED=true`, a daily job records today's `stock` and active flag per product. The same product and date is skipped on retry. A past date is rejected, so this does not invent historical stockouts. Snapshots do not change checkout or inventory.

## 21. RAG embedding versions

Indexing probes the current embedding provider version. A chunk is reused only when its content hash and embedding version both match. A provider change re-embeds RAG chunks and leaves product search embeddings alone. Vectors with the wrong dimension are not written. Unchanged chunks stay in place; chunks that disappeared from the prepared set are removed. A failed embed does not delete the previous chunks.

## 22. Admin dashboard

`/admin/mlops` lists registry rows, runtime status, monitoring aggregates, drift alerts, and retraining jobs. Buttons register metadata, validate through the Python service when it is configured, approve, reject, request activation, request rollback, and acknowledge alerts. Copy on the page states that these actions do not deploy weights.

## 23. Security controls

Admin mutations use the existing admin check. Monitoring, drift, and retraining also require deployment environment flags. Python routes require the service bearer token. Audit rows store an actor id, action, model id, outcome, and a short reason. They do not store secrets or customer datasets. Customers cannot call the monitoring mutation.

## 24. Local development

```bash
cd services/ai-service
uv sync
uv run ruff check app tests
uv run ruff format --check app tests
uv run pytest
uv run python -m app.mlops.cli validate --family content
uv run python -m app.mlops.cli worker --job-type content_retrain --dataset synthetic
```

From the repository root, `npx vitest run convex/lib/mlops convex/lib/forecasting/dataQuality.test.ts convex/lib/rag/embeddingVersion.test.ts` covers the control-plane rules. Admin settings default to off. Seed or **Ensure defaults** in settings inserts the four MLOps keys.

## 25. Deployment prerequisites

Do not turn on customer-facing models from this phase. Before any production use of the control plane:

- Set `MLOPS_MONITORING_ENABLED`, `MLOPS_DRIFT_DETECTION_ENABLED`, and `MLOPS_RETRAINING_ENABLED` deliberately. Default is false.
- Keep recommendation serve mode, neural serving, RAG, and demand forecasting on their own gates.
- Point model directory variables at artifacts produced by this repository.
- Run validation from the CLI and confirm the checksum before registering it.
- Treat `pending_deployment` as a restart or release step, not as a completed rollout.
- Replace the local quality-gate numbers with thresholds from real backtests before approving a production candidate.
- Leave `DEMAND_FORECAST_EXPORT_ENABLED` and `INVENTORY_SNAPSHOTS_ENABLED` off until an operator wants those jobs.

## 26. Known limitations

- Diagnostic activation does not hot-swap the recommendation or forecast caches. One configured directory per family cannot prove that an older weight file is still on disk.
- Convex does not enforce a unique constraint on `modelId`; the mutation checks for an existing row and then inserts.
- Drift math runs in Python. Convex stores the alert decision and does not recompute PSI.
- The retraining worker records state. It does not launch training by itself.
- Stock snapshots start on the day collection is enabled. They do not reconstruct past availability.
- Quality coverage paginates the order table. Until that walk finishes, the summary is partial.
- No production notification channel is wired to drift alerts.
