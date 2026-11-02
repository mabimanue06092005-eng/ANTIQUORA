import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Archive, ExternalLink, ImagePlus, Plus, Search, Trash2, Upload } from 'lucide-react';
import { api, ApiError, qs } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatINR } from '../../lib/format';
import type { Category } from '../../lib/types';
import { useToast } from '../../context/ToastContext';
import { Checkbox, ConfirmDialog, EmptyState, ErrorState, Img, Notice, PageLoader, Pagination, SelectField, Skeleton, Spinner, StatusBadge, SubmitButton, TextAreaField, TextField } from '../../components/ui';
import { AdminTitle } from './AdminLayout';

interface AdminProduct {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  description: string;
  pricePaise: number;
  compareAtPaise: number | null;
  stock: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured: boolean;
  isCuratorPick: boolean;
  categoryId: string;
  category: { name: string };
  materials: string | null;
  dimensions: string | null;
  period: string | null;
  origin: string | null;
  provenance: string | null;
  provenanceType: 'ILLUSTRATIVE' | 'DOCUMENTED';
  condition: string | null;
  imageCredit: string | null;
  images: { url: string; alt: string }[];
  updatedAt: string;
}

export function AdminProducts() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? 'ALL';
  const page = Number(params.get('page') ?? 1);
  const category = params.get('category') ?? '';
  const [search, setSearch] = useState(q);
  const { data, error, loading, reload } = useAsync(() => api.page<AdminProduct[]>(`/api/admin/products${qs({ q, status, category, page, pageSize: 15 })}`), [q, status, category, page]);

  const set = (k: string, v: string | null) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== 'page') n.delete('page');
    setParams(n);
  };

  const setStatus = async (p: AdminProduct, s: AdminProduct['status']) => {
    try {
      await api.patch(`/api/admin/products/${p.id}/status`, { status: s });
      toast(`"${p.name}" ${s === 'ARCHIVED' ? 'archived' : s === 'PUBLISHED' ? 'published' : 'moved to draft'}.`);
      await reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Update failed', 'error');
    }
  };

  return (
    <>
      <AdminTitle title="Products" action={<Link to="/admin/products/new" className="btn-primary"><Plus className="h-4 w-4" /> New product</Link>}>
        Create, edit, publish and archive listings. Archived products are hidden from the store but kept for order history.
      </AdminTitle>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <form onSubmit={(e) => { e.preventDefault(); set('q', search.trim() || null); }} className="relative min-w-[220px] flex-1" role="search">
          <label htmlFor="ps" className="sr-only">Search products</label>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input id="ps" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or SKU" className="field-input pl-9" />
        </form>
        <label htmlFor="pst" className="sr-only">Status</label>
        <select id="pst" value={status} onChange={(e) => set('status', e.target.value === 'ALL' ? null : e.target.value)} className="field-input w-auto">
          {['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
      </div>
      {error ? <ErrorState message={error.message} onRetry={reload} /> : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th className="text-right">Price</th><th className="text-right">Stock</th><th>Status</th><th>Updated</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={8}><Skeleton className="h-8" /></td></tr>) :
                data?.data.length === 0 ? <tr><td colSpan={8}><EmptyState title="No products found">Try a different search or status filter.</EmptyState></td></tr> :
                data?.data.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-10 shrink-0 bg-parchment"><Img src={p.images[0]?.url} alt="" className="h-full w-full object-cover" /></div>
                        <div className="min-w-0">
                          <Link to={`/admin/products/${p.id}`} className="font-medium text-walnut hover:text-gold-dark">{p.name}</Link>
                          {p.isFeatured && <span className="ml-2 text-[10px] uppercase tracking-wider text-gold-dark">Featured</span>}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap tabular-nums text-ink-muted">{p.sku}</td>
                    <td className="whitespace-nowrap">{p.category.name}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{formatINR(p.pricePaise)}{p.compareAtPaise && <s className="ml-1 text-xs text-ink-muted">{formatINR(p.compareAtPaise)}</s>}</td>
                    <td className={`text-right tabular-nums ${p.stock <= 2 ? 'font-medium text-amber-800' : ''}`}>{p.stock}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="whitespace-nowrap text-ink-muted">{formatDate(p.updatedAt)}</td>
                    <td className="whitespace-nowrap text-right">
                      <Link to={`/admin/products/${p.id}`} className="mr-3 text-xs uppercase tracking-wider text-gold-dark hover:text-walnut">Edit</Link>
                      {p.status !== 'ARCHIVED' ? (
                        <button onClick={() => setStatus(p, 'ARCHIVED')} className="text-xs uppercase tracking-wider text-ink-muted hover:text-danger">Archive</button>
                      ) : (
                        <button onClick={() => setStatus(p, 'DRAFT')} className="text-xs uppercase tracking-wider text-ink-muted hover:text-walnut">Restore</button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={data?.meta?.totalPages ?? 1} onChange={(p) => set('page', String(p))} />
    </>
  );
}

type Form = {
  name: string; sku: string; slug: string; shortDescription: string; description: string; categoryId: string;
  price: string; compareAtPrice: string; stock: string; status: AdminProduct['status']; isFeatured: boolean; isCuratorPick: boolean;
  materials: string; dimensions: string; period: string; origin: string; provenance: string; provenanceType: AdminProduct['provenanceType'];
  condition: string; imageCredit: string; images: { url: string; alt: string }[];
};

const emptyForm: Form = {
  name: '', sku: '', slug: '', shortDescription: '', description: '', categoryId: '', price: '', compareAtPrice: '', stock: '1', status: 'DRAFT',
  isFeatured: false, isCuratorPick: false, materials: '', dimensions: '', period: '', origin: '', provenance: '', provenanceType: 'ILLUSTRATIVE', condition: '', imageCredit: '', images: [],
};

export function AdminProductEdit() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const { data: categories } = useAsync(() => api.get<Category[]>('/api/admin/categories'), []);
  const { data: product, loading, error } = useAsync(() => (isNew ? Promise.resolve(null) : api.get<AdminProduct>(`/api/admin/products/${id}`)), [id]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name, sku: product.sku, slug: product.slug, shortDescription: product.shortDescription, description: product.description,
      categoryId: product.categoryId, price: String(product.pricePaise / 100), compareAtPrice: product.compareAtPaise ? String(product.compareAtPaise / 100) : '',
      stock: String(product.stock), status: product.status, isFeatured: product.isFeatured, isCuratorPick: product.isCuratorPick,
      materials: product.materials ?? '', dimensions: product.dimensions ?? '', period: product.period ?? '', origin: product.origin ?? '',
      provenance: product.provenance ?? '', provenanceType: product.provenanceType, condition: product.condition ?? '', imageCredit: product.imageCredit ?? '',
      images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
    });
  }, [product]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error.message} />;

  const f = <K extends keyof Form>(k: K, v: Form[K]) => setForm((s) => ({ ...s, [k]: v }));

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast('Image is too large (max 5 MB).', 'error');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.upload<{ url: string }>('/api/admin/uploads', fd);
      f('images', [...form.images, { url: res.url, alt: form.name ? `${form.name} — view ${form.images.length + 1}` : '' }]);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const move = (i: number, d: -1 | 1) => {
    const imgs = [...form.images];
    [imgs[i], imgs[i + d]] = [imgs[i + d], imgs[i]];
    f('images', imgs);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
    const body = {
      ...form,
      price: num(form.price),
      compareAtPrice: num(form.compareAtPrice) ?? null,
      stock: num(form.stock),
      slug: form.slug || undefined,
      materials: form.materials || null, dimensions: form.dimensions || null, period: form.period || null, origin: form.origin || null,
      provenance: form.provenance || null, condition: form.condition || null, imageCredit: form.imageCredit || null,
    };
    try {
      const saved = isNew ? await api.post<AdminProduct>('/api/admin/products', body) : await api.put<AdminProduct>(`/api/admin/products/${id}`, body);
      toast(isNew ? 'Product created.' : 'Product saved.');
      navigate(`/admin/products/${saved.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        toast(err.message, 'error');
        setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      }
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    try {
      await api.del(`/api/admin/products/${id}`);
      toast('Product deleted.');
      navigate('/admin/products');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Delete failed', 'error');
      setConfirmDelete(false);
    }
  };

  return (
    <form onSubmit={save} noValidate>
      <AdminTitle
        title={isNew ? 'New product' : `Edit: ${product?.name}`}
        action={
          <div className="flex flex-wrap gap-2">
            {!isNew && product?.status === 'PUBLISHED' && <a href={`/artifact/${product.slug}`} target="_blank" rel="noreferrer" className="btn-outline"><ExternalLink className="h-4 w-4" /> View</a>}
            <Link to="/admin/products" className="btn-ghost">Cancel</Link>
            <SubmitButton loading={saving} className="btn-primary">{isNew ? 'Create product' : 'Save changes'}</SubmitButton>
          </div>
        }
      >
        <Link to="/admin/products" className="text-gold-dark hover:text-walnut">← All products</Link>
      </AdminTitle>

      {Object.keys(errors).length > 0 && <Notice tone="error" className="mb-6">Please fix the highlighted fields below.</Notice>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <fieldset className="card space-y-5 p-6">
            <legend className="sr-only">Basics</legend>
            <h2 className="text-2xl">Basics</h2>
            <TextField label="Name" value={form.name} onChange={(e) => f('name', e.target.value)} error={errors.name} required />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="SKU" value={form.sku} onChange={(e) => f('sku', e.target.value.toUpperCase())} error={errors.sku} required hint="e.g. AQ-CN-006" />
              <TextField label="URL slug" value={form.slug} onChange={(e) => f('slug', e.target.value)} error={errors.slug} hint="Leave blank to generate from the name" />
            </div>
            <TextField label="Short description" value={form.shortDescription} onChange={(e) => f('shortDescription', e.target.value)} error={errors.shortDescription} required maxLength={240} />
            <TextAreaField label="Full description" rows={7} value={form.description} onChange={(e) => f('description', e.target.value)} error={errors.description} required />
          </fieldset>

          <fieldset className="card space-y-5 p-6">
            <legend className="sr-only">Images</legend>
            <h2 className="text-2xl">Images</h2>
            {form.images.length === 0 && <p className="text-sm text-ink-muted">No images yet. Upload a file or add an image URL. The first image is the primary image.</p>}
            <ul className="space-y-3">
              {form.images.map((img, i) => (
                <li key={`${img.url}-${i}`} className="flex flex-wrap items-start gap-3 border border-line p-3">
                  <div className="h-20 w-16 shrink-0 bg-parchment"><Img src={img.url} alt="" className="h-full w-full object-cover" /></div>
                  <div className="min-w-[200px] flex-1 space-y-2">
                    <p className="truncate text-xs text-ink-muted">{img.url}</p>
                    <TextField label="Alt text" value={img.alt} onChange={(e) => f('images', form.images.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)))} error={errors[`images.${i}.alt`]} />
                  </div>
                  <div className="flex gap-1">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="flex h-9 w-9 items-center justify-center border border-line disabled:opacity-30" aria-label="Move image up"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" disabled={i === form.images.length - 1} onClick={() => move(i, 1)} className="flex h-9 w-9 items-center justify-center border border-line disabled:opacity-30" aria-label="Move image down"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => f('images', form.images.filter((_, k) => k !== i))} className="flex h-9 w-9 items-center justify-center border border-line text-danger" aria-label="Remove image"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-end gap-3">
              <label className="btn-outline cursor-pointer">
                {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />} Upload image
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ''; }} />
              </label>
              <div className="flex min-w-[260px] flex-1 gap-2">
                <TextField label="…or image URL" className="flex-1" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="/images/products/… or https://…" />
                <button type="button" className="btn-outline self-end" onClick={() => { if (newUrl.trim()) { f('images', [...form.images, { url: newUrl.trim(), alt: form.name || 'Product image' }]); setNewUrl(''); } }}><ImagePlus className="h-4 w-4" /> Add</button>
              </div>
            </div>
            {errors.images && <p className="field-error">{errors.images}</p>}
            <TextField label="Image credit" value={form.imageCredit} onChange={(e) => f('imageCredit', e.target.value)} hint="Source and licence of photographs" />
          </fieldset>

          <fieldset className="card space-y-5 p-6">
            <legend className="sr-only">Object details</legend>
            <h2 className="text-2xl">Object details</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Period / estimated age" value={form.period} onChange={(e) => f('period', e.target.value)} />
              <TextField label="Origin" value={form.origin} onChange={(e) => f('origin', e.target.value)} />
              <TextField label="Materials" value={form.materials} onChange={(e) => f('materials', e.target.value)} />
              <TextField label="Dimensions" value={form.dimensions} onChange={(e) => f('dimensions', e.target.value)} />
            </div>
            <SelectField label="Provenance type" value={form.provenanceType} onChange={(e) => f('provenanceType', e.target.value as Form['provenanceType'])}>
              <option value="ILLUSTRATIVE">Illustrative (demo / unverified) — labelled on the product page</option>
              <option value="DOCUMENTED">Documented (you hold supporting records)</option>
            </SelectField>
            <TextAreaField label="Provenance" rows={3} value={form.provenance} onChange={(e) => f('provenance', e.target.value)} />
            <TextAreaField label="Condition report" rows={3} value={form.condition} onChange={(e) => f('condition', e.target.value)} />
          </fieldset>
        </div>

        <div className="space-y-6">
          <fieldset className="card space-y-5 p-6">
            <legend className="sr-only">Publishing</legend>
            <h2 className="text-2xl">Publishing</h2>
            <SelectField label="Status" value={form.status} onChange={(e) => f('status', e.target.value as Form['status'])}>
              <option value="DRAFT">Draft (hidden)</option>
              <option value="PUBLISHED">Published (visible in store)</option>
              <option value="ARCHIVED">Archived (hidden, kept for history)</option>
            </SelectField>
            <SelectField label="Category" value={form.categoryId} onChange={(e) => f('categoryId', e.target.value)} error={errors.categoryId} required>
              <option value="">Select a category…</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <Checkbox label="Featured on homepage" checked={form.isFeatured} onChange={(e) => f('isFeatured', e.target.checked)} />
            <Checkbox label="Curator’s selection" checked={form.isCuratorPick} onChange={(e) => f('isCuratorPick', e.target.checked)} />
          </fieldset>
          <fieldset className="card space-y-5 p-6">
            <legend className="sr-only">Pricing & inventory</legend>
            <h2 className="text-2xl">Pricing & inventory</h2>
            <TextField label="Price (₹)" inputMode="decimal" value={form.price} onChange={(e) => f('price', e.target.value)} error={errors.price} required />
            <TextField label="Original price (₹)" inputMode="decimal" value={form.compareAtPrice} onChange={(e) => f('compareAtPrice', e.target.value)} error={errors.compareAtPrice} hint="Set higher than the price to show a discount" />
            <TextField label="Stock" inputMode="numeric" value={form.stock} onChange={(e) => f('stock', e.target.value.replace(/\D/g, ''))} error={errors.stock} required />
          </fieldset>
          {!isNew && (
            <div className="card space-y-3 p-6">
              <h2 className="text-xl">Remove</h2>
              <p className="text-sm text-ink-muted">Archive to hide a product while keeping order history. Permanent deletion is only possible for products that were never ordered.</p>
              <button type="button" onClick={() => f('status', 'ARCHIVED')} className="btn-outline w-full"><Archive className="h-4 w-4" /> Mark as archived</button>
              <button type="button" onClick={() => setConfirmDelete(true)} className="btn w-full border border-danger/40 text-danger hover:bg-danger hover:text-white"><Trash2 className="h-4 w-4" /> Delete permanently</button>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog open={confirmDelete} title="Delete this product permanently?" message="This cannot be undone. If the product appears in any order, deletion will be refused and you should archive it instead." confirmLabel="Delete" onConfirm={del} onClose={() => setConfirmDelete(false)} />
    </form>
  );
}
