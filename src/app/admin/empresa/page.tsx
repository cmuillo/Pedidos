"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

type Settings = {
  id: number;
  name: string;
  logoBase64: string | null;
  deliveryEnabled: boolean;
  shopLat: number | null;
  shopLng: number | null;
  sinpePhone: string | null;
  whatsappFrom: string | null;
};

export default function EmpresaPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    if (res.ok) setS(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function save(patch: Partial<Settings>) {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) setS(await res.json());
    setSaving(false);
  }

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => save({ logoBase64: reader.result as string });
    reader.readAsDataURL(file);
  }

  if (!s) return <p className="text-muted">Cargando…</p>;

  return (
    <div className="space-y-4 max-w-lg">
      {saving && <p className="text-sm text-accent">Guardando…</p>}

      <div className="border rounded-xl p-4 space-y-3 bg-surface shadow-sm">
        <h2 className="font-semibold">Datos del negocio</h2>
        <div>
          <label className="block text-sm text-muted mb-1">Nombre del negocio</label>
          <input
            className="w-full border rounded-lg p-2 bg-surface"
            defaultValue={s.name}
            onBlur={(e) => { if (e.target.value.trim() !== s.name) save({ name: e.target.value.trim() }); }} />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Logo</label>
          {s.logoBase64 && (
            <img src={s.logoBase64} alt="logo" className="h-16 w-16 object-contain rounded mb-2" />
          )}
          <input type="file" accept="image/*" onChange={onLogo} />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Teléfono SINPE</label>
          <input
            className="w-full border rounded-lg p-2 bg-surface placeholder:text-muted" placeholder="88880000"
            defaultValue={s.sinpePhone ?? ""}
            onBlur={(e) => save({ sinpePhone: e.target.value || null })} />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">WhatsApp de la tienda (para mensajes)</label>
          <input
            className="w-full border rounded-lg p-2 bg-surface placeholder:text-muted" placeholder="50688880000"
            defaultValue={s.whatsappFrom ?? ""}
            onBlur={(e) => save({ whatsappFrom: e.target.value || null })} />
        </div>
      </div>

      <div className="border rounded-xl p-4 bg-surface shadow-sm">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 accent-accent"
            checked={s.deliveryEnabled}
            onChange={(e) => {
              setS({ ...s, deliveryEnabled: e.target.checked });
              save({ deliveryEnabled: e.target.checked });
            }} />
          <div>
            <p className="font-semibold">Express / Delivery activo</p>
            <p className="text-sm text-muted">Desactiva para aceptar solo pedidos para recoger</p>
          </div>
        </label>
      </div>

      <div className="border rounded-xl p-4 space-y-2 bg-surface shadow-sm">
        <p className="font-semibold">Ubicación de la tienda</p>
        <p className="text-sm text-muted">Usado para calcular distancias de delivery</p>
        <LocationPicker
          value={s.shopLat != null && s.shopLng != null ? { lat: s.shopLat, lng: s.shopLng } : null}
          onChange={(pos) => save({ shopLat: pos.lat, shopLng: pos.lng })} />
      </div>
    </div>
  );
}
