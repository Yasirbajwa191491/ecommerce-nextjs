import { getSiteUrl } from "../siteUrl";

export type ImageEmbedApiResponse = {
  embedding: number[];
  provider: "siglip" | "clip";
  model: string;
  dimensions: number;
};
function getEmbedSecret(): string | undefined {
  return process.env.IMAGE_EMBED_API_SECRET?.trim() || undefined;
}

export async function callImageEmbedApi(args: {
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
  preferredProvider?: "siglip" | "clip";
}): Promise<ImageEmbedApiResponse> {
  const baseUrl = getSiteUrl().replace(/\/$/, "");
  const secret = getEmbedSecret();

  const response = await fetch(`${baseUrl}/api/ai/embed-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "X-Image-Embed-Secret": secret } : {}),
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Image embed API failed (${response.status}): ${text || response.statusText}`
    );
  }

  return (await response.json()) as ImageEmbedApiResponse;
}

export async function checkImageEmbedApiHealth(): Promise<boolean> {
  try {
    const baseUrl = getSiteUrl().replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/api/ai/embed-image/health`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}
