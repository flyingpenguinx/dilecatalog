Paste this into the Supabase AI agent if your current `products` table does not yet include SKU and unit size.

```text
Please update my existing Supabase project for the DILE catalog app.

Goal:
Add support for SKU and unit size to the existing public.products table without deleting or recreating the table.

Required changes:

1. Ensure public.products has these two columns:
- sku text not null default ''
- unit_size text not null default ''

2. Backfill existing rows so both columns are non-null.

3. Preserve all existing data, policies, triggers, and RLS.

4. Do not recreate the table if it already exists.

5. Return a short summary of:
- whether the columns were added or already existed
- whether any rows were backfilled
- whether any manual step is still needed
```