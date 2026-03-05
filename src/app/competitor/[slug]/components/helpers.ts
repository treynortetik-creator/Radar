import { TABS, type TabId } from './constants';

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function getTabFromHash(): TabId {
  if (typeof window === 'undefined') return 'overview';
  const hash = window.location.hash.replace('#', '');
  if (TABS.some((t) => t.id === hash)) return hash as TabId;
  return 'overview';
}
