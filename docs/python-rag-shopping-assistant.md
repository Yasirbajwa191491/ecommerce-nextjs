# RAG shopping assistant

Phase 5 adds a retrieval-augmented shopping assistant. It is **implemented and tested** behind two off-by-default gates. It does not replace semantic search, recommendations, the Vapi voice assistant, or the existing LLM provider chain.

Synthetic retrieval numbers in this document come from the hashing embedder used by the offline evaluator. They are **not** production-quality scores.

## 1. What RAG means

Retrieval-augmented generation answers a shopper question from store records that were retrieved for that question, then asks a language model to write the reply from those records.

## 2. How this differs from ordinary prompting

An ordinary prompt asks the model to answer from its training data. This assistant puts catalog and policy excerpts in the user message and tells the model those excerpts are the only source for store facts. Price and stock are added from Convex at request time, not from the model's memory and not from the stored vectors.

## 3. What embeddings are

An embedding is a list of 384 numbers that represents a chunk of text. Similar wording lands closer together. The width matches the existing product search index (`EMBEDDING_DIMENSIONS` in `convex/lib/ai/constants.ts`), which was chosen for Xenova/all-MiniLM-L6-v2 and for the current Gemini and OpenAI embedding calls.

## 4. What vector search does

Vector search finds chunks whose embeddings are nearest to the question embedding. Convex stores those vectors on `ragChunks.by_embedding`.

## 5. What keyword search does

Keyword search uses the Convex search index `ragChunks.search_content`, then BM25 inside the Python service when it is ranking a local evaluation index. It rewards shared words such as "return" or "battery".

## 6. What hybrid retrieval means

Hybrid retrieval keeps a keyword ranking and a semantic ranking, then combines them with reciprocal rank fusion: each list adds `1 / (60 + rank)`. The raw scores are not added together.

Admin setting `rag_retrieval_strategy`:

| Value | Behavior |
| --- | --- |
| `hybrid` | Default. Fuses keyword and semantic rankings. |
| `semantic` | Uses the vector ranking only. |
| `keyword` | Uses the keyword ranking only. |

## 7. What chunking is

Long policies are split into overlapping windows. Product specification lines stay in one chunk when they fit. Each chunk keeps the section heading, the source id, and a stable id derived from the document id, heading, and text.

## 8. How documents are indexed

Convex is the source of truth. An admin action exports eligible products, the shipping, return, privacy, and terms settings, and the existing store FAQ from `convex/lib/storeGuideContent.ts`. Python normalizes and chunks them. Convex embeds changed chunks with the existing provider chain and sends those vectors back. Unpublished products are left out. Price and stock are not written into the chunk text.

The Python artifact is `artifacts/rag/index-v1.json`. Convex also stores the same public chunks so vector search can run inside an action. A separate table is required because `products.embedding` is the live catalog-search vector. Writing policy chunks there would change search results.

## 9. How context is assembled

The retriever keeps at most the configured number of chunks (1–10, default 5) inside a token budget estimated as characters divided by 4. Duplicate text is dropped. Each chunk is wrapped as `<untrusted_source>`. Current price and stock are listed separately and labeled authoritative.

## 10. How the LLM generates the answer

Python returns a system prompt and a user message. Convex calls `completeText` on the existing provider chain (`AI_PROVIDER_CHAIN`, default `gemini,groq,openrouter,openai`). Python does not receive provider API keys. The review worker cannot complete these answers and the chain continues to the next configured provider.

## 11. How citations are validated

The model must return JSON `citation_ids`. Ids that were not in the retrieved set are dropped. Product links are `/product/{id}`. Policy links are `/shipping`, `/return`, `/privacy`, and `/terms`. Other URLs are discarded.

## 12. How hallucinations are reduced

Grounding checks citations, currency amounts against the current Convex price, and "in stock" / "out of stock" against current stock. These checks catch specific contradictions. They do not prove an answer is free of every unsupported sentence.

`rag_grounding_enforcement`:

- `strict` (default): any failed citation, price, stock, or safety check replaces the whole answer with a fallback and returns no citations.
- `standard`: invalid citations are dropped. Unsafe text and contradicted price or stock claims still use the fallback.

## 13. How prompt injection is handled

Retrieved text is data in the user message, not part of the system prompt. Answers that repeat instruction-override text, API-key shapes, or claims that an order was placed are rejected. Retrieved documents cannot call tools or start checkout.

## 14. How Convex and Python communicate

