# Agenda de deberes

Monorepo con arquitectura por capas en las dos partes:

- `supabase/`: backend. SQL (tablas, RLS) y una Edge Function en TypeScript (`enviar-avisos`) que manda los avisos push.
- `web/`: frontend React + TypeScript estricto + Vite, instalable como app (PWA). Gestor de paquetes: **pnpm**.

```
web/src
  domain/          entidades, reglas de urgencia, filtros y puertos (interfaces)
  infrastructure/  adaptadores: Supabase (datos y login) y push
  presentation/    hooks, componentes (cada uno con su .css), páginas y estilos globales
  app/             composición: App.tsx y container.ts
web/public/        manifest, iconos y service worker (sw.js) que muestra las notificaciones
supabase/functions/enviar-avisos/
  domain/ application/ infrastructure/ index.ts
```

## 1. Supabase (backend)
```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref TU-REF
supabase db push                       # aplica supabase/migrations (0001, 0002 y 0003)
```
En Authentication, Providers, Email, para probar rápido desactiva "Confirm email".

## 2. Claves de avisos (VAPID) y función
```bash
cd web && pnpm install
pnpm vapid                             # imprime las 3 claves; no instala nada
cd ..
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:tu@correo CRON_SECRET=<cadena-aleatoria-larga>
supabase functions deploy enviar-avisos --no-verify-jwt
```
Después abre `supabase/cron.example.sql`, sustituye `TU-PROYECTO` y `TU_CRON_SECRET`, y ejecútalo en el SQL Editor. Programa dos avisos al día (mañana y tarde, hora de Madrid).

Cuanto más cerca la fecha, más avisos: media (7 días) una vez, alta (3 días) 1 al día, crítica (1 día) y hoy 2 al día, vencida 1 al día. Los exámenes escalan 2 días antes.

## 3. Frontend en local
```bash
cd web
cp .env.example .env                   # URL, clave anon y VITE_VAPID_PUBLIC_KEY
pnpm dev
```

## 4. GitHub y Vercel
Sube el repositorio. En Vercel: **Root Directory = `web`**, y las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_VAPID_PUBLIC_KEY`. Vercel detecta pnpm por `packageManager` y `pnpm-lock.yaml`. En Supabase, Authentication, URL Configuration, pon la URL de Vercel en Site URL.

## 5. Instalar la app y activar avisos
- **Android (Chrome):** menú, "Instalar app".
- **MacBook:** Chrome, icono de instalar en la barra de direcciones; o Safari, Compartir, "Añadir al Dock".
- Abre la app instalada, inicia sesión y pulsa "Activar avisos en este dispositivo". Hazlo en cada dispositivo.

## Seguridad de dependencias
Versiones exactas fijadas, `pnpm-lock.yaml` con hashes, `minimumReleaseAge` de 14 días y scripts de instalación bloqueados por defecto. Revisa con `pnpm audit`.
# agenda-deberes
