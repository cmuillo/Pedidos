import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Heladería — Pedidos",
    short_name: "Pedidos",
    description: "Pedidos en línea y panel de administración",
    start_url: "/admin/pedidos",
    scope: "/",
    display: "standalone",
    background_color: "#faf6f8",
    theme_color: "#e0689f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
