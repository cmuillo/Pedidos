export function formatColones(amount: number): string {
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded);
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (rounded < 0 ? "-₡" : "₡") + formatted;
}
