create table if not exists public.products (
  id bigint primary key,
  name text not null,
  brand text not null default '',
  sku text not null default '',
  unit_size text not null default '',
  category text not null,
  subcategory text not null default '',
  description text not null default '',
  image text not null default '',
  visible boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "public can read visible products" on public.products;
create policy "public can read visible products"
on public.products
for select
using (visible = true);

drop policy if exists "admins can manage products" on public.products;
create policy "admins can manage products"
on public.products
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'editor')
  )
);

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "admins can manage profiles" on public.profiles;
create policy "admins can manage profiles"
on public.profiles
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles manager
    where manager.id = auth.uid()
      and manager.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles manager
    where manager.id = auth.uid()
      and manager.role = 'admin'
  )
);