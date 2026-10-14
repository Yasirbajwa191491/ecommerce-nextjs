"""Product dataset contract based on the Convex catalog schema.

Accepted fields mirror `products` plus the denormalized category name and slug
from `productCategories`. There is no `brand` column: the store uses `company`.
There is no tags, specifications, or color-family column. Keywords and short
attributes are `seoKeywords` and `highlights`. `colors` is the color list.

`recommendationEvents`, orders, and product embeddings are not part of this
contract. Content training must not read them.
"""

import hashlib
import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

from app.ml.errors import DatasetValidationError
from app.ml.preprocessing.text import is_missing, normalize_text

PRODUCT_ID_MAX_LENGTH = 128
NAME_MAX_LENGTH = 300
COMPANY_MAX_LENGTH = 200
DESCRIPTION_MAX_LENGTH = 20_000
_ID_PATTERN_CHARS = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-")

KNOWN_FIELDS = frozenset(
    {
        "product_id",
        "name",
        "company",
        "category_name",
        "category_slug",
        "description",
        "colors",
        "seo_keywords",
        "highlights",
        "price",
        "currency",
        "discount_percent",
        "stock",
        "active",
        "featured",
        "stars",
        "reviews",
        "sku",
    }
)

# Present on some Convex documents or on the synthetic file, and never features.
IGNORED_FIELDS = frozenset(
    {
        "synthetic",
        "data_origin",
        "embedding",
        "imageEmbedding",
        "relevance_group",
        "image",
        "categoryId",
        "finalPrice",
    }
)


class _RowError(Exception):
    def __init__(self, reason: str) -> None:
        self.reason = reason
        super().__init__(reason)


@dataclass(frozen=True)
class ProductRecord:
    product_id: str
    name: str
    company: str
    category_name: str
    category_slug: str
    description: str
    colors: tuple[str, ...]
    seo_keywords: tuple[str, ...]
    highlights: tuple[str, ...]
    price: float
    currency: str | None
    discount_percent: float | None
    stock: int
    active: bool
    featured: bool
    stars: float
    reviews: int
    sku: str | None

    def to_fingerprint_dict(self) -> dict[str, object]:
        return {
            "active": self.active,
            "category_name": self.category_name,
            "category_slug": self.category_slug,
            "colors": list(self.colors),
            "company": self.company,
            "currency": self.currency,
            "description": self.description,
            "discount_percent": self.discount_percent,
            "featured": self.featured,
            "highlights": list(self.highlights),
            "name": self.name,
            "price": self.price,
            "product_id": self.product_id,
            "reviews": self.reviews,
            "seo_keywords": list(self.seo_keywords),
            "sku": self.sku,
            "stars": self.stars,
            "stock": self.stock,
        }


@dataclass(frozen=True)
class RowRejection:
    line_number: int
    product_id: str | None
    reason: str


@dataclass(frozen=True)
class DatasetValidationResult:
    accepted: tuple[ProductRecord, ...]
    rejected: tuple[RowRejection, ...]

    @property
    def reason_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for row in self.rejected:
            counts[row.reason] = counts.get(row.reason, 0) + 1
        return dict(sorted(counts.items()))


def dataset_fingerprint(records: Sequence[ProductRecord]) -> str:
    """Hash accepted records in file order.

    The hash covers the validated product fields only. Relevance labels are
    stored in a separate file and are not part of this fingerprint.
    """

    payload = [record.to_fingerprint_dict() for record in records]
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def order_for_training(records: Sequence[ProductRecord], source: str) -> tuple[ProductRecord, ...]:
    """Keep synthetic file order and sort a real catalog by product id.

    The fingerprint hashes records in the order it is given. Sorting the real
    catalog makes that hash independent of export page order.
    """

    if source == "synthetic":
        return tuple(records)
    if source == "real_catalog":
        return tuple(sorted(records, key=lambda record: record.product_id))
    raise DatasetValidationError("Dataset source must be synthetic or real_catalog")


