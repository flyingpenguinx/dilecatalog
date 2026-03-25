import { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import {
  buildFallbackCategoryDefinitions,
  createEmptyProduct,
  deleteBrandDefinition,
  deleteCategoryDefinition,
  deleteProduct,
  fetchBrandDefinitions,
  fetchCatalog,
  fetchCategoryDefinitions,
  fetchProfile,
  fetchSubcategoryDefinitions,
  getCurrentSession,
  importCatalogDataset,
  PRODUCT_IMAGE_BUCKET,
  saveBrandDefinition,
  saveCategoryDefinition,
  saveProduct,
  seedSupabaseCatalog,
  signInWithPassword,
  signUpWithPassword,
  signOut,
  subscribeToAuthChanges,
  uploadProductImage,
} from './lib/catalogApi.js';
import {
  buildCatalogSnapshot,
  buildImageAudit,
  buildProductsCsv,
  downloadTextFile,
  parseDatasetFile,
} from './lib/catalogDataset.js';
import { isSupabaseConfigured } from './lib/supabase.js';

const ADMIN_SIGNUP_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADMIN_SIGNUP === 'true';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function formatImagePath(image) {
  if (!image) return '';
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/')) {
    return image;
  }

  return `/${image}`;
}

function titleCase(value) {
  return String(value ?? '')
    .replace(/[-_]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getCategoryName(categoryId, categoryDefinitions) {
  return categoryDefinitions.find((definition) => definition.id === categoryId)?.name ?? titleCase(categoryId);
}

function buildCategorySummary(products, categoryDefinitions) {
  const categoryIds = [...new Set([
    ...categoryDefinitions.map((definition) => definition.id),
    ...products.map((product) => product.category).filter(Boolean),
  ])];

  return ['all', ...categoryIds].map((categoryId, index) => ({
    id: categoryId,
    label: categoryId === 'all' ? 'Todos' : getCategoryName(categoryId, categoryDefinitions),
    marker: categoryId === 'all' ? '00' : String(index).padStart(2, '0'),
    note: categoryId === 'all' ? 'Colección completa' : 'Categoría activa',
    count: categoryId === 'all'
      ? products.length
      : products.filter((product) => product.category === categoryId).length,
  }));
}

function applyCatalogFilters(products, search, category, subcategory, featuredOnly) {
  const query = search.trim().toLowerCase();

  return products.filter((product) => {
    const name = String(product.name ?? '').toLowerCase();
    const brand = String(product.brand ?? '').toLowerCase();
    const sku = String(product.sku ?? '').toLowerCase();
    const unitSize = String(product.unit_size ?? '').toLowerCase();
    const description = String(product.description ?? '').toLowerCase();
    const subcategoryValue = String(product.subcategory ?? '').toLowerCase();
    const matchesCategory = category === 'all' || product.category === category;
    const matchesSubcategory = subcategory === 'all' || product.subcategory === subcategory;
    const matchesFeatured = !featuredOnly || product.featured;
    const matchesSearch =
      !query ||
      name.includes(query) ||
      brand.includes(query) ||
      sku.includes(query) ||
      unitSize.includes(query) ||
      description.includes(query) ||
      subcategoryValue.includes(query);

    return matchesCategory && matchesSubcategory && matchesFeatured && matchesSearch;
  });
}

function sortDefinitions(definitions) {
  return [...definitions].sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.name.localeCompare(right.name),
  );
}

function upsertDefinition(definitions, definition) {
  const next = [...definitions];
  const index = next.findIndex((entry) => entry.id === definition.id);

  if (index >= 0) {
    next[index] = definition;
  } else {
    next.push(definition);
  }

  return sortDefinitions(next);
}

function mergeById(currentItems, incomingItems) {
  const byId = new Map(currentItems.map((item) => [String(item.id), item]));
  incomingItems.forEach((item) => {
    byId.set(String(item.id), item);
  });
  return [...byId.values()];
}

function getNextSortOrder(definitions) {
  const current = definitions.reduce((max, definition) => Math.max(max, Number(definition.sort_order) || 0), 0);
  return current + 10;
}

function createEmptyBrand(categoryDefinitions, sortOrder) {
  return {
    id: `brand-${Date.now()}`,
    name: '',
    category: categoryDefinitions[0]?.id ?? '',
    notes: '',
    sort_order: sortOrder,
  };
}

function createEmptyCategory(sortOrder) {
  return {
    id: '',
    name: '',
    sort_order: sortOrder,
  };
}

function RouteBar({ compact = false }) {
  return (
    <div className={classNames('route-bar', compact && 'route-bar-compact')}>
      <div className="brand-lockup">
        <img alt="DILE logo" src="/logos/dile logo cow.jpg" />
        <div>
          <span className="eyebrow">DILE</span>
          <strong>Distribuidora Leon</strong>
        </div>
      </div>
      <nav className="main-nav">
        <NavLink className={({ isActive }) => classNames('nav-link', isActive && 'nav-link-active')} to="/">
          Catálogo
        </NavLink>
        <NavLink className={({ isActive }) => classNames('nav-link', isActive && 'nav-link-active')} to="/admin">
          Admin
        </NavLink>
      </nav>
    </div>
  );
}

function AuthPendingPanel() {
  return (
    <section className="admin-shell narrow-shell">
      <div className="notice notice-info">Verificando sesión y permisos de administrador...</div>
    </section>
  );
}

function MissingProfilePanel({ email, onSignOut, userId }) {
  const sql = `insert into public.profiles (id, display_name, role)\nvalues ('${userId}', 'Distribuidora Leon', 'admin')\non conflict (id) do update set role = 'admin', display_name = excluded.display_name;`;

  return (
    <section className="admin-shell narrow-shell">
      <div className="notice notice-warning">
        Falta el perfil para {email || 'este usuario'}. Ejecuta este SQL en Supabase para crear el
        acceso admin con el mismo UID.
      </div>
      <div className="admin-sql-card">
        <p><strong>UID</strong>: {userId}</p>
        <pre className="admin-sql-block">{sql}</pre>
      </div>
      <button className="ghost-button" onClick={onSignOut} type="button">
        Cerrar sesión
      </button>
    </section>
  );
}

function ProductModal({ categoryDefinitions, product, onClose }) {
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
            <img src={formatImagePath(product.image)} alt={product.name} />
          </div>
          <div className="modal-copy">
            <span className="eyebrow">{getCategoryName(product.category, categoryDefinitions)}</span>
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

function CatalogPage({ categoryDefinitions, products, subcategoryDefinitions }) {
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
    () => buildCategorySummary(visibleProducts, categoryDefinitions),
    [categoryDefinitions, visibleProducts],
  );

  const subcategories = useMemo(() => {
    if (category === 'all') {
      return [];
    }

    const productValues = visibleProducts
      .filter((product) => product.category === category && product.subcategory)
      .map((product) => product.subcategory);

    const managedValues = subcategoryDefinitions
      .filter((definition) => definition.category === category)
      .map((definition) => definition.name);

    return [...new Set([...managedValues, ...productValues])].sort((left, right) => left.localeCompare(right));
  }, [category, subcategoryDefinitions, visibleProducts]);

  const filteredProducts = useMemo(
    () => applyCatalogFilters(visibleProducts, search, category, subcategory, featuredOnly),
    [category, featuredOnly, search, subcategory, visibleProducts],
  );

  return (
    <>
      <section className="catalog-top-section">
        <div className="catalog-tools-row">
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
            {featuredOnly ? 'Solo destacados' : 'Destacados'}
          </button>
        </div>
        <div className="chip-row chip-row-integrated">
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
        <div className="catalog-summary-row">
          <span className="eyebrow">Catálogo</span>
          <strong>{filteredProducts.length} productos</strong>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-panel">
            <h3>No hay coincidencias</h3>
            <p>Ajusta los filtros o corrige los productos desde el panel de administración.</p>
          </div>
        ) : (
          <div className="catalog-grid">
            {filteredProducts.map((product) => (
              <article className="catalog-card" key={product.id}>
                <button className="catalog-card-button" onClick={() => setSelectedProduct(product)} type="button">
                  <div className="catalog-image-shell">
                    <img alt={product.name} src={formatImagePath(product.image)} />
                    {product.featured ? <span className="floating-badge">Destacado</span> : null}
                  </div>
                  <div className="catalog-copy">
                    <span className="catalog-meta">{getCategoryName(product.category, categoryDefinitions)}</span>
                    <h3>{product.name}</h3>
                    <p>{[product.brand, product.unit_size].filter(Boolean).join(' · ')}</p>
                  </div>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <ProductModal
        categoryDefinitions={categoryDefinitions}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
      />
    </>
  );
}

function LoginPanel({ onSignedIn }) {
  const [mode, setMode] = useState('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        const result = await signUpWithPassword(email, password, displayName);

        setNotice(
          result.needsEmailConfirmation
            ? 'Cuenta creada. Revisa tu correo para confirmar el acceso antes de iniciar sesión.'
            : 'Cuenta creada. Si el perfil quedó como viewer, promuévelo a admin o editor en Supabase.',
        );

        if (!result.needsEmailConfirmation) {
          onSignedIn?.();
        }

        return;
      }

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
          <h2>{mode === 'signup' ? 'Crear cuenta de acceso' : 'Inicia sesión para editar el catálogo'}</h2>
        </div>
        <p>
          {mode === 'signup'
            ? 'Esta opción queda pensada para desarrollo local. Las cuentas nuevas no son admin automáticamente.'
            : 'Supabase Auth controla quién puede entrar. El panel requiere un perfil con rol admin o editor.'}
        </p>
      </div>
      {ADMIN_SIGNUP_ENABLED ? (
        <div className="button-row auth-mode-row">
          <button
            className={classNames(mode === 'signin' ? 'primary-button' : 'ghost-button')}
            onClick={() => {
              setMode('signin');
              setError('');
              setNotice('');
            }}
            type="button"
          >
            Entrar
          </button>
          <button
            className={classNames(mode === 'signup' ? 'primary-button' : 'ghost-button')}
            onClick={() => {
              setMode('signup');
              setError('');
              setNotice('');
            }}
            type="button"
          >
            Crear cuenta
          </button>
        </div>
      ) : null}
      <form className="admin-form auth-form" onSubmit={handleSubmit}>
        {mode === 'signup' ? (
          <label>
            Nombre visible opcional
            <input
              autoComplete="name"
              onChange={(event) => setDisplayName(event.target.value)}
              type="text"
              value={displayName}
            />
          </label>
        ) : null}
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
        {notice ? <p className="notice notice-info">{notice}</p> : null}
        {error ? <p className="notice notice-error">{error}</p> : null}
        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? (mode === 'signup' ? 'Creando cuenta...' : 'Entrando...') : mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
        </button>
      </form>
    </section>
  );
}

function AccessDenied({ onSignOut, role }) {
  return (
    <section className="admin-shell narrow-shell">
      <div className="notice notice-error">
        Tu usuario sí inició sesión, pero su rol actual es {role || 'sin rol'}. Cambia la fila en
        profiles para usar role = admin o editor.
      </div>
      <button className="ghost-button" onClick={onSignOut} type="button">
        Cerrar sesión
      </button>
    </section>
  );
}

function AdminDashboard({
  brandDefinitions,
  categoryDefinitions,
  onBrandDefinitionsChange,
  onCatalogRefresh,
  onCategoryDefinitionsChange,
  onProductsChange,
  onSubcategoryDefinitionsChange,
  products,
  profile,
  sourceLabel,
  subcategoryDefinitions,
}) {
  const [selectedView, setSelectedView] = useState('products');
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? null);
  const [draft, setDraft] = useState(products[0] ?? createEmptyProduct());
  const [selectedBrandId, setSelectedBrandId] = useState(brandDefinitions[0]?.id ?? null);
  const [brandDraft, setBrandDraft] = useState(
    brandDefinitions[0] ?? createEmptyBrand(categoryDefinitions, getNextSortOrder(brandDefinitions)),
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryDefinitions[0]?.id ?? null);
  const [categoryDraft, setCategoryDraft] = useState(
    categoryDefinitions[0] ?? createEmptyCategory(getNextSortOrder(categoryDefinitions)),
  );
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!products.length) {
      const nextDraft = createEmptyProduct();
      nextDraft.category = categoryDefinitions[0]?.id ?? nextDraft.category;
      setDraft(nextDraft);
      setSelectedId(null);
      return;
    }

    const nextProduct = products.find((product) => product.id === selectedId) ?? products[0];
    setSelectedId(nextProduct.id);
    setDraft(nextProduct);
  }, [categoryDefinitions, products, selectedId]);

  useEffect(() => {
    if (!brandDefinitions.length) {
      setSelectedBrandId(null);
      setBrandDraft(createEmptyBrand(categoryDefinitions, getNextSortOrder(brandDefinitions)));
      return;
    }

    const nextBrand = brandDefinitions.find((definition) => definition.id === selectedBrandId) ?? brandDefinitions[0];
    setSelectedBrandId(nextBrand.id);
    setBrandDraft(nextBrand);
  }, [brandDefinitions, categoryDefinitions, selectedBrandId]);

  useEffect(() => {
    if (!categoryDefinitions.length) {
      setSelectedCategoryId(null);
      setCategoryDraft(createEmptyCategory(getNextSortOrder(categoryDefinitions)));
      return;
    }

    const nextCategory = categoryDefinitions.find((definition) => definition.id === selectedCategoryId) ?? categoryDefinitions[0];
    setSelectedCategoryId(nextCategory.id);
    setCategoryDraft(nextCategory);
  }, [categoryDefinitions, selectedCategoryId]);

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

  const filteredBrands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return brandDefinitions;
    }

    return brandDefinitions.filter((definition) => {
      return (
        definition.name.toLowerCase().includes(normalizedQuery) ||
        definition.category.toLowerCase().includes(normalizedQuery) ||
        definition.notes.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [brandDefinitions, query]);

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return categoryDefinitions;
    }

    return categoryDefinitions.filter((definition) => {
      return (
        definition.name.toLowerCase().includes(normalizedQuery) ||
        definition.id.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [categoryDefinitions, query]);

  const imageAudit = useMemo(() => buildImageAudit(products), [products]);

  const filteredAssignedImages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return imageAudit.assigned;
    }

    return imageAudit.assigned.filter(({ imageKey, product }) => {
      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.brand.toLowerCase().includes(normalizedQuery) ||
        imageKey.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [imageAudit.assigned, query]);

  const filteredUnassignedImages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return imageAudit.unassignedLocal;
    }

    return imageAudit.unassignedLocal.filter((asset) => asset.path.toLowerCase().includes(normalizedQuery));
  }, [imageAudit.unassignedLocal, query]);

  const availableBrandNames = useMemo(() => {
    return [...new Set([
      ...brandDefinitions.map((definition) => definition.name).filter(Boolean),
      ...products.map((product) => product.brand).filter(Boolean),
    ])].sort((left, right) => left.localeCompare(right));
  }, [brandDefinitions, products]);

  const availableCategories = useMemo(() => {
    if (categoryDefinitions.length > 0) {
      return categoryDefinitions;
    }

    return buildFallbackCategoryDefinitions();
  }, [categoryDefinitions]);

  const availableSubcategories = useMemo(() => {
    const currentCategory = draft.category || availableCategories[0]?.id || 'grocery';
    const managed = subcategoryDefinitions
      .filter((definition) => definition.category === currentCategory)
      .map((definition) => definition.name);
    const productValues = products
      .filter((product) => product.category === currentCategory && product.subcategory)
      .map((product) => product.subcategory);

    return [...new Set([...managed, ...productValues])].sort((left, right) => left.localeCompare(right));
  }, [availableCategories, draft.category, products, subcategoryDefinitions]);

  const syncDefinitionFromProduct = async (product) => {
    const warnings = [];

    if (product.brand?.trim()) {
      const nextBrand = brandDefinitions.find((definition) => definition.name === product.brand.trim());
      if (!nextBrand) {
        const result = await saveBrandDefinition({
          name: product.brand.trim(),
          category: product.category,
          sort_order: getNextSortOrder(brandDefinitions),
          notes: '',
        });
        onBrandDefinitionsChange((current) => upsertDefinition(current, result.definition));
        if (result.warning) {
          warnings.push(result.warning);
        }
      }
    }

    if (product.category?.trim()) {
      const categoryId = product.category.trim().toLowerCase();
      const nextCategory = categoryDefinitions.find((definition) => definition.id === categoryId);
      if (!nextCategory) {
        const result = await saveCategoryDefinition({
          id: categoryId,
          name: titleCase(categoryId),
          sort_order: getNextSortOrder(categoryDefinitions),
        });
        onCategoryDefinitionsChange((current) => upsertDefinition(current, result.definition));
        if (result.warning) {
          warnings.push(result.warning);
        }
      }
    }

    if (product.subcategory?.trim()) {
      const exists = subcategoryDefinitions.some((definition) => {
        return definition.category === product.category && definition.name === product.subcategory.trim();
      });

      if (!exists) {
        onSubcategoryDefinitionsChange((current) => sortDefinitions([
          ...current,
          {
            id: `${product.category}:${product.subcategory.trim().toLowerCase().replace(/\s+/g, '-')}`,
            category: product.category,
            name: product.subcategory.trim(),
            sort_order: getNextSortOrder(current),
          },
        ]));
      }
    }

    return warnings;
  };

  const handleFieldChange = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

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
      setNotice(`Imagen subida a Storage en ${PRODUCT_IMAGE_BUCKET}. Guarda el producto para persistir la URL.`);
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

      nextProducts.sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name));
      onProductsChange(nextProducts);
      setSelectedId(result.product.id);
      const warnings = await syncDefinitionFromProduct(result.product);
      setNotice(
        result.persisted
          ? ['Producto guardado en Supabase.', ...warnings].join(' ')
          : ['Supabase no está configurado. El cambio solo vive en esta sesión.', ...warnings].join(' '),
      );
      await onCatalogRefresh();
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
      onProductsChange(nextProducts);
      setNotice(
        result.persisted
          ? 'Producto eliminado de Supabase.'
          : 'Supabase no está configurado. El producto solo desapareció del preview actual.',
      );
      await onCatalogRefresh();
    } catch (error) {
      setNotice(error.message ?? 'No se pudo eliminar el producto.');
    }
  };

  const handleSeed = async () => {
    setNotice('');

    try {
      const result = await seedSupabaseCatalog();
      setNotice(
        result.source === 'supabase'
          ? `Se enviaron ${result.inserted} productos a Supabase. ${(result.warnings ?? []).join(' ')}`
          : 'Supabase no está configurado. El seed quedó disponible solo como fallback local.',
      );
      await onCatalogRefresh();
    } catch (error) {
      setNotice(error.message ?? 'No se pudo poblar Supabase con el catálogo actual.');
    }
  };

  const handleExportJson = () => {
    const snapshot = buildCatalogSnapshot({
      products,
      categories: categoryDefinitions,
      brands: brandDefinitions,
      subcategories: subcategoryDefinitions,
    });

    downloadTextFile(
      `dile-catalog-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(snapshot, null, 2),
      'application/json;charset=utf-8',
    );
    setNotice('Respaldo JSON descargado.');
  };

  const handleExportCsv = () => {
    downloadTextFile(
      `dile-catalog-${new Date().toISOString().slice(0, 10)}.csv`,
      buildProductsCsv(products),
      'text/csv;charset=utf-8',
    );
    setNotice('CSV descargado. Sirve para Excel y Google Sheets.');
  };

  const handleImportDataset = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setNotice('');
    setIsImporting(true);

    try {
      const parsed = parseDatasetFile(file.name, await file.text());
      const mergedSnapshot = {
        products: mergeById(products, parsed.products),
        categories: mergeById(categoryDefinitions, parsed.categories),
        brands: mergeById(brandDefinitions, parsed.brands),
        subcategories: mergeById(subcategoryDefinitions, parsed.subcategories),
      };
      const result = await importCatalogDataset(mergedSnapshot);
      onProductsChange(result.products);
      onCategoryDefinitionsChange(sortDefinitions(result.categories));
      onBrandDefinitionsChange(sortDefinitions(result.brands));
      onSubcategoryDefinitionsChange(sortDefinitions(result.subcategories));
      setSelectedView('products');
      setNotice(
        result.persisted
          ? `Importación completada. ${(result.warnings ?? []).join(' ')}`
          : 'Importación completada solo en esta sesión local.',
      );
      await onCatalogRefresh();
    } catch (error) {
      setNotice(error.message ?? 'No se pudo importar el archivo.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleSaveBrand = async (event) => {
    event.preventDefault();
    setNotice('');
    setIsSavingBrand(true);

    try {
      const result = await saveBrandDefinition(brandDraft);
      onBrandDefinitionsChange((current) => upsertDefinition(current, result.definition));
      setSelectedBrandId(result.definition.id);
      setNotice(result.persisted ? 'Marca guardada.' : result.warning ?? 'Marca guardada solo en esta sesión.');
    } catch (error) {
      setNotice(error.message ?? 'No se pudo guardar la marca.');
    } finally {
      setIsSavingBrand(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!brandDraft?.id) {
      return;
    }

    if (!window.confirm(`Eliminar la marca ${brandDraft.name || 'sin nombre'}?`)) {
      return;
    }

    const result = await deleteBrandDefinition(brandDraft.id);
    onBrandDefinitionsChange((current) => current.filter((definition) => definition.id !== brandDraft.id));
    setNotice(result.persisted ? 'Marca eliminada.' : result.warning ?? 'Marca eliminada solo en esta sesión.');
  };

  const handleSaveCategory = async (event) => {
    event.preventDefault();
    setNotice('');
    setIsSavingCategory(true);

    try {
      const payload = {
        ...categoryDraft,
        id: categoryDraft.id.trim().toLowerCase().replace(/\s+/g, '-'),
      };
      const result = await saveCategoryDefinition(payload);
      onCategoryDefinitionsChange((current) => upsertDefinition(current, result.definition));
      setSelectedCategoryId(result.definition.id);
      setCategoryDraft(result.definition);
      setNotice(result.persisted ? 'Categoría guardada.' : result.warning ?? 'Categoría guardada solo en esta sesión.');
    } catch (error) {
      setNotice(error.message ?? 'No se pudo guardar la categoría.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryDraft?.id) {
      return;
    }

    if (!window.confirm(`Eliminar la categoría ${categoryDraft.name || categoryDraft.id}?`)) {
      return;
    }

    const result = await deleteCategoryDefinition(categoryDraft.id);
    onCategoryDefinitionsChange((current) => current.filter((definition) => definition.id !== categoryDraft.id));
    setNotice(result.persisted ? 'Categoría eliminada.' : result.warning ?? 'Categoría eliminada solo en esta sesión.');
  };

  return (
    <section className="admin-shell">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Panel administrativo</span>
          <h2>Productos, marcas, categorías e imágenes</h2>
        </div>
        <p>
          Sesión: {profile?.display_name || profile?.email || 'Usuario autenticado'} · Rol:{' '}
          {profile?.role || 'sin rol'} · Fuente: {sourceLabel}
        </p>
      </div>

      {!isSupabaseConfigured ? (
        <div className="notice notice-warning">
          Supabase no está configurado todavía. El panel funciona como preview local para terminar la
          migración sin bloquearte.
        </div>
      ) : null}

      {notice ? <div className="notice notice-info">{notice}</div> : null}

      <div className="admin-segmented-control">
        {[
          ['products', 'Productos'],
          ['brands', 'Marcas'],
          ['categories', 'Categorías'],
          ['images', 'Imágenes'],
        ].map(([value, label]) => (
          <button
            className={classNames('segment-button', selectedView === value && 'segment-button-active')}
            key={value}
            onClick={() => setSelectedView(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="admin-layout">
        <aside className="admin-list-panel">
          <div className="admin-toolbar">
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                selectedView === 'images'
                  ? 'Buscar por nombre o ruta de imagen'
                  : `Buscar ${selectedView === 'products' ? 'productos' : selectedView === 'brands' ? 'marcas' : 'categorías'}`
              }
              type="search"
              value={query}
            />
            <div className="button-row compact-row">
              {selectedView === 'products' ? (
                <>
                  <button
                    className="ghost-button"
                    onClick={() => {
                      const nextDraft = createEmptyProduct();
                      nextDraft.category = availableCategories[0]?.id ?? nextDraft.category;
                      setDraft(nextDraft);
                      setSelectedId(null);
                    }}
                    type="button"
                  >
                    Nuevo producto
                  </button>
                  <button className="ghost-button" onClick={handleSeed} type="button">
                    Seed actual a Supabase
                  </button>
                </>
              ) : null}

              {selectedView === 'brands' ? (
                <button
                  className="ghost-button"
                  onClick={() => setBrandDraft(createEmptyBrand(availableCategories, getNextSortOrder(brandDefinitions)))}
                  type="button"
                >
                  Nueva marca
                </button>
              ) : null}

              {selectedView === 'categories' ? (
                <button
                  className="ghost-button"
                  onClick={() => setCategoryDraft(createEmptyCategory(getNextSortOrder(categoryDefinitions)))}
                  type="button"
                >
                  Nueva categoría
                </button>
              ) : null}
            </div>

            <div className="admin-export-panel">
              <button className="ghost-button" onClick={handleExportJson} type="button">
                Exportar JSON
              </button>
              <button className="ghost-button" onClick={handleExportCsv} type="button">
                Exportar CSV
              </button>
              <label className="ghost-button upload-trigger">
                {isImporting ? 'Importando...' : 'Importar CSV o JSON'}
                <input accept=".csv,.json" disabled={isImporting} onChange={handleImportDataset} type="file" />
              </label>
            </div>
          </div>

          <div className="admin-list">
            {selectedView === 'products'
              ? filteredProducts.map((product) => (
                  <button
                    className={classNames('admin-list-item', draft?.id === product.id && 'admin-list-item-active')}
                    key={product.id}
                    onClick={() => {
                      setSelectedId(product.id);
                      setDraft(product);
                    }}
                    type="button"
                  >
                    <div>
                      <strong>{product.name}</strong>
                      <span>{[product.brand || 'Sin marca', product.sku || null, product.unit_size || null].filter(Boolean).join(' · ')}</span>
                    </div>
                    <div className="status-cluster">
                      <span className={classNames('status-pill', product.visible ? 'status-pill-green' : 'status-pill-gray')}>
                        {product.visible ? 'Visible' : 'Oculto'}
                      </span>
                      {product.featured ? <span className="status-pill status-pill-gold">Destacado</span> : null}
                    </div>
                  </button>
                ))
              : null}

            {selectedView === 'brands'
              ? filteredBrands.map((definition) => (
                  <button
                    className={classNames('admin-list-item', brandDraft?.id === definition.id && 'admin-list-item-active')}
                    key={definition.id}
                    onClick={() => {
                      setSelectedBrandId(definition.id);
                      setBrandDraft(definition);
                    }}
                    type="button"
                  >
                    <div>
                      <strong>{definition.name}</strong>
                      <span>{definition.category ? getCategoryName(definition.category, availableCategories) : 'Sin categoría fija'}</span>
                    </div>
                  </button>
                ))
              : null}

            {selectedView === 'categories'
              ? filteredCategories.map((definition) => (
                  <button
                    className={classNames('admin-list-item', categoryDraft?.id === definition.id && 'admin-list-item-active')}
                    key={definition.id}
                    onClick={() => {
                      setSelectedCategoryId(definition.id);
                      setCategoryDraft(definition);
                    }}
                    type="button"
                  >
                    <div>
                      <strong>{definition.name}</strong>
                      <span>{definition.id}</span>
                    </div>
                    <div className="status-cluster">
                      <span className="status-pill status-pill-gray">
                        {products.filter((product) => product.category === definition.id).length} productos
                      </span>
                    </div>
                  </button>
                ))
              : null}

            {selectedView === 'images' ? (
              <div className="image-list-summary">
                <div className="summary-card">
                  <strong>{filteredAssignedImages.length}</strong>
                  <span>Imágenes asignadas</span>
                </div>
                <div className="summary-card summary-card-warning">
                  <strong>{filteredUnassignedImages.length}</strong>
                  <span>Imágenes locales sin producto</span>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        {selectedView === 'products' ? (
          <form className="admin-form" onSubmit={handleSave}>
            <div className="data-ops-card">
              <h3>Carga inteligente para Excel y Sheets</h3>
              <p>
                El CSV exporta las columnas correctas para SKU, unidad, marca y categoría. La importación
                reconoce encabezados como marca, brand, categoría, category, unidad y unit size.
              </p>
              <small>Las marcas se guardan exactamente como las escribas. No se traducen automáticamente.</small>
            </div>

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
                  list="brand-options"
                  onChange={(event) => handleFieldChange('brand', event.target.value)}
                  placeholder="Escoge una marca o escribe una nueva"
                  type="text"
                  value={draft.brand}
                />
                <datalist id="brand-options">
                  {availableBrandNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
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
                  {availableCategories.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.name}
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
                  {availableSubcategories.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </label>
              <label className="full-span">
                Imagen actual
                <input
                  onChange={(event) => handleFieldChange('image', event.target.value)}
                  placeholder="https://... o URL pública de Supabase Storage"
                  type="text"
                  value={draft.image}
                />
              </label>
              <label className="full-span upload-field">
                Subir imagen a Supabase Storage
                <input
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  disabled={!isSupabaseConfigured || isUploadingImage}
                  onChange={handleImageUpload}
                  type="file"
                />
                <small>
                  {isSupabaseConfigured
                    ? isUploadingImage
                      ? 'Subiendo imagen...'
                      : 'La imagen se sube al bucket product-images y luego se guarda la URL pública en el producto.'
                    : 'Configura Supabase y el bucket product-images para habilitar uploads.'}
                </small>
              </label>
              <label className="full-span">
                Descripción opcional
                <textarea
                  onChange={(event) => handleFieldChange('description', event.target.value)}
                  rows="5"
                  value={draft.description}
                />
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
                <img alt={draft.name || 'Preview de producto'} src={formatImagePath(draft.image)} />
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
          </form>
        ) : null}

        {selectedView === 'brands' ? (
          <form className="admin-form" onSubmit={handleSaveBrand}>
            <div className="form-grid">
              <label>
                ID
                <input
                  onChange={(event) => setBrandDraft((current) => ({ ...current, id: event.target.value.trim().toLowerCase() }))}
                  type="text"
                  value={brandDraft.id}
                />
              </label>
              <label>
                Orden
                <input
                  onChange={(event) => setBrandDraft((current) => ({ ...current, sort_order: event.target.value }))}
                  type="number"
                  value={brandDraft.sort_order}
                />
              </label>
              <label className="full-span">
                Marca
                <input
                  onChange={(event) => setBrandDraft((current) => ({ ...current, name: event.target.value }))}
                  required
                  type="text"
                  value={brandDraft.name}
                />
              </label>
              <label>
                Categoría sugerida
                <select
                  onChange={(event) => setBrandDraft((current) => ({ ...current, category: event.target.value }))}
                  value={brandDraft.category}
                >
                  <option value="">Sin categoría fija</option>
                  {availableCategories.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-span">
                Nota interna
                <textarea
                  onChange={(event) => setBrandDraft((current) => ({ ...current, notes: event.target.value }))}
                  rows="4"
                  value={brandDraft.notes}
                />
              </label>
            </div>
            <div className="button-row">
              <button className="primary-button" disabled={isSavingBrand} type="submit">
                {isSavingBrand ? 'Guardando...' : 'Guardar marca'}
              </button>
              <button className="ghost-button" onClick={handleDeleteBrand} type="button">
                Eliminar
              </button>
            </div>
          </form>
        ) : null}

        {selectedView === 'categories' ? (
          <form className="admin-form" onSubmit={handleSaveCategory}>
            <div className="form-grid">
              <label>
                ID técnico
                <input
                  onChange={(event) => setCategoryDraft((current) => ({ ...current, id: event.target.value }))}
                  placeholder="frozen, grocery, dairy, snacks"
                  required
                  type="text"
                  value={categoryDraft.id}
                />
              </label>
              <label>
                Orden
                <input
                  onChange={(event) => setCategoryDraft((current) => ({ ...current, sort_order: event.target.value }))}
                  type="number"
                  value={categoryDraft.sort_order}
                />
              </label>
              <label className="full-span">
                Nombre visible
                <input
                  onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))}
                  required
                  type="text"
                  value={categoryDraft.name}
                />
              </label>
            </div>
            <div className="button-row">
              <button className="primary-button" disabled={isSavingCategory} type="submit">
                {isSavingCategory ? 'Guardando...' : 'Guardar categoría'}
              </button>
              <button className="ghost-button" onClick={handleDeleteCategory} type="button">
                Eliminar
              </button>
            </div>
          </form>
        ) : null}

        {selectedView === 'images' ? (
          <div className="admin-form">
            <div className="section-heading image-heading">
              <div>
                <span className="eyebrow">Revisión visual</span>
                <h2>Todas las imágenes del catálogo</h2>
              </div>
              <p>Revisa productos sin SKU, sin marca o imágenes locales que todavía no están asignadas.</p>
            </div>

            <div className="image-gallery-section">
              <h3>Imágenes asignadas a productos</h3>
              <div className="image-audit-grid">
                {filteredAssignedImages.map(({ imageKey, issues, previewUrl, product, source }) => (
                  <article className="image-audit-card" key={`${product.id}-${imageKey}`}>
                    <div className="catalog-image-shell image-audit-visual">
                      <img alt={product.name} src={formatImagePath(previewUrl)} />
                    </div>
                    <div className="image-audit-copy">
                      <strong>{product.name}</strong>
                      <span>{product.brand || 'Sin marca'} · {product.sku || 'Sin SKU'}</span>
                      <small>{imageKey}</small>
                      <div className="status-cluster status-cluster-inline">
                        <span className="status-pill status-pill-gray">{source}</span>
                        {issues.map((issue) => (
                          <span className="status-pill status-pill-warning" key={issue}>{issue}</span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="image-gallery-section">
              <h3>Imágenes locales sin producto</h3>
              <div className="image-audit-grid">
                {filteredUnassignedImages.map((asset) => (
                  <article className="image-audit-card" key={asset.path}>
                    <div className="catalog-image-shell image-audit-visual">
                      <img alt={asset.path} src={asset.previewUrl} />
                    </div>
                    <div className="image-audit-copy">
                      <strong>No asignada</strong>
                      <small>{asset.path}</small>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AdminPage({
  brandDefinitions,
  categoryDefinitions,
  profileLoading,
  authResolved,
  onBrandDefinitionsChange,
  onCatalogRefresh,
  onCategoryDefinitionsChange,
  onProductsChange,
  onSubcategoryDefinitionsChange,
  products,
  profile,
  session,
  sourceLabel,
  subcategoryDefinitions,
}) {
  const canManage = profile?.role === 'admin' || profile?.role === 'editor';

  if (!isSupabaseConfigured) {
    return (
      <AdminDashboard
        brandDefinitions={brandDefinitions}
        categoryDefinitions={categoryDefinitions}
        onBrandDefinitionsChange={onBrandDefinitionsChange}
        onCatalogRefresh={onCatalogRefresh}
        onCategoryDefinitionsChange={onCategoryDefinitionsChange}
        onProductsChange={onProductsChange}
        onSubcategoryDefinitionsChange={onSubcategoryDefinitionsChange}
        products={products}
        profile={{ display_name: 'Preview local', role: 'admin' }}
        sourceLabel="fallback local"
        subcategoryDefinitions={subcategoryDefinitions}
      />
    );
  }

  if (!authResolved || profileLoading) {
    return <AuthPendingPanel />;
  }

  if (!session) {
    return <LoginPanel onSignedIn={onCatalogRefresh} />;
  }

  if (!profile) {
    return <MissingProfilePanel email={session.user.email} onSignOut={signOut} userId={session.user.id} />;
  }

  if (!canManage) {
    return <AccessDenied onSignOut={signOut} role={profile?.role} />;
  }

  return (
    <AdminDashboard
      brandDefinitions={brandDefinitions}
      categoryDefinitions={categoryDefinitions}
      onBrandDefinitionsChange={onBrandDefinitionsChange}
      onCatalogRefresh={onCatalogRefresh}
      onCategoryDefinitionsChange={onCategoryDefinitionsChange}
      onProductsChange={onProductsChange}
      onSubcategoryDefinitionsChange={onSubcategoryDefinitionsChange}
      products={products}
      profile={{ ...profile, email: session.user.email }}
      sourceLabel={sourceLabel}
      subcategoryDefinitions={subcategoryDefinitions}
    />
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [categoryDefinitions, setCategoryDefinitions] = useState([]);
  const [brandDefinitions, setBrandDefinitions] = useState([]);
  const [subcategoryDefinitions, setSubcategoryDefinitions] = useState([]);
  const [sourceLabel, setSourceLabel] = useState('cargando');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [profileLoading, setProfileLoading] = useState(isSupabaseConfigured);
  const [authResolved, setAuthResolved] = useState(!isSupabaseConfigured);

  const canManage = profile?.role === 'admin' || profile?.role === 'editor' || !isSupabaseConfigured;

  const refreshCatalog = async () => {
    const [catalogResult, categoriesResult, brandsResult, subcategoriesResult] = await Promise.all([
      fetchCatalog({ includeHidden: canManage }),
      fetchCategoryDefinitions(),
      fetchBrandDefinitions(),
      fetchSubcategoryDefinitions(),
    ]);

    setProducts(catalogResult.products);
    setCategoryDefinitions(sortDefinitions(categoriesResult.definitions));
    setBrandDefinitions(sortDefinitions(brandsResult.definitions));
    setSubcategoryDefinitions(sortDefinitions(subcategoriesResult.definitions));
    setSourceLabel(
      catalogResult.source === 'supabase'
        ? 'Supabase en vivo'
        : catalogResult.source === 'seed'
          ? 'fallback local hasta poblar Supabase'
          : 'catálogo local desde catalog-seed.json',
    );
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const syncAuthState = async (nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);

      if (!nextSession?.user?.id) {
        setProfile(null);
        setProfileLoading(false);
        setAuthResolved(true);
        return;
      }

      setProfileLoading(true);

      try {
        const loadedProfile = await fetchProfile(nextSession.user.id);
        if (mounted) {
          setProfile(loadedProfile ?? null);
        }
      } catch {
        if (mounted) {
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setProfileLoading(false);
          setAuthResolved(true);
        }
      }
    };

    getCurrentSession().then(syncAuthState);

    const unsubscribe = subscribeToAuthChanges(syncAuthState);

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
      <main className="page-shell">
        <RouteBar />
        {loading ? (
          <div className="loading-shell">
            <div className="spinner" />
            <p>Preparando catálogo y panel administrativo...</p>
          </div>
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <CatalogPage
                  categoryDefinitions={categoryDefinitions}
                  products={products}
                  subcategoryDefinitions={subcategoryDefinitions}
                />
              }
            />
            <Route
              path="/admin"
              element={
                <AdminPage
                  brandDefinitions={brandDefinitions}
                  categoryDefinitions={categoryDefinitions}
                  profileLoading={profileLoading}
                  authResolved={authResolved}
                  onBrandDefinitionsChange={setBrandDefinitions}
                  onCatalogRefresh={refreshCatalog}
                  onCategoryDefinitionsChange={setCategoryDefinitions}
                  onProductsChange={setProducts}
                  onSubcategoryDefinitionsChange={setSubcategoryDefinitions}
                  products={products}
                  profile={profile}
                  session={session}
                  sourceLabel={sourceLabel}
                  subcategoryDefinitions={subcategoryDefinitions}
                />
              }
            />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Routes>
        )}
      </main>

      <footer className="site-footer">
        <p>Distribuidora Leon</p>
      </footer>
    </div>
  );
}
