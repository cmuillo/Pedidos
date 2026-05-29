"use client";
import { useCallback, useEffect, useState } from "react";
import OrderCard from "@/components/OrderCard";

export default function PedidosPage() {
  const [tab, setTab] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [pickup, setPickup] = useState<any[]>([]);
  const [delivery, setDelivery] = useState<any[]>([]);
  const [sinpe, setSinpe] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [oRes, sRes] = await Promise.all([
      fetch("/api/admin/orders?status=PENDING", { cache: "no-store" }),
      fetch("/api/admin/settings", { cache: "no-store" }),
    ]);
    if (oRes.ok) {
      const data = await oRes.json();
      setPickup(data.pickup ?? []);
      setDelivery(data.delivery ?? []);
    }
    if (sRes.ok) {
      const s = await sRes.json();
      setSinpe(s?.sinpePhone ?? null);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const orders = tab === "PICKUP" ? pickup : delivery;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className={`flex-1 py-3 rounded-lg border font-medium transition-colors ${tab === "PICKUP" ? "bg-accent text-accent-fg border-accent" : "bg-surface hover:bg-surface-2"}`}
          onClick={() => setTab("PICKUP")}>
          🏪 Recoger {pickup.length > 0 && <span className="ml-1 bg-surface text-accent rounded-full px-1.5 text-xs">{pickup.length}</span>}
        </button>
        <button
          className={`flex-1 py-3 rounded-lg border font-medium transition-colors ${tab === "DELIVERY" ? "bg-accent text-accent-fg border-accent" : "bg-surface hover:bg-surface-2"}`}
          onClick={() => setTab("DELIVERY")}>
          🛵 Express {delivery.length > 0 && <span className="ml-1 bg-surface text-accent rounded-full px-1.5 text-xs">{delivery.length}</span>}
        </button>
      </div>
      {orders.length === 0 ? (
        <p className="text-center text-muted py-8">Sin pedidos pendientes</p>
      ) : (
        orders.map((o) => <OrderCard key={o.id} order={o} sinpePhone={sinpe} onChange={load} />)
      )}
    </div>
  );
}
