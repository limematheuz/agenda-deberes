-- Las tareas existentes siguen siendo válidas: una hora nula significa «todo el día».
alter table public.tareas add column hora time without time zone;

create index on public.tareas (user_id, fecha, hora);
