import PRODUCTS from '../data/catalog-seed.json';
import { CATEGORIES, CATEGORY_PREFIXES } from '../data/catalog-config.js';
import { isSupabaseConfigured, supabase } from './supabase.js';

const categoryById = new Map(CATEGORIES.map((category) => [category.id, category]));
const CATEGORY_ALIASES = new Map([
  ['frozen', 'frozen'],
  ['grocery', 'grocery'],
  ['dairy', 'dairy'],
  ['lactos', 'dairy'],
  ['lacteos', 'dairy'],
  ['vitamins', 'vitamins'],
  ['vitaminas', 'vitamins'],
  ['vitamina', 'vitamins'],
]);

Object.entries(CATEGORY_PREFIXES).forEach(([categoryId, prefixes]) => {
  prefixes.forEach((prefix) => {
    CATEGORY_ALIASES.set(prefix, categoryId);
  });
});

export const PRODUCT_IMAGE_BUCKET = 'product-images';

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isMissingRelationError(error) {
  return error?.code === '42P01' || /does not exist/i.test(error?.message ?? '');
}

function normalizeOptionalTableError(error, label) {
  if (!isMissingRelationError(error)) {
    throw error;
  }

  return `${label} does not exist in Supabase yet. Apply the updated schema to persist this data outside the current session.`;
}

export function normalizeCategoryId(categoryId) {
  const normalized = String(categoryId ?? '')
    .trim()
    .toLowerCase();

  return CATEGORY_ALIASES.get(normalized) ?? (normalized || 'grocery');
}

function normalizeImagePath(image) {
  if (!image) return '';
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/')) {
    return image;
  }

  return `/${image}`;
}

function createFallbackProduct(product, index) {
  return {
    ...product,
    name: String(product.name ?? '').trim(),
    brand: String(product.brand ?? '').trim(),
    subcategory: String(product.subcategory ?? '').trim(),
    description: String(product.description ?? '').trim(),
    category: normalizeCategoryId(product.category),
    image: normalizeImagePath(product.image),
    sku: product.sku ?? '',
    unit_size: product.unit_size ?? '',
    visible: product.visible ?? true,
    featured: product.featured ?? index < 6,
    sort_order: Number(product.sort_order) || index,
    metadata: product.metadata ?? {},
  };
}

export function buildFallbackCatalog() {
  return PRODUCTS.map(createFallbackProduct);
}

function normalizeCategoryDefinition(definition, index = 0) {
  const rawId = definition.id ?? definition.category ?? definition.name ?? `category-${index + 1}`;
  const id = normalizeCategoryId(slugify(rawId) || `category-${index + 1}`);
  const fallbackName = getCategoryMeta(id)?.name ?? rawId;

  return {
    id,
    name: String(definition.name ?? fallbackName).trim() || fallbackName,
    sort_order: Number(definition.sort_order) || index,
  };
}

function normalizeBrandDefinition(definition, index = 0) {
  const name = String(definition.name ?? '').trim();

  return {
    id: definition.id ?? (slugify(name) || `brand-${index + 1}`),
    name,
    category: definition.category ? normalizeCategoryId(definition.category) : '',
    notes: String(definition.notes ?? '').trim(),
    sort_order: Number(definition.sort_order) || index,
  };
}

function normalizeSubcategoryDefinition(definition, index = 0) {
  const category = normalizeCategoryId(definition.category);
  const name = String(definition.name ?? '').trim();

  return {
    id: definition.id ?? `${category}:${slugify(name)}`,
    category,
    name,
    sort_order: Number(definition.sort_order) || index,
  };
}

export function buildFallbackCategoryDefinitions() {
  return CATEGORIES.map((category, index) =>
    normalizeCategoryDefinition(
      {
        id: category.id,
        name: category.name,
        sort_order: index,
      },
      index,
    ),
  );
}

