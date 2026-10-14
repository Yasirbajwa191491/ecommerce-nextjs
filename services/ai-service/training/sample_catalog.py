"""Hand-authored synthetic catalog.

Product ids in each category are ordered so a same-category sort does not list
the evaluation group first. That keeps the category baseline from winning by
filename accident. Group ids are not written onto product rows.
"""

import json

DATA_ORIGIN = "synthetic_phase_2a"
SEED = 42

_HEADPHONES = ("sample-a-01", "sample-a-08", "sample-a-09")
_SPEAKERS = ("sample-a-02", "sample-a-03", "sample-a-04", "sample-a-05", "sample-a-06")
_KEYBOARDS = ("sample-c-01", "sample-c-08", "sample-c-09")
_LAPTOPS = ("sample-c-02", "sample-c-03", "sample-c-04", "sample-c-05", "sample-c-06")
_JACKETS = ("sample-p-01", "sample-p-08", "sample-p-09")
_SHIRTS = ("sample-p-02", "sample-p-03", "sample-p-04", "sample-p-05", "sample-p-06")
_KETTLES = ("sample-k-01", "sample-k-08", "sample-k-09")
_BLENDERS = ("sample-k-02", "sample-k-03", "sample-k-04", "sample-k-05", "sample-k-06")

GROUPS: dict[str, tuple[str, ...]] = {
    "headphones": _HEADPHONES,
    "speakers": _SPEAKERS,
    "keyboards": _KEYBOARDS,
    "laptops": _LAPTOPS,
    "jackets": _JACKETS,
    "shirts": _SHIRTS,
    "kettles": _KETTLES,
    "blenders": _BLENDERS,
}


def group_members() -> dict[str, tuple[str, ...]]:
    return dict(GROUPS)


def render_products_jsonl() -> str:
    lines = [json.dumps(row, ensure_ascii=False, sort_keys=True) for row in product_row_dicts()]
    lines.append("{this is not json")
    return "\n".join(lines) + "\n"


def render_relevance_jsonl() -> str:
    lines = [json.dumps(row, ensure_ascii=False, sort_keys=True) for row in build_relevance_rows()]
    return "\n".join(lines) + "\n"


def dataset_manifest() -> dict[str, object]:
    return {
        "synthetic": True,
        "data_origin": DATA_ORIGIN,
        "generator": "training.generate_sample_data",
        "seed": SEED,
        "random_sampling": False,
        "product_object_rows": len(product_row_dicts()),
        "relevance_rows": len(build_relevance_rows()),
        "note": (
            "Hand-authored synthetic catalog for offline tests. "
            "Not production data and not customer data."
        ),
        "relevance_file": "relevance.jsonl",
        "relevance_note": (
            "Relevance labels are not product features. Training must not read relevance.jsonl."
        ),
    }


def product_row_dicts() -> list[dict[str, object]]:
    rows = [
        *_audio_rows(),
        *_computing_rows(),
        *_apparel_rows(),
        *_kitchen_rows(),
        _garden_row(),
        _inactive_headphone_row(),
    ]
    rows.sort(key=lambda row: str(row["product_id"]))
    rows.extend(_invalid_rows())
    return rows


def build_relevance_rows() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for members in GROUPS.values():
        for product_id in members:
            relevant = sorted(other for other in members if other != product_id)
            rows.append(
                {
                    "product_id": product_id,
                    "relevant_product_ids": relevant,
                    "synthetic": True,
                    "data_origin": DATA_ORIGIN,
                }
            )
    rows.sort(key=lambda row: str(row["product_id"]))
    return rows


