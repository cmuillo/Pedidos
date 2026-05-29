# App Web Heladería — Documento de Diseño

**Fecha:** 2026-05-29
**Estado:** Aprobado para implementación

## 1. Resumen

App web responsiva (mobile-first) para una heladería. Tiene dos caras:

- **Menú público del cliente**: accesible por un link compartido. Muestra logo y nombre del negocio, los sabores disponibles con precio en colones y stock en vivo. El cliente arma su pedido y lo cierra como **Recoger** (nombre + WhatsApp) o **Express/Delivery** (nombre + WhatsApp + ubicación en mapa + referencias).
- **Portal admin**: gestión de inventario, pedidos (ordenados en tabs Recoger y Express), información de la empresa, activar/desactivar Express y reportes básicos.

El inventario se descuenta en vivo al confirmar cada pedido para evitar sobreventa.

## 2. Decisiones clave

- **Alcance**: una sola heladería (un solo admin, un solo menú).
- **Stack**: Next.js (App Router) full-stack + PostgreSQL + Prisma + Tailwind CSS.
- **Auth**: login único de admin (NextAuth, credenciales).
- **Mapas**: OpenStreetMap + Leaflet (gratis, sin tarjeta). Los botones "navegar" abren Google Maps por link (gratis).
- **Ubicación del cliente (Express)**: pin en mapa + campo de texto con referencias.
- **Catálogo**: cada sabor es un producto independiente con su propio precio y stock.
- **Pago SINPE**: se confirma manualmente en el admin (toggle "pagado"). El cliente envía el comprobante por WhatsApp.
- **Actualización en vivo**: polling cada ~5s en el menú del cliente y en la lista de pedidos del admin.
- **Imágenes**: solo logo de la empresa (sin fotos de producto). Logo guardado como base64 en la base de datos.
- **Reportes**: total vendido y productos más vendidos, filtrables por rango de fechas. Solo cuentan pedidos marcados como pagados.
- **Despliegue**: Railway (servicio web + plugin PostgreSQL).

## 3. Arquitectura

```
[Cliente móvil] --HTTP--> [Next.js App Router] --Prisma--> [PostgreSQL]
   /  (menú público)        - Server Components / API Routes
   /admin (portal)          - NextAuth (sesión admin)
                            - Polling cada ~5s para stock y pedidos
[Admin móvil/desktop] -----^
```

- Una sola aplicación Next.js sirve frontend y API.
- Server Components para render inicial; rutas/handlers para mutaciones (crear pedido, CRUD productos, settings, toggles).
- Polling del lado del cliente (SWR o fetch con `setInterval`) para refrescar stock y pedidos.

## 4. Modelo de datos (Prisma)

```prisma
model BusinessSettings {
  id              Int      @id @default(1)
  name            String
  logoBase64      String?  @db.Text
  deliveryEnabled Boolean  @default(true)
  shopLat         Float?
  shopLng         Float?
  sinpePhone      String?
  whatsappFrom    String?
  updatedAt       DateTime @updatedAt
}

model Product {
  id            String      @id @default(cuid())
  name          String
  priceColones  Int
  stock         Int         @default(0)
  active        Boolean     @default(true)
  sortOrder     Int         @default(0)
  createdAt     DateTime    @default(now())
  orderItems    OrderItem[]
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

Notas:
- `nameSnapshot` y `unitPrice` en `OrderItem` congelan el nombre y precio al momento de la compra (los reportes y el historial no cambian si luego se edita el producto).
- `distanceMeters` se calcula y guarda al crear un pedido Express (Haversine desde `shopLat/shopLng`).

## 5. Flujo del cliente (`/`)

1. Header con **logo + nombre** del negocio.
2. Grid de productos activos: sabor, precio en ₡, stock disponible. Refresco cada ~5s.
3. Carrito: el cliente elige cantidades; no puede exceder el stock mostrado.
4. Checkout, dos opciones:
   - **Recoger**: nombre + WhatsApp.
   - **Express** (visible solo si `deliveryEnabled = true`): nombre + WhatsApp + **pin en mapa (Leaflet/OSM)** + campo de referencias de la dirección.
5. Al confirmar:
   - Transacción Prisma: relee stock, valida que cada item tenga stock suficiente, **descuenta** y crea `Order` + `OrderItem`.
   - Si algún producto quedó sin stock, se rechaza con mensaje claro indicando qué producto.
   - Calcula `totalColones`; para Express calcula y guarda `distanceMeters`.
6. Pantalla de confirmación con el código del pedido y resumen.

## 6. Flujo del admin (`/admin`)

Login único. Secciones:

### 6.1 Pedidos (`/admin/pedidos`)
Dos tabs:
- **Recoger** (`PICKUP`): orden por más reciente.
- **Express** (`DELIVERY`): ordenados por **distancia ascendente** (más cercano primero).

Cada pedido muestra: cliente, items, total ₡, estado, pagado. Botones por pedido:
1. **Navegar** → `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG` (abre Google Maps).
2. **WhatsApp** → `https://wa.me/<numero>?text=<mensaje>` con mensaje precargado: aviso de "ya vamos en camino", resumen del pedido, total en ₡ y solicitud de comprobante SINPE.
3. **Marcar pagado** (toggle `paid`).
4. **Entregado** → cambia `status` a `DELIVERED` y cierra el ciclo.

Refresco cada ~5s.

### 6.2 Inventario (`/admin/inventario`)
CRUD de productos: nombre, precio (₡), stock, activo, orden.

### 6.3 Empresa (`/admin/empresa`)
Editar: nombre, subir logo, teléfono SINPE, número de WhatsApp emisor, ubicación de la tienda (pin en mapa para `shopLat/shopLng`), y **toggle Activar/Desactivar Express**.

### 6.4 Reportes (`/admin/reportes`)
- Filtro por rango: **Hoy / Semana / Mes / Personalizado**.
- Métricas (solo pedidos con `paid = true` dentro del rango):
  - **Total vendido (₡)**.
  - **Productos más vendidos** (ranking por unidades, agregando `OrderItem.qty`).
- Implementado con consultas agregadas en PostgreSQL.

## 7. Manejo de errores y concurrencia

- Descuento de stock dentro de **transacción Prisma** con verificación previa, para evitar que dos clientes compren la última unidad.
- Validación de formularios:
  - WhatsApp en formato válido de Costa Rica.
  - Pin obligatorio en Express.
  - Cantidades > 0 y ≤ stock.
- Estados vacíos y mensajes claros ("Producto agotado", "Sin pedidos todavía").
- Manejo de errores de red en el polling (reintenta silenciosamente).

## 8. Pruebas

- **Unitarias**: cálculo de total del pedido, distancia Haversine, validación de stock, formateo de moneda ₡.
- **Integración**: handler de creación de pedido (descuenta stock correctamente, rechaza si insuficiente, calcula distancia en Express); agregaciones de reportes.
- **E2E ligero (opcional)**: flujo de pedido Recoger y Express; toggles del admin.

## 9. Despliegue (Railway)

- Servicio web Next.js + plugin PostgreSQL.
- Variables de entorno: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, credenciales admin iniciales para el seed.
- Arranque: `prisma migrate deploy` + seed inicial (fila `BusinessSettings`, `AdminUser`).
- Build de producción de Next.js.

## 10. Fuera de alcance (YAGNI)

- Multi-negocio / multi-tenant.
- Múltiples usuarios admin / roles.
- Integración de pago automática (pasarela).
- Fotos de producto.
- Notificaciones push / tiempo real con WebSockets (se usa polling).
- Tracking de repartidor en vivo.
