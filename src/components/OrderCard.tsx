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
  items: OrderItem[];
};

export default function OrderCard({
  order,
  sinpePhone,
  onChange,
}: {
  order: Order;
  sinpePhone: string | null;
  onChange: () => void;
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
    items: order.items,
    totalColones: order.totalColones,
    sinpePhone: sinpePhone ?? null,
  });

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold">{order.customerName}</p>
          <p className="text-xs text-gray-500 font-mono">{order.code}</p>
        </div>
        <span className="font-bold text-pink-600">{formatColones(order.totalColones)}</span>
      </div>
      <ul className="text-sm text-gray-600 space-y-0.5">
        {order.items.map((i, idx) => (
          <li key={idx}>• {i.qty}× {i.nameSnapshot} ({formatColones(i.unitPrice * i.qty)})</li>
        ))}
      </ul>
      {order.addressText && (
        <p className="text-sm">📍 {order.addressText}</p>
      )}
      {order.distanceMeters != null && (
        <p className="text-xs text-gray-500">A {(order.distanceMeters / 1000).toFixed(1)} km</p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {order.lat != null && order.lng != null && (
          <a
            className="px-3 py-2 border rounded text-sm font-medium"
            href={buildNavLink(order.lat, order.lng)}
            target="_blank"
            rel="noreferrer">
            🗺 Navegar
          </a>
        )}
        <a
          className="px-3 py-2 border rounded text-sm font-medium"
          href={waLink}
          target="_blank"
          rel="noreferrer">
          💬 WhatsApp
        </a>
        <button
          className={`px-3 py-2 border rounded text-sm font-medium ${order.paid ? "bg-green-600 text-white" : ""}`}
          onClick={() => patch({ paid: !order.paid })}>
          {order.paid ? "✓ Pagado" : "Marcar pagado"}
        </button>
        <button
          className="px-3 py-2 bg-pink-600 text-white rounded text-sm font-medium"
          onClick={() => patch({ status: "DELIVERED" })}>
          ✓ Entregado
        </button>
      </div>
    </div>
  );
}
