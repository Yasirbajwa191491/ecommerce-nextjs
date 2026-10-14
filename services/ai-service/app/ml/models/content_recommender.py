"""Item-to-item content recommender.

Fit a scikit-learn column transformer, store one vector per product, and rank
other products by cosine similarity. Scores come from that fitted representation.
"""

import math
import re
from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder

from app.ml.constants import MAX_TOP_K, MODEL_NAME, MODEL_VERSION, SCORE_DECIMALS
from app.ml.errors import TrainingError, UnknownProductError
from app.ml.preprocessing.features import (
    CATEGORICAL_FEATURE_WEIGHT,
    build_feature_frame,
    feature_config,
)
from app.ml.preprocessing.products import ProductRecord, dataset_fingerprint

_TOKEN = re.compile(r"(?u)\b\w\w+\b")


@dataclass(frozen=True)
class Recommendation:
    product_id: str
    score: float
    rank: int
    model_version: str

    def to_dict(self) -> dict[str, object]:
        return {
            "product_id": self.product_id,
            "score": self.score,
            "rank": self.rank,
            "model_version": self.model_version,
        }


@dataclass(frozen=True)
class RecommendationResult:
    query_product_id: str
    model_name: str
    model_version: str
    recommendations: tuple[Recommendation, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "product_id": self.query_product_id,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "recommendations": [item.to_dict() for item in self.recommendations],
        }


@dataclass(frozen=True)
class TrainingSummary:
    model_name: str
    model_version: str
    dataset_fingerprint: str
    rows_fitted: int
    eligible_products: int
    feature_dimensions: int
    vocabulary_size: int
    use_text_tfidf: bool

    def to_dict(self) -> dict[str, object]:
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "dataset_fingerprint": self.dataset_fingerprint,
            "rows_fitted": self.rows_fitted,
            "eligible_products": self.eligible_products,
            "feature_dimensions": self.feature_dimensions,
            "vocabulary_size": self.vocabulary_size,
            "use_text_tfidf": self.use_text_tfidf,
        }


class ContentRecommender:
    """Fitted TF-IDF and one-hot product index."""

    def __init__(self) -> None:
        self.pipeline: ColumnTransformer | None = None
        self.matrix = None
        self.product_ids: list[str] = []
        self.eligible: list[bool] = []
        self.feature_config: dict[str, object] = {}
        self.dataset_fingerprint = ""
        self.model_name = MODEL_NAME
        self.model_version = MODEL_VERSION
        self._index: dict[str, int] = {}

    @property
    def is_fitted(self) -> bool:
        return self.pipeline is not None and self.matrix is not None and bool(self.product_ids)

    def fit(self, records: Sequence[ProductRecord]) -> TrainingSummary:
        if not records:
            raise TrainingError("Cannot train on an empty dataset")
        product_ids = [record.product_id for record in records]
        if len(set(product_ids)) != len(product_ids):
            raise TrainingError("Training records contain duplicate product ids")

        frame = build_feature_frame(records)
        use_text = _column_has_tokens(frame["text"])
        pipeline = _build_pipeline(use_text=use_text)
        try:
            matrix = pipeline.fit_transform(frame)
        except ValueError as exc:
            if "empty vocabulary" not in str(exc).lower():
                raise TrainingError("Feature pipeline could not be fit") from exc
            use_text = False
            pipeline = _build_pipeline(use_text=False)
            try:
                matrix = pipeline.fit_transform(frame)
            except ValueError as retry_exc:
                raise TrainingError("Feature pipeline could not be fit") from retry_exc

        if hasattr(matrix, "tocsr"):
            matrix = matrix.tocsr()
        if matrix.shape[0] != len(records):
            raise TrainingError("Feature matrix does not match the training rows")

        self.pipeline = pipeline
        self.matrix = matrix
        self.product_ids = product_ids
        self.eligible = [bool(value) for value in frame["eligible"].tolist()]
        self.feature_config = feature_config(use_text_tfidf=use_text)
        self.dataset_fingerprint = dataset_fingerprint(records)
        self._index = {product_id: index for index, product_id in enumerate(product_ids)}
        return TrainingSummary(
            model_name=self.model_name,
            model_version=self.model_version,
            dataset_fingerprint=self.dataset_fingerprint,
            rows_fitted=len(records),
            eligible_products=sum(self.eligible),
            feature_dimensions=int(matrix.shape[1]),
            vocabulary_size=_vocabulary_size(pipeline) if use_text else 0,
            use_text_tfidf=use_text,
        )

    def recommend(self, product_id: str, top_k: int = 5) -> RecommendationResult:
        if not self.is_fitted:
            raise TrainingError("Model is not fitted")
        canonical_id = _require_known_id(product_id, self._index)
        limit = _require_top_k(top_k)
        query_index = self._index[canonical_id]
        query = self.matrix[query_index : query_index + 1]
        scores = cosine_similarity(query, self.matrix).ravel()
        ranked: list[tuple[float, str]] = []
        for other_index, raw_score in enumerate(scores):
            if other_index == query_index or not self.eligible[other_index]:
                continue
            ranked.append((_bounded_score(float(raw_score)), self.product_ids[other_index]))
        ranked.sort(key=lambda item: (-item[0], item[1]))
        chosen = ranked[:limit]
        recommendations = tuple(
            Recommendation(
                product_id=item_id,
                score=score,
                rank=rank,
                model_version=self.model_version,
            )
            for rank, (score, item_id) in enumerate(chosen, start=1)
        )
        return RecommendationResult(
            query_product_id=canonical_id,
            model_name=self.model_name,
            model_version=self.model_version,
            recommendations=recommendations,
        )

    def pairwise_content_diversity(self, product_ids: Sequence[str]) -> float | None:
        """Mean pairwise cosine distance inside a recommendation list.

        This describes the fitted vector space. It is not a quality label and
        must not be used as evaluation ground truth.
        """

        if not self.is_fitted or len(product_ids) < 2:
            return None
        indexes = [self._index[item] for item in product_ids if item in self._index]
        if len(indexes) < 2:
            return None
        vectors = self.matrix[indexes]
        similarities = cosine_similarity(vectors)
        distances: list[float] = []
        width = similarities.shape[0]
        for left in range(width):
            for right in range(left + 1, width):
                distances.append(1.0 - float(similarities[left, right]))
        if not distances:
            return None
        return float(np.mean(distances))

    def restore(
        self,
        *,
        pipeline: ColumnTransformer,
        matrix: object,
        product_ids: list[str],
        eligible: list[bool],
        feature_config_payload: dict[str, object],
        dataset_fingerprint_value: str,
    ) -> None:
        if not hasattr(matrix, "shape"):
            raise TrainingError("Feature matrix could not be restored")
        if matrix.shape[0] != len(product_ids) or len(eligible) != len(product_ids):
            raise TrainingError("Feature matrix could not be restored")
        self.pipeline = pipeline
        self.matrix = matrix
        self.product_ids = list(product_ids)
        self.eligible = list(eligible)
        self.feature_config = feature_config_payload
        self.dataset_fingerprint = dataset_fingerprint_value
        self._index = {product_id: index for index, product_id in enumerate(self.product_ids)}


