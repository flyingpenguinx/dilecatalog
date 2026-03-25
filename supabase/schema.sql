grant usage on schema public to anon, authenticated, service_role;

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

alter table public.products add column if not exists sku text not null default '';
alter table public.products add column if not exists unit_size text not null default '';

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.catalog_categories (
  id text primary key,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.catalog_brands (
  id text primary key,
  name text not null unique,
  category text not null default '',
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.catalog_subcategories (
  id text primary key,
  category text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (category, name)
);

alter table public.catalog_subcategories
drop constraint if exists catalog_subcategories_category_check;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'usuario'
    ),
    'viewer'
  )
  on conflict (id) do nothing;

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop trigger if exists catalog_categories_set_updated_at on public.catalog_categories;
create trigger catalog_categories_set_updated_at
before update on public.catalog_categories
for each row
execute function public.set_updated_at();

drop trigger if exists catalog_brands_set_updated_at on public.catalog_brands;
create trigger catalog_brands_set_updated_at
before update on public.catalog_brands
for each row
execute function public.set_updated_at();

drop trigger if exists catalog_subcategories_set_updated_at on public.catalog_subcategories;
create trigger catalog_subcategories_set_updated_at
before update on public.catalog_subcategories
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.catalog_categories enable row level security;
alter table public.catalog_brands enable row level security;
alter table public.catalog_subcategories enable row level security;

grant select on public.products to anon, authenticated;
grant select on public.catalog_categories to anon, authenticated;
grant select on public.catalog_brands to anon, authenticated;
grant select on public.catalog_subcategories to anon, authenticated;
grant select on public.profiles to authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert, update, delete on public.catalog_categories to authenticated;
grant insert, update, delete on public.catalog_brands to authenticated;
grant insert, update, delete on public.catalog_subcategories to authenticated;
grant insert, update, delete on public.profiles to authenticated;
grant all on all tables in schema public to service_role;

create index if not exists products_visible_sort_order_idx
on public.products (visible, sort_order, name);

create index if not exists products_category_subcategory_sort_order_idx
on public.products (category, subcategory, sort_order);

create index if not exists products_brand_idx
on public.products (brand);

create index if not exists catalog_categories_sort_order_idx
on public.catalog_categories (sort_order, name);

create index if not exists catalog_brands_category_sort_order_idx
on public.catalog_brands (category, sort_order, name);

create index if not exists catalog_subcategories_category_sort_order_idx
on public.catalog_subcategories (category, sort_order, name);

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

insert into public.profiles (id, display_name, role)
select
  users.id,
  coalesce(
    nullif(trim(coalesce(users.raw_user_meta_data->>'display_name', '')), ''),
    nullif(trim(coalesce(users.raw_user_meta_data->>'full_name', '')), ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'usuario'
  ),
  'viewer'
from auth.users as users
left join public.profiles on profiles.id = users.id
where profiles.id is null
on conflict (id) do nothing;

drop policy if exists "public can read catalog categories" on public.catalog_categories;
create policy "public can read catalog categories"
on public.catalog_categories
for select
using (true);

drop policy if exists "admins can manage catalog categories" on public.catalog_categories;
create policy "admins can manage catalog categories"
on public.catalog_categories
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

drop policy if exists "public can read catalog brands" on public.catalog_brands;
create policy "public can read catalog brands"
on public.catalog_brands
for select
using (true);

drop policy if exists "admins can manage catalog brands" on public.catalog_brands;
create policy "admins can manage catalog brands"
on public.catalog_brands
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

drop policy if exists "public can read catalog subcategories" on public.catalog_subcategories;
create policy "public can read catalog subcategories"
on public.catalog_subcategories
for select
using (true);

drop policy if exists "admins can manage catalog subcategories" on public.catalog_subcategories;
create policy "admins can manage catalog subcategories"
on public.catalog_subcategories
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

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set
  public = excluded.public;

drop policy if exists "public can read product images" on storage.objects;
create policy "public can read product images"
on storage.objects
for select
using (bucket_id = 'product-images');

drop policy if exists "admins can upload product images" on storage.objects;
create policy "admins can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'editor')
  )
);

drop policy if exists "admins can update product images" on storage.objects;
create policy "admins can update product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'editor')
  )
)
with check (
  bucket_id = 'product-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'editor')
  )
);

drop policy if exists "admins can delete product images" on storage.objects;
create policy "admins can delete product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'editor')
  )
);

insert into public.catalog_categories (id, name, sort_order)
select *
from (
  values
    ('frozen', 'Frozen', 10),
    ('grocery', 'Grocery', 20),
    ('dairy', 'Dairy', 30),
    ('vitamins', 'Vitamins', 40)
) as seed (id, name, sort_order)
on conflict (id) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.catalog_brands (id, name, category, sort_order)
select
  lower(regexp_replace(trim(brand), '[^a-zA-Z0-9]+', '-', 'g')) as id,
  trim(brand) as name,
  coalesce(nullif(trim(category), ''), '') as category,
  row_number() over (order by min(sort_order), trim(brand)) * 10 as sort_order
from public.products
where trim(brand) <> ''
group by trim(brand), coalesce(nullif(trim(category), ''), '')
on conflict (id) do nothing;

insert into public.catalog_subcategories (id, category, name, sort_order)
select *
from (
  values
    ('frozen:pupusa', 'frozen', 'Pupusa', 10),
    ('frozen:tamal', 'frozen', 'Tamal', 20),
    ('frozen:atol', 'frozen', 'Atol', 30),
    ('frozen:fruit', 'frozen', 'Fruit', 40),
    ('frozen:platano', 'frozen', 'Platano', 50),
    ('grocery:chips', 'grocery', 'Chips', 110),
    ('grocery:pan-galleta', 'grocery', 'Pan Galleta', 120),
    ('grocery:granos', 'grocery', 'Granos', 130),
    ('grocery:harina', 'grocery', 'Harina', 140),
    ('grocery:cafe', 'grocery', 'Cafe', 150),
    ('grocery:bebida', 'grocery', 'Bebida', 160),
    ('grocery:salsa', 'grocery', 'Salsa', 170),
    ('grocery:consume', 'grocery', 'Consume', 180),
    ('grocery:sopa', 'grocery', 'Sopa', 190),
    ('grocery:chocolate', 'grocery', 'Chocolate', 200),
    ('grocery:vidro', 'grocery', 'Vidro', 210),
    ('grocery:empanizador', 'grocery', 'Empanizador', 220),
    ('grocery:misc', 'grocery', 'Misc', 230),
    ('dairy:queso', 'dairy', 'Queso', 310),
    ('dairy:crema', 'dairy', 'Crema', 320),
    ('dairy:cuajada', 'dairy', 'Cuajada', 330),
    ('vitamins:crema', 'vitamins', 'Crema', 410),
    ('vitamins:kids', 'vitamins', 'Kids', 420),
    ('vitamins:liquido', 'vitamins', 'Liquido', 430)
) as seed (id, category, name, sort_order)
on conflict (id) do nothing;

insert into public.catalog_subcategories (id, category, name, sort_order)
select
  lower(regexp_replace(trim(category), '[^a-zA-Z0-9]+', '-', 'g'))
    || ':'
    || lower(regexp_replace(trim(subcategory), '[^a-zA-Z0-9]+', '-', 'g')) as id,
  trim(category) as category,
  trim(subcategory) as name,
  row_number() over (partition by trim(category) order by min(sort_order), trim(subcategory)) * 10 as sort_order
from public.products
where trim(category) <> ''
  and trim(subcategory) <> ''
group by trim(category), trim(subcategory)
on conflict (id) do nothing;