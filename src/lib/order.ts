export type CartLine = {
  productId: string;
  nameSnapshot: string;
  unitPrice: number;
  qty: number;
};

export function calcTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}
