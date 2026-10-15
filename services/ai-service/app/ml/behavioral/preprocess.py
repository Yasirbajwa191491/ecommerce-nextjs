"""Turn validated events into one implicit-feedback weight per visitor and product.

Aggregation rules, in order:

1. Drop events whose product id is outside an optional catalog (deleted products).
2. Drop a visitor whose raw event count exceeds `max_events_per_visitor`.
3. Collapse the same event type for the same visitor and product inside one
   session. A session break is a gap larger than `session_gap_seconds`.
4. Keep at most `max_events_per_type` events per visitor, product, and type,
   preferring the earliest ones so a burst cannot add more signal.
5. Multiply each kept event by an optional exponential half-life. The reference
   time is the latest kept timestamp. Recency is off unless a half-life is set.
6. Sum the decayed weights for each event type, then saturate that sum so
   repeated views cannot overtake one purchase at the default weights.
7. Sum the saturated type weights into one visitor-product weight.
8. Purchases with the same visitor, product, and order id count once.
"""

import hashlib
import json
import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime

from app.ml.behavioral.schema import BehavioralEvent
from app.ml.behavioral.weights import WeightConfig, saturate
from app.ml.errors import DatasetValidationError


@dataclass(frozen=True)
class Interaction:
    visitor_id: str
    product_id: str
    weight: float
    event_types: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "visitor_id": self.visitor_id,
            "product_id": self.product_id,
            "weight": self.weight,
            "event_types": list(self.event_types),
        }


@dataclass(frozen=True)
class AggregationReport:
    input_events: int
    kept_events: int
    dropped_missing_catalog: int
    dropped_abnormal_visitors: int
    dropped_session_duplicates: int
    dropped_type_cap: int
    dropped_duplicate_purchases: int
    visitors: int
    products: int
    interactions: int
    reasons: dict[str, int]

    def to_dict(self) -> dict[str, object]:
        return {
            "input_events": self.input_events,
            "kept_events": self.kept_events,
            "dropped_missing_catalog": self.dropped_missing_catalog,
            "dropped_abnormal_visitors": self.dropped_abnormal_visitors,
            "dropped_session_duplicates": self.dropped_session_duplicates,
            "dropped_type_cap": self.dropped_type_cap,
            "dropped_duplicate_purchases": self.dropped_duplicate_purchases,
            "visitors": self.visitors,
            "products": self.products,
            "interactions": self.interactions,
            "reasons": self.reasons,
        }