def validate_product_mappings(
    rows: Sequence[Mapping[str, object]],
    *,
    line_numbers: Sequence[int] | None = None,
) -> DatasetValidationResult:
    accepted: list[ProductRecord] = []
    rejected: list[RowRejection] = []
    seen_ids: set[str] = set()
    for index, row in enumerate(rows):
        line_number = line_numbers[index] if line_numbers is not None else index + 1
        try:
            record = _parse_row(row)
        except _RowError as exc:
            rejected.append(
                RowRejection(
                    line_number=line_number,
                    product_id=_peek_product_id(row),
                    reason=exc.reason,
                )
            )
            continue
        if record.product_id in seen_ids:
            rejected.append(
                RowRejection(
                    line_number=line_number,
                    product_id=record.product_id,
                    reason="duplicate_product_id",
                )
            )
            continue
        seen_ids.add(record.product_id)
        accepted.append(record)
    return DatasetValidationResult(accepted=tuple(accepted), rejected=tuple(rejected))


def load_product_jsonl(path: Path) -> DatasetValidationResult:
    if not path.is_file():
        raise DatasetValidationError(f"Dataset file not found: {path.name}")
    rows: list[Mapping[str, object]] = []
    line_numbers: list[int] = []
    rejections: list[RowRejection] = []
    try:
        text = path.read_text(encoding="utf-8-sig")
    except OSError as exc:
        raise DatasetValidationError("Dataset file could not be read") from exc
    for line_number, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            rejections.append(
                RowRejection(line_number=line_number, product_id=None, reason="unreadable_row")
            )
            continue
        if not isinstance(payload, dict):
            rejections.append(
                RowRejection(line_number=line_number, product_id=None, reason="unreadable_row")
            )
            continue
        rows.append(payload)
        line_numbers.append(line_number)
    result = validate_product_mappings(rows, line_numbers=line_numbers)
    combined = tuple(sorted((*rejections, *result.rejected), key=lambda item: item.line_number))
    return DatasetValidationResult(accepted=result.accepted, rejected=combined)


def _peek_product_id(row: Mapping[str, object]) -> str | None:
    value = row.get("product_id")
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _parse_row(row: Mapping[str, object]) -> ProductRecord:
    product_id = _parse_product_id(row.get("product_id"))
    name = _required_label(row.get("name"), reason="missing_name", limit=NAME_MAX_LENGTH)
    company = _required_label(
        row.get("company"),
        reason="missing_company",
        limit=COMPANY_MAX_LENGTH,
    )
    category_name = _required_label(
        row.get("category_name"),
        reason="missing_category",
        limit=NAME_MAX_LENGTH,
    )
    category_slug = _parse_slug(row.get("category_slug"))
    description = _optional_text(row.get("description"), limit=DESCRIPTION_MAX_LENGTH)
    colors = _optional_text_list(row.get("colors"))
    seo_keywords = _optional_text_list(row.get("seo_keywords"))
    highlights = _optional_text_list(row.get("highlights"))
    price = _parse_price(row.get("price"))
    currency = _optional_short_text(row.get("currency"))
    discount_percent = _parse_discount(row.get("discount_percent"))
    stock = _parse_non_negative_int(row.get("stock"), reason="invalid_stock")
    active = _optional_bool(row.get("active"), default=True)
    featured = _optional_bool(row.get("featured"), default=False)
    stars = _parse_stars(row.get("stars"))
    reviews = _parse_non_negative_int(row.get("reviews", 0), reason="invalid_reviews")
    sku = _optional_short_text(row.get("sku"))
    return ProductRecord(
        product_id=product_id,
        name=name,
        company=company,
        category_name=category_name,
        category_slug=category_slug,
        description=description,
        colors=tuple(colors),
        seo_keywords=tuple(seo_keywords),
        highlights=tuple(highlights),
        price=price,
        currency=currency,
        discount_percent=discount_percent,
        stock=stock,
        active=active,
        featured=featured,
        stars=stars,
        reviews=reviews,
        sku=sku,
    )


