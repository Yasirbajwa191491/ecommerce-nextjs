"""MLOps execution helpers for the existing model families.

This package validates artifacts, measures drift, and plans retraining.
It does not hot-swap customer-facing recommendation or forecast caches.
"""

from app.mlops.families import MODEL_FAMILIES

__all__ = ["MODEL_FAMILIES"]