Convex actions call `POST /api/v1/internal/rag/prepare`, `/index`, and `/retrieve` with `PYTHON_AI_SERVICE_URL` and `PYTHON_AI_SERVICE_API_KEY`. Queries and mutations do not call Python. The browser and the Expo app call only the Convex `rag.ask` action.

## 15. How existing LLM providers are reused

`convex/lib/rag/generate.ts` uses `parseProviderChain` and `executeWithProviderChain`. Provider order is unchanged. `completeText` is an additional method on the existing providers.

## 16. How feature flags work

The assistant answers only when all of these are true:

1. Admin setting `enable_rag_shopping_assistant=true` (default `false`).
2. Deployment variable `RAG_SHOPPING_ASSISTANT_ENABLED=true` (default unset).
3. The retrieval index has active chunks.
4. `PYTHON_AI_SERVICE_URL` and `PYTHON_AI_SERVICE_API_KEY` are set.
5. At least one existing LLM provider is configured.

Otherwise shoppers keep the current storefront and the Vapi assistant.

## 17. How web and mobile use it

When `rag.publicStatus` returns `enabled: true`, the web AI shopping page and the existing assistant sheet show a Catalog assistant. The Expo AI tab shows the same control and keeps product search. Both call `rag.ask`. Neither stores an LLM key.

## 18. How to build and update the index

From `services/ai-service`, with the service running and Convex configured:

```bash
uv run python -m app.rag.cli index --input evaluation/datasets/rag_synthetic.json
uv run python -m app.rag.cli retrieve --query "What is the return policy?"
```

For the live catalog, an admin runs the Convex action `rag.syncCatalog`. That schedules bounded batches. Product create, update, archive, and restore schedule a reindex only after `RAG_SHOPPING_ASSISTANT_ENABLED=true`, and they do not wait for the embedding call. Policy edits schedule a policy reindex under the same gate. Unchanged content hashes skip a new embedding call.

## 19. How to run retrieval evaluation

```bash
cd services/ai-service
uv run python -m app.rag.cli evaluate
```

The report includes recall@K, precision@K, MRR, nDCG@K, empty-result rate, source coverage, and latency for keyword, semantic, and hybrid on the same synthetic queries.

A local run of that command on the hashing embedder (`hashing-384-v1`, 14 queries, K from the evaluator default) produced:

| Strategy | Recall@K | Precision@K | MRR | nDCG@K | Empty rate | Mean latency |
| --- | --- | --- | --- | --- | --- | --- |
| keyword | 1.000 | 0.283 | 1.000 | 1.000 | 0.071 | 1.9 ms |
| semantic | 0.833 | 0.233 | 0.917 | 0.852 | 0.214 | 4.8 ms |
| hybrid | 1.000 | 0.283 | 1.000 | 1.000 | 0.071 | 6.0 ms |

Source coverage was 1.0 for keyword and hybrid, and 0.917 for semantic. These figures are synthetic. The hashing embedder is token-bucket similarity, so semantic retrieval is weaker than keyword retrieval on this set. Hybrid keeps keyword recall through reciprocal rank fusion.

## 20. How to run generation evaluation

The same command scores citation validity, product references, price, stock, unsupported claims, abstention, and prompt-injection resistance with deterministic checks. On the eight synthetic drafts, that run reported citation validity 0.875, product-reference validity 0.875, price correctness 0.75, stock correctness 0.875, unsupported-claim rate 0.625, answer relevance 1.0, abstention correctness 1.0, and prompt-injection resistance 1.0. The unsupported-claim rate is high because several drafts are intentionally wrong (stale price, stale stock, invented citation, injection). The checker is scoring those drafts, not a live model. `llm_judge: true` on `POST /api/v1/internal/rag/evaluate` is opt-in and returns `skipped`. It is not an objective score and it does not call the Convex provider chain. LLM generation latency was not measured (`null`).

## 21. Limitations

- Offline semantic scores use a deterministic hashing embedder so tests do not download a model or spend API credits. Production vectors come from the configured Convex embedding provider.
- Grounding does not understand every paraphrase of a price or a warranty.
- Conversation memory is a bounded guest session. It is not an account and it is not linked across devices.
- Vapi tools are unchanged. `getProductDetails` remains the voice product tool. Grounded retrieval is text-only until a future tool is registered explicitly.
- Index counts stored in Convex record whether chunks exist. They are not a full catalog census.

## Practical example

A shopper asks "What is the return window?" Hybrid retrieval should surface the return policy chunk. The prompt includes that chunk as untrusted data. The model is asked to cite that chunk id. If it invents a 90-day window with no citation, strict mode returns the fallback instead of the invented window.
