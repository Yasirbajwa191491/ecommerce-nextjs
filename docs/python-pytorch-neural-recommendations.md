# PyTorch neural recommendations

Phase 4 adds a neural recommendation model to `services/ai-service`. The model id is `neural-v1`. It learns from the same implicit behavioral events as the Phase 3 collaborative model. It does not replace `content-v1`, `collaborative-v1`, or `hybrid-v1`.

Customer-visible recommendations stay on the existing Convex ranker. The Python strategy default remains `content`. `neural` is an additional value of `python_ml_recommendation_strategy`. Serve mode still requires `PYTHON_ML_SERVE_ENABLED=true`, which defaults to off.

This page explains the model in implementation terms. A worked example uses three visitors and three products. Those rows are synthetic.

## 1. What deep learning is

Deep learning fits a function with many numeric parameters by showing it examples and adjusting those parameters to reduce a loss. "Deep" means the function is a stack of simple layers. Each layer transforms its input and passes the result forward.

For recommendations, the examples are implicit feedback: a visitor viewed, carted, or purchased a product. The function learns a score for a visitor-product pair. We never observe a reliable "this person dislikes that product" label. An unobserved pair is only a contrast during training.

## 2. What PyTorch does

PyTorch stores parameters as tensors and computes gradients with reverse-mode automatic differentiation. The training code defines the forward calculation. `loss.backward()` fills each parameter's `.grad`. The optimizer then steps the parameters.

This service uses the CPU wheel. CUDA is not required and is not installed in the Docker image. The image sets `CUDA_VISIBLE_DEVICES` empty so a container does not allocate a GPU. Local training can pass `--device cuda` or `--device auto` on a machine that already has a CUDA build; the default is `--device cpu`.

The CPU wheel increases the image size by roughly the PyTorch wheel (hundreds of megabytes) plus its runtime dependencies. The API does not import PyTorch until a request asks for the `neural` strategy, so content, collaborative, and hybrid requests do not pay that import.

Install from `services/ai-service`:

```bash
uv sync
```

`pyproject.toml` pins `torch` to the official CPU index `https://download.pytorch.org/whl/cpu`. `uv.lock` records the resolved wheel. Do not install a CUDA wheel for local development unless you intentionally change that source.

No pretrained model is downloaded.

## 3. What neural recommendation models are

A neural recommender is a parameterized function from an interaction history to a ranking. This phase uses neural matrix factorization: one embedding row per visitor and one embedding row per product, combined by a small network, trained with binary cross-entropy on logits.

At request time the store does not have a stable customer account. Guest checkout does not provide a cross-device identity. The public method is therefore item-to-item:

`NeuralRecommender.recommend(product_id, top_k)`

It ranks other products by cosine similarity of the learned product embeddings. That number is embedding similarity in `[-1, 1]`. It is not a probability that someone will purchase the neighbor.

Offline code can still score a training-period visitor-product pair with `interaction_logit`. That method is not an HTTP response and does not accept a caller-supplied visitor id.

## 4. What embeddings represent

An embedding is a learned vector. The product embedding for `hp-1` is a row in `product_embedding.weight`. Training moves that row so the network's logit is high for visitors who interacted with `hp-1` and lower for sampled non-interactions.

Products that were interacted with by similar visitors tend to land in related directions. Cosine similarity then asks "which other product vectors point the same way?" Collaborative filtering asks a related question with the raw co-occurrence matrix. The neural model first compresses that history into the embedding size (default 16).

Visitor embeddings exist for the same reason during training. They are stored in the trusted artifact so an offline check can rebuild the network. The HTTP API does not return them.

A product with no fitting interactions has no row. That is a cold start. The API then asks the existing content model, when that artifact is configured, and labels the response `strategy: content` with `fallback_reason: neural_cold_start`.

## 5. What neural matrix factorization means

Classic matrix factorization predicts a pair by the dot product of two latent vectors. Neural matrix factorization keeps those vectors and also passes their concatenation through a small multilayer perceptron.

The module in `app/ml/neural/module.py` is:

