import { NextResponse } from "next/server";
import { buildAssetLinks, parseSha256Fingerprints } from "@ecommerce/shared";

export function GET() {
  const links = buildAssetLinks(
    parseSha256Fingerprints(process.env.ANDROID_SHA256_CERT_FINGERPRINTS)
  );
  if (!links) {
    return NextResponse.json({ error: "not_configured" }, { status: 404 });
  }
  return NextResponse.json(links);
}
