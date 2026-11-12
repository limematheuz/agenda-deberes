-- Persistencia en la nube (Supabase PostgreSQL) de bloc de notas, recordatorios, horario fijo, perfil y categorías.
create table if not exists public.agenda_preferencias (
  user_id uuid primary key references auth.users (id) on delete cascade,
  perfil jsonb not null default '{}'::jsonb,
  categorias jsonb not null default '[]'::jsonb,
  categoria_mapa jsonb not null default '{}'::jsonb,
  clases_semanales jsonb not null default '[]'::jsonb,
  mostrar_clases boolean not null default true,
  recordatorios jsonb not null default '[]'::jsonb,
  notas_bloc jsonb not null default '[]'::jsonb,
  colores_bloc jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.agenda_preferencias enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'agenda_preferencias' and policyname = 'agenda_preferencias_own'
  ) then
    create policy agenda_preferencias_own on public.agenda_preferencias
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
