-- FocoSales CRM — schema inicial
-- Workspace único compartilhado: qualquer usuário autenticado lê/escreve os mesmos dados.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('owner', 'observer', 'member');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null default 'member',
  unique (user_id, role)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  base_salary numeric not null default 1700,
  share_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  lead_name text not null,
  phone text,
  payment_method text not null check (payment_method in ('PIX', 'Cartão')),
  value numeric not null check (value >= 0),
  product text,
  lead_source text,
  is_opportunity boolean not null default false,
  contract_signed boolean not null default false,
  payment_received boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_owner_id_idx on public.sales (owner_id);
create index if not exists sales_date_idx on public.sales (date);

create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  value numeric not null check (value >= 0),
  due_date date,
  received boolean not null default false,
  "position" integer not null default 0
);

create index if not exists installments_sale_id_idx on public.installments (sale_id);
create index if not exists installments_due_date_idx on public.installments (due_date);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  installment_id uuid references public.installments (id) on delete cascade,
  path text not null,
  filename text not null,
  mime text,
  size bigint,
  created_at timestamptz not null default now()
);

create index if not exists receipts_sale_id_idx on public.receipts (sale_id);
create index if not exists receipts_installment_id_idx on public.receipts (installment_id);

create table if not exists public.sales_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  cycle_start date not null,
  cycle_end date not null,
  goal_amount numeric not null default 50000,
  received_override numeric,
  sold_override numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_start, cycle_end)
);

-- Legado: compartilhamento por e-mail (não usado na UI atual, mantido para compatibilidade de dados)
create table if not exists public.dashboard_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Funções e triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

drop trigger if exists sales_goals_set_updated_at on public.sales_goals;
create trigger sales_goals_set_updated_at
  before update on public.sales_goals
  for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Oportunidade vira venda automaticamente assim que o pagamento é recebido.
create or replace function public.sales_auto_convert_opportunity()
returns trigger
language plpgsql
as $$
begin
  if new.payment_received = true and new.is_opportunity = true then
    new.is_opportunity = false;
  end if;
  return new;
end;
$$;

drop trigger if exists sales_auto_convert_opportunity_trg on public.sales;
create trigger sales_auto_convert_opportunity_trg
  before insert or update on public.sales
  for each row execute function public.sales_auto_convert_opportunity();

-- Cria profile + role + settings para todo novo usuário do Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'owner')
  on conflict do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- Workspace único: qualquer usuário autenticado pode ver os dados de qualquer owner.
create or replace function public.can_view_owner(_owner_id uuid)
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

create or replace function public.current_owner_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

-- Legado: vincula convites de compartilhamento pendentes ao usuário recém-criado.
create or replace function public.link_share_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.dashboard_shares
  set user_id = new.id
  where email = new.email and user_id is null;
  return new;
end;
$$;

drop trigger if exists on_profile_link_shares on public.profiles;
create trigger on_profile_link_shares
  after insert on public.profiles
  for each row execute function public.link_share_user();

create or replace function public.backfill_shares_for_profile(_profile_id uuid, _email text)
returns void
language sql
security definer set search_path = public
as $$
  update public.dashboard_shares
  set user_id = _profile_id
  where email = _email and user_id is null;
$$;

-- ---------------------------------------------------------------------------
-- RLS — workspace compartilhado: todo usuário autenticado lê/escreve tudo.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_settings enable row level security;
alter table public.sales enable row level security;
alter table public.installments enable row level security;
alter table public.receipts enable row level security;
alter table public.sales_goals enable row level security;
alter table public.dashboard_shares enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists user_roles_all on public.user_roles;
create policy user_roles_all on public.user_roles for select to authenticated using (true);

drop policy if exists user_settings_all on public.user_settings;
create policy user_settings_all on public.user_settings for all to authenticated
  using (true) with check (true);

drop policy if exists sales_all on public.sales;
create policy sales_all on public.sales for all to authenticated using (true) with check (true);

drop policy if exists installments_all on public.installments;
create policy installments_all on public.installments for all to authenticated using (true) with check (true);

drop policy if exists receipts_all on public.receipts;
create policy receipts_all on public.receipts for all to authenticated using (true) with check (true);

drop policy if exists sales_goals_all on public.sales_goals;
create policy sales_goals_all on public.sales_goals for all to authenticated using (true) with check (true);

drop policy if exists dashboard_shares_all on public.dashboard_shares;
create policy dashboard_shares_all on public.dashboard_shares for all to authenticated using (true) with check (true);

grant usage on schema public to authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage — comprovantes e contratos enviados como arquivo
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists receipts_bucket_all on storage.objects;
create policy receipts_bucket_all on storage.objects for all to authenticated
  using (bucket_id = 'receipts') with check (bucket_id = 'receipts');