def _parse_product_id(value: object) -> str:
    if is_missing(value):
        raise _RowError("missing_product_id")
    if not isinstance(value, str):
        raise _RowError("invalid_product_id")
    product_id = value.strip()
    if not product_id:
        raise _RowError("missing_product_id")
    if len(product_id) > PRODUCT_ID_MAX_LENGTH or any(
        character not in _ID_PATTERN_CHARS for character in product_id
    ):
        raise _RowError("invalid_product_id")
    if product_id[0] in {"-", "_"}:
        raise _RowError("invalid_product_id")
    return product_id


def _required_label(value: object, *, reason: str, limit: int) -> str:
    if is_missing(value):
        raise _RowError(reason)
    if not isinstance(value, str):
        raise _RowError(reason)
    text = normalize_text(value)
    if not text or len(text) > limit:
        raise _RowError(reason)
    return text


def _parse_slug(value: object) -> str:
    if is_missing(value) or not isinstance(value, str):
        raise _RowError("missing_category")
    slug = normalize_text(value).replace(" ", "-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    slug = slug.strip("-")
    allowed = set("abcdefghijklmnopqrstuvwxyz0123456789-_")
    if (
        not slug
        or len(slug) > NAME_MAX_LENGTH
        or any(character not in allowed for character in slug)
    ):
        raise _RowError("missing_category")
    return slug


def _optional_text(value: object, *, limit: int) -> str:
    if is_missing(value):
        return ""
    if not isinstance(value, str):
        raise _RowError("invalid_field_type")
    text = normalize_text(value)
    if len(text) > limit:
        raise _RowError("invalid_field_type")
    return text


def _optional_short_text(value: object) -> str | None:
    if is_missing(value):
        return None
    if not isinstance(value, str):
        raise _RowError("invalid_field_type")
    text = value.strip()
    if not text:
        return None
    if len(text) > NAME_MAX_LENGTH:
        raise _RowError("invalid_field_type")
    return text


def _optional_text_list(value: object) -> list[str]:
    if is_missing(value):
        return []
    if not isinstance(value, list):
        raise _RowError("invalid_field_type")
    cleaned: list[str] = []
    for item in value:
        if is_missing(item):
            continue
        if not isinstance(item, str):
            raise _RowError("invalid_field_type")
        text = normalize_text(item)
        if text:
            cleaned.append(text)
    return cleaned


def _parse_price(value: object) -> float:
    number = _parse_finite_number(value, reason="invalid_price")
    if number < 0:
        raise _RowError("invalid_price")
    return number


def _parse_discount(value: object) -> float | None:
    if is_missing(value):
        return None
    number = _parse_finite_number(value, reason="invalid_discount")
    if number < 0 or number > 100:
        raise _RowError("invalid_discount")
    return number


def _parse_stars(value: object) -> float:
    if is_missing(value):
        return 0.0
    number = _parse_finite_number(value, reason="invalid_stars")
    if number < 0 or number > 5:
        raise _RowError("invalid_stars")
    return number


def _parse_finite_number(value: object, *, reason: str) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise _RowError(reason)
    number = float(value)
    if number != number or number in {float("inf"), float("-inf")}:
        raise _RowError(reason)
    return number


def _parse_non_negative_int(value: object, *, reason: str) -> int:
    if is_missing(value):
        raise _RowError(reason)
    if isinstance(value, bool):
        raise _RowError(reason)
    if isinstance(value, int):
        number = value
    elif isinstance(value, float) and value.is_integer() and value == value:
        number = int(value)
    else:
        raise _RowError(reason)
    if number < 0:
        raise _RowError(reason)
    return number


def _optional_bool(value: object, *, default: bool) -> bool:
    if is_missing(value):
        return default
    if isinstance(value, bool):
        return value
    raise _RowError("invalid_field_type")
