"""Typed hyperparameters for neural matrix factorization.

Defaults are sized for a laptop CPU. They are not tuned on customer data.
"""

from dataclasses import dataclass

from app.ml.errors import TrainingError

_DEVICES = ("cpu", "cuda", "auto")
_SAMPLERS = ("uniform", "popularity")


@dataclass(frozen=True)
class NeuralModelConfig:
    embedding_dim: int = 16
    hidden_sizes: tuple[int, ...] = (32,)
    dropout: float = 0.1
    learning_rate: float = 0.05
    batch_size: int = 64
    epochs: int = 20
    weight_decay: float = 1e-4
    negative_ratio: int = 4
    seed: int = 42
    patience: int = 3
    min_delta: float = 1e-5
    grad_clip: float = 1.0
    validation_quantile: float = 0.8
    device: str = "cpu"
    sampler: str = "uniform"
    weight_scheme: str = "default"

    def to_dict(self) -> dict[str, object]:
        return {
            "embedding_dim": self.embedding_dim,
            "hidden_sizes": list(self.hidden_sizes),
            "dropout": self.dropout,
            "learning_rate": self.learning_rate,
            "batch_size": self.batch_size,
            "epochs": self.epochs,
            "weight_decay": self.weight_decay,
            "negative_ratio": self.negative_ratio,
            "seed": self.seed,
            "patience": self.patience,
            "min_delta": self.min_delta,
            "grad_clip": self.grad_clip,
            "validation_quantile": self.validation_quantile,
            "device": self.device,
            "sampler": self.sampler,
            "weight_scheme": self.weight_scheme,
        }

    def validated(self) -> "NeuralModelConfig":
        if self.embedding_dim < 2 or self.embedding_dim > 256:
            raise TrainingError("Embedding dimension must be from 2 through 256")
        if len(self.hidden_sizes) > 3:
            raise TrainingError("Use at most three hidden layers")
        if any(size < 1 or size > 512 for size in self.hidden_sizes):
            raise TrainingError("Hidden layer size must be from 1 through 512")
        if self.dropout < 0 or self.dropout >= 1:
            raise TrainingError("Dropout must be from 0 inclusive through 1 exclusive")
        if self.learning_rate <= 0 or self.learning_rate > 1:
            raise TrainingError("Learning rate must be greater than 0 and at most 1")
        if self.batch_size < 1 or self.batch_size > 4096:
            raise TrainingError("Batch size must be from 1 through 4096")
        if self.epochs < 1 or self.epochs > 200:
            raise TrainingError("Epoch count must be from 1 through 200")
        if self.weight_decay < 0 or self.weight_decay > 1:
            raise TrainingError("Weight decay must be from 0 through 1")
        if self.negative_ratio < 1 or self.negative_ratio > 20:
            raise TrainingError("Negative ratio must be from 1 through 20")
        if self.seed < 0 or self.seed > 2**31 - 1:
            raise TrainingError("Random seed is out of range")
        if self.patience < 1 or self.patience > 50:
            raise TrainingError("Early-stopping patience must be from 1 through 50")
        if self.min_delta < 0 or self.min_delta > 1:
            raise TrainingError("Early-stopping delta is out of range")
        if self.grad_clip <= 0 or self.grad_clip > 100:
            raise TrainingError("Gradient clip must be greater than 0 and at most 100")
        if not 0 < self.validation_quantile < 1:
            raise TrainingError("Validation quantile must be between 0 and 1")
        if self.device not in _DEVICES:
            raise TrainingError("Device must be cpu, cuda, or auto")
        if self.sampler not in _SAMPLERS:
            raise TrainingError("Negative sampler must be uniform or popularity")
        if self.weight_scheme not in {"default", "uniform", "purchase_heavy"}:
            raise TrainingError("Unknown event weight scheme")
        return self


def evaluation_config() -> NeuralModelConfig:
    """Small CPU configuration for the offline comparison command."""

    return NeuralModelConfig(
        embedding_dim=8,
        hidden_sizes=(16,),
        dropout=0.0,
        learning_rate=0.05,
        batch_size=32,
        epochs=8,
        weight_decay=1e-4,
        negative_ratio=2,
        seed=42,
        patience=2,
        device="cpu",
        sampler="uniform",
    )
