"""PyTorch module and configuration checks. No artifact is published."""

import torch
from torch import nn

from app.ml.errors import TrainingError
from app.ml.neural.config import NeuralModelConfig
from app.ml.neural.module import NeuralMatrixFactorization
from app.ml.neural.trainer import best_epoch_index, resolve_device


def test_forward_pass_is_finite_and_trainable_on_cpu() -> None:
    model = NeuralMatrixFactorization(3, 4, 8, (8,), 0.0)
    visitors = torch.tensor([0, 1, 2, 0])
    products = torch.tensor([1, 2, 3, 0])
    logits = model(visitors, products)
    assert logits.shape == (4,)
    assert torch.isfinite(logits).all()
    assert not any(isinstance(layer, nn.Sigmoid) for layer in model.modules())
    assert next(model.parameters()).device.type == "cpu"
    loss = nn.functional.binary_cross_entropy_with_logits(
        logits, torch.tensor([1.0, 0.0, 1.0, 0.0])
    )
    loss.backward()
    gradient = model.visitor_embedding.weight.grad
    assert gradient is not None
    assert torch.isfinite(gradient).all()
    assert float(gradient.abs().sum()) > 0


def test_eval_inference_is_deterministic() -> None:
    model = NeuralMatrixFactorization(2, 2, 4, (4,), 0.5)
    model.eval()
    visitors = torch.tensor([0, 1])
    products = torch.tensor([1, 0])
    with torch.inference_mode():
        first = model(visitors, products)
        second = model(visitors, products)
    assert torch.equal(first, second)


def test_configuration_validation_and_cpu_device() -> None:
    NeuralModelConfig().validated()
    try:
        NeuralModelConfig(dropout=1).validated()
    except TrainingError as exc:
        assert "Dropout" in str(exc)
    else:
        raise AssertionError("invalid dropout was accepted")
    assert resolve_device("cpu").type == "cpu"
    assert best_epoch_index([0.5, 0.4, 0.45, 0.46], 1e-5) == 1
