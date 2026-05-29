export type CartLine = {
  productId: string;
  nameSnapshot: string;
  unitPrice: number;
  qty: number;
};

export function calcTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}

export type OrderType = "PICKUP" | "DELIVERY";

export class InsufficientStockError extends Error {
  constructor(public productName: string) {
    super(`Stock insuficiente para ${productName}`);
    this.name = "InsufficientStockError";
  }
}

type ProductRow = {
  id: string;
  name: string;
  priceColones: number;
  stock: number;
  active: boolean;
};

export function buildOrderData(input: {
  cart: { productId: string; qty: number }[];
  products: ProductRow[];
  type: OrderType;
  customerName: string;
  whatsapp: string;
}) {
  const byId = new Map(input.products.map((p) => [p.id, p]));

  // Merge duplicate productIds in cart before validating
  const merged = new Map<string, number>();
  for (const line of input.cart) {
    if (line.qty <= 0) throw new Error("Cantidad inválida");
    merged.set(line.productId, (merged.get(line.productId) ?? 0) + line.qty);
  }

  const items: CartLine[] = [];
  const decrements: { id: string; qty: number }[] = [];

  for (const [productId, qty] of merged) {
    const product = byId.get(productId);
    if (!product || !product.active) {
      throw new Error(`Producto no disponible: ${productId}`);
    }
    if (qty > product.stock) {
      throw new InsufficientStockError(product.name);
    }
    items.push({
      productId: product.id,
      nameSnapshot: product.name,
      unitPrice: product.priceColones,
      qty,
    });
    decrements.push({ id: product.id, qty });
  }

  return { items, decrements, totalColones: calcTotal(items) };
}

export function generateOrderCode(now: Date = new Date()): string {
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `H${ymd}-${rand}`;
}
