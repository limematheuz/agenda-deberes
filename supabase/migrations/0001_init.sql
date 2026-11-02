-- Backend: esquema, tipos y seguridad (RLS). Ejecutar en el SQL Editor de Supabase.
-- Si ejecutaste el esquema anterior, borra antes la tabla: drop table public.tareas;

create type public.tipo_tarea as enum ('ejercicio', 'examen', 'practica', 'otro');

create table public.asignaturas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  color text not null default '#a8b98a',
  created_at timestamptz not null default now(),
  unique (user_id, nombre)
);

create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asignatura_id uuid references public.asignaturas(id) on delete set null,
  titulo text not null,
  tipo public.tipo_tarea not null default 'ejercicio',
  fecha date not null,
  hecha boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.tareas (user_id, fecha);

alter table public.asignaturas enable row level security;
alter table public.tareas enable row level security;

create policy "Asignaturas propias" on public.asignaturas for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Tareas propias" on public.tareas for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
