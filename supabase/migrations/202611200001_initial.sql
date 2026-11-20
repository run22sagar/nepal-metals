-- Run in a new Supabase project. All application data is accessed server-side.
create extension if not exists pgcrypto;
create table public.currencies (code text primary key, name text not null);
insert into public.currencies values ('NPR','Nepalese rupee'),('INR','Indian rupee'),('USD','US dollar'),('AED','UAE dirham'),('SAR','Saudi riyal'),('QAR','Qatari riyal'),('GBP','Pound sterling'),('CAD','Canadian dollar'),('AUD','Australian dollar');
create table public.countries (code text primary key, name text not null, currency text not null references public.currencies(code));
insert into public.countries values ('NP','Nepal','NPR'),('IN','India','INR'),('US','United States','USD'),('AE','United Arab Emirates','AED'),('SA','Saudi Arabia','SAR'),('QA','Qatar','QAR'),('GB','United Kingdom','GBP'),('CA','Canada','CAD'),('AU','Australia','AUD');
create table public.metals (code text primary key, name text not null);
insert into public.metals values ('gold','Fine gold'),('silver','Silver');
create table public.admin_users (user_id uuid primary key, created_at timestamptz not null default now());
create table public.price_observations (
  id uuid primary key default gen_random_uuid(), metal text not null references public.metals(code),
  country text not null default 'NP' references public.countries(code) check (country='NP'),
  currency text not null default 'NPR' references public.currencies(code) check (currency='NPR'),
  unit text not null default 'tola' check (unit='tola'), purity text not null,
  amount numeric(16,4) not null check (amount > 0 and amount < 100000000),
  publication_date date not null, published_at timestamptz not null, fetched_at timestamptz not null default now(),
  source_name text not null, source_url text not null check (source_url ~ '^https://'),
  verification_status text not null default 'verified' check (verification_status='verified'),
  verified_by uuid not null references public.admin_users(user_id), revision integer not null default 1,
  unique (metal, publication_date), check ((published_at at time zone 'Asia/Kathmandu')::date = publication_date)
);
create index prices_by_date on public.price_observations(publication_date desc,metal);
create table public.admin_audit (
  id bigint generated always as identity primary key, actor uuid not null references public.admin_users(user_id),
  action text not null, record_id text not null, before_data jsonb, after_data jsonb, reason text not null,
  created_at timestamptz not null default now()
);
create table public.ingestion_logs (
  id bigint generated always as identity primary key, source text not null, status text not null,
  message text not null, created_at timestamptz not null default now()
);
create index ingestion_time on public.ingestion_logs(created_at desc);
create table public.spot_cache (
  id text primary key check (id='latest'), observed_at timestamptz not null, fetched_at timestamptz not null default now(),
  gold numeric not null check(gold>0), silver numeric not null check(silver>0), currencies jsonb not null,
  provider text not null default 'Metals.Dev'
);
create table public.spot_history (
  observed_at timestamptz primary key, gold numeric not null check(gold>0), silver numeric not null check(silver>0),
  currencies jsonb not null, provider text not null
);
create table public.news_sources (
  id uuid primary key default gen_random_uuid(), name text not null, url text not null unique,
  category text not null check(category in ('Nepal','Gold','Silver','Oil','Global Markets')),
  terms_url text not null, permission_note text not null, enabled boolean not null default false,
  last_status text not null default 'pending', last_checked_at timestamptz, created_at timestamptz not null default now()
);
create table public.news_articles (
  id uuid primary key default gen_random_uuid(), source_id uuid not null references public.news_sources(id),
  source_name text not null, title text not null, url text not null unique, published_at timestamptz not null,
  category text not null, enabled boolean not null default true, fetched_at timestamptz not null default now()
);
create index news_date on public.news_articles(published_at desc);
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), device_hash text not null unique, endpoint_hash text not null unique,
  encrypted_subscription text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.notification_preferences (
  subscription_id uuid primary key references public.push_subscriptions(id) on delete cascade,
  metals text[] not null check(cardinality(metals) between 1 and 2 and metals <@ array['gold','silver']::text[]),
  daily boolean not null default true, consent_at timestamptz not null default now(), consent_version text not null default '1'
);
create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  publication_date date not null, kind text not null default 'daily', status text not null default 'sending',
  created_at timestamptz not null default now(), finished_at timestamptz, received_at timestamptz,
  receipt_hash text, provider_status integer, unique(subscription_id, publication_date, kind)
);
create index delivery_time on public.notification_deliveries(created_at desc);
create table public.rate_limits (key text primary key, window_start timestamptz not null, count integer not null);
create table public.job_locks (name text primary key, locked_until timestamptz not null, owner uuid not null);

