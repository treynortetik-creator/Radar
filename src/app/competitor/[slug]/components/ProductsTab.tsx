import { useState } from 'react';
import type { CompetitorProduct } from '@/lib/db';
import { BoxIcon, EditIcon, PlusIcon, TrashIcon } from '@/components/icons';
import type { ProfileData } from './types';

export function ProductsTab({
  profile,
  onRefresh,
}: {
  profile: ProfileData;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    pricing: '',
    technology: '',
    limitations: '',
    features: '',
  });

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      pricing: '',
      technology: '',
      limitations: '',
      features: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (prod: CompetitorProduct) => {
    setForm({
      name: prod.name,
      description: prod.description || '',
      pricing: prod.pricing || '',
      technology: prod.technology || '',
      limitations: prod.limitations?.join('\n') || '',
      features: prod.features ? JSON.stringify(prod.features, null, 2) : '',
    });
    setEditingId(prod.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      let features = null;
      if (form.features.trim()) {
        try {
          features = JSON.parse(form.features);
        } catch {
          features = null;
        }
      }

      const url = editingId
        ? `/api/competitors/${profile.id}/products/${editingId}`
        : `/api/competitors/${profile.id}/products`;
      await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          pricing: form.pricing || null,
          technology: form.technology || null,
          limitations: form.limitations ? form.limitations.split('\n').filter(Boolean) : null,
          features,
        }),
      });
      resetForm();
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this product?')) return;
    await fetch(`/api/competitors/${profile.id}/products/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">
          Products & Features
          <span className="ml-2 text-xs font-normal text-slate-500">({profile.products_list.length})</span>
        </h2>
        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <PlusIcon className="w-3.5 h-3.5" /> Add Product
          </button>
        )}
      </div>

      {showForm && (
        <div className="card-base p-5 space-y-4 expand-content">
          <h3 className="text-sm font-semibold text-slate-200">{editingId ? 'Edit' : 'Add'} Product</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="input-base"
              placeholder="Product Name *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="input-base"
              placeholder="Pricing"
              value={form.pricing}
              onChange={(e) => setForm((f) => ({ ...f, pricing: e.target.value }))}
            />
            <input
              className="input-base md:col-span-2"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <input
              className="input-base"
              placeholder="Technology"
              value={form.technology}
              onChange={(e) => setForm((f) => ({ ...f, technology: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Limitations (one per line)</label>
            <textarea
              className="input-base"
              rows={3}
              placeholder="Enter limitations, one per line"
              value={form.limitations}
              onChange={(e) => setForm((f) => ({ ...f, limitations: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Features (JSON array, optional)</label>
            <textarea
              className="input-base font-mono text-xs"
              rows={3}
              placeholder='[{"name": "Feature", "description": "..."}]'
              value={form.features}
              onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name} className="btn-primary text-xs">
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
            </button>
            <button onClick={resetForm} className="btn-ghost text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {profile.products_list.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.products_list.map((prod) => (
            <div key={prod.id} className="card-base p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">{prod.name}</h3>
                  {prod.pricing && <span className="text-xs text-emerald-400 font-medium">{prod.pricing}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(prod)} className="btn-icon w-7 h-7">
                    <EditIcon className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(prod.id)} className="btn-icon danger w-7 h-7">
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {prod.description && <p className="text-xs text-slate-400 leading-relaxed">{prod.description}</p>}

              {prod.technology && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                    Technology
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">{prod.technology}</p>
                </div>
              )}

              {prod.features && Array.isArray(prod.features) && prod.features.length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                    Features
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {prod.features.map((f: Record<string, string> | string, i: number) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-lime-500/10 text-lime-300 border border-lime-500/20"
                      >
                        {typeof f === 'string' ? f : (f as Record<string, string>).name || JSON.stringify(f)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {prod.limitations && prod.limitations.length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                    Limitations
                  </span>
                  <ul className="mt-1 space-y-1">
                    {prod.limitations.map((lim, i) => (
                      <li key={i} className="text-xs text-red-400/80 flex items-start gap-1.5">
                        <span className="mt-0.5">&#x25CF;</span> {lim}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !showForm ? (
        <div className="card-base p-8 text-center">
          <BoxIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No products tracked yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-amber-400 hover:text-amber-300 mt-2 font-medium"
          >
            Add the first product
          </button>
        </div>
      ) : null}
    </div>
  );
}
