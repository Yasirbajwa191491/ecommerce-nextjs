"""Item-to-item inference from learned product embeddings.

`recommend` ranks other products by cosine similarity of the product embedding
table. That score is embedding similarity, not a predicted purchase probability.
Visitor identifiers stay inside the trusted artifact and are not returned.
"""

import math
from dataclasses import dataclass

import torch

from app.ml.constants import MAX_TOP_K, SCORE_DECIMALS
from app.ml.errors import TrainingError, UnknownProductError
from app.ml.neural.constants import NEURAL_MODEL_NAME, NEURAL_MODEL_VERSION, NEURAL_SCORE_KIND
from app.ml.neural.module import NeuralMatrixFactorization


@dataclass(frozen=True)
class NeuralRecommendation:
    product_id: str
    score: float
    rank: int
    model_version: str
    strategy: str = "neural"

    def to_dict(self) -> dict[str, object]:
        return {
            "product_id": self.product_id,
            "score": self.score,
            "rank": self.rank,
            "model_version": self.model_version,
            "strategy": self.strategy,
            "score_kind": NEURAL_SCORE_KIND,
        }


@dataclass(frozen=True)
class NeuralRecommendationResult:
    query_product_id: str
    model_name: str
    model_version: str
    score_kind: str
    cold_start: bool
    recommendations: tuple[NeuralRecommendation, ...]
    trained_at: str
    dataset_fingerprint: str
    validation_loss: float | None
    evaluation_summary: dict[str, object] | None

    def to_dict(self) -> dict[str, object]:
        return {
            "product_id": self.query_product_id,
            "requested_strategy": "neural",
            "strategy": "neural",
            "model_name": self.model_name,
            "model_version": self.model_version,
            "score_kind": self.score_kind,
            "cold_start": self.cold_start,
            "fallback_reason": None,
            "trained_at": self.trained_at,
            "dataset_fingerprint": self.dataset_fingerprint,
            "validation_loss": self.validation_loss,
            "evaluation_summary": self.evaluation_summary,
            "recommendations": [item.to_dict() for item in self.recommendations],
        }


class NeuralRecommender:
    """Rank catalog neighbors from a fitted neural matrix factorization model."""

    def __init__(self) -> None:
        self.model_name = NEURAL_MODEL_NAME
        self.model_version = NEURAL_MODEL_VERSION
        self.score_kind = NEURAL_SCORE_KIND
        self.module: NeuralMatrixFactorization | None = None
        self.visitor_ids: list[str] = []
        self.product_ids: list[str] = []
        self.catalog_ids: list[str] = []
        self.dataset_fingerprint = ""
        self.trained_at = ""
        self.validation_loss: float | None = None
        self.evaluation_summary: dict[str, object] | None = None
        self.metadata: dict[str, object] = {}
        self._catalog: set[str] = set()
        self._product_index: dict[str, int] = {}
        self._visitor_index: dict[str, int] = {}
        self._normalized: torch.Tensor | None = None

    @property
    def is_fitted(self) -> bool:
        return self.module is not None and bool(self.product_ids) and self._normalized is not None

    def bind(
        self,
        module: NeuralMatrixFactorization,
        *,
        visitor_ids: list[str],
        product_ids: list[str],
        catalog_ids: list[str],
        dataset_fingerprint: str,
        trained_at: str,
        validation_loss: float | None,
        metadata: dict[str, object],
        evaluation_summary: dict[str, object] | None = None,
    ) -> None:
        module.eval()
        self.module = module
        self.visitor_ids = list(visitor_ids)
        self.product_ids = list(product_ids)
        self.catalog_ids = sorted(set(catalog_ids) | set(product_ids))
        self._catalog = set(self.catalog_ids)
        self._product_index = {product_id: index for index, product_id in enumerate(product_ids)}
        self._visitor_index = {visitor_id: index for index, visitor_id in enumerate(visitor_ids)}
        self.dataset_fingerprint = dataset_fingerprint
        self.trained_at = trained_at
        self.validation_loss = validation_loss
        self.metadata = dict(metadata)
        self.evaluation_summary = evaluation_summary
        self._normalized = _normalize_rows(module.product_embedding.weight.detach().cpu().float())

    def recommend(self, product_id: str, top_k: int = 5) -> NeuralRecommendationResult:
        if not self.is_fitted or self._normalized is None:
            raise TrainingError("Model is not fitted")
        canonical = product_id.strip()
        if canonical not in self._catalog:
            raise UnknownProductError(canonical)
        limit = _require_top_k(top_k)
        index = self._product_index.get(canonical)
        if index is None:
            return self._result(canonical, cold_start=True, recommendations=())
        with torch.inference_mode():
            scores = self._normalized @ self._normalized[index]
        ranked: list[tuple[float, str]] = []
        for other_index, raw_score in enumerate(scores.tolist()):
            if other_index == index:
                continue
            score = float(raw_score)
            if not math.isfinite(score):
                continue
            ranked.append((round(score, SCORE_DECIMALS), self.product_ids[other_index]))
        ranked.sort(key=lambda item: (-item[0], item[1]))
        recommendations = tuple(
            NeuralRecommendation(
                product_id=neighbor_id,
                score=score,
                rank=rank,
                model_version=self.model_version,
            )
            for rank, (score, neighbor_id) in enumerate(ranked[:limit], start=1)
        )
        return self._result(canonical, cold_start=False, recommendations=recommendations)

    def interaction_logit(self, visitor_id: str, product_id: str) -> float | None:
        """Offline logit for a training-period pair. Not an HTTP response."""

        if self.module is None:
            raise TrainingError("Model is not fitted")
        visitor = self._visitor_index.get(visitor_id)
        product = self._product_index.get(product_id)
        if visitor is None or product is None:
            return None
        with torch.inference_mode():
            logit = self.module(
                torch.tensor([visitor], dtype=torch.long),
                torch.tensor([product], dtype=torch.long),
            )
        value = float(logit[0])
        if not math.isfinite(value):
            return None
        return value

    def _result(
        self,
        product_id: str,
        *,
        cold_start: bool,
        recommendations: tuple[NeuralRecommendation, ...],
    ) -> NeuralRecommendationResult:
        return NeuralRecommendationResult(
            query_product_id=product_id,
            model_name=self.model_name,
            model_version=self.model_version,
            score_kind=self.score_kind,
            cold_start=cold_start,
            recommendations=recommendations,
            trained_at=self.trained_at,
            dataset_fingerprint=self.dataset_fingerprint,
            validation_loss=self.validation_loss,
            evaluation_summary=self.evaluation_summary,
        )


def _normalize_rows(weight: torch.Tensor) -> torch.Tensor:
    norms = weight.norm(dim=1, keepdim=True).clamp_min(1e-12)
    return weight / norms


def _require_top_k(top_k: int) -> int:
    if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k < 1 or top_k > MAX_TOP_K:
        raise TrainingError("top_k must be an integer from 1 through 100")
    return top_k