1. `visitor_embedding(visitor_index)` → vector `u`
2. `product_embedding(product_index)` → vector `v`
3. Elementwise interaction `u * v`
4. MLP on `concat(u, v)`: `Linear → ReLU → Dropout`, repeated for each hidden size (default one layer of width 32)
5. `Linear` on `concat(u * v, mlp_output)` → one logit

There is no sigmoid in `forward`. The loss applies the sigmoid internally.

Worked dimensions for one pair, with embedding size 2 and one hidden unit of size 2:

```text
u = [0.10, -0.20]
v = [0.30,  0.40]
u * v = [0.03, -0.08]
concat(u, v) = [0.10, -0.20, 0.30, 0.40]
mlp output = ReLU(W * concat(u, v) + b)   # shape [2]
logit = w · concat(u * v, mlp output) + c  # one number
```

The real weights are whatever training saved. The shape of the calculation is fixed by `config.json` in the artifact.

## 6. How positive and negative samples work

Positives are visitor-product pairs from the Phase 3 aggregator. Each pair has a positive weight from the existing event weights (a purchase counts more than a view). Duplicate pairs keep the larger weight.

Negatives are product indexes the visitor did not interact with in the period being sampled. The default sampler is uniform. Popularity-weighted sampling exists as `--sampler popularity` and is not the default, because popular products are not automatically dislikes.

Rules:

- A known positive pair is never labeled negative.
- Sampling uses only the fitting slice, or the fitting slice plus the validation slice when drawing validation negatives. Later held-out events are excluded before this step.
- The ratio defaults to 4 negatives per positive and is capped by how many products the visitor has not touched.
- A visitor who already interacted with every embedded product gets no negatives. The loop is bounded and then fills from the remaining indexes, so it cannot spin.
- The seed is `config.seed` for training negatives and `config.seed + 1` for validation negatives.
- Unobserved does not mean disliked. The loss treats the sample as a contrast, not as a preference survey.

## 7. How forward propagation works

Forward propagation is one pass from indexes to a logit.

```text
visitor index 3, product index 7
        │
        ├─ lookup row 3 of the visitor table
        └─ lookup row 7 of the product table
                │
                ├─ elementwise product
                └─ MLP(concatenation)
                        │
                        └─ linear layer → logit
```

Dropout is active only in `model.train()`. Inference calls `model.eval()` and `torch.inference_mode()`, so dropout does not change the score between requests.

## 8. How loss functions work

The objective is `BCEWithLogitsLoss` with `reduction="none"`. For a logit `z` and label `y` in `{0, 1}`:

```text
loss = -[ y * log(sigmoid(z)) + (1 - y) * log(1 - sigmoid(z)) ]
```

PyTorch computes that in a numerically stable form from the logit. The code does not apply sigmoid first, so the sigmoid is not applied twice.

Each example is multiplied by its interaction weight. Positives use the aggregated behavioral weight. Negatives use weight 1. The batch loss is the weighted mean. A higher-weight purchase therefore pulls the parameters harder than a view, using the same weights as Phase 3.

## 9. How backpropagation updates parameters

`loss.backward()` applies the chain rule from the scalar loss back through the linear layer, the ReLU, and both embedding lookups. Only the rows used in the batch get embedding gradients.

The optimizer is Adam. After `backward`, gradients are clipped to global norm `grad_clip` (default 1) and Adam updates every parameter:

```text
parameter = parameter - adjusted_step(gradient, moments, learning_rate, weight_decay)
```

Weight decay defaults to `1e-4`. It keeps embeddings from growing without limit on a small synthetic file. It is not a tuned regularizer for production traffic.

## 10. What epochs and batches mean

An epoch is one pass over the training examples. A batch is the subset used for one update. Default batch size is 64. A file smaller than that is one batch per epoch.

The order inside an epoch is a permutation from a CPU `torch.Generator` seeded with `config.seed`. Validation loss is computed in a fixed order without updates.

Default epoch cap is 20. The offline comparison command uses a smaller configuration (`embedding_dim=8`, 8 epochs) so a laptop can finish the comparison quickly. Those weights are not the published artifact unless you train with `training.train_neural`.

