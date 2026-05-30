import { prisma } from "@/lib/prisma";
import { haversineMeters } from "@/lib/distance";

export type CartLine = {
  productId: string;
  nameSnapshot: string;
  unitPrice: number;
  qty: number;
};

export function calcTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}

/**
 * Validate a discount against an order total.
 * A discount must be an integer between 0 and the total (inclusive):
 * it can never be greater than the total it applies to.
 */
export function isValidDiscount(total: number, discount: number): boolean {
  return (
    Number.isInteger(discount) &&
    discount >= 0 &&
    discount <= total
  );
}

/** Net amount charged after applying a discount, never below 0. */
export function netTotal(total: number, discount: number): number {
  return Math.max(0, total - discount);
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

export async function persistOrder(input: {
  cart: { productId: string; qty: number }[];
  type: OrderType;
  customerName: string;
  whatsapp: string;
  addressText?: string | null;
  lat?: number | null;
  lng?: number | null;
}) {
  if (input.cart.length === 0) throw new Error("Carrito vacío");

  // Fetch shop coords before opening transaction to keep tx window short
  let distanceMeters: number | null = null;
  if (input.type === "DELIVERY" && input.lat != null && input.lng != null) {
    const settings = await prisma.businessSettings.findUnique({ where: { id: 1 } });
    if (settings?.shopLat != null && settings?.shopLng != null) {
      distanceMeters = haversineMeters(settings.shopLat, settings.shopLng, input.lat, input.lng);
    }
  }

  return prisma.$transaction(async (tx) => {
    const ids = input.cart.map((c) => c.productId);
    const products = await tx.product.findMany({ where: { id: { in: ids } } });

    const built = buildOrderData({
      cart: input.cart,
      products,
      type: input.type,
      customerName: input.customerName,
      whatsapp: input.whatsapp,
    });

    for (const d of built.decrements) {
      const updated = await tx.product.updateMany({
        where: { id: d.id, stock: { gte: d.qty } },
        data: { stock: { decrement: d.qty } },
      });
      if (updated.count === 0) {
        const p = products.find((x) => x.id === d.id);
        throw new InsufficientStockError(p?.name ?? d.id);
      }
    }

    return tx.order.create({
      data: {
        code: generateOrderCode(),
        type: input.type,
        customerName: input.customerName,
        whatsapp: input.whatsapp,
        addressText: input.addressText ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        distanceMeters,
        totalColones: built.totalColones,
        items: { create: built.items },
      },
      include: { items: true },
    });
  });
}
