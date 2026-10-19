"""Allowlisted retraining plans. No shell, path, module, or environment input."""

from __future__ import annotations

from dataclasses import dataclass, field

JOB_TYPES = (
    "content_retrain",
    "collaborative_retrain",
    "neural_retrain",
    "forecast_retrain",
    "hybrid_config_refresh",
)

ENTRYPOINTS = {
    "content_retrain": "training.train_recommendations",
    "collaborative_retrain": "training.train_collaborative",
    "neural_retrain": "training.train_neural",
    "forecast_retrain": "training.train_demand_forecast",
    "hybrid_config_refresh": "training.configure_hybrid",
}

TRANSITIONS = {
    "requested": {"authorized", "cancelled"},
    "authorized": {"preparing", "cancelled"},
    "preparing": {"training", "failed", "cancelled"},
    "training": {"evaluating", "failed", "cancelled"},
    "evaluating": {"awaiting_approval", "failed"},
    "awaiting_approval": {"completed", "cancelled", "failed"},
    "completed": set(),
    "failed": set(),
    "cancelled": set(),
}

REJECTED_FIELDS = frozenset(
    {"command", "shell", "module", "path", "env", "branch", "argv", "python"}
)

VISITOR_DATASETS = frozenset({"visitor_level", "raw_events", "emails"})


@dataclass
class Job:
    job_id: str
    job_type: str
    state: str = "requested"
    dataset_label: str = "synthetic"
    candidate_model_id: str = ""
    failure_reason: str = ""
    claimed_by: str = ""
    history: list[str] = field(default_factory=lambda: ["requested"])


class RetrainingError(ValueError):
    pass


def assert_allowlisted(job_type: str, extra: dict[str, object] | None = None) -> str:
    if extra and REJECTED_FIELDS.intersection(extra):
        raise RetrainingError("arbitrary_command_rejected")
    if job_type not in ENTRYPOINTS:
        raise RetrainingError("job_type_not_allowlisted")
    return ENTRYPOINTS[job_type]


def dataset_allowed(
    job_type: str,
    dataset_label: str,
    *,
    export_enabled: bool,
) -> tuple[bool, str]:
    if dataset_label in VISITOR_DATASETS:
        return False, "visitor_export_forbidden"
    if dataset_label == "synthetic":
        return True, "synthetic"
    if job_type == "content_retrain" and dataset_label == "product_metadata":
        return True, "product_metadata"
    if job_type == "forecast_retrain" and dataset_label == "authorized_aggregate":
        if not export_enabled:
            return False, "export_gate"
        return True, "authorized_aggregate"
    if job_type in {"collaborative_retrain", "neural_retrain"} and dataset_label != "synthetic":
        return False, "authorized_export_required"
    if job_type == "hybrid_config_refresh" and dataset_label == "configuration":
        return True, "configuration"
    return False, "dataset_not_allowed"


def transition(job: Job, nxt: str, *, worker: str = "") -> Job:
    allowed = TRANSITIONS[job.state]
    if nxt not in allowed:
        raise RetrainingError("illegal_transition")
    if nxt == "completed":
        raise RetrainingError("completion_requires_approval_record")
    if nxt == "preparing" and not worker:
        raise RetrainingError("worker_identity_required")
    job.state = nxt
    if worker:
        job.claimed_by = worker
    job.history.append(nxt)
    return job


def finish_evaluation(job: Job, candidate_model_id: str) -> Job:
    """Training ends awaiting a person. It does not promote or serve the model."""

    transition(job, "awaiting_approval")
    job.candidate_model_id = candidate_model_id
    return job


def plan_job(
    job_type: str,
    *,
    dataset_label: str,
    export_enabled: bool,
    extra: dict[str, object] | None = None,
    execute: bool = False,
) -> dict[str, object]:
    entrypoint = assert_allowlisted(job_type, extra)
    allowed, reason = dataset_allowed(job_type, dataset_label, export_enabled=export_enabled)
    if not allowed:
        return {
            "executed": False,
            "entrypoint": entrypoint,
            "state": "failed",
            "reason": reason,
        }
    if execute:
        return {
            "executed": False,
            "entrypoint": entrypoint,
            "state": "failed",
            "reason": "automatic_execution_disabled",
        }
    return {
        "executed": False,
        "entrypoint": entrypoint,
        "state": "planned",
        "reason": reason,
    }


class JobQueue:
    def __init__(self) -> None:
        self.jobs: dict[str, Job] = {}

    def request(self, job_id: str, job_type: str, dataset_label: str) -> Job:
        assert_allowlisted(job_type)
        if job_id in self.jobs and self.jobs[job_id].state not in {
            "failed",
            "cancelled",
            "completed",
        }:
            raise RetrainingError("duplicate_request")
        job = Job(job_id=job_id, job_type=job_type, dataset_label=dataset_label)
        self.jobs[job_id] = job
        return job

    def claim(self, worker: str) -> Job | None:
        for job in self.jobs.values():
            if job.state == "authorized" and not job.claimed_by:
                transition(job, "preparing", worker=worker)
                return job
        return None
