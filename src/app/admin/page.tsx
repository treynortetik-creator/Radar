'use client';

import { useState, useEffect } from 'react';

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
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', cost: '$0.10/M tokens' },
  { id: 'google/gemini-2.0-flash-thinking-exp-01-21:free', name: 'Gemini 2.0 Flash Thinking (Free)', cost: 'Free' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', cost: '$3/M in, $15/M out' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', cost: '$0.25/M in, $1.25/M out' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', cost: '$0.15/M in, $0.60/M out' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', cost: '$2.50/M in, $10/M out' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', cost: '$0.52/M tokens' },
];

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
      setMessage({ type: 'success', text: 'Configuration saved!' });
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
      setMessage({ type: 'success', text: 'Feed updated!' });
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
      setMessage({ type: 'success', text: 'Feed added!' });
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
      setMessage({ type: 'success', text: 'Feed deleted!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete feed' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Loading admin panel...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Admin Panel</h1>
        <p className="text-sm text-slate-500 mt-1">Configure AI model, system prompt, and manage RSS feeds</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Ingestion Control */}
      <section className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">RSS Ingestion</h2>
            <p className="text-xs text-slate-500 mt-1">
              {lastIngest
                ? `Last run: ${new Date(lastIngest).toLocaleString()}`
                : 'Never run'}
            </p>
          </div>
          <button
            onClick={runIngestion}
            disabled={ingesting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
          >
            {ingesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <span>▶</span>
                Run Ingestion Now
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Fetches all RSS feeds, scores new items with AI, and stores in database.
          Set up a cron job to call <code className="bg-slate-900 px-1.5 py-0.5 rounded">POST /api/ingest</code> for automated runs.
        </p>
      </section>

      {/* Model Selection */}
      <section className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">AI Model</h2>
        <div className="space-y-3">
          {OPENROUTER_MODELS.map(m => (
            <label
              key={m.id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                model === m.id
                  ? 'bg-blue-600/10 border border-blue-500/30'
                  : 'bg-slate-900/40 border border-slate-700/30 hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                name="model"
                value={m.id}
                checked={model === m.id}
                onChange={(e) => setModel(e.target.value)}
                className="w-4 h-4 text-blue-500 border-slate-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-200">{m.name}</div>
                <div className="text-xs text-slate-500">{m.id}</div>
              </div>
              <div className="text-xs text-slate-400 font-mono">{m.cost}</div>
            </label>
          ))}
        </div>
      </section>

      {/* System Prompt */}
      <section className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">System Prompt</h2>
            <p className="text-xs text-slate-500 mt-1">
              The prompt sent to the AI for scoring competitor events. Uses placeholders: {'{competitor}'}, {'{title}'}, {'{summary}'}, {'{date}'}, {'{is_job}'}
            </p>
          </div>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={20}
          className="w-full bg-slate-900/60 border border-slate-700/40 rounded-lg p-4 text-sm text-slate-300 font-mono resize-y focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500/30"
          placeholder="Enter system prompt..."
        />
        <div className="flex justify-between items-center mt-4">
          <span className="text-xs text-slate-500">{systemPrompt.length.toLocaleString()} characters</span>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </section>

      {/* Feeds Management */}
      <section className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">RSS Feeds</h2>
            <p className="text-xs text-slate-500 mt-1">{feeds.length} feeds configured</p>
          </div>
          <button
            onClick={() => setShowAddFeed(true)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium text-slate-200 transition-colors"
          >
            + Add Feed
          </button>
        </div>

        {/* Add Feed Form */}
        {showAddFeed && (
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Add New Feed</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Feed Name"
                value={newFeed.name}
                onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500"
              />
              <select
                value={newFeed.competitor_id}
                onChange={(e) => setNewFeed({ ...newFeed, competitor_id: Number(e.target.value) })}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200"
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
                className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500 col-span-2"
              />
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={newFeed.is_job_board}
                  onChange={(e) => setNewFeed({ ...newFeed, is_job_board: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600"
                />
                Job Board Feed
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAddFeed(false)}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={addFeed}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium text-white"
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
              className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-3"
            >
              {editingFeed?.id === feed.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editingFeed.name}
                      onChange={(e) => setEditingFeed({ ...editingFeed, name: e.target.value })}
                      className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200"
                    />
                    <select
                      value={editingFeed.competitor_id}
                      onChange={(e) => setEditingFeed({ ...editingFeed, competitor_id: Number(e.target.value) })}
                      className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200"
                    >
                      {competitors.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      type="url"
                      value={editingFeed.url}
                      onChange={(e) => setEditingFeed({ ...editingFeed, url: e.target.value })}
                      className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 col-span-2"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-400">
                      <input
                        type="checkbox"
                        checked={editingFeed.is_job_board}
                        onChange={(e) => setEditingFeed({ ...editingFeed, is_job_board: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600"
                      />
                      Job Board Feed
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingFeed(null)}
                      className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveFeed(editingFeed)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">{feed.name}</span>
                      {feed.is_job_board && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 rounded">Jobs</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{feed.url}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      {feed.competitor_name}
                      {feed.last_fetched_at && ` • Last fetched: ${new Date(feed.last_fetched_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => setEditingFeed(feed)}
                      className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteFeed(feed.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
