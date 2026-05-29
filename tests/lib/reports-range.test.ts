import { describe, test, expect } from "vitest";
import { getDateRange } from "@/lib/reports";

describe("getDateRange", () => {
  test("today returns start-of-day and end-of-day in UTC", () => {
    const { from, to } = getDateRange("today");
    expect(from.getUTCHours()).toBe(0);
    expect(from.getUTCMinutes()).toBe(0);
    expect(to.getUTCHours()).toBe(23);
    expect(to.getUTCMinutes()).toBe(59);
    expect(to.getUTCSeconds()).toBe(59);
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

  test("custom range uses provided dates", () => {
    const { from, to } = getDateRange("custom", "2024-01-01", "2024-01-31");
    expect(from.toISOString().startsWith("2024-01-01")).toBe(true);
    expect(to.toISOString().startsWith("2024-01-31")).toBe(true);
  });
});
