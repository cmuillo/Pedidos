import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { id } = await params;
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const data: any = {};
  if (body.name !== undefined) data.name = String(body.name).trim().toUpperCase();
  if (body.priceColones !== undefined) data.priceColones = Number(body.priceColones);
  if (body.stock !== undefined) data.stock = Number(body.stock);
  if (body.active !== undefined) data.active = Boolean(body.active);
  const product = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(product);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
