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
    category: normalizeCategoryId(product.category),
    image: normalizeImagePath(product.image),
    sku: product.sku ?? '',
    unit_size: product.unit_size ?? '',
    visible: product.visible ?? true,
    featured: product.featured ?? index < 6,
    sort_order: product.sort_order ?? index,
    metadata: product.metadata ?? {},
  };
}

export function buildFallbackCatalog() {
  return PRODUCTS.map(createFallbackProduct);
}

function normalizeSubcategoryDefinition(definition, index = 0) {
  const category = normalizeCategoryId(definition.category);
  const name = String(definition.name ?? '')
    .trim();

  return {
    id: definition.id ?? `${category}:${slugify(name)}`,
    category,
    name,
    sort_order: Number(definition.sort_order) || index,
  };
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
    throw new Error('La subcategoría necesita un nombre.');
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      definition: normalized,
      persisted: false,
      source: 'local',
    };
  }

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
}

export async function deleteSubcategoryDefinition(definitionId) {
  if (!isSupabaseConfigured || !supabase) {
    return { persisted: false, source: 'local' };
  }

  const { error } = await supabase.from('catalog_subcategories').delete().eq('id', definitionId);

  if (error) {
    throw error;
  }

  return { persisted: true, source: 'supabase' };
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
    name: product.name.trim(),
    brand: product.brand?.trim() ?? '',
    sku: product.sku?.trim() ?? '',
    unit_size: product.unit_size?.trim() ?? '',
    category: normalizeCategoryId(product.category),
    subcategory: product.subcategory?.trim() ?? '',
    description: product.description?.trim() ?? '',
    image: product.image?.trim() ?? '',
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

export async function seedSupabaseCatalog() {
  if (!isSupabaseConfigured || !supabase) {
    return { inserted: 0, source: 'local' };
  }

  const rows = buildFallbackCatalog().map(normalizeForWrite);
  const { error } = await supabase.from('products').upsert(rows, { onConflict: 'id' });

  if (error) {
    throw error;
  }

  return { inserted: rows.length, source: 'supabase' };
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

export async function signInWithPassword(email, password) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configure Supabase before using login.');
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
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
  const normalizedProducts = Array.isArray(snapshot?.products)
    ? snapshot.products.map(normalizeForWrite)
    : [];
  const normalizedSubcategories = Array.isArray(snapshot?.subcategories)
    ? snapshot.subcategories.map((definition, index) => normalizeSubcategoryDefinition(definition, index))
    : [];

  if (!normalizedProducts.length && !normalizedSubcategories.length) {
    throw new Error('El archivo no contiene productos o subcategorías válidas.');
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      products: normalizedProducts.map((product, index) => createFallbackProduct(product, index)),
      subcategories: normalizedSubcategories,
      persisted: false,
      source: 'local',
    };
  }

  const { data: currentProducts, error: currentProductsError } = await supabase
    .from('products')
    .select('id');

  if (currentProductsError) {
    throw currentProductsError;
  }

  const { data: currentSubcategories, error: currentSubcategoriesError } = await supabase
    .from('catalog_subcategories')
    .select('id');

  if (currentSubcategoriesError) {
    throw currentSubcategoriesError;
  }

  if (normalizedProducts.length) {
    const { error } = await supabase.from('products').upsert(normalizedProducts, { onConflict: 'id' });

    if (error) {
      throw error;
    }
  }

  if (normalizedSubcategories.length) {
    const { error } = await supabase
      .from('catalog_subcategories')
      .upsert(normalizedSubcategories, { onConflict: 'id' });

    if (error) {
      throw error;
    }
  }

  const productIds = new Set(normalizedProducts.map((product) => product.id));
  const subcategoryIds = new Set(normalizedSubcategories.map((definition) => definition.id));
  const productsToDelete = (currentProducts ?? []).map((row) => row.id).filter((id) => !productIds.has(id));
  const subcategoriesToDelete = (currentSubcategories ?? [])
    .map((row) => row.id)
    .filter((id) => !subcategoryIds.has(id));

  if (productsToDelete.length) {
    const { error } = await supabase.from('products').delete().in('id', productsToDelete);

    if (error) {
      throw error;
    }
  }

  if (subcategoriesToDelete.length) {
    const { error } = await supabase
      .from('catalog_subcategories')
      .delete()
      .in('id', subcategoriesToDelete);

    if (error) {
      throw error;
    }
  }

  return {
    products: normalizedProducts.map((product, index) => createFallbackProduct(product, index)),
    subcategories: normalizedSubcategories,
    persisted: true,
    source: 'supabase',
  };
}