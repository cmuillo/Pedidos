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
- **Stock en vivo y verificación al confirmar**: el menú refresca el stock cada 5s y **solo muestra sabores activos con stock disponible** (los que llegan a 0 desaparecen del menú del cliente). Al confirmar el pedido se vuelve a consultar el stock actual; si otra persona compró mientras tanto, el carrito se **ajusta automáticamente** a lo disponible y se muestra un aviso de qué cambió antes de enviar. El backend además decrementa el stock de forma atómica como red de seguridad.
- **Gestión de inventario**: los nombres de los sabores se guardan **normalizados en mayúscula**. Cada sabor tiene un botón para **activar/desactivar** (lo oculta del menú sin borrarlo) y un botón **Eliminar** que borra el producto definitivamente (el historial de pedidos se conserva por el nombre guardado en cada línea). La lista se puede **filtrar** entre Todos / Activos / Inactivos.
- **Mapa con ubicación actual**: en pedidos express, el mapa del cliente intenta centrarse en su ubicación real (`navigator.geolocation`); si se deniega el permiso, usa la **ubicación registrada de la tienda** como respaldo (evita que aparezca en otra provincia). En el panel admin, las distancias de los pedidos express se calculan desde la **ubicación actual del repartidor** en vivo (con fallback a la tienda).
- **Flujo de pedido en 3 pasos**: menú → datos del cliente → confirmación (muestra el número de pedido y agradece, ~3s).
- **Mensajes de WhatsApp**: incluyen número de pedido, resumen, total, línea SINPE opcional y un cierre en negrita. El saludo cambia según el tipo de pedido (express vs. recoger).
- **Seguridad**: panel admin protegido por sesión (NextAuth + bcrypt), un único usuario admin, cambio de contraseña desde **Empresa → Seguridad** (verifica la contraseña actual) y botón de cerrar sesión.

## Seguridad

- Todas las rutas `/admin/*` y las APIs `/api/admin/*` exigen sesión activa.
- Las contraseñas se almacenan con **bcrypt** (10 rounds); nunca en texto plano.
- `NEXTAUTH_SECRET` **debe** ser un valor aleatorio fuerte en producción (NextAuth falla sin él). Genéralo con `openssl rand -base64 32`.
- Los archivos `.env*` están en `.gitignore`; nunca subas secretos al repositorio.
- El cambio de contraseña se hace desde el panel (**Empresa → Seguridad**) verificando la contraseña actual. `ADMIN_PASSWORD` solo se usa una vez, en el seed inicial.

## Variables de entorno requeridas

```env
DATABASE_URL="postgresql://user:pass@host:5432/helados?schema=public"
NEXTAUTH_SECRET="genera-un-secreto-fuerte"
NEXTAUTH_URL="https://tu-app.railway.app"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="contraseña-segura"
```

## Deploy en Railway

1. Crear proyecto en [Railway](https://railway.app).
2. Agregar el plugin **PostgreSQL** (Railway expone `DATABASE_URL` automáticamente).
3. Conectar este repositorio.
4. Configurar las variables de entorno:
   - `NEXTAUTH_SECRET` — valor aleatorio fuerte (`openssl rand -base64 32`).
   - `NEXTAUTH_URL` — la URL pública de tu app (p. ej. `https://tu-app.railway.app`).
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credenciales del admin inicial (solo para el seed).
   - `DATABASE_URL` — normalmente ya la provee el plugin de PostgreSQL.
5. Railway construye con Nixpacks (`postinstall` genera el cliente Prisma) y arranca con
   `railway.json` → `npm run start:prod`, que ejecuta:
   - `prisma migrate deploy` (aplica las migraciones)
   - `next start`
6. **Seed inicial (una sola vez)**: tras el primer deploy, ejecuta el seed para crear el
   usuario admin y la configuración base. Desde la terminal de Railway o localmente
   apuntando a la BD de producción:
   ```bash
   npm run db:seed
   ```
   > El seed **no** se ejecuta en cada arranque a propósito: así no se sobrescribe la
   > contraseña que cambies luego desde **Empresa → Seguridad**.
7. Inicia sesión en `/login` y cambia la contraseña desde **Empresa → Seguridad**.

## URLs

| URL | Descripción |
|-----|-------------|
| `/` | Menú público para clientes |
| `/login` | Acceso al panel admin |
| `/admin/pedidos` | Pedidos pendientes (recoger / express) |
| `/admin/inventario` | CRUD de sabores y stock (nombres en mayúscula, filtro activos/inactivos, activar/desactivar o eliminar) |
| `/admin/empresa` | Nombre, logo, toggle express, SINPE, ubicación, **cambio de contraseña** |
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
