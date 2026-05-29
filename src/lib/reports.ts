export type RangePreset = "today" | "week" | "month" | "custom";

export function getDateRange(preset: RangePreset, fromStr?: string, toStr?: string): { from: Date; to: Date } {
  const now = new Date();
  if (preset === "custom" && fromStr && toStr) {
    return { from: new Date(fromStr + "T00:00:00Z"), to: new Date(toStr + "T23:59:59Z") };
  }
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
  if (preset === "today") return { from, to };
  if (preset === "week") {
    from.setUTCDate(from.getUTCDate() - 6);
    return { from, to };
  }
  if (preset === "month") {
    from.setUTCDate(from.getUTCDate() - 29);
    return { from, to };
  }
  return { from, to };
}
