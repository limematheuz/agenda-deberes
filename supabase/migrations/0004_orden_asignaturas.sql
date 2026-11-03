-- Orden propio de cada estudiante para las asignaturas del sidebar.
alter table public.asignaturas add column orden integer not null default 0;

with ordenadas as (
  select id, row_number() over (partition by user_id order by created_at, nombre) - 1 as posicion
  from public.asignaturas
)
update public.asignaturas
set orden = ordenadas.posicion
from ordenadas
where public.asignaturas.id = ordenadas.id;

create index asignaturas_user_orden_idx on public.asignaturas (user_id, orden);
