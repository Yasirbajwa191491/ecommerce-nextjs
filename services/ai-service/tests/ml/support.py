"""Small product rows for unit tests."""

from app.ml.preprocessing.products import ProductRecord, validate_product_mappings


def product_mapping(**overrides: object) -> dict[str, object]:
    row: dict[str, object] = {
        "product_id": "sample-001",
        "name": "Travel Headphones",
        "company": "Northwave",
        "category_name": "Audio",
        "category_slug": "audio",
        "description": "Wireless over-ear headphones",
        "colors": ["Black"],
        "seo_keywords": ["bluetooth"],
        "highlights": ["noise cancelling"],
        "price": 80,
        "currency": "USD",
        "stock": 4,
        "stars": 4,
        "reviews": 2,
    }
    row.update(overrides)
    return row


def product_record(product_id: str = "sample-001", **overrides: object) -> ProductRecord:
    mapping = product_mapping(product_id=product_id, **overrides)
    result = validate_product_mappings([mapping])
    if result.rejected or not result.accepted:
        raise AssertionError(result.rejected)
    return result.accepted[0]
