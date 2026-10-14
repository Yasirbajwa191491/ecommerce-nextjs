"""Deterministic same-category baseline.

Candidates share `category_slug`, exclude the query product and inactive rows,
and are ordered by product id. This is not a learned model.
"""

from collections.abc import Sequence

from app.ml.preprocessing.products import ProductRecord


def same_category_baseline(
    product_id: str,
    records: Sequence[ProductRecord],
    top_k: int,
) -> list[str]:
    source = next((record for record in records if record.product_id == product_id), None)
    if source is None:
        return []
    candidates = [
        record.product_id
        for record in records
        if record.product_id != product_id
        and record.active
        and record.category_slug == source.category_slug
    ]
    candidates.sort()
    return candidates[:top_k]
