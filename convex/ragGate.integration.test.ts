import { afterEach, expect, it, vi } from "vitest";
const providers = vi.hoisted(() => ({ embed: vi.fn(), generate: vi.fn() }));
vi.mock("./lib/rag/generate", () => ({ ragProviderConfigured: () => true, embedRagTexts: providers.embed, generateRagAnswer: providers.generate }));
import { ask } from "./rag";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it.each([
 { admin: "false", deployment: "true", index: 1 },
 { admin: "true", deployment: "false", index: 1 },
 { admin: "true", deployment: "true", index: 0 },
])("disabled/unready RAG reserves no budget and calls no provider: %j", async gates => {
 vi.stubEnv("RAG_SHOPPING_ASSISTANT_ENABLED", gates.deployment); vi.stubEnv("PYTHON_AI_SERVICE_URL", "https://python.example.invalid"); vi.stubEnv("PYTHON_AI_SERVICE_API_KEY", "synthetic-rag-gate-fixture-key");
 const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
 const ctx = { runQuery: vi.fn(async (_ref: unknown, args: {key?:string}) => args.key ? (args.key === "enable_rag_shopping_assistant" ? gates.admin : undefined) : {chunkCount:gates.index}), runMutation: vi.fn(), vectorSearch: vi.fn() };
 const result = await (ask as unknown as { _handler: (ctx: unknown, args: {question:string;sessionKey:string}) => Promise<{status:string}> })._handler(ctx,{question:"Fixture catalog question",sessionKey:"a".repeat(64)});
 expect(result.status).toBe("disabled"); expect(ctx.runMutation).not.toHaveBeenCalled(); expect(ctx.vectorSearch).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); expect(providers.embed).not.toHaveBeenCalled(); expect(providers.generate).not.toHaveBeenCalled();
});
