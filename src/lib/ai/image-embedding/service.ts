import {
  CLIP_MODEL_DEFAULT,
  IMAGE_EMBEDDING_CLIP_DIMENSIONS,
  IMAGE_EMBEDDING_SIGLIP_DIMENSIONS,
  SIGLIP_MODEL_DEFAULT,
} from "./constants";
import {
  isProviderAvailable,
  recordProviderFailure,
  recordProviderSuccess,
} from "./health";
import type {
  ImageEmbedRequest,
  ImageEmbeddingProvider,
  ImageEmbeddingResult,
} from "./types";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;

type FeatureExtractor = (
  input: unknown,
  options?: { pooling?: string; normalize?: boolean }
) => Promise<{ data: Float32Array | number[] }>;

type PipelineModule = {
  pipeline: (
    task: string,
    model: string,
    options?: { quantized?: boolean }
  ) => Promise<FeatureExtractor>;
  RawImage: {
    read: (source: string | Blob | Buffer) => Promise<unknown>;
    fromBlob: (blob: Blob) => Promise<unknown>;
  };
};

let transformersModule: PipelineModule | null = null;
const extractorCache = new Map<string, FeatureExtractor>();

async function getTransformers(): Promise<PipelineModule> {
  if (!transformersModule) {
    transformersModule = (await import("@xenova/transformers")) as PipelineModule;
  }
  return transformersModule;
}

async function getExtractor(model: string): Promise<FeatureExtractor> {
  const cached = extractorCache.get(model);
  if (cached) return cached;

  const { pipeline } = await getTransformers();
  const extractor = await pipeline("image-feature-extraction", model, {
    quantized: true,
  });
  extractorCache.set(model, extractor);
  return extractor;
}

function normalizeVector(values: Float32Array | number[]): number[] {
  const arr = Array.from(values);
  let sumSq = 0;
  for (const v of arr) sumSq += v * v;
  const norm = Math.sqrt(sumSq) || 1;
  return arr.map((v) => v / norm);
}

async function loadImage(
  request: ImageEmbedRequest
): Promise<unknown> {
  const { RawImage } = await getTransformers();

  if (request.imageBase64) {
    const mime = request.mimeType ?? "image/jpeg";
    const binary = Buffer.from(request.imageBase64, "base64");
    if (binary.byteLength === 0 || binary.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Image size is invalid");
    }
    const blob = new Blob([binary], { type: mime });
    return RawImage.fromBlob(blob);
  }

  if (request.imageUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(request.imageUrl, { signal: controller.signal });
      if (!response.ok) throw new Error("Failed to fetch image");
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
        throw new Error("Image size is invalid");
      }
      const contentType =
        response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
      const blob = new Blob([buffer], { type: contentType });
      return RawImage.fromBlob(blob);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("imageUrl or imageBase64 is required");
}

async function embedWithProvider(
  provider: ImageEmbeddingProvider,
  image: unknown
): Promise<ImageEmbeddingResult> {
  const model =
    provider === "siglip"
      ? (process.env.SIGLIP_MODEL ?? SIGLIP_MODEL_DEFAULT)
      : (process.env.CLIP_MODEL ?? CLIP_MODEL_DEFAULT);
  const dimensions =
    provider === "siglip"
      ? IMAGE_EMBEDDING_SIGLIP_DIMENSIONS
      : IMAGE_EMBEDDING_CLIP_DIMENSIONS;

  const extractor = await getExtractor(model);
  const output = await extractor(image, { pooling: "mean", normalize: true });
  const embedding = normalizeVector(output.data);

  if (embedding.length !== dimensions) {
    throw new Error(
      `Unexpected embedding dimensions: ${embedding.length} (expected ${dimensions})`
    );
  }

  recordProviderSuccess(provider);
  return { embedding, provider, model, dimensions };
}

export async function embedImage(
  request: ImageEmbedRequest
): Promise<ImageEmbeddingResult> {
  const image = await loadImage(request);
  const order: ImageEmbeddingProvider[] =
    request.preferredProvider === "clip"
      ? ["clip", "siglip"]
      : ["siglip", "clip"];

  let lastError: Error | null = null;

  for (const provider of order) {
    if (!isProviderAvailable(provider)) continue;
    try {
      return await embedWithProvider(provider, image);
    } catch (error) {
      recordProviderFailure(provider);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("All image embedding providers failed");
}
