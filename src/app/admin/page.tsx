'use client';

import { useState, useEffect } from 'react';
import { 
  LoadingRadar, 
  GearIcon, 
  PlayIcon, 
  PlusIcon, 
  TrashIcon, 
  EditIcon,
  ShieldIcon,
  SignalIcon,
  ClockIcon,
} from '@/components/icons';

interface Feed {
  id: number;
  name: string;
  url: string;
  is_job_board: boolean;
  competitor_id: number;
  competitor_name: string;
  last_fetched_at: string | null;
}

interface Competitor {
  id: number;
  name: string;
}

const OPENROUTER_MODELS = [
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', cost: '$0.10/M tokens', tier: 'recommended' },
  { id: 'google/gemini-2.0-flash-thinking-exp-01-21:free', name: 'Gemini 2.0 Flash Thinking', cost: 'Free', tier: 'free' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', cost: '$3/M in, $15/M out', tier: 'premium' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', cost: '$0.25/M in, $1.25/M out', tier: 'standard' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', cost: '$0.15/M in, $0.60/M out', tier: 'standard' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', cost: '$2.50/M in, $10/M out', tier: 'premium' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', cost: '$0.52/M tokens', tier: 'standard' },
];

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  recommended: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  free: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  premium: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
  standard: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Config state
  const [model, setModel] = useState('google/gemini-2.0-flash-001');
  const [systemPrompt, setSystemPrompt] = useState('');

  // Feeds state
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [newFeed, setNewFeed] = useState({ name: '', url: '', is_job_board: false, competitor_id: 0 });
  const [showAddFeed, setShowAddFeed] = useState(false);

  // Last ingestion info
  const [lastIngest, setLastIngest] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
    loadFeeds();
    loadCompetitors();
  }, []);

  // Auto-dismiss messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      if (data.model) setModel(data.model);
      if (data.system_prompt) setSystemPrompt(data.system_prompt);
      if (data.last_ingest) setLastIngest(data.last_ingest);
    } catch (err) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFeeds = async () => {
    try {
      const res = await fetch('/api/admin/feeds');
      const data = await res.json();
      setFeeds(data.feeds || []);
    } catch (err) {
      console.error('Failed to load feeds:', err);
    }
  };

  const loadCompetitors = async () => {
    try {
      const res = await fetch('/api/competitors');
      const data = await res.json();
      setCompetitors(data.map((c: { competitor: string; competitor_id?: number }) => ({
        id: c.competitor_id || 0,
        name: c.competitor
      })));
    } catch (err) {
      console.error('Failed to load competitors:', err);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, system_prompt: systemPrompt }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setMessage({ type: 'success', text: 'Configuration saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const runIngestion = async () => {
    setIngesting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/ingest', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ingestion failed');
      setMessage({ type: 'success', text: `Ingestion complete: ${data.new_items || 0} new items processed` });
      setLastIngest(new Date().toISOString());
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Ingestion failed' });
    } finally {
      setIngesting(false);
    }
  };

  const saveFeed = async (feed: Feed) => {
    try {
      const res = await fetch('/api/admin/feeds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feed),
      });
      if (!res.ok) throw new Error('Failed to save feed');
      setEditingFeed(null);
      loadFeeds();
      setMessage({ type: 'success', text: 'Feed updated successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update feed' });
    }
  };

  const addFeed = async () => {
    if (!newFeed.name || !newFeed.url || !newFeed.competitor_id) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }
    try {
      const res = await fetch('/api/admin/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeed),
      });
      if (!res.ok) throw new Error('Failed to add feed');
      setNewFeed({ name: '', url: '', is_job_board: false, competitor_id: 0 });
      setShowAddFeed(false);
      loadFeeds();
      setMessage({ type: 'success', text: 'Feed added successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to add feed' });
    }
  };

  const deleteFeed = async (id: number) => {
    if (!confirm('Are you sure you want to delete this feed?')) return;
    try {
      const res = await fetch(`/api/admin/feeds?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete feed');
      loadFeeds();
      setMessage({ type: 'success', text: 'Feed deleted successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete feed' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <LoadingRadar className="w-16 h-16 text-amber-500" />
        <span className="text-sm text-slate-500 font-medium">Loading control panel...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
            <GearIcon className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Control Panel</h1>
            <p className="text-sm text-slate-500">Configure AI model, prompts, and RSS feeds</p>
          </div>
        </div>
      </div>

      {/* Toast message */}
      {message && (
        <div className={`
          flex items-center gap-2 p-4 rounded-xl text-sm font-medium animate-fade-in
          ${message.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }
        `}>
          <ShieldIcon variant={message.type === 'success' ? 'secure' : 'alert'} className="w-4 h-4" />
          {message.text}
        </div>
      )}

      {/* Ingestion Control */}
      <section className="card-base p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <SignalIcon strength={4} className="w-4 h-4 text-amber-400" />
              <h2 className="text-lg font-semibold text-slate-100">RSS Ingestion</h2>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              Fetch all RSS feeds, score new items with AI, and store in database.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <ClockIcon className="w-3.5 h-3.5" />
                <span>
                  {lastIngest
                    ? `Last run: ${new Date(lastIngest).toLocaleString()}`
                    : 'Never run'}
                </span>
              </div>
              <span className="text-slate-700">•</span>
              <code className="bg-slate-900/60 px-2 py-0.5 rounded text-slate-400">POST /api/ingest</code>
            </div>
          </div>
          <button
            onClick={runIngestion}
            disabled={ingesting}
            className="btn-primary flex items-center gap-2"
          >
            {ingesting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4" />
                Run Now
              </>
            )}
          </button>
        </div>
      </section>

      {/* Model Selection */}
      <section className="card-base p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">AI Model Selection</h2>
        <div className="grid gap-2">
          {OPENROUTER_MODELS.map(m => {
            const tc = tierColors[m.tier];
            return (
              <label
                key={m.id}
                className={`
                  flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-150
                  ${model === m.id
                    ? 'bg-amber-500/10 border border-amber-500/30 ring-1 ring-amber-500/20'
                    : 'bg-slate-900/40 border border-slate-700/30 hover:border-slate-600/50'
                  }
                `}
              >
                <input
                  type="radio"
                  name="model"
                  value={m.id}
                  checked={model === m.id}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-4 h-4 text-amber-500 border-slate-600 focus:ring-amber-500 focus:ring-offset-0 bg-slate-800"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{m.name}</span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${tc.bg} ${tc.text} border ${tc.border}`}>
                      {m.tier}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">{m.id}</div>
                </div>
                <div className="text-xs text-slate-400 font-mono shrink-0">{m.cost}</div>
              </label>
            );
          })}
        </div>
      </section>

      {/* System Prompt */}
      <section className="card-base p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">System Prompt</h2>
            <p className="text-xs text-slate-500 mt-1">
              Placeholders: {'{competitor}'}, {'{title}'}, {'{summary}'}, {'{date}'}, {'{is_job}'}
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">{systemPrompt.length.toLocaleString()} chars</span>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={16}
          className="input-base font-mono text-sm resize-y min-h-[200px]"
          placeholder="Enter system prompt..."
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <ShieldIcon variant="secure" className="w-4 h-4" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </section>

      {/* Feeds Management */}
      <section className="card-base p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">RSS Feeds</h2>
            <p className="text-xs text-slate-500 mt-1">{feeds.length} feeds configured</p>
          </div>
          <button
            onClick={() => setShowAddFeed(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Feed
          </button>
        </div>

        {/* Add Feed Form */}
        {showAddFeed && (
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 mb-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">New Feed</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Feed Name"
                value={newFeed.name}
                onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
                className="input-base"
              />
              <select
                value={newFeed.competitor_id}
                onChange={(e) => setNewFeed({ ...newFeed, competitor_id: Number(e.target.value) })}
                className="input-base"
              >
                <option value={0}>Select Competitor</option>
                {competitors.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="url"
                placeholder="RSS Feed URL"
                value={newFeed.url}
                onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
                className="input-base sm:col-span-2"
              />
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={newFeed.is_job_board}
                  onChange={(e) => setNewFeed({ ...newFeed, is_job_board: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                />
                Job Board Feed
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAddFeed(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={addFeed}
                className="btn-primary"
              >
                Add Feed
              </button>
            </div>
          </div>
        )}

        {/* Feeds List */}
        <div className="space-y-2">
          {feeds.map(feed => (
            <div
              key={feed.id}
              className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-4 transition-all duration-150 hover:border-slate-700/50"
            >
              {editingFeed?.id === feed.id ? (
                <div className="space-y-3 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editingFeed.name}
                      onChange={(e) => setEditingFeed({ ...editingFeed, name: e.target.value })}
                      className="input-base"
                    />
                    <select
                      value={editingFeed.competitor_id}
                      onChange={(e) => setEditingFeed({ ...editingFeed, competitor_id: Number(e.target.value) })}
                      className="input-base"
                    >
                      {competitors.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      type="url"
                      value={editingFeed.url}
                      onChange={(e) => setEditingFeed({ ...editingFeed, url: e.target.value })}
                      className="input-base sm:col-span-2"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-400">
                      <input
                        type="checkbox"
                        checked={editingFeed.is_job_board}
                        onChange={(e) => setEditingFeed({ ...editingFeed, is_job_board: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                      />
                      Job Board Feed
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingFeed(null)}
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveFeed(editingFeed)}
                      className="btn-primary"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-200">{feed.name}</span>
                      {feed.is_job_board && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded">
                          Jobs
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{feed.url}</div>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-600">
                      <span>{feed.competitor_name}</span>
                      {feed.last_fetched_at && (
                        <>
                          <span>•</span>
                          <span>Last fetched: {new Date(feed.last_fetched_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingFeed(feed)}
                      className="btn-icon"
                      title="Edit"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFeed(feed.id)}
                      className="btn-icon danger"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {feeds.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <SignalIcon strength={0} className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No feeds configured yet</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
