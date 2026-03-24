Supabase updates still needed for the current admin panel

1. Run the full SQL in `supabase/schema.sql`.

What that adds or updates:
- `sku` and `unit_size` on `public.products` if they are missing
- `public.catalog_categories`
- `public.catalog_brands`
- `public.catalog_subcategories`
- RLS and triggers for all admin-managed catalog tables

2. Make sure your admin user has a row in `public.profiles` with role `admin` or `editor`.

Use this SQL after your auth user exists:

```sql
with target_user as (
  select id
  from auth.users
  where lower(email) = lower('REPLACE_WITH_ADMIN_EMAIL')
  limit 1
)
insert into public.profiles (id, display_name, role)
select id, 'Administrador', 'admin'
from target_user
on conflict (id)
do update set
  role = 'admin',
  updated_at = timezone('utc', now());
```

3. Verify the Storage bucket exists.

Required bucket:
- `product-images`

Recommended bucket behavior:
- public read
- authenticated admin/editor upload

4. Redeploy only if you changed frontend code or environment variables.

If you changed only Supabase SQL, Auth users, profiles, or Storage rules, the site does not need a redeploy.