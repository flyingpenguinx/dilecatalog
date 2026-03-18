Audit and fix admin login for my existing DILE catalog Supabase project.

Requirements:
- Do not delete or recreate my existing tables.
- Do not remove existing RLS unless you replace it with an equivalent or safer policy.
- Focus on why a valid user can sign in but still cannot access the admin panel.

What to verify:
1. Confirm the email/password auth user already exists in auth.users.
2. Confirm that user has a matching row in public.profiles where profiles.id = auth.users.id.
3. If the profile row is missing, create it.
4. Ensure the profile role is admin for the user I want to manage the catalog.
5. Verify these policies exist and work correctly:
   - users can read own profile
   - admins can manage products
   - admins can manage catalog subcategories
6. If a policy is missing or wrong, fix it.
7. Return the SQL used and a short explanation of the root cause.

Use this SQL as the diagnostic starting point and adapt it safely if needed:

```sql
select id, email, email_confirmed_at, created_at
from auth.users
order by created_at desc;

select id, display_name, role, created_at, updated_at
from public.profiles
order by created_at desc nulls last;
```

Then apply a safe fix pattern like this for the correct user email:

```sql
with target_user as (
  select id, email
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

If needed, reapply these policies exactly or with equivalent safer SQL:

```sql
drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

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
```

Important:
- Replace REPLACE_WITH_ADMIN_EMAIL with the real admin email before running.
- If the auth user does not exist yet, say that clearly and tell me to create the auth user first.
- Do not modify product rows.