import { NextResponse } from "next/server";
import { persistOrder, InsufficientStockError } from "@/lib/order";
import { isValidCRWhatsApp, normalizeCRWhatsApp } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    const { cart, type, customerName, whatsapp, addressText, lat, lng } = body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
    }
    const cartItems = cart.map((c: any) => ({
      productId: typeof c?.productId === "string" ? c.productId : "",
      qty: typeof c?.qty === "number" ? c.qty : 0,
    }));
    if (cartItems.some((c) => !c.productId || c.qty <= 0)) {
      return NextResponse.json({ error: "Artículos del carrito inválidos" }, { status: 400 });
    }
    if (!customerName?.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    if (!isValidCRWhatsApp(whatsapp ?? "")) {
      return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });
    }
    if (type !== "PICKUP" && type !== "DELIVERY") {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    if (type === "DELIVERY") {
      const settings = await prisma.businessSettings.findUnique({ where: { id: 1 } });
      if (!settings?.deliveryEnabled) {
        return NextResponse.json({ error: "Delivery deshabilitado" }, { status: 400 });
      }
      if (typeof lat !== "number" || typeof lng !== "number") {
        return NextResponse.json({ error: "Ubicación requerida" }, { status: 400 });
      }
    }

    const order = await persistOrder({
      cart: cartItems,
      type,
      customerName: customerName.trim(),
      whatsapp: normalizeCRWhatsApp(whatsapp),
      addressText: addressText ?? null,
      lat: type === "DELIVERY" ? lat : null,
      lng: type === "DELIVERY" ? lng : null,
    });

    return NextResponse.json({ code: order.code, totalColones: order.totalColones });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear el pedido" }, { status: 400 });
  }
}