def aggregate_events(
    events: list[BehavioralEvent],
    config: WeightConfig,
    *,
    catalog_ids: set[str] | None = None,
) -> tuple[list[Interaction], AggregationReport]:
    reasons: Counter[str] = Counter()
    eligible = events
    dropped_catalog = 0
    if catalog_ids is not None:
        eligible = []
        for event in events:
            if event.product_id not in catalog_ids:
                dropped_catalog += 1
                reasons["deleted_or_unknown_product"] += 1
                continue
            eligible.append(event)

    counts = Counter(event.visitor_id for event in eligible)
    abnormal = {
        visitor for visitor, count in counts.items() if count > config.max_events_per_visitor
    }
    filtered = []
    dropped_abnormal = 0
    for event in eligible:
        if event.visitor_id in abnormal:
            dropped_abnormal += 1
            reasons["abnormal_visitor"] += 1
            continue
        filtered.append(event)

    grouped: dict[tuple[str, str, str], list[BehavioralEvent]] = defaultdict(list)
    for event in filtered:
        grouped[(event.visitor_id, event.product_id, event.event_type)].append(event)

    kept: list[BehavioralEvent] = []
    dropped_session = 0
    dropped_cap = 0
    dropped_purchase = 0
    for bucket in grouped.values():
        ordered = sorted(bucket, key=lambda item: (item.occurred_at, item.event_id))
        session_kept: list[BehavioralEvent] = []
        purchase_orders: set[str] = set()
        for event in ordered:
            if event.event_type == "purchase" and event.order_id:
                if event.order_id in purchase_orders:
                    dropped_purchase += 1
                    reasons["duplicate_purchase"] += 1
                    continue
                purchase_orders.add(event.order_id)
            if session_kept:
                gap = (event.occurred_at - session_kept[-1].occurred_at).total_seconds()
                if gap <= config.session_gap_seconds:
                    dropped_session += 1
                    reasons["session_duplicate"] += 1
                    continue
            if len(session_kept) >= config.max_events_per_type:
                dropped_cap += 1
                reasons["event_type_cap"] += 1
                continue
            session_kept.append(event)
        kept.extend(session_kept)

    reference = max((event.occurred_at for event in kept), default=None)
    sums: dict[tuple[str, str, str], float] = defaultdict(float)
    for event in kept:
        base = config.weights[event.event_type]
        factor = _decay(event.occurred_at, reference, config.half_life_days)
        sums[(event.visitor_id, event.product_id, event.event_type)] += base * factor

    combined: dict[tuple[str, str], float] = defaultdict(float)
    types_used: dict[tuple[str, str], set[str]] = defaultdict(set)
    for (visitor_id, product_id, event_type), decayed_sum in sums.items():
        weight = saturate(config.weights[event_type], decayed_sum)
        if weight <= 0 or not math.isfinite(weight):
            reasons["non_positive_weight"] += 1
            continue
        combined[(visitor_id, product_id)] += weight
        types_used[(visitor_id, product_id)].add(event_type)

    interactions = [
        Interaction(
            visitor_id=visitor_id,
            product_id=product_id,
            weight=round(weight, 6),
            event_types=tuple(sorted(types_used[(visitor_id, product_id)])),
        )
        for (visitor_id, product_id), weight in sorted(combined.items())
        if weight > 0
    ]
    report = AggregationReport(
        input_events=len(events),
        kept_events=len(kept),
        dropped_missing_catalog=dropped_catalog,
        dropped_abnormal_visitors=dropped_abnormal,
        dropped_session_duplicates=dropped_session,
        dropped_type_cap=dropped_cap,
        dropped_duplicate_purchases=dropped_purchase,
        visitors=len({item.visitor_id for item in interactions}),
        products=len({item.product_id for item in interactions}),
        interactions=len(interactions),
        reasons=dict(sorted(reasons.items())),
    )
    return interactions, report


def interaction_fingerprint(interactions: list[Interaction], config: WeightConfig) -> str:
    payload = {
        "config": config.to_dict(),
        "interactions": [item.to_dict() for item in interactions],
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def load_interactions(rows: list[dict[str, object]]) -> list[Interaction]:
    interactions: list[Interaction] = []
    for row in rows:
        visitor_id = row.get("visitor_id")
        product_id = row.get("product_id")
        weight = row.get("weight")
        if not isinstance(visitor_id, str) or not isinstance(product_id, str):
            raise DatasetValidationError("Interaction row is missing an identifier")
        if isinstance(weight, bool) or not isinstance(weight, (int, float)):
            raise DatasetValidationError("Interaction weight is invalid")
        if not math.isfinite(float(weight)) or float(weight) <= 0:
            raise DatasetValidationError("Interaction weight is invalid")
        raw_types = row.get("event_types") or []
        if not isinstance(raw_types, list) or any(not isinstance(item, str) for item in raw_types):
            raise DatasetValidationError("Interaction event types are invalid")
        interactions.append(
            Interaction(
                visitor_id=visitor_id,
                product_id=product_id,
                weight=float(weight),
                event_types=tuple(raw_types),
            )
        )
    return interactions


def _decay(
    occurred_at: datetime, reference: datetime | None, half_life_days: float | None
) -> float:
    if half_life_days is None or reference is None:
        return 1.0
    age_days = max(0.0, (reference - occurred_at).total_seconds() / 86_400)
    return 0.5 ** (age_days / half_life_days)
