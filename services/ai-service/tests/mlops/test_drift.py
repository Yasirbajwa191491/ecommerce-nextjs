from app.mlops.drift import (
    alert_decision,
    forecast_reference,
    jensen_shannon,
    missing_value_drift,
    performance_status,
    population_stability_index,
    rag_index_summary,
    recommendation_reference,
)


def _series(start: float, count: int = 40) -> list[float]:
    return [start + (index % 5) * 0.1 for index in range(count)]


def test_psi_is_low_for_similar_samples() -> None:
    reference = _series(1.0)
    current = _series(1.02)
    result = population_stability_index(reference, current)
    assert result.status == "ok"
    assert result.score is not None
    assert result.severity in {"normal", "warning"}


def test_psi_detects_a_shift() -> None:
    result = population_stability_index(_series(0.0), _series(50.0))
    assert result.severity == "critical"
    assert result.score is not None
    assert result.score > 0.25


def test_small_and_empty_samples_are_not_scored() -> None:
    small = population_stability_index([1.0, 2.0], [1.0, 2.0])
    empty = population_stability_index([], [])
    assert small.status == "insufficient_data"
    assert small.score is None
    assert empty.status == "insufficient_data"


def test_constant_features() -> None:
    same = population_stability_index([3.0] * 40, [3.0] * 40)
    shifted = population_stability_index([3.0] * 40, [9.0] * 40)
    assert same.severity == "normal"
    assert same.reason == "constant_feature"
    assert shifted.severity == "critical"


def test_jensen_shannon_unseen_category() -> None:
    reference = ["apparel"] * 40
    current = ["apparel"] * 20 + ["home"] * 20
    result = jensen_shannon(reference, current)
    assert result.reason == "unseen_category"
    assert result.score is not None
    assert result.score > 0


def test_missing_value_drift() -> None:
    result = missing_value_drift([False] * 40, [True] * 20 + [False] * 20)
    assert result.metric == "missing_rate"
    assert result.severity in {"warning", "critical"}


def test_zero_probability_bins_do_not_crash() -> None:
    reference = [0.0] * 20 + [1.0] * 20
    current = [10.0] * 40
    result = population_stability_index(reference, current)
    assert result.score is not None
    assert result.score == result.score


def test_alert_deduplication() -> None:
    first = alert_decision(
        family="content",
        feature="price",
        metric="psi",
        severity="warning",
        open_fingerprints=set(),
        acknowledged_fingerprints=set(),
        consecutive_hits=2,
    )
    duplicate = alert_decision(
        family="content",
        feature="price",
        metric="psi",
        severity="warning",
        open_fingerprints={first.fingerprint},
        acknowledged_fingerprints=set(),
        consecutive_hits=2,
    )
    waiting = alert_decision(
        family="content",
        feature="price",
        metric="psi",
        severity="warning",
        open_fingerprints=set(),
        acknowledged_fingerprints=set(),
        consecutive_hits=1,
    )
    assert first.action == "open"
    assert duplicate.action == "duplicate"
    assert waiting.action == "awaiting_confirmation"


def test_performance_substitutes_are_not_measured() -> None:
    assert (
        performance_status(task="recommendation", outcomes_available=True, metric="shadow_overlap")[
            "status"
        ]
        == "not_measured"
    )
    assert (
        performance_status(task="forecast", outcomes_available=False, metric="mae")["reason"]
        == "forecast_outcomes_unavailable"
    )
    assert (
        performance_status(task="rag", outcomes_available=True, metric="llm_confidence")["status"]
        == "not_measured"
    )


def test_reference_summaries_drop_visitor_identifiers() -> None:
    summary = recommendation_reference(
        [
            {
                "interaction_type": "purchase",
                "category": "home",
                "product_id": "p1",
                "visitor_id": "secret-visitor",
                "email": "a@example.com",
            }
        ]
    )
    encoded = str(summary)
    assert "secret-visitor" not in encoded
    assert "a@example.com" not in encoded
    forecast = forecast_reference([1.0, 0.0], [False, True])
    assert "daily_units" in forecast["numeric"]
    rag = rag_index_summary(
        source_types=["product", "faq"],
        empty_results=[False],
        citation_failures=[True],
    )
    assert rag["numeric_feature_drift"] == "not_applicable"
