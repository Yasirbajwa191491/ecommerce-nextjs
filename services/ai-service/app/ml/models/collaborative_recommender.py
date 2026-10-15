"""Item-item collaborative filtering on a sparse implicit-feedback matrix.

Visitors are rows of evidence and products are the items being compared.
Cosine similarity uses only the stored top neighbors, so inference does not
allocate a dense product-by-product matrix.
"""

import math
import time
from collections import defaultdict
from dataclasses import dataclass

import numpy as np
from scipy import sparse
from sklearn.neighbors import NearestNeighbors

from app.ml.behavioral.constants import (
    BEHAVIORAL_FEATURE_VERSION,
    COLLABORATIVE_MODEL_NAME,
    COLLABORATIVE_MODEL_VERSION,
)
from app.ml.behavioral.preprocess import Interaction
from app.ml.constants import MAX_TOP_K, SCORE_DECIMALS
from app.ml.errors import TrainingError, UnknownProductError
from app.ml.models.content_recommender import Recommendation, RecommendationResult


@dataclass(frozen=True)
class CollaborativeTrainingSummary:
    model_name: str
    model_version: str
    feature_version: str
    dataset_fingerprint: str
    product_count: int
    visitor_count: int
    interaction_count: int
    matrix_sparsity: float
    training_seconds: float
    min_product_interactions: int
    min_visitor_interactions: int
    max_neighbors: int

    def to_dict(self) -> dict[str, object]:
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "feature_version": self.feature_version,
            "dataset_fingerprint": self.dataset_fingerprint,
            "product_count": self.product_count,
            "visitor_count": self.visitor_count,
            "interaction_count": self.interaction_count,
            "matrix_sparsity": self.matrix_sparsity,
            "training_seconds": self.training_seconds,
            "min_product_interactions": self.min_product_interactions,
            "min_visitor_interactions": self.min_visitor_interactions,
            "max_neighbors": self.max_neighbors,
        }


