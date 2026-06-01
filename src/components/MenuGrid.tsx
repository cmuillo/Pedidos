"use client";
import { useEffect, useState, useCallback } from "react";
import { formatColones } from "@/lib/money";
import { useCart } from "@/components/CartContext";

type Product = { id: string; name: string; priceColones: number; stock: number };
type Business = { name: string; slogan: string | null; logoBase64: string | null; pickupEnabled: boolean; deliveryEnabled: boolean; shopLat: number | null; shopLng: number | null; whatsappFrom: string | null; facebookUser: string | null; instagramUser: string | null };

export default function MenuGrid({ onBusiness, closed = false }: { onBusiness: (b: Business) => void; closed?: boolean }) {
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

  if (closed) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-3 py-16">
        <div className="text-6xl">🔒</div>
        <p className="text-xl font-bold">La tienda está cerrada</p>
        <p className="text-muted max-w-xs">Por el momento no estamos recibiendo pedidos. ¡Vuelve pronto! 🍦</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {products.map((p) => {
        const inCart = items.find((i) => i.productId === p.id)?.qty ?? 0;
        const soldOut = p.stock <= 0;
        return (
          <div key={p.id} className="border rounded-xl p-4 flex flex-col gap-2 bg-surface shadow-sm">
            <div className="flex justify-between items-start">
              <span className="font-semibold">{p.name}</span>
              <span className="text-accent font-medium">{formatColones(p.priceColones)}</span>
            </div>
            <span className={`text-sm ${soldOut ? "text-danger" : "text-muted"}`}>
              {soldOut ? "Agotado" : `${p.stock} disponibles`}
            </span>
            <div className="flex items-center gap-2 mt-auto">
              <button
                disabled={inCart <= 0}
                className="w-9 h-9 border rounded-lg text-lg disabled:opacity-40 hover:bg-surface-2 transition-colors"
                onClick={() => setQty({ productId: p.id, name: p.name, unitPrice: p.priceColones }, inCart - 1)}>−</button>
              <span className="w-8 text-center font-medium">{inCart}</span>
              <button
                disabled={soldOut || inCart >= p.stock}
                className="w-9 h-9 border rounded-lg text-lg disabled:opacity-40 hover:bg-surface-2 transition-colors"
                onClick={() => setQty({ productId: p.id, name: p.name, unitPrice: p.priceColones }, inCart + 1)}>+</button>
            </div>
          </div>
        );
      })}
      {products.length === 0 && (
        <p className="col-span-2 text-center text-muted py-8">Cargando menú…</p>
      )}
    </div>
  );
}
