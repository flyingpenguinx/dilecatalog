import { useEffect, useMemo, useRef, useState } from 'react';
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
  saveSubcategoryDefinition,
  deleteSubcategoryDefinition,
  seedSupabaseCatalog,
  signInWithPassword,
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

const ALLOW_LOCAL_ADMIN_PREVIEW = false;

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function normalizeRole(role) {
  return String(role ?? '').trim().toLowerCase();
}

function hasDashboardWriteAccess(profile) {
  const role = normalizeRole(profile?.role);
  return role === 'admin' || role === 'editor';
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
    label: categoryId === 'all' ? 'All' : getCategoryName(categoryId, categoryDefinitions),
    marker: categoryId === 'all' ? '00' : String(index).padStart(2, '0'),
    note: categoryId === 'all' ? 'Full collection' : 'Active category',
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
          <strong translate="no">Distribuidora Leon</strong>
        </div>
      </div>
      <nav className="main-nav">
        <NavLink className={({ isActive }) => classNames('nav-link', isActive && 'nav-link-active')} to="/">
          Catalog
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
      <div className="notice notice-info">Checking session and admin permissions...</div>
    </section>
  );
}

function AccessRestrictedPanel({ onSignOut }) {
  return (
    <section className="admin-shell narrow-shell">
      <div className="notice notice-warning">
        This account is signed in, but it does not currently have admin access to this dashboard.
      </div>
      <button className="ghost-button" onClick={onSignOut} type="button">
        Sign out
      </button>
    </section>
  );
}

