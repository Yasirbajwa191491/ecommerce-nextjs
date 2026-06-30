import { NextRequest, NextResponse } from "next/server";
import { embedImage } from "@/lib/ai/image-embedding/service";
import { getProviderHealthSnapshot } from "@/lib/ai/image-embedding/health";

export const runtime = "nodejs";
export const maxDuration = 60;

function validateSecret(request: NextRequest): boolean {
  const secret = process.env.IMAGE_EMBED_API_SECRET?.trim();
  if (!secret) return true;
  const header = request.headers.get("x-image-embed-secret");
  return header === secret;
}

export async function POST(request: NextRequest) {
  if (!validateSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
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
    const message =
      error instanceof Error ? error.message : "Image embedding failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    providers: getProviderHealthSnapshot(),
  });
}
