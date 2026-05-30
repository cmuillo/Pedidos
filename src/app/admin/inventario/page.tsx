"use client";
import { useEffect, useState } from "react";
import { formatColones } from "@/lib/money";
import ConfirmDialog from "@/components/ConfirmDialog";

type Product = { id: string; name: string; priceColones: number; stock: number; active: boolean };

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: "", priceColones: "", stock: "" });
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", priceColones: "" });
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  async function load() {
    const res = await fetch("/api/admin/products", { cache: "no-store" });
    if (res.ok) setProducts(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function add() {
    const price = Number(form.priceColones);
    const stock = Number(form.stock);
    if (!form.name.trim() || isNaN(price) || isNaN(stock)) return;
    setAdding(true);
    await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name.trim().toUpperCase(), priceColones: price, stock }),
    });
    setForm({ name: "", priceColones: "", stock: "" });
    setAdding(false);
    load();
  }

  async function patch(id: string, body: any) {
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setEditForm({ name: p.name, priceColones: String(p.priceColones) });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: "", priceColones: "" });
  }

  async function saveEdit(id: string) {
    const price = Number(editForm.priceColones);
    if (!editForm.name.trim() || isNaN(price)) return;
    await patch(id, { name: editForm.name.trim().toUpperCase(), priceColones: price });
    cancelEdit();
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="border rounded-xl p-4 space-y-2 bg-surface shadow-sm">
        <h2 className="font-semibold">Agregar sabor</h2>
        <input
          className="w-full border rounded-lg p-2 bg-surface placeholder:text-muted" placeholder="Nombre del sabor"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input
          className="w-full border rounded-lg p-2 bg-surface placeholder:text-muted" type="number" placeholder="Precio ₡" min={0}
          value={form.priceColones} onChange={(e) => setForm({ ...form, priceColones: e.target.value })} />
        <input
          className="w-full border rounded-lg p-2 bg-surface placeholder:text-muted" type="number" placeholder="Stock" min={0}
          value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <button
          onClick={add}
          disabled={adding}
          className="w-full bg-accent text-accent-fg rounded-lg p-2 font-medium disabled:opacity-50 hover:bg-accent-hover transition-colors">
          {adding ? "Agregando…" : "Agregar"}
        </button>
      </div>

      {products.length === 0 && (
        <p className="text-center text-muted py-4">Sin productos todavía</p>
      )}

      {products.length > 0 && (
        <div className="flex gap-2">
          {([
            ["all", "Todos"],
            ["active", "Activos"],
            ["inactive", "Inactivos"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 border rounded-lg text-sm transition-colors ${filter === key ? "bg-accent text-accent-fg border-accent" : "bg-surface text-muted hover:bg-surface-2"}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {products
        .filter((p) => filter === "all" || (filter === "active" ? p.active : !p.active))
        .map((p) => (
        <div key={p.id} className="relative border rounded-xl p-4 bg-surface shadow-sm">
          {editingId === p.id ? (
            <div className="space-y-2">
              <input
                className="w-full border rounded-lg p-2 bg-surface placeholder:text-muted" placeholder="Nombre del sabor"
                value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              <input
                className="w-full border rounded-lg p-2 bg-surface placeholder:text-muted" type="number" placeholder="Precio ₡" min={0}
                value={editForm.priceColones} onChange={(e) => setEditForm({ ...editForm, priceColones: e.target.value })} />
              <div className="flex gap-2">
                <button
                  className="flex-1 bg-accent text-accent-fg rounded-lg p-2 font-medium hover:bg-accent-hover transition-colors"
                  onClick={() => saveEdit(p.id)}>
                  Guardar
                </button>
                <button
                  className="flex-1 border rounded-lg p-2 text-muted hover:bg-surface-2 transition-colors"
                  onClick={cancelEdit}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
          <>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">{p.name}</span>
            <span className="text-muted">{formatColones(p.priceColones)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pr-20">
            <label className="text-sm text-muted">Stock:</label>
            <input
              className="w-20 border rounded-lg p-1 text-sm bg-surface" type="number" defaultValue={p.stock} min={0}
              onBlur={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val) && val !== p.stock) patch(p.id, { stock: val });
              }} />
            <button
              className={`px-2 py-1 border rounded-lg text-sm transition-colors ${p.active ? "bg-success-soft text-success border-success/40" : "bg-surface-2 text-muted"}`}
              onClick={() => patch(p.id, { active: !p.active })}>
              {p.active ? "Activo" : "Inactivo"}
            </button>
          </div>
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <button
              aria-label="Editar"
              title="Editar"
              className="w-8 h-8 flex items-center justify-center border rounded-lg hover:bg-surface-2 transition-colors"
              onClick={() => startEdit(p)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </button>
            <button
              aria-label="Eliminar"
              title="Eliminar"
              className="w-8 h-8 flex items-center justify-center border rounded-lg text-danger hover:bg-danger-soft transition-colors"
              onClick={() => setDeleteTarget(p)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
          </>
          )}
        </div>
      ))}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="¿Eliminar este producto?"
        message={
          deleteTarget
            ? `Se eliminará "${deleteTarget.name}" definitivamente. El historial de pedidos se conserva.`
            : undefined
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (deleteTarget) remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