## 11. How validation and early stopping work

Events are split twice, both by time:

1. Outer split, default quantile 0.8. Events at or after the cutoff are held out. They are not used for fitting, negative sampling, or checkpoint selection.
2. Inner split of the remaining events, default quantile 0.8. The earlier part fits the embeddings. The later part is validation.

Early stopping keeps the checkpoint with the lowest validation loss. A later epoch replaces it only when the loss improves by more than `min_delta` (default `1e-5`). After `patience` epochs without that improvement (default 3), training stops. The saved weights are the best checkpoint, not the last epoch.

If the inner split cannot produce a validation pair whose visitor and product both appeared in the fitting slice, training stops with an error instead of selecting a model on the training loss.

## 12. How model artifacts are saved

The directory is `artifacts/recommendations/neural-v1/` unless you pass another path. The writer refuses directory names that start with `content-v1`, `collaborative-v1`, or `hybrid-v1`.

| File | Role |
| --- | --- |
| `weights.pt` | PyTorch `state_dict` only |
| `config.json` | Embedding size, hidden sizes, dropout, table sizes |
| `mappings.json` | Product ids, catalog ids, and training visitor ids |
| `manifest.json` | Version, fingerprint, checksums, PyTorch version, seed, device |
| `training-report.json` | Losses and counts. Not required to load the model |
| `training-report.md` | The same summary in prose |
| `evaluation.json` | Optional. Written by the evaluator with `--neural-dir` |

Publication writes a staging directory and swaps it into place after the checksums are stored. Loading requires `trusted=True`, checks `neural-v1`, checks the PyTorch major.minor version, checks SHA-256, and calls `torch.load(..., weights_only=True)`. A bad checksum never reaches the loader. A corrupt tensor file becomes `model_unavailable`. A mismatched version becomes `invalid_model_version`.

Generated weights and the synthetic JSONL stay gitignored. Do not commit them.

`mappings.json` contains the pseudonymous visitor ids used in training. Treat the artifact directory as private. The HTTP response does not include that file.

## 13. How inference differs from training

Training updates weights. Inference freezes them.

| | Training | Inference |
| --- | --- | --- |
| Input | Batches of visitor and product indexes | One catalog product id |
| Output | Logit, then a loss | Cosine similarity of product embeddings |
| Dropout | On | Off |
| Gradient | Computed and clipped | Not computed (`inference_mode`) |
| When | `python -m training.train_neural` | API or `neural_cli` |

The normalized product matrix is cached on the loaded model. A request computes one row of similarities, drops the source product, sorts by score descending and product id ascending, and returns at most `top_k` (1 through 100). The model is loaded once per artifact timestamp, including under concurrent requests.

Startup does not train and does not import PyTorch.

## 14. How this differs from collaborative filtering

| | Collaborative `collaborative-v1` | Neural `neural-v1` |
| --- | --- | --- |
| Representation | Sparse visitor-product weights | Learned embedding tables |
| Similarity | Cosine of co-occurrence rows | Cosine of product embeddings |
| Training | One nearest-neighbor fit | Mini-batch gradient descent |
| Parameters | Neighbor list | Embeddings plus MLP weights |
| Cold start | Empty neighbor list | No embedding row; API can fall back to content |

Both are item-to-item at request time. Neither needs a logged-in customer. The neural model can fit a non-linear interaction, and it can also overfit a small file. The evaluation report is allowed to show the neural model behind the popularity or collaborative baseline. That result should be kept.

## 15. How it integrates with Convex

No new feature flag was added.

| Setting | Values | Default |
| --- | --- | --- |
| `enable_python_ml_recommendations` | `true` or `false` | `false` |
| `python_ml_recommendation_mode` | `off`, `shadow`, `serve` | `off` |
| `python_ml_recommendation_strategy` | `content`, `collaborative`, `hybrid`, `neural` | `content` |
| `python_ml_request_timeout_ms` | 250–5000 | 1500 |

`recommendation_strategy` is unchanged. Off, shadow, and serve behave as they did. With the enable flag off, the effective mode is `off`. Shadow does not change the products a shopper sees. Serve still does nothing unless `PYTHON_ML_SERVE_ENABLED=true`.

