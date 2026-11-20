-- Apply after the app is deployed and Vault contains nepal_metals_site_url
-- and nepal_metals_cron_secret. Never place secret values in this file.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

-- pg_net queues contain authorization headers until transmitted. Restrict access.
revoke all on schema net from public, anon, authenticated;
revoke all on all tables in schema net from public, anon, authenticated;
revoke all on schema vault from public, anon, authenticated;
revoke all on all tables in schema vault from public, anon, authenticated;

create or replace function public.invoke_market_job()
returns bigint language sql security definer set search_path = '' as $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name='nepal_metals_site_url') || '/api/cron',
    headers := jsonb_build_object('Authorization', 'Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name='nepal_metals_cron_secret')),
    timeout_milliseconds := 125000
  );
$$;
revoke all on function public.invoke_market_job() from public, anon, authenticated, service_role;

select cron.schedule('nepal-metals-quarter-hour', '*/15 * * * *',
  'select public.invoke_market_job();');
select cron.schedule('nepal-metals-cron-log-retention', '20 0 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '30 days';$$);
