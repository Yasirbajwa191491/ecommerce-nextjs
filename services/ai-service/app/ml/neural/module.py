"""Neural matrix factorization for implicit feedback.

The module emits logits. Training applies `BCEWithLogitsLoss`, so `forward`
must not apply a sigmoid. Product embeddings are the item representation used
at serving time. Their cosine similarity is not a purchase probability.
"""

import torch
from torch import nn


class NeuralMatrixFactorization(nn.Module):
    """Visitor and product embeddings with an elementwise interaction and a small MLP."""

    def __init__(
        self,
        n_visitors: int,
        n_products: int,
        embedding_dim: int,
        hidden_sizes: tuple[int, ...],
        dropout: float,
    ) -> None:
        super().__init__()
        if n_visitors < 1 or n_products < 1:
            raise ValueError("Embedding tables require at least one visitor and one product")
        self.visitor_embedding = nn.Embedding(n_visitors, embedding_dim)
        self.product_embedding = nn.Embedding(n_products, embedding_dim)
        blocks: list[nn.Module] = []
        mlp_width = embedding_dim * 2
        for hidden in hidden_sizes:
            blocks.append(nn.Linear(mlp_width, hidden))
            blocks.append(nn.ReLU())
            blocks.append(nn.Dropout(dropout))
            mlp_width = hidden
        self.mlp = nn.Sequential(*blocks)
        self.output = nn.Linear(embedding_dim + mlp_width, 1)
        self.reset_parameters()

    def reset_parameters(self) -> None:
        nn.init.normal_(self.visitor_embedding.weight, mean=0.0, std=0.01)
        nn.init.normal_(self.product_embedding.weight, mean=0.0, std=0.01)
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                nn.init.zeros_(module.bias)

    def forward(self, visitor_index: torch.Tensor, product_index: torch.Tensor) -> torch.Tensor:
        visitor = self.visitor_embedding(visitor_index)
        product = self.product_embedding(product_index)
        interaction = visitor * product
        hidden = self.mlp(torch.cat((visitor, product), dim=-1))
        logits = self.output(torch.cat((interaction, hidden), dim=-1))
        return logits.squeeze(-1)
