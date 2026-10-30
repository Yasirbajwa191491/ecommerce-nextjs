import { downloadImage, validateImageBytes } from "./secure-input";
import sharp from "sharp";
import path from "node:path";
import { IMAGE_EMBEDDING_VERSION } from "@convex/lib/ai/constants";
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

type FeatureExtractor = (
  input: unknown,
  options?: { pool?: boolean }
) => Promise<{ data: Float32Array | number[] }>;

type PipelineModule = {
  pipeline: (
    task: string,
    model: string,
    options?: { dtype: "q8"; device: "cpu"; local_files_only: true }
  ) => Promise<FeatureExtractor>;
  env: { allowRemoteModels: boolean; allowLocalModels: boolean; localModelPath: string };
  RawImage: {
    read: (source: string | Blob | Buffer) => Promise<unknown>;
    fromBlob: (blob: Blob) => Promise<unknown>;
  };
};

export function createImageEmbeddingService(
  loadTransformers: () => Promise<PipelineModule> = async () =>
    (await import("@huggingface/transformers")) as unknown as PipelineModule
) {
  let transformersModule: PipelineModule | null = null;
  const extractorCache = new Map<string, Promise<FeatureExtractor>>();

  async function getTransformers(): Promise<PipelineModule> {
    if (!transformersModule) {
      transformersModule = await loadTransformers();
    }
    transformersModule.env.allowRemoteModels = false;
    transformersModule.env.allowLocalModels = true;
    transformersModule.env.localModelPath = path.resolve(process.env.AI_MODEL_ROOT ?? "models") + path.sep;
    return transformersModule;
  }

  async function getExtractor(model: string): Promise<FeatureExtractor> {
    const cached = extractorCache.get(model);
    if (cached) return cached;

    const { pipeline } = await getTransformers();
    const initializedWhileImporting = extractorCache.get(model);
    if (initializedWhileImporting) return initializedWhileImporting;
    const pending = pipeline("image-feature-extraction", model, { dtype: "q8", device: "cpu", local_files_only: true });
    extractorCache.set(model, pending);
    try { return await pending; } catch (error) { extractorCache.delete(model); throw error; }
  }

  function normalizeVector(values: Float32Array | number[]): number[] {
    const arr = Array.from(values);
    let sumSq = 0;
    for (const v of arr) sumSq += v * v;
    const norm = Math.sqrt(sumSq);
    if (!Number.isFinite(norm) || norm === 0 || arr.some(v => !Number.isFinite(v))) throw new Error("Invalid embedding output");
    return arr.map((v) => v / norm);
  }

  async function loadImage(
    request: ImageEmbedRequest
  ): Promise<unknown> {
    const { RawImage } = await getTransformers();

    if (request.imageBase64) {
      const mime = request.mimeType ?? "image/jpeg";
      if (request.imageBase64.length > 7_000_000) throw new Error("Image too large");
      const binary = Buffer.from(request.imageBase64, "base64");
      if (binary.byteLength === 0 || binary.byteLength > MAX_IMAGE_BYTES) {
        throw new Error("Image size is invalid");
      }
      validateImageBytes(binary, mime);
      await sharp(binary, { limitInputPixels: 16_000_000 }).metadata();
      const blob = new Blob([binary], { type: mime });
      return RawImage.fromBlob(blob);
    }

    if (request.imageUrl) {
      const { bytes, mime } = await downloadImage(request.imageUrl);
      await sharp(bytes, { limitInputPixels: 16_000_000 }).metadata();
      return RawImage.fromBlob(new Blob([new Uint8Array(bytes)], { type: mime }));
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

    const approvedModel = provider === "siglip" ? SIGLIP_MODEL_DEFAULT : CLIP_MODEL_DEFAULT;
    if (model !== approvedModel) throw new Error("Model change requires a new embedding contract");
    const extractor = await getExtractor(model);
    const output = await extractor(image, { pool: provider === "siglip" });
    const embedding = normalizeVector(output.data);

    if (embedding.length !== dimensions) {
      throw new Error(
        `Unexpected embedding dimensions: ${embedding.length} (expected ${dimensions})`
      );
    }

    recordProviderSuccess(provider);
    return { embedding, provider, model, dimensions, version: IMAGE_EMBEDDING_VERSION };
  }

  let inferenceCount = 0;

  async function embedImageImpl(
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

  async function embedImage(request: ImageEmbedRequest): Promise<ImageEmbeddingResult> {
    if (inferenceCount >= 2) throw new Error("Image service is busy");
    inferenceCount++;
    // A response deadline cannot cancel native inference. Keep the slot until work settles.
    const pending = embedImageImpl(request).finally(() => { inferenceCount--; });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([pending, new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Image inference timeout")), 30_000);
      })]);
    } finally { if (timer) clearTimeout(timer); }
  }

  return embedImage;
}

export const embedImage = createImageEmbeddingService();
