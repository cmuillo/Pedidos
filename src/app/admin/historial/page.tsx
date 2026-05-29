"use client";
import { useCallback, useEffect, useState } from "react";
import OrderCard from "@/components/OrderCard";
import { formatColones } from "@/lib/money";

export default function HistorialPage() {
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [sinpe, setSinpe] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    const params = new URLSearchParams({ status: "DELIVERED", paid: "true" });
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/admin/orders?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
  }, [q, load]);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setSinpe(s?.sinpePhone ?? null))
      .catch(() => {});
  }, []);

  const total = orders.reduce((s, o) => s + o.totalColones, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold mb-1">Historial de pedidos</h1>
        <p className="text-sm text-muted">Pedidos entregados y pagados</p>
      </div>

      <input
        className="w-full border rounded-lg p-3 bg-surface placeholder:text-muted"
        placeholder="Buscar por código de pedido o nombre del cliente…"
        value={q}
        onChange={(e) => setQ(e.target.value)} />

      {orders.length > 0 && (
        <div className="flex justify-between text-sm border-b pb-2">
          <span className="text-muted">{orders.length} pedido{orders.length === 1 ? "" : "s"}</span>
          <span className="font-semibold">Total: <span className="text-accent">{formatColones(total)}</span></span>
        </div>
      )}

      {loading && <p className="text-muted text-sm">Cargando…</p>}

      {!loading && orders.length === 0 ? (
        <p className="text-center text-muted py-8">
          {q.trim() ? "Sin resultados para tu búsqueda" : "Aún no hay pedidos entregados y pagados"}
        </p>
      ) : (
        orders.map((o) => (
          <OrderCard key={o.id} order={o} sinpePhone={sinpe} onChange={() => load(q)} readOnly />
        ))
      )}
    </div>
  );
}
