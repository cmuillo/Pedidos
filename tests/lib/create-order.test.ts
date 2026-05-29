import { describe, it, expect } from "vitest";
import { buildOrderData, InsufficientStockError } from "@/lib/order";

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
});
