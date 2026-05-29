"use client";
import { useState, useCallback } from "react";
import { CartProvider } from "@/components/CartContext";
import MenuGrid from "@/components/MenuGrid";
import CheckoutForm from "@/components/CheckoutForm";

type Business = { name: string; logoBase64: string | null; deliveryEnabled: boolean };

export default function Home() {
  const [business, setBusiness] = useState<Business>({
    name: "Mi Heladería",
    logoBase64: null,
    deliveryEnabled: false,
  });

  const handleBusiness = useCallback((b: Business) => setBusiness(b), []);

  return (
    <CartProvider>
      <div className="max-w-2xl mx-auto p-4 space-y-6 pb-12">
        <header className="flex flex-col items-center gap-2 py-4">
          {business.logoBase64 && (
            <img
              src={business.logoBase64}
              alt="logo"
              className="h-20 w-20 object-contain rounded-full border"
            />
          )}
          <h1 className="text-2xl font-bold text-center">{business.name}</h1>
        </header>
        <section>
          <MenuGrid onBusiness={handleBusiness} />
        </section>
        <section className="border-t pt-4">
          <h2 className="text-lg font-semibold mb-3">Finalizar pedido</h2>
          <CheckoutForm deliveryEnabled={business.deliveryEnabled} />
        </section>
      </div>
    </CartProvider>
  );
}
