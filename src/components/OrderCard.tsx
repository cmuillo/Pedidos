"use client";
import { formatColones } from "@/lib/money";
import { buildOnTheWayLink, buildNavLink } from "@/lib/whatsapp";

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
  paid: boolean;
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
  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onChange();
  }

  const waLink = buildOnTheWayLink({
    whatsapp: order.whatsapp,
    customerName: order.customerName,
    code: order.code,
    type: order.type,
    items: order.items,
    totalColones: order.totalColones,
    sinpePhone: sinpePhone ?? null,
  });

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-surface shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold">{order.customerName}</p>
          <p className="text-xs text-muted font-mono">{order.code}</p>
          {readOnly && order.createdAt && (
            <p className="text-xs text-muted mt-0.5">
              {new Date(order.createdAt).toLocaleString("es-CR")}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="font-bold text-accent block">{formatColones(order.totalColones)}</span>
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
      <div className="flex flex-wrap gap-2 pt-1">
        {order.lat != null && order.lng != null && (
          <a
            className="px-3 py-2 border rounded-lg text-sm font-medium hover:bg-surface-2 transition-colors"
            href={buildNavLink(order.lat, order.lng)}
            target="_blank"
            rel="noreferrer">
            🗺 Navegar
          </a>
        )}
        <a
          className="px-3 py-2 border rounded-lg text-sm font-medium hover:bg-surface-2 transition-colors"
          href={waLink}
          target="_blank"
          rel="noreferrer">
          💬 WhatsApp
        </a>
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
        <button
          className="px-3 py-2 border border-danger text-danger rounded-lg text-sm font-medium hover:bg-danger-soft transition-colors"
          onClick={() => {
            if (confirm("¿Cancelar este pedido? Se devolverá el stock al inventario.")) {
              patch({ status: "CANCELLED" });
            }
          }}>
          ✕ Cancelar
        </button>
      </div>
      )}
    </div>
  );
}
