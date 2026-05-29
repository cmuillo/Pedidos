"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useCart } from "@/components/CartContext";
import { formatColones } from "@/lib/money";
import { calcTotal } from "@/lib/order";
import { isValidCRWhatsApp } from "@/lib/validation";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

type Pos = { lat: number; lng: number };

export default function CheckoutForm({ deliveryEnabled }: { deliveryEnabled: boolean }) {
  const { items, clear } = useCart();
  const [type, setType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [addressText, setAddressText] = useState("");
  const [pos, setPos] = useState<Pos | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ code: string } | null>(null);

  const cartLines = items.map((i) => ({ productId: i.productId, nameSnapshot: i.name, unitPrice: i.unitPrice, qty: i.qty }));
  const total = calcTotal(cartLines);

  async function submit() {
    setError("");
    if (items.length === 0) return setError("El carrito está vacío");
    if (!name.trim()) return setError("Ingrese su nombre");
    if (!isValidCRWhatsApp(whatsapp)) return setError("WhatsApp inválido (8 dígitos CR)");
    if (type === "DELIVERY" && !pos) return setError("Marque su ubicación en el mapa");
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart: items.map((i) => ({ productId: i.productId, qty: i.qty })),
          type,
          customerName: name.trim(),
          whatsapp,
          addressText: type === "DELIVERY" ? addressText || null : null,
          lat: type === "DELIVERY" ? pos?.lat : null,
          lng: type === "DELIVERY" ? pos?.lng : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "No se pudo crear el pedido");
      clear();
      setDone({ code: data.code });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="p-6 border rounded-lg text-center space-y-2">
        <div className="text-4xl">🍦</div>
        <p className="text-lg font-semibold">¡Pedido recibido!</p>
        <p className="text-gray-600">Código: <span className="font-mono font-bold">{done.code}</span></p>
        <p className="text-sm text-gray-500">Nos pondremos en contacto por WhatsApp pronto.</p>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          className={`flex-1 py-3 rounded border font-medium ${type === "PICKUP" ? "bg-pink-600 text-white border-pink-600" : "border-gray-300"}`}
          onClick={() => setType("PICKUP")}>
          🏪 Recoger
        </button>
        {deliveryEnabled && (
          <button
            className={`flex-1 py-3 rounded border font-medium ${type === "DELIVERY" ? "bg-pink-600 text-white border-pink-600" : "border-gray-300"}`}
            onClick={() => setType("DELIVERY")}>
            🛵 Express
          </button>
        )}
      </div>
      <input
        className="w-full border rounded p-3" placeholder="Tu nombre"
        value={name} onChange={(e) => setName(e.target.value)} />
      <input
        className="w-full border rounded p-3" placeholder="WhatsApp (ej: 88887777)"
        value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
      {type === "DELIVERY" && (
        <>
          <p className="text-sm text-gray-600">Marca tu ubicación en el mapa:</p>
          <LocationPicker value={pos} onChange={setPos} />
          <input
            className="w-full border rounded p-3" placeholder="Referencias de la dirección (opcional)"
            value={addressText} onChange={(e) => setAddressText(e.target.value)} />
        </>
      )}
      <div className="flex justify-between font-semibold text-lg border-t pt-3">
        <span>Total</span>
        <span className="text-pink-600">{formatColones(total)}</span>
      </div>
      {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
      <button
        onClick={submit}
        disabled={submitting}
        className="w-full bg-pink-600 text-white rounded p-3 font-semibold disabled:opacity-50">
        {submitting ? "Enviando…" : "Confirmar pedido"}
      </button>
    </div>
  );
}
