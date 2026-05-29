# App Web Heladería — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first, responsive web app for a single ice cream shop with a public customer menu (live stock, pickup/express orders) and an admin portal (inventory, orders by distance, business settings, reports), deployable to Railway.

**Architecture:** A single Next.js (App Router) full-stack application backed by PostgreSQL via Prisma. Server Components render initial pages; route handlers perform mutations. Stock and order lists refresh via ~5s client polling. Admin is protected by a single-user NextAuth credentials login. Maps use Leaflet/OpenStreetMap; navigation links open Google Maps.

**Tech Stack:** Next.js 14+ (App Router, TypeScript), PostgreSQL, Prisma, Tailwind CSS, NextAuth, Leaflet/react-leaflet, Vitest + React Testing Library, deployed on Railway.

**Reference spec:** `docs/superpowers/specs/2026-05-29-app-web-helados-design.md`

---

## File Structure

```
prisma/
  schema.prisma            # Data models
  seed.ts                  # Seed BusinessSettings + AdminUser
src/
  lib/
    prisma.ts              # Prisma client singleton
    money.ts               # Colones formatting
    distance.ts            # Haversine distance
    order.ts               # Total calc + order creation (transaction)
    reports.ts             # Aggregation queries
    auth.ts                # NextAuth config (admin credentials)
    whatsapp.ts            # wa.me link + message builder
    validation.ts          # WhatsApp/CR + cart validation
  app/
    layout.tsx
    page.tsx               # Public customer menu
    api/
      products/route.ts          # GET active products (public, live stock)
      orders/route.ts            # POST create order
      admin/
        products/route.ts        # GET/POST products
        products/[id]/route.ts   # PATCH/DELETE product
        settings/route.ts        # GET/PATCH business settings
        orders/route.ts          # GET orders (by type)
        orders/[id]/route.ts     # PATCH order (paid/status)
        reports/route.ts         # GET aggregated metrics
    admin/
      layout.tsx           # Auth guard + nav
      login/page.tsx
      pedidos/page.tsx
      inventario/page.tsx
      empresa/page.tsx
      reportes/page.tsx
  components/
    MenuGrid.tsx           # Product grid w/ polling
    Cart.tsx               # Cart state + checkout
    CheckoutForm.tsx       # Pickup/Express forms
    LocationPicker.tsx     # Leaflet pin picker
    OrdersTabs.tsx         # Admin orders tabs
    OrderCard.tsx          # Single order w/ action buttons
    ProductForm.tsx        # Inventory CRUD
    BusinessForm.tsx       # Company settings + Express toggle
    ReportsView.tsx        # Date filter + metrics
tests/
  lib/*.test.ts
  api/*.test.ts
```

---

## Phase 0 — Project Foundation

### Task 0.1: Scaffold Next.js app

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`, `.env.example`

- [ ] **Step 1: Scaffold with create-next-app**

Run (non-interactive):
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*" --use-npm
```
If the directory is not empty, scaffold in a temp dir and copy files in, preserving existing `README.md`, `docs/`, and `.git/`.

- [ ] **Step 2: Verify dev build boots**

Run: `npm run build`
Expected: Build succeeds (default Next.js starter compiles).

- [ ] **Step 3: Create `.env.example`**

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/helados?schema=public"
NEXTAUTH_SECRET="change-me"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="change-me"
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind and TypeScript"
```

### Task 0.2: Install dependencies and testing setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `tests/setup.ts`

- [ ] **Step 1: Install runtime + dev deps**

```bash
npm install prisma @prisma/client next-auth bcryptjs leaflet react-leaflet
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @types/leaflet @types/bcryptjs tsx
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

- [ ] **Step 3: Create `tests/setup.ts`**

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 5: Run test runner (no tests yet)**

Run: `npm test`
Expected: Exits 0 with "no test files found".

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add Prisma, NextAuth, Leaflet, and Vitest setup"
```

---

## Phase 1 — Data Layer

### Task 1.1: Prisma schema and client

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/prisma.ts`

- [ ] **Step 1: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model BusinessSettings {
  id              Int      @id @default(1)
  name            String   @default("Mi Heladería")
  logoBase64      String?  @db.Text
  deliveryEnabled Boolean  @default(true)
  shopLat         Float?
  shopLng         Float?
  sinpePhone      String?
  whatsappFrom    String?
  updatedAt       DateTime @updatedAt
}

model Product {
  id           String      @id @default(cuid())
  name         String
  priceColones Int
  stock        Int         @default(0)
  active       Boolean     @default(true)
  sortOrder    Int         @default(0)
  createdAt    DateTime    @default(now())
  orderItems   OrderItem[]
}

enum OrderType { PICKUP DELIVERY }
enum OrderStatus { PENDING DELIVERED }

model Order {
  id             String      @id @default(cuid())
  code           String      @unique
  type           OrderType
  customerName   String
  whatsapp       String
  addressText    String?
  lat            Float?
  lng            Float?
  distanceMeters Float?
  totalColones   Int
  status         OrderStatus @default(PENDING)
  paid           Boolean     @default(false)
  createdAt      DateTime    @default(now())
  items          OrderItem[]
}

model OrderItem {
  id           String  @id @default(cuid())
  orderId      String
  productId    String
  nameSnapshot String
  unitPrice    Int
  qty          Int
  order        Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product      Product @relation(fields: [productId], references: [id])
}

model AdminUser {
  id           String @id @default(cuid())
  email        String @unique
  passwordHash String
}
```

- [ ] **Step 2: Create `src/lib/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Generate client + create migration**

Run (requires a local Postgres or Railway `DATABASE_URL`):
```bash
npx prisma migrate dev --name init
```
Expected: Migration created under `prisma/migrations/`, client generated.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema and client"
```

### Task 1.2: Seed script

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Write `prisma/seed.ts`**

```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.businessSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Mi Heladería", deliveryEnabled: true },
  });

  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "change-me";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run seed**

Run: `npm run db:seed`
Expected: Exits 0; `BusinessSettings` row id=1 and one `AdminUser` exist.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add database seed for settings and admin user"
```

---

## Phase 2 — Core Library Logic (TDD)

### Task 2.1: Money formatting

**Files:**
- Create: `src/lib/money.ts`, `tests/lib/money.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { formatColones } from "@/lib/money";