def _audio_rows() -> list[dict[str, object]]:
    headphone_text = (
        "Wireless over-ear headphones with active noise cancelling and Bluetooth for travel. "
        "Includes a hard travel case."
    )
    flight_text = (
        "Over-ear wireless headphones with plush earcups, active noise cancelling, and "
        "Bluetooth for long flights."
    )
    speaker_base = "Passive bookshelf loudspeakers with walnut cabinets for stereo hi-fi listening."
    rows = [
        _row(
            "sample-a-01",
            "Northwave Travel Headphones",
            "Northwave",
            "Audio",
            "audio",
            headphone_text,
            89.0,
            ["black"],
            highlights=("active noise cancelling", "over-ear fit"),
            keywords=("bluetooth", "travel headphones"),
            discount_percent=10,
        ),
        _row(
            "sample-a-08",
            "Lumen Flight Headphones",
            "Lumen Labs",
            "Audio",
            "audio",
            flight_text,
            240.0,
            ["silver"],
            highlights=("active noise cancelling", "over-ear fit"),
            keywords=("bluetooth", "flight headphones"),
        ),
        _sparse_headphone(),
        _row(
            "sample-a-02",
            "Birchline Bookshelf Speakers",
            "Birchline",
            "Audio",
            "audio",
            f"{speaker_base} Sold as a stereo pair.",
            40.0,
            ["walnut"],
            highlights=("bookshelf speakers", "walnut cabinet"),
            keywords=("hi-fi", "passive speakers"),
        ),
        _row(
            "sample-a-03",
            "Oakroom Stereo Speakers",
            "Oakroom",
            "Audio",
            "audio",
            f"{speaker_base} Tuned for a small living room.",
            120.0,
            ["black"],
            highlights=("bookshelf speakers", "walnut cabinet"),
            keywords=("hi-fi", "stereo listening"),
        ),
        _row(
            "sample-a-04",
            "Pinehill Walnut Speakers",
            "Pinehill",
            "Audio",
            "audio",
            f"{speaker_base} Cloth grilles cover the woofers.",
            260.0,
            ["walnut"],
            highlights=("bookshelf speakers", "walnut cabinet"),
            keywords=("hi-fi", "loudspeakers"),
        ),
        _row(
            "sample-a-05",
            "Cedar and Co Monitors",
            "Cedar and Co",
            "Audio",
            "audio",
            f"{speaker_base} Binding posts accept bare speaker wire.",
            510.0,
            ["white"],
            highlights=("bookshelf speakers", "walnut cabinet"),
            keywords=("hi-fi", "passive speakers"),
        ),
        _row(
            "sample-a-06",
            "Mapleform Bookshelf Speakers",
            "Mapleform",
            "Audio",
            "audio",
            f"{speaker_base} Currently awaiting a restock.",
            15.0,
            ["gray"],
            highlights=("bookshelf speakers", "walnut cabinet"),
            keywords=("hi-fi", "loudspeakers"),
            stock=0,
        ),
    ]
    return rows


def _sparse_headphone() -> dict[str, object]:
    """Valid row with an empty description and omitted optional fields."""

    return _row(
        "sample-a-09",
        "Harbor Wireless Noise Cancelling Headphones",
        "Harbor Sound",
        "Audio",
        "audio",
        "",
        640.0,
        ["navy"],
        highlights=(),
        keywords=(),
        omit_optional=True,
        stars=0,
        reviews=0,
    )


def _computing_rows() -> list[dict[str, object]]:
    keyboard = "Mechanical keyboard with tactile switches and a USB-C cable for typing."
    laptop = "Lightweight ultrabook laptop with 16GB memory for office work and study."
    return [
        _row(
            "sample-c-01",
            "Keyforge Tactile Keyboard",
            "Keyforge",
            "Computing",
            "computing",
            f"{keyboard} Aluminum case, hot-swap sockets.",
            79.0,
            ["gray"],
            highlights=("mechanical keyboard", "tactile switches"),
            keywords=("usb-c", "typing"),
        ),
        _row(
            "sample-c-08",
            "Switchlane Typing Keyboard",
            "Switchlane",
            "Computing",
            "computing",
            f"{keyboard} PBT keycaps and a coiled cable.",
            160.0,
            ["white"],
            highlights=("mechanical keyboard", "tactile switches"),
            keywords=("usb-c", "keycaps"),
        ),
        _row(
            "sample-c-09",
            "Typenest Mechanical Keyboard",
            "Typenest",
            "Computing",
            "computing",
            f"{keyboard} Compact layout for a small desk.",
            45.0,
            None,
            highlights=("mechanical keyboard", "tactile switches"),
            keywords=("usb-c", "typing"),
        ),
        _row(
            "sample-c-02",
            "Novapad Ultrabook Laptop",
            "Novapad",
            "Computing",
            "computing",
            f"{laptop} All-day battery in a metal chassis.",
            980.0,
            ["silver"],
            highlights=("ultrabook laptop", "16gb memory"),
            keywords=("office", "lightweight"),
            discount_percent=20,
        ),
        _row(
            "sample-c-03",
            "Fieldbook Study Laptop",
            "Fieldbook",
            "Computing",
            "computing",
            f"{laptop} Matte display and a quiet palm rest.",
            640.0,
            ["gray"],
            highlights=("ultrabook laptop", "16gb memory"),
            keywords=("study", "lightweight"),
        ),
        _row(
            "sample-c-04",
            "Slimline Campus Laptop",
            "Slimline",
            "Computing",
            "computing",
            f"{laptop} Weighs just over a kilogram.",
            720.0,
            ["blue"],
            highlights=("ultrabook laptop", "16gb memory"),
            keywords=("office", "student"),
        ),
        _row(
            "sample-c-05",
            "Jetleaf Work Laptop",
            "Jetleaf",
            "Computing",
            "computing",
            f"{laptop} Backlit keys and a large trackpad.",
            1100.0,
            ["black"],
            highlights=("ultrabook laptop", "16gb memory"),
            keywords=("office", "lightweight"),
        ),
        _row(
            "sample-c-06",
            "Northdesk Memory Laptop",
            "Northdesk",
            "Computing",
            "computing",
            f"{laptop} Includes a compact power brick.",
            250.0,
            ["silver"],
            highlights=("ultrabook laptop", "16gb memory"),
            keywords=("study", "portable"),
        ),
    ]


def _apparel_rows() -> list[dict[str, object]]:
    jacket = "Merino\u00a0wool jacket with a weather resistant shell for cold outdoor wear."
    shirt = "Organic cotton oxford button-down shirt for everyday weekend wear."
    return [
        _row(
            "sample-p-01",
            "Hearth Merino Jacket",
            "Hearth Wool",
            "Apparel",
            "apparel",
            f"{jacket} Two zip pockets.",
            180.0,
            ["navy"],
            highlights=("merino wool jacket", "weather resistant"),
            keywords=("cold weather", "wool"),
        ),
        _row(
            "sample-p-08",
            "Ridge Weather Jacket",
            "Ridge Cloth",
            "Apparel",
            "apparel",
            f"{jacket} Snap cuffs and a high collar.",
            220.0,
            ["olive"],
            highlights=("merino wool jacket", "weather resistant"),
            keywords=("outdoor", "wool"),
        ),
        _row(
            "sample-p-09",
            "Kindling Wool Jacket",
            "Kindling",
            "Apparel",
            "apparel",
            f"{jacket} Fully lined for winter commuting.",
            90.0,
            ["charcoal"],
            highlights=("merino wool jacket", "weather resistant"),
            keywords=("cold weather", "shell"),
        ),
        _row(
            "sample-p-02",
            "Loom Oxford Shirt",
            "Loom Cotton",
            "Apparel",
            "apparel",
            f"{shirt} Button-down collar.",
            48.0,
            ["white"],
            highlights=("oxford shirt", "organic cotton"),
            keywords=("button-down", "weekend"),
        ),
        _row(
            "sample-p-03",
            "Plainweave Cotton Shirt",
            "Plainweave",
            "Apparel",
            "apparel",
            f"{shirt} Single chest pocket.",
            36.0,
            ["blue"],
            highlights=("oxford shirt", "organic cotton"),
            keywords=("button-down", "cotton"),
        ),
        _row(
            "sample-p-04",
            "Sunday Oxford Shirt",
            "Sunday Cloth",
            "Apparel",
            "apparel",
            f"{shirt} Curved hem.",
            52.0,
            ["white"],
            highlights=("oxford shirt", "organic cotton"),
            keywords=("weekend", "cotton"),
        ),
        _row(
            "sample-p-05",
            "Fieldday Button Shirt",
            "Fieldday",
            "Apparel",
            "apparel",
            f"{shirt} Mother-of-pearl buttons.",
            70.0,
            ["pink"],
            highlights=("oxford shirt", "organic cotton"),
            keywords=("button-down", "shirt"),
        ),
        _row(
            "sample-p-06",
            "Harbor Cotton Shirt",
            "Harbor Weave",
            "Apparel",
            "apparel",
            f"{shirt} Washed finish.",
            28.0,
            ["blue"],
            highlights=("oxford shirt", "organic cotton"),
            keywords=("weekend", "oxford"),
        ),
    ]


