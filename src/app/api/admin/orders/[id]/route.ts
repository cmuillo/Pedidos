import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const deny = await requireAdmin();
  if (deny) return deny;
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const { status } = body;
  if (status !== "DELIVERED" && status !== "CANCELLED") {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }
  const order = await prisma.order.update({ where: { id: params.id }, data: { status } });
  return NextResponse.json(order);
}
