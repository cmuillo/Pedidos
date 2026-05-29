import { describe, it, expect } from "vitest";
import { haversineMeters } from "@/lib/distance";

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMeters(9.93, -84.08, 9.93, -84.08)).toBe(0);
  });

  it("computes ~1095km between 10 degrees of longitude at latitude 9.93", () => {
    const d = haversineMeters(9.93, -84.08, 9.93, -74.08);
    const expected = 1_095_250;
    expect(Math.abs(d - expected)).toBeLessThan(expected * 0.01); // within 1%
  });
});
