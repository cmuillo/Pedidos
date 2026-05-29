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

      <PasswordSection />
    </div>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) return setMsg({ type: "err", text: "La nueva contraseña debe tener al menos 8 caracteres" });
    if (next !== confirm) return setMsg({ type: "err", text: "Las contraseñas no coinciden" });
    setBusy(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) return setMsg({ type: "err", text: data.error ?? "No se pudo cambiar la contraseña" });
      setMsg({ type: "ok", text: "Contraseña actualizada" });
      setCurrent(""); setNext(""); setConfirm("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border rounded-xl p-4 space-y-3 bg-surface shadow-sm">
      <h2 className="font-semibold">Seguridad</h2>
      <p className="text-sm text-muted">Cambia la contraseña de acceso al panel</p>
      {msg && (
        <p className={`text-sm p-2 rounded-lg ${msg.type === "ok" ? "bg-success-soft text-foreground" : "bg-danger-soft text-danger"}`}>
          {msg.text}
        </p>
      )}
      <input
        type="password" autoComplete="current-password"
        className="w-full border rounded-lg p-2 bg-surface placeholder:text-muted" placeholder="Contraseña actual"
        value={current} onChange={(e) => setCurrent(e.target.value)} />
      <input
        type="password" autoComplete="new-password"
        className="w-full border rounded-lg p-2 bg-surface placeholder:text-muted" placeholder="Nueva contraseña (mín. 8)"
        value={next} onChange={(e) => setNext(e.target.value)} />
      <input
        type="password" autoComplete="new-password"
        className="w-full border rounded-lg p-2 bg-surface placeholder:text-muted" placeholder="Confirmar nueva contraseña"
        value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <button
        type="submit" disabled={busy}
        className="bg-accent text-accent-fg rounded-lg px-4 py-2 font-semibold disabled:opacity-50 hover:bg-accent-hover transition-colors">
        {busy ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
