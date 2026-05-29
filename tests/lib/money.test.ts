import { describe, it, expect } from "vitest";
import { formatColones } from "@/lib/money";

describe("formatColones", () => {
  it("formats integers with thousands separator and ₡", () => {
    expect(formatColones(1000)).toBe("₡1.000");
    expect(formatColones(1500000)).toBe("₡1.500.000");
    expect(formatColones(0)).toBe("₡0");
  });
});
