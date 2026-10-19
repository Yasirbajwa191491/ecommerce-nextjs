import type { ReviewAIProvider } from "../ai/types";
import {
  executeWithProviderChain,
  parseProviderChain,
  type ProviderAttemptLog,
} from "../ai/providerChain";
import { AGENT_DECISION_JSON_SCHEMA, parseAgentDecision } from "./llmDecision";
import type { PlannerDecision } from "./types";

const DECISION_TOOL_NAME = "emit_agent_decision";

export type AgentProviderResult = {
  decision: PlannerDecision;
  provider: string;
  model: string;
  usedNative: boolean;
  usedFallback: boolean;
  log: ProviderAttemptLog[];
};

export async function decideWithProvider(
  provider: ReviewAIProvider,
  system: string,
  user: string
): Promise<Omit<AgentProviderResult, "log">> {
  try {
    const native = await tryNativeDecision(provider, system, user);
    if (native) {
      const parsed = parseAgentDecision(native);
      if (!parsed.ok) throw new Error(parsed.error);
      return {
        decision: parsed.decision,
        provider: provider.name,
        model: provider.model,
        usedNative: true,
        usedFallback: false,
      };
    }
  } catch {
    // Native tool calling is optional. The same provider can still return JSON text.
  }
  if (!provider.completeText) {
    throw new Error(`${provider.name} cannot complete text`);
  }
  const raw = await provider.completeText(system, user);
  const parsed = parseAgentDecision(raw);
  if (!parsed.ok) throw new Error(parsed.error);
  return {
    decision: parsed.decision,
    provider: provider.name,
    model: provider.model,
    usedNative: false,
    usedFallback: true,
  };
}

export async function requestAgentDecision(input: {
  system: string;
  user: string;
  chain?: ReturnType<typeof parseProviderChain>;
}): Promise<AgentProviderResult> {
  const chain = input.chain ?? parseProviderChain();
  const executed = await executeWithProviderChain(chain, async (provider) =>
    decideWithProvider(provider, input.system, input.user)
  );
  return { ...executed.result, log: executed.log };
}

async function tryNativeDecision(
  provider: ReviewAIProvider,
  system: string,
  user: string
): Promise<string | null> {
  if (provider.name === "remote") return null;
  const model = provider.model;
  if (provider.name === "openai" || provider.name === "groq" || provider.name === "openrouter") {
    return await openAiStyleDecision(provider.name, model, system, user);
  }
  if (provider.name === "gemini") return await geminiDecision(model, system, user);
  if (provider.name === "anthropic") return await anthropicDecision(model, system, user);
  return null;
}

function endpoint(name: "openai" | "groq" | "openrouter"): { url: string; apiKey: string } {
  if (name === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    return { url: "https://api.openai.com/v1/chat/completions", apiKey };
  }
  if (name === "groq") {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");
    return { url: "https://api.groq.com/openai/v1/chat/completions", apiKey };
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  return { url: "https://openrouter.ai/api/v1/chat/completions", apiKey };
}

async function openAiStyleDecision(
  name: "openai" | "groq" | "openrouter",
  model: string,
  system: string,
  user: string
): Promise<string> {
  const target = endpoint(name);
  const response = await fetch(target.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${target.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: DECISION_TOOL_NAME,
            description: "Choose the next bounded agent action.",
            parameters: AGENT_DECISION_JSON_SCHEMA,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: DECISION_TOOL_NAME } },
    }),
  });
  if (!response.ok) throw new Error(`Native tool call failed (${response.status})`);
  const data = (await response.json()) as {
    choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
  };
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("Native tool call returned no arguments");
  return args;
}

async function geminiDecision(model: string, system: string, user: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        tools: [
          {
            functionDeclarations: [
              {
                name: DECISION_TOOL_NAME,
                description: "Choose the next bounded agent action.",
                parameters: AGENT_DECISION_JSON_SCHEMA,
              },
            ],
          },
        ],
        toolConfig: {
          functionCallingConfig: { mode: "ANY", allowedFunctionNames: [DECISION_TOOL_NAME] },
        },
      }),
    }
  );
  if (!response.ok) throw new Error(`Gemini tool call failed (${response.status})`);
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ functionCall?: { args?: unknown } }> } }>;
  };
  const args = data.candidates?.[0]?.content?.parts?.find((part) => part.functionCall)?.functionCall?.args;
  if (!args) throw new Error("Gemini tool call returned no arguments");
  return JSON.stringify(args);
}

async function anthropicDecision(model: string, system: string, user: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      system,
      tools: [
        {
          name: DECISION_TOOL_NAME,
          description: "Choose the next bounded agent action.",
          input_schema: AGENT_DECISION_JSON_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: DECISION_TOOL_NAME },
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!response.ok) throw new Error(`Anthropic tool call failed (${response.status})`);
  const data = (await response.json()) as {
    content?: Array<{ type?: string; input?: unknown }>;
  };
  const input = data.content?.find((block) => block.type === "tool_use")?.input;
  if (!input) throw new Error("Anthropic tool call returned no input");
  return JSON.stringify(input);
}
