"""Reciprocal rank fusion.

Lexical and vector scores are not added together. Each list contributes
1 / (k + rank).
"""

from collections import defaultdict


def reciprocal_rank_fusion(
    rankings: list[list[str]],
    *,
    rrf_k: int = 60,
) -> list[tuple[str, float]]:
    scores: dict[str, float] = defaultdict(float)
    for ranking in rankings:
        seen: set[str] = set()
        for position, item_id in enumerate(ranking, start=1):
            if item_id in seen:
                continue
            seen.add(item_id)
            scores[item_id] += 1.0 / (rrf_k + position)
    return sorted(scores.items(), key=lambda item: (-item[1], item[0]))
