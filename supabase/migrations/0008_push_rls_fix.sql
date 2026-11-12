-- Permite que un mismo navegador/dispositivo pueda usarse con distintas cuentas sin violar RLS en push_subscriptions.
alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_key;
create unique index if not exists push_subscriptions_user_endpoint_idx on public.push_subscriptions (user_id, endpoint);

drop policy if exists "Suscripciones propias" on public.push_subscriptions;
create policy "Suscripciones propias" on public.push_subscriptions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
