"""Deterministic shopping intents. No LLM call."""

import re

from app.rag.schemas import ConversationTurn, IntentName, RetrievalFilters

_COMPARISON = re.compile(r"\b(compare|comparison|versus|vs\.?|better|which one|difference)\b", re.I)
_SPEC = re.compile(r"\b(spec|specification|feature|dimension|material|battery|size|weight)\b", re.I)
_WARRANTY = re.compile(r"\bwarrant", re.I)
_SHIPPING = re.compile(r"\b(shipping|delivery charge|ship)\b", re.I)
_RETURN = re.compile(r"\b(return|refund|exchange)\b", re.I)
_STOCK = re.compile(r"\b(in stock|out of stock|available|availability|left in stock)\b", re.I)
_FOLLOW_UP = re.compile(
    r"\b(which one|that one|those|the first|the second|it|they|better)\b",
    re.I,
)


def detect_intent(query: str) -> IntentName:
    if _WARRANTY.search(query):
        return "warranty"
    if _RETURN.search(query):
        return "return_policy"
    if _SHIPPING.search(query):
        return "shipping_policy"
    if _STOCK.search(query):
        return "product_availability"
    if _COMPARISON.search(query):
        return "product_comparison"
    if _SPEC.search(query):
        return "product_specifications"
    if re.search(r"\b(how do i|checkout|payment|track)\b", query, re.I):
        return "general_shopping"
    return "product_discovery"


def understand_query(
    query: str,
    conversation: list[ConversationTurn],
    filters: RetrievalFilters,
) -> tuple[IntentName, RetrievalFilters]:
    intent = detect_intent(query)
    next_filters = filters.model_copy(deep=True)
    prior_products: list[str] = []
    for turn in conversation:
        for product_id in turn.product_ids:
            if product_id not in prior_products:
                prior_products.append(product_id)
    short_follow_up = len(query.split()) <= 12 and _FOLLOW_UP.search(query)
    if short_follow_up and prior_products and not next_filters.product_ids:
        next_filters.product_ids = prior_products[:8]
        if intent == "product_discovery":
            intent = "product_comparison"
    if intent in {"product_discovery", "product_comparison"} and not next_filters.available_only:
        next_filters.available_only = True
    if intent == "shipping_policy":
        next_filters.source_types = ["shipping_policy"]
    elif intent == "return_policy":
        next_filters.source_types = ["return_policy"]
    elif intent == "general_shopping" and not next_filters.source_types:
        next_filters.source_types = ["faq", "terms", "shipping_policy", "return_policy"]
    return intent, next_filters
