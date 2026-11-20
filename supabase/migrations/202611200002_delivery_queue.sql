-- Query each metal independently: an irregular silver publication schedule must not
-- let a series of gold publications hide the latest silver rate.
create or replace function public.latest_nepal_rates()
returns setof public.price_observations language sql stable security definer set search_path=public as $$
 select p.* from public.metals m cross join lateral (
   select * from public.price_observations where metal=m.code and verification_status='verified'
   order by publication_date desc limit 2
 ) p order by p.publication_date desc,p.metal;
$$;
revoke all on function public.latest_nepal_rates() from public,anon,authenticated;
grant execute on function public.latest_nepal_rates() to service_role;

-- Only unattempted, eligible subscriptions enter a batch. Restarting a job does
-- not repeatedly scan thousands of completed deliveries or starve newer devices.
create or replace function public.pending_daily_subscriptions(p_date date,p_limit integer)
returns table(id uuid,encrypted_subscription text,metals text[]) language sql stable security definer set search_path=public as $$
 select s.id,s.encrypted_subscription,p.metals
 from public.push_subscriptions s join public.notification_preferences p on p.subscription_id=s.id
 where p.daily and not exists (
   select 1 from public.notification_deliveries d where d.subscription_id=s.id and d.publication_date=p_date and d.kind='daily'
 ) and not exists (
   select 1 from unnest(p.metals) chosen(metal) where not exists (
     select 1 from public.price_observations r where r.metal=chosen.metal and r.publication_date=p_date and r.verification_status='verified'
   )
 ) order by s.id limit greatest(1,least(p_limit,100));
$$;
revoke all on function public.pending_daily_subscriptions(date,integer) from public,anon,authenticated;
grant execute on function public.pending_daily_subscriptions(date,integer) to service_role;
