"""Identifiers for the Phase 4 neural recommendation model.

`neural-v1` is a separate artifact from `content-v1`, `collaborative-v1`, and
`hybrid-v1`. The feature version matches the Phase 3 implicit-feedback contract.
"""

NEURAL_MODEL_NAME = "neural_mf_implicit"
NEURAL_MODEL_VERSION = "neural-v1"
NEURAL_FEATURE_VERSION = "behavioral-implicit-v1"
NEURAL_ARTIFACT_FORMAT_VERSION = 1
NEURAL_SCORE_KIND = "product_embedding_cosine"
NEURAL_OBJECTIVE = "binary_cross_entropy_with_logits"

PROTECTED_ARTIFACT_PREFIXES = ("content-v1", "collaborative-v1", "hybrid-v1")
