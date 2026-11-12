-- Añade descripción opcional (notas y enlaces) a cada tarea.
alter table public.tareas
  add column if not exists descripcion text;
