from app.mlops.activation import ActivationManager


def test_successful_diagnostic_activation_does_not_claim_deployment() -> None:
    manager = ActivationManager()
    result = manager.activate(
        "content",
        "content-v1",
        available=True,
        load=lambda: {"weights": "v1"},
        smoke=lambda _candidate: None,
    )
    assert result.outcome == "activated_diagnostic"
    assert result.customer_deployment == "not_changed"
    assert result.customer_serving == "pending_deployment"
    assert manager.slot("content") is not None
    assert manager.slot("content").payload == {"weights": "v1"}


def test_failed_activation_preserves_the_previous_model() -> None:
    manager = ActivationManager()
    manager.activate(
        "content",
        "content-v1",
        available=True,
        load=lambda: "keep",
        smoke=lambda _candidate: None,
    )

    def fail(_candidate: object) -> None:
        raise RuntimeError("smoke")

    result = manager.activate(
        "content",
        "content-v2",
        available=True,
        load=lambda: "replace",
        smoke=fail,
    )
    assert result.outcome == "activation_failed"
    assert manager.slot("content").version == "content-v1"
    assert manager.slot("content").payload == "keep"


def test_missing_artifact_does_not_clear_the_slot() -> None:
    manager = ActivationManager()
    manager.activate(
        "neural",
        "neural-v1",
        available=True,
        load=lambda: "neural",
        smoke=lambda _candidate: None,
    )
    result = manager.activate(
        "neural",
        "neural-v2",
        available=False,
        load=lambda: "nope",
        smoke=lambda _candidate: None,
    )
    assert result.outcome == "artifact_unavailable"
    assert result.runtime_status == "artifact_unavailable"
    assert manager.slot("neural").payload == "neural"


def test_concurrent_activation_conflicts() -> None:
    manager = ActivationManager()

    def smoke(_candidate: object) -> None:
        nested = manager.activate(
            "content",
            "content-v2",
            available=True,
            load=lambda: "other",
            smoke=lambda _other: None,
        )
        assert nested.outcome == "conflict"

    result = manager.activate(
        "content",
        "content-v1",
        available=True,
        load=lambda: "first",
        smoke=smoke,
    )
    assert result.outcome == "activated_diagnostic"
    assert manager.slot("content").payload == "first"


def test_rollback_restores_the_previous_payload_without_deploying() -> None:
    manager = ActivationManager()
    manager.activate(
        "content",
        "content-v1",
        available=True,
        load=lambda: "v1",
        smoke=lambda _candidate: None,
    )
    manager.activate(
        "content",
        "content-v2",
        available=True,
        load=lambda: "v2",
        smoke=lambda _candidate: None,
    )
    result = manager.rollback("content", available=True)
    assert result.outcome == "rolled_back"
    assert result.customer_deployment == "not_changed"
    assert manager.slot("content").payload == "v1"
    assert manager.slot("content").version == "content-v1"


def test_rollback_keeps_the_current_slot_when_the_artifact_is_gone() -> None:
    manager = ActivationManager()
    manager.activate(
        "forecast",
        "demand-forecast-v1",
        available=True,
        load=lambda: "forecast",
        smoke=lambda _candidate: None,
    )
    manager.activate(
        "forecast",
        "demand-forecast-v2",
        available=True,
        load=lambda: "next",
        smoke=lambda _candidate: None,
    )
    result = manager.rollback("forecast", available=False)
    assert result.outcome == "artifact_unavailable"
    assert manager.slot("forecast").payload == "next"


def test_rollback_without_history() -> None:
    manager = ActivationManager()
    result = manager.rollback("hybrid", available=True)
    assert result.outcome == "no_previous_version"


def test_activation_reports_pending_deployment() -> None:
    manager = ActivationManager()
    result = manager.activate(
        "hybrid",
        "hybrid-v1",
        available=True,
        load=lambda: {"config": True},
        smoke=lambda _candidate: None,
    )
    assert result.runtime_status == "pending_deployment"
    assert result.customer_deployment == "not_changed"
