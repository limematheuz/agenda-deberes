-- Ejecutar una vez en el SQL Editor, sustituyendo TU-PROYECTO y TU_CRON_SECRET.
-- Ejecuta cada 5 minutos para enviar avisos puntuales a la hora de cada tarea y el resumen mañana/tarde
-- (avisos_enviados deduplica automáticamente para no repetir notificaciones).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('enviar-avisos-frecuente', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://TU-PROYECTO.supabase.co/functions/v1/enviar-avisos',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'TU_CRON_SECRET'),
    body := '{}'::jsonb) $$);
