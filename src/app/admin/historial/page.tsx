"use client";
import { useCallback, useEffect, useState } from "react";
import OrderCard from "@/components/OrderCard";

const PAGE_SIZE = 20;

export default function HistorialPage() {
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [sinpe, setSinpe] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (query: string, pageNum: number) => {
    setLoading(true);
    const params = new URLSearchParams({
      status: "DELIVERED",
      paid: "true",
      page: String(pageNum),
      pageSize: String(PAGE_SIZE),
    });
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/admin/orders?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, []);

  // Reset to page 1 whenever the search term changes (debounced).
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load(q, 1);
    }, 300);
    return () => clearTimeout(t);
  }, [q, load]);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setSinpe(s?.sinpePhone ?? null))
      .catch(() => {});
  }, []);

  function goTo(p: number) {
    const next = Math.min(Math.max(p, 1), totalPages);
    setPage(next);
    load(q, next);
  }

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

      {total > 0 && (
        <div className="flex justify-between text-sm border-b pb-2">
          <span className="text-muted">{total} pedido{total === 1 ? "" : "s"}</span>
          <span className="text-muted">Página {page} de {totalPages}</span>
        </div>
      )}

      {loading && <p className="text-muted text-sm">Cargando…</p>}

      {!loading && orders.length === 0 ? (
        <p className="text-center text-muted py-8">
          {q.trim() ? "Sin resultados para tu búsqueda" : "Aún no hay pedidos entregados y pagados"}
        </p>
      ) : (
        orders.map((o) => (
          <OrderCard key={o.id} order={o} sinpePhone={sinpe} onChange={() => load(q, page)} readOnly />
        ))
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => goTo(page - 1)}
            className="px-4 py-2 border rounded-lg text-sm font-medium bg-surface disabled:opacity-40 hover:bg-surface-2 transition-colors">
            ← Anterior
          </button>
          <span className="text-sm text-muted">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => goTo(page + 1)}
            className="px-4 py-2 border rounded-lg text-sm font-medium bg-surface disabled:opacity-40 hover:bg-surface-2 transition-colors">
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
