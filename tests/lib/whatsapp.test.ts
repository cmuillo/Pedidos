import { describe, it, expect } from "vitest";
import { buildOnTheWayLink, buildReceivedLink, buildNavLink } from "@/lib/whatsapp";

describe("buildOnTheWayLink", () => {
  it("builds a wa.me link with encoded message including total and sinpe", () => {
    const link = buildOnTheWayLink({
      whatsapp: "50688887777",
      customerName: "Ana",
      code: "ABC123",
      type: "DELIVERY",
      items: [{ nameSnapshot: "Vainilla", qty: 2, unitPrice: 1000 }],
      totalColones: 2000,
      sinpePhone: "88880000",
    });
    expect(link.startsWith("https://wa.me/50688887777?text=")).toBe(true);
    const decoded = decodeURIComponent(link.split("text=")[1]);
    expect(decoded).toContain("camino");
    expect(decoded).toContain("ABC123");
    expect(decoded).toContain("Vainilla");
    expect(decoded).toContain("₡2.000");
    expect(decoded).toContain("a este número");
    expect(decoded).toContain("Muchas gracias");
  });

  it("uses a pickup greeting for PICKUP orders", () => {
    const link = buildOnTheWayLink({
      whatsapp: "50688887777",
      customerName: "Ana",
      code: "PCK001",
      type: "PICKUP",
      items: [{ nameSnapshot: "Coco", qty: 1, unitPrice: 700 }],
      totalColones: 700,
      sinpePhone: null,
    });
    const decoded = decodeURIComponent(link.split("text=")[1]);
    expect(decoded).toContain("retires");
    expect(decoded).not.toContain("camino");
  });
  it("omits the payment/SINPE line when includePayment is false", () => {
    const link = buildOnTheWayLink({
      whatsapp: "50688887777",
      customerName: "Ana",
      code: "ABC123",
      type: "DELIVERY",
      items: [{ nameSnapshot: "Vainilla", qty: 2, unitPrice: 1000 }],
      totalColones: 2000,
      sinpePhone: "88880000",
      includePayment: false,
    });
    const decoded = decodeURIComponent(link.split("text=")[1]);
    expect(decoded).toContain("camino");
    expect(decoded).not.toContain("a este número");
    expect(decoded).not.toContain("SINPE");
  });
});

describe("buildReceivedLink", () => {
  it("builds a payment-request message with items, total and receipt request", () => {
    const link = buildReceivedLink({
      whatsapp: "50688887777",
      customerName: "Ana",
      code: "ABC123",
      items: [{ nameSnapshot: "Vainilla", qty: 2, unitPrice: 1000 }],
      totalColones: 2000,
    });
    expect(link.startsWith("https://wa.me/50688887777?text=")).toBe(true);
    const decoded = decodeURIComponent(link.split("text=")[1]);
    expect(decoded).toContain("Hemos recibido tu pedido #ABC123");
    expect(decoded).toContain("Vainilla");
    expect(decoded).toContain("₡2.000");
    expect(decoded).toContain("comprobante a este mismo chat");
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
      code: "XYZ999",
      type: "DELIVERY",
      items: [{ nameSnapshot: "Vainilla", qty: 1, unitPrice: 500 }],
      totalColones: 500,
      sinpePhone: null,
    });
    const decoded = decodeURIComponent(link.split("text=")[1]);
    expect(decoded).not.toContain("SINPE");
  });
});
