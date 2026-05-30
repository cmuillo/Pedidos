import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { isValidDiscount } from "@/lib/order";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { id } = await params;
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const { status, paid, discountColones } = body;
  if (status !== undefined && status !== "DELIVERED" && status !== "CANCELLED") {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  // Cancelling returns the reserved stock to inventory (only once).
  if (status === "CANCELLED") {
    try {
      const order = await prisma.$transaction(async (tx) => {
        const existing = await tx.order.findUnique({ where: { id }, include: { items: true } });
        if (!existing) throw new Error("not_found");
        if (existing.status !== "CANCELLED") {
          for (const it of existing.items) {
            if (!it.productId) continue;
            await tx.product.update({
              where: { id: it.productId },
              data: { stock: { increment: it.qty } },
            });
          }
        }
        return tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
      });
      return NextResponse.json(order);
    } catch (e) {
      if (e instanceof Error && e.message === "not_found") {
        return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
      }
      return NextResponse.json({ error: "No se pudo cancelar el pedido" }, { status: 400 });
    }
  }

  const data: any = {};
  if (status !== undefined) data.status = status;
  if (paid !== undefined) data.paid = Boolean(paid);
  if (discountColones !== undefined) {
    const existing = await prisma.order.findUnique({ where: { id }, select: { totalColones: true } });
    if (!existing) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    if (!isValidDiscount(existing.totalColones, discountColones)) {
      return NextResponse.json({ error: "El descuento no puede ser mayor al total" }, { status: 400 });
    }
    data.discountColones = discountColones;
  }
  const order = await prisma.order.update({ where: { id }, data });
  return NextResponse.json(order);
}
