import { CATEGORIES, PRODUCTS } from '../../products.js';
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

export const PRODUCT_IMAGE_BUCKET = 'product-images';

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