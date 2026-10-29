import { readLimitedText as readLimited } from "@/lib/limited-body";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { NextResponse } from "next/server";

type ChatRequestBody = {
  message?: string;
  previousChatId?: string;
};

type VapiChatOutput = {
  role?: string;
  content?: string;
  text?: string;
  message?: string;
};

function extractAssistantReply(output: VapiChatOutput[] | undefined): string {
  if (!output?.length) return "I couldn't generate a response. Please try again.";

  for (let i = output.length - 1; i >= 0; i -= 1) {
    const entry = output[i];
    const text = entry?.content ?? entry?.text ?? entry?.message;
    if (typeof text === "string" && text.trim()) {
      return text.trim();
    }
  }

  return "I couldn't generate a response. Please try again.";
}

let activeRequests = 0;

export async function POST(request: Request) {
  const apiKey = process.env.VAPI_API_KEY?.trim();
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID?.trim();
  if (!apiKey || !assistantId) return NextResponse.json({ error: "Chat unavailable" }, { status: 503 });
  if (activeRequests >= 2) return NextResponse.json({ error: "Chat busy" }, { status: 429 });
  activeRequests += 1;
  try {
    const raw = await readLimited(request, 4096);
    const body = JSON.parse(raw) as ChatRequestBody;
    if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 1000) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    const cookie = (request.headers.get("cookie") ?? "").split("; ").find(c => c.startsWith("vapi-session="))?.slice(13);
    let session: { guest: string; chatId?: string; expires: number } | undefined;
    if (cookie) {
      const [payload, signature] = cookie.split(".");
      const expected = createHmac("sha256", apiKey).update(payload).digest("hex");
      if (signature?.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
        if (parsed.expires > Date.now()) session = parsed;
      }
    }
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    if (!session) session = { guest: await client.mutation(api.guestIdentity.issue, {}), expires: Date.now() + 86_400_000 };
    if (body.previousChatId && body.previousChatId !== session.chatId) return NextResponse.json({ error: "Invalid conversation" }, { status: 403 });
    await client.mutation(api.aiUsage.reserve, { guest: session.guest, service: "vapi" });
    const response = await fetch("https://api.vapi.ai/chat", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ assistantId, input: body.message.trim(), ...(body.previousChatId ? { previousChatId: body.previousChatId } : {}) }),
    });
    if (!response.ok) return NextResponse.json({ error: "Chat provider unavailable" }, { status: 502 });
    const data = JSON.parse(await readLimited(response, 64_000)) as { id?: string; output?: VapiChatOutput[] };
    if (!data.id || data.id.length > 200) throw new Error("Invalid provider response");
    session.chatId = data.id;
    const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
    const signature = createHmac("sha256", apiKey).update(payload).digest("hex");
    const result = NextResponse.json({ chatId: data.id, reply: extractAssistantReply(data.output) });
    result.cookies.set("vapi-session", `${payload}.${signature}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 86400, path: "/api/vapi/chat" });
    return result;
  } catch { return NextResponse.json({ error: "Chat unavailable or usage limit reached" }, { status: 429 }); }
  finally { activeRequests -= 1; }
}