export function buildFallbackBrandDefinitions() {
  const byId = new Map();

  buildFallbackCatalog().forEach((product, index) => {
    const name = String(product.brand ?? '').trim();
    if (!name) {
      return;
    }

    const brand = normalizeBrandDefinition(
      {
        name,
        category: product.category,
        sort_order: index,
      },
      index,
    );

    if (!byId.has(brand.id)) {
      byId.set(brand.id, brand);
    }
  });

  return [...byId.values()].sort(
    (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name),
  );
}

export function buildFallbackSubcategoryDefinitions() {
  return CATEGORIES.flatMap((category, categoryIndex) =>
    (category.subcategories ?? []).map((name, subcategoryIndex) =>
      normalizeSubcategoryDefinition(
        {
          category: category.id,
          name,
          sort_order: categoryIndex * 100 + subcategoryIndex,
        },
        categoryIndex * 100 + subcategoryIndex,
      ),
    ),
  );
}

function deriveCategoryDefinitions(products, categories = []) {
  const byId = new Map((categories ?? []).map((definition, index) => {
    const normalized = normalizeCategoryDefinition(definition, index);
    return [normalized.id, normalized];
  }));

  products.forEach((product, index) => {
    const categoryId = normalizeCategoryId(product.category);
    if (!byId.has(categoryId)) {
      byId.set(
        categoryId,
        normalizeCategoryDefinition(
          {
            id: categoryId,
            name: getCategoryMeta(categoryId)?.name ?? categoryId,
            sort_order: index + byId.size,
          },
          index + byId.size,
        ),
      );
    }
  });

  return [...byId.values()].sort(
    (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name),
  );
}

function deriveBrandDefinitions(products, brands = []) {
  const byId = new Map((brands ?? []).map((definition, index) => {
    const normalized = normalizeBrandDefinition(definition, index);
    return [normalized.id, normalized];
  }));

  products.forEach((product, index) => {
    const name = String(product.brand ?? '').trim();
    if (!name) {
      return;
    }

    const normalized = normalizeBrandDefinition(
      {
        name,
        category: product.category,
        sort_order: index + byId.size,
      },
      index + byId.size,
    );

    if (!byId.has(normalized.id)) {
      byId.set(normalized.id, normalized);
    }
  });

  return [...byId.values()].sort(
    (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name),
  );
}

function deriveSubcategoryDefinitions(products, subcategories = []) {
  const byId = new Map((subcategories ?? []).map((definition, index) => {
    const normalized = normalizeSubcategoryDefinition(definition, index);
    return [normalized.id, normalized];
  }));

  products.forEach((product, index) => {
    const name = String(product.subcategory ?? '').trim();
    if (!name) {
      return;
    }

    const normalized = normalizeSubcategoryDefinition(
      {
        category: product.category,
        name,
        sort_order: index + byId.size,
      },
      index + byId.size,
    );

    if (!byId.has(normalized.id)) {
      byId.set(normalized.id, normalized);
    }
  });

  return [...byId.values()].sort(
    (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name),
  );
}

export async function fetchCategoryDefinitions() {
  const fallback = buildFallbackCategoryDefinitions();

  if (!isSupabaseConfigured || !supabase) {
    return { definitions: fallback, source: 'local' };
  }

  try {
    const { data, error } = await supabase
      .from('catalog_categories')
      .select('*')
      .order('sort_order')
      .order('name');

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return { definitions: fallback, source: 'seed' };
    }

    return {
      definitions: data.map((definition, index) => normalizeCategoryDefinition(definition, index)),
      source: 'supabase',
    };
  } catch (error) {
    return {
      definitions: fallback,
      source: 'fallback',
      error: error.message ?? 'Supabase returned an error.',
    };
  }
}

export async function saveCategoryDefinition(definition) {
  const normalized = normalizeCategoryDefinition(definition, definition.sort_order);

  if (!normalized.name) {
    throw new Error('Category name is required.');
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      definition: normalized,
      persisted: false,
      source: 'local',
    };
  }

  try {
    const { data, error } = await supabase
      .from('catalog_categories')
      .upsert([normalized], { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      definition: normalizeCategoryDefinition(data, data.sort_order ?? 0),
      persisted: true,
      source: 'supabase',
    };
  } catch (error) {
    return {
      definition: normalized,
      persisted: false,
      source: 'fallback',
      warning: normalizeOptionalTableError(error, 'Category table'),
    };
  }
}

export async function deleteCategoryDefinition(definitionId) {
  if (!isSupabaseConfigured || !supabase) {
    return { persisted: false, source: 'local' };
  }

  try {
    const { error } = await supabase.from('catalog_categories').delete().eq('id', definitionId);

    if (error) {
      throw error;
    }

    return { persisted: true, source: 'supabase' };
  } catch (error) {
    return {
      persisted: false,
      source: 'fallback',
      warning: normalizeOptionalTableError(error, 'Category table'),
    };
  }
}

export async function fetchBrandDefinitions() {
  const fallback = buildFallbackBrandDefinitions();

  if (!isSupabaseConfigured || !supabase) {
    return { definitions: fallback, source: 'local' };
  }

  try {
    const { data, error } = await supabase
      .from('catalog_brands')
      .select('*')
      .order('sort_order')
      .order('name');

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return { definitions: fallback, source: 'seed' };
    }

    return {
      definitions: data.map((definition, index) => normalizeBrandDefinition(definition, index)),
      source: 'supabase',
    };
  } catch (error) {
    return {
      definitions: fallback,
      source: 'fallback',
      error: error.message ?? 'Supabase returned an error.',
    };
  }
}

export async function saveBrandDefinition(definition) {
  const normalized = normalizeBrandDefinition(definition, definition.sort_order);

  if (!normalized.name) {
    throw new Error('Brand name is required.');
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      definition: normalized,
      persisted: false,
      source: 'local',
    };
  }

  try {
    const { data, error } = await supabase
      .from('catalog_brands')
      .upsert([normalized], { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      definition: normalizeBrandDefinition(data, data.sort_order ?? 0),
      persisted: true,
      source: 'supabase',
    };
  } catch (error) {
    return {
      definition: normalized,
      persisted: false,
      source: 'fallback',
      warning: normalizeOptionalTableError(error, 'Brand table'),
    };
  }
}

export async function deleteBrandDefinition(definitionId) {
  if (!isSupabaseConfigured || !supabase) {
    return { persisted: false, source: 'local' };
  }

  try {
    const { error } = await supabase.from('catalog_brands').delete().eq('id', definitionId);

    if (error) {
      throw error;
    }

    return { persisted: true, source: 'supabase' };
  } catch (error) {
    return {
      persisted: false,
      source: 'fallback',
      warning: normalizeOptionalTableError(error, 'Brand table'),
    };
  }
}

export async function fetchSubcategoryDefinitions() {
  const fallback = buildFallbackSubcategoryDefinitions();

  if (!isSupabaseConfigured || !supabase) {
    return { definitions: fallback, source: 'local' };
  }

  try {
    const { data, error } = await supabase
      .from('catalog_subcategories')
      .select('*')
      .order('category')
      .order('sort_order')
      .order('name');

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return { definitions: fallback, source: 'seed' };
    }

    return {
      definitions: data.map((definition, index) => normalizeSubcategoryDefinition(definition, index)),
      source: 'supabase',
    };
  } catch (error) {
    return {
      definitions: fallback,
      source: 'fallback',
      error: error.message ?? 'Supabase returned an error.',
    };
  }
}

export async function saveSubcategoryDefinition(definition) {
  const normalized = normalizeSubcategoryDefinition(definition, definition.sort_order);

  if (!normalized.name) {
    throw new Error('Subcategory name is required.');
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      definition: normalized,
      persisted: false,
      source: 'local',
    };
  }

  try {
    const { data, error } = await supabase
      .from('catalog_subcategories')
      .upsert([normalized], { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      definition: normalizeSubcategoryDefinition(data, data.sort_order ?? 0),
      persisted: true,
      source: 'supabase',
    };
  } catch (error) {
    return {
      definition: normalized,
      persisted: false,
      source: 'fallback',
      warning: normalizeOptionalTableError(error, 'Subcategory table'),
    };
  }
}

export async function deleteSubcategoryDefinition(definitionId) {
  if (!isSupabaseConfigured || !supabase) {
    return { persisted: false, source: 'local' };
  }

  try {
    const { error } = await supabase.from('catalog_subcategories').delete().eq('id', definitionId);

    if (error) {
      throw error;
    }

    return { persisted: true, source: 'supabase' };
  } catch (error) {
    return {
      persisted: false,
      source: 'fallback',
      warning: normalizeOptionalTableError(error, 'Subcategory table'),
    };
  }
}

export function getCategoryMeta(categoryId) {
  return categoryById.get(normalizeCategoryId(categoryId)) ?? null;
}

export async function fetchCatalog(options = {}) {
  const { includeHidden = false } = options;
  const fallback = buildFallbackCatalog().filter((product) => includeHidden || product.visible);

  if (!isSupabaseConfigured || !supabase) {
    return { products: fallback, source: 'local' };
  }

  try {
    let query = supabase.from('products').select('*').order('sort_order').order('name');

    if (!includeHidden) {
      query = query.eq('visible', true);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return { products: fallback, source: 'seed' };
    }

    return {
      products: data.map((product, index) => createFallbackProduct(product, index)),
      source: 'supabase',
    };
  } catch (error) {
    return {
      products: fallback,
      source: 'fallback',
      error: error.message ?? 'Supabase returned an error.',
    };
  }
}

export function createEmptyProduct() {
  return {
    id: Date.now(),
    name: '',
    brand: '',
    sku: '',
    unit_size: '',
    category: CATEGORIES[0]?.id ?? 'frozen',
    subcategory: '',
    description: '',
    image: '',
    visible: true,
    featured: false,
    sort_order: Date.now(),
    metadata: {},
  };
}

function normalizeForWrite(product) {
  return {
    id: Number(product.id),
    name: String(product.name ?? '').trim(),
    brand: String(product.brand ?? '').trim(),
    sku: String(product.sku ?? '').trim(),
    unit_size: String(product.unit_size ?? '').trim(),
    category: normalizeCategoryId(product.category),
    subcategory: String(product.subcategory ?? '').trim(),
    description: String(product.description ?? '').trim(),
    image: String(product.image ?? '').trim(),
    visible: Boolean(product.visible),
    featured: Boolean(product.featured),
    sort_order: Number(product.sort_order) || 0,
    metadata: product.metadata ?? {},
  };
}

export async function saveProduct(product) {
  const normalized = normalizeForWrite(product);

  if (!isSupabaseConfigured || !supabase) {
    return {
      product: createFallbackProduct(normalized, normalized.sort_order),
      persisted: false,
      source: 'local',
    };
  }

  const { data, error } = await supabase
    .from('products')
    .upsert([normalized], { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    product: createFallbackProduct(data, data.sort_order ?? 0),
    persisted: true,
    source: 'supabase',
  };
}

export async function deleteProduct(productId) {
  if (!isSupabaseConfigured || !supabase) {
    return { persisted: false, source: 'local' };
  }

  const { error } = await supabase.from('products').delete().eq('id', Number(productId));

  if (error) {
    throw error;
  }

  return { persisted: true, source: 'supabase' };
}

export async function importCatalogDataset(snapshot) {
  const normalizedProducts = Array.isArray(snapshot?.products)
    ? snapshot.products.map((product, index) =>
        normalizeForWrite({
          ...createEmptyProduct(),
          ...product,
          id: product.id ?? Date.now() + index,
          sort_order: product.sort_order ?? index,
        }))
    : [];

  if (!normalizedProducts.length) {
    throw new Error('The file does not contain valid products.');
  }

  const normalizedCategories = deriveCategoryDefinitions(normalizedProducts, snapshot?.categories);
  const normalizedBrands = deriveBrandDefinitions(normalizedProducts, snapshot?.brands);
  const normalizedSubcategories = deriveSubcategoryDefinitions(normalizedProducts, snapshot?.subcategories);

  if (!isSupabaseConfigured || !supabase) {
    return {
      products: normalizedProducts.map((product, index) => createFallbackProduct(product, index)),
      categories: normalizedCategories,
      brands: normalizedBrands,
      subcategories: normalizedSubcategories,
      persisted: false,
      source: 'local',
      warnings: [],
    };
  }

  const warnings = [];

  const persistOptionalRows = async (table, rows, label) => {
    if (!rows.length) {
      return;
    }

    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });

    if (!error) {
      return;
    }

    if (isMissingRelationError(error)) {
      warnings.push(`${label} were not saved because table ${table} is missing.`);
      return;
    }

    throw error;
  };

  await persistOptionalRows('catalog_categories', normalizedCategories, 'Categories');
  await persistOptionalRows('catalog_brands', normalizedBrands, 'Brands');
  await persistOptionalRows('catalog_subcategories', normalizedSubcategories, 'Subcategories');

  const { error: productError } = await supabase
    .from('products')
    .upsert(normalizedProducts, { onConflict: 'id' });

  if (productError) {
    throw productError;
  }

  return {
    products: normalizedProducts.map((product, index) => createFallbackProduct(product, index)),
    categories: normalizedCategories,
    brands: normalizedBrands,
    subcategories: normalizedSubcategories,
    persisted: true,
    source: 'supabase',
    warnings,
  };
}

