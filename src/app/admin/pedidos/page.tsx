"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import OrderCard from "@/components/OrderCard";
import { haversineMeters } from "@/lib/distance";
import { newOrderIds } from "@/lib/notifications";
import {
  unlockAudio,
  playBell,
  setOrderBadge,
  requestNotificationPermission,
  showOrderNotification,
} from "@/lib/alerts";

type Pos = { lat: number; lng: number };

export default function PedidosPage() {
  const [tab, setTab] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [pickup, setPickup] = useState<any[]>([]);
  const [delivery, setDelivery] = useState<any[]>([]);
  const [sinpe, setSinpe] = useState<string | null>(null);
  const [shop, setShop] = useState<Pos | null>(null);
  const [here, setHere] = useState<Pos | null>(null);
  const [alertsOn, setAlertsOn] = useState(false);

  // Ids of orders already seen, so we only alert for genuinely new ones.
  // null until the first successful load (avoids alerting for pre-existing orders).
  const seenIds = useRef<string[] | null>(null);
  const alertsOnRef = useRef(false);

  useEffect(() => {
    alertsOnRef.current = alertsOn;
  }, [alertsOn]);

  // Restore whether the user previously enabled sound/notification alerts.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("ordersAlertsOn") === "1") setAlertsOn(true);
  }, []);

  async function enableAlerts() {
    unlockAudio();
    await requestNotificationPermission();
    setAlertsOn(true);
    try {
      localStorage.setItem("ordersAlertsOn", "1");
    } catch {
      /* ignore */
    }
    playBell();
  }

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
      const pickupOrders = data.pickup ?? [];
      const deliveryOrders = data.delivery ?? [];
      setPickup(pickupOrders);
      setDelivery(deliveryOrders);
      setShop(data.shopLat != null && data.shopLng != null ? { lat: data.shopLat, lng: data.shopLng } : null);

      // Detect new orders and fire alerts (sound + system notification + badge).
      const currentIds = [...pickupOrders, ...deliveryOrders].map((o: any) => o.id);
      const fresh = newOrderIds(seenIds.current, currentIds);
      if (fresh.length > 0 && alertsOnRef.current) {
        playBell();
        void showOrderNotification(fresh.length);
      }
      seenIds.current = currentIds;
      setOrderBadge(currentIds.length);
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
    <div className="space-y-4 pb-20">
      {!alertsOn && (
        <button
          onClick={enableAlerts}
          className="w-full py-2.5 rounded-lg border border-accent bg-accent-soft text-accent font-medium text-sm hover:bg-surface-2 transition-colors">
          🔔 Activar avisos de pedidos nuevos (sonido y notificación)
        </button>
      )}
      {alertsOn && (
        <p className="text-xs text-muted text-center">🔔 Avisos activados — sonará una campanita cuando llegue un pedido nuevo.</p>
      )}
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

      {/* Sticky bottom bar: open the client order window to place an order
          directly, reusing the same flow. It returns here after confirmation. */}
      <div className="fixed bottom-0 left-0 right-0 z-10 p-3 bg-background border-t">
        <Link
          href="/?return=/admin/pedidos"
          className="block w-full text-center bg-accent text-accent-fg rounded-lg py-3.5 font-semibold text-base hover:bg-accent-hover transition-colors">
          ➕ Cargar pedido
        </Link>
      </div>
    </div>
  );
}
