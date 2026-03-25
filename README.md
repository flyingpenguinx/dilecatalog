# DILE Catalog

## What changed

- The catalog now runs from React instead of inline DOM scripting.
- The generated dataset in `src/data/catalog-seed.json` is the fallback seed used by the app.
- A protected admin route can edit:
  - product names
  - brand
  - brand library
  - SKU
  - unit size
  - main category and subcategory
  - category library
  - optional description
  - image replacement
  - visible/hidden state
  - featured state
  - sort order
- A backup export can download the current products, brands, categories, and subcategories as JSON.
- A CSV export can be opened in Excel or Google Sheets and imported back for bulk SKU/product updates.
- The admin panel now includes an image audit so you can review assigned and unassigned local images.
- A bulk image upload script can move catalog images to Storage and generate a manifest so the site can stop depending on repo-hosted images.
- GitHub Pages remains workable because the app uses hash routing.

## Data safety

- Product changes made by admins are stored in Supabase, not in the website code.
- Frontend changes such as layout, colors, or component structure do not overwrite product data unless code explicitly writes to the database.
- Categories, brands, and subcategories can now live in separate tables so catalog structure changes are not tied to product rows.
- Use the admin `Exportar respaldo` button before major catalog edits if you want a manual JSON backup.
- Use the admin CSV import for bulk SKU updates or to prepare data in Excel or Google Sheets.

## Recommended hosting

Vercel is the better long-term host for this version because:

- environment variables are easier to manage
- preview deployments are cleaner
- future server features are available if you add edge functions or API routes

GitHub Pages still works for a purely client-rendered setup.

## Cleanup

- Old one-off Supabase prompt files under `supabase/` were removed.
- The duplicate workspace file under `supabase/` was removed.
- `products.js` remains only as a legacy source for the seed-generation script.

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
2. Create a local `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` if you want to run against Supabase locally.
3. Run the SQL in `supabase/schema.sql` inside the Supabase SQL editor. The script creates the `product-images` bucket, table policies, storage policies, triggers, and seed rows.
4. In Supabase Auth, make sure Email auth is enabled. Email confirmation is optional for local testing, but if it is enabled the user must confirm before the app can open the admin session.
5. Create your first auth user in Supabase Auth.
6. Promote that user's uid in `profiles` to `role = 'admin'`.
7. Start the app.

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Bulk image upload

If you want to stop pushing large image folders through GitHub, use the bulk uploader:

```bash
npm run upload:images
```

Requirements:

- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

What it does:

- scans the local `images/` folder
- converts HEIC images to compressed JPG when needed
- uploads images to the `product-images` bucket
- writes `src/data/image-manifest.json`

After that, the app will prefer the uploaded image URLs from the manifest and only fall back to local files when no manifest entry exists.

## Supabase bootstrap

Use the image upload field in the admin form to send product images directly to the `product-images` bucket and store the resulting public URL on the product.

If your Supabase project already exists, apply the updated `supabase/schema.sql` so these admin features persist:

- `catalog_categories`
- `catalog_brands`
- `catalog_subcategories`
- `sku` and `unit_size` columns on `products` if they were missing before

## Suggested next features

- inventory counts per SKU
- per-product price or wholesale tiers
- scheduled publish/unpublish dates
- audit log of admin changes