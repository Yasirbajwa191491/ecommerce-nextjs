# Agentic AI, tool orchestration, and human approval

Phase 8 adds an admin agent on top of the existing AI Business Copilot. It is off unless an administrator turns it on and the deployment gate is open. The copilot's existing question path is unchanged when Agent mode is off.

Synthetic evaluation scores in this document come from scripted tools and scripted planner output. They are not production performance.

## 1. What Agentic AI means

The agent accepts an admin request, chooses an allowlisted tool, reads the tool result, and decides the next step. Convex stores the run, the steps, and any approval. The language model proposes the next action. The server decides whether that action is permitted.

## 2. Difference between an LLM chatbot and an agent

The existing copilot sends stored business context to the model and returns one answer. The agent keeps a run record, calls one tool at a time, and can pause for approval. A chatbot reply is not treated as proof that a draft was saved.

## 3. Tool calling

`convex/lib/agents/nativeToolCall.ts` asks the existing provider chain for one decision. OpenAI, Groq, OpenRouter, Gemini, and Anthropic are asked for a native `emit_agent_decision` tool call. If that call fails, the same provider's `completeText` method must return JSON. The review worker has no native tool call and its text completion does not plan runs, so the chain continues. `AI_PROVIDER`, `AI_PROVIDER_CHAIN`, and `AI_WORKER_URL` are unchanged.

## 4. Tool registries

`convex/lib/agents/tools.ts` is the only list of callable tools. A name that is not in that list is rejected. High-risk names such as sending email, changing a price, changing stock, refunding, cancelling an order, or deleting a product are refused before any handler runs.

## 5. Planning

Each planner call sees the admin request and the previous tool summaries. The model returns `call_tool`, `replan`, or `finish`. The server validates that object before anything runs.

## 6. Observation

Tool results are summarized by the server. Text is size-limited, secrets are redacted, and instruction-like phrases are stripped. Those summaries are the evidence shown to the admin. They are also marked untrusted when they are sent back to the model.

## 7. Replanning

A `replan` decision updates the short plan summary and spends one of two replanning attempts. The next planner call then sees the observations collected so far.

## 8. Multi-step execution

One Convex action performs one planner call or one approved write, then schedules the next segment if the run is still active. A sales request can search products, read sales, read inventory, read a forecast, and only then ask to save a draft. If the forecast tool returns unavailable, the run can continue with the sales result and say the forecast was unavailable.

## 9. Agent state machines

Runs move through `created`, `planning`, `running`, `waiting_for_approval`, `resuming`, `completed`, `failed`, `cancelled`, and `expired`. Terminal states have no outgoing transitions. `convex/lib/agents/stateMachine.ts` is the source for those rules and for the execution lease.

## 10. Human-in-the-loop approval

Draft writes create an approval tied to the exact argument hash. An admin approves or rejects it. The lifecycle is `pending`, `approved`, `rejected`, `expired`, or `cancelled`. The model cannot mark an approval as granted. A second decision on the same approval is rejected. Approvals expire after four hours.

## 11. Idempotency

Draft creation uses an idempotency key of the run and the approval. A retry returns the existing campaign instead of inserting another. Read-only tools may retry once after a transient error. Approval decisions are single-use.

## 12. Authorization

Every public agent function calls `requireAdmin`. Run queries and approval decisions are limited to the admin who started the run. Tool handlers run inside the scheduled action, which reloads the stored run and rechecks the approval record before a draft insert. Storefront, RAG, and Vapi sessions do not receive these tools.

## 13. Prompt injection protection

User text, product copy, RAG excerpts, campaign content, and tool results are untrusted. Protection is the allowlist, argument validation, result sanitizing, permission checks, and the approval gate. Prompt wording is not the control.

## 14. Tool result validation

Arguments are checked against the tool definition before the handler is called. Results are reduced to a bounded JSON value. A demand-forecast result is labeled an estimate. A missing publication is an unavailable result, not a generated number.

## 15. Workflow recovery

Each segment takes a 30 second lease. A five-minute cron schedules another segment when a non-terminal run has an expired lease. It also expires runs and approvals that are past their deadlines. Two workers cannot both hold the lease. The cron does not recurse without bound; each pass reads a fixed page.

## 16. Audit logging

Starts, tool results, approval requests, approval decisions, draft creation, and failures append a short `agentAuditLogs` row. The row stores a summary, not the raw model prompt. Audit rows are deleted after seven days. Run context expires after 24 hours. Campaign drafts are ordinary email drafts and are not deleted by that cleanup.

## 17. Agent evaluation

