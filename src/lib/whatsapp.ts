import { formatColones } from "@/lib/money";

type MsgItem = { nameSnapshot: string; qty: number; unitPrice: number };

export function buildOnTheWayLink(params: {
  whatsapp: string;
  customerName: string;
  code: string;
  type: "PICKUP" | "DELIVERY";
  items: MsgItem[];
  totalColones: number;
  sinpePhone?: string | null;
  includePayment?: boolean;
}): string {
  const includePayment = params.includePayment ?? true;
  const lines = params.items
    .map((i) => `• ${i.qty}x ${i.nameSnapshot} (${formatColones(i.unitPrice * i.qty)})`)
    .join("\n");
  const sinpe = includePayment && params.sinpePhone
    ? `\nSi el pago es por SINPE, envía el comprobante a este número.`
    : "";
  const greeting = params.type === "PICKUP"
    ? `Hola ${params.customerName}, ¡te esperamos para que lo retires! 🍦`
    : `Hola ${params.customerName}, ¡ya vamos en camino! 🍦`;
  const text =
    `${greeting}\n` +
    `Pedido #${params.code}\n\n` +
    `Resumen:\n${lines}\n\n` +
    `Total: ${formatColones(params.totalColones)}${sinpe}\n\n` +
    `*¡Muchas gracias por tu compra!*`;
  return `https://wa.me/${params.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function buildReceivedLink(params: {
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
  const sinpeNumber = (params.sinpePhone && params.sinpePhone.trim()) || "87500829";
  const text =
    `¡Hola ${params.customerName}! 🎉🍦\n` +
    `Hemos recibido tu pedido #${params.code} con:\n${lines}\n\n` +
    `Total a pagar: ${formatColones(params.totalColones)} 💵\n` +
    `Si pagás por SINPE, enviálo al número ${sinpeNumber} a nombre de María Isabel Chacon Sibaja y mandá el comprobante a este mismo chat 📲🙏\n` +
    `Si es en efectivo, solo indicánoslo. 💵\n\n` +
    `*¡Gracias por tu compra!* 💖`;
  return `https://wa.me/${params.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function buildNavLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function buildChargeLink(params: {
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
  const sinpeNumber = (params.sinpePhone && params.sinpePhone.trim()) || "87500829";
  const text =
    `¡Hola ${params.customerName}! 😊🍦\n` +
    `Queremos recordarte amablemente que tu pedido #${params.code} está pendiente de pago:\n\n` +
    `${lines}\n\n` +
    `Total: *${formatColones(params.totalColones)}* 💵\n\n` +
    `Podés pagar por SINPE al número ${sinpeNumber} y mandarnos el comprobante a este chat 📲\n` +
    `o en efectivo al momento de la entrega. 💵\n\n` +
    `*¡Gracias y esperamos poder atenderte pronto!* 🙏💖`;
  return `https://wa.me/${params.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function buildThankYouLink(params: {
  whatsapp: string;
  customerName: string;
}): string {
  const name = params.customerName?.trim();
  const greeting = name ? `¡Hola ${name}! 🎉🍦` : "¡Hola! 🎉🍦";
  const text =
    `${greeting}\n` +
    `Queremos agradecerte de corazón por tus compras 💖\n` +
    `Clientes como vos hacen posible lo que hacemos. ¡Mil gracias y te esperamos pronto! 🍨`;
  return `https://wa.me/${params.whatsapp}?text=${encodeURIComponent(text)}`;
}
