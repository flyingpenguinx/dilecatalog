# DILE React + Supabase migration

This repo has been converted from a static HTML catalog into a React application powered by Vite, with a Supabase-ready admin panel.

## What changed

- The catalog now runs from React instead of inline DOM scripting.
- The existing product dataset from `products.js` is still the fallback seed.
- A protected admin route can edit:
  - product names
  - brand
  - SKU
  - unit size
  - category and subcategory
  - optional description
  - image uploads to Supabase Storage
  - visible/hidden state
  - featured state
  - sort order
- A seed action can push the current local catalog into Supabase.
- GitHub Pages remains workable because the app uses hash routing.

## Recommended hosting

Vercel is the better long-term host for this version because:

- environment variables are easier to manage
- preview deployments are cleaner
- future server features are available if you add edge functions or API routes

GitHub Pages still works for a purely client-rendered setup.

## Vercel deployment

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Confirm these settings:
  - Framework preset: Vite
  - Build command: `npm run build`
  - Output directory: `dist`
4. Add environment variables in Vercel:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
5. Deploy.
6. After deploy, test:
  - public homepage
  - `/admin` login
  - one product save
  - one product image upload

## Local setup

1. Install dependencies.
2. Copy `.env.example` to `.env`.
3. Add your Supabase URL and anon key.
4. Create a public Storage bucket named `product-images`.
5. Make sure authenticated admins can upload and public users can read images.
6. Run the SQL in `supabase/schema.sql` inside the Supabase SQL editor, or use your Supabase AI agent to apply the same tables and RLS rules.
7. Create your first auth user in Supabase Auth.
8. Insert that user's uid into `profiles` with `role = 'admin'`.
9. Start the app.

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Supabase bootstrap

After signing in to `/admin`, you can click `Seed actual a Supabase` to push the current local catalog into the `products` table.

Use the image upload field in the admin form to send product images directly to the `product-images` bucket and store the resulting public URL on the product.

If your Supabase project was created before SKU and unit size support were added, update the `products` table to include:

- `sku text not null default ''`
- `unit_size text not null default ''`

## Suggested next features

- inventory counts per SKU
- per-product price or wholesale tiers
- brand management table
- scheduled publish/unpublish dates
- audit log of admin changes