"use client";
import { useEffect, useState } from "react";
import { formatColones } from "@/lib/money";

type Product = { id: string; name: string; priceColones: number; stock: number; active: boolean };

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: "", priceColones: "", stock: "" });
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", priceColones: "" });

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
    if (!confirm("¿Eliminar este producto?")) return;
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
        <div key={p.id} className="border rounded-xl p-4 bg-surface shadow-sm">
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
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              className="px-2 py-1 border rounded-lg text-sm hover:bg-surface-2 ml-auto transition-colors"
              onClick={() => startEdit(p)}>
              Editar
            </button>
            <button
              className="px-2 py-1 border rounded-lg text-sm text-danger hover:bg-danger-soft transition-colors"
              onClick={() => remove(p.id)}>
              Eliminar
            </button>
          </div>
          </>
          )}
        </div>
      ))}
    </div>
  );
}
