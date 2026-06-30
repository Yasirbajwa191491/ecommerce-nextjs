import { NextResponse } from "next/server";
import { getProviderHealthSnapshot } from "@/lib/ai/image-embedding/health";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    providers: getProviderHealthSnapshot(),
  });
}
