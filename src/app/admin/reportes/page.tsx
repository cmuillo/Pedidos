"use client";
import { useEffect, useState } from "react";
import { formatColones } from "@/lib/money";

type Report = {
  totalRevenue: number;
  totalOrders: number;
  topFlavors: { name: string; qty: number; revenue: number }[];
};

export default function ReportesPage() {
  const [preset, setPreset] = useState("today");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(p = preset, s = start, e = end) {
    if (p === "custom" && (!s || !e)) return;
    setLoading(true);
    const params = new URLSearchParams({ preset: p });
    if (p === "custom") { params.set("from", s); params.set("to", e); }
    const res = await fetch(`/api/admin/reports?${params}`, { cache: "no-store" });
    if (res.ok) setReport(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    if (preset !== "custom") load(preset);
  }, [preset]);

  const presets = [
    { id: "today", label: "Hoy" },
    { id: "week", label: "Semana" },
    { id: "month", label: "Mes" },
    { id: "custom", label: "Personalizado" },
  ];

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            className={`px-3 py-2 border rounded-lg font-medium transition-colors ${preset === p.id ? "bg-accent text-accent-fg border-accent" : "bg-surface hover:bg-surface-2"}`}
            onClick={() => setPreset(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex gap-2 items-end flex-wrap">
          <input type="date" className="border rounded-lg p-2 bg-surface" value={start} onChange={(e) => setStart(e.target.value)} />
          <input type="date" className="border rounded-lg p-2 bg-surface" value={end} onChange={(e) => setEnd(e.target.value)} />
          <button
            className="px-3 py-2 bg-accent text-accent-fg rounded-lg font-medium hover:bg-accent-hover transition-colors"
            onClick={() => load("custom", start, end)}>
            Aplicar
          </button>
        </div>
      )}

      {loading && <p className="text-muted text-sm">Cargando…</p>}

      {report && !loading && (
        <div className="space-y-3">
          <div className="border rounded-xl p-4 grid grid-cols-2 gap-4 bg-surface shadow-sm">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Total vendido</p>
              <p className="text-2xl font-bold">{formatColones(report.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Pedidos entregados</p>
              <p className="text-2xl font-bold">{report.totalOrders}</p>
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-surface shadow-sm">
            <p className="font-semibold mb-3">Resumen por sabores</p>
            {report.topFlavors.length === 0 ? (
              <p className="text-muted text-sm">Sin datos en este período</p>
            ) : (
              <>
                <ol className="space-y-2">
                  {report.topFlavors.map((t, i) => (
                    <li key={i} className="flex justify-between items-center">
                      <span className="text-sm"><span className="text-muted mr-2">{i + 1}.</span>{t.name}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium">{t.qty} u</span>
                        <span className="text-xs text-muted ml-2">{formatColones(t.revenue)}</span>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="flex justify-between items-center border-t mt-3 pt-3 font-semibold">
                  <span className="text-sm">Total</span>
                  <div className="text-right">
                    <span className="text-sm">{report.topFlavors.reduce((s, t) => s + t.qty, 0)} u</span>
                    <span className="text-sm text-accent ml-2">{formatColones(report.topFlavors.reduce((s, t) => s + t.revenue, 0))}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