class CollaborativeRecommender:
    """Top-K item neighbors from a visitor-product implicit matrix."""

    def __init__(self) -> None:
        self.model_name = COLLABORATIVE_MODEL_NAME
        self.model_version = COLLABORATIVE_MODEL_VERSION
        self.feature_version = BEHAVIORAL_FEATURE_VERSION
        self.dataset_fingerprint = ""
        self.product_ids: list[str] = []
        self.neighbors: dict[str, list[tuple[str, float]]] = {}
        self.summary: CollaborativeTrainingSummary | None = None
        self._catalog: set[str] = set()

    @property
    def is_fitted(self) -> bool:
        return bool(self.product_ids) and self.summary is not None

    def fit(
        self,
        interactions: list[Interaction],
        *,
        dataset_fingerprint: str,
        catalog_ids: list[str] | None = None,
        min_product_interactions: int = 2,
        min_visitor_interactions: int = 1,
        max_neighbors: int = 50,
    ) -> CollaborativeTrainingSummary:
        if min_product_interactions < 1 or min_visitor_interactions < 1:
            raise TrainingError("Interaction thresholds must be at least 1")
        if max_neighbors < 1 or max_neighbors > MAX_TOP_K:
            raise TrainingError("Neighbor count must be from 1 through 100")
        started = time.perf_counter()
        catalog = sorted(set(catalog_ids or []) | {item.product_id for item in interactions})
        if not catalog:
            raise TrainingError("Cannot train without products")
        visitor_counts: dict[str, int] = defaultdict(int)
        product_counts: dict[str, int] = defaultdict(int)
        cleaned: list[Interaction] = []
        for item in interactions:
            if item.weight <= 0 or not math.isfinite(item.weight):
                raise TrainingError("Interaction weights must be finite and positive")
            visitor_counts[item.visitor_id] += 1
            product_counts[item.product_id] += 1
            cleaned.append(item)
        active_visitors = {
            visitor
            for visitor, count in visitor_counts.items()
            if count >= min_visitor_interactions
        }
        active_products = {
            product
            for product, count in product_counts.items()
            if count >= min_product_interactions and product in set(catalog)
        }
        matrix_products = sorted(active_products)
        matrix_visitors = sorted(active_visitors)
        product_index = {product_id: index for index, product_id in enumerate(matrix_products)}
        visitor_index = {visitor_id: index for index, visitor_id in enumerate(matrix_visitors)}
        rows: list[int] = []
        cols: list[int] = []
        data: list[float] = []
        for item in cleaned:
            row = product_index.get(item.product_id)
            col = visitor_index.get(item.visitor_id)
            if row is None or col is None:
                continue
            rows.append(row)
            cols.append(col)
            data.append(float(item.weight))
        if matrix_products and matrix_visitors:
            matrix = sparse.csr_matrix(
                (data, (rows, cols)),
                shape=(len(matrix_products), len(matrix_visitors)),
                dtype=np.float64,
            )
            neighbors = _top_neighbors(matrix, matrix_products, max_neighbors=max_neighbors)
            sparsity = 1.0 - (matrix.nnz / float(matrix.shape[0] * matrix.shape[1]))
        else:
            neighbors = {}
            sparsity = 1.0
        self.product_ids = catalog
        self._catalog = set(catalog)
        self.neighbors = {product_id: neighbors.get(product_id, []) for product_id in catalog}
        self.dataset_fingerprint = dataset_fingerprint
        elapsed = round(time.perf_counter() - started, 6)
        self.summary = CollaborativeTrainingSummary(
            model_name=self.model_name,
            model_version=self.model_version,
            feature_version=self.feature_version,
            dataset_fingerprint=dataset_fingerprint,
            product_count=len(catalog),
            visitor_count=len(matrix_visitors),
            interaction_count=len(data),
            matrix_sparsity=round(sparsity, 6),
            training_seconds=elapsed,
            min_product_interactions=min_product_interactions,
            min_visitor_interactions=min_visitor_interactions,
            max_neighbors=max_neighbors,
        )
        return self.summary

    def recommend(self, product_id: str, top_k: int = 5) -> RecommendationResult:
        if not self.is_fitted:
            raise TrainingError("Model is not fitted")
        canonical = product_id.strip()
        if canonical not in self._catalog:
            raise UnknownProductError(canonical)
        limit = _require_top_k(top_k)
        ranked = [
            (score, neighbor_id)
            for neighbor_id, score in self.neighbors.get(canonical, [])
            if neighbor_id != canonical and math.isfinite(score) and score > 0
        ]
        ranked.sort(key=lambda item: (-item[0], item[1]))
        recommendations = tuple(
            Recommendation(
                product_id=neighbor_id,
                score=score,
                rank=rank,
                model_version=self.model_version,
            )
            for rank, (score, neighbor_id) in enumerate(ranked[:limit], start=1)
        )
        return RecommendationResult(
            query_product_id=canonical,
            model_name=self.model_name,
            model_version=self.model_version,
            recommendations=recommendations,
        )

    def restore(
        self,
        *,
        product_ids: list[str],
        neighbors: dict[str, list[tuple[str, float]]],
        dataset_fingerprint: str,
        summary: CollaborativeTrainingSummary,
    ) -> None:
        self.product_ids = list(product_ids)
        self._catalog = set(product_ids)
        self.neighbors = neighbors
        self.dataset_fingerprint = dataset_fingerprint
        self.summary = summary


def _top_neighbors(
    matrix: sparse.csr_matrix,
    product_ids: list[str],
    *,
    max_neighbors: int,
) -> dict[str, list[tuple[str, float]]]:
    n_items = matrix.shape[0]
    if n_items <= 1:
        return {product_id: [] for product_id in product_ids}
    neighbor_count = min(n_items, max_neighbors + 1)
    model = NearestNeighbors(n_neighbors=neighbor_count, metric="cosine", algorithm="brute")
    model.fit(matrix)
    found: dict[str, list[tuple[str, float]]] = {}
    for start in range(0, n_items, 128):
        end = min(n_items, start + 128)
        distances, indices = model.kneighbors(matrix[start:end], return_distance=True)
        for offset, (distance_row, index_row) in enumerate(zip(distances, indices, strict=True)):
            item_index = start + offset
            ranked: list[tuple[float, str]] = []
            for distance, other_index in zip(distance_row, index_row, strict=True):
                other = int(other_index)
                if other == item_index:
                    continue
                similarity = 1.0 - float(distance)
                if not math.isfinite(similarity) or similarity <= 0:
                    continue
                score = round(min(1.0, similarity), SCORE_DECIMALS)
                if score <= 0:
                    continue
                ranked.append((score, product_ids[other]))
            ranked.sort(key=lambda item: (-item[0], item[1]))
            found[product_ids[item_index]] = [
                (neighbor_id, score) for score, neighbor_id in ranked[:max_neighbors]
            ]
    return found


def _require_top_k(top_k: int) -> int:
    if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k < 1 or top_k > MAX_TOP_K:
        raise TrainingError("top_k must be an integer from 1 through 100")
    return top_k