-- Price correction and its audit entry commit together. Advisory lock serializes a date/metal.
create or replace function public.publish_nepal_rate(p_actor uuid,p_metal text,p_amount numeric,p_publication_date date,p_published_at timestamptz,p_source_url text,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare old_row public.price_observations; new_row public.price_observations;
begin
  if not exists(select 1 from public.admin_users where user_id=p_actor) then raise exception 'Forbidden'; end if;
  if length(trim(p_reason)) < 10 then raise exception 'Evidence and reason required'; end if;
  if p_source_url !~ '^https://(www\.)?fenegosida\.org(/|$)' then raise exception 'Unapproved source'; end if;
  if p_published_at > now() or p_publication_date > (now() at time zone 'Asia/Kathmandu')::date then raise exception 'Future publication'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_metal||p_publication_date::text,0));
  select * into old_row from public.price_observations where metal=p_metal and publication_date=p_publication_date for update;
  if old_row.id is not null and old_row.amount=p_amount and old_row.published_at=p_published_at and old_row.source_url=p_source_url then return old_row.id; end if;
  insert into public.price_observations(metal,amount,publication_date,published_at,source_name,source_url,purity,verified_by)
  values(p_metal,p_amount,p_publication_date,p_published_at,'FENEGOSIDA',p_source_url,case when p_metal='gold' then 'Fine gold · 24K' else 'Silver reference' end,p_actor)
  on conflict(metal,publication_date) do update set amount=excluded.amount,published_at=excluded.published_at,source_url=excluded.source_url,verified_by=excluded.verified_by,fetched_at=now(),revision=price_observations.revision+1
  returning * into new_row;
  insert into public.admin_audit(actor,action,record_id,before_data,after_data,reason)
  values(p_actor,case when old_row.id is null then 'publish_rate' else 'correct_rate' end,new_row.id::text,case when old_row.id is null then null else to_jsonb(old_row) end,to_jsonb(new_row),p_reason);
  return new_row.id;
end; $$;

create or replace function public.consume_limit(p_key text,p_max integer,p_seconds integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
  insert into public.rate_limits(key,window_start,count) values(p_key,now(),1)
  on conflict(key) do update set count=case when rate_limits.window_start < now()-make_interval(secs=>p_seconds) then 1 else rate_limits.count+1 end,
  window_start=case when rate_limits.window_start < now()-make_interval(secs=>p_seconds) then now() else rate_limits.window_start end
  returning count into n;
  return n<=p_max;
end; $$;

create or replace function public.acquire_job(p_name text,p_owner uuid,p_seconds integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
  insert into public.job_locks(name,owner,locked_until) values(p_name,p_owner,now()+make_interval(secs=>p_seconds))
  on conflict(name) do update set owner=excluded.owner,locked_until=excluded.locked_until where job_locks.locked_until<now()
  returning owner into result;
  return result is not null;
end; $$;

create or replace function public.save_subscription(p_device text,p_endpoint text,p_encrypted text,p_metals text[],p_daily boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
  insert into public.push_subscriptions(device_hash,endpoint_hash,encrypted_subscription) values(p_device,p_endpoint,p_encrypted)
  on conflict(device_hash) do update set endpoint_hash=excluded.endpoint_hash,encrypted_subscription=excluded.encrypted_subscription,updated_at=now()
  returning id into result;
  insert into public.notification_preferences(subscription_id,metals,daily) values(result,p_metals,p_daily)
  on conflict(subscription_id) do update set metals=excluded.metals,daily=excluded.daily,consent_at=now();
  return result;
end; $$;

create or replace function public.save_news_source(p_actor uuid,p_name text,p_url text,p_category text,p_terms_url text,p_permission text,p_enabled boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare old_row public.news_sources; new_row public.news_sources;
begin
  if not exists(select 1 from public.admin_users where user_id=p_actor) then raise exception 'Forbidden'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_url,0));
  select * into old_row from public.news_sources where url=p_url for update;
  insert into public.news_sources(name,url,category,terms_url,permission_note,enabled) values(p_name,p_url,p_category,p_terms_url,p_permission,p_enabled)
  on conflict(url) do update set name=excluded.name,category=excluded.category,terms_url=excluded.terms_url,permission_note=excluded.permission_note,enabled=excluded.enabled
  returning * into new_row;
  update public.news_articles set enabled=p_enabled,source_name=p_name,category=p_category where source_id=new_row.id;
  insert into public.admin_audit(actor,action,record_id,before_data,after_data,reason) values(p_actor,'news_source',new_row.id::text,case when old_row.id is null then null else to_jsonb(old_row) end,to_jsonb(new_row),p_permission);
  return new_row.id;
end; $$;

-- No browser roles can read subscription endpoints, audit logs, or write financial data.
do $$ declare t text; begin
  foreach t in array array['currencies','countries','metals','admin_users','price_observations','admin_audit','ingestion_logs','spot_cache','spot_history','news_sources','news_articles','push_subscriptions','notification_preferences','notification_deliveries','rate_limits','job_locks'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
revoke all on function public.publish_nepal_rate(uuid,text,numeric,date,timestamptz,text,text) from public,anon,authenticated;
revoke all on function public.consume_limit(text,integer,integer) from public,anon,authenticated;
revoke all on function public.acquire_job(text,uuid,integer) from public,anon,authenticated;
revoke all on function public.save_subscription(text,text,text,text[],boolean) from public,anon,authenticated;
revoke all on function public.save_news_source(uuid,text,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.publish_nepal_rate(uuid,text,numeric,date,timestamptz,text,text) to service_role;
grant execute on function public.consume_limit(text,integer,integer) to service_role;
grant execute on function public.acquire_job(text,uuid,integer) to service_role;
grant execute on function public.save_subscription(text,text,text,text[],boolean) to service_role;
grant execute on function public.save_news_source(uuid,text,text,text,text,text,boolean) to service_role;
grant usage,select on all sequences in schema public to service_role;