The service URL and API key remain `PYTHON_AI_SERVICE_URL` and `PYTHON_AI_SERVICE_API_KEY`. They are not settings.

`POST /api/v1/recommendations/behavioral` accepts `strategy: neural` in addition to the previous values. The body still requires the bearer token. The route does not take a filesystem path.

Admin Settings on `/admin/settings` includes Neural in the strategy select. `/admin/recommendations` shows neural availability, version, training timestamp, dataset fingerprint, training validation loss, shadow latency, fallbacks, candidate count, and the last error code when a shadow run recorded them. If no neural shadow block exists, the card says the neural model is unavailable.

The shadow job still compares content, collaborative, and hybrid with co-occurrence. It also calls the neural strategy and stores that call separately. Overlap with the current ranker is not quality and is not revenue.

If neural inference fails, Convex keeps the existing recommendation fallback. Readiness still checks the content artifact only, so a missing neural directory does not fail `/health/ready`.

## 16. How to evaluate fairly

```bash
uv run python -m training.generate_behavioral_data
uv run python -m training.train_neural --events datasets/synthetic/behavioral_events.jsonl --catalog datasets/synthetic/behavioral_products.jsonl --epochs 12 --device cpu
uv run python -m evaluation.evaluate_behavioral --events datasets/synthetic/behavioral_events.jsonl --catalog datasets/synthetic/behavioral_products.jsonl --output evaluation/reports/behavioral-neural.json
uv run python -m app.ml.inference.neural_cli --product-id hp-1 --top-k 3
```

The evaluator trains popularity, collaborative, hybrid, and neural on the same pre-cutoff events and scores the same queries. A query is a visitor's latest pre-cutoff product. Relevant products are products that visitor touched after the cutoff and had not touched before it. Neural cold-start products contribute an empty list in that comparison, so the neural row is not secretly the content model.

Reported metrics: Precision@K, Recall@K, HitRate@K, NDCG@K, coverage, diversity, cold-start hit rate, mean latency, and neural training time.

The synthetic file is small. Confidence is limited. Do not describe those scores as conversion or revenue. A weaker neural score than the collaborative model is a successful, honest comparison.

## 17. Why a more complex model may not win

The collaborative model reads co-occurrence directly. On a few dozen synthetic events, that signal is already the whole story. The neural model has more parameters than interactions, so it can memorize the fitting slice and still rank the held-out products worse.

Embeddings also discard counts when they compress a visitor into 16 numbers. If two products are exact neighbors in the sparse matrix, cosine of those rows can beat a partially trained embedding.

Use `neural-v1` when a later, larger, authorized dataset shows a gain on the same temporal protocol. Until then, leave the strategy at `content` or whichever simpler model the offline report actually supports. Do not turn on serve mode because a neural network exists.

## Reproducibility

The report records the seed, Python version, PyTorch version, configuration, dataset fingerprint, cutoff, event counts, product and visitor counts, epoch count, best validation loss, duration, and device.

CPU training with the same seed and the same PyTorch build should repeat on this machine. It is not bit-for-bit across operating systems, CPU libraries, or PyTorch versions. Dropout and atomic add order are the usual sources of drift. The published note in the manifest says the same thing.

## What is implemented and what is not

Implemented: CPU PyTorch dependency, neural matrix factorization, negative sampling, temporal training, early stopping, `state_dict` artifacts, item-to-item CPU inference, evaluation against the existing models, the authenticated `neural` strategy, the existing Convex strategy setting, shadow recording, and admin visibility.

Not implemented: production deployment, automatic retraining, customer-visible serving by default, a new shopper account, cross-device identity, and any change to `AI_PROVIDER`, `AI_PROVIDER_CHAIN`, or `AI_WORKER_URL`.

Docker image size with the CPU wheel was not measured in this environment. Build the image before relying on a size budget. The staging compose file still mounts only the content artifact and keeps a 1g memory limit. Raise that limit and mount `NEURAL_MODEL_DIR` before enabling neural inference in a container.
