import { describe, expect, it } from "vitest";

import { buildQrMatrix } from "./order-receipt-qr";

describe("buildQrMatrix", () => {
  it("builds a scannable matrix without canvas", () => {
    const matrix = buildQrMatrix("https://yourstore.com/qr/order/abcdefghijklmnopqrstuvwxyz0123456789ABCD");
    expect(matrix.size).toBeGreaterThan(10);
    expect(matrix.get(0, 0)).toBeTypeOf("boolean");
    expect(matrix.get(4, 4)).toBeTypeOf("boolean");
  });
});