def _kitchen_rows() -> list[dict[str, object]]:
    kettle = "Electric stainless kettle with temperature control for tea."
    blender = "Countertop blender with a glass jar for smoothies and crushed ice."
    return [
        _row(
            "sample-k-01",
            "Steep Electric Kettle",
            "Steep Kitchens",
            "Kitchen",
            "kitchen",
            f"{kettle} Gooseneck spout.",
            60.0,
            ["stainless"],
            highlights=("electric kettle", "temperature control"),
            keywords=("tea", "stainless"),
        ),
        _row(
            "sample-k-08",
            "Café Temperature Kettle",
            "Café Works",
            "Kitchen",
            "kitchen",
            f"{kettle} Presets for café drinks and pour-over tea.",
            85.0,
            ["cream"],
            highlights=("electric kettle", "temperature control"),
            keywords=("tea", "café"),
        ),
        _row(
            "sample-k-09",
            "Kettlewright Steel Kettle",
            "Kettlewright",
            "Kitchen",
            "kitchen",
            f"{kettle} Keep-warm setting for an hour.",
            130.0,
            ["black"],
            highlights=("electric kettle", "temperature control"),
            keywords=("tea", "stainless"),
        ),
        _row(
            "sample-k-02",
            "Pulsecup Countertop Blender",
            "Pulsecup",
            "Kitchen",
            "kitchen",
            f"{blender} 1.5 liter glass jar.",
            70.0,
            ["clear"],
            highlights=("countertop blender", "glass jar"),
            keywords=("smoothie", "crushed ice"),
        ),
        _row(
            "sample-k-03",
            "Jarline Smoothie Blender",
            "Jarline",
            "Kitchen",
            "kitchen",
            f"{blender} Pulse button on the base.",
            95.0,
            ["silver"],
            highlights=("countertop blender", "glass jar"),
            keywords=("smoothie", "blender"),
        ),
        _row(
            "sample-k-04",
            "Icewell Glass Blender",
            "Icewell",
            "Kitchen",
            "kitchen",
            f"{blender} Measured lid cap.",
            140.0,
            ["black"],
            highlights=("countertop blender", "glass jar"),
            keywords=("crushed ice", "smoothie"),
        ),
        _row(
            "sample-k-05",
            "Blendhouse Jar Blender",
            "Blendhouse",
            "Kitchen",
            "kitchen",
            f"{blender} Dishwasher-safe blades assembly.",
            55.0,
            ["white"],
            highlights=("countertop blender", "glass jar"),
            keywords=("smoothie", "countertop"),
        ),
        _row(
            "sample-k-06",
            "Northmix Ice Blender",
            "Northmix",
            "Kitchen",
            "kitchen",
            f"{blender} Four speed dial.",
            210.0,
            ["red"],
            highlights=("countertop blender", "glass jar"),
            keywords=("crushed ice", "blender"),
        ),
    ]


