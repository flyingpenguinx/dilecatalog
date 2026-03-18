import { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { CATEGORIES } from '../products.js';
import imageManifest from './data/image-manifest.json';
import {
  createEmptyProduct,
  deleteSubcategoryDefinition,
  deleteProduct,
  fetchCatalog,
  fetchProfile,
  getCurrentSession,
  fetchSubcategoryDefinitions,
  restoreCatalogBackup,
  saveProduct,
  saveSubcategoryDefinition,
  signInWithPassword,
  signOut,
  subscribeToAuthChanges,
  uploadProductImage,
} from './lib/catalogApi.js';
import { isSupabaseConfigured } from './lib/supabase.js';

const CATEGORY_LABELS = {
  all: 'Todos',
  frozen: 'Frozen',
  grocery: 'Grocery',
  dairy: 'Dairy',
  vitamins: 'Vitamins',
};

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function formatCategory(categoryId) {
  return CATEGORY_LABELS[categoryId] ?? categoryId;
}

function formatImagePath(image) {
  if (!image) return '';
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/')) {
    return image;
  }

  return `/${image}`;
}

function resolveManifestImage(image) {
  const normalized = formatImagePath(image);

  if (!normalized || normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return '';
  }

  const trimmed = normalized.replace(/^\//, '');
  const filename = trimmed.split('/').pop() ?? '';
  const baseName = filename.replace(/\.[^./]+$/, '');

  return imageManifest[normalized] ?? imageManifest[trimmed] ?? imageManifest[filename] ?? imageManifest[baseName] ?? '';
}

function buildImageCandidates(image) {
  const normalized = formatImagePath(image);
  const manifestImage = resolveManifestImage(image);

  if (!normalized || normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized ? [normalized] : [];
  }

  const extensionMatch = normalized.match(/\.[^./]+$/);
  const basePath = extensionMatch ? normalized.slice(0, -extensionMatch[0].length) : normalized;

  return [
    ...new Set([
      manifestImage,
      normalized,
      `${basePath}.jpg`,
      `${basePath}.jpeg`,
      `${basePath}.png`,
      `${basePath}.webp`,
      `${basePath}.HEIC`,
      `${basePath}.heic`,
      '/logos/dile logo cow.jpg',
    ].filter(Boolean)),
  ];
}

function ProductImage({ alt, image, className }) {
  const candidates = useMemo(() => buildImageCandidates(image), [image]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [image]);

  const src = candidates[candidateIndex] ?? '/logos/dile logo cow.jpg';

  return (
    <img
      alt={alt}
      className={className}
      onError={() => {
        setCandidateIndex((current) => {
          if (current >= candidates.length - 1) {
            return current;
          }

          return current + 1;
        });
      }}
      src={src}
    />
  );
}

function buildCategorySummary(products, subcategoryDefinitions) {
  return ['all', ...CATEGORIES.map((category) => category.id)].map((categoryId) => ({
    id: categoryId,
    label: categoryId === 'all' ? 'Todos' : formatCategory(categoryId),
    marker:
      categoryId === 'all'
        ? '00'
        : String(CATEGORIES.findIndex((category) => category.id === categoryId) + 1).padStart(2, '0'),
    note:
      categoryId === 'all'
        ? 'Colección completa'
        : `${subcategoryDefinitions.filter((definition) => definition.category === categoryId).length} subcategorías`,
    count:
      categoryId === 'all'
        ? products.length
        : products.filter((product) => product.category === categoryId).length,
  }));
}

function buildSubcategorySuggestions(categoryId, subcategoryDefinitions, currentValue = '') {
  return [...new Set(
    subcategoryDefinitions
      .filter((definition) => definition.category === categoryId)
      .map((definition) => definition.name)
      .concat(currentValue ? [currentValue] : []),
  )].sort((left, right) => left.localeCompare(right));
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

function applyCatalogFilters(products, search, category, subcategory, featuredOnly) {
  const query = search.trim().toLowerCase();

  return products.filter((product) => {
    const matchesCategory = category === 'all' || product.category === category;
    const matchesSubcategory = subcategory === 'all' || product.subcategory === subcategory;
    const matchesFeatured = !featuredOnly || product.featured;
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.unit_size.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.subcategory.toLowerCase().includes(query);

    return matchesCategory && matchesSubcategory && matchesFeatured && matchesSearch;
  });
}

function ProductModal({ product, onClose }) {
  useEffect(() => {
    if (!product) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, product]);

  if (!product) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <section className="modal-shell" onClick={(event) => event.stopPropagation()}>
        <button className="ghost-button modal-close" onClick={onClose} type="button">
          Cerrar
        </button>
        <div className="modal-layout">
          <div className="modal-visual">
            <ProductImage alt={product.name} image={product.image} />
          </div>
          <div className="modal-copy">
            <span className="eyebrow">{formatCategory(product.category)}</span>
            <h2>{product.name}</h2>
            <p className="modal-brand">{product.brand || 'Sin marca'}</p>
            <div className="detail-grid">
              <div>
                <span className="detail-label">Subcategoría</span>
                <strong>{product.subcategory || 'No definida'}</strong>
              </div>
              <div>
                <span className="detail-label">SKU</span>
                <strong>{product.sku || 'No definido'}</strong>
              </div>
              <div>
                <span className="detail-label">Unidad</span>
                <strong>{product.unit_size || 'No definida'}</strong>
              </div>
              <div>
                <span className="detail-label">Estado</span>
                <strong>{product.visible ? 'Visible' : 'Oculto'}</strong>
              </div>
              <div>
                <span className="detail-label">Destacado</span>
                <strong>{product.featured ? 'Sí' : 'No'}</strong>
              </div>
            </div>
            <p className="modal-description">
              {product.description || 'Producto auténtico centroamericano.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CatalogPage({ products, subcategoryDefinitions }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [subcategory, setSubcategory] = useState('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    setSubcategory('all');
  }, [category]);

  const visibleProducts = useMemo(
    () => products.filter((product) => product.visible !== false),
    [products],
  );
  const categorySummary = useMemo(
    () => buildCategorySummary(visibleProducts, subcategoryDefinitions),
    [subcategoryDefinitions, visibleProducts],
  );
  const subcategories = useMemo(() => {
    if (category === 'all') {
      return [];
    }

    return [...new Set(
      visibleProducts
        .filter((product) => product.category === category && product.subcategory)
        .map((product) => product.subcategory),
    )].sort((left, right) => left.localeCompare(right));
  }, [category, visibleProducts]);
  const filteredProducts = useMemo(
    () => applyCatalogFilters(visibleProducts, search, category, subcategory, featuredOnly),
    [category, featuredOnly, search, subcategory, visibleProducts],
  );

  return (
    <>
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">DILE Distributors</span>
          <h1>Encuentra los productos que distribuimos.</h1>
          <p>
            Explora por categoria, filtra productos destacados y encuentra rapidamente lo que tu
            negocio necesita.
          </p>
          <div className="hero-actions">
            <label className="search-shell" htmlFor="catalog-search">
              <span>Buscar</span>
              <input
                id="catalog-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Marca, producto o descripción"
                type="search"
                value={search}
              />
            </label>
            <button
              className={classNames('tag-button', featuredOnly && 'tag-button-active')}
              onClick={() => setFeaturedOnly((value) => !value)}
              type="button"
            >
              {featuredOnly ? 'Mostrando solo destacados' : 'Filtrar destacados'}
            </button>
          </div>
        </div>
      </section>

      <section className="filter-panel">
        <div className="chip-row">
          {categorySummary.map((entry) => (
            <button
              className={classNames('chip', category === entry.id && 'chip-active')}
              key={entry.id}
              onClick={() => setCategory(entry.id)}
              type="button"
            >
              <span className="chip-marker">{entry.marker}</span>
              <span className="chip-label-group">
                <span>{entry.label}</span>
                <small>{entry.note}</small>
              </span>
              <strong>{entry.count}</strong>
            </button>
          ))}
        </div>
        {subcategories.length > 0 ? (
          <div className="chip-row chip-row-secondary">
            <button
              className={classNames('chip', subcategory === 'all' && 'chip-active')}
              onClick={() => setSubcategory('all')}
              type="button"
            >
              Todas
            </button>
            {subcategories.map((value) => (
              <button
                className={classNames('chip', subcategory === value && 'chip-active')}
                key={value}
                onClick={() => setSubcategory(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="catalog-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Catálogo</span>
            <h2>{filteredProducts.length} productos disponibles</h2>
          </div>
          <p>Usa categorías, subcategorías y búsqueda para encontrar productos rápido.</p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-panel">
            <h3>No hay coincidencias</h3>
            <p>Prueba otra búsqueda o cambia los filtros.</p>
          </div>
        ) : (
          <div className="catalog-grid">
            {filteredProducts.map((product) => (
              <article className="catalog-card" key={product.id}>
                <button className="catalog-card-button" onClick={() => setSelectedProduct(product)} type="button">
                  <div className="catalog-image-shell">
                    <ProductImage alt={product.name} image={product.image} />
                    {product.featured ? <span className="floating-badge">Destacado</span> : null}
                  </div>
                  <div className="catalog-copy">
                    <span className="catalog-meta">{formatCategory(product.category)}</span>
                    <h3>{product.name}</h3>
                    <p>{[product.brand, product.unit_size].filter(Boolean).join(' · ')}</p>
                  </div>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <ProductModal onClose={() => setSelectedProduct(null)} product={selectedProduct} />
    </>
  );
}

function LoginPanel({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signInWithPassword(email, password);
      onSignedIn?.();
    } catch (submissionError) {
      setError(submissionError.message ?? 'No se pudo iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="admin-shell narrow-shell">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Admin</span>
          <h2>Inicia sesión para editar el catálogo</h2>
        </div>
        <p>Solo usuarios autorizados pueden entrar y hacer cambios.</p>
      </div>
      <form className="admin-form auth-form" onSubmit={handleSubmit}>
        <label>
          Correo
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          Contraseña
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="notice notice-error">{error}</p> : null}
        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </section>
  );
}

function AccessDenied({ onSignOut }) {
  return (
    <section className="admin-shell narrow-shell">
      <div className="notice notice-error">
        Tu usuario no tiene permisos para administrar el catálogo.
      </div>
      <button className="ghost-button" onClick={onSignOut} type="button">
        Cerrar sesión
      </button>
    </section>
  );
}

function AdminHelp() {
  return (
    <section className="admin-help">
      <div className="admin-help-header">
        <div>
          <span className="eyebrow">Guía rápida</span>
          <h3>Cómo usar el panel</h3>
        </div>
        <p>Todo está pensado para editar el catálogo sin tocar nada técnico.</p>
      </div>
      <div className="admin-help-grid">
        <details open>
          <summary>Editar un producto</summary>
          <p>Busca el producto, haz clic sobre él, cambia los campos y presiona Guardar cambios.</p>
        </details>
        <details>
          <summary>Cambiar la imagen</summary>
          <p>Usa el campo de subida para reemplazar la imagen. También puedes pegar una URL si ya la tienes.</p>
        </details>
        <details>
          <summary>Categorías y subcategorías</summary>
          <p>Las categorías principales son fijas. Las subcategorías se pueden crear, editar o eliminar abajo.</p>
        </details>
        <details>
          <summary>Respaldo y restauración</summary>
          <p>Exporta un respaldo antes de cambios grandes. Si hace falta, puedes restaurar un archivo JSON del catálogo.</p>
        </details>
      </div>
    </section>
  );
}

function ProductPicker({ onClose, onSelect, products, query, setQuery, selectedId }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <section className="picker-shell" onClick={(event) => event.stopPropagation()}>
        <div className="picker-header">
          <div>
            <span className="eyebrow">Lista rápida</span>
            <h3>Buscar productos por nombre</h3>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
        <label className="picker-search">
          <span>Buscar producto</span>
          <input
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Escribe nombre, marca, SKU o subcategoría"
            type="search"
            value={query}
          />
        </label>
        <div className="picker-list">
          {products.map((product) => (
            <button
              className={classNames('picker-item', selectedId === product.id && 'picker-item-active')}
              key={product.id}
              onClick={() => onSelect(product)}
              type="button"
            >
              <strong>{product.name}</strong>
              <span>{[product.brand || 'Sin marca', formatCategory(product.category), product.subcategory || null].filter(Boolean).join(' · ')}</span>
            </button>
          ))}
          {products.length === 0 ? <p className="taxonomy-empty">No hay productos con esa búsqueda.</p> : null}
        </div>
      </section>
    </div>
  );
}

function AdminDashboard({
  products,
  profile,
  subcategoryDefinitions,
  onCatalogRefresh,
  onProductsChange,
  onSubcategoriesChange,
}) {
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? null);
  const [draft, setDraft] = useState(products[0] ?? createEmptyProduct());
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [subcategoryDraft, setSubcategoryDraft] = useState({
    id: '',
    category: CATEGORIES[0]?.id ?? 'frozen',
    name: '',
    sort_order: 0,
  });
  const [isSavingSubcategory, setIsSavingSubcategory] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  useEffect(() => {
    if (!products.length) {
      setDraft(createEmptyProduct());
      setSelectedId(null);
      return;
    }

    const nextProduct = products.find((product) => product.id === selectedId) ?? products[0];
    setSelectedId(nextProduct.id);
    setDraft(nextProduct);
  }, [products, selectedId]);

  useEffect(() => {
    setSubcategoryDraft((current) =>
      current.id
        ? current
        : {
            ...current,
            category: draft.category || current.category,
            sort_order: subcategoryDefinitions.length,
          },
    );
  }, [draft.category, subcategoryDefinitions.length]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.brand.toLowerCase().includes(normalizedQuery) ||
        product.sku.toLowerCase().includes(normalizedQuery) ||
        product.unit_size.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery) ||
        product.subcategory.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [products, query]);

  const handleFieldChange = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSelectProduct = (product) => {
    setSelectedId(product.id);
    setDraft(product);
    setIsProductPickerOpen(false);
  };

  const handleSelectForBulk = (productId, checked) => {
    setSelectedProductIds((current) => {
      if (checked) {
        return current.includes(productId) ? current : [...current, productId];
      }

      return current.filter((id) => id !== productId);
    });
  };

  const persistProducts = async (nextProducts) => {
    const sortedProducts = [...nextProducts].sort(
      (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name),
    );
    onProductsChange(sortedProducts);
    await onCatalogRefresh();
    return sortedProducts;
  };

  const handleSetProductVisibility = async (productIds, visible) => {
    if (!productIds.length) {
      return;
    }

    setNotice('');

    try {
      const nextProducts = [...products];

      await Promise.all(
        productIds.map(async (productId) => {
          const index = nextProducts.findIndex((product) => product.id === productId);
          if (index < 0) {
            return;
          }

          const result = await saveProduct({ ...nextProducts[index], visible });
          nextProducts[index] = result.product;
        }),
      );

      await persistProducts(nextProducts);
      setSelectedProductIds((current) => current.filter((id) => !productIds.includes(id)));
      setNotice(
        visible
          ? `${productIds.length} producto(s) marcados como activos en el catálogo.`
          : `${productIds.length} producto(s) ocultados del catálogo.`,
      );
    } catch (error) {
      setNotice(error.message ?? 'No se pudo actualizar la visibilidad de los productos.');
    }
  };

  const suggestedSubcategories = useMemo(
    () => buildSubcategorySuggestions(draft.category, subcategoryDefinitions, draft.subcategory),
    [draft.category, draft.subcategory, subcategoryDefinitions],
  );

  const groupedSubcategories = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        ...category,
        items: subcategoryDefinitions
          .filter((definition) => definition.category === category.id)
          .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name)),
      })),
    [subcategoryDefinitions],
  );

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setNotice('');

    if (!draft?.id) {
      setNotice('Guarda o define un ID de producto antes de subir una imagen.');
      event.target.value = '';
      return;
    }

    setIsUploadingImage(true);

    try {
      const upload = await uploadProductImage(file, draft.id);
      setDraft((current) => ({ ...current, image: upload.publicUrl }));
      setNotice('Imagen cargada. Guarda el producto para aplicar el cambio.');
    } catch (error) {
      setNotice(error.message ?? 'No se pudo subir la imagen.');
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setNotice('');
    setIsSaving(true);

    try {
      const result = await saveProduct(draft);
      const nextProducts = [...products];
      const productIndex = nextProducts.findIndex((product) => product.id === result.product.id);

      if (productIndex >= 0) {
        nextProducts[productIndex] = result.product;
      } else {
        nextProducts.unshift(result.product);
      }

      await persistProducts(nextProducts);
      setSelectedId(result.product.id);
      setNotice(result.persisted ? 'Producto guardado correctamente.' : 'Producto guardado en esta sesión.');
    } catch (error) {
      setNotice(error.message ?? 'No se pudo guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft?.id) {
      return;
    }

    if (!window.confirm(`Eliminar ${draft.name || 'este producto'}?`)) {
      return;
    }

    setNotice('');

    try {
      const result = await deleteProduct(draft.id);
      const nextProducts = products.filter((product) => product.id !== draft.id);
      await persistProducts(nextProducts);
      setSelectedProductIds((current) => current.filter((id) => id !== draft.id));
      setNotice(result.persisted ? 'Producto eliminado correctamente.' : 'Producto eliminado en esta sesión.');
    } catch (error) {
      setNotice(error.message ?? 'No se pudo eliminar el producto.');
    }
  };

  const handleSaveSubcategory = async () => {
    setNotice('');
    setIsSavingSubcategory(true);

    try {
      const result = await saveSubcategoryDefinition(subcategoryDraft);
      const nextDefinitions = [...subcategoryDefinitions];
      const definitionIndex = nextDefinitions.findIndex((definition) => definition.id === result.definition.id);

      if (definitionIndex >= 0) {
        nextDefinitions[definitionIndex] = result.definition;
      } else {
        nextDefinitions.push(result.definition);
      }

      nextDefinitions.sort(
        (left, right) =>
          left.category.localeCompare(right.category) ||
          left.sort_order - right.sort_order ||
          left.name.localeCompare(right.name),
      );
      onSubcategoriesChange(nextDefinitions);
      setSubcategoryDraft({
        id: '',
        category: draft.category,
        name: '',
        sort_order: nextDefinitions.length,
      });
      setNotice(result.persisted ? 'Subcategoría guardada correctamente.' : 'Subcategoría guardada en esta sesión.');
    } catch (error) {
      setNotice(error.message ?? 'No se pudo guardar la subcategoría.');
    } finally {
      setIsSavingSubcategory(false);
    }
  };

  const handleSaveCurrentProductSubcategory = async () => {
    setSubcategoryDraft((current) => ({
      ...current,
      category: draft.category,
      name: draft.subcategory,
    }));

    try {
      const result = await saveSubcategoryDefinition({
        category: draft.category,
        name: draft.subcategory,
        sort_order: subcategoryDefinitions.length,
      });
      const nextDefinitions = [...subcategoryDefinitions];
      const definitionIndex = nextDefinitions.findIndex((definition) => definition.id === result.definition.id);

      if (definitionIndex >= 0) {
        nextDefinitions[definitionIndex] = result.definition;
      } else {
        nextDefinitions.push(result.definition);
      }

      nextDefinitions.sort(
        (left, right) =>
          left.category.localeCompare(right.category) ||
          left.sort_order - right.sort_order ||
          left.name.localeCompare(right.name),
      );
      onSubcategoriesChange(nextDefinitions);
      setNotice(result.persisted ? 'Subcategoría agregada a las opciones.' : 'Subcategoría guardada en esta sesión.');
    } catch (error) {
      setNotice(error.message ?? 'No se pudo guardar la subcategoría actual.');
    }
  };

  const handleDeleteSubcategory = async (definition) => {
    setNotice('');

    try {
      const result = await deleteSubcategoryDefinition(definition.id);
      onSubcategoriesChange(subcategoryDefinitions.filter((item) => item.id !== definition.id));

      if (draft.subcategory === definition.name && draft.category === definition.category) {
        setDraft((current) => ({ ...current, subcategory: '' }));
      }

      if (subcategoryDraft.id === definition.id) {
        setSubcategoryDraft({
          id: '',
          category: draft.category,
          name: '',
          sort_order: subcategoryDefinitions.length,
        });
      }

      setNotice(result.persisted ? 'Subcategoría eliminada correctamente.' : 'Subcategoría eliminada en esta sesión.');
    } catch (error) {
      setNotice(error.message ?? 'No se pudo eliminar la subcategoría.');
    }
  };

  const handleExportBackup = () => {
    downloadJson(`dile-catalog-backup-${new Date().toISOString().slice(0, 10)}.json`, {
      exported_at: new Date().toISOString(),
      products,
      subcategories: subcategoryDefinitions,
    });
    setNotice('Respaldo descargado en JSON.');
  };

  const handleRestoreBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setNotice('');
    setIsRestoringBackup(true);

    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);

      if (!window.confirm('Esto reemplazará el catálogo actual con el contenido del respaldo. ¿Continuar?')) {
        return;
      }

      const result = await restoreCatalogBackup(snapshot);
      onProductsChange(result.products);
      onSubcategoriesChange(result.subcategories);
      setNotice(
        result.persisted
          ? `Respaldo restaurado. ${result.products.length} productos y ${result.subcategories.length} subcategorías sincronizados.`
          : 'Respaldo cargado en esta sesión.',
      );
      await onCatalogRefresh();
    } catch (error) {
      setNotice(error.message ?? 'No se pudo restaurar el respaldo.');
    } finally {
      setIsRestoringBackup(false);
      event.target.value = '';
    }
  };

  return (
    <section className="admin-shell">
      <AdminHelp />

      {isProductPickerOpen ? (
        <ProductPicker
          onClose={() => setIsProductPickerOpen(false)}
          onSelect={handleSelectProduct}
          products={filteredProducts}
          query={query}
          selectedId={draft?.id}
          setQuery={setQuery}
        />
      ) : null}

      <div className="section-heading">
        <div>
          <span className="eyebrow">Panel administrativo</span>
          <h2>Gestionar productos</h2>
        </div>
        <p>
          Sesión: {profile?.display_name || profile?.email || 'Usuario autenticado'} · Rol:{' '}
          {profile?.role || 'sin rol'}
        </p>
      </div>

      {notice ? <div className="notice notice-info">{notice}</div> : null}

      <div className="admin-layout">
        <aside className="admin-list-panel">
          <div className="admin-toolbar">
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar en admin"
              type="search"
              value={query}
            />
            {selectedProductIds.length ? (
              <div className="bulk-action-row">
                <button
                  className="ghost-button bulk-action-button bulk-action-button-green"
                  onClick={() => handleSetProductVisibility(selectedProductIds, true)}
                  type="button"
                >
                  Activar seleccionados ({selectedProductIds.length})
                </button>
                <button
                  className="ghost-button bulk-action-button"
                  onClick={() => handleSetProductVisibility(selectedProductIds, false)}
                  type="button"
                >
                  Ocultar seleccionados
                </button>
              </div>
            ) : null}
            <button className="ghost-button" onClick={() => setDraft(createEmptyProduct())} type="button">
              Nuevo producto
            </button>
            <button className="ghost-button" onClick={() => setIsProductPickerOpen(true)} type="button">
              Lista de productos
            </button>
            <button className="ghost-button" onClick={handleExportBackup} type="button">
              Exportar respaldo
            </button>
            <label className="ghost-button backup-upload-button">
              {isRestoringBackup ? 'Restaurando...' : 'Restaurar respaldo'}
              <input accept="application/json" onChange={handleRestoreBackup} type="file" />
            </label>
          </div>
          <div className="admin-list">
            {filteredProducts.map((product) => (
              <div
                className={classNames('admin-list-item', draft?.id === product.id && 'admin-list-item-active')}
                key={product.id}
              >
                <label className="admin-list-check">
                  <input
                    checked={selectedProductIds.includes(product.id)}
                    onChange={(event) => handleSelectForBulk(product.id, event.target.checked)}
                    type="checkbox"
                  />
                </label>
                <button className="admin-list-main" onClick={() => handleSelectProduct(product)} type="button">
                  <div>
                    <strong>{product.name}</strong>
                    <span>{[product.brand || 'Sin marca', product.sku || null, product.unit_size || null].filter(Boolean).join(' · ')}</span>
                  </div>
                </button>
                <div className="status-cluster">
                  <button
                    className={classNames(
                      'status-pill',
                      'status-toggle-button',
                      product.visible ? 'status-pill-green' : 'status-pill-gray',
                    )}
                    onClick={() => handleSetProductVisibility([product.id], !product.visible)}
                    type="button"
                  >
                    {product.visible ? 'Activo' : 'Oculto'}
                  </button>
                  {product.featured ? <span className="status-pill status-pill-gold">Destacado</span> : null}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <form className="admin-form" onSubmit={handleSave}>
          <div className="form-grid">
            <label>
              ID
              <input
                min="1"
                onChange={(event) => handleFieldChange('id', event.target.value)}
                required
                type="number"
                value={draft.id}
              />
            </label>
            <label>
              Orden
              <input
                onChange={(event) => handleFieldChange('sort_order', event.target.value)}
                type="number"
                value={draft.sort_order}
              />
            </label>
            <label className="full-span">
              Nombre
              <input
                onChange={(event) => handleFieldChange('name', event.target.value)}
                required
                type="text"
                value={draft.name}
              />
            </label>
            <label>
              Marca
              <input
                onChange={(event) => handleFieldChange('brand', event.target.value)}
                type="text"
                value={draft.brand}
              />
            </label>
            <label>
              SKU opcional
              <input
                onChange={(event) => handleFieldChange('sku', event.target.value)}
                placeholder="DILE-0001"
                type="text"
                value={draft.sku}
              />
            </label>
            <label>
              Unidad opcional
              <input
                onChange={(event) => handleFieldChange('unit_size', event.target.value)}
                placeholder="16 oz / 12 pack / 500 g"
                type="text"
                value={draft.unit_size}
              />
            </label>
            <label>
              Categoría
              <select
                onChange={(event) => handleFieldChange('category', event.target.value)}
                value={draft.category}
              >
                {CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {formatCategory(category.id)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subcategoría
              <input
                list="subcategory-options"
                onChange={(event) => handleFieldChange('subcategory', event.target.value)}
                type="text"
                value={draft.subcategory}
              />
              <datalist id="subcategory-options">
                {suggestedSubcategories.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </label>
            <label>
              Guardar esta subcategoría
              <button className="ghost-button admin-inline-button" onClick={handleSaveCurrentProductSubcategory} type="button">
                {isSavingSubcategory ? 'Guardando...' : 'Guardar opción'}
              </button>
            </label>
            <label className="full-span">
              Imagen actual
              <input
                onChange={(event) => handleFieldChange('image', event.target.value)}
                placeholder="https://... o ruta de imagen"
                type="text"
                value={draft.image}
              />
            </label>
            <label className="full-span upload-field">
              Subir nueva imagen
              <input
                accept="image/png,image/jpeg,image/webp,image/avif,image/heic,.heic,.HEIC"
                disabled={!isSupabaseConfigured || isUploadingImage}
                onChange={handleImageUpload}
                type="file"
              />
              <small>
                {isSupabaseConfigured
                  ? isUploadingImage
                    ? 'Subiendo imagen...'
                    : 'La imagen nueva reemplaza la actual cuando guardas el producto.'
                  : 'La subida de imágenes no está disponible en este entorno.'}
              </small>
            </label>
            <label className="full-span">
              Descripción opcional
              <textarea
                onChange={(event) => handleFieldChange('description', event.target.value)}
                rows="5"
                value={draft.description}
              />
              <small>Este campo es opcional.</small>
            </label>
          </div>

          <div className="toggle-row">
            <label className="toggle-card">
              <input
                checked={Boolean(draft.visible)}
                onChange={(event) => handleFieldChange('visible', event.target.checked)}
                type="checkbox"
              />
              <span>Visible en catálogo</span>
            </label>
            <label className="toggle-card">
              <input
                checked={Boolean(draft.featured)}
                onChange={(event) => handleFieldChange('featured', event.target.checked)}
                type="checkbox"
              />
              <span>Marcar como destacado</span>
            </label>
          </div>

          {draft.image ? (
            <div className="preview-panel">
              <ProductImage alt={draft.name || 'Preview de producto'} image={draft.image} />
            </div>
          ) : null}

          <div className="button-row">
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button className="ghost-button" onClick={handleDelete} type="button">
              Eliminar
            </button>
            <button
              className="ghost-button"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  id: Date.now(),
                  name: `${current.name || 'Producto'} copia`,
                }))
              }
              type="button"
            >
              Duplicar
            </button>
          </div>

          <section className="taxonomy-panel">
            <div className="taxonomy-panel-header">
              <div>
                <span className="eyebrow">Subcategorías</span>
                <h3>Gestionar opciones por categoría</h3>
              </div>
              <p>Las cuatro categorías principales siguen fijas. Aquí administras las subcategorías.</p>
            </div>
            <div className="form-grid taxonomy-form-grid">
              <label>
                Categoría principal
                <select
                  onChange={(event) =>
                    setSubcategoryDraft((current) => ({ ...current, category: event.target.value }))
                  }
                  value={subcategoryDraft.category}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {formatCategory(category.id)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nombre de subcategoría
                <input
                  onChange={(event) =>
                    setSubcategoryDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  type="text"
                  value={subcategoryDraft.name}
                />
              </label>
              <label>
                Orden
                <input
                  onChange={(event) =>
                    setSubcategoryDraft((current) => ({ ...current, sort_order: event.target.value }))
                  }
                  type="number"
                  value={subcategoryDraft.sort_order}
                />
              </label>
            </div>
            <div className="button-row">
              <button className="primary-button" onClick={handleSaveSubcategory} type="button">
                {isSavingSubcategory ? 'Guardando...' : subcategoryDraft.id ? 'Actualizar subcategoría' : 'Crear subcategoría'}
              </button>
              {subcategoryDraft.id ? (
                <button
                  className="ghost-button"
                  onClick={() =>
                    setSubcategoryDraft({
                      id: '',
                      category: draft.category,
                      name: '',
                      sort_order: subcategoryDefinitions.length,
                    })
                  }
                  type="button"
                >
                  Cancelar edición
                </button>
              ) : null}
            </div>
            <div className="taxonomy-groups">
              {groupedSubcategories.map((category) => (
                <div className="taxonomy-group" key={category.id}>
                  <h4>{formatCategory(category.id)}</h4>
                  <div className="taxonomy-list">
                    {category.items.map((definition) => (
                      <div className="taxonomy-item" key={definition.id}>
                        <button
                          className="ghost-button taxonomy-item-button"
                          onClick={() => setSubcategoryDraft(definition)}
                          type="button"
                        >
                          {definition.name}
                        </button>
                        <button
                          className="ghost-button taxonomy-item-delete"
                          onClick={() => handleDeleteSubcategory(definition)}
                          type="button"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                    {!category.items.length ? <p className="taxonomy-empty">Sin subcategorías guardadas.</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </form>
      </div>
    </section>
  );
}

function AdminPage({
  products,
  profile,
  session,
  subcategoryDefinitions,
  onCatalogRefresh,
  onProductsChange,
  onSubcategoriesChange,
}) {
  const canManage = profile?.role === 'admin' || profile?.role === 'editor';

  if (!isSupabaseConfigured) {
    return (
      <section className="admin-shell narrow-shell">
        <div className="notice notice-warning">
          El acceso administrativo no está disponible en este entorno.
        </div>
      </section>
    );
  }

  if (!session) {
    return <LoginPanel onSignedIn={onCatalogRefresh} />;
  }

  if (!canManage) {
    return <AccessDenied onSignOut={signOut} />;
  }

  return (
    <AdminDashboard
      onCatalogRefresh={onCatalogRefresh}
      onProductsChange={onProductsChange}
      onSubcategoriesChange={onSubcategoriesChange}
      products={products}
      profile={{ ...profile, email: session.user.email }}
      subcategoryDefinitions={subcategoryDefinitions}
    />
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [subcategoryDefinitions, setSubcategoryDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const canManage = profile?.role === 'admin' || profile?.role === 'editor';

  const refreshCatalog = async () => {
    const [catalogResult, subcategoryResult] = await Promise.all([
      fetchCatalog({ includeHidden: canManage }),
      fetchSubcategoryDefinitions(),
    ]);
    setProducts(catalogResult.products);
    setSubcategoryDefinitions(subcategoryResult.definitions);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    getCurrentSession().then(async (currentSession) => {
      if (!mounted) return;
      setSession(currentSession);

      if (currentSession?.user?.id) {
        try {
          const loadedProfile = await fetchProfile(currentSession.user.id);
          if (mounted) {
            setProfile(loadedProfile);
          }
        } catch {
          if (mounted) {
            setProfile(null);
          }
        }
      }
    });

    const unsubscribe = subscribeToAuthChanges(async (nextSession) => {
      setSession(nextSession);

      if (nextSession?.user?.id) {
        try {
          const loadedProfile = await fetchProfile(nextSession.user.id);
          setProfile(loadedProfile);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [canManage]);

  return (
    <div className="app-shell">
      <div className="background-orb orb-left" />
      <div className="background-orb orb-right" />

      <header className="site-header">
        <div className="brand-lockup">
          <img alt="DILE logo" src="/logos/dile logo cow.jpg" />
          <div>
            <span className="eyebrow">Distribuidora Leon</span>
            <strong>DILE Distributors</strong>
          </div>
        </div>
        <nav className="main-nav">
          <NavLink className={({ isActive }) => classNames('nav-link', isActive && 'nav-link-active')} to="/">
            Catálogo
          </NavLink>
          {session ? (
            <NavLink className={({ isActive }) => classNames('nav-link', isActive && 'nav-link-active')} to="/admin">
              Admin
            </NavLink>
          ) : null}
        </nav>
      </header>

      {loading ? (
        <main className="loading-shell">
          <div className="spinner" />
          <p>Cargando catálogo...</p>
        </main>
      ) : (
        <main className="page-shell">
          <Routes>
            <Route path="/" element={<CatalogPage products={products} subcategoryDefinitions={subcategoryDefinitions} />} />
            <Route
              path="/admin"
              element={
                <AdminPage
                  onCatalogRefresh={refreshCatalog}
                  onProductsChange={setProducts}
                  onSubcategoriesChange={setSubcategoryDefinitions}
                  products={products}
                  profile={profile}
                  session={session}
                  subcategoryDefinitions={subcategoryDefinitions}
                />
              }
            />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Routes>
        </main>
      )}

      <footer className="site-footer">
        <p>DILE Distributors</p>
      </footer>
    </div>
  );
}