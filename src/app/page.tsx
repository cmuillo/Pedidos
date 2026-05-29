"use client";
import { useState, useCallback, useRef } from "react";
import { CartProvider, useCart } from "@/components/CartContext";
import MenuGrid from "@/components/MenuGrid";
import CheckoutForm, { CheckoutFormHandle } from "@/components/CheckoutForm";

type Business = { name: string; logoBase64: string | null; deliveryEnabled: boolean };

function HomeContent() {
  const [business, setBusiness] = useState<Business>({
    name: "Mi Heladería",
    logoBase64: null,
    deliveryEnabled: false,
  });
  const [step, setStep] = useState<1 | 2>(1);
  const { items } = useCart();
  const checkoutRef = useRef<CheckoutFormHandle>(null);

  const handleBusiness = useCallback((b: Business) => setBusiness(b), []);

  const cartCount = items.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Header */}
      <header className="flex flex-col items-center gap-2 py-4 px-4">
        {business.logoBase64 && (
          <img
            src={business.logoBase64}
            alt="logo"
            className="h-20 w-20 object-contain rounded-full border"
          />
        )}
        <h1 className="text-2xl font-bold text-center">{business.name}</h1>
      </header>

      {/* Step 1: Menú */}
      {step === 1 && (
        <main className="flex-1 px-3 sm:px-6">
          <MenuGrid onBusiness={handleBusiness} />
        </main>
      )}

      {/* Step 2: Datos del pedido */}
      {step === 2 && (
        <main className="flex-1 px-3 sm:px-6 max-w-xl mx-auto w-full">
          <h2 className="text-lg font-semibold mb-4">Tu pedido</h2>
          <CheckoutForm
            ref={checkoutRef}
            deliveryEnabled={business.deliveryEnabled}
            onSuccess={() => {
              setStep(1);
            }}
          />
        </main>
      )}

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background border-t flex gap-3">
        {step === 1 && (
          <button
            disabled={cartCount === 0}
            onClick={() => setStep(2)}
            className="flex-1 bg-accent text-accent-fg rounded-lg py-3.5 font-semibold text-base disabled:opacity-40 hover:bg-accent-hover transition-colors">
            {cartCount > 0
              ? `Enviar pedido (${cartCount} ${cartCount === 1 ? "item" : "items"})`
              : "Enviar pedido"}
          </button>
        )}
        {step === 2 && (
          <>
            <button
              onClick={() => setStep(1)}
              className="px-5 py-3.5 border rounded-lg font-semibold bg-surface hover:bg-surface-2 transition-colors">
              ← Atrás
            </button>
            <button
              onClick={() => checkoutRef.current?.submit()}
              className="flex-1 bg-accent text-accent-fg rounded-lg py-3.5 font-semibold text-base hover:bg-accent-hover transition-colors">
              Pedir
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <CartProvider>
      <HomeContent />
    </CartProvider>
  );
}
