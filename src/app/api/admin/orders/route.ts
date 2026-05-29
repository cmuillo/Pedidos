import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { haversineMeters } from "@/lib/distance";

export async function GET(req: Request) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";

  const orders = await prisma.order.findMany({
    where: { status: status as any },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (status === "PENDING") {
    const settings = await prisma.businessSettings.findUnique({ where: { id: 1 } });
    const shopLat = settings?.shopLat ?? null;
    const shopLng = settings?.shopLng ?? null;

    const delivery = orders.filter((o) => o.type === "DELIVERY").map((o) => {
      const dist = shopLat !== null && shopLng !== null && o.lat !== null && o.lng !== null
        ? haversineMeters(shopLat, shopLng, o.lat, o.lng)
        : Infinity;
      return { ...o, distanceMeters: dist };
    }).sort((a, b) => a.distanceMeters - b.distanceMeters);

    const pickup = orders.filter((o) => o.type === "PICKUP");
    return NextResponse.json({ pickup, delivery });
  }

  return NextResponse.json({ orders });
}
