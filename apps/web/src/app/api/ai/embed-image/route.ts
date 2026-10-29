import { readLimitedText } from "@/lib/limited-body";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { embedImage } from "@/lib/ai/image-embedding/service";
import { getProviderHealthSnapshot } from "@/lib/ai/image-embedding/health";

export const runtime = "nodejs";
export const maxDuration = 60;

function validateSecret(request: NextRequest): boolean {
  const secret = process.env.IMAGE_EMBED_API_SECRET?.trim();
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get("x-image-embed-secret");
  return Boolean(header && Buffer.byteLength(header) === Buffer.byteLength(secret) && timingSafeEqual(Buffer.from(header), Buffer.from(secret)));
}

export async function POST(request: NextRequest) {
  if (!validateSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (Number(request.headers.get("content-length") ?? 0) > 7_100_000) return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const body = JSON.parse(await readLimitedText(request, 7_100_000)) as {
      imageUrl?: string;
      imageBase64?: string;
      mimeType?: string;
      preferredProvider?: "siglip" | "clip";
    };

    const result = await embedImage({
      imageUrl: body.imageUrl,
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
      preferredProvider: body.preferredProvider,
    });

    return NextResponse.json(result);
  } catch (error) {
    void error;
    const message = "Image embedding unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    providers: getProviderHealthSnapshot(),
  });
}
