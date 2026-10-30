import { expect, it } from "vitest";
import { validateRagGrounding } from "./grounding";
const facts = [
 { productId: "a", name: "Alpha Phone", currency: "USD", price: 10, finalPrice: 10, stock: 0, available: false },
 { productId: "b", name: "Beta Phone", currency: "USD", price: 20, finalPrice: 20, stock: 5, available: true },
];
const chunks = [{ chunkId: "b-source", productId: "b" }];
it.each(["strict", "standard"] as const)("rejects an uncited product's claim supported only by another product in %s mode", mode => {
 const result = validateRagGrounding({ answer: "Alpha Phone costs $20 and is available.", facts, chunks, citationIds: ["b-source"], mode });
 expect(result.grounded).toBe(false); expect(result.reasons).toContain("product_citation_mismatch");
});
it("keeps a correctly scoped single-product claim", () => {
 expect(validateRagGrounding({ answer: "Beta Phone costs $20 and is available.", facts, chunks, citationIds: ["b-source"], mode: "strict" }).grounded).toBe(true);
});
it.each(["strict", "standard"] as const)("rejects mixed symbol currencies even when all numeric prices match in %s mode", mode => {
 const result = validateRagGrounding({ answer: "Beta Phone costs $20 or €20.", facts: [{ ...facts[1], currency: "EUR" }], chunks, citationIds: ["b-source"], mode });
 expect(result.grounded).toBe(false); expect(result.reasons).toContain("currency_mismatch");
});