function AdminUnavailablePanel() {
  return (
    <section className="admin-shell narrow-shell">
      <div className="notice notice-warning">
        Admin is unavailable in this deployment.
      </div>
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
          Close
        </button>
        <div className="modal-layout">
          <div className="modal-visual">
            <img alt={product.name} decoding="async" loading="eager" src={formatImagePath(product.image)} />
          </div>
          <div className="modal-copy">
            <span className="eyebrow">{getCategoryName(product.category, categoryDefinitions)}</span>
            <h2 translate="no">{product.name}</h2>
            <p className="modal-brand" translate="no">{product.brand || 'No brand'}</p>
            <div className="detail-grid">
              <div>
                <span className="detail-label">Subcategory</span>
                <strong>{product.subcategory || 'Not set'}</strong>
              </div>
              <div>
                <span className="detail-label">SKU</span>
                <strong>{product.sku || 'Not set'}</strong>
              </div>
              <div>
                <span className="detail-label">Unit size</span>
                <strong>{product.unit_size || 'Not set'}</strong>
              </div>
              <div>
                <span className="detail-label">Status</span>
                <strong>{product.visible ? 'Visible' : 'Hidden'}</strong>
              </div>
              <div>
                <span className="detail-label">Featured</span>
                <strong>{product.featured ? 'Yes' : 'No'}</strong>
              </div>
            </div>
            <p className="modal-description">
              {product.description || 'Authentic Central American product.'}
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
            <span>Search</span>
            <input
              id="catalog-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Brand, product, or description"
              type="search"
              value={search}
            />
          </label>
          <button
            className={classNames('tag-button', featuredOnly && 'tag-button-active')}
            onClick={() => setFeaturedOnly((value) => !value)}
            type="button"
          >
            {featuredOnly ? 'Featured only' : 'Featured'}
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
              All
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
          <span className="eyebrow">Catalog</span>
          <strong>{filteredProducts.length} products</strong>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-panel">
            <h3>No matches found</h3>
            <p>Adjust the filters or correct the products from the admin panel.</p>
          </div>
        ) : (
          <div className="catalog-grid">
            {filteredProducts.map((product) => (
              <article className="catalog-card" key={product.id}>
                <button className="catalog-card-button" onClick={() => setSelectedProduct(product)} type="button">
                  <div className="catalog-image-shell">
                    <img
                      alt={product.name}
                      decoding="async"
                      loading="lazy"
                      onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                      src={formatImagePath(product.image)}
                    />
                    {product.featured ? <span className="floating-badge">Featured</span> : null}
                  </div>
                  <div className="catalog-copy">
                    <span className="catalog-meta">{getCategoryName(product.category, categoryDefinitions)}</span>
                    <h3 translate="no">{product.name}</h3>
                    <p translate="no">{[product.brand, product.unit_size].filter(Boolean).join(' · ')}</p>
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
      await signInWithPassword(email, password);
      onSignedIn?.();
    } catch (submissionError) {
      setError(submissionError.message ?? 'Could not sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="admin-shell narrow-shell">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Admin</span>
          <h2>Sign in to edit the catalog</h2>
        </div>
        <p>Sign in with an approved admin account to edit catalog data.</p>
      </div>
      <form className="admin-form auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          Password
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
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}

function ImageDropZone({ disabled, imageSrc, isUploading, name, onClear, onUpload }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const pickFile = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pickFile();
    }
  };

  const handleFiles = (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    onUpload(file);
  };

  const handleDragOver = (event) => {
    if (disabled) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (event) => {
    if (disabled) return;
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="admin-dropzone-wrapper">
      <div
        aria-disabled={disabled || undefined}
        aria-label={imageSrc ? 'Replace product image' : 'Upload product image'}
        className={classNames(
          'admin-dropzone',
          isDragging && 'admin-dropzone-dragging',
          disabled && 'admin-dropzone-disabled',
          imageSrc && 'admin-dropzone-filled',
        )}
        onClick={pickFile}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        {imageSrc ? (
          <img
            alt={name || 'Product preview'}
            decoding="async"
            loading="lazy"
            onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
            src={imageSrc}
          />
        ) : null}

        <div className={classNames('admin-dropzone-overlay', imageSrc && 'admin-dropzone-overlay-muted')}>
          {isUploading ? (
            <>
              <span className="admin-dropzone-spinner" aria-hidden="true" />
              <span className="admin-dropzone-title">Uploading…</span>
            </>
          ) : (
            <>
              <svg aria-hidden="true" height="36" viewBox="0 0 24 24" width="36">
                <path d="M12 16V6m0 0l-4 4m4-4l4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span className="admin-dropzone-title">{imageSrc ? 'Replace image' : 'Upload image'}</span>
              <span className="admin-dropzone-hint">Click to browse or drag &amp; drop</span>
            </>
          )}
        </div>

        <input
          accept="image/png,image/jpeg,image/webp,image/avif"
          disabled={disabled}
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = '';
          }}
          ref={inputRef}
          style={{ display: 'none' }}
          type="file"
        />
      </div>
      {imageSrc ? (
        <button
          className="admin-dropzone-remove"
          onClick={onClear}
          type="button"
        >
          Remove image
        </button>
      ) : null}
    </div>
  );
}

function ProductEditorPanel({
  availableBrandNames,
  availableCategories,
  availableSubcategories,
  draft,
  isSaving,
  isUploadingImage,
  onCancel,
  onDelete,
  onDuplicate,
  onFieldChange,
  onImageUpload,
  onSubmit,
}) {
  return (
    <form className="admin-editor-panel" onSubmit={onSubmit}>
      <div className="admin-editor-panel-header">
        <div>
          <span className="eyebrow">{draft?.id ? 'Edit product' : 'New product'}</span>
          <h2 translate="no">{draft?.name || 'Untitled product'}</h2>
        </div>
        <div className="admin-editor-panel-status">
          <span className={classNames('status-pill', draft?.visible ? 'status-pill-green' : 'status-pill-gray')}>
            {draft?.visible ? 'Visible' : 'Hidden'}
          </span>
          {draft?.featured ? <span className="status-pill status-pill-gold">Featured</span> : null}
        </div>
      </div>

      <div className="admin-editor-body">
        <div className="admin-editor-fields">
          <label className="admin-editor-field">
            <span>Name</span>
            <input
              onChange={(event) => onFieldChange('name', event.target.value)}
              required
              translate="no"
              type="text"
              value={draft.name}
            />
          </label>

          <div className="admin-editor-row">
            <label className="admin-editor-field">
              <span>Category</span>
              <select
                onChange={(event) => onFieldChange('category', event.target.value)}
                translate="no"
                value={draft.category}
              >
                {availableCategories.map((definition) => (
                  <option key={definition.id} value={definition.id}>
                    {definition.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-editor-field">
              <span>Sub category</span>
              <input
                list="subcategory-options"
                onChange={(event) => onFieldChange('subcategory', event.target.value)}
                translate="no"
                type="text"
                value={draft.subcategory}
              />
              <datalist id="subcategory-options">
                {availableSubcategories.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="admin-editor-row">
            <label className="admin-editor-field">
              <span>Brand</span>
              <input
                list="brand-options"
                onChange={(event) => onFieldChange('brand', event.target.value)}
                placeholder="Choose a brand or type a new one"
                translate="no"
                type="text"
                value={draft.brand}
              />
              <datalist id="brand-options">
                {availableBrandNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
            <label className="admin-editor-field">
              <span>SKU</span>
              <input
                onChange={(event) => onFieldChange('sku', event.target.value)}
                placeholder="DILE-0001"
                translate="no"
                type="text"
                value={draft.sku}
              />
            </label>
          </div>

          <div className="admin-editor-row">
            <label className="admin-editor-field">
              <span>Unit size</span>
              <input
                onChange={(event) => onFieldChange('unit_size', event.target.value)}
                placeholder="16 oz / 12 pack / 500 g"
                translate="no"
                type="text"
                value={draft.unit_size}
              />
            </label>
            <label className="admin-editor-field">
              <span>Sort order</span>
              <input
                onChange={(event) => onFieldChange('sort_order', event.target.value)}
                type="number"
                value={draft.sort_order}
              />
            </label>
          </div>

          <label className="admin-editor-field">
            <span>Description</span>
            <textarea
              onChange={(event) => onFieldChange('description', event.target.value)}
              rows="5"
              value={draft.description}
            />
          </label>

          <div className="admin-editor-toggles">
            <label className="toggle-card">
              <input
                checked={Boolean(draft.visible)}
                onChange={(event) => onFieldChange('visible', event.target.checked)}
                type="checkbox"
              />
              <span>Visible in catalog</span>
            </label>
            <label className="toggle-card">
              <input
                checked={Boolean(draft.featured)}
                onChange={(event) => onFieldChange('featured', event.target.checked)}
                type="checkbox"
              />
              <span>Featured</span>
            </label>
          </div>

          <details className="admin-editor-advanced">
            <summary>Advanced: image URL</summary>
            <input
              aria-label="Image URL"
              className="admin-editor-image-url"
              onChange={(event) => onFieldChange('image', event.target.value)}
              placeholder="https:// or local path"
              translate="no"
              type="text"
              value={draft.image}
            />
          </details>
        </div>

        <aside className="admin-editor-image-panel">
          <ImageDropZone
            disabled={!isSupabaseConfigured || isUploadingImage}
            imageSrc={draft.image ? formatImagePath(draft.image) : ''}
            isUploading={isUploadingImage}
            name={draft.name}
            onClear={() => onFieldChange('image', '')}
            onUpload={onImageUpload}
          />
          <div className="admin-editor-image-meta">
            {draft.image ? (
              <a
                className="admin-editor-image-download"
                download
                href={formatImagePath(draft.image)}
                rel="noreferrer"
                target="_blank"
              >
                Download current image
              </a>
            ) : null}
            <small className="admin-editor-image-hint">
              {isSupabaseConfigured
                ? 'Click the box or drag an image from your computer. Files go to the product-images bucket.'
                : 'Configure Supabase to enable image uploads.'}
            </small>
          </div>
        </aside>
      </div>

      <div className="admin-editor-footer">
        <button className="success-button" disabled={isSaving} type="submit">
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <div className="admin-editor-footer-right">
          <button className="ghost-button" onClick={onDuplicate} type="button">
            Duplicate
          </button>
          <button className="danger-button" onClick={onDelete} type="button">
            Delete
          </button>
          <button className="outline-button-danger" onClick={onCancel} type="button">
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

function DefinitionEditorModal({
  availableCategories,
  brandDraft,
  categoryDraft,
  editor,
  isSavingBrand,
  isSavingCategory,
  isSavingSubcategory,
  onBrandDraftChange,
  onCancel,
  onCategoryDraftChange,
  onDeleteBrand,
  onDeleteCategory,
  onSaveBrand,
  onSaveCategory,
  onSaveSubcategory,
  onSubcategoryDraftChange,
  subcategoryDraft,
}) {
  const title = editor.type === 'brand'
    ? (editor.mode === 'edit' ? 'Edit brand' : 'New brand')
    : editor.type === 'category'
      ? (editor.mode === 'edit' ? 'Edit category' : 'New category')
      : (editor.mode === 'edit' ? 'Edit sub category' : 'New sub category');

  return (
    <div className="admin-picker-overlay" onClick={onCancel}>
      <div
        className="admin-definition-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="admin-picker-header">
          <h3>{title}</h3>
          <button aria-label="Close" className="admin-picker-close" onClick={onCancel} type="button">×</button>
        </div>

        {editor.type === 'brand' ? (
          <form className="admin-definition-form" onSubmit={onSaveBrand}>
            <label className="admin-editor-field">
              <span>Brand name</span>
              <input
                autoFocus
                onChange={(event) => onBrandDraftChange((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Cuzcatlecos"
                required
                translate="no"
                type="text"
                value={brandDraft.name}
              />
            </label>
            <label className="admin-editor-field">
              <span>Suggested category (optional)</span>
              <select
                onChange={(event) => onBrandDraftChange((current) => ({ ...current, category: event.target.value }))}
                value={brandDraft.category}
              >
                <option value="">No fixed category</option>
                {availableCategories.map((definition) => (
                  <option key={definition.id} value={definition.id}>{definition.name}</option>
                ))}
              </select>
            </label>
            <label className="admin-editor-field">
              <span>Internal note (optional)</span>
              <textarea
                onChange={(event) => onBrandDraftChange((current) => ({ ...current, notes: event.target.value }))}
                rows="3"
                value={brandDraft.notes || ''}
              />
            </label>
            <div className="admin-definition-footer">
              {editor.mode === 'edit' ? (
                <button className="danger-button" onClick={onDeleteBrand} type="button">Delete</button>
              ) : <span />}
              <div className="admin-definition-footer-right">
                <button className="outline-button-danger" onClick={onCancel} type="button">Cancel</button>
                <button className="primary-button" disabled={isSavingBrand} type="submit">
                  {isSavingBrand ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        ) : null}

        {editor.type === 'category' ? (
          <form className="admin-definition-form" onSubmit={onSaveCategory}>
            <label className="admin-editor-field">
              <span>Display name</span>
              <input
                autoFocus
                onChange={(event) => onCategoryDraftChange((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Frozen"
                required
                translate="no"
                type="text"
                value={categoryDraft.name}
              />
            </label>
            <label className="admin-editor-field">
              <span>Technical ID</span>
              <input
                onChange={(event) => onCategoryDraftChange((current) => ({ ...current, id: event.target.value }))}
                placeholder="frozen, grocery, dairy"
                required
                translate="no"
                type="text"
                value={categoryDraft.id}
              />
              <small>Lowercase, no spaces. Used internally.</small>
            </label>
            <div className="admin-definition-footer">
              {editor.mode === 'edit' ? (
                <button className="danger-button" onClick={onDeleteCategory} type="button">Delete</button>
              ) : <span />}
              <div className="admin-definition-footer-right">
                <button className="outline-button-danger" onClick={onCancel} type="button">Cancel</button>
                <button className="primary-button" disabled={isSavingCategory} type="submit">
                  {isSavingCategory ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        ) : null}

        {editor.type === 'subcategory' ? (
          <form className="admin-definition-form" onSubmit={onSaveSubcategory}>
            <label className="admin-editor-field">
              <span>Sub category name</span>
              <input
                autoFocus
                onChange={(event) => onSubcategoryDraftChange((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Pupusa"
                required
                translate="no"
                type="text"
                value={subcategoryDraft.name}
              />
            </label>
            <label className="admin-editor-field">
              <span>Belongs to category</span>
              <select
                onChange={(event) => onSubcategoryDraftChange((current) => ({ ...current, category: event.target.value }))}
                required
                value={subcategoryDraft.category}
              >
                <option value="">Select a category</option>
                {availableCategories.map((definition) => (
                  <option key={definition.id} value={definition.id}>{definition.name}</option>
                ))}
              </select>
            </label>
            <div className="admin-definition-footer">
              <span />
              <div className="admin-definition-footer-right">
                <button className="outline-button-danger" onClick={onCancel} type="button">Cancel</button>
                <button className="primary-button" disabled={isSavingSubcategory} type="submit">
                  {isSavingSubcategory ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </div>
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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [showImagesInList, setShowImagesInList] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [sortKey, setSortKey] = useState('default');
  const [picker, setPicker] = useState(null);
  const [addChooserOpen, setAddChooserOpen] = useState(false);
  const [definitionEditor, setDefinitionEditor] = useState(null);
  const [subcategoryDraft, setSubcategoryDraft] = useState({ id: '', category: '', name: '', sort_order: 0 });
  const [isSavingSubcategory, setIsSavingSubcategory] = useState(false);

  useEffect(() => {
    setSubcategoryFilter('all');
  }, [categoryFilter]);

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

    const results = products.filter((product) => {
      if (categoryFilter !== 'all' && product.category !== categoryFilter) {
        return false;
      }
      if (brandFilter !== 'all' && (product.brand || '') !== brandFilter) {
        return false;
      }
      if (subcategoryFilter !== 'all' && (product.subcategory || '') !== subcategoryFilter) {
        return false;
      }
      if (visibilityFilter === 'visible' && !product.visible) {
        return false;
      }
      if (visibilityFilter === 'hidden' && product.visible) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return (
        (product.name || '').toLowerCase().includes(normalizedQuery) ||
        (product.brand || '').toLowerCase().includes(normalizedQuery) ||
        (product.sku || '').toLowerCase().includes(normalizedQuery) ||
        (product.unit_size || '').toLowerCase().includes(normalizedQuery) ||
        (product.category || '').toLowerCase().includes(normalizedQuery) ||
        (product.subcategory || '').toLowerCase().includes(normalizedQuery)
      );
    });

    if (sortKey === 'az') {
      results.sort((left, right) => (left.name || '').localeCompare(right.name || ''));
    } else if (sortKey === 'za') {
      results.sort((left, right) => (right.name || '').localeCompare(left.name || ''));
    }

    return results;
  }, [products, query, categoryFilter, brandFilter, subcategoryFilter, visibilityFilter, sortKey]);

  const brandFilterOptions = useMemo(
    () => [...new Set(products.map((product) => product.brand).filter(Boolean))].sort((left, right) => left.localeCompare(right)),
    [products],
  );

  const subcategoryFilterOptions = useMemo(() => {
    const scoped = categoryFilter === 'all'
      ? products
      : products.filter((product) => product.category === categoryFilter);
    return [...new Set(scoped.map((product) => product.subcategory).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  }, [products, categoryFilter]);

  const visibleProductCount = useMemo(() => products.filter((product) => product.visible).length, [products]);
  const hiddenProductCount = products.length - visibleProductCount;
  const filtersActive = Boolean(
    query.trim()
      || categoryFilter !== 'all'
      || brandFilter !== 'all'
      || subcategoryFilter !== 'all'
      || visibilityFilter !== 'all',
  );

  const resetFilters = () => {
    setQuery('');
    setCategoryFilter('all');
    setBrandFilter('all');
    setSubcategoryFilter('all');
    setVisibilityFilter('all');
  };

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

  const handleImageUpload = async (file) => {
    if (!file) {
      return;
    }

    setNotice('');

    if (!draft?.id) {
      setNotice('Save or set a product ID before uploading an image.');
      return;
    }

    setIsUploadingImage(true);

    try {
      const upload = await uploadProductImage(file, draft.id);
      setDraft((current) => ({ ...current, image: upload.publicUrl }));
      setNotice(`Image uploaded to Storage in ${PRODUCT_IMAGE_BUCKET}. Save the product to persist the URL.`);
    } catch (error) {
      setNotice(error.message ?? 'Could not upload the image.');
    } finally {
      setIsUploadingImage(false);
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
          ? ['Product saved.', ...warnings].join(' ')
          : ['This change only exists in this session.', ...warnings].join(' '),
      );
      await onCatalogRefresh();
    } catch (error) {
      setNotice(error.message ?? 'Could not save the product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft?.id) {
      return;
    }

    if (!window.confirm(`Delete ${draft.name || 'this product'}?`)) {
      return;
    }

    setNotice('');

    try {
      const result = await deleteProduct(draft.id);
      const nextProducts = products.filter((product) => product.id !== draft.id);
      onProductsChange(nextProducts);
      setNotice(
        result.persisted
          ? 'Product deleted.'
          : 'The product was only removed from the current preview.',
      );
      await onCatalogRefresh();
    } catch (error) {
      setNotice(error.message ?? 'Could not delete the product.');
    }
  };

  const handleToggleVisibility = async (product, event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (!product?.id || togglingId === product.id) {
      return;
    }
    const next = { ...product, visible: !product.visible };
    const snapshot = products;
    const optimistic = products.map((entry) => (entry.id === product.id ? next : entry));
    onProductsChange(optimistic);
    setTogglingId(product.id);
    if (draft?.id === product.id) {
      setDraft(next);
    }
    try {
      const result = await saveProduct(next);
      const finalProducts = optimistic.map((entry) => (entry.id === result.product.id ? result.product : entry));
      onProductsChange(finalProducts);
      if (draft?.id === result.product.id) {
        setDraft(result.product);
      }
      if (!result.persisted) {
        setNotice('Visibility updated only in this local session.');
      }
    } catch (error) {
      onProductsChange(snapshot);
      setNotice(error.message ?? 'Could not update visibility.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSeed = async () => {
    setNotice('');

    try {
      const result = await seedSupabaseCatalog();
      setNotice(
        result.source === 'supabase'
          ? `Seed synced. ${result.inserted} products processed. ${(result.warnings ?? []).join(' ')}`
          : 'The seed is only available as a local fallback.',
      );
      await onCatalogRefresh();
    } catch (error) {
      setNotice(error.message ?? 'Could not seed Supabase with the current catalog.');
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
    setNotice('JSON backup downloaded.');
  };

  const handleExportCsv = () => {
    downloadTextFile(
      `dile-catalog-${new Date().toISOString().slice(0, 10)}.csv`,
      buildProductsCsv(products),
      'text/csv;charset=utf-8',
    );
    setNotice('CSV downloaded. Ready for Excel or Google Sheets.');
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
          ? `Import complete. ${(result.warnings ?? []).join(' ')}`
          : 'Import complete only in this local session.',
      );
      await onCatalogRefresh();
    } catch (error) {
      setNotice(error.message ?? 'Could not import the file.');
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
      setNotice(result.persisted ? 'Brand saved.' : result.warning ?? 'Brand saved only in this session.');
    } catch (error) {
      setNotice(error.message ?? 'Could not save the brand.');
    } finally {
      setIsSavingBrand(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!brandDraft?.id) {
      return;
    }

    if (!window.confirm(`Delete brand ${brandDraft.name || 'without a name'}?`)) {
      return;
    }

    const result = await deleteBrandDefinition(brandDraft.id);
    onBrandDefinitionsChange((current) => current.filter((definition) => definition.id !== brandDraft.id));
    setNotice(result.persisted ? 'Brand deleted.' : result.warning ?? 'Brand deleted only in this session.');
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
      setNotice(result.persisted ? 'Category saved.' : result.warning ?? 'Category saved only in this session.');
    } catch (error) {
      setNotice(error.message ?? 'Could not save the category.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryDraft?.id) {
      return;
    }

    if (!window.confirm(`Delete category ${categoryDraft.name || categoryDraft.id}?`)) {
      return;
    }

    const result = await deleteCategoryDefinition(categoryDraft.id);
    onCategoryDefinitionsChange((current) => current.filter((definition) => definition.id !== categoryDraft.id));
    setNotice(result.persisted ? 'Category deleted.' : result.warning ?? 'Category deleted only in this session.');
  };

  const handleSaveSubcategory = async (event) => {
    event.preventDefault();
    setNotice('');
    setIsSavingSubcategory(true);

    try {
      const payload = { ...subcategoryDraft };
      if (!payload.category) {
        payload.category = availableCategories[0]?.id ?? '';
      }
      if (!payload.id) {
        payload.id = `${payload.category}:${payload.name.trim().toLowerCase().replace(/\s+/g, '-')}`;
      }
      if (!payload.sort_order) {
        payload.sort_order = getNextSortOrder(subcategoryDefinitions);
      }
      const result = await saveSubcategoryDefinition(payload);
      onSubcategoryDefinitionsChange((current) => upsertDefinition(current, result.definition));
      setSubcategoryDraft({ id: '', category: '', name: '', sort_order: 0 });
      setNotice(result.persisted ? 'Subcategory saved.' : result.warning ?? 'Subcategory saved only in this session.');
    } catch (error) {
      setNotice(error.message ?? 'Could not save the subcategory.');
    } finally {
      setIsSavingSubcategory(false);
    }
  };

  const handleDeleteSubcategory = async (definition) => {
    if (!definition?.id) {
      return;
    }
    if (!window.confirm(`Delete subcategory ${definition.name}?`)) {
      return;
    }
    try {
      const result = await deleteSubcategoryDefinition(definition.id);
      onSubcategoryDefinitionsChange((current) => current.filter((entry) => entry.id !== definition.id));
      setNotice(result.persisted ? 'Subcategory deleted.' : result.warning ?? 'Subcategory deleted only in this session.');
    } catch (error) {
      setNotice(error.message ?? 'Could not delete the subcategory.');
    }
  };

  const categoryCountMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      const key = product.category || '';
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [products]);

  const brandCountMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      const key = product.brand || '';
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [products]);

  const brandsForPicker = useMemo(() => {
    const known = brandDefinitions.map((definition) => ({
      id: definition.id,
      name: definition.name,
      count: brandCountMap.get(definition.name) ?? 0,
    }));
    const known_names = new Set(brandDefinitions.map((definition) => definition.name));
    const extras = [...new Set(products.map((p) => p.brand).filter(Boolean))]
      .filter((name) => !known_names.has(name))
      .map((name) => ({ id: `ad-hoc:${name}`, name, count: brandCountMap.get(name) ?? 0, adhoc: true }));
    return [...known, ...extras].sort((left, right) => left.name.localeCompare(right.name));
  }, [brandDefinitions, brandCountMap, products]);

  const categoriesForPicker = useMemo(() => {
    return availableCategories.map((definition) => ({
      id: definition.id,
      name: definition.name,
      count: categoryCountMap.get(definition.id) ?? 0,
    }));
  }, [availableCategories, categoryCountMap]);

  const subcategoriesForCategory = useMemo(() => {
    const targetCategory = categoryFilter !== 'all' ? categoryFilter : null;
    if (!targetCategory) {
      return [];
    }
    const managed = subcategoryDefinitions
      .filter((definition) => definition.category === targetCategory);
    const managedNames = new Set(managed.map((definition) => definition.name));
    const productNames = [...new Set(
      products
        .filter((product) => product.category === targetCategory && product.subcategory)
        .map((product) => product.subcategory),
    )];
    const extras = productNames
      .filter((name) => !managedNames.has(name))
      .map((name) => ({ id: `ad-hoc:${targetCategory}:${name}`, category: targetCategory, name, adhoc: true }));
    return [...managed, ...extras].sort((left, right) => left.name.localeCompare(right.name));
  }, [categoryFilter, subcategoryDefinitions, products]);

  const openProductEditor = (product) => {
    const base = product ?? createEmptyProduct();
    if (!product) {
      base.category = availableCategories[0]?.id ?? base.category;
    }
    setSelectedId(product?.id ?? null);
    setDraft(base);
    setEditorOpen(true);
  };

  const openDefinitionEditor = (type, definition = null) => {
    if (type === 'brand') {
      setBrandDraft(definition ?? createEmptyBrand(availableCategories, getNextSortOrder(brandDefinitions)));
    } else if (type === 'category') {
      setCategoryDraft(definition ?? createEmptyCategory(getNextSortOrder(categoryDefinitions)));
    } else if (type === 'subcategory') {
      const base = definition ?? {
        id: '',
        category: categoryFilter !== 'all' ? categoryFilter : (availableCategories[0]?.id ?? ''),
        name: '',
        sort_order: getNextSortOrder(subcategoryDefinitions),
      };
      setSubcategoryDraft(base);
    }
    setDefinitionEditor({ type, mode: definition ? 'edit' : 'create' });
  };

  const handleAddChooserSelect = (choice) => {
    setAddChooserOpen(false);
    if (choice === 'product') {
      openProductEditor(null);
    } else {
      openDefinitionEditor(choice);
    }
  };

  const handleSortButton = (value) => {
    if (value === 'az') {
      setSortKey((current) => (current === 'az' ? 'za' : current === 'za' ? 'default' : 'az'));
      return;
    }
    if (value === 'brand') {
      if (brandFilter !== 'all') {
        setBrandFilter('all');
        return;
      }
      setPicker(picker === 'brand' ? null : 'brand');
      return;
    }
    if (value === 'category') {
      if (categoryFilter !== 'all') {
        setCategoryFilter('all');
        setSubcategoryFilter('all');
        return;
      }
      setPicker(picker === 'category' ? null : 'category');
    }
  };

  const sortKeyLabel = sortKey === 'az' ? 'A-Z' : sortKey === 'za' ? 'Z-A' : 'A-Z';

  const activeCategoryLabel = categoryFilter !== 'all'
    ? getCategoryName(categoryFilter, availableCategories)
    : null;
  const activeBrandLabel = brandFilter !== 'all' ? brandFilter : null;

  const closePicker = () => setPicker(null);

  return (
    <section className="admin-workspace">
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">Products</h2>

        <label className="admin-sidebar-search" htmlFor="admin-product-search">
          <span className="visually-hidden">Search</span>
          <svg aria-hidden="true" className="admin-search-icon" height="16" viewBox="0 0 16 16" width="16">
            <circle cx="7" cy="7" fill="none" r="5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11 11l3.2 3.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
          </svg>
          <input
            autoComplete="off"
            id="admin-product-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            type="search"
            value={query}
          />
        </label>

        <button
          className="admin-sidebar-add"
          onClick={() => setAddChooserOpen(true)}
          type="button"
        >
          Add new <span aria-hidden="true">+</span>
        </button>

        <div className="admin-sidebar-section">
          <span className="admin-sidebar-label">Sort by:</span>
          <button
            aria-pressed={sortKey === 'az' || sortKey === 'za'}
            className={classNames('admin-sidebar-button', (sortKey === 'az' || sortKey === 'za') && 'admin-sidebar-button-active')}
            onClick={() => handleSortButton('az')}
            type="button"
          >
            {sortKey === 'za' ? 'Z-A' : 'A-Z'}
          </button>
          <button
            aria-pressed={brandFilter !== 'all' || picker === 'brand'}
            className={classNames(
              'admin-sidebar-button',
              (brandFilter !== 'all' || picker === 'brand') && 'admin-sidebar-button-active',
            )}
            onClick={() => handleSortButton('brand')}
            type="button"
          >
            {activeBrandLabel ? (
              <>
                <span className="admin-sidebar-button-label" translate="no">{activeBrandLabel}</span>
                <span aria-hidden="true" className="admin-sidebar-button-clear">×</span>
              </>
            ) : 'Brand'}
          </button>
          <button
            aria-pressed={categoryFilter !== 'all' || picker === 'category'}
            className={classNames(
              'admin-sidebar-button',
              (categoryFilter !== 'all' || picker === 'category') && 'admin-sidebar-button-active',
            )}
            onClick={() => handleSortButton('category')}
            type="button"
          >
            {activeCategoryLabel ? (
              <>
                <span className="admin-sidebar-button-label">{activeCategoryLabel}</span>
                <span aria-hidden="true" className="admin-sidebar-button-clear">×</span>
              </>
            ) : 'Category'}
          </button>

          {categoryFilter !== 'all' && subcategoriesForCategory.length > 0 ? (
            <div className="admin-sidebar-subpanel">
              <span className="admin-sidebar-sublabel">Subcategory</span>
              <div className="admin-sidebar-chip-stack">
                <button
                  className={classNames('admin-sidebar-chip', subcategoryFilter === 'all' && 'admin-sidebar-chip-active')}
                  onClick={() => setSubcategoryFilter('all')}
                  type="button"
                >
                  All
                </button>
                {subcategoriesForCategory.map((definition) => (
                  <button
                    className={classNames('admin-sidebar-chip', subcategoryFilter === definition.name && 'admin-sidebar-chip-active')}
                    key={definition.id}
                    onClick={() => setSubcategoryFilter(definition.name)}
                    type="button"
                  >
                    {definition.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="admin-sidebar-section">
          <span className="admin-sidebar-label">Status</span>
          <div className="admin-sidebar-status-row">
            {[
              ['all', 'All'],
              ['visible', 'Visible'],
              ['hidden', 'Hidden'],
            ].map(([value, label]) => (
              <button
                className={classNames('admin-sidebar-status', visibilityFilter === value && 'admin-sidebar-status-active')}
                key={value}
                onClick={() => setVisibilityFilter(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-sidebar-spacer" />

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-count">
            <span className="admin-sidebar-label">Product Count:</span>
            <strong>{filteredProducts.length}</strong>
            <span className="admin-sidebar-count-total">of {products.length}</span>
          </div>
          <details className="admin-sidebar-tools">
            <summary>Data tools</summary>
            <div className="admin-sidebar-tools-body">
              <button className="ghost-button ghost-button-small" onClick={handleExportJson} type="button">Export JSON</button>
              <button className="ghost-button ghost-button-small" onClick={handleExportCsv} type="button">Export CSV</button>
              <label className="ghost-button ghost-button-small upload-trigger">
                {isImporting ? 'Importing...' : 'Import CSV / JSON'}
                <input accept=".csv,.json" disabled={isImporting} onChange={handleImportDataset} type="file" />
              </label>
              <button className="ghost-button ghost-button-small" onClick={handleSeed} type="button">Sync seed</button>
              <label className="admin-sidebar-images-toggle">
                <input
                  checked={showImagesInList}
                  onChange={(event) => setShowImagesInList(event.target.checked)}
                  type="checkbox"
                />
                <span>Show thumbnails</span>
              </label>
            </div>
          </details>
          <div className="admin-sidebar-meta">
            <small translate="no">{profile?.display_name || profile?.email || 'Authenticated user'}</small>
            <small className="admin-sidebar-source">{sourceLabel}</small>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        {notice ? <div className="notice notice-info admin-main-notice">{notice}</div> : null}

        {editorOpen ? (
          <ProductEditorPanel
            availableBrandNames={availableBrandNames}
            availableCategories={availableCategories}
            availableSubcategories={availableSubcategories}
            draft={draft}
            isSaving={isSaving}
            isUploadingImage={isUploadingImage}
            onCancel={() => setEditorOpen(false)}
            onDelete={async () => {
              await handleDelete();
              setEditorOpen(false);
            }}
            onDuplicate={() =>
              setDraft((current) => ({
                ...current,
                id: Date.now(),
                name: `${current.name || 'Product'} copy`,
              }))
            }
            onFieldChange={handleFieldChange}
            onImageUpload={handleImageUpload}
            onSubmit={async (event) => {
              await handleSave(event);
              setEditorOpen(false);
            }}
          />
        ) : (
          <>
            <div className="admin-table" role="table">
              <div className={classNames('admin-table-head', showImagesInList && 'admin-table-head-with-images')} role="row">
                <span className="admin-table-check-col" role="columnheader" title="Click the checkbox to show or hide a product from the public catalog">On</span>
                {showImagesInList ? <span className="admin-table-image-col" role="columnheader">Image</span> : null}
                <span role="columnheader">Name</span>
                <span role="columnheader">Category</span>
                <span role="columnheader">Brand</span>
                <span role="columnheader">Sub cat</span>
                <span role="columnheader">SKU</span>
                <span className="admin-table-actions-col" role="columnheader" aria-label="Actions" />
              </div>
              {filteredProducts.length === 0 ? (
                <div className="admin-table-empty">
                  <p>No products match these filters.</p>
                  {(query || categoryFilter !== 'all' || brandFilter !== 'all' || subcategoryFilter !== 'all' || visibilityFilter !== 'all') ? (
                    <button
                      className="ghost-button ghost-button-small"
                      onClick={() => {
                        setQuery('');
                        setCategoryFilter('all');
                        setBrandFilter('all');
                        setSubcategoryFilter('all');
                        setVisibilityFilter('all');
                      }}
                      type="button"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    className={classNames(
                      'admin-table-row',
                      showImagesInList && 'admin-table-row-with-images',
                      !product.visible && 'admin-table-row-hidden',
                    )}
                    key={product.id}
                    onClick={() => openProductEditor(product)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openProductEditor(product);
                      }
                    }}
                    role="row"
                    tabIndex={0}
                  >
                    <span className="admin-table-check-col" role="cell">
                      <button
                        aria-label={product.visible ? 'Hide from catalog' : 'Show in catalog'}
                        aria-pressed={Boolean(product.visible)}
                        className={classNames('visibility-check', product.visible && 'visibility-check-on')}
                        disabled={togglingId === product.id}
                        onClick={(event) => handleToggleVisibility(product, event)}
                        title={product.visible ? 'Visible · click to hide' : 'Hidden · click to show'}
                        type="button"
                      >
                        {product.visible ? (
                          <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
                            <path
                              d="M3 8.5l3 3 7-7"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.4"
                            />
                          </svg>
                        ) : null}
                      </button>
                    </span>
                    {showImagesInList ? (
                      <span className="admin-table-image-col" role="cell">
                        {product.image ? (
                          <img
                            alt=""
                            decoding="async"
                            loading="lazy"
                            onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                            src={formatImagePath(product.image)}
                          />
                        ) : <span className="admin-table-image-empty" aria-hidden="true">—</span>}
                      </span>
                    ) : null}
                    <span className="admin-table-name-cell" role="cell" translate="no">
                      <span className="admin-table-name-text">{product.name || <em>Untitled</em>}</span>
                      {product.featured ? <span className="mini-badge mini-badge-gold">Featured</span> : null}
                    </span>
                    <span role="cell">{getCategoryName(product.category, availableCategories) || '—'}</span>
                    <span role="cell" translate="no">{product.brand || '—'}</span>
                    <span role="cell" translate="no">{product.subcategory || '—'}</span>
                    <span role="cell" translate="no">{product.sku || '—'}</span>
                    <span className="admin-table-actions-col" role="cell">
                      <button
                        className="table-action-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openProductEditor(product);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>

            {picker === 'brand' ? (
              <div className="admin-picker-overlay" onClick={closePicker}>
                <div
                  className="admin-picker-card"
                  onClick={(event) => event.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Filter by brand"
                >
                  <div className="admin-picker-header">
                    <h3>By Brand</h3>
                    <button aria-label="Close" className="admin-picker-close" onClick={closePicker} type="button">×</button>
                  </div>
                  <div className="admin-picker-grid">
                    {brandsForPicker.length === 0 ? (
                      <p className="admin-picker-empty">No brands yet. Use Add new → Brand to create one.</p>
                    ) : brandsForPicker.map((item) => (
                      <div className="admin-picker-cell" key={item.id}>
                        <button
                          className="admin-picker-button"
                          onClick={() => {
                            setBrandFilter(item.name);
                            closePicker();
                          }}
                          type="button"
                        >
                          <span className="admin-picker-button-label" translate="no">{item.name}</span>
                          <span className="admin-picker-button-count">{item.count}</span>
                        </button>
                        {!item.adhoc ? (
                          <button
                            aria-label={`Edit brand ${item.name}`}
                            className="admin-picker-edit"
                            onClick={() => {
                              const definition = brandDefinitions.find((d) => d.id === item.id);
                              if (definition) {
                                openDefinitionEditor('brand', definition);
                                closePicker();
                              }
                            }}
                            type="button"
                          >
                            <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
                              <path d="M11.5 2.5l2 2-8 8H3.5v-2z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <p className="admin-picker-hint">Click a brand to filter the product list.</p>
                </div>
              </div>
            ) : null}

            {picker === 'category' ? (
              <div className="admin-picker-overlay" onClick={closePicker}>
                <div
                  className="admin-picker-card"
                  onClick={(event) => event.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Filter by category"
                >
                  <div className="admin-picker-header">
                    <h3>By Category</h3>
                    <button aria-label="Close" className="admin-picker-close" onClick={closePicker} type="button">×</button>
                  </div>
                  <div className="admin-picker-grid">
                    {categoriesForPicker.length === 0 ? (
                      <p className="admin-picker-empty">No categories yet. Use Add new → Category to create one.</p>
                    ) : categoriesForPicker.map((item) => (
                      <div className="admin-picker-cell" key={item.id}>
                        <button
                          className="admin-picker-button"
                          onClick={() => {
                            setCategoryFilter(item.id);
                            setSubcategoryFilter('all');
                            closePicker();
                          }}
                          type="button"
                        >
                          <span className="admin-picker-button-label">{item.name}</span>
                          <span className="admin-picker-button-count">{item.count}</span>
                        </button>
                        <button
                          aria-label={`Edit category ${item.name}`}
                          className="admin-picker-edit"
                          onClick={() => {
                            const definition = categoryDefinitions.find((d) => d.id === item.id);
                            if (definition) {
                              openDefinitionEditor('category', definition);
                              closePicker();
                            }
                          }}
                          type="button"
                        >
                          <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
                            <path d="M11.5 2.5l2 2-8 8H3.5v-2z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="admin-picker-hint">Click a category to filter the product list.</p>
                </div>
              </div>
            ) : null}
          </>
        )}

        {addChooserOpen ? (
          <div className="admin-picker-overlay" onClick={() => setAddChooserOpen(false)}>
            <div
              className="admin-chooser-card"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Add new"
            >
              <div className="admin-picker-header">
                <h3>Add new</h3>
                <button aria-label="Close" className="admin-picker-close" onClick={() => setAddChooserOpen(false)} type="button">×</button>
              </div>
              <div className="admin-chooser-grid">
                {[
                  ['product', 'Product'],
                  ['brand', 'Brand'],
                  ['category', 'Category'],
                  ['subcategory', 'Sub category'],
                ].map(([value, label]) => (
                  <button
                    className="admin-chooser-button"
                    key={value}
                    onClick={() => handleAddChooserSelect(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {definitionEditor ? (
          <DefinitionEditorModal
            availableCategories={availableCategories}
            brandDraft={brandDraft}
            categoryDraft={categoryDraft}
            editor={definitionEditor}
            isSavingBrand={isSavingBrand}
            isSavingCategory={isSavingCategory}
            isSavingSubcategory={isSavingSubcategory}
            onBrandDraftChange={setBrandDraft}
            onCancel={() => setDefinitionEditor(null)}
            onCategoryDraftChange={setCategoryDraft}
            onDeleteBrand={async () => {
              await handleDeleteBrand();
              setDefinitionEditor(null);
            }}
            onDeleteCategory={async () => {
              await handleDeleteCategory();
              setDefinitionEditor(null);
            }}
            onSaveBrand={async (event) => {
              await handleSaveBrand(event);
              setDefinitionEditor(null);
            }}
            onSaveCategory={async (event) => {
              await handleSaveCategory(event);
              setDefinitionEditor(null);
            }}
            onSaveSubcategory={async (event) => {
              await handleSaveSubcategory(event);
              setDefinitionEditor(null);
            }}
            onSubcategoryDraftChange={setSubcategoryDraft}
            subcategoryDraft={subcategoryDraft}
          />
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
  const canManage = hasDashboardWriteAccess(profile);

  if (ALLOW_LOCAL_ADMIN_PREVIEW) {
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

  if (!isSupabaseConfigured) {
    return <AdminUnavailablePanel />;
  }

  if (!authResolved || profileLoading) {
    return <AuthPendingPanel />;
  }

  if (!session) {
    return <LoginPanel onSignedIn={onCatalogRefresh} />;
  }

  if (!canManage) {
    return <AccessRestrictedPanel onSignOut={signOut} />;
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
      profile={{ ...(profile ?? {}), email: session.user.email }}
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
  const [sourceLabel, setSourceLabel] = useState('loading');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [profileLoading, setProfileLoading] = useState(isSupabaseConfigured);
  const [authResolved, setAuthResolved] = useState(!isSupabaseConfigured);

  const canManage = hasDashboardWriteAccess(profile) || ALLOW_LOCAL_ADMIN_PREVIEW;

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
        ? 'Live Supabase'
        : catalogResult.source === 'seed'
          ? 'local fallback until Supabase is populated'
          : 'local catalog from catalog-seed.json',
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
            <p>Preparing catalog and admin panel...</p>
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
        <p translate="no">Distribuidora Leon</p>
      </footer>
    </div>
  );
}
