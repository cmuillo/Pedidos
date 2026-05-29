"use client";
import { useEffect, useState } from "react";
import { formatColones } from "@/lib/money";

type Product = { id: string; name: string; priceColones: number; stock: number; active: boolean };

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: "", priceColones: "", stock: "" });
  const [adding, setAdding] = useState(false);

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
      body: JSON.stringify({ name: form.name.trim(), priceColones: price, stock }),
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

  return (
    <div className="space-y-4 max-w-lg">
      <div className="border rounded-lg p-4 space-y-2">
        <h2 className="font-semibold">Agregar sabor</h2>
        <input
          className="w-full border rounded p-2" placeholder="Nombre del sabor"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input
          className="w-full border rounded p-2" type="number" placeholder="Precio ₡" min={0}
          value={form.priceColones} onChange={(e) => setForm({ ...form, priceColones: e.target.value })} />
        <input
          className="w-full border rounded p-2" type="number" placeholder="Stock" min={0}
          value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <button
          onClick={add}
          disabled={adding}
          className="w-full bg-pink-600 text-white rounded p-2 font-medium disabled:opacity-50">
          {adding ? "Agregando…" : "Agregar"}
        </button>
      </div>

      {products.length === 0 && (
        <p className="text-center text-gray-400 py-4">Sin productos todavía</p>
      )}

      {products.map((p) => (
        <div key={p.id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">{p.name}</span>
            <span className="text-gray-600">{formatColones(p.priceColones)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-gray-600">Stock:</label>
            <input
              className="w-20 border rounded p-1 text-sm" type="number" defaultValue={p.stock} min={0}
              onBlur={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val) && val !== p.stock) patch(p.id, { stock: val });
              }} />
            <button
              className={`px-2 py-1 border rounded text-sm ${p.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
              onClick={() => patch(p.id, { active: !p.active })}>
              {p.active ? "Activo" : "Inactivo"}
            </button>
            <button
              className="px-2 py-1 border rounded text-sm text-red-600 hover:bg-red-50 ml-auto"
              onClick={() => remove(p.id)}>
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
