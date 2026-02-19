# My Lifts

Aplicación de seguimiento de entrenamientos con Nuxt 4, Nuxt UI y Supabase Auth.

## Requisitos

- Node.js 20+
- pnpm (el proyecto usa `pnpm@10`)

## Variables de entorno

Copia `.env.example` a `.env` y completa:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NODE_ENV=production` (en producción)
- `NITRO_TRUST_PROXY=true` (recomendado detrás de proxy)

## Desarrollo local

```bash
pnpm install
pnpm dev
```

## Build y ejecución en producción

```bash
bun install
bun run build
bun .output/server/index.mjs
```

## Despliegue en Coolify (VPS)

Configura la app como servicio Bun/Nixpacks (sin Dockerfile custom).

### Comandos recomendados

- Install command:

```bash
bun install
```

- Build command:

```bash
bun run build
```

- Start command:

```bash
bun .output/server/index.mjs
```

### Variables en Coolify

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NODE_ENV=production`
- `NITRO_TRUST_PROXY=true`

## Configuración OAuth en Supabase

Para login con Google en producción:

1. En Supabase Auth, define `Site URL` con tu dominio público:
   - `https://tu-dominio.com`
2. En Redirect URLs, añade:
   - `https://tu-dominio.com/api/auth/callback`
3. Si pruebas con dominio temporal de Coolify, añade también ese callback temporal.

## Nota de seguridad

El cliente realiza mutaciones directas a Supabase para `sets`. Asegúrate de tener políticas RLS activas para que cada usuario solo pueda leer/escribir sus propios datos.
