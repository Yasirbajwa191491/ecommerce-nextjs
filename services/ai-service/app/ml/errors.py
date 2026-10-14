"""Expected machine-learning failures with messages safe to show on a CLI."""


class MachineLearningError(Exception):
    """A pipeline failure whose message does not include a stack trace."""


class DatasetValidationError(MachineLearningError):
    """The dataset file could not be read."""


class TrainingError(MachineLearningError):
    """Fitting could not produce a usable model."""


class UnknownProductError(MachineLearningError):
    """The requested product is not in the fitted catalog."""

    def __init__(self, product_id: str) -> None:
        self.product_id = product_id
        super().__init__(f"Unknown product id: {product_id}")


class ArtifactError(MachineLearningError):
    """A model artifact is missing, incomplete, or failed its integrity checks."""


class IncompatibleArtifactError(ArtifactError):
    """The artifact was produced by a different model or library generation."""
