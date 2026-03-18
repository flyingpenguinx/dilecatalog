import { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { CATEGORIES } from '../products.js';
import {
  createEmptyProduct,
  deleteProduct,
  fetchCatalog,
  fetchProfile,
  getCategoryMeta,
  getCurrentSession,
  PRODUCT_IMAGE_BUCKET,
  saveProduct,
  seedSupabaseCatalog,
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
  lactos: 'Lácteos',
  vitaminas: 'Vitaminas',
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

function buildCategorySummary(products) {
  return ['all', ...CATEGORIES.map((category) => category.id)].map((categoryId) => ({
    id: categoryId,
    label: categoryId === 'all' ? 'Todos' : formatCategory(categoryId),
    marker:
      categoryId === 'all'
        ? '00'
        : String(CATEGORIES.findIndex((category) => category.id === categoryId) + 1).padStart(2, '0'),
    note: categoryId === 'all' ? 'Colección completa' : getCategoryMeta(categoryId)?.name ?? 'Categoría',
    count:
      categoryId === 'all'
        ? products.length
        : products.filter((product) => product.category === categoryId).length,
  }));
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
            <img src={formatImagePath(product.image)} alt={product.name} />
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

function CatalogPage({ products, sourceLabel }) {
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
  const categorySummary = useMemo(() => buildCategorySummary(visibleProducts), [visibleProducts]);
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
          <h1>Catálogo React listo para Supabase.</h1>
          <p>
            El sitio ahora puede funcionar con datos en vivo, control de visibilidad, productos
            destacados y panel administrativo con login.
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
        <div className="hero-card">
          <img alt="DILE banner" src="/logos/dile logo banner.jpg" />
          <dl>
            <div>
              <dt>Fuente actual</dt>
              <dd>{sourceLabel}</dd>
            </div>
            <div>
              <dt>Productos visibles</dt>
              <dd>{visibleProducts.length}</dd>
            </div>
            <div>
              <dt>Destacados</dt>
              <dd>{visibleProducts.filter((product) => product.featured).length}</dd>
            </div>
          </dl>
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
            <span className="eyebrow">Catálogo público</span>
            <h2>{filteredProducts.length} productos listos para mostrar</h2>
          </div>
          <p>
            Los productos ocultos quedan fuera del catálogo público, pero siguen siendo editables en
            el panel de administración.
          </p>
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
        <p>Supabase Auth controla quién puede entrar. El panel requiere un perfil con rol admin o editor.</p>
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
        Tu usuario no tiene rol de administrador. Agrega tu uid en la tabla profiles con role
        = admin o editor.
      </div>
      <button className="ghost-button" onClick={onSignOut} type="button">
        Cerrar sesión
      </button>
    </section>
  );
}

function AdminDashboard({ products, profile, onCatalogRefresh, onProductsChange, sourceLabel }) {
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? null);
  const [draft, setDraft] = useState(products[0] ?? createEmptyProduct());
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
      setNotice(
        result.persisted
          ? 'Producto guardado en Supabase.'
          : 'Supabase no está configurado. El cambio solo vive en esta sesión.',
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
          ? `Se enviaron ${result.inserted} productos a Supabase.`
          : 'Supabase no está configurado. El seed quedó disponible solo como fallback local.',
      );
      await onCatalogRefresh();
    } catch (error) {
      setNotice(error.message ?? 'No se pudo poblar Supabase con el catálogo actual.');
    }
  };

  return (
    <section className="admin-shell">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Panel administrativo</span>
          <h2>Editar nombres, descripciones y visibilidad</h2>
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

      <div className="admin-layout">
        <aside className="admin-list-panel">
          <div className="admin-toolbar">
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar en admin"
              type="search"
              value={query}
            />
            <button className="ghost-button" onClick={() => setDraft(createEmptyProduct())} type="button">
              Nuevo producto
            </button>
            <button className="ghost-button" onClick={handleSeed} type="button">
              Seed actual a Supabase
            </button>
          </div>
          <div className="admin-list">
            {filteredProducts.map((product) => (
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
                onChange={(event) => handleFieldChange('subcategory', event.target.value)}
                type="text"
                value={draft.subcategory}
              />
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
      </div>
    </section>
  );
}

function AdminPage({ products, profile, session, onCatalogRefresh, onProductsChange }) {
  const canManage = profile?.role === 'admin' || profile?.role === 'editor';

  if (!isSupabaseConfigured) {
    return (
      <AdminDashboard
        onCatalogRefresh={onCatalogRefresh}
        onProductsChange={onProductsChange}
        products={products}
        profile={{ display_name: 'Preview local', role: 'admin' }}
        sourceLabel="fallback local"
      />
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
      products={products}
      profile={{ ...profile, email: session.user.email }}
      sourceLabel="Supabase"
    />
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [sourceLabel, setSourceLabel] = useState('cargando');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const canManage = profile?.role === 'admin' || profile?.role === 'editor' || !isSupabaseConfigured;

  const refreshCatalog = async () => {
    const result = await fetchCatalog({ includeHidden: canManage });
    setProducts(result.products);
    setSourceLabel(
      result.source === 'supabase'
        ? 'Supabase en vivo'
        : result.source === 'seed'
          ? 'fallback local hasta poblar Supabase'
          : 'catálogo local migrado desde products.js',
    );
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
          <NavLink className={({ isActive }) => classNames('nav-link', isActive && 'nav-link-active')} to="/admin">
            Admin
          </NavLink>
        </nav>
      </header>

      {loading ? (
        <main className="loading-shell">
          <div className="spinner" />
          <p>Preparando catálogo y panel administrativo...</p>
        </main>
      ) : (
        <main className="page-shell">
          <Routes>
            <Route path="/" element={<CatalogPage products={products} sourceLabel={sourceLabel} />} />
            <Route
              path="/admin"
              element={
                <AdminPage
                  onCatalogRefresh={refreshCatalog}
                  onProductsChange={setProducts}
                  products={products}
                  profile={profile}
                  session={session}
                />
              }
            />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Routes>
        </main>
      )}

      <footer className="site-footer">
        <p>DILE Distributors · React + Supabase migration starter</p>
        <p>GitHub Pages compatible with hash routing. Vercel is the cleaner host once Storage and Auth are live.</p>
      </footer>
    </div>
  );
}