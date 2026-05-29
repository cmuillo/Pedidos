import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
  const deny = await requireAdmin();
  if (deny) return deny;
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const deny = await requireAdmin();
  if (deny) return deny;
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const { name, priceColones, stock } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  if (typeof priceColones !== "number" || priceColones < 0) return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
  if (typeof stock !== "number" || stock < 0) return NextResponse.json({ error: "Stock inválido" }, { status: 400 });
  const product = await prisma.product.create({ data: { name: name.trim(), priceColones, stock } });
  return NextResponse.json(product, { status: 201 });
}