def _build_pipeline(*, use_text: bool) -> ColumnTransformer:
    transformers: list[tuple[str, object, str | list[str]]] = []
    if use_text:
        transformers.append(("text", _tfidf(), "text"))
    transformers.extend(
        [
            ("category", _weighted_one_hot(), ["category_slug"]),
            ("company", _weighted_one_hot(), ["company"]),
            ("price_band", _weighted_one_hot(), ["price_band"]),
        ]
    )
    return ColumnTransformer(
        transformers=transformers,
        remainder="drop",
        sparse_threshold=1.0,
        n_jobs=1,
        verbose_feature_names_out=False,
    )


def _tfidf() -> TfidfVectorizer:
    return TfidfVectorizer(
        lowercase=False,
        stop_words="english",
        ngram_range=(1, 2),
        min_df=1,
        token_pattern=r"(?u)\b\w\w+\b",
        dtype=np.float64,
    )


def _one_hot() -> OneHotEncoder:
    return OneHotEncoder(handle_unknown="ignore", sparse_output=True, dtype=np.float64)


def _scale_categorical(matrix: object) -> object:
    return matrix * CATEGORICAL_FEATURE_WEIGHT


def _weighted_one_hot() -> Pipeline:
    return Pipeline(
        steps=[
            ("encode", _one_hot()),
            (
                "weight",
                FunctionTransformer(
                    _scale_categorical,
                    accept_sparse=True,
                    feature_names_out="one-to-one",
                ),
            ),
        ]
    )


def _column_has_tokens(values: pd.Series) -> bool:
    return any(_TOKEN.search(str(value)) for value in values.tolist())


def _vocabulary_size(pipeline: ColumnTransformer) -> int:
    vectorizer = pipeline.named_transformers_.get("text")
    vocabulary = getattr(vectorizer, "vocabulary_", None)
    if vocabulary is None:
        return 0
    return len(vocabulary)


def _require_known_id(product_id: object, index: dict[str, int]) -> str:
    if not isinstance(product_id, str):
        raise UnknownProductError("")
    canonical = product_id.strip()
    if canonical not in index:
        raise UnknownProductError(canonical)
    return canonical


def _require_top_k(top_k: object) -> int:
    if isinstance(top_k, bool) or not isinstance(top_k, int):
        raise TrainingError("top_k must be a positive integer")
    if top_k < 1 or top_k > MAX_TOP_K:
        raise TrainingError(f"top_k must be between 1 and {MAX_TOP_K}")
    return top_k


def _bounded_score(value: float) -> float:
    if not math.isfinite(value):
        return 0.0
    clipped = min(1.0, max(0.0, value))
    rounded = round(clipped, SCORE_DECIMALS)
    if rounded == 0:
        return 0.0
    return rounded
