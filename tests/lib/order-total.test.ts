import { describe, it, expect } from "vitest";
import { calcTotal, type CartLine } from "@/lib/order";

describe("calcTotal", () => {
  it("sums unitPrice * qty over lines", () => {
    const lines: CartLine[] = [
      { productId: "a", nameSnapshot: "Vainilla", unitPrice: 1000, qty: 2 },
      { productId: "b", nameSnapshot: "Chocolate", unitPrice: 1500, qty: 1 },
    ];
    expect(calcTotal(lines)).toBe(3500);
  });
  it("returns 0 for empty cart", () => {
    expect(calcTotal([])).toBe(0);
  });
});
