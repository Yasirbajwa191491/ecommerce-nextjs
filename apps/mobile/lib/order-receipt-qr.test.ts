import { describe, expect, it } from "vitest";

import { buildReceiptQrMatrix } from "./order-receipt-qr";

describe("buildReceiptQrMatrix", () => {
  it("builds a scannable matrix without canvas", () => {
    const matrix = buildReceiptQrMatrix("ORD-123");
    expect(matrix.size).toBeGreaterThan(10);
    expect(matrix.get(0, 0)).toBeTypeOf("boolean");
    expect(matrix.get(4, 4)).toBeTypeOf("boolean");
  });
});
