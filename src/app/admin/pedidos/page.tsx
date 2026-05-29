"use client";
import { useCallback, useEffect, useState } from "react";
import OrderCard from "@/components/OrderCard";
import { haversineMeters } from "@/lib/distance";

type Pos = { lat: number; lng: number };

export default function PedidosPage() {
  const [tab, setTab] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [pickup, setPickup] = useState<any[]>([]);
  const [delivery, setDelivery] = useState<any[]>([]);
  const [sinpe, setSinpe] = useState<string | null>(null);
  const [shop, setShop] = useState<Pos | null>(null);
  const [here, setHere] = useState<Pos | null>(null);

  // Track the admin/driver's live location to measure real distances.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (geo) => {
        setHere({ lat: geo.coords.latitude, lng: geo.coords.longitude });
      },
      () => { /* permission denied or unavailable: fall back to shop location */ },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const load = useCallback(async () => {
    const [oRes, sRes] = await Promise.all([
      fetch("/api/admin/orders?status=PENDING", { cache: "no-store" }),
      fetch("/api/admin/settings", { cache: "no-store" }),
    ]);
    if (oRes.ok) {
      const data = await oRes.json();
      setPickup(data.pickup ?? []);
      setDelivery(data.delivery ?? []);
      setShop(data.shopLat != null && data.shopLng != null ? { lat: data.shopLat, lng: data.shopLng } : null);
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

  // Origin for distance: live location when available, otherwise the registered shop.
  const origin = here ?? shop;
  const deliverySorted = delivery
    .map((o) => {
      const dist = origin && o.lat != null && o.lng != null
        ? haversineMeters(origin.lat, origin.lng, o.lat, o.lng)
        : null;
      return { ...o, distanceMeters: dist };
    })
    .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));

  const orders = tab === "PICKUP" ? pickup : deliverySorted;

  return (
    <div className="space-y-4">
      {tab === "DELIVERY" && delivery.length > 0 && (
        <p className="text-xs text-muted">
          {here ? "📍 Distancias desde tu ubicación actual" : "🏪 Distancias desde la tienda (activa el GPS para distancias en vivo)"}
        </p>
      )}
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