describe("formatColones", () => {
  it("formats integers with thousands separator and ₡", () => {
    expect(formatColones(1000)).toBe("₡1.000");
    expect(formatColones(1500000)).toBe("₡1.500.000");
    expect(formatColones(0)).toBe("₡0");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/money.test.ts`
Expected: FAIL — cannot find module `@/lib/money`.

- [ ] **Step 3: Write minimal implementation**

```ts
export function formatColones(amount: number): string {
  return "₡" + Math.round(amount).toLocaleString("de-DE");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/money.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts tests/lib/money.test.ts
git commit -m "feat: add colones currency formatting"
```

### Task 2.2: Haversine distance

**Files:**
- Create: `src/lib/distance.ts`, `tests/lib/distance.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { haversineMeters } from "@/lib/distance";

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMeters(9.93, -84.08, 9.93, -84.08)).toBe(0);
  });

  it("computes ~1113km between 10 degrees of longitude at equator-ish", () => {
    const d = haversineMeters(9.93, -84.08, 9.93, -74.08);
    expect(d).toBeGreaterThan(1_000_000);
    expect(d).toBeLessThan(1_200_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/distance.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
export function haversineMeters(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/distance.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/distance.ts tests/lib/distance.test.ts
git commit -m "feat: add haversine distance calculation"
```

### Task 2.3: Validation helpers

**Files:**
- Create: `src/lib/validation.ts`, `tests/lib/validation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { isValidCRWhatsApp, normalizeCRWhatsApp } from "@/lib/validation";

describe("CR WhatsApp validation", () => {
  it("accepts 8-digit local numbers", () => {
    expect(isValidCRWhatsApp("88887777")).toBe(true);
  });
  it("accepts numbers with country code 506", () => {
    expect(isValidCRWhatsApp("+50688887777")).toBe(true);
  });
  it("rejects too-short numbers", () => {
    expect(isValidCRWhatsApp("1234")).toBe(false);
  });
  it("normalizes to 506XXXXXXXX digits only", () => {
    expect(normalizeCRWhatsApp("8888-7777")).toBe("50688887777");
    expect(normalizeCRWhatsApp("+506 8888 7777")).toBe("50688887777");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/validation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
export function normalizeCRWhatsApp(input: string): string {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("506") ? digits.slice(3) : digits;
  return "506" + local;
}

export function isValidCRWhatsApp(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("506") ? digits.slice(3) : digits;
  return /^[2-8]\d{7}$/.test(local);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts tests/lib/validation.test.ts
git commit -m "feat: add Costa Rica WhatsApp validation helpers"
```

### Task 2.4: Order total calculation

**Files:**
- Create: `src/lib/order.ts`, `tests/lib/order-total.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { calcTotal, type CartLine } from "@/lib/order";

describe("calcTotal", () => {
  it("sums unitPrice * qty over lines", () => {
    const lines: CartLine[] = [
      { productId: "a", nameSnapshot: "Vainilla", unitPrice: 1000, qty: 2 },
      { productId: "b", nameSnapshot: "Chocolate", unitPrice: 1500, qty: 1 },
    ];
    expect(calcTotal(lines)).toBe(3500);
  });
  it("returns 0 for empty cart", () => {
    expect(calcTotal([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/order-total.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation in `src/lib/order.ts`**

```ts
export type CartLine = {
  productId: string;
  nameSnapshot: string;
  unitPrice: number;
  qty: number;
};

export function calcTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/order-total.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/order.ts tests/lib/order-total.test.ts
git commit -m "feat: add order total calculation"
```

### Task 2.5: WhatsApp message builder

**Files:**
- Create: `src/lib/whatsapp.ts`, `tests/lib/whatsapp.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildOnTheWayLink } from "@/lib/whatsapp";

describe("buildOnTheWayLink", () => {
  it("builds a wa.me link with encoded message including total and sinpe", () => {
    const link = buildOnTheWayLink({
      whatsapp: "50688887777",
      customerName: "Ana",
      items: [{ nameSnapshot: "Vainilla", qty: 2, unitPrice: 1000 }],
      totalColones: 2000,
      sinpePhone: "88880000",
    });
    expect(link.startsWith("https://wa.me/50688887777?text=")).toBe(true);
    const decoded = decodeURIComponent(link.split("text=")[1]);
    expect(decoded).toContain("camino");
    expect(decoded).toContain("Vainilla");
    expect(decoded).toContain("₡2.000");
    expect(decoded).toContain("88880000");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/whatsapp.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { formatColones } from "@/lib/money";

type MsgItem = { nameSnapshot: string; qty: number; unitPrice: number };

export function buildOnTheWayLink(params: {
  whatsapp: string;
  customerName: string;
  items: MsgItem[];
  totalColones: number;
  sinpePhone?: string | null;
}): string {
  const lines = params.items
    .map((i) => `• ${i.qty}x ${i.nameSnapshot} (${formatColones(i.unitPrice * i.qty)})`)
    .join("\n");
  const sinpe = params.sinpePhone
    ? `\n\nPor favor envíe el comprobante SINPE al ${params.sinpePhone}.`
    : "";
  const text =
    `Hola ${params.customerName}, ¡ya vamos en camino! 🍦\n\n` +
    `Resumen de su pedido:\n${lines}\n\n` +
    `Total: ${formatColones(params.totalColones)}${sinpe}`;
  return `https://wa.me/${params.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function buildNavLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/whatsapp.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp.ts tests/lib/whatsapp.test.ts
git commit -m "feat: add WhatsApp and navigation link builders"
```

---

## Phase 3 — Order Creation Service (Transactional)

### Task 3.1: createOrder with atomic stock decrement

**Files:**
- Modify: `src/lib/order.ts`
- Create: `tests/lib/create-order.test.ts`

- [ ] **Step 1: Write the failing test (mocked Prisma transaction)**

```ts
import { describe, it, expect, vi } from "vitest";
import { buildOrderData, InsufficientStockError } from "@/lib/order";

describe("buildOrderData", () => {
  const products = [
    { id: "a", name: "Vainilla", priceColones: 1000, stock: 5, active: true },
    { id: "b", name: "Chocolate", priceColones: 1500, stock: 1, active: true },
  ];

  it("builds order data and decrements correctly when stock is sufficient", () => {
    const result = buildOrderData({
      cart: [{ productId: "a", qty: 2 }, { productId: "b", qty: 1 }],
      products,
      type: "PICKUP",
      customerName: "Ana",
      whatsapp: "50688887777",
    });
    expect(result.totalColones).toBe(3500);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ productId: "a", nameSnapshot: "Vainilla", unitPrice: 1000, qty: 2 });
    expect(result.decrements).toEqual([
      { id: "a", qty: 2 },
      { id: "b", qty: 1 },
    ]);
  });

  it("throws InsufficientStockError when qty exceeds stock", () => {
    expect(() =>
      buildOrderData({
        cart: [{ productId: "b", qty: 2 }],
        products,
        type: "PICKUP",
        customerName: "Ana",
        whatsapp: "50688887777",
      })
    ).toThrow(InsufficientStockError);
  });

  it("throws when product is inactive or missing", () => {
    expect(() =>
      buildOrderData({
        cart: [{ productId: "zzz", qty: 1 }],
        products,
        type: "PICKUP",
        customerName: "Ana",
        whatsapp: "50688887777",
      })
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/create-order.test.ts`
Expected: FAIL — `buildOrderData` / `InsufficientStockError` not exported.

- [ ] **Step 3: Add implementation to `src/lib/order.ts`**

```ts
export type OrderType = "PICKUP" | "DELIVERY";

export class InsufficientStockError extends Error {
  constructor(public productName: string) {
    super(`Stock insuficiente para ${productName}`);
    this.name = "InsufficientStockError";
  }
}

type ProductRow = {
  id: string;
  name: string;
  priceColones: number;
  stock: number;
  active: boolean;
};

export function buildOrderData(input: {
  cart: { productId: string; qty: number }[];
  products: ProductRow[];
  type: OrderType;
  customerName: string;
  whatsapp: string;
}) {
  const byId = new Map(input.products.map((p) => [p.id, p]));
  const items: CartLine[] = [];
  const decrements: { id: string; qty: number }[] = [];

  for (const line of input.cart) {
    if (line.qty <= 0) throw new Error("Cantidad inválida");
    const product = byId.get(line.productId);
    if (!product || !product.active) {
      throw new Error(`Producto no disponible: ${line.productId}`);
    }
    if (line.qty > product.stock) {
      throw new InsufficientStockError(product.name);
    }
    items.push({
      productId: product.id,
      nameSnapshot: product.name,
      unitPrice: product.priceColones,
      qty: line.qty,
    });
    decrements.push({ id: product.id, qty: line.qty });
  }

  return { items, decrements, totalColones: calcTotal(items) };
}

export function generateOrderCode(now: Date = new Date()): string {
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `H${ymd}-${rand}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/create-order.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/order.ts tests/lib/create-order.test.ts
git commit -m "feat: add order builder with stock validation"
```

### Task 3.2: persistOrder Prisma transaction wrapper

**Files:**
- Modify: `src/lib/order.ts`

- [ ] **Step 1: Add transactional persist function**

```ts
import { prisma } from "@/lib/prisma";
import { haversineMeters } from "@/lib/distance";

export async function persistOrder(input: {
  cart: { productId: string; qty: number }[];
  type: OrderType;
  customerName: string;
  whatsapp: string;
  addressText?: string | null;
  lat?: number | null;
  lng?: number | null;
}) {
  return prisma.$transaction(async (tx) => {
    const ids = input.cart.map((c) => c.productId);
    const products = await tx.product.findMany({ where: { id: { in: ids } } });

    const built = buildOrderData({
      cart: input.cart,
      products,
      type: input.type,
      customerName: input.customerName,
      whatsapp: input.whatsapp,
    });

    for (const d of built.decrements) {
      const updated = await tx.product.updateMany({
        where: { id: d.id, stock: { gte: d.qty } },
        data: { stock: { decrement: d.qty } },
      });
      if (updated.count === 0) {
        const p = products.find((x) => x.id === d.id);
        throw new InsufficientStockError(p?.name ?? d.id);
      }
    }

    let distanceMeters: number | null = null;
    if (input.type === "DELIVERY" && input.lat != null && input.lng != null) {
      const settings = await tx.businessSettings.findUnique({ where: { id: 1 } });
      if (settings?.shopLat != null && settings?.shopLng != null) {
        distanceMeters = haversineMeters(settings.shopLat, settings.shopLng, input.lat, input.lng);
      }
    }

    return tx.order.create({
      data: {
        code: generateOrderCode(),
        type: input.type,
        customerName: input.customerName,
        whatsapp: input.whatsapp,
        addressText: input.addressText ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        distanceMeters,
        totalColones: built.totalColones,
        items: { create: built.items },
      },
      include: { items: true },
    });
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/order.ts
git commit -m "feat: add transactional order persistence with atomic stock decrement"
```

---

## Phase 4 — Public API Routes

### Task 4.1: Public products endpoint

**Files:**
- Create: `src/app/api/products/route.ts`

- [ ] **Step 1: Implement GET handler**

```ts
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
    },
  });
}
```

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev` then in another shell: `curl http://localhost:3000/api/products`
Expected: JSON with `products` array and `business` object.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/products/route.ts
git commit -m "feat: add public products API with live stock"
```

### Task 4.2: Create order endpoint

**Files:**
- Create: `src/app/api/orders/route.ts`

- [ ] **Step 1: Implement POST handler**

```ts
import { NextResponse } from "next/server";
import { persistOrder, InsufficientStockError } from "@/lib/order";
import { isValidCRWhatsApp, normalizeCRWhatsApp } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cart, type, customerName, whatsapp, addressText, lat, lng } = body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
    }
    if (!customerName?.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    if (!isValidCRWhatsApp(whatsapp ?? "")) {
      return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });
    }
    if (type !== "PICKUP" && type !== "DELIVERY") {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    if (type === "DELIVERY") {
      const settings = await prisma.businessSettings.findUnique({ where: { id: 1 } });
      if (!settings?.deliveryEnabled) {
        return NextResponse.json({ error: "Delivery deshabilitado" }, { status: 400 });
      }
      if (typeof lat !== "number" || typeof lng !== "number") {
        return NextResponse.json({ error: "Ubicación requerida" }, { status: 400 });
      }
    }

    const order = await persistOrder({
      cart: cart.map((c: any) => ({ productId: c.productId, qty: c.qty })),
      type,
      customerName: customerName.trim(),
      whatsapp: normalizeCRWhatsApp(whatsapp),
      addressText: addressText ?? null,
      lat: type === "DELIVERY" ? lat : null,
      lng: type === "DELIVERY" ? lng : null,
    });

    return NextResponse.json({ code: order.code, totalColones: order.totalColones });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear el pedido" }, { status: 400 });
  }
}
```

- [ ] **Step 2: Manual smoke test**

Run with dev server up:
```bash
curl -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" -d '{"cart":[{"productId":"<id>","qty":1}],"type":"PICKUP","customerName":"Ana","whatsapp":"88887777"}'
```
Expected: `{ "code": "...", "totalColones": ... }` and product stock decremented.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/orders/route.ts
git commit -m "feat: add order creation API with validation"
```

---

## Phase 5 — Authentication

### Task 5.1: NextAuth admin credentials

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create `src/lib/auth.ts`**

```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.adminUser.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email };
      },
    }),
  ],
};
```

- [ ] **Step 2: Create route handler `src/app/api/auth/[...nextauth]/route.ts`**

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts "src/app/api/auth/[...nextauth]/route.ts"
git commit -m "feat: add NextAuth admin credentials authentication"
```

### Task 5.2: Admin layout auth guard + login page

**Files:**
- Create: `src/app/admin/layout.tsx`, `src/app/admin/login/page.tsx`, `src/components/Providers.tsx`

- [ ] **Step 1: Create `src/components/Providers.tsx`**

```tsx
"use client";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 2: Wrap root layout with Providers**

In `src/app/layout.tsx`, wrap `{children}` with `<Providers>...</Providers>` (import from `@/components/Providers`).

- [ ] **Step 3: Create `src/app/admin/login/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) setError("Credenciales inválidas");
    else router.push("/admin/pedidos");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">Acceso admin</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input className="w-full border rounded p-3" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded p-3" type="password" placeholder="Contraseña"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-pink-600 text-white rounded p-3 font-semibold">Entrar</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/app/admin/layout.tsx` with guard + nav**

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  // Login page renders without session; guard handled per-page via this check
  if (!session) {
    redirect("/admin/login");
  }
  return (
    <div className="min-h-screen">
      <nav className="flex gap-4 p-4 border-b overflow-x-auto text-sm">
        <Link href="/admin/pedidos">Pedidos</Link>
        <Link href="/admin/inventario">Inventario</Link>
        <Link href="/admin/empresa">Empresa</Link>
        <Link href="/admin/reportes">Reportes</Link>
      </nav>
      <main className="p-4">{children}</main>
    </div>
  );
}
```

Note: The login page lives at `/admin/login`, which is under this layout. To avoid a redirect loop, move login outside the guard: create `src/app/admin/login/layout.tsx` that renders `{children}` directly (no session check), OR relocate login to `/login`. **This plan uses `/login` at `src/app/login/page.tsx` instead** — update the file path in Step 3 to `src/app/login/page.tsx` and the redirect target in `auth.ts` `pages.signIn` to `/login`, and login redirect target to `/admin/pedidos`.

- [ ] **Step 5: Apply the `/login` relocation**

- Move login page to `src/app/login/page.tsx`.
- In `src/lib/auth.ts`, set `pages: { signIn: "/login" }`.
- In `src/app/admin/layout.tsx`, `redirect("/login")`.

- [ ] **Step 6: Type-check + manual test**

Run: `npx tsc --noEmit` then `npm run dev`, visit `/admin/pedidos` (should redirect to `/login`), log in with seeded creds.
Expected: Redirect works; after login lands on `/admin/pedidos`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add admin auth guard and login page"
```

---

## Phase 6 — Admin API Routes

### Task 6.1: Admin auth helper

**Files:**
- Create: `src/lib/requireAdmin.ts`

- [ ] **Step 1: Implement helper**

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return !!session;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/requireAdmin.ts
git commit -m "feat: add requireAdmin session helper"
```

### Task 6.2: Products admin CRUD API

**Files:**
- Create: `src/app/api/admin/products/route.ts`, `src/app/api/admin/products/[id]/route.ts`

- [ ] **Step 1: Implement list + create (`route.ts`)**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const products = await prisma.product.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json();
  if (!b.name?.trim() || typeof b.priceColones !== "number" || typeof b.stock !== "number") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const product = await prisma.product.create({
    data: {
      name: b.name.trim(),
      priceColones: b.priceColones,
      stock: b.stock,
      active: b.active ?? true,
      sortOrder: b.sortOrder ?? 0,
    },
  });
  return NextResponse.json({ product });
}
```

- [ ] **Step 2: Implement update + delete (`[id]/route.ts`)**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json();
  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(b.name !== undefined ? { name: String(b.name).trim() } : {}),
      ...(b.priceColones !== undefined ? { priceColones: b.priceColones } : {}),
      ...(b.stock !== undefined ? { stock: b.stock } : {}),
      ...(b.active !== undefined ? { active: b.active } : {}),
      ...(b.sortOrder !== undefined ? { sortOrder: b.sortOrder } : {}),
    },
  });
  return NextResponse.json({ product });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/products
git commit -m "feat: add admin products CRUD API"
```

### Task 6.3: Settings admin API

**Files:**
- Create: `src/app/api/admin/settings/route.ts`

- [ ] **Step 1: Implement GET + PATCH**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const settings = await prisma.businessSettings.findUnique({ where: { id: 1 } });
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json();
  const settings = await prisma.businessSettings.update({
    where: { id: 1 },
    data: {
      ...(b.name !== undefined ? { name: String(b.name).trim() } : {}),
      ...(b.logoBase64 !== undefined ? { logoBase64: b.logoBase64 } : {}),
      ...(b.deliveryEnabled !== undefined ? { deliveryEnabled: b.deliveryEnabled } : {}),
      ...(b.shopLat !== undefined ? { shopLat: b.shopLat } : {}),
      ...(b.shopLng !== undefined ? { shopLng: b.shopLng } : {}),
      ...(b.sinpePhone !== undefined ? { sinpePhone: b.sinpePhone } : {}),
      ...(b.whatsappFrom !== undefined ? { whatsappFrom: b.whatsappFrom } : {}),
    },
  });
  return NextResponse.json({ settings });
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit`
```bash
git add src/app/api/admin/settings/route.ts
git commit -m "feat: add admin settings API with Express toggle"
```

### Task 6.4: Orders admin API

**Files:**
- Create: `src/app/api/admin/orders/route.ts`, `src/app/api/admin/orders/[id]/route.ts`

- [ ] **Step 1: Implement list by type (`route.ts`)**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const where: any = { status: "PENDING" };
  if (type === "PICKUP" || type === "DELIVERY") where.type = type;

  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy:
      type === "DELIVERY"
        ? [{ distanceMeters: "asc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }],
  });
  return NextResponse.json({ orders });
}
```

- [ ] **Step 2: Implement update paid/status (`[id]/route.ts`)**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json();
  const order = await prisma.order.update({
    where: { id: params.id },
    data: {
      ...(b.paid !== undefined ? { paid: b.paid } : {}),
      ...(b.status !== undefined ? { status: b.status } : {}),
    },
  });
  return NextResponse.json({ order });
}
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit`
```bash
git add src/app/api/admin/orders
git commit -m "feat: add admin orders API ordered by distance for delivery"
```

### Task 6.5: Reports API

**Files:**
- Create: `src/lib/reports.ts`, `src/app/api/admin/reports/route.ts`, `tests/lib/reports-range.test.ts`

- [ ] **Step 1: Write failing test for date range parsing**

```ts
import { describe, it, expect } from "vitest";
import { resolveRange } from "@/lib/reports";

describe("resolveRange", () => {
  it("returns today range for 'today'", () => {
    const { start, end } = resolveRange("today", undefined, undefined, new Date("2026-05-29T15:00:00Z"));
    expect(start.toISOString().slice(0, 10)).toBe("2026-05-29");
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });
  it("uses custom dates when provided", () => {
    const { start, end } = resolveRange("custom", "2026-05-01", "2026-05-10", new Date());
    expect(start.toISOString().slice(0, 10)).toBe("2026-05-01");
    expect(end.toISOString().slice(0, 10)).toBe("2026-05-10");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/reports-range.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/reports.ts`**

```ts
import { prisma } from "@/lib/prisma";

export type RangePreset = "today" | "week" | "month" | "custom";

export function resolveRange(
  preset: RangePreset,
  customStart?: string,
  customEnd?: string,
  now: Date = new Date()
): { start: Date; end: Date } {
  if (preset === "custom" && customStart && customEnd) {
    return { start: new Date(customStart + "T00:00:00"), end: new Date(customEnd + "T23:59:59") };
  }
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (preset === "week") start.setDate(start.getDate() - 6);
  if (preset === "month") start.setDate(start.getDate() - 29);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function getReport(start: Date, end: Date) {
  const where = { paid: true, createdAt: { gte: start, lte: end } };

  const totalAgg = await prisma.order.aggregate({
    where,
    _sum: { totalColones: true },
    _count: true,
  });

  const items = await prisma.orderItem.findMany({
    where: { order: { is: where } },
    select: { nameSnapshot: true, qty: true },
  });

  const byProduct = new Map<string, number>();
  for (const it of items) {
    byProduct.set(it.nameSnapshot, (byProduct.get(it.nameSnapshot) ?? 0) + it.qty);
  }
  const topProducts = [...byProduct.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty);

  return {
    totalColones: totalAgg._sum.totalColones ?? 0,
    orderCount: totalAgg._count,
    topProducts,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/reports-range.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement API route `src/app/api/admin/reports/route.ts`**

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { resolveRange, getReport, type RangePreset } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const preset = (searchParams.get("preset") ?? "today") as RangePreset;
  const { start, end } = resolveRange(
    preset,
    searchParams.get("start") ?? undefined,
    searchParams.get("end") ?? undefined
  );
  const report = await getReport(start, end);
  return NextResponse.json(report);
}
```

- [ ] **Step 6: Type-check + commit**

Run: `npx tsc --noEmit`
```bash
git add src/lib/reports.ts src/app/api/admin/reports/route.ts tests/lib/reports-range.test.ts
git commit -m "feat: add reports API for paid orders"
```

---

## Phase 7 — Customer UI

### Task 7.1: Menu grid with polling

**Files:**
- Create: `src/components/MenuGrid.tsx`, `src/components/CartContext.tsx`

- [ ] **Step 1: Create cart context `src/components/CartContext.tsx`**

```tsx
"use client";
import { createContext, useContext, useState } from "react";

export type CartItem = { productId: string; name: string; unitPrice: number; qty: number };
type CartCtx = {
  items: CartItem[];
  setQty: (p: Omit<CartItem, "qty">, qty: number) => void;
  clear: () => void;
};
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  function setQty(p: Omit<CartItem, "qty">, qty: number) {
    setItems((prev) => {
      const rest = prev.filter((i) => i.productId !== p.productId);
      return qty > 0 ? [...rest, { ...p, qty }] : rest;
    });
  }
  return <Ctx.Provider value={{ items, setQty, clear: () => setItems([]) }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
```

- [ ] **Step 2: Create `src/components/MenuGrid.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { formatColones } from "@/lib/money";
import { useCart } from "@/components/CartContext";

type Product = { id: string; name: string; priceColones: number; stock: number };

export default function MenuGrid({ onBusiness }: { onBusiness: (b: any) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const { items, setQty } = useCart();

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (active) {
        setProducts(data.products);
        onBusiness(data.business);
      }
    }
    load();
    const id = setInterval(load, 5000);
    return () => { active = false; clearInterval(id); };
  }, [onBusiness]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {products.map((p) => {
        const inCart = items.find((i) => i.productId === p.id)?.qty ?? 0;
        const soldOut = p.stock <= 0;
        return (
          <div key={p.id} className="border rounded-lg p-4 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <span className="font-semibold">{p.name}</span>
              <span>{formatColones(p.priceColones)}</span>
            </div>
            <span className={`text-sm ${soldOut ? "text-red-600" : "text-gray-500"}`}>
              {soldOut ? "Agotado" : `${p.stock} disponibles`}
            </span>
            <div className="flex items-center gap-2 mt-auto">
              <button disabled={inCart <= 0} className="w-9 h-9 border rounded text-lg"
                onClick={() => setQty({ productId: p.id, name: p.name, unitPrice: p.priceColones }, inCart - 1)}>−</button>
              <span className="w-8 text-center">{inCart}</span>
              <button disabled={soldOut || inCart >= p.stock} className="w-9 h-9 border rounded text-lg"
                onClick={() => setQty({ productId: p.id, name: p.name, unitPrice: p.priceColones }, inCart + 1)}>+</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit`
```bash
git add src/components/MenuGrid.tsx src/components/CartContext.tsx
git commit -m "feat: add menu grid with live stock polling and cart"
```

### Task 7.2: Location picker (Leaflet)

**Files:**
- Create: `src/components/LocationPicker.tsx`

- [ ] **Step 1: Implement client-only Leaflet picker**

```tsx
"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export default function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (pos: { lat: number; lng: number }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || mapRef.current) return;
      const start = value ?? { lat: 9.9281, lng: -84.0907 };
      const map = L.map(ref.current).setView([start.lat, start.lng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      const marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChange({ lat: p.lat, lng: p.lng });
      });
      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      mapRef.current = map;
      markerRef.current = marker;
    })();
    return () => { cancelled = true; };
  }, []);

  return <div ref={ref} className="h-64 w-full rounded-lg border" />;
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit`
```bash
git add src/components/LocationPicker.tsx
git commit -m "feat: add Leaflet location picker"
```

### Task 7.3: Checkout form

**Files:**
- Create: `src/components/CheckoutForm.tsx`

- [ ] **Step 1: Implement checkout with pickup/express modes**

```tsx
"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useCart } from "@/components/CartContext";
import { formatColones } from "@/lib/money";
import { calcTotal } from "@/lib/order";
import { isValidCRWhatsApp } from "@/lib/validation";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

export default function CheckoutForm({ deliveryEnabled }: { deliveryEnabled: boolean }) {
  const { items, clear } = useCart();
  const [type, setType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [addressText, setAddressText] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ code: string } | null>(null);

  const total = calcTotal(items.map((i) => ({ ...i, nameSnapshot: i.name })));

  async function submit() {
    setError("");
    if (items.length === 0) return setError("El carrito está vacío");
    if (!name.trim()) return setError("Ingrese su nombre");
    if (!isValidCRWhatsApp(whatsapp)) return setError("WhatsApp inválido");
    if (type === "DELIVERY" && !pos) return setError("Marque su ubicación en el mapa");

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cart: items.map((i) => ({ productId: i.productId, qty: i.qty })),
        type, customerName: name, whatsapp,
        addressText: type === "DELIVERY" ? addressText : null,
        lat: pos?.lat, lng: pos?.lng,
      }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "No se pudo crear el pedido");
    clear();
    setDone({ code: data.code });
  }

  if (done) {
    return (
      <div className="p-4 border rounded-lg text-center">
        <p className="font-semibold">¡Pedido recibido! 🍦</p>
        <p>Código: {done.code}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button className={`flex-1 p-3 rounded border ${type === "PICKUP" ? "bg-pink-600 text-white" : ""}`}
          onClick={() => setType("PICKUP")}>Recoger</button>
        {deliveryEnabled && (
          <button className={`flex-1 p-3 rounded border ${type === "DELIVERY" ? "bg-pink-600 text-white" : ""}`}
            onClick={() => setType("DELIVERY")}>Express</button>
        )}
      </div>
      <input className="w-full border rounded p-3" placeholder="Nombre"
        value={name} onChange={(e) => setName(e.target.value)} />
      <input className="w-full border rounded p-3" placeholder="WhatsApp (8 dígitos)"
        value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
      {type === "DELIVERY" && (
        <>
          <LocationPicker value={pos} onChange={setPos} />
          <input className="w-full border rounded p-3" placeholder="Referencias de la dirección"
            value={addressText} onChange={(e) => setAddressText(e.target.value)} />
        </>
      )}
      <div className="flex justify-between font-semibold">
        <span>Total</span><span>{formatColones(total)}</span>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button onClick={submit} className="w-full bg-pink-600 text-white rounded p-3 font-semibold">
        Confirmar pedido
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit`
```bash
git add src/components/CheckoutForm.tsx
git commit -m "feat: add checkout form with pickup and express modes"
```

### Task 7.4: Public page assembly

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Compose the customer page**

```tsx
"use client";
import { useState } from "react";
import { CartProvider } from "@/components/CartContext";
import MenuGrid from "@/components/MenuGrid";
import CheckoutForm from "@/components/CheckoutForm";

export default function Home() {
  const [business, setBusiness] = useState<{ name: string; logoBase64: string | null; deliveryEnabled: boolean }>({
    name: "Mi Heladería", logoBase64: null, deliveryEnabled: false,
  });

  return (
    <CartProvider>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <header className="flex flex-col items-center gap-2">
          {business.logoBase64 && (
            <img src={business.logoBase64} alt="logo" className="h-20 w-20 object-contain rounded-full" />
          )}
          <h1 className="text-2xl font-bold">{business.name}</h1>
        </header>
        <MenuGrid onBusiness={setBusiness} />
        <section className="border-t pt-4">
          <h2 className="text-lg font-semibold mb-2">Finalizar pedido</h2>
          <CheckoutForm deliveryEnabled={business.deliveryEnabled} />
        </section>
      </div>
    </CartProvider>
  );
}
```

- [ ] **Step 2: Type-check + manual test**

Run: `npx tsc --noEmit` then `npm run dev`, add products via DB/admin, place a pickup and an express order.
Expected: Stock decrements; confirmation code shown.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: assemble public customer menu page"
```

---

## Phase 8 — Admin UI

### Task 8.1: Orders tabs and cards

**Files:**
- Create: `src/components/OrderCard.tsx`, `src/app/admin/pedidos/page.tsx`

- [ ] **Step 1: Create `src/components/OrderCard.tsx`**

```tsx
"use client";
import { formatColones } from "@/lib/money";
import { buildOnTheWayLink, buildNavLink } from "@/lib/whatsapp";

type Item = { nameSnapshot: string; qty: number; unitPrice: number };
type Order = {
  id: string; code: string; type: "PICKUP" | "DELIVERY"; customerName: string;
  whatsapp: string; addressText: string | null; lat: number | null; lng: number | null;
  distanceMeters: number | null; totalColones: number; paid: boolean; items: Item[];
};

export default function OrderCard({
  order, sinpePhone, onChange,
}: { order: Order; sinpePhone: string | null; onChange: () => void }) {
  async function patch(body: any) {
    await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    onChange();
  }

  const waLink = buildOnTheWayLink({
    whatsapp: order.whatsapp, customerName: order.customerName,
    items: order.items, totalColones: order.totalColones, sinpePhone,
  });

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex justify-between">
        <span className="font-semibold">{order.customerName}</span>
        <span>{formatColones(order.totalColones)}</span>
      </div>
      <ul className="text-sm text-gray-600">
        {order.items.map((i, idx) => <li key={idx}>{i.qty}x {i.nameSnapshot}</li>)}
      </ul>
      {order.addressText && <p className="text-sm">📍 {order.addressText}</p>}
      {order.distanceMeters != null && (
        <p className="text-sm text-gray-500">A {(order.distanceMeters / 1000).toFixed(1)} km</p>
      )}
      <div className="flex flex-wrap gap-2">
        {order.lat != null && order.lng != null && (
          <a className="px-3 py-2 border rounded text-sm" target="_blank" rel="noreferrer"
            href={buildNavLink(order.lat, order.lng)}>Navegar</a>
        )}
        <a className="px-3 py-2 border rounded text-sm" target="_blank" rel="noreferrer" href={waLink}>WhatsApp</a>
        <button className={`px-3 py-2 border rounded text-sm ${order.paid ? "bg-green-600 text-white" : ""}`}
          onClick={() => patch({ paid: !order.paid })}>{order.paid ? "Pagado ✓" : "Marcar pagado"}</button>
        <button className="px-3 py-2 border rounded text-sm bg-pink-600 text-white"
          onClick={() => patch({ status: "DELIVERED" })}>Entregado</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/admin/pedidos/page.tsx`**

```tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import OrderCard from "@/components/OrderCard";

export default function PedidosPage() {
  const [tab, setTab] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [orders, setOrders] = useState<any[]>([]);
  const [sinpe, setSinpe] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [oRes, sRes] = await Promise.all([
      fetch(`/api/admin/orders?type=${tab}`, { cache: "no-store" }),
      fetch(`/api/admin/settings`, { cache: "no-store" }),
    ]);
    if (oRes.ok) setOrders((await oRes.json()).orders);
    if (sRes.ok) setSinpe((await sRes.json()).settings?.sinpePhone ?? null);
  }, [tab]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className={`flex-1 p-3 rounded border ${tab === "PICKUP" ? "bg-pink-600 text-white" : ""}`}
          onClick={() => setTab("PICKUP")}>Recoger</button>
        <button className={`flex-1 p-3 rounded border ${tab === "DELIVERY" ? "bg-pink-600 text-white" : ""}`}
          onClick={() => setTab("DELIVERY")}>Express</button>
      </div>
      {orders.length === 0 && <p className="text-gray-500">Sin pedidos todavía</p>}
      {orders.map((o) => <OrderCard key={o.id} order={o} sinpePhone={sinpe} onChange={load} />)}
    </div>
  );
}
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit`
```bash
git add src/components/OrderCard.tsx src/app/admin/pedidos/page.tsx
git commit -m "feat: add admin orders tabs with action buttons"
```

### Task 8.2: Inventory page

**Files:**
- Create: `src/app/admin/inventario/page.tsx`

- [ ] **Step 1: Implement inventory CRUD UI**

```tsx
"use client";
import { useEffect, useState } from "react";
import { formatColones } from "@/lib/money";

type Product = { id: string; name: string; priceColones: number; stock: number; active: boolean; sortOrder: number };

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: "", priceColones: 0, stock: 0 });

  async function load() {
    const res = await fetch("/api/admin/products", { cache: "no-store" });
    if (res.ok) setProducts((await res.json()).products);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.name.trim()) return;
    await fetch("/api/admin/products", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setForm({ name: "", priceColones: 0, stock: 0 });
    load();
  }
  async function patch(id: string, body: any) {
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    load();
  }
  async function remove(id: string) {
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 space-y-2">
        <h2 className="font-semibold">Nuevo sabor</h2>
        <input className="w-full border rounded p-2" placeholder="Nombre"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="w-full border rounded p-2" type="number" placeholder="Precio ₡"
          value={form.priceColones} onChange={(e) => setForm({ ...form, priceColones: Number(e.target.value) })} />
        <input className="w-full border rounded p-2" type="number" placeholder="Stock"
          value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
        <button onClick={add} className="w-full bg-pink-600 text-white rounded p-2">Agregar</button>
      </div>
      {products.map((p) => (
        <div key={p.id} className="border rounded-lg p-4 flex flex-wrap gap-2 items-center">
          <span className="font-semibold flex-1">{p.name}</span>
          <span>{formatColones(p.priceColones)}</span>
          <input className="w-20 border rounded p-1" type="number" defaultValue={p.stock}
            onBlur={(e) => patch(p.id, { stock: Number(e.target.value) })} />
          <button className={`px-2 py-1 border rounded text-sm ${p.active ? "bg-green-600 text-white" : ""}`}
            onClick={() => patch(p.id, { active: !p.active })}>{p.active ? "Activo" : "Inactivo"}</button>
          <button className="px-2 py-1 border rounded text-sm text-red-600" onClick={() => remove(p.id)}>Eliminar</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit`
```bash
git add src/app/admin/inventario/page.tsx
git commit -m "feat: add admin inventory management page"
```

### Task 8.3: Company settings page

**Files:**
- Create: `src/app/admin/empresa/page.tsx`

- [ ] **Step 1: Implement settings UI with logo upload and Express toggle**

```tsx
"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

export default function EmpresaPage() {
  const [s, setS] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    if (res.ok) setS((await res.json()).settings);
  }
  useEffect(() => { load(); }, []);

  async function save(patch: any) {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    if (res.ok) setS((await res.json()).settings);
  }

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => save({ logoBase64: reader.result });
    reader.readAsDataURL(file);
  }

  if (!s) return <p>Cargando…</p>;

  return (
    <div className="space-y-4 max-w-lg">
      <div className="border rounded-lg p-4 space-y-2">
        <label className="block text-sm font-semibold">Nombre</label>
        <input className="w-full border rounded p-2" defaultValue={s.name}
          onBlur={(e) => save({ name: e.target.value })} />
        <label className="block text-sm font-semibold">Logo</label>
        {s.logoBase64 && <img src={s.logoBase64} alt="logo" className="h-16 w-16 object-contain" />}
        <input type="file" accept="image/*" onChange={onLogo} />
        <label className="block text-sm font-semibold">Teléfono SINPE</label>
        <input className="w-full border rounded p-2" defaultValue={s.sinpePhone ?? ""}
          onBlur={(e) => save({ sinpePhone: e.target.value })} />
        <label className="block text-sm font-semibold">WhatsApp emisor</label>
        <input className="w-full border rounded p-2" defaultValue={s.whatsappFrom ?? ""}
          onBlur={(e) => save({ whatsappFrom: e.target.value })} />
      </div>

      <div className="border rounded-lg p-4 space-y-2">
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={s.deliveryEnabled}
            onChange={(e) => save({ deliveryEnabled: e.target.checked })} />
          Express / Delivery activo
        </label>
      </div>

      <div className="border rounded-lg p-4 space-y-2">
        <p className="font-semibold">Ubicación de la tienda</p>
        <LocationPicker
          value={s.shopLat != null && s.shopLng != null ? { lat: s.shopLat, lng: s.shopLng } : null}
          onChange={(pos) => save({ shopLat: pos.lat, shopLng: pos.lng })} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit`
```bash
git add src/app/admin/empresa/page.tsx
git commit -m "feat: add admin company settings with logo and Express toggle"
```

### Task 8.4: Reports page

**Files:**
- Create: `src/app/admin/reportes/page.tsx`

- [ ] **Step 1: Implement reports UI**

```tsx
"use client";
import { useEffect, useState } from "react";
import { formatColones } from "@/lib/money";

export default function ReportesPage() {
  const [preset, setPreset] = useState("today");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [report, setReport] = useState<any>(null);

  async function load() {
    const params = new URLSearchParams({ preset });
    if (preset === "custom") { params.set("start", start); params.set("end", end); }
    const res = await fetch(`/api/admin/reports?${params}`, { cache: "no-store" });
    if (res.ok) setReport(await res.json());
  }
  useEffect(() => { if (preset !== "custom") load(); }, [preset]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["today", "week", "month", "custom"].map((p) => (
          <button key={p} className={`px-3 py-2 border rounded ${preset === p ? "bg-pink-600 text-white" : ""}`}
            onClick={() => setPreset(p)}>
            {p === "today" ? "Hoy" : p === "week" ? "Semana" : p === "month" ? "Mes" : "Personalizado"}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex gap-2 items-end">
          <input type="date" className="border rounded p-2" value={start} onChange={(e) => setStart(e.target.value)} />
          <input type="date" className="border rounded p-2" value={end} onChange={(e) => setEnd(e.target.value)} />
          <button className="px-3 py-2 border rounded bg-pink-600 text-white" onClick={load}>Aplicar</button>
        </div>
      )}
      {report && (
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Total vendido</p>
            <p className="text-2xl font-bold">{formatColones(report.totalColones)}</p>
            <p className="text-sm text-gray-500">{report.orderCount} pedidos pagados</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="font-semibold mb-2">Más vendidos</p>
            {report.topProducts.length === 0 && <p className="text-gray-500 text-sm">Sin datos</p>}
            <ol className="space-y-1">
              {report.topProducts.map((t: any, i: number) => (
                <li key={i} className="flex justify-between">
                  <span>{i + 1}. {t.name}</span><span>{t.qty} u</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit`
```bash
git add src/app/admin/reportes/page.tsx
git commit -m "feat: add admin reports page"
```

---

## Phase 9 — Integration, Polish & Deploy

### Task 9.1: Full test + build pass

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All unit tests pass.

- [ ] **Step 2: Type-check and production build**

Run: `npx tsc --noEmit && npm run build`
Expected: No type errors; build succeeds.

- [ ] **Step 3: Manual end-to-end smoke**

With dev server + DB: create products, place pickup + express orders, verify stock decrement, verify orders appear in correct tab (express sorted by distance), toggle paid, mark delivered, check reports reflect paid orders, toggle Express off and confirm it disappears from the customer page.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "test: verify full build and integration"
```

### Task 9.2: Railway deployment config

**Files:**
- Create: `railway.json` (or `nixpacks.toml`), `README.md` (update with deploy steps)
- Modify: `package.json`

- [ ] **Step 1: Add a `start` that runs migrations + seed**

In `package.json` scripts:
```json
"start:prod": "prisma migrate deploy && prisma db seed && next start",
"postinstall": "prisma generate"
```
Add Prisma seed config in `package.json`:
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

- [ ] **Step 2: Create `railway.json`**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "npm run start:prod",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

- [ ] **Step 3: Update `README.md`**

Document: required env vars (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`), how to add the PostgreSQL plugin on Railway, and that the customer link is the root URL while admin is `/admin`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add Railway deployment configuration"
```

- [ ] **Step 5: Final verification**

Run: `npm run build`
Expected: Success. Confirm `railway.json` startCommand matches package scripts.

---

## Self-Review Notes

- **Spec coverage:** logo+name header (7.4, 8.3), live stock (4.1/7.1), pickup/express (7.3), maps pin + references (7.2/7.3), atomic stock decrement (3.1/3.2), orders tabs sorted by distance (6.4/8.1), nav+WhatsApp+paid+delivered buttons (8.1), Express toggle (6.3/8.3), reports paid-only by date (6.5/8.4), single admin login (5.x), Railway deploy (9.2) — all covered.
- **Type consistency:** `CartLine`, `buildOrderData`, `persistOrder`, `buildOnTheWayLink`, `buildNavLink`, `resolveRange`, `getReport` names are consistent across tasks.
- **Login loop fix:** addressed in Task 5.2 by relocating login to `/login`.
