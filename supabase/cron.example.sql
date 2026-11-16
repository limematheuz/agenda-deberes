-- Ejecutar una vez en el SQL Editor, sustituyendo TU-PROYECTO y TU_CRON_SECRET.
-- Dos avisos diarios (UTC): 07:00 (mañana en Madrid) y 17:00 (tarde en Madrid) para tareas cuyos plazos vencen al cambiar el día.
-- Los avisos generados al crear o editar tareas en la app se envían de inmediato al instante.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('avisos-manana', '0 7 * * *', $$
  select net.http_post(
    url := 'https://TU-PROYECTO.supabase.co/functions/v1/enviar-avisos',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'TU_CRON_SECRET'),
    body := '{}'::jsonb) $$);

select cron.schedule('avisos-tarde', '0 17 * * *', $$
  select net.http_post(
    url := 'https://TU-PROYECTO.supabase.co/functions/v1/enviar-avisos',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'TU_CRON_SECRET'),
    body := '{}'::jsonb) $$);
