-- Suscripciones de notificaciones push (una por dispositivo/navegador).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "Suscripciones propias" on public.push_subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Registro de avisos ya enviados (evita duplicados). Sin políticas: solo la service role accede.
create table public.avisos_enviados (
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  clave text not null,
  enviado_en timestamptz not null default now(),
  primary key (tarea_id, clave)
);
alter table public.avisos_enviados enable row level security;
