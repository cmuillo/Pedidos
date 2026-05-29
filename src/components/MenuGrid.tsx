"use client";
import { useEffect, useState, useCallback } from "react";
import { formatColones } from "@/lib/money";
import { useCart } from "@/components/CartContext";

type Product = { id: string; name: string; priceColones: number; stock: number };
type Business = { name: string; logoBase64: string | null; deliveryEnabled: boolean };

export default function MenuGrid({ onBusiness }: { onBusiness: (b: Business) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const { items, setQty } = useCart();

  const load = useCallback(async () => {
    const res = await fetch("/api/products", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setProducts(data.products);
    onBusiness(data.business);
  }, [onBusiness]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {products.map((p) => {
        const inCart = items.find((i) => i.productId === p.id)?.qty ?? 0;
        const soldOut = p.stock <= 0;
        return (
          <div key={p.id} className="border rounded-lg p-4 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <span className="font-semibold">{p.name}</span>
              <span className="text-pink-600 font-medium">{formatColones(p.priceColones)}</span>
            </div>
            <span className={`text-sm ${soldOut ? "text-red-500" : "text-gray-500"}`}>
              {soldOut ? "Agotado" : `${p.stock} disponibles`}
            </span>
            <div className="flex items-center gap-2 mt-auto">
              <button
                disabled={inCart <= 0}
                className="w-9 h-9 border rounded text-lg disabled:opacity-40"
                onClick={() => setQty({ productId: p.id, name: p.name, unitPrice: p.priceColones }, inCart - 1)}>−</button>
              <span className="w-8 text-center font-medium">{inCart}</span>
              <button
                disabled={soldOut || inCart >= p.stock}
                className="w-9 h-9 border rounded text-lg disabled:opacity-40"
                onClick={() => setQty({ productId: p.id, name: p.name, unitPrice: p.priceColones }, inCart + 1)}>+</button>
            </div>
          </div>
        );
      })}
      {products.length === 0 && (
        <p className="col-span-2 text-center text-gray-400 py-8">Cargando menú…</p>
      )}
    </div>
  );
}
