import { useEffect, useState } from 'react';
import { CheckIcon, CopyIcon, EditIcon, SwordIcon } from '@/components/icons';
import type { ProfileData } from './types';

export function BattleCardTab({
  profile,
  onRefresh,
}: {
  profile: ProfileData;
  onRefresh: () => void;
}) {
  const bc = profile.battle_card;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    when_they_come_up: bc?.when_they_come_up || '',
    their_pitch: bc?.their_pitch || '',
    our_counter: bc?.our_counter || '',
    landmines: bc?.landmines || '',
    proof_points: bc?.proof_points?.join('\n') || '',
    objection_handling: bc?.objection_handling
      ? JSON.stringify(bc.objection_handling, null, 2)
      : '[{"objection": "", "response": ""}]',
  });

  useEffect(() => {
    if (bc) {
      setForm({
        when_they_come_up: bc.when_they_come_up || '',
        their_pitch: bc.their_pitch || '',
        our_counter: bc.our_counter || '',
        landmines: bc.landmines || '',
        proof_points: bc.proof_points?.join('\n') || '',
        objection_handling: bc.objection_handling
          ? JSON.stringify(bc.objection_handling, null, 2)
          : '[{"objection": "", "response": ""}]',
      });
    }
  }, [bc]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let objection_handling = null;
      try {
        objection_handling = JSON.parse(form.objection_handling);
      } catch {
        // keep null
      }

      await fetch(`/api/competitors/${profile.id}/battle-card`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          when_they_come_up: form.when_they_come_up || null,
          their_pitch: form.their_pitch || null,
          our_counter: form.our_counter || null,
          landmines: form.landmines || null,
          proof_points: form.proof_points ? form.proof_points.split('\n').filter(Boolean) : null,
          objection_handling,
          last_reviewed_at: new Date().toISOString(),
        }),
      });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    {
      key: 'when_they_come_up',
      label: 'When They Come Up',
      content: bc?.when_they_come_up,
      color: 'amber',
    },
    { key: 'their_pitch', label: 'Their Pitch', content: bc?.their_pitch, color: 'blue' },
    { key: 'our_counter', label: 'Our Counter', content: bc?.our_counter, color: 'emerald' },
    { key: 'landmines', label: 'Landmines', content: bc?.landmines, color: 'red' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Battle Card</h2>
        <div className="flex items-center gap-2">
          {bc?.last_reviewed_at && (
            <span className="text-[10px] text-slate-500">
              Last reviewed: {new Date(bc.last_reviewed_at).toLocaleDateString()}
            </span>
          )}
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-primary text-xs flex items-center gap-1.5">
              <EditIcon className="w-3.5 h-3.5" /> {bc ? 'Edit' : 'Create'} Battle Card
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-ghost text-xs">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-4">
          {sections.map((s) => (
            <div key={s.key} className="card-base p-4">
              <label className="text-xs font-semibold text-slate-300 mb-2 block">{s.label}</label>
              <textarea
                className="input-base"
                rows={3}
                value={form[s.key]}
                onChange={(e) => setForm((f) => ({ ...f, [s.key]: e.target.value }))}
                placeholder={`Enter ${s.label.toLowerCase()}...`}
              />
            </div>
          ))}
          <div className="card-base p-4">
            <label className="text-xs font-semibold text-slate-300 mb-2 block">
              Proof Points (one per line)
            </label>
            <textarea
              className="input-base"
              rows={4}
              value={form.proof_points}
              onChange={(e) => setForm((f) => ({ ...f, proof_points: e.target.value }))}
              placeholder="Enter proof points, one per line"
            />
          </div>
          <div className="card-base p-4">
            <label className="text-xs font-semibold text-slate-300 mb-2 block">
              Objection Handling (JSON)
            </label>
            <textarea
              className="input-base font-mono text-xs"
              rows={6}
              value={form.objection_handling}
              onChange={(e) => setForm((f) => ({ ...f, objection_handling: e.target.value }))}
              placeholder='[{"objection": "Too expensive", "response": "4-month payback..."}]'
            />
          </div>
        </div>
      ) : bc ? (
        <div className="space-y-4">
          {sections.map(
            (s) => s.content && <BattleCardSection key={s.key} label={s.label} content={s.content} color={s.color} />,
          )}

          {bc.proof_points && bc.proof_points.length > 0 && (
            <div className="card-base p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Proof Points
                </h3>
                <CopyButton text={bc.proof_points.join('\n')} />
              </div>
              <ul className="space-y-2">
                {bc.proof_points.map((pp, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5 shrink-0">&#x2713;</span>
                    {pp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bc.objection_handling &&
            Array.isArray(bc.objection_handling) &&
            bc.objection_handling.length > 0 && (
              <div className="card-base p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Objection Handling
                  </h3>
                  <CopyButton
                    text={bc.objection_handling
                      .map((o) => `Objection: ${o.objection}\nResponse: ${o.response}`)
                      .join('\n\n')}
                  />
                </div>
                <div className="space-y-3">
                  {bc.objection_handling.map((oh, i) => (
                    <div key={i} className="bg-slate-900/40 rounded-lg p-3">
                      <div className="text-xs text-red-400 font-medium mb-1">&ldquo;{oh.objection}&rdquo;</div>
                      <div className="text-sm text-slate-300 leading-relaxed">{oh.response}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      ) : (
        <div className="card-base p-8 text-center">
          <SwordIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No battle card created yet</p>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-amber-400 hover:text-amber-300 mt-2 font-medium"
          >
            Create battle card
          </button>
        </div>
      )}
    </div>
  );
}

function BattleCardSection({
  label,
  content,
  color,
}: {
  label: string;
  content: string;
  color: string;
}) {
  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    amber: { border: 'border-l-amber-500', bg: 'bg-amber-500/5', text: 'text-amber-400' },
    blue: { border: 'border-l-lime-500', bg: 'bg-lime-500/5', text: 'text-lime-300' },
    emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-500/5', text: 'text-emerald-400' },
    red: { border: 'border-l-red-500', bg: 'bg-red-500/5', text: 'text-red-400' },
  };
  const c = colorMap[color] || colorMap.amber;

  return (
    <div
      className={`card-base p-5 ${c.bg}`}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor:
          color === 'amber'
            ? '#d3ba56'
            : color === 'blue'
              ? '#9fca79'
              : color === 'emerald'
                ? '#86a954'
                : '#ff5a4f',
        borderLeftStyle: 'solid',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>{label}</h3>
        <CopyButton text={`${label}:\n${content}`} />
      </div>
      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="btn-icon w-7 h-7" title="Copy to clipboard">
      {copied ? (
        <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <CopyIcon className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
