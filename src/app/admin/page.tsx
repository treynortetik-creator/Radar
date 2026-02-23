'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  DocumentIcon,
} from '@/components/icons';
import type { DigestConfig, WeeklyDigest } from '@/lib/db';
import { CollapsibleSection } from '@/components/CollapsibleSection';

interface Feed {
  id: number;
  name: string;
  url: string;
  is_job_board: boolean;
  category: string;
  competitor_id: number;
  competitor_name: string;
  last_fetched_at: string | null;
}

interface Competitor {
  id: number;
  name: string;
}

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: { prompt: string; completion: string };
  context_length: number;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'digest'>('settings');

  // Config state
  const [model, setModel] = useState('google/gemini-2.0-flash-001');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [masterContext, setMasterContext] = useState('');

  // Feeds state
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [newFeed, setNewFeed] = useState({ name: '', url: '', is_job_board: false, competitor_id: 0 });
  const [showAddFeed, setShowAddFeed] = useState(false);

  // Last ingestion info
  const [lastIngest, setLastIngest] = useState<string | null>(null);

  // Digest state
  const [digestPeriod, setDigestPeriod] = useState<'weekly' | 'monthly' | '90day' | '180day'>('weekly');
  const [digestConfig, setDigestConfig] = useState<DigestConfig | null>(null);
  const [digestPrompt, setDigestPrompt] = useState('');
  const [digestModel, setDigestModel] = useState('google/gemini-2.0-flash-001');
  const [digestFocusAreas, setDigestFocusAreas] = useState<string[]>([]);
  const [digestDeliveryDay, setDigestDeliveryDay] = useState(0);
  const [digestDeliveryDayOfMonth, setDigestDeliveryDayOfMonth] = useState(1);
  const [digestDeliveryHour, setDigestDeliveryHour] = useState(18);
  const [digestReasoningEffort, setDigestReasoningEffort] = useState<'off' | 'low' | 'medium' | 'high'>('off');
  const [newFocusArea, setNewFocusArea] = useState('');
  const [digestSaving, setDigestSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [digestHistory, setDigestHistory] = useState<WeeklyDigest[]>([]);

  // Model selection state
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [modelSearch, setModelSearch] = useState('');
  const [digestModelSearch, setDigestModelSearch] = useState('');

  // Slack state
  const [slackStatus, setSlackStatus] = useState<{ configured: boolean; token_set: boolean; channel_set: boolean } | null>(null);
  const [slackTesting, setSlackTesting] = useState(false);

  useEffect(() => {
    loadConfig();
    loadFeeds();
    loadCompetitors();
    loadDigestConfig();
    loadDigestHistory();
    loadSlackStatus();
    loadModels();
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
      if (data.master_context) setMasterContext(data.master_context);
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

  const loadDigestConfig = async (period?: 'weekly' | 'monthly' | '90day' | '180day') => {
    const type = period || digestPeriod;
    try {
      const res = await fetch(`/api/digest/config?type=${type}`);
      const data = await res.json();
      if (data.config) {
        setDigestConfig(data.config);
        setDigestPrompt(data.config.system_prompt || '');
        setDigestModel(data.config.model || 'google/gemini-2.0-flash-001');
        setDigestFocusAreas(data.config.focus_areas || []);
        setDigestDeliveryDay(data.config.delivery_day ?? 0);
        setDigestDeliveryDayOfMonth(data.config.delivery_day_of_month ?? 1);
        setDigestDeliveryHour(data.config.delivery_hour ?? 18);
        setDigestReasoningEffort(data.config.reasoning_effort || 'off');
      } else {
        setDigestConfig(null);
        setDigestPrompt('');
        setDigestModel('google/gemini-2.0-flash-001');
        setDigestFocusAreas([]);
        setDigestDeliveryDay(0);
        setDigestDeliveryDayOfMonth(1);
        setDigestDeliveryHour(18);
        setDigestReasoningEffort('off');
      }
    } catch (err) {
      console.error('Failed to load digest config:', err);
    }
  };

  const loadDigestHistory = async (period?: 'weekly' | 'monthly' | '90day' | '180day') => {
    const type = period || digestPeriod;
    try {
      const res = await fetch(`/api/digest?limit=10&type=${type}`);
      const data = await res.json();
      setDigestHistory(data.digests || []);
    } catch (err) {
      console.error('Failed to load digest history:', err);
    }
  };

  const loadModels = async () => {
    try {
      const res = await fetch('/api/openrouter/models');
      const data = await res.json();
      setAvailableModels(data.models || []);
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const loadSlackStatus = async () => {
    try {
      const res = await fetch('/api/slack/status');
      const data = await res.json();
      setSlackStatus(data);
    } catch (err) {
      console.error('Failed to load Slack status:', err);
    }
  };

  const testSlack = async () => {
    setSlackTesting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/slack/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Slack test failed');
      setMessage({ type: 'success', text: 'Slack test message sent successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Slack test failed' });
    } finally {
      setSlackTesting(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, system_prompt: systemPrompt, master_context: masterContext }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setMessage({ type: 'success', text: 'Configuration saved successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const saveDigestConfig = async () => {
    if (!digestConfig?.id) return;
    setDigestSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/digest/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: digestConfig.id,
          system_prompt: digestPrompt,
          model: digestModel,
          focus_areas: digestFocusAreas,
          delivery_day: digestDeliveryDay,
          delivery_day_of_month: digestDeliveryDayOfMonth,
          delivery_hour: digestDeliveryHour,
          reasoning_effort: digestReasoningEffort,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setMessage({ type: 'success', text: 'Digest configuration saved successfully' });
      loadDigestConfig();
    } catch {
      setMessage({ type: 'error', text: 'Failed to save digest configuration' });
    } finally {
      setDigestSaving(false);
    }
  };

  const generatePreview = async () => {
    setPreviewing(true);
    setPreviewContent(null);
    setMessage(null);
    try {
      const res = await fetch('/api/digest/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: digestPeriod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Preview failed');
      setPreviewContent(data.content);
      setMessage({ type: 'success', text: `Preview generated (${data.event_count} events, ${data.tokens_used || '?'} tokens)` });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Preview generation failed' });
    } finally {
      setPreviewing(false);
    }
  };

  const generateAndSave = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/digest/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: digestPeriod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setMessage({ type: 'success', text: 'Digest generated and saved successfully!' });
      loadDigestHistory();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Digest generation failed' });
    } finally {
      setGenerating(false);
    }
  };

  const addFocusArea = () => {
    const area = newFocusArea.trim();
    if (area && !digestFocusAreas.includes(area)) {
      setDigestFocusAreas([...digestFocusAreas, area]);
      setNewFocusArea('');
    }
  };

  const removeFocusArea = (area: string) => {
    setDigestFocusAreas(digestFocusAreas.filter(a => a !== area));
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
    } catch {
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
    } catch {
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
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete feed' });
    }
  };

  const getNextScheduledRun = (): string => {
    const now = new Date();
    if (digestPeriod === 'weekly') {
      const daysUntil = (digestDeliveryDay - now.getUTCDay() + 7) % 7;
      const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (daysUntil === 0 && now.getUTCHours() >= digestDeliveryHour ? 7 : daysUntil), digestDeliveryHour));
      return next.toUTCString();
    } else {
      const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), digestDeliveryDayOfMonth, digestDeliveryHour));
      if (now > next) {
        next.setUTCMonth(next.getUTCMonth() + 1);
      }
      return next.toUTCString();
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
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
            <GearIcon className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Control Panel</h1>
            <p className="text-sm text-slate-500">Configure AI model, prompts, feeds, and digests</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/60 border border-slate-700/40 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <GearIcon className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => setActiveTab('digest')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              activeTab === 'digest'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <DocumentIcon className="w-4 h-4" />
            Digests
          </button>
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

      {/* =================== SETTINGS TAB =================== */}
      {activeTab === 'settings' && (
        <>
          {/* Ingestion Control */}
          <CollapsibleSection
            title="RSS Ingestion"
            subtitle="Fetch all RSS feeds, score new items with AI, and store in database"
            icon={<SignalIcon strength={4} className="w-4 h-4 text-amber-400" />}
            storageKey="settings-rss"
            defaultOpen={true}
            headerRight={
              <button
                onClick={(e) => { e.stopPropagation(); runIngestion(); }}
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
            }
          >
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
          </CollapsibleSection>

          {/* Model Selection */}
          <CollapsibleSection
            title="AI Model Selection"
            subtitle="Model used for RSS feed scoring"
            storageKey="settings-model"
            defaultOpen={false}
            headerRight={model ? (
              <code className="text-xs bg-slate-900/60 px-1.5 py-0.5 rounded text-amber-400">{model.split('/').pop()}</code>
            ) : undefined}
          >
            <div className="space-y-3">
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Search models..."
                className="input-base"
              />
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="input-base"
                size={8}
              >
                {availableModels
                  .filter(m =>
                    m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
                    m.id.toLowerCase().includes(modelSearch.toLowerCase())
                  )
                  .map(m => {
                    const promptCost = parseFloat(m.pricing?.prompt || '0') * 1_000_000;
                    const completionCost = parseFloat(m.pricing?.completion || '0') * 1_000_000;
                    const costStr = promptCost === 0 && completionCost === 0
                      ? 'Free'
                      : `$${promptCost.toFixed(2)}/$${completionCost.toFixed(2)} per M tokens`;
                    return (
                      <option key={m.id} value={m.id}>
                        {m.name} — {costStr} — {(m.context_length / 1000).toFixed(0)}k ctx
                      </option>
                    );
                  })}
              </select>
              {model && (
                <div className="text-xs text-slate-400">
                  Selected: <code className="bg-slate-900/60 px-1.5 py-0.5 rounded text-amber-400">{model}</code>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* System Prompt */}
          <CollapsibleSection
            title="System Prompt"
            subtitle={`Placeholders: {competitor}, {title}, {summary}, {date}, {is_job}`}
            storageKey="settings-prompt"
            defaultOpen={false}
            headerRight={<span className="text-xs text-slate-500 font-mono">{systemPrompt.length.toLocaleString()} chars</span>}
          >
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
          </CollapsibleSection>

          {/* Master Context */}
          <CollapsibleSection
            title="Master Context"
            subtitle="SafelyYou company context injected into all AI prompts (ingest + digest)"
            storageKey="settings-context"
            defaultOpen={false}
            headerRight={
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-slate-500 font-mono">{masterContext.length.toLocaleString()} chars</span>
                {masterContext.length > 0 ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Loaded
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Not Loaded
                  </span>
                )}
              </div>
            }
          >
            <textarea
              value={masterContext}
              onChange={(e) => setMasterContext(e.target.value)}
              rows={10}
              className="input-base font-mono text-sm resize-y min-h-[150px]"
              placeholder="Paste SafelyYou Master Context here..."
            />
          </CollapsibleSection>

          {/* Feeds Management */}
          <CollapsibleSection
            title="RSS Feeds"
            subtitle={`${feeds.length} feeds configured`}
            storageKey="settings-feeds"
            defaultOpen={true}
            headerRight={
              <button
                onClick={(e) => { e.stopPropagation(); setShowAddFeed(true); }}
                className="btn-secondary flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Add Feed
              </button>
            }
          >
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
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-lime-500/15 text-lime-300 border border-lime-500/30 rounded">
                              Jobs
                            </span>
                          )}
                          {feed.category === 'industry_news' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded">
                              Industry
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
          </CollapsibleSection>
        </>
      )}

      {/* =================== DIGEST TAB =================== */}
      {activeTab === 'digest' && (
        <>
          {/* Period Toggle */}
          <div className="flex gap-1 bg-slate-900/60 border border-slate-700/40 rounded-lg p-1 w-fit">
            {([
              { key: 'weekly', label: 'Weekly' },
              { key: 'monthly', label: 'Monthly' },
              { key: '90day', label: '90-Day' },
              { key: '180day', label: '180-Day' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setDigestPeriod(key);
                  loadDigestConfig(key);
                  loadDigestHistory(key);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                  digestPeriod === key
                    ? 'bg-slate-800 text-amber-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Context Status */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-700/30">
            <span className="text-xs text-slate-400">Master Context:</span>
            {masterContext.length > 0 ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Loaded ({(masterContext.length / 1000).toFixed(1)}k chars) — injected into digest prompt
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Not loaded — configure in Settings tab
              </span>
            )}
          </div>

          {/* Digest Prompt */}
          <CollapsibleSection
            title="Digest System Prompt"
            subtitle={`Master prompt that guides ${digestPeriod} digest generation`}
            storageKey="digest-prompt"
            defaultOpen={false}
            headerRight={<span className="text-xs text-slate-500 font-mono">{digestPrompt.length.toLocaleString()} chars</span>}
          >
            <textarea
              value={digestPrompt}
              onChange={(e) => setDigestPrompt(e.target.value)}
              rows={14}
              className="input-base font-mono text-sm resize-y min-h-[200px]"
              placeholder="Enter digest system prompt..."
            />
          </CollapsibleSection>

          {/* Focus Areas */}
          <CollapsibleSection
            title="Focus Areas"
            subtitle="Topics the digest should emphasize this period"
            storageKey="digest-focus"
            defaultOpen={true}
            headerRight={digestFocusAreas.length > 0 ? (
              <span className="text-xs text-slate-500">{digestFocusAreas.length} active</span>
            ) : undefined}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {digestFocusAreas.map(area => (
                <span
                  key={area}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400"
                >
                  {area}
                  <button
                    onClick={() => removeFocusArea(area)}
                    className="hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              ))}
              {digestFocusAreas.length === 0 && (
                <span className="text-xs text-slate-500">No focus areas set</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFocusArea}
                onChange={(e) => setNewFocusArea(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFocusArea(); } }}
                placeholder="Add focus area..."
                className="input-base flex-1"
              />
              <button
                onClick={addFocusArea}
                className="btn-secondary flex items-center gap-1"
              >
                <PlusIcon className="w-4 h-4" />
                Add
              </button>
            </div>
          </CollapsibleSection>

          {/* Schedule & Model */}
          <CollapsibleSection
            title="Schedule & Model"
            storageKey="digest-schedule"
            defaultOpen={true}
          >
            {/* Active toggle + Next run indicator */}
            <div className="flex items-center justify-between mb-6 p-3 rounded-xl bg-slate-900/40 border border-slate-700/30">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={digestConfig?.is_active ?? true}
                    onChange={(e) => {
                      if (digestConfig) {
                        const updated = { ...digestConfig, is_active: e.target.checked };
                        setDigestConfig(updated);
                        fetch('/api/digest/config', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: digestConfig.id, is_active: e.target.checked }),
                        }).then(() => {
                          setMessage({ type: 'success', text: `Schedule ${e.target.checked ? 'activated' : 'deactivated'}` });
                        });
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-slate-200">
                    {digestConfig?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </label>
                <span className={`w-2 h-2 rounded-full ${digestConfig?.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
              </div>
              <div className="text-xs text-slate-500">
                <ClockIcon className="w-3.5 h-3.5 inline mr-1" />
                Next run:{' '}
                {digestConfig?.is_active
                  ? getNextScheduledRun()
                  : 'Disabled'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <div>
                {digestPeriod === 'weekly' ? (
                  <>
                    <label className="block text-xs text-slate-400 mb-1.5">Delivery Day</label>
                    <select
                      value={digestDeliveryDay}
                      onChange={(e) => setDigestDeliveryDay(Number(e.target.value))}
                      className="input-base"
                    >
                      {DAYS_OF_WEEK.map((day, i) => (
                        <option key={i} value={i}>{day}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <label className="block text-xs text-slate-400 mb-1.5">Delivery Day of Month</label>
                    <select
                      value={digestDeliveryDayOfMonth}
                      onChange={(e) => setDigestDeliveryDayOfMonth(Number(e.target.value))}
                      className="input-base"
                    >
                      {Array.from({ length: 28 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Delivery Hour (UTC)</label>
                <select
                  value={digestDeliveryHour}
                  onChange={(e) => setDigestDeliveryHour(Number(e.target.value))}
                  className="input-base"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">AI Model</label>
                <input
                  type="text"
                  value={digestModelSearch}
                  onChange={(e) => setDigestModelSearch(e.target.value)}
                  placeholder="Search models..."
                  className="input-base mb-1"
                />
                <select
                  value={digestModel}
                  onChange={(e) => setDigestModel(e.target.value)}
                  className="input-base"
                  size={5}
                >
                  {availableModels
                    .filter(m =>
                      m.name.toLowerCase().includes(digestModelSearch.toLowerCase()) ||
                      m.id.toLowerCase().includes(digestModelSearch.toLowerCase())
                    )
                    .map(m => {
                      const promptCost = parseFloat(m.pricing?.prompt || '0') * 1_000_000;
                      const completionCost = parseFloat(m.pricing?.completion || '0') * 1_000_000;
                      const costStr = promptCost === 0 && completionCost === 0
                        ? 'Free'
                        : `$${promptCost.toFixed(2)}/$${completionCost.toFixed(2)} per M tokens`;
                      return (
                        <option key={m.id} value={m.id}>
                          {m.name} — {costStr}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Thinking Mode</label>
                <select
                  value={digestReasoningEffort}
                  onChange={(e) => setDigestReasoningEffort(e.target.value as 'off' | 'low' | 'medium' | 'high')}
                  className="input-base"
                >
                  <option value="off">Off</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Extended reasoning for supported models</p>
              </div>
            </div>

            {/* Save Config + Generate buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={saveDigestConfig}
                disabled={digestSaving}
                className="btn-primary flex items-center gap-2"
              >
                {digestSaving ? (
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
              <button
                onClick={generatePreview}
                disabled={previewing || generating}
                className="btn-secondary flex items-center gap-2"
              >
                {previewing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                    Generating Preview...
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4" />
                    Generate Preview
                  </>
                )}
              </button>
              <button
                onClick={generateAndSave}
                disabled={generating || previewing}
                className="btn-secondary flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <DocumentIcon className="w-4 h-4" />
                    Generate &amp; Save
                  </>
                )}
              </button>
            </div>
          </CollapsibleSection>

          {/* Preview Output */}
          {previewContent && (
            <section className="card-base p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">Digest Preview</h2>
                <button
                  onClick={() => setPreviewContent(null)}
                  className="btn-ghost text-xs"
                >
                  Dismiss
                </button>
              </div>
              <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 max-h-[600px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono leading-relaxed">
                  {previewContent}
                </pre>
              </div>
            </section>
          )}

          {/* Digest History */}
          <CollapsibleSection
            title="Digest History"
            subtitle={`Recent ${digestPeriod} digests`}
            storageKey="digest-history"
            defaultOpen={true}
            headerRight={
              <Link
                href="/digest"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                View All →
              </Link>
            }
          >
            <div className="space-y-2">
              {digestHistory.map(d => {
                const start = new Date(d.week_start + 'T00:00:00');
                const end = new Date(d.week_end + 'T00:00:00');
                const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
                return (
                  <Link
                    key={d.id}
                    href={`/digest/${d.id}`}
                    className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-900/40 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-150"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <DocumentIcon className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-slate-200">
                          {start.toLocaleDateString('en-US', opts)} — {end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span>{d.event_count || 0} events</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            d.status === 'delivered'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-lime-500/10 text-lime-300'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}
              {digestHistory.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <DocumentIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No digests generated yet</p>
                  <p className="text-xs mt-1">Click &quot;Generate &amp; Save&quot; to create your first digest</p>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Slack Integration */}
          <CollapsibleSection
            title="Slack Integration"
            subtitle="Status and test messaging"
            storageKey="digest-slack"
            defaultOpen={true}
          >
            <div className="space-y-4">
              {/* Status indicators */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${slackStatus?.token_set ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
                  <span className="text-xs text-slate-400">Bot Token: {slackStatus?.token_set ? 'Set' : 'Missing'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${slackStatus?.channel_set ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
                  <span className="text-xs text-slate-400">Channel ID: {slackStatus?.channel_set ? 'Set' : 'Missing'}</span>
                </div>
              </div>

              {/* Last digest Slack status */}
              {digestHistory.length > 0 && (
                <div className="text-xs text-slate-500">
                  Last digest Slack status:{' '}
                  <span className={digestHistory[0].slack_posted ? 'text-emerald-400' : 'text-red-400'}>
                    {digestHistory[0].slack_posted ? 'Posted successfully' : digestHistory[0].slack_error || 'Not posted'}
                  </span>
                </div>
              )}

              {/* Test button */}
              <button
                onClick={testSlack}
                disabled={slackTesting || !slackStatus?.configured}
                className="btn-secondary flex items-center gap-2"
              >
                {slackTesting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Test Message'
                )}
              </button>

              {!slackStatus?.configured && (
                <p className="text-xs text-slate-600">
                  Set SLACK_BOT_TOKEN and SLACK_INTEL_CHANNEL_ID environment variables to enable Slack integration.
                </p>
              )}
            </div>
          </CollapsibleSection>
        </>
      )}
    </div>
  );
}
