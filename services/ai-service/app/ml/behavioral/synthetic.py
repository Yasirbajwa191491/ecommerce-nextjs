"""Deterministic synthetic shoppers for local collaborative-filtering development.

Every row is labeled `synthetic`. Metrics on this file describe the generator,
not customers, revenue, or the live store.
"""

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

SEED = 42
DATA_ORIGIN = "synthetic"


def generate_behavioral_dataset(directory: Path) -> dict[str, object]:
    directory.mkdir(parents=True, exist_ok=True)
    products = _products()
    events = _events()
    manifest = {
        "data_origin": DATA_ORIGIN,
        "synthetic": True,
        "seed": SEED,
        "warning": (
            "Synthetic behavioral data. Do not report these rows or their "
            "evaluation scores as customer, conversion, or revenue performance."
        ),
        "products": len(products),
        "events": len(events),
        "cold_start_product_ids": ["cold-pan-1"],
        "cold_start_visitor_ids": ["visitor-cold"],
    }
    _write_jsonl(directory / "behavioral_products.jsonl", products)
    _write_jsonl(directory / "behavioral_events.jsonl", events)
    (directory / "behavioral_manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    return manifest


def _products() -> list[dict[str, object]]:
    rows = [
        ("hp-1", "Studio Headphones", "audio", "Audio", "Over-ear wireless headphones"),
        ("hp-2", "Travel Headphones", "audio", "Audio", "Compact noise cancelling headphones"),
        ("hp-3", "Desk Headphones", "audio", "Audio", "Wired studio monitoring headphones"),
        ("sh-1", "Road Shoes", "shoes", "Shoes", "Daily running shoes"),
        ("sh-2", "Trail Shoes", "shoes", "Shoes", "Grip trail running shoes"),
        ("sh-3", "Race Shoes", "shoes", "Shoes", "Lightweight race shoes"),
        ("kt-1", "Chef Knife", "kitchen", "Kitchen", "Eight inch chef knife"),
        ("kt-2", "Cutting Board", "kitchen", "Kitchen", "End grain cutting board"),
        ("bk-1", "Field Guide", "books", "Books", "Illustrated field guide"),
        ("cold-pan-1", "Copper Pan", "kitchen", "Kitchen", "Unused copper pan"),
    ]
    return [
        {
            "product_id": product_id,
            "name": name,
            "company": "Sample Goods",
            "category_slug": slug,
            "category_name": category,
            "description": description,
            "price": 40,
            "stock": 5,
            "active": True,
            "data_origin": DATA_ORIGIN,
            "synthetic": True,
        }
        for product_id, name, slug, category, description in rows
    ]


def _events() -> list[dict[str, object]]:
    start = datetime(2024, 1, 1, tzinfo=UTC)
    rows: list[dict[str, object]] = []

    def add(
        event_id: str,
        event_type: str,
        product_id: str,
        visitor_id: str,
        day: int,
        hour: int = 12,
        *,
        order_id: str | None = None,
        placement: str | None = None,
        platform: str = "web",
    ) -> None:
        occurred = start + timedelta(days=day, hours=hour)
        payload: dict[str, object] = {
            "event_id": event_id,
            "event_type": event_type,
            "product_id": product_id,
            "visitor_id": visitor_id,
            "occurred_at": occurred.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "platform": platform,
            "source": DATA_ORIGIN,
            "data_origin": DATA_ORIGIN,
            "synthetic": True,
        }
        if order_id:
            payload["order_id"] = order_id
        if placement:
            payload["placement"] = placement
        rows.append(payload)

    for index, visitor in enumerate(("visitor-audio", "visitor-audio-2", "visitor-audio-3")):
        add(f"a{index}-view-hp1", "product_view", "hp-1", visitor, 1, platform="web")
        add(f"a{index}-view-hp2", "product_view", "hp-2", visitor, 2)
        add(
            f"a{index}-click-hp2",
            "recommendation_click",
            "hp-2",
            visitor,
            2,
            13,
            placement="because_you_viewed",
        )
        add(f"a{index}-cart-hp1", "add_to_cart", "hp-1", visitor, 3)
        if index < 2:
            add(
                f"a{index}-early-buy-hp3",
                "purchase",
                "hp-3",
                visitor,
                3,
                18,
                order_id=f"order-audio-early-{index}",
            )
        add(f"a{index}-buy-hp3", "purchase", "hp-3", visitor, 40, order_id=f"order-audio-{index}")

    add("dup-view", "product_view", "hp-1", "visitor-audio", 1, 12)
    add("dup-view-later", "product_view", "hp-1", "visitor-audio", 1, 12)
    rows[-1]["event_id"] = "dup-view-session"
    add("audio-repeat-view", "product_view", "hp-1", "visitor-audio", 10)

    for day in range(4, 9):
        add(f"runner-view-{day}", "product_view", "sh-1", "visitor-runner", day, platform="mobile")
    add("runner-cart", "add_to_cart", "sh-2", "visitor-runner", 6, platform="mobile")
    add(
        "runner-buy",
        "purchase",
        "sh-2",
        "visitor-runner",
        42,
        order_id="order-runner",
        platform="mobile",
    )
    add("runner-2-view", "product_view", "sh-1", "visitor-runner-2", 5, platform="mobile")
    add("runner-2-cart", "add_to_cart", "sh-2", "visitor-runner-2", 7, platform="mobile")
    add(
        "runner-2-buy",
        "purchase",
        "sh-3",
        "visitor-runner-2",
        43,
        order_id="order-runner-2",
        platform="mobile",
    )

    add("cook-view", "product_view", "kt-1", "visitor-cook", 3)
    add("cook-wish", "wishlist_add", "kt-2", "visitor-cook", 4)
    add("cook-buy", "purchase", "kt-2", "visitor-cook", 45, order_id="order-cook")
    add("sparse-view", "product_view", "bk-1", "visitor-sparse", 8)
    add("compare", "product_comparison", "hp-2", "visitor-audio", 6)
    add(
        "search-click",
        "search_result_click",
        "hp-3",
        "visitor-audio-2",
        6,
        placement="search",
    )
    add("impression", "recommendation_impression", "hp-2", "visitor-audio", 2, 11, placement="home")

    for index in range(30):
        add(f"bot-{index}", "product_view", "bk-1", "visitor-bot", 1, hour=1)

    add("repeat-purchase", "purchase", "hp-3", "visitor-audio", 41, order_id="order-audio-0")
    rows.append(
        {
            "event_id": "missing-visitor",
            "event_type": "product_view",
            "product_id": "hp-1",
            "occurred_at": "2024-01-03T00:00:00Z",
            "source": DATA_ORIGIN,
            "data_origin": DATA_ORIGIN,
            "synthetic": True,
        }
    )
    rows.append(
        {
            "event_id": "bad-time",
            "event_type": "product_view",
            "product_id": "hp-1",
            "visitor_id": "visitor-audio",
            "occurred_at": "not-a-time",
            "source": DATA_ORIGIN,
            "data_origin": DATA_ORIGIN,
            "synthetic": True,
        }
    )
    return rows


def _write_jsonl(path: Path, rows: list[dict[str, object]]) -> None:
    lines = [json.dumps(row, sort_keys=True, separators=(",", ":")) for row in rows]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
