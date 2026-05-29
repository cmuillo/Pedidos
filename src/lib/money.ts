export function formatColones(amount: number): string {
  return "₡" + Math.round(amount).toLocaleString("de-DE");
}
