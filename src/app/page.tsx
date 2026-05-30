"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CartProvider, useCart } from "@/components/CartContext";
import MenuGrid from "@/components/MenuGrid";
import CheckoutForm, { CheckoutFormHandle } from "@/components/CheckoutForm";

type Business = { name: string; logoBase64: string | null; deliveryEnabled: boolean; shopLat: number | null; shopLng: number | null };

function HomeContent() {
  const [business, setBusiness] = useState<Business>({
    name: "Mi Heladería",
    logoBase64: null,
    deliveryEnabled: false,
    shopLat: null,
    shopLng: null,
  });
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [orderCode, setOrderCode] = useState("");
  const { items } = useCart();
  const checkoutRef = useRef<CheckoutFormHandle>(null);
  const router = useRouter();
  // When launched from the admin orders screen (?return=/admin/pedidos),
  // go back there after the confirmation instead of resetting to step 1.
  const returnTo = useRef<string | null>(null);

  const handleBusiness = useCallback((b: Business) => setBusiness(b), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const value = new URLSearchParams(window.location.search).get("return");
    // Only allow same-app relative paths to avoid open-redirects.
    if (value && value.startsWith("/") && !value.startsWith("//")) {
      returnTo.current = value;
    }
  }, []);

  useEffect(() => {
    if (step !== 3) return;
    const t = setTimeout(() => {
      if (returnTo.current) {
        router.push(returnTo.current);
      } else {
        setStep(1);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [step, router]);

  const cartCount = items.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Header */}
      {step !== 3 && (
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
      )}

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
            shopLocation={
              business.shopLat != null && business.shopLng != null
                ? { lat: business.shopLat, lng: business.shopLng }
                : null
            }
            onSuccess={(code) => {
              setOrderCode(code);
              setStep(3);
            }}
          />
        </main>
      )}

      {/* Step 3: Confirmación */}
      {step === 3 && (
        <main className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="text-6xl">🍦</div>
          <h2 className="text-2xl font-bold">¡Tu pedido fue enviado!</h2>
          <p className="text-muted">
            Número de pedido:{" "}
            <span className="font-mono font-bold text-foreground">{orderCode}</span>
          </p>
          <p className="text-muted max-w-xs">
            ¡Gracias por tu compra! Nos pondremos en contacto por WhatsApp pronto. 💕
          </p>
        </main>
      )}

      {/* Sticky bottom bar */}
      {step !== 3 && (
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
      )}
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