`convex/lib/agents/evaluation.ts` runs 16 scripted scenarios: declining sales, high demand, inventory risk, unavailable forecast, draft creation, rejection, expiry, timeout, invalid arguments, a malicious tool result, an unauthorized caller, cancellation, a duplicate write, provider failure, a missing product, and insufficient sales history. The test asserts those scenarios. The score is synthetic.

## 18. Convex architecture

Convex owns sessions, state, permissions, approvals, audit rows, and metrics. Tables are `agentRuns`, `agentSteps`, `agentApprovals`, `agentAuditLogs`, and `agentMetrics`. `convex/agentActions.ts` is the only scheduled worker. `convex/agentData.ts` reads existing order aggregates, inventory insights, published forecasts, product search, campaigns, and RAG chunks.

## 19. Existing LLM provider integration

The agent uses `executeWithProviderChain` from `convex/lib/ai/providerChain.ts`. It does not register a new provider. Provider API keys stay in the existing environment variables.

## 20. AI Business Copilot integration

`/admin/ai-copilot` shows an Agent mode switch only when the agent gate is open. While the switch is off, the page still calls `askCopilot`. Questions such as "What happened this week?" keep the existing router and insight generation.

## 21. Marketing draft workflows

`create_marketing_campaign_draft` inserts an `emailCampaigns` row with status `draft`, zero recipients, and an idempotency key. It does not call the send action, change a price, or activate a promotion. The admin URL is `/admin/email-marketing/campaigns/{id}`. The existing campaign editor can open that draft. Selected product ids must already exist.

## 22. Feature flags

Admin settings, all defaulting to the safe value:

| Key | Default |
| --- | --- |
| `enable_agentic_ai` | `false` |
| `enable_agent_draft_creation` | `false` |
| `agent_max_tool_calls` | `8` (allowed range 1–12) |
| `agent_require_draft_approval` | `true` |

Draft approval stays required unless `AGENTIC_AI_ALLOW_UNAPPROVED_DRAFTS=true`. That variable is not set for Phase 8. Turning the approval setting off does not by itself allow an unapproved write.

## 23. Deployment prerequisites

Set these only when an operator is ready. Both default to off:

- `AGENTIC_AI_ENABLED=true`
- `AGENTIC_AI_DRAFT_WRITES_ENABLED=true` for draft creation
- An existing provider key on `AI_PROVIDER_CHAIN`
- Admin settings `enable_agentic_ai` and, for drafts, `enable_agent_draft_creation`
- Open `/admin/settings` once so missing system settings are inserted

Forecast and RAG tools also obey their own existing gates. A closed forecast gate returns an unavailable tool result. It does not block the rest of the run.

Server limits, independent of the model:

- 8 tool calls by default, hard cap 12
- 8 planner calls so each observation can inform the next decision
- 2 replans
- 30 seconds per segment and a 30 second lease
- 3 active runs per admin
- 10 KB per tool observation
- 24 hour run retention
- 8 second tool timeout, with one retry for an idempotent read after a transient error

## 24. Known limitations

- The agent cannot send email, change prices, change stock, refund, cancel orders, or delete products.
- Voice sessions are not connected to this orchestrator. That would need a separate authorization design.
- Customer RAG cannot see admin runs.
- The review worker cannot plan a run.
- Planner quality depends on the configured provider. The synthetic suite does not measure that.
- Browser verification of the admin screen was not run in this implementation pass.
- `npx convex codegen` uploaded to the configured dev deployment and then failed to replace `api.d.ts` because the file was locked. The module entries were added to the generated declaration file so TypeScript can see `api.agents`.

## Worked example

Request: "Analyze declining headphone sales and prepare a promotional campaign."

1. The admin starts a run. Convex checks the admin role, the setting, the deployment gate, and the provider chain.
2. The planner calls `search_products` for headphones. The result is a stored catalog match.
3. The next segment calls `get_sales_analytics` for 90 days. Revenue and units come from paid orders.
4. `get_inventory_insights` reports current stock and low-stock rows. Stock is not changed.
5. `get_demand_forecast` returns the published forecast, or `{ available: false, reason: "unpublished" }` when none exists. The run records that limitation and can continue.
6. The planner calls `create_marketing_campaign_draft` with a title, subject, body, product ids, and a promotion note that does not include a discount.
7. The run moves to `waiting_for_approval`. Nothing is inserted yet.
8. The same admin approves the stored arguments. A later segment inserts one draft and returns `/admin/email-marketing/campaigns/{id}`.
9. The final report lists verified tool summaries, labels recommendations as AI recommendations, and links the draft.

If the admin rejects the approval, the draft is not created and the run completes with that limitation.
