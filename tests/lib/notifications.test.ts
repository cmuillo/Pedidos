import { describe, it, expect } from "vitest";
import { newOrderIds } from "@/lib/notifications";

describe("newOrderIds", () => {
  it("returns nothing on first load (previous is null)", () => {
    expect(newOrderIds(null, ["a", "b"])).toEqual([]);
  });

  it("detects newly added ids", () => {
    expect(newOrderIds(["a"], ["a", "b", "c"])).toEqual(["b", "c"]);
  });

  it("returns nothing when no new ids", () => {
    expect(newOrderIds(["a", "b"], ["a", "b"])).toEqual([]);
    expect(newOrderIds(["a", "b"], ["a"])).toEqual([]);
  });

  it("treats an empty previous list as 'no new orders yet seen'", () => {
    expect(newOrderIds([], ["a"])).toEqual(["a"]);
  });
});
