import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { haversineMeters } from "@/lib/distance";

export async function GET(req: Request) {
  const deny = await requireAdmin();
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";
  const paidParam = searchParams.get("paid");
  const q = (searchParams.get("q") ?? "").trim();

  if (status === "PENDING") {
    const orders = await prisma.order.findMany({
      where: { status: "PENDING" },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "asc" },
    });

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
    return NextResponse.json({ pickup, delivery, shopLat, shopLng });
  }

  const where: any = { status: status as any };
  if (paidParam === "true") where.paid = true;
  if (paidParam === "false") where.paid = false;
  if (q) {
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
    ];
  }

  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize")) || 20, 1), 100);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    orders,
    page,
    pageSize,
    total,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  });
}
