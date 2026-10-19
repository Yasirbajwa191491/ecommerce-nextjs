"""Bounded monitoring aggregates. Request payloads and customer text are refused."""

from __future__ import annotations

from dataclasses import dataclass, field

FORBIDDEN_FIELDS = frozenset(
    {
        "email",
        "prompt",
        "phone",
        "address",
        "card",
        "password",
        "token",
        "customer",
        "payment",
    }
)


@dataclass
class Bucket:
    family: str
    model_version: str
    time_bucket: str
    request_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    timeout_count: int = 0
    fallback_count: int = 0
    latency_count: int = 0
    latency_sum_ms: float = 0.0
    latency_max_ms: float = 0.0
    last_error_category: str = ""
    last_success_bucket: str = ""

    def as_dict(self) -> dict[str, object]:
        latency = self.latency_sum_ms / self.latency_count if self.latency_count else 0.0
        return {
            "family": self.family,
            "model_version": self.model_version,
            "time_bucket": self.time_bucket,
            "request_count": self.request_count,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "timeout_count": self.timeout_count,
            "fallback_count": self.fallback_count,
            "latency_avg_ms": round(latency, 3),
            "latency_max_ms": self.latency_max_ms,
            "last_error_category": self.last_error_category,
            "last_success_bucket": self.last_success_bucket,
        }


@dataclass
class MonitoringStore:
    buckets: dict[tuple[str, str, str], Bucket] = field(default_factory=dict)
    last_run: str = ""

    def record(
        self,
        *,
        family: str,
        model_version: str,
        time_bucket: str,
        outcome: str,
        latency_ms: float,
        error_category: str = "",
        extra: dict[str, object] | None = None,
    ) -> Bucket:
        if extra and FORBIDDEN_FIELDS.intersection(extra):
            raise ValueError("sensitive_field")
        if outcome not in {"success", "failure", "timeout", "fallback"}:
            raise ValueError("unsupported_outcome")
        key = (family, model_version, time_bucket)
        bucket = self.buckets.get(key)
        if bucket is None:
            bucket = Bucket(family=family, model_version=model_version, time_bucket=time_bucket)
            self.buckets[key] = bucket
        bucket.request_count += 1
        if outcome == "success":
            bucket.success_count += 1
            bucket.last_success_bucket = time_bucket
        elif outcome == "failure":
            bucket.failure_count += 1
            bucket.last_error_category = error_category[:80]
        elif outcome == "timeout":
            bucket.timeout_count += 1
            bucket.last_error_category = "timeout"
        else:
            bucket.fallback_count += 1
        if latency_ms >= 0:
            bucket.latency_count += 1
            bucket.latency_sum_ms += latency_ms
            bucket.latency_max_ms = max(bucket.latency_max_ms, latency_ms)
        self.last_run = time_bucket
        return bucket

    def prune(self, *, today: str, retention_days: int) -> int:
        removed = 0
        for key, bucket in list(self.buckets.items()):
            if _age_days(bucket.time_bucket, today) > retention_days:
                del self.buckets[key]
                removed += 1
        return removed


def _age_days(bucket: str, today: str) -> int:
    """Compare ISO dates without importing a timezone."""

    by, bm, bd = (int(part) for part in bucket.split("-"))
    ty, tm, td = (int(part) for part in today.split("-"))
    return (ty * 372 + tm * 31 + td) - (by * 372 + bm * 31 + bd)
