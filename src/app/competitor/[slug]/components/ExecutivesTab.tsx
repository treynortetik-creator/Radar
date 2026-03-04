import { useState } from 'react';
import type { CompetitorExecutive } from '@/lib/db';
import { UsersIcon, PlusIcon, ExternalLinkIcon, EditIcon, TrashIcon } from '@/components/icons';
import type { ProfileData } from './types';

export function ExecutivesTab({
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
    title: '',
    linkedin_url: '',
    background: '',
    started_role: '',
    source: '',
    is_current: true,
  });

  const resetForm = () => {
    setForm({
      name: '',
      title: '',
      linkedin_url: '',
      background: '',
      started_role: '',
      source: '',
      is_current: true,
    });
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (exec: CompetitorExecutive) => {
    setForm({
      name: exec.name,
      title: exec.title,
      linkedin_url: exec.linkedin_url || '',
      background: exec.background || '',
      started_role: exec.started_role || '',
      source: exec.source || '',
      is_current: exec.is_current,
    });
    setEditingId(exec.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.title) return;
    setSaving(true);
    try {
      const url = editingId
        ? `/api/competitors/${profile.id}/executives/${editingId}`
        : `/api/competitors/${profile.id}/executives`;
      await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      resetForm();
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this executive?')) return;
    await fetch(`/api/competitors/${profile.id}/executives/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">
          C-Suite & Key Executives
          <span className="ml-2 text-xs font-normal text-slate-500">({profile.executives.length})</span>
        </h2>
        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <PlusIcon className="w-3.5 h-3.5" /> Add Executive
          </button>
        )}
      </div>

      {showForm && (
        <div className="card-base p-5 space-y-4 expand-content">
          <h3 className="text-sm font-semibold text-slate-200">{editingId ? 'Edit' : 'Add'} Executive</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="input-base"
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="input-base"
              placeholder="Title *"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              className="input-base"
              placeholder="LinkedIn URL"
              value={form.linkedin_url}
              onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
            />
            <input
              className="input-base"
              placeholder="Started Role (e.g., 2023)"
              value={form.started_role}
              onChange={(e) => setForm((f) => ({ ...f, started_role: e.target.value }))}
            />
            <input
              className="input-base md:col-span-2"
              placeholder="Background"
              value={form.background}
              onChange={(e) => setForm((f) => ({ ...f, background: e.target.value }))}
            />
            <input
              className="input-base"
              placeholder="Source"
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={form.is_current}
                onChange={(e) => setForm((f) => ({ ...f, is_current: e.target.checked }))}
                className="accent-amber-500"
              />
              Currently in role
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.title}
              className="btn-primary text-xs"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
            </button>
            <button onClick={resetForm} className="btn-ghost text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {profile.executives.length > 0 ? (
        <div className="card-base overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/40">
                <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider font-medium px-4 py-3">
                  Name
                </th>
                <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider font-medium px-4 py-3">
                  Title
                </th>
                <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider font-medium px-4 py-3 hidden md:table-cell">
                  Since
                </th>
                <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider font-medium px-4 py-3 hidden lg:table-cell">
                  Background
                </th>
                <th className="text-right text-[10px] text-slate-500 uppercase tracking-wider font-medium px-4 py-3 w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {profile.executives.map((exec) => (
                <tr
                  key={exec.id}
                  className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${exec.is_current ? 'text-slate-200' : 'text-slate-500'}`}
                      >
                        {exec.name}
                      </span>
                      {!exec.is_current && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                          Former
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{exec.title}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">
                    {exec.started_role || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell max-w-xs truncate">
                    {exec.background || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {exec.linkedin_url && (
                        <a
                          href={exec.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-icon w-7 h-7"
                        >
                          <ExternalLinkIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button onClick={() => startEdit(exec)} className="btn-icon w-7 h-7">
                        <EditIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(exec.id)}
                        className="btn-icon danger w-7 h-7"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !showForm ? (
        <div className="card-base p-8 text-center">
          <UsersIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No executives tracked yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-amber-400 hover:text-amber-300 mt-2 font-medium"
          >
            Add the first executive
          </button>
        </div>
      ) : null}
    </div>
  );
}
