# Heladería — App de Pedidos en Línea

App web móvil-first para gestión de pedidos de una heladería. Los clientes ven el menú con stock en vivo y hacen pedidos para recoger o express. El admin gestiona inventario, pedidos y configuración.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **PostgreSQL** + Prisma 6
- **Tailwind CSS v4**
- **NextAuth v4** (credenciales, JWT)
- **Leaflet / OpenStreetMap** (selector de ubicación)

## Variables de entorno requeridas

```env
DATABASE_URL="postgresql://user:pass@host:5432/helados?schema=public"
NEXTAUTH_SECRET="genera-un-secreto-fuerte"
NEXTAUTH_URL="https://tu-app.railway.app"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="contraseña-segura"
```

## Deploy en Railway

1. Crear proyecto en [Railway](https://railway.app)
2. Agregar plugin **PostgreSQL** al proyecto
3. Conectar este repositorio
4. Configurar las variables de entorno arriba
5. Railway usará `railway.json` → `npm run start:prod` que corre:
   - `prisma migrate deploy` (aplica migraciones)
   - `prisma db seed` (crea admin y configuración inicial)
   - `next start`

## URLs

| URL | Descripción |
|-----|-------------|
| `/` | Menú público para clientes |
| `/login` | Acceso al panel admin |
| `/admin/pedidos` | Pedidos pendientes (recoger / express) |
| `/admin/inventario` | CRUD de sabores y stock |
| `/admin/empresa` | Nombre, logo, toggle express, SINPE |
| `/admin/reportes` | Métricas de ventas |

## Desarrollo local

```bash
cp .env.example .env        # Configura DATABASE_URL local
npm install
npx prisma migrate dev      # Crea tablas
npm run db:seed             # Crea admin inicial
npm run dev
```
