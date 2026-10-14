# Training

Offline training will live here in a later phase. The API process does not import this directory and does not train on startup.

Phase 1 has no training pipeline, no dataset export, and no model checkpoint writer. When training is added:

- Run it as a separate job, not inside Uvicorn startup.
- Read data through a least-privilege Convex path. Do not copy the ecommerce database into this service.
- Write weights under `artifacts/` or an external store. Do not commit weights, checkpoints, or customer extracts.

Nothing in this folder is a product feature yet.
