Update my existing Supabase project for the DILE catalog app.

Requirements:
- Do not recreate or delete my existing `products` or `profiles` tables.
- Add a new table named `public.catalog_subcategories` if it does not already exist.
- Columns:
  - `id text primary key`
  - `category text not null` with a check constraint allowing only `frozen`, `grocery`, `dairy`, `vitamins`
  - `name text not null`
  - `sort_order integer not null default 0`
  - `created_at timestamptz not null default timezone('utc', now())`
  - `updated_at timestamptz not null default timezone('utc', now())`
- Add a unique constraint on `(category, name)`.
- Reuse my existing `public.set_updated_at()` trigger function if it already exists, otherwise create it.
- Add an update trigger for `catalog_subcategories` to maintain `updated_at`.
- Enable row level security on `public.catalog_subcategories`.
- Add a public read policy for `select`.
- Add an authenticated admin/editor management policy for `insert`, `update`, and `delete`, using `public.profiles` and roles `admin` or `editor`.
- If the table is empty, insert the following starter subcategories:
  - frozen: Pupusa, Tamal, Atol, Fruit, Platano
  - grocery: Chips, Pan Galleta, Granos, Harina, Cafe, Bebida, Salsa, Consume, Sopa, Chocolate, Vidro, Empanizador, Misc
  - dairy: Queso, Crema, Cuajada
  - vitamins: Crema, Kids, Liquido
- Do not touch my existing product rows.
- Return the final SQL you applied and summarize what changed.
