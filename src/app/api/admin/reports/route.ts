import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { getDateRange } from "@/lib/reports";

export async function GET(req: Request) {
  const deny = await requireAdmin();
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const preset = (searchParams.get("preset") ?? "today") as any;
  const fromStr = searchParams.get("from") ?? undefined;
  const toStr = searchParams.get("to") ?? undefined;

  const { from, to } = getDateRange(preset, fromStr, toStr);

  const orders = await prisma.order.findMany({
    where: { status: "DELIVERED", createdAt: { gte: from, lte: to } },
    include: { items: true },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + Math.max(0, o.totalColones - (o.discountColones ?? 0)), 0);
  const totalOrders = orders.length;

  const flavorMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.productId ?? `snapshot:${item.nameSnapshot}`;
      const existing = flavorMap.get(key) ?? { name: item.nameSnapshot, qty: 0, revenue: 0 };
      existing.qty += item.qty;
      existing.revenue += item.qty * item.unitPrice;
      flavorMap.set(key, existing);
    }
  }
  const topFlavors = [...flavorMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

  // Top customers by amount spent: group delivered orders by WhatsApp number,
  // tallying units bought and net colones (total minus discount).
  const customerMap = new Map<string, { whatsapp: string; name: string; orders: number; units: number; revenue: number }>();
  for (const order of orders) {
    const key = order.whatsapp;
    const existing = customerMap.get(key) ?? { whatsapp: order.whatsapp, name: order.customerName, orders: 0, units: 0, revenue: 0 };
    existing.name = order.customerName;
    existing.orders += 1;
    existing.units += order.items.reduce((sum, i) => sum + i.qty, 0);
    existing.revenue += Math.max(0, order.totalColones - (order.discountColones ?? 0));
    customerMap.set(key, existing);
  }
  const topCustomers = [...customerMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  return NextResponse.json({ totalRevenue, totalOrders, topFlavors, topCustomers, from: from.toISOString(), to: to.toISOString() });
}
