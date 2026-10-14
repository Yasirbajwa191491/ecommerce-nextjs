"""Feature frame for content-based item similarity.

Text from the name, description, category, colors, highlights, and keywords is
concatenated before TF-IDF so a word in one product's title can match the same
word in another product's description. Categorical fields stay outside that
text: category slug, company (the schema's brand), and a price band.

Popularity fields (`stars`, `reviews`, `featured`, `stock`) and eligibility
(`active`) are not similarity features. Relevance labels are not available here.
"""

from collections.abc import Sequence

import pandas as pd

from app.ml.preprocessing.products import ProductRecord
from app.ml.preprocessing.text import normalize_text

PRICE_BAND_EDGES: tuple[tuple[float, str], ...] = (
    (25.0, "under_25"),
    (75.0, "25_to_75"),
    (200.0, "75_to_200"),
    (500.0, "200_to_500"),
)
PRICE_BAND_OVERFLOW = "500_and_above"
# One-hot columns are 0/1. TF-IDF rows are length-normalized. Without this
# scale, a shared category or price band outweighs the product text.
CATEGORICAL_FEATURE_WEIGHT = 0.3

FEATURE_COLUMNS = ("text", "category_slug", "company", "price_band")


def price_band(price: float) -> str:
    """Map a non-negative price into a fixed half-open band."""

    for upper, label in PRICE_BAND_EDGES:
        if price < upper:
            return label
    return PRICE_BAND_OVERFLOW


def effective_price(price: float, discount_percent: float | None) -> float:
    """Sale price from `price` and optional `discountPercent`."""

    if discount_percent is None:
        return price
    return price * (1.0 - discount_percent / 100.0)


def build_text(record: ProductRecord) -> str:
    """Build the TF-IDF document for one product.

    The name is repeated once so the title contributes a bit more than a single
    mention, without a separate learned weight. Empty optional fields contribute
    nothing.
    """

    parts = [
        record.name,
        record.name,
        record.description,
        record.category_name,
        " ".join(record.colors),
        " ".join(record.highlights),
        " ".join(record.seo_keywords),
    ]
    return normalize_text(" ".join(part for part in parts if part))


def feature_config(*, use_text_tfidf: bool) -> dict[str, object]:
    return {
        "text_fields": [
            "name",
            "description",
            "category_name",
            "colors",
            "highlights",
            "seo_keywords",
        ],
        "name_repetitions": 2,
        "categorical_fields": ["category_slug", "company", "price_band"],
        "price_band_edges": [edge for edge, _label in PRICE_BAND_EDGES],
        "price_band_rule": "half-open upper bounds, then 500_and_above",
        "price_source": "price * (1 - discount_percent/100) when discount_percent is set",
        "ngram_range": [1, 2],
        "stop_words": "english",
        "min_df": 1,
        "categorical_feature_weight": CATEGORICAL_FEATURE_WEIGHT,
        "use_text_tfidf": use_text_tfidf,
        "excluded_from_similarity": [
            "stars",
            "reviews",
            "featured",
            "stock",
            "sku",
            "currency",
            "active",
            "embedding",
            "relevance labels",
        ],
    }


def build_feature_frame(records: Sequence[ProductRecord]) -> pd.DataFrame:
    rows: list[dict[str, object]] = []
    for record in records:
        band = price_band(effective_price(record.price, record.discount_percent))
        rows.append(
            {
                "product_id": record.product_id,
                "text": build_text(record),
                "category_slug": record.category_slug,
                "company": record.company,
                "price_band": band,
                "eligible": record.active,
            }
        )
    frame = pd.DataFrame(rows)
    if frame.empty:
        return pd.DataFrame(
            columns=["product_id", *FEATURE_COLUMNS, "eligible"],
        )
    frame["text"] = frame["text"].fillna("").astype(str)
    frame["category_slug"] = frame["category_slug"].fillna("").astype(str)
    frame["company"] = frame["company"].fillna("").astype(str)
    frame["price_band"] = frame["price_band"].fillna("").astype(str)
    return frame.reset_index(drop=True)
