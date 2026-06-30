import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sharedCore = readFileSync(
  join(root, "lib/generate-product-content.js"),
  "utf8"
);

const wf07Header = `function extractPayload(input) {
  if (!input || typeof input !== "object") return {};
  if (input.requestId) return input;
  const envelope = input.body && typeof input.body === "object" ? input.body : input;
  if (envelope.requestId) return envelope;
  if (envelope.body && typeof envelope.body === "object" && envelope.body.requestId) {
    return envelope.body;
  }
  return envelope;
}

const input = $input.first()?.json ?? {};
const body = extractPayload(input);
const requestId = body.requestId;
const mode = body.mode || "description";
const context = body.context || {};
if (!requestId) {
  const keys = Object.keys(input).join(", ") || "(empty input)";
  throw new Error(
    "requestId required. Use Manual Test Trigger in workflow 07, or run via workflow 01. Received: " + keys
  );
}
`;

const wf01Header = `const body = $input.first()?.json ?? {};
const requestId = body.requestId;
const mode = body.mode || "description";
const context = body.context || {};
if (!requestId) {
  throw new Error("requestId missing after Normalize Product Content");
}
`;

const footer = `
const outcome = await runProductContentGeneration.call(this, requestId, mode, context);
return [{ json: outcome }];
`;

const wf07Code = wf07Header + sharedCore + footer;
const wf01Code = wf01Header + sharedCore + footer;

const testPayloadCode = `return [{
  json: {
    requestId: 'manual-test-' + Date.now(),
    mode: 'description',
    context: {
      name: 'Wireless Headphones',
      company: 'Acme',
      categoryName: 'Electronics',
      price: 79.99,
      currency: 'USD',
      colors: ['Black'],
      imageUrls: [],
    },
  },
}];`;

const wf07 = {
  name: "Product AI - Content Generation",
  nodes: [
    {
      parameters: {},
      id: "manual-trigger",
      name: "Manual Test Trigger",
      type: "n8n-nodes-base.manualTrigger",
      typeVersion: 1,
      position: [240, 120],
    },
    {
      parameters: { jsCode: testPayloadCode },
      id: "set-test-payload",
      name: "Set Test Payload",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [400, 120],
    },
    {
      parameters: { inputSource: "passthrough" },
      id: "execute-trigger",
      name: "Execute Workflow Trigger",
      type: "n8n-nodes-base.executeWorkflowTrigger",
      typeVersion: 1.1,
      position: [240, 420],
    },
    {
      parameters: { jsCode: wf07Code },
      id: "generate-product-content",
      name: "Generate Product Content",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [640, 300],
    },
  ],
  connections: {
    "Manual Test Trigger": {
      main: [[{ node: "Set Test Payload", type: "main", index: 0 }]],
    },
    "Set Test Payload": {
      main: [[{ node: "Generate Product Content", type: "main", index: 0 }]],
    },
    "Execute Workflow Trigger": {
      main: [[{ node: "Generate Product Content", type: "main", index: 0 }]],
    },
  },
  active: false,
  settings: { executionOrder: "v1" },
  meta: { templateCredsSetupCompleted: true },
};

writeFileSync(
  join(root, "workflows/07-product-content-generation.json"),
  JSON.stringify(wf07, null, 2)
);

const wf01 = JSON.parse(
  readFileSync(join(root, "workflows/01-review-event-router.json"), "utf8")
);

wf01.nodes = wf01.nodes.filter((n) => n.id !== "generate-product-content-inline");
wf01.nodes.push({
  parameters: { jsCode: wf01Code },
  id: "generate-product-content-inline",
  name: "Generate Product Content",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [1000, 760],
});

wf01.connections["Normalize Product Content"] = {
  main: [[{ node: "Generate Product Content", type: "main", index: 0 }]],
};

writeFileSync(
  join(root, "workflows/01-review-event-router.json"),
  JSON.stringify(wf01, null, 2)
);

console.log("Synced product content workflows from n8n/lib/generate-product-content.js");