export async function seedSupabaseCatalog() {
  const result = await importCatalogDataset({
    products: buildFallbackCatalog(),
    categories: buildFallbackCategoryDefinitions(),
    brands: buildFallbackBrandDefinitions(),
    subcategories: buildFallbackSubcategoryDefinitions(),
  });

  return {
    inserted: result.products.length,
    source: result.source,
    warnings: result.warnings,
  };
}

export async function getCurrentSession() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export function subscribeToAuthChanges(callback) {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
}

function normalizeAuthError(error) {
  const message = String(error?.message ?? '').trim();
  const normalizedMessage = message.toLowerCase();

  if (!message) {
    return new Error('Could not sign in. Check the account details and try again.');
  }

  if (normalizedMessage.includes('invalid login credentials')) {
    return new Error('Email or password is incorrect.');
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return new Error('This email address is not confirmed yet. Confirm the account, then try again.');
  }

  if (normalizedMessage.includes('rate limit') || normalizedMessage.includes('too many requests')) {
    return new Error('Too many sign-in attempts. Wait a minute and try again.');
  }

  if (error?.status === 400) {
    return new Error(`Sign-in request was rejected: ${message}`);
  }

  return new Error(message);
}

export async function signInWithPassword(email, password) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('The Supabase connection is not active. Restart the app after configuring the environment variables.');
  }

  const normalizedEmail = String(email ?? '').trim();
  const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

  if (error) {
    throw normalizeAuthError(error);
  }
}

export async function signOut() {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function fetchProfile(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return null;
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function uploadProductImage(file, productId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configure Supabase before uploading images.');
  }

  const sanitizedName = file.name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, '-');
  const extension = sanitizedName.split('.').pop() || 'jpg';
  const path = `products/${productId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);

  return {
    path,
    publicUrl,
  };
}

export async function restoreCatalogBackup(snapshot) {
  const replacement = await importCatalogDataset(snapshot);

  if (!isSupabaseConfigured || !supabase) {
    return replacement;
  }

  const normalizedProductIds = new Set(replacement.products.map((product) => Number(product.id)));

  const { data: currentProducts, error: currentProductsError } = await supabase.from('products').select('id');

  if (currentProductsError) {
    throw currentProductsError;
  }

  const productsToDelete = (currentProducts ?? [])
    .map((row) => row.id)
    .filter((id) => !normalizedProductIds.has(Number(id)));

  if (productsToDelete.length) {
    const { error } = await supabase.from('products').delete().in('id', productsToDelete);

    if (error) {
      throw error;
    }
  }

  return replacement;
}