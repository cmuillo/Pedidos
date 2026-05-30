import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
  const deny = await requireAdmin();
  if (deny) return deny;
  const settings = await prisma.businessSettings.findUnique({ where: { id: 1 } });
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const deny = await requireAdmin();
  if (deny) return deny;
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const allowed = ["name", "slogan", "logoBase64", "deliveryEnabled", "shopLat", "shopLng", "sinpePhone", "whatsappFrom", "facebookUser", "instagramUser"];
  if (typeof body.logoBase64 === "string" && body.logoBase64.length > 700_000) {
    return NextResponse.json({ error: "El logo es demasiado grande (máx. ~500 KB)" }, { status: 400 });
  }
  const data: any = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  const settings = await prisma.businessSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  return NextResponse.json(settings);
}
