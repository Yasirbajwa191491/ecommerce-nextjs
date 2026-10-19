"""RAG request and document contracts.

Customer retrieval never accepts filesystem paths or credentials.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SourceType = Literal[
    "product",
    "shipping_policy",
    "return_policy",
    "privacy_policy",
    "terms",
    "faq",
]
RetrievalStrategy = Literal["semantic", "keyword", "hybrid"]
IntentName = Literal[
    "product_discovery",
    "product_comparison",
    "product_specifications",
    "warranty",
    "shipping_policy",
    "return_policy",
    "product_availability",
    "general_shopping",
]
GroundingMode = Literal["strict", "standard"]

INDEX_VERSION = "rag-v1"
EMBEDDING_DIMENSIONS = 384
HASHING_EMBEDDING_VERSION = "hashing-384-v1"
MAX_QUERY_CHARS = 500
MAX_TOP_K = 10
DEFAULT_TOP_K = 5
DEFAULT_CHUNK_SIZE = 700
DEFAULT_CHUNK_OVERLAP = 80


class ProductSource(BaseModel):
    model_config = ConfigDict(extra="ignore")

    source_id: str = Field(min_length=1, max_length=128)
    name: str = Field(min_length=1, max_length=200)
    brand: str = Field(default="", max_length=120)
    category: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=8000)
    highlights: list[str] = Field(default_factory=list, max_length=20)
    specifications: list[str] = Field(default_factory=list, max_length=40)
    warranty: str = Field(default="", max_length=2000)
    delivery_options: list[str] = Field(default_factory=list, max_length=12)
    active: bool = True


class PolicySource(BaseModel):
    model_config = ConfigDict(extra="ignore")

    source_type: Literal["shipping_policy", "return_policy", "privacy_policy", "terms"]
    source_id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=160)
    content: str = Field(min_length=1, max_length=20000)
    active: bool = True


class FaqSource(BaseModel):
    model_config = ConfigDict(extra="ignore")

    source_id: str = Field(min_length=1, max_length=80)
    question: str = Field(min_length=1, max_length=300)
    answer: str = Field(min_length=1, max_length=2000)
    active: bool = True


class RagDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_id: str
    source_type: SourceType
    source_id: str
    title: str
    content: str
    metadata: dict[str, str]
    content_hash: str
    updated_at: str
    visibility: Literal["public"]
    embedding_version: str = ""
    product_id: str | None = None


class RagChunk(BaseModel):
    model_config = ConfigDict(extra="forbid")

    chunk_id: str
    document_id: str
    source_type: SourceType
    source_id: str
    product_id: str | None = None
    title: str
    section: str
    content: str
    metadata: dict[str, str]
    content_hash: str
    visibility: Literal["public"]
    embedding_version: str = ""
    embedding: list[float] = Field(default_factory=list)


class ProductFact(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: str = Field(min_length=1, max_length=128)
    name: str = Field(default="", max_length=200)
    currency: str = Field(default="USD", max_length=8)
    price: float | None = None
    final_price: float | None = None
    discount_percent: float | None = None
    stock: int | None = Field(default=None, ge=0, le=1_000_000)
    available: bool = False


class ConversationTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    text: str = Field(max_length=500)
    product_ids: list[str] = Field(default_factory=list, max_length=8)


class RetrievalFilters(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_types: list[SourceType] = Field(default_factory=list, max_length=6)
    category: str = Field(default="", max_length=120)
    brand: str = Field(default="", max_length=120)
    product_ids: list[str] = Field(default_factory=list, max_length=8)
    available_only: bool = False


class CandidateChunk(BaseModel):
    """A hit already retrieved by Convex vector or keyword search."""

    model_config = ConfigDict(extra="ignore")

    chunk_id: str = Field(min_length=1, max_length=180)
    document_id: str = Field(min_length=1, max_length=180)
    source_type: SourceType
    source_id: str = Field(min_length=1, max_length=128)
    product_id: str | None = None
    title: str = Field(max_length=200)
    section: str = Field(default="", max_length=160)
    content: str = Field(max_length=4000)
    metadata: dict[str, str] = Field(default_factory=dict)
    score: float = 0


class IndexRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    products: list[ProductSource] = Field(default_factory=list, max_length=25)
    policies: list[PolicySource] = Field(default_factory=list, max_length=8)
    faqs: list[FaqSource] = Field(default_factory=list, max_length=20)
    embedding_mode: Literal["hashing", "provided"] = "hashing"
    embedding_version: str = Field(default="", max_length=80)
    chunk_embeddings: dict[str, list[float]] = Field(default_factory=dict)
    prune_document_ids: list[str] = Field(default_factory=list, max_length=50)
    chunk_size: int = Field(default=DEFAULT_CHUNK_SIZE, ge=200, le=2000)
    chunk_overlap: int = Field(default=DEFAULT_CHUNK_OVERLAP, ge=0, le=400)


class PrepareRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    products: list[ProductSource] = Field(default_factory=list, max_length=25)
    policies: list[PolicySource] = Field(default_factory=list, max_length=8)
    faqs: list[FaqSource] = Field(default_factory=list, max_length=20)
    chunk_size: int = Field(default=DEFAULT_CHUNK_SIZE, ge=200, le=2000)
    chunk_overlap: int = Field(default=DEFAULT_CHUNK_OVERLAP, ge=0, le=400)


class RetrieveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=MAX_QUERY_CHARS)
    strategy: RetrievalStrategy = "hybrid"
    top_k: int = Field(default=DEFAULT_TOP_K, ge=1, le=MAX_TOP_K)
    filters: RetrievalFilters = Field(default_factory=RetrievalFilters)
    conversation: list[ConversationTurn] = Field(default_factory=list, max_length=6)
    current_facts: list[ProductFact] = Field(default_factory=list, max_length=20)
    semantic_candidates: list[CandidateChunk] = Field(default_factory=list, max_length=20)
    keyword_candidates: list[CandidateChunk] = Field(default_factory=list, max_length=20)
    expected_index_version: str = Field(default="", max_length=40)
    max_context_tokens: int = Field(default=1200, ge=200, le=4000)
    grounding: GroundingMode = "strict"


class EvaluateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dataset: Literal["synthetic"] = "synthetic"
    k: int = Field(default=5, ge=1, le=MAX_TOP_K)
    llm_judge: bool = False


class Citation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_type: SourceType
    source_id: str
    product_id: str | None = None
    title: str
    section: str
    url: str
    chunk_id: str


class PromptPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    system: str
    user: str
