-- Mantiene los valores existentes y permite etiquetas de tarea creadas por cada estudiante.
alter table public.tareas
  alter column tipo drop default,
  alter column tipo type text using tipo::text,
  alter column tipo set default 'ejercicio';
