import { describe, it, expect } from "vitest";
import { buildOrderData, InsufficientStockError, generateOrderCode } from "@/lib/order";

describe("buildOrderData", () => {
  const products = [
    { id: "a", name: "Vainilla", priceColones: 1000, stock: 5, active: true },
    { id: "b", name: "Chocolate", priceColones: 1500, stock: 1, active: true },
  ];

  it("builds order data and decrements correctly when stock is sufficient", () => {
    const result = buildOrderData({
      cart: [{ productId: "a", qty: 2 }, { productId: "b", qty: 1 }],
      products,
      type: "PICKUP",
      customerName: "Ana",
      whatsapp: "50688887777",
    });
    expect(result.totalColones).toBe(3500);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ productId: "a", nameSnapshot: "Vainilla", unitPrice: 1000, qty: 2 });
    expect(result.decrements).toEqual([
      { id: "a", qty: 2 },
      { id: "b", qty: 1 },
    ]);
  });

  it("throws InsufficientStockError when qty exceeds stock", () => {
    expect(() =>
      buildOrderData({
        cart: [{ productId: "b", qty: 2 }],
        products,
        type: "PICKUP",
        customerName: "Ana",
        whatsapp: "50688887777",
      })
    ).toThrow(InsufficientStockError);
  });

  it("throws when product is inactive or missing", () => {
    expect(() =>
      buildOrderData({
        cart: [{ productId: "zzz", qty: 1 }],
        products,
        type: "PICKUP",
        customerName: "Ana",
        whatsapp: "50688887777",
      })
    ).toThrow();
  });

  it("throws when qty is 0 or negative", () => {
    expect(() =>
      buildOrderData({
        cart: [{ productId: "a", qty: 0 }],
        products,
        type: "PICKUP",
        customerName: "Ana",
        whatsapp: "50688887777",
      })
    ).toThrow("Cantidad inválida");
  });

  it("throws when product is inactive", () => {
    const withInactive = [
      ...products,
      { id: "c", name: "Fresa", priceColones: 800, stock: 10, active: false },
    ];
    expect(() =>
      buildOrderData({
        cart: [{ productId: "c", qty: 1 }],
        products: withInactive,
        type: "PICKUP",
        customerName: "Ana",
        whatsapp: "50688887777",
      })
    ).toThrow("Producto no disponible");
  });

  it("merges duplicate productIds and validates combined qty against stock", () => {
    // stock for "b" is 1; two lines each requesting 1 = total 2 → should throw
    expect(() =>
      buildOrderData({
        cart: [{ productId: "b", qty: 1 }, { productId: "b", qty: 1 }],
        products,
        type: "PICKUP",
        customerName: "Ana",
        whatsapp: "50688887777",
      })
    ).toThrow(InsufficientStockError);
  });
});

describe("generateOrderCode", () => {
  it("generates code with H prefix and 4-digit suffix", () => {
    const code = generateOrderCode(new Date("2026-05-29T12:00:00Z"));
    expect(code).toMatch(/^H\d{6}-\d{4}$/);
    expect(code.startsWith("H260529")).toBe(true);
  });
});
