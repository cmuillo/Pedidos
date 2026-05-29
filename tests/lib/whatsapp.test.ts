import { describe, it, expect } from "vitest";
import { buildOnTheWayLink, buildNavLink } from "@/lib/whatsapp";

describe("buildOnTheWayLink", () => {
  it("builds a wa.me link with encoded message including total and sinpe", () => {
    const link = buildOnTheWayLink({
      whatsapp: "50688887777",
      customerName: "Ana",
      items: [{ nameSnapshot: "Vainilla", qty: 2, unitPrice: 1000 }],
      totalColones: 2000,
      sinpePhone: "88880000",
    });
    expect(link.startsWith("https://wa.me/50688887777?text=")).toBe(true);
    const decoded = decodeURIComponent(link.split("text=")[1]);
    expect(decoded).toContain("camino");
    expect(decoded).toContain("Vainilla");
    expect(decoded).toContain("₡2.000");
    expect(decoded).toContain("88880000");
  });
});

describe("buildNavLink", () => {
  it("builds a Google Maps navigation URL", () => {
    const link = buildNavLink(9.9281, -84.0907);
    expect(link).toBe("https://www.google.com/maps/dir/?api=1&destination=9.9281,-84.0907");
  });

  it("handles sinpePhone absent (no SINPE line)", () => {
    const link = buildOnTheWayLink({
      whatsapp: "50688887777",
      customerName: "Ana",
      items: [{ nameSnapshot: "Vainilla", qty: 1, unitPrice: 500 }],
      totalColones: 500,
      sinpePhone: null,
    });
    const decoded = decodeURIComponent(link.split("text=")[1]);
    expect(decoded).not.toContain("SINPE");
  });
});
