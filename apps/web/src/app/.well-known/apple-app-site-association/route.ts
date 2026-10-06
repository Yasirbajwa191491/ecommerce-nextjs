import { NextResponse } from "next/server";
import { buildAppleAppSiteAssociation } from "@ecommerce/shared";

export function GET() {
  const association = buildAppleAppSiteAssociation(process.env.APPLE_TEAM_ID);
  if (!association) {
    return NextResponse.json({ error: "not_configured" }, { status: 404 });
  }
  return NextResponse.json(association);
}
