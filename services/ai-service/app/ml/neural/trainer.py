"""Mini-batch training for neural matrix factorization.

The loop runs on CPU unless the caller selects CUDA. It keeps the checkpoint
with the lowest validation loss and stops after `patience` epochs without
that loss improving.
"""

import math
import random
import time
from dataclasses import dataclass

import numpy as np
import torch
from torch import nn

from app.ml.errors import TrainingError
from app.ml.neural.config import NeuralModelConfig
from app.ml.neural.module import NeuralMatrixFactorization
from app.ml.neural.sampling import PairExample


@dataclass(frozen=True)
class TrainingHistory:
    train_loss: tuple[float, ...]
    validation_loss: tuple[float, ...]
    best_epoch: int
    epochs_ran: int
    stopped_early: bool
    best_validation_loss: float
    device: str
    training_seconds: float

    def to_dict(self) -> dict[str, object]:
        return {
            "train_loss": list(self.train_loss),
            "validation_loss": list(self.validation_loss),
            "best_epoch": self.best_epoch,
            "epochs_ran": self.epochs_ran,
            "stopped_early": self.stopped_early,
            "best_validation_loss": self.best_validation_loss,
            "device": self.device,
            "training_seconds": self.training_seconds,
        }


def best_epoch_index(losses: list[float], min_delta: float) -> int:
    if not losses:
        raise TrainingError("Cannot select a checkpoint without validation losses")
    best_index = 0
    best = losses[0]
    for index, loss in enumerate(losses[1:], start=1):
        if loss < best - min_delta:
            best = loss
            best_index = index
    return best_index


def resolve_device(name: str) -> torch.device:
    if name == "cpu":
        return torch.device("cpu")
    if name == "cuda":
        if not torch.cuda.is_available():
            raise TrainingError("CUDA was requested but is not available")
        return torch.device("cuda")
    if name == "auto":
        if torch.cuda.is_available():
            return torch.device("cuda")
        return torch.device("cpu")
    raise TrainingError("Device must be cpu, cuda, or auto")


def set_training_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    torch.use_deterministic_algorithms(True, warn_only=True)


def train_matrix_factorization(
    *,
    n_visitors: int,
    n_products: int,
    train_examples: list[PairExample],
    validation_examples: list[PairExample],
    config: NeuralModelConfig,
) -> tuple[NeuralMatrixFactorization, TrainingHistory]:
    config.validated()
    if not train_examples or not validation_examples:
        raise TrainingError("Neural training needs both training and validation examples")
    set_training_seed(config.seed)
    device = resolve_device(config.device)
    model = NeuralMatrixFactorization(
        n_visitors,
        n_products,
        config.embedding_dim,
        config.hidden_sizes,
        config.dropout,
    ).to(device)
    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=config.learning_rate,
        weight_decay=config.weight_decay,
    )
    loss_fn = nn.BCEWithLogitsLoss(reduction="none")
    generator = torch.Generator(device="cpu")
    generator.manual_seed(config.seed)
    train_losses: list[float] = []
    validation_losses: list[float] = []
    best_state: dict[str, torch.Tensor] | None = None
    wait = 0
    started = time.perf_counter()
    for _epoch in range(config.epochs):
        train_loss = _epoch_loss(
            model,
            train_examples,
            batch_size=config.batch_size,
            loss_fn=loss_fn,
            optimizer=optimizer,
            device=device,
            generator=generator,
            train=True,
            grad_clip=config.grad_clip,
        )
        validation_loss = _epoch_loss(
            model,
            validation_examples,
            batch_size=config.batch_size,
            loss_fn=loss_fn,
            optimizer=optimizer,
            device=device,
            generator=generator,
            train=False,
            grad_clip=config.grad_clip,
        )
        train_losses.append(train_loss)
        validation_losses.append(validation_loss)
        chosen = best_epoch_index(validation_losses, config.min_delta)
        if chosen == len(validation_losses) - 1:
            best_state = _clone_state(model)
            wait = 0
        else:
            wait += 1
            if wait >= config.patience:
                break
    if best_state is None:
        raise TrainingError("Neural training did not produce a checkpoint")
    model.load_state_dict(best_state)
    model.to("cpu")
    model.eval()
    chosen = best_epoch_index(validation_losses, config.min_delta)
    elapsed = round(time.perf_counter() - started, 6)
    history = TrainingHistory(
        train_loss=tuple(train_losses),
        validation_loss=tuple(validation_losses),
        best_epoch=chosen + 1,
        epochs_ran=len(train_losses),
        stopped_early=len(train_losses) < config.epochs,
        best_validation_loss=round(validation_losses[chosen], 6),
        device=device.type,
        training_seconds=elapsed,
    )
    return model, history


def _epoch_loss(
    model: NeuralMatrixFactorization,
    examples: list[PairExample],
    *,
    batch_size: int,
    loss_fn: nn.BCEWithLogitsLoss,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
    generator: torch.Generator,
    train: bool,
    grad_clip: float,
) -> float:
    if train:
        model.train()
        order = torch.randperm(len(examples), generator=generator).tolist()
    else:
        model.eval()
        order = list(range(len(examples)))
    total_loss = 0.0
    total_weight = 0.0
    context = torch.enable_grad() if train else torch.inference_mode()
    with context:
        for start in range(0, len(order), batch_size):
            batch = [examples[index] for index in order[start : start + batch_size]]
            visitors = torch.tensor(
                [item.visitor_index for item in batch], dtype=torch.long, device=device
            )
            products = torch.tensor(
                [item.product_index for item in batch], dtype=torch.long, device=device
            )
            labels = torch.tensor(
                [item.label for item in batch], dtype=torch.float32, device=device
            )
            weights = torch.tensor(
                [item.weight for item in batch], dtype=torch.float32, device=device
            )
            logits = model(visitors, products)
            if logits.shape != labels.shape:
                raise TrainingError("Neural model output shape does not match the batch")
            raw = loss_fn(logits, labels)
            weighted = raw * weights
            loss = weighted.sum() / weights.sum().clamp_min(1e-6)
            if train:
                optimizer.zero_grad(set_to_none=True)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), grad_clip)
                optimizer.step()
            total_loss += float(weighted.detach().sum().cpu())
            total_weight += float(weights.detach().sum().cpu())
    if total_weight <= 0 or not math.isfinite(total_loss):
        raise TrainingError("Loss was not finite")
    value = total_loss / total_weight
    if not math.isfinite(value):
        raise TrainingError("Loss was not finite")
    return round(value, 6)


def _clone_state(model: nn.Module) -> dict[str, torch.Tensor]:
    return {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
