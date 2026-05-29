import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { id } = await params;
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const { status, paid } = body;
  if (status !== undefined && status !== "DELIVERED" && status !== "CANCELLED") {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }
  const data: any = {};
  if (status !== undefined) data.status = status;
  if (paid !== undefined) data.paid = Boolean(paid);
  const order = await prisma.order.update({ where: { id }, data });
  return NextResponse.json(order);
}
