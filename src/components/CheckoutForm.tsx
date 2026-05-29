"use client";
import { useState, forwardRef, useImperativeHandle } from "react";
import dynamic from "next/dynamic";
import { useCart } from "@/components/CartContext";
import { formatColones } from "@/lib/money";
import { calcTotal } from "@/lib/order";
import { isValidCRWhatsApp } from "@/lib/validation";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

type Pos = { lat: number; lng: number };

export interface CheckoutFormHandle {
  submit: () => void;
}

const CheckoutForm = forwardRef<CheckoutFormHandle, { deliveryEnabled: boolean; shopLocation?: Pos | null; onSuccess?: (code: string) => void }>(
function CheckoutForm({ deliveryEnabled, shopLocation, onSuccess }, ref) {
  const { items, setQty, clear } = useCart();
  const [type, setType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [addressText, setAddressText] = useState("");
  const [pos, setPos] = useState<Pos | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ code: string } | null>(null);

  const cartLines = items.map((i) => ({ productId: i.productId, nameSnapshot: i.name, unitPrice: i.unitPrice, qty: i.qty }));
  const total = calcTotal(cartLines);

  useImperativeHandle(ref, () => ({ submit }));

  // Re-check live stock before sending; adjust cart to what's available.
  // Returns true if the cart still matches stock and we can proceed.
  async function verifyStock(): Promise<boolean> {
    const res = await fetch("/api/products", { cache: "no-store" });
    if (!res.ok) return true; // if we can't check, let the backend be the safety net
    const data = await res.json();
    const available = new Map<string, number>(
      (data.products as { id: string; stock: number }[]).map((p) => [p.id, p.stock])
    );
    const changes: string[] = [];
    for (const item of items) {
      const stock = available.get(item.productId) ?? 0;
      if (stock < item.qty) {
        changes.push(
          stock <= 0
            ? `${item.name}: agotado, se quitó del carrito`
            : `${item.name}: solo quedan ${stock}, se ajustó tu pedido`
        );
        setQty({ productId: item.productId, name: item.name, unitPrice: item.unitPrice }, stock);
      }
    }
    if (changes.length > 0) {
      setNotice(
        "Algunas cantidades cambiaron mientras comprabas:\n" +
          changes.join("\n") +
          "\nRevisa tu pedido y confirma de nuevo."
      );
      return false;
    }
    return true;
  }

  async function submit() {
    setError("");
    setNotice("");
    if (items.length === 0) return setError("El carrito está vacío");
    if (!name.trim()) return setError("Ingrese su nombre");
    if (!isValidCRWhatsApp(whatsapp)) return setError("WhatsApp inválido (8 dígitos CR)");
    if (type === "DELIVERY" && !pos) return setError("Marque su ubicación en el mapa");
    setSubmitting(true);
    try {
      const ok = await verifyStock();
      if (!ok) return;
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
      onSuccess?.(data.code);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="p-6 border rounded-xl text-center space-y-2 bg-surface shadow-sm">
        <div className="text-4xl">🍦</div>
        <p className="text-lg font-semibold">¡Pedido recibido!</p>
        <p className="text-muted">Código: <span className="font-mono font-bold text-foreground">{done.code}</span></p>
        <p className="text-sm text-muted">Nos pondremos en contacto por WhatsApp pronto.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          className={`flex-1 py-3 rounded-lg border font-medium transition-colors ${type === "PICKUP" ? "bg-accent text-accent-fg border-accent" : "bg-surface hover:bg-surface-2"}`}
          onClick={() => setType("PICKUP")}>
          🏪 Recoger
        </button>
        {deliveryEnabled && (
          <button
            className={`flex-1 py-3 rounded-lg border font-medium transition-colors ${type === "DELIVERY" ? "bg-accent text-accent-fg border-accent" : "bg-surface hover:bg-surface-2"}`}
            onClick={() => setType("DELIVERY")}>
            🛵 Express
          </button>
        )}
      </div>
      <input
        className="w-full border rounded-lg p-3 bg-surface placeholder:text-muted" placeholder="Tu nombre"
        value={name} onChange={(e) => setName(e.target.value)} />
      <input
        className="w-full border rounded-lg p-3 bg-surface placeholder:text-muted" placeholder="WhatsApp (ej: 88887777)"
        value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
      {type === "DELIVERY" && (
        <>
          <p className="text-sm text-muted">Marca tu ubicación en el mapa:</p>
          <LocationPicker value={pos} onChange={setPos} fallback={shopLocation ?? null} />
          <input
            className="w-full border rounded-lg p-3 bg-surface placeholder:text-muted" placeholder="Referencias de la dirección (opcional)"
            value={addressText} onChange={(e) => setAddressText(e.target.value)} />
        </>
      )}
      <div className="flex justify-between font-semibold text-lg border-t pt-3">
        <span>Total</span>
        <span className="text-accent">{formatColones(total)}</span>
      </div>
      {notice && <p className="text-sm whitespace-pre-line bg-accent-soft text-foreground p-3 rounded-lg border border-accent/30">{notice}</p>}
      {error && <p className="text-danger text-sm bg-danger-soft p-2 rounded-lg">{error}</p>}
    </div>
  );
});

export default CheckoutForm;
