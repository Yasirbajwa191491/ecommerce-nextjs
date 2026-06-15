const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type ImageBase64Part = {
  mimeType: string;
  data: string;
  url: string;
};

export async function fetchImageAsBase64(
  url: string
): Promise<ImageBase64Part | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(trimmed, { signal: controller.signal });
    if (!response.ok) return null;

    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      ?.trim()
      .toLowerCase();
    if (!contentType || !ALLOWED_MIME_TYPES.has(contentType)) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
      return null;
    }

    const data = Buffer.from(buffer).toString("base64");
    return { mimeType: contentType, data, url: trimmed };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchProductImagesAsBase64(
  urls: string[],
  maxImages = 8
): Promise<ImageBase64Part[]> {
  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))].slice(
    0,
    maxImages
  );

  const parts: ImageBase64Part[] = [];
  for (const url of unique) {
    const part = await fetchImageAsBase64(url);
    if (part) parts.push(part);
  }
  return parts;
}
