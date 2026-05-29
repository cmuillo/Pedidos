import { describe, it, expect } from "vitest";
import { haversineMeters } from "@/lib/distance";

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMeters(9.93, -84.08, 9.93, -84.08)).toBe(0);
  });

  it("computes ~1113km between 10 degrees of longitude at equator-ish", () => {
    const d = haversineMeters(9.93, -84.08, 9.93, -74.08);
    expect(d).toBeGreaterThan(1_000_000);
    expect(d).toBeLessThan(1_200_000);
  });
});
