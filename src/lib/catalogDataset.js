const LOCAL_IMAGE_MODULES = import.meta.glob(
  '../../images/**/*.{png,jpg,jpeg,webp,avif,PNG,JPG,JPEG,WEBP,AVIF}',
);

const PRODUCT_CSV_HEADERS = [
  'id',
  'name',
  'brand',
  'sku',
  'unit_size',
  'category',
  'subcategory',
  'description',
  'image',
  'visible',
  'featured',
  'sort_order',
];

const HEADER_ALIASES = new Map([
  ['id', 'id'],
  ['product id', 'id'],
  ['product_id', 'id'],
  ['nombre', 'name'],
  ['name', 'name'],
  ['producto', 'name'],
  ['product', 'name'],
  ['brand', 'brand'],
  ['marca', 'brand'],
  ['sku', 'sku'],
  ['unit', 'unit_size'],
  ['unit size', 'unit_size'],
  ['unit_size', 'unit_size'],
  ['unidad', 'unit_size'],
  ['tamano', 'unit_size'],
  ['tamano unidad', 'unit_size'],
  ['size', 'unit_size'],
  ['category', 'category'],
  ['categoria', 'category'],
  ['subcategory', 'subcategory'],
  ['sub category', 'subcategory'],
  ['subcategoria', 'subcategory'],
  ['sub-categoria', 'subcategory'],
  ['description', 'description'],
  ['descripcion', 'description'],
  ['image', 'image'],
  ['imagen', 'image'],
  ['photo', 'image'],
  ['visible', 'visible'],
  ['public', 'visible'],
  ['featured', 'featured'],
  ['destacado', 'featured'],
  ['sort', 'sort_order'],
  ['sort order', 'sort_order'],
  ['sort_order', 'sort_order'],
  ['orden', 'sort_order'],
]);

export const LOCAL_IMAGE_ASSETS = Object.entries(LOCAL_IMAGE_MODULES)
  .map(([filePath]) => {
    const normalizedPath = filePath.replace('../../', '').replace(/\\/g, '/');

    return {
      path: normalizedPath,
      url: `/${normalizedPath}`,
    };
  })
  .sort((left, right) => left.path.localeCompare(right.path));

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugify(value) {
  return normalizeText(value).replace(/\s+/g, '-');
}

