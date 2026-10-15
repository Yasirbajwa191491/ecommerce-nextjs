import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { bearerToken, catalogExportTokenMatches } from "./lib/catalogExportAuth";
import { toPublicBehavioralEvent } from "./lib/recommendations/behavioralExport";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authorize(request: Request): { salt: string } | Response {
  const expected = process.env.BEHAVIORAL_EXPORT_TOKEN;
  const salt = process.env.BEHAVIORAL_EXPORT_SALT;
  if (!expected || !salt) {
    return json({ error: "Behavioral export is not configured" }, 503);
  }
  const provided = bearerToken(request.headers.get("Authorization"));
  if (!catalogExportTokenMatches(provided, expected)) {
    return json({ error: "Unauthorized" }, 401);
  }
  return { salt };
}

async function tokenFor(value: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export const exportBehavioralEvents = httpAction(async (ctx, request) => {
  const authorized = authorize(request);
  if (authorized instanceof Response) return authorized;
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const cursor = url.searchParams.get("cursor");
  const limit = Number(url.searchParams.get("limit") ?? "50");
  if (kind !== "behavior" && kind !== "recommendation" && kind !== "purchase") {
    return json({ error: "Export kind is invalid" }, 400);
  }
  const pagination = {
    cursor: cursor && cursor.length > 0 ? cursor : null,
    limit,
  };
  try {
    const page =
      kind === "behavior"
        ? await ctx.runQuery(internal.pythonMlShadow.exportBehaviorPage, pagination)
        : kind === "recommendation"
          ? await ctx.runQuery(internal.pythonMlShadow.exportRecommendationPage, pagination)
          : await ctx.runQuery(internal.pythonMlShadow.exportPurchasePage, pagination);
    const publicPage = [];
    for (const event of page.events) {
      const visitorToken = await tokenFor(event.visitorSeed, authorized.salt);
      const orderToken = event.orderSeed
        ? await tokenFor(event.orderSeed, authorized.salt)
        : undefined;
      const eventId = await tokenFor(event.eventId, authorized.salt);
      publicPage.push(
        toPublicBehavioralEvent({
          eventId,
          eventType: event.eventType,
          productId: event.productId,
          visitorToken,
          occurredAt: event.occurredAt,
          placement: event.placement ?? undefined,
          orderToken,
          purchaseAuthoritative: event.purchaseAuthoritative,
        })
      );
    }
    return json({
      page: publicPage,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
      data_origin: "convex_export",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Behavioral export failed";
    return json({ error: message }, 400);
  }
});
