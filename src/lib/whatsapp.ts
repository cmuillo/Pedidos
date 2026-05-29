import { formatColones } from "@/lib/money";

type MsgItem = { nameSnapshot: string; qty: number; unitPrice: number };

export function buildOnTheWayLink(params: {
  whatsapp: string;
  customerName: string;
  code: string;
  items: MsgItem[];
  totalColones: number;
  sinpePhone?: string | null;
}): string {
  const lines = params.items
    .map((i) => `• ${i.qty}x ${i.nameSnapshot} (${formatColones(i.unitPrice * i.qty)})`)
    .join("\n");
  const sinpe = params.sinpePhone
    ? `\nSi el pago es por SINPE, envía el comprobante a este número: ${params.sinpePhone}.`
    : "";
  const text =
    `Hola ${params.customerName}, ¡ya vamos en camino! 🍦\n` +
    `Pedido #${params.code}\n\n` +
    `Resumen:\n${lines}\n\n` +
    `Total: ${formatColones(params.totalColones)}${sinpe}\n\n` +
    `*¡Muchas gracias por tu compra!*`;
  return `https://wa.me/${params.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function buildNavLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
