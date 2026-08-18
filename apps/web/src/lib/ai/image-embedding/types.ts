export type ImageEmbeddingProvider = "siglip" | "clip";

export type ImageEmbeddingResult = {
  embedding: number[];
  provider: ImageEmbeddingProvider;
  model: string;
  dimensions: number;
};

export type ImageEmbedRequest = {
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
  preferredProvider?: ImageEmbeddingProvider;
};

export type ProviderHealthState = {
  provider: ImageEmbeddingProvider;
  status: "healthy" | "degraded" | "down";
  consecutiveFailures: number;
  lastSuccessAt?: number;
  lastFailureAt?: number;
};
