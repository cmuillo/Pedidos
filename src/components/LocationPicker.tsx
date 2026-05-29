"use client";
import { useEffect, useRef } from "react";

type Pos = { lat: number; lng: number };

export default function LocationPicker({
  value,
  onChange,
  fallback,
}: {
  value: Pos | null;
  onChange: (pos: Pos) => void;
  fallback?: Pos | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Dynamically import leaflet to avoid SSR issues
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !ref.current || mapRef.current) return;

      // Fix default marker icon missing in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Start at the selected position, else the registered shop, else San José.
      const start = value ?? fallback ?? { lat: 9.9281, lng: -84.0907 };
      const map = L.map(ref.current).setView([start.lat, start.lng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      const marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChange({ lat: p.lat, lng: p.lng });
      });
      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      mapRef.current = map;
      markerRef.current = marker;

      // Center on the user's current location when no position is preselected.
      if (!value && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (geo) => {
            if (cancelled) return;
            const here = { lat: geo.coords.latitude, lng: geo.coords.longitude };
            map.setView([here.lat, here.lng], 16);
            marker.setLatLng([here.lat, here.lng]);
            onChange(here);
          },
          () => {
            // Permission denied or unavailable: keep the default view.
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={ref} className="h-64 w-full rounded-lg border" />;
}
