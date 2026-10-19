"""Diagnostic activation slot.

Customer-facing model caches are not replaced. A successful diagnostic
activation still reports pending deployment until a process restart loads
the approved artifact through the existing serving gates.
"""

from __future__ import annotations

import threading
from collections.abc import Callable
from dataclasses import dataclass


@dataclass
class DiagnosticSlot:
    version: str
    payload: object
    previous_version: str | None = None
    previous_payload: object | None = None


@dataclass
class ActivationResult:
    outcome: str
    runtime_status: str
    customer_serving: str
    customer_deployment: str
    active_version: str | None
    previous_version: str | None
    reason: str = ""


class ActivationManager:
    """Swap an in-memory diagnostic reference after a smoke check.

    The lock rejects overlapping activations. A failed smoke leaves the
    previous payload in place.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._busy = False
        self._slots: dict[str, DiagnosticSlot] = {}

    @property
    def busy(self) -> bool:
        return self._busy

    def slot(self, family: str) -> DiagnosticSlot | None:
        return self._slots.get(family)

    def activate(
        self,
        family: str,
        version: str,
        *,
        available: bool,
        load: Callable[[], object],
        smoke: Callable[[object], None],
    ) -> ActivationResult:
        if not self._lock.acquire(blocking=False):
            return self._conflict(family)
        if self._busy:
            self._lock.release()
            return self._conflict(family)
        self._busy = True
        self._lock.release()
        previous = self._slots.get(family)
        try:
            if not available:
                return ActivationResult(
                    outcome="artifact_unavailable",
                    runtime_status="artifact_unavailable",
                    customer_serving="unchanged",
                    customer_deployment="not_changed",
                    active_version=previous.version if previous else None,
                    previous_version=previous.previous_version if previous else None,
                    reason="artifact_unavailable",
                )
            candidate = load()
            smoke(candidate)
            self._slots[family] = DiagnosticSlot(
                version=version,
                payload=candidate,
                previous_version=previous.version if previous else None,
                previous_payload=previous.payload if previous else None,
            )
            return ActivationResult(
                outcome="activated_diagnostic",
                runtime_status="pending_deployment",
                customer_serving="pending_deployment",
                customer_deployment="not_changed",
                active_version=version,
                previous_version=previous.version if previous else None,
                reason="serving_cache_not_swapped",
            )
        except Exception as exc:
            return ActivationResult(
                outcome="activation_failed",
                runtime_status="activation_failed",
                customer_serving="unchanged",
                customer_deployment="not_changed",
                active_version=previous.version if previous else None,
                previous_version=previous.previous_version if previous else None,
                reason=type(exc).__name__,
            )
        finally:
            with self._lock:
                self._busy = False

    def rollback(self, family: str, *, available: bool) -> ActivationResult:
        """Restore the previous diagnostic payload.

        Customer-facing caches stay untouched. If the configured artifact is
        gone, or the previous payload was not retained, the current slot stays.
        """

        current = self._slots.get(family)
        if current is None or not current.previous_version or current.previous_payload is None:
            return ActivationResult(
                outcome="no_previous_version",
                runtime_status="not_activated" if current is None else "pending_deployment",
                customer_serving="unchanged",
                customer_deployment="not_changed",
                active_version=current.version if current else None,
                previous_version=None,
                reason="no_previous_version",
            )
        if not available:
            return ActivationResult(
                outcome="artifact_unavailable",
                runtime_status="artifact_unavailable",
                customer_serving="unchanged",
                customer_deployment="not_changed",
                active_version=current.version,
                previous_version=current.previous_version,
                reason="artifact_unavailable",
            )
        if not self._lock.acquire(blocking=False):
            return self._conflict(family)
        if self._busy:
            self._lock.release()
            return self._conflict(family)
        self._busy = True
        self._lock.release()
        try:
            self._slots[family] = DiagnosticSlot(
                version=current.previous_version,
                payload=current.previous_payload,
                previous_version=current.version,
                previous_payload=current.payload,
            )
            return ActivationResult(
                outcome="rolled_back",
                runtime_status="pending_deployment",
                customer_serving="pending_deployment",
                customer_deployment="not_changed",
                active_version=current.previous_version,
                previous_version=current.version,
                reason="diagnostic_slot_restored",
            )
        finally:
            with self._lock:
                self._busy = False

    def _conflict(self, family: str) -> ActivationResult:
        current = self._slots.get(family)
        return ActivationResult(
            outcome="conflict",
            runtime_status="pending_deployment" if current else "not_activated",
            customer_serving="unchanged",
            customer_deployment="not_changed",
            active_version=current.version if current else None,
            previous_version=current.previous_version if current else None,
            reason="concurrent_activation",
        )
