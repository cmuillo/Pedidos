"use client";
import { createContext, useContext, useState } from "react";

export type CartItem = { productId: string; name: string; unitPrice: number; qty: number };
type CartCtx = {
  items: CartItem[];
  setQty: (p: Omit<CartItem, "qty">, qty: number) => void;
  clear: () => void;
};
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  function setQty(p: Omit<CartItem, "qty">, qty: number) {
    setItems((prev) => {
      const rest = prev.filter((i) => i.productId !== p.productId);
      return qty > 0 ? [...rest, { ...p, qty }] : rest;
    });
  }
  return <Ctx.Provider value={{ items, setQty, clear: () => setItems([]) }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
