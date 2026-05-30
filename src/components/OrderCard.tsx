"use client";
import { useState } from "react";
import { formatColones } from "@/lib/money";
import { netTotal } from "@/lib/order";
import { buildOnTheWayLink, buildReceivedLink, buildNavLink } from "@/lib/whatsapp";
import ConfirmDialog from "@/components/ConfirmDialog";

type OrderItem = { nameSnapshot: string; qty: number; unitPrice: number };
type Order = {
  id: string;
  code: string;
  type: "PICKUP" | "DELIVERY";
  customerName: string;
  whatsapp: string;
  addressText: string | null;
  lat: number | null;
  lng: number | null;
  distanceMeters: number | null;
  totalColones: number;
  discountColones?: number;
  paid: boolean;
  messageStage?: number;
  createdAt?: string;
  items: OrderItem[];
};

export default function OrderCard({
  order,
  sinpePhone,
  onChange,
  readOnly = false,
}: {
  order: Order;
  sinpePhone: string | null;
  onChange: () => void;
  readOnly?: boolean;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const discount = order.discountColones ?? 0;
  const net = netTotal(order.totalColones, discount);
  const [discountInput, setDiscountInput] = useState(discount > 0 ? String(discount) : "");
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [savingDiscount, setSavingDiscount] = useState(false);

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onChange();
  }

  async function applyDiscount() {
    const trimmed = discountInput.trim();
    const value = trimmed === "" ? 0 : Number(trimmed);
    if (!Number.isInteger(value) || value < 0) {
      setDiscountError("Ingresa un descuento válido");
      return;
    }
    if (value > order.totalColones) {
      setDiscountError("El descuento no puede ser mayor al total");
      return;
    }
    setDiscountError(null);
    setSavingDiscount(true);
    await patch({ discountColones: value });
    setSavingDiscount(false);
  }

  const messageStage = order.messageStage ?? 0;

  // WhatsApp send flow:
  //  - stage 0 (nuevo): primer toque envía el mensaje de pago y pasa a amarillo.
  //  - stage 1: segundo toque envía el mensaje de "en camino/recoger" sin pedir
  //    el pago de nuevo y pasa a verde.
  //  - stage 2: ya enviado dos veces; reenvía el mismo mensaje sin volver a pedir pago.
  function waLinkForStage(stage: number): string {
    if (stage <= 0) {
      return buildReceivedLink({
        whatsapp: order.whatsapp,
        customerName: order.customerName,
        code: order.code,
        items: order.items,
        totalColones: net,
      });
    }
    return buildOnTheWayLink({
      whatsapp: order.whatsapp,
      customerName: order.customerName,
      code: order.code,
      type: order.type,
      items: order.items,
      totalColones: net,
      sinpePhone: sinpePhone ?? null,
      includePayment: false,
    });
  }

  function sendWhatsapp() {
    window.open(waLinkForStage(messageStage), "_blank", "noopener,noreferrer");
    const next = Math.min(messageStage + 1, 2);
    if (next !== messageStage) void patch({ messageStage: next });
  }

  const waButtonClass =
    messageStage >= 2
      ? "bg-success text-accent-fg border-success"
      : messageStage === 1
        ? "bg-warning text-white border-warning"
        : "hover:bg-surface-2";

  return (
    <div className="relative border rounded-xl p-4 space-y-3 bg-surface shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold">{order.customerName}</p>
          {!readOnly && messageStage === 0 ? (
            <span className="inline-block text-xs font-mono px-2 py-0.5 rounded bg-success text-accent-fg">{order.code}</span>
          ) : (
            <p className="text-xs text-muted font-mono">{order.code}</p>
          )}
          {readOnly && order.createdAt && (
            <p className="text-xs text-muted mt-0.5">
              {new Date(order.createdAt).toLocaleString("es-CR")}
            </p>
          )}
        </div>
        <div className="text-right">
          {discount > 0 && (
            <span className="text-xs text-muted line-through block">{formatColones(order.totalColones)}</span>
          )}
          <span className="font-bold text-accent block">{formatColones(net)}</span>
          {discount > 0 && (
            <span className="text-xs text-success block">Descuento -{formatColones(discount)}</span>
          )}
          {readOnly && (
            <span className="text-xs text-success font-medium">
              {order.type === "DELIVERY" ? "🛵 Express" : "🏪 Recoger"} · ✓ Pagado
            </span>
          )}
        </div>
      </div>
      <ul className="text-sm text-muted space-y-0.5">
        {order.items.map((i, idx) => (
          <li key={idx}>• {i.qty}× {i.nameSnapshot} ({formatColones(i.unitPrice * i.qty)})</li>
        ))}
      </ul>
      {order.addressText && (
        <p className="text-sm">📍 {order.addressText}</p>
      )}
      {!readOnly && order.distanceMeters != null && (
        <p className="text-xs text-muted">A {(order.distanceMeters / 1000).toFixed(1)} km</p>
      )}
      {!readOnly && (
        <div className="space-y-1 pt-1">
          <div className="flex items-center gap-2">
            <label htmlFor={`discount-${order.id}`} className="text-sm text-muted whitespace-nowrap">Descuento ₡</label>
            <input
              id={`discount-${order.id}`}
              type="number"
              min={0}
              max={order.totalColones}
              inputMode="numeric"
              placeholder="0"
              className="flex-1 min-w-0 border rounded-lg px-3 py-2 text-sm bg-surface placeholder:text-muted"
              value={discountInput}
              onChange={(e) => { setDiscountInput(e.target.value); setDiscountError(null); }} />
            <button
              className="px-3 py-2 border rounded-lg text-sm font-medium hover:bg-surface-2 transition-colors disabled:opacity-50"
              disabled={savingDiscount}
              onClick={applyDiscount}>
              Aplicar
            </button>
          </div>
          {discountError && <p className="text-xs text-danger">{discountError}</p>}
        </div>
      )}
      {!readOnly && (
      <div className="flex flex-wrap gap-2 pt-1 pr-10">
        {order.lat != null && order.lng != null && (
          <a
            aria-label="Navegar"
            title="Navegar"
            className="w-10 h-10 flex items-center justify-center border rounded-lg hover:bg-surface-2 transition-colors"
            href={buildNavLink(order.lat, order.lng)}
            target="_blank"
            rel="noreferrer">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17h-2v-6l2-5h9l4 5h3a1 1 0 0 1 1 1v5h-2" />
              <circle cx="7.5" cy="17.5" r="1.5" />
              <circle cx="17.5" cy="17.5" r="1.5" />
              <path d="M9 17h6" />
            </svg>
          </a>
        )}
        <button
          type="button"
          aria-label="Enviar mensaje de WhatsApp"
          title={messageStage === 0 ? "Enviar confirmación y solicitud de pago" : "Enviar mensaje de seguimiento"}
          className={`w-10 h-10 flex items-center justify-center border rounded-lg transition-colors ${waButtonClass}`}
          onClick={sendWhatsapp}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <button
          className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${order.paid ? "bg-success text-accent-fg border-success" : "hover:bg-surface-2"}`}
          onClick={() => patch({ paid: !order.paid })}>
          {order.paid ? "✓ Pagado" : "Marcar pagado"}
        </button>
        <button
          className="px-3 py-2 bg-accent text-accent-fg rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
          onClick={() => patch({ status: "DELIVERED" })}>
          ✓ Entregado
        </button>
      </div>
      )}
      {!readOnly && (
        <button
          aria-label="Cancelar pedido"
          title="Cancelar pedido (devuelve el stock)"
          className="absolute bottom-3 right-3 w-9 h-9 flex items-center justify-center rounded-lg text-danger hover:bg-danger-soft transition-colors"
          onClick={() => setConfirmCancel(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      )}
      <ConfirmDialog
        open={confirmCancel}
        title="¿Cancelar este pedido?"
        message="Se devolverá el stock al inventario."
        confirmLabel="Cancelar pedido"
        cancelLabel="Volver"
        onConfirm={() => {
          setConfirmCancel(false);
          patch({ status: "CANCELLED" });
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
