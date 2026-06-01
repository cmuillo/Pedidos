export type RangePreset = "today" | "week" | "month" | "custom";

// Costa Rica has a fixed UTC-6 offset (no daylight saving time). Ranges are
// computed against the local Costa Rica day so presets like "Hoy" reflect the
// business' real day instead of the server's UTC day.
const CR_OFFSET_HOURS = 6;
const CR_OFFSET_MS = CR_OFFSET_HOURS * 60 * 60 * 1000;

export function getDateRange(preset: RangePreset, fromStr?: string, toStr?: string): { from: Date; to: Date } {
  if (preset === "custom" && fromStr && toStr) {
    // Date inputs are Costa Rica calendar dates; anchor them to the CR day.
    return {
      from: new Date(fromStr + "T00:00:00-06:00"),
      to: new Date(toStr + "T23:59:59-06:00"),
    };
  }

  // Shift "now" into Costa Rica local time to read the current CR calendar day.
  const nowCR = new Date(Date.now() - CR_OFFSET_MS);
  const y = nowCR.getUTCFullYear();
  const m = nowCR.getUTCMonth();
  const d = nowCR.getUTCDate();

  // Convert CR midnight / end-of-day back to UTC instants by adding the offset.
  const from = new Date(Date.UTC(y, m, d, 0, 0, 0) + CR_OFFSET_MS);
  const to = new Date(Date.UTC(y, m, d, 23, 59, 59) + CR_OFFSET_MS);

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
