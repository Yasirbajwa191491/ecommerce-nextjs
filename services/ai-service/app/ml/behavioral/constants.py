"""Identifiers for the behavioral collaborative and hybrid models.

These names are separate from the Phase 2 content model (`content-v1`).
"""

COLLABORATIVE_MODEL_NAME = "item_item_implicit_cosine"
COLLABORATIVE_MODEL_VERSION = "collaborative-v1"
HYBRID_MODEL_NAME = "hybrid_content_collaborative"
HYBRID_MODEL_VERSION = "hybrid-v1"
BEHAVIORAL_FEATURE_VERSION = "behavioral-implicit-v1"
BEHAVIORAL_ARTIFACT_FORMAT_VERSION = 1

EVENT_TYPES = (
    "product_view",
    "recommendation_impression",
    "recommendation_click",
    "wishlist_add",
    "add_to_cart",
    "purchase",
    "product_comparison",
    "search_result_click",
)

DATASET_SOURCES = ("synthetic", "convex_export")
PLATFORMS = ("web", "mobile", "unspecified")
STRATEGIES = ("content", "collaborative", "hybrid")
FUSION_MODES = ("reciprocal_rank", "minmax")

DEFAULT_WEIGHTS: dict[str, float] = {
    "product_view": 1.0,
    "recommendation_impression": 0.5,
    "recommendation_click": 2.0,
    "wishlist_add": 3.0,
    "add_to_cart": 4.0,
    "purchase": 6.0,
    "product_comparison": 2.0,
    "search_result_click": 2.0,
}

# Starting points for offline comparison. They are not tuned on customer data.
WEIGHT_SCHEMES: dict[str, dict[str, float]] = {
    "default": DEFAULT_WEIGHTS,
    "uniform": {event_type: 1.0 for event_type in EVENT_TYPES},
    "purchase_heavy": {
        **DEFAULT_WEIGHTS,
        "purchase": 12.0,
        "add_to_cart": 5.0,
        "product_view": 1.0,
        "recommendation_impression": 0.25,
    },
}
