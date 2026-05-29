import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, priceColones: true, stock: true },
  });
  const settings = await prisma.businessSettings.findUnique({ where: { id: 1 } });
  return NextResponse.json({
    products,
    business: {
      name: settings?.name ?? "Mi Heladería",
      logoBase64: settings?.logoBase64 ?? null,
      deliveryEnabled: settings?.deliveryEnabled ?? false,
      shopLat: settings?.shopLat ?? null,
      shopLng: settings?.shopLng ?? null,
    },
  });
}
