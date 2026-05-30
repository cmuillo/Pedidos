"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CartProvider, useCart } from "@/components/CartContext";
import MenuGrid from "@/components/MenuGrid";
import CheckoutForm, { CheckoutFormHandle } from "@/components/CheckoutForm";

type Business = { name: string; slogan: string | null; logoBase64: string | null; deliveryEnabled: boolean; shopLat: number | null; shopLng: number | null; whatsappFrom: string | null; facebookUser: string | null; instagramUser: string | null };

function HomeContent() {
  const [business, setBusiness] = useState<Business>({
    name: "Mi Heladería",
    slogan: null,
    logoBase64: null,
    deliveryEnabled: false,
    shopLat: null,
    shopLng: null,
    whatsappFrom: null,
    facebookUser: null,
    instagramUser: null,
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
        <header className="flex items-center gap-3 py-4 px-4 max-w-xl mx-auto w-full">
          {business.logoBase64 && (
            <img
              src={business.logoBase64}
              alt="logo"
              className="h-16 w-16 object-contain rounded-full border shrink-0"
            />
          )}
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-xl font-bold leading-tight">{business.name}</h1>
            {business.slogan && (
              <p className="text-sm text-muted leading-tight">{business.slogan}</p>
            )}
            <SocialLinks business={business} />
          </div>
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

// Normalize a stored social username/phone into just the handle: trims spaces,
// drops a leading "@" and any URL prefix so the built link is always valid.
function cleanHandle(value: string): string {
  return value.trim().replace(/^@/, "").replace(/^https?:\/\/[^/]+\//i, "").replace(/\/+$/, "");
}

function SocialLinks({ business }: { business: Business }) {
  const wa = business.whatsappFrom ? cleanHandle(business.whatsappFrom).replace(/\D/g, "") : "";
  const fb = business.facebookUser ? cleanHandle(business.facebookUser) : "";
  const ig = business.instagramUser ? cleanHandle(business.instagramUser) : "";

  if (!wa && !fb && !ig) return null;

  return (
    <div className="flex items-center gap-2 mt-0.5">
      {wa && (
        <a
          aria-label="WhatsApp"
          title="WhatsApp"
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#25D366] text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
        </a>
      )}
      {fb && (
        <a
          aria-label="Facebook"
          title="Facebook"
          href={`https://facebook.com/${fb}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1877F2] text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </a>
      )}
      {ig && (
        <a
          aria-label="Instagram"
          title="Instagram"
          href={`https://instagram.com/${ig}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
          </svg>
        </a>
      )}
    </div>
  );
}
