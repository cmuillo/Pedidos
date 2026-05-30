import { describe, it, expect } from "vitest";
import { isValidDiscount, netTotal } from "@/lib/order";

describe("isValidDiscount", () => {
  it("accepts a discount between 0 and the total", () => {
    expect(isValidDiscount(5000, 0)).toBe(true);
    expect(isValidDiscount(5000, 1500)).toBe(true);
    expect(isValidDiscount(5000, 5000)).toBe(true);
  });
  it("rejects a discount greater than the total", () => {
    expect(isValidDiscount(5000, 5001)).toBe(false);
  });
  it("rejects negative discounts", () => {
    expect(isValidDiscount(5000, -1)).toBe(false);
  });
  it("rejects non-integer discounts", () => {
    expect(isValidDiscount(5000, 100.5)).toBe(false);
    expect(isValidDiscount(5000, NaN)).toBe(false);
  });
});

describe("netTotal", () => {
  it("subtracts the discount from the total", () => {
    expect(netTotal(5000, 1500)).toBe(3500);
  });
  it("never goes below 0", () => {
    expect(netTotal(5000, 6000)).toBe(0);
  });
});
