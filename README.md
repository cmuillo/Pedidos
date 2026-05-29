# Heladería — App de Pedidos en Línea

App web móvil-first para gestión de pedidos de una heladería. Los clientes ven el menú con stock en vivo y hacen pedidos para recoger o express. El admin gestiona inventario, pedidos y configuración.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **PostgreSQL** + Prisma 6
- **Tailwind CSS v4** (tema claro/oscuro con toggle)
- **NextAuth v4** (credenciales, JWT)
- **Leaflet / OpenStreetMap** (selector de ubicación con geolocalización)

## Funcionalidades destacadas

- **Tema claro/oscuro**: botón flotante (☀️/🌙) en la esquina superior derecha. La preferencia se guarda en `localStorage` y se aplica antes del primer render (sin parpadeo). Por defecto respeta el tema del sistema.
- **Stock en vivo y verificación al confirmar**: el menú refresca el stock cada 5s. Al confirmar el pedido se vuelve a consultar el stock actual; si otra persona compró mientras tanto, el carrito se **ajusta automáticamente** a lo disponible y se muestra un aviso de qué cambió antes de enviar. El backend además decrementa el stock de forma atómica como red de seguridad.
- **Mapa con ubicación actual**: en pedidos express, el mapa intenta centrarse en la ubicación real del cliente (`navigator.geolocation`), con fallback a San José si se deniega el permiso.

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

### Opción A — PostgreSQL en Docker (recomendado)

El repositorio incluye `docker-compose.yml` que levanta solo la base de datos; la app corre local con `npm run dev`.

```bash
docker compose up -d        # Levanta PostgreSQL en localhost:5432
npm install
npx prisma migrate dev      # Crea tablas
npm run db:seed             # Crea admin inicial
npm run dev                 # App en http://localhost:3000
```

El archivo `.env` ya apunta a la base local (`postgresql://helados:helados_pass@localhost:5432/helados`).

Para detener la base de datos:

```bash
docker compose down         # Detiene el contenedor (conserva los datos)
docker compose down -v      # Detiene y borra los datos
```

### Opción B — PostgreSQL propio

```bash
cp .env.example .env        # Configura DATABASE_URL local
npm install
npx prisma migrate dev      # Crea tablas
npm run db:seed             # Crea admin inicial
npm run dev
```

Credenciales admin por defecto (definidas en `.env`): `admin@example.com` / `admin123`.
