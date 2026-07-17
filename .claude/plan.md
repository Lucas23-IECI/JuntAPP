# Plan: Migración a Next.js + Multi-tenancy + Producción

## Diagnóstico Actual

### Multi-tenancy (Manejo de múltiples Juntas de Vecinos)
**Estado: NO EXISTE.** El proyecto actual opera como si solo existiera UNA Junta de Vecinos. No hay ningún concepto de `junta_id` ni `organization_id`. Todas las tablas (profiles, transactions, polls, announcements, notifications) son globales sin segmentación por organización.

### Arquitectura actual
- Frontend: Vanilla JS + Vite (SPA estática desplegada en Vercel)
- Backend: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Sin framework, sin SSR, sin TypeScript

---

## Plan de Migración

### Fase 1: Crear proyecto Next.js desde cero

**Stack:**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS 4 (para responsividad mobile-first)
- `@supabase/ssr` para autenticación server-side
- Supabase como base de datos (se mantiene)

**Estructura de carpetas:**
```
juntapp-next/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── registro/page.tsx
│   ├── (landing)/
│   │   ├── page.tsx              (home)
│   │   ├── caracteristicas/
│   │   ├── pricing/
│   │   ├── faq/
│   │   └── contacto/
│   ├── (dashboard)/
│   │   ├── layout.tsx            (sidebar + topbar)
│   │   ├── inicio/page.tsx
│   │   ├── socios/page.tsx
│   │   ├── tesoreria/page.tsx
│   │   ├── votaciones/page.tsx
│   │   └── comunicaciones/page.tsx
│   ├── api/
│   │   ├── webhooks/payment/route.ts
│   │   └── notifications/push/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                       (botones, modales, inputs)
│   ├── dashboard/                (sidebar, topbar, cards)
│   └── landing/                  (hero, features, pricing)
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── utils.ts                  (RUT validation, formatters)
│   └── types.ts
├── middleware.ts                  (auth + tenant routing)
├── tailwind.config.ts
└── package.json
```

### Fase 2: Multi-tenancy en Supabase

**Nuevo esquema de base de datos:**

1. Crear tabla `juntas`:
```sql
CREATE TABLE public.juntas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,          -- URL-friendly (ej: "villa-los-jardines")
  address TEXT,
  comuna TEXT,
  region TEXT DEFAULT 'Valparaíso',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. Agregar `junta_id` a todas las tablas existentes:
- `profiles` → agregar `junta_id UUID REFERENCES juntas(id)`
- `transactions` → agregar `junta_id`
- `polls` → agregar `junta_id`
- `votes` → (hereda de polls via poll_id, no necesita)
- `announcements` → agregar `junta_id`
- `notifications` → (hereda de user, no necesita)

3. Actualizar RLS para filtrar por `junta_id`:
- Los usuarios solo ven datos de SU junta
- Los dirigentes solo administran SU junta

4. Flujo de onboarding:
- Al registrarse, un dirigente puede CREAR una nueva junta
- Un vecino puede UNIRSE a una junta existente (por código de invitación o búsqueda)

### Fase 3: Implementación de páginas Next.js

Mantener la misma funcionalidad pero con:
- Server Components para carga inicial (SEO + rendimiento)
- Client Components para interactividad (formularios, gráficos)
- Middleware de autenticación que proteja rutas del dashboard
- Middleware de tenant que inyecte la `junta_id` activa del usuario

**Módulos a migrar:**
1. Auth (login/registro con validación RUT)
2. Dashboard (resumen + notificaciones)
3. Socios (CRUD del padrón)
4. Tesorería (transacciones + gráficos Chart.js + documentos)
5. Votaciones (crear/votar/resultados)
6. Comunicaciones (anuncios + push notifications)

### Fase 4: Responsividad Mobile

- Tailwind CSS con breakpoints `sm:`, `md:`, `lg:`
- Sidebar colapsable → bottom navigation en mobile
- Tablas responsivas (cards en mobile, tabla en desktop)
- Modales full-screen en pantallas pequeñas
- Touch-friendly: botones mínimo 44px, spacing generoso
- Fuentes grandes y alto contraste (accesibilidad tercera edad)

### Fase 5: Producción

- Variables de entorno tipadas (`.env.local`)
- Error boundaries y estados de carga (Suspense)
- Metadata SEO en cada página
- Rate limiting en API routes
- Validación de inputs con Zod
- Configuración de Vercel para Next.js
- Service Worker para notificaciones push

---

## Entregables

El resultado será un proyecto Next.js completo en la carpeta raíz, reemplazando el frontend vanilla actual, con:
1. Multi-tenancy funcional (múltiples juntas aisladas)
2. Responsividad mobile perfecta
3. TypeScript + validación robusta
4. Listo para deploy en Vercel + Supabase Cloud