function normalizeImageKey(image) {
  if (!image) {
    return '';
  }

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  return image.replace(/^\/+/, '').replace(/^\.\//, '').replace(/\\/g, '/');
}

function titleCase(value) {
  return String(value ?? '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function escapeCsvValue(value) {
  const normalized = value == null ? '' : String(value);
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replace(/"/g, '""')}"`;
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }

      row.push(current);
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      current = '';
      continue;
    }

    current += character;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function mapHeaders(headers) {
  return headers.map((header) => HEADER_ALIASES.get(normalizeText(header)) ?? null);
}

function parseBooleanish(value, fallback) {
  if (value == null || value === '') {
    return fallback;
  }

  const normalized = normalizeText(value);

  if (['true', '1', 'yes', 'si', 'visible', 'publico', 'public'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'oculto', 'hidden'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseNumberish(value, fallback) {
  if (value == null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildCategoryDefinitionsFromProducts(products) {
  const byId = new Map();

  products.forEach((product, index) => {
    const categoryId = slugify(product.category || 'grocery') || 'grocery';

    if (!byId.has(categoryId)) {
      byId.set(categoryId, {
        id: categoryId,
        name: titleCase(product.category || categoryId),
        sort_order: index,
      });
    }
  });

  return [...byId.values()].sort(
    (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name),
  );
}

function buildBrandDefinitionsFromProducts(products) {
  const byId = new Map();

  products.forEach((product, index) => {
    const name = String(product.brand ?? '').trim();
    if (!name) {
      return;
    }

    const id = slugify(name) || `brand-${index + 1}`;

    if (!byId.has(id)) {
      byId.set(id, {
        id,
        name,
        category: String(product.category ?? '').trim(),
        sort_order: index,
        notes: '',
      });
    }
  });

  return [...byId.values()].sort(
    (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name),
  );
}

function buildSubcategoryDefinitionsFromProducts(products) {
  const byId = new Map();

  products.forEach((product, index) => {
    const name = String(product.subcategory ?? '').trim();
    const category = String(product.category ?? '').trim();
    if (!name || !category) {
      return;
    }

    const id = `${slugify(category) || 'category'}:${slugify(name) || `subcategory-${index + 1}`}`;
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        category,
        name,
        sort_order: index,
      });
    }
  });

  return [...byId.values()].sort(
    (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name),
  );
}

export function buildCatalogSnapshot({ products, categories, brands, subcategories }) {
  const normalizedProducts = Array.isArray(products) ? products : [];
  const normalizedCategories = Array.isArray(categories) && categories.length
    ? categories
    : buildCategoryDefinitionsFromProducts(normalizedProducts);
  const normalizedBrands = Array.isArray(brands) && brands.length
    ? brands
    : buildBrandDefinitionsFromProducts(normalizedProducts);
  const normalizedSubcategories = Array.isArray(subcategories) && subcategories.length
    ? subcategories
    : buildSubcategoryDefinitionsFromProducts(normalizedProducts);

  return {
    version: 2,
    exported_at: new Date().toISOString(),
    products: normalizedProducts,
    categories: normalizedCategories,
    brands: normalizedBrands,
    subcategories: normalizedSubcategories,
  };
}

export function buildProductsCsv(products) {
  const rows = [PRODUCT_CSV_HEADERS.join(',')];

  products.forEach((product) => {
    rows.push(
      PRODUCT_CSV_HEADERS.map((header) => escapeCsvValue(product[header]))
        .join(','),
    );
  });

  return rows.join('\n');
}

export function parseDatasetFile(fileName, fileText) {
  const normalizedName = String(fileName ?? '').trim().toLowerCase();

  if (normalizedName.endsWith('.json')) {
    const snapshot = JSON.parse(fileText);
    return buildCatalogSnapshot({
      products: snapshot.products,
      categories: snapshot.categories,
      brands: snapshot.brands,
      subcategories: snapshot.subcategories,
    });
  }

  const rows = parseCsv(fileText);
  if (!rows.length) {
    throw new Error('El archivo CSV está vacío.');
  }

  const [headerRow, ...bodyRows] = rows;
  const mappedHeaders = mapHeaders(headerRow);
  const products = bodyRows
    .map((cells, index) => {
      const row = {};

      mappedHeaders.forEach((field, fieldIndex) => {
        if (!field) {
          return;
        }

        row[field] = cells[fieldIndex] ?? '';
      });

      const name = String(row.name ?? '').trim();
      if (!name) {
        return null;
      }

      return {
        id: parseNumberish(row.id, Date.now() + index),
        name,
        brand: String(row.brand ?? '').trim(),
        sku: String(row.sku ?? '').trim(),
        unit_size: String(row.unit_size ?? '').trim(),
        category: String(row.category ?? 'grocery').trim() || 'grocery',
        subcategory: String(row.subcategory ?? '').trim(),
        description: String(row.description ?? '').trim(),
        image: String(row.image ?? '').trim(),
        visible: parseBooleanish(row.visible, true),
        featured: parseBooleanish(row.featured, false),
        sort_order: parseNumberish(row.sort_order, index),
        metadata: {},
      };
    })
    .filter(Boolean);

  if (!products.length) {
    throw new Error('No encontré filas válidas de productos en el CSV.');
  }

  return buildCatalogSnapshot({ products });
}

export function downloadTextFile(filename, content, mimeType) {
  if (typeof window === 'undefined') {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function getProductAuditIssues(product) {
  const issues = [];

  if (!product.image) {
    issues.push('Missing image');
  }

  if (!product.brand) {
    issues.push('Missing brand');
  }

  if (!product.sku) {
    issues.push('Missing SKU');
  }

  if (!product.category) {
    issues.push('Missing category');
  }

  if (!product.subcategory) {
    issues.push('Missing subcategory');
  }

  return issues;
}

export function buildImageAudit(products) {
  const localImagesByPath = new Map(LOCAL_IMAGE_ASSETS.map((asset) => [asset.path, asset]));
  const assignedLocalPaths = new Set();

  const assigned = products
    .filter((product) => product.image)
    .map((product) => {
      const imageKey = normalizeImageKey(product.image);
      const localAsset = localImagesByPath.get(imageKey) ?? null;

      if (localAsset) {
        assignedLocalPaths.add(localAsset.path);
      }

      return {
        product,
        imageKey,
        source: localAsset ? 'local' : imageKey.startsWith('http') ? 'remote' : 'custom',
        previewUrl: localAsset?.url ?? product.image,
        issues: getProductAuditIssues(product),
      };
    })
    .sort((left, right) => left.product.name.localeCompare(right.product.name));

  const unassignedLocal = LOCAL_IMAGE_ASSETS
    .filter((asset) => !assignedLocalPaths.has(asset.path))
    .map((asset) => ({
      path: asset.path,
      previewUrl: asset.url,
    }));

  return {
    assigned,
    unassignedLocal,
  };
}