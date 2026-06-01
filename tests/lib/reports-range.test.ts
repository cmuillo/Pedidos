import { describe, test, expect } from "vitest";
import { getDateRange } from "@/lib/reports";

describe("getDateRange", () => {
  test("today is anchored to the Costa Rica (UTC-6) day boundaries", () => {
    const { from, to } = getDateRange("today");
    // Costa Rica midnight is 06:00 UTC; end of day is 05:59:59 UTC next day.
    expect(from.getUTCHours()).toBe(6);
    expect(from.getUTCMinutes()).toBe(0);
    expect(from.getUTCSeconds()).toBe(0);
    expect(to.getUTCHours()).toBe(5);
    expect(to.getUTCMinutes()).toBe(59);
    expect(to.getUTCSeconds()).toBe(59);
    // The span of a single day is just under 24 hours.
    const hours = (to.getTime() - from.getTime()) / (1000 * 60 * 60);
    expect(hours).toBeGreaterThan(23.9);
    expect(hours).toBeLessThan(24);
  });

  test("week returns 7-day range", () => {
    const { from, to } = getDateRange("week");
    const diffMs = to.getTime() - from.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(6.9);
    expect(diffDays).toBeLessThanOrEqual(7.1);
  });

  test("month returns ~30-day range", () => {
    const { from, to } = getDateRange("month");
    const diffMs = to.getTime() - from.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(27);
    expect(diffDays).toBeLessThanOrEqual(32);
  });

  test("custom range uses provided Costa Rica dates", () => {
    const { from, to } = getDateRange("custom", "2024-01-01", "2024-01-31");
    // 2024-01-01 00:00 CR == 06:00 UTC the same day.
    expect(from.toISOString()).toBe("2024-01-01T06:00:00.000Z");
    // 2024-01-31 23:59:59 CR == 05:59:59 UTC the next day.
    expect(to.toISOString()).toBe("2024-02-01T05:59:59.000Z");
  });
});
