/**
 * Exports Vapi assistant prompt + tools from the Convex source of truth.
 * Used by scripts/setup-vapi-assistant.mjs
 */
import {
  VAPI_SYSTEM_PROMPT,
  VAPI_TOOL_DEFINITIONS,
} from "../convex/vapi/assistantConfig";

console.log(
  JSON.stringify({
    prompt: VAPI_SYSTEM_PROMPT,
    tools: VAPI_TOOL_DEFINITIONS,
  })
);
