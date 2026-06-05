import { NextResponse } from "next/server";
import { fetchAuthQuery } from "@/lib/auth-server";
import {
  RESEND_FROM_ENV_KEY,
  updateConvexEnvironmentVariable,
} from "@/lib/convex-env-sync";
import { api } from "../../../../../convex/_generated/api";

const EMAIL_FROM_PLAIN_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_FROM_DISPLAY_REGEX = /^.+\s<[^\s<>]+@[^\s<>]+\.[^\s<>]+>$/;

function isValidEmailFrom(value: string) {
  const trimmed = value.trim();
  return (
    EMAIL_FROM_DISPLAY_REGEX.test(trimmed) ||
    EMAIL_FROM_PLAIN_REGEX.test(trimmed)
  );
}

export async function POST(request: Request) {
  const session = await fetchAuthQuery(api.auth.getSessionInfo, {});
  if (!session?.authenticated || !session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const value =
    typeof body === "object" &&
    body !== null &&
    "value" in body &&
    typeof (body as { value: unknown }).value === "string"
      ? (body as { value: string }).value.trim()
      : "";

  if (!value) {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }

  if (!isValidEmailFrom(value)) {
    return NextResponse.json(
      {
        error:
          'Use an email (you@domain.com) or "Store Name <you@domain.com>"',
      },
      { status: 400 }
    );
  }

  const result = await updateConvexEnvironmentVariable(
    RESEND_FROM_ENV_KEY,
    value
  );

  if (!result.synced) {
    if (result.reason === "missing_deploy_key") {
      return NextResponse.json(
        {
          error:
            "CONVEX_DEPLOY_KEY is not set in .env.local. Run: npx convex deployment token create local-dev --save-env",
          reason: result.reason,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to update Convex environment variable",
        reason: result.reason,
        details: result.message,
        status: result.status,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ synced: true });
}
