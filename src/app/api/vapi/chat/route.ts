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

function isVapiBillingError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("payment method") ||
    lower.includes("card on file") ||
    lower.includes("pay-as-you-go")
  );
}

function formatBillingHelp(message: string): string {
  return `${message} You can add a card at https://dashboard.vapi.ai — or tap Voice call to use the assistant with your microphone instead.`;
}

export async function POST(request: Request) {
  const apiKey = process.env.VAPI_API_KEY?.trim();
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID?.trim();

  if (!apiKey || !assistantId) {
    return NextResponse.json(
      {
        error:
          "Text chat is not configured. Add VAPI_API_KEY to .env.local (same private key used for Convex).",
      },
      { status: 503 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const response = await fetch("https://api.vapi.ai/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistantId,
      input: message,
      ...(body.previousChatId ? { previousChatId: body.previousChatId } : {}),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    output?: VapiChatOutput[];
    message?: string;
    error?: string;
  };

  const apiError = data.message ?? data.error ?? "";

  if (!response.ok) {
    const errorMessage =
      apiError || "Unable to reach the shopping assistant. Please try again.";
    return NextResponse.json(
      {
        error: isVapiBillingError(errorMessage)
          ? formatBillingHelp(errorMessage)
          : errorMessage,
        billingRequired: isVapiBillingError(errorMessage),
      },
      { status: response.status }
    );
  }

  return NextResponse.json({
    chatId: data.id,
    reply: extractAssistantReply(data.output),
  });
}