def _garden_row() -> dict[str, object]:
    return _row(
        "sample-z-01",
        "Brass Garden Hose Connector",
        "Yardling",
        "Garden",
        "garden",
        "Brass garden hose connector for outdoor watering and sprinkler hoses.",
        12.0,
        ["brass"],
        highlights=("garden hose", "brass connector"),
        keywords=("watering", "outdoor"),
        featured=True,
        stars=3.0,
        reviews=1,
    )


def _inactive_headphone_row() -> dict[str, object]:
    return _row(
        "sample-a-07",
        "QuietPeak Wireless Headphones",
        "QuietPeak",
        "Audio",
        "audio",
        (
            "Wireless over-ear headphones with active noise cancelling and Bluetooth. "
            "Retired colorway."
        ),
        99.0,
        ["black"],
        highlights=("active noise cancelling", "over-ear fit"),
        keywords=("bluetooth", "headphones"),
        active=False,
        stock=4,
    )


def _invalid_rows() -> list[dict[str, object]]:
    valid_template = _garden_row()
    missing_id = dict(valid_template)
    missing_id["product_id"] = ""
    missing_id["name"] = "Missing identifier"
    bad_id = dict(valid_template)
    bad_id["product_id"] = "bad id"
    bad_id["name"] = "Invalid identifier"
    duplicate = dict(valid_template)
    duplicate["product_id"] = "sample-a-01"
    duplicate["name"] = "Garden Hose Duplicate"
    duplicate["description"] = "Rubber garden hose that must not replace the original headphone."
    negative = dict(valid_template)
    negative["product_id"] = "sample-bad-price"
    negative["price"] = -5
    blank_name = dict(valid_template)
    blank_name["product_id"] = "sample-bad-name"
    blank_name["name"] = "   "
    bad_stars = dict(valid_template)
    bad_stars["product_id"] = "sample-bad-stars"
    bad_stars["stars"] = 9
    bad_stock = dict(valid_template)
    bad_stock["product_id"] = "sample-bad-stock"
    bad_stock["stock"] = -1
    bad_colors = dict(valid_template)
    bad_colors["product_id"] = "sample-bad-colors"
    bad_colors["colors"] = "black"
    return [
        missing_id,
        bad_id,
        duplicate,
        negative,
        blank_name,
        bad_stars,
        bad_stock,
        bad_colors,
    ]


def _row(
    product_id: str,
    name: str,
    company: str,
    category_name: str,
    category_slug: str,
    description: str,
    price: float,
    colors: list[str] | None,
    *,
    highlights: tuple[str, ...],
    keywords: tuple[str, ...],
    stock: int = 25,
    active: bool = True,
    stars: float = 4.0,
    reviews: int = 6,
    featured: bool = False,
    discount_percent: float | None = None,
    omit_optional: bool = False,
) -> dict[str, object]:
    row: dict[str, object] = {
        "active": active,
        "category_name": category_name,
        "category_slug": category_slug,
        "company": company,
        "data_origin": DATA_ORIGIN,
        "description": description,
        "featured": featured,
        "name": name,
        "price": price,
        "product_id": product_id,
        "reviews": reviews,
        "stars": stars,
        "stock": stock,
        "synthetic": True,
    }
    if colors is not None:
        row["colors"] = colors
    if not omit_optional:
        row["currency"] = "USD"
        row["discount_percent"] = discount_percent
        row["highlights"] = list(highlights)
        row["seo_keywords"] = list(keywords)
        row["sku"] = f"SYN-{product_id.upper()}"
    return row


def relevance_ids_by_product() -> dict[str, set[str]]:
    mapping: dict[str, set[str]] = {}
    for row in build_relevance_rows():
        product_id = row["product_id"]
        relevant = row["relevant_product_ids"]
        if isinstance(product_id, str) and isinstance(relevant, list):
            mapping[product_id] = {item for item in relevant if isinstance(item, str)}
    return mapping
