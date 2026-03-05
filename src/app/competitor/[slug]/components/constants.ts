import {
  TargetIcon,
  UsersIcon,
  BoxIcon,
  SwordIcon,
  ClockIcon,
  ShieldIcon,
} from '@/components/icons';

export const COMPETITOR_COLORS_MAP: Record<string, { primary: string; secondary: string }> = {
  inspiren: { primary: '#CC4125', secondary: '#ff5a3c' },
  sage: { primary: '#B4A7D6', secondary: '#c9bfe6' },
  virtusense: { primary: '#9900FF', secondary: '#b84dff' },
  amba: { primary: '#FF9900', secondary: '#ffb333' },
  nobi: { primary: '#B7E1CD', secondary: '#d0eedf' },
  carepredict: { primary: '#F9CB9C', secondary: '#fce0bf' },
};

export const COMPETITOR_NAMES: Record<string, string> = {
  inspiren: 'Inspiren',
  sage: 'Sage',
  virtusense: 'VirtuSense',
  amba: 'Amba',
  nobi: 'Nobi',
  carepredict: 'CarePredict',
};

export const TABS = [
  { id: 'overview', label: 'Overview', icon: TargetIcon },
  { id: 'executives', label: 'Executives', icon: UsersIcon },
  { id: 'products', label: 'Products', icon: BoxIcon },
  { id: 'battle-card', label: 'Battle Card', icon: SwordIcon },
  { id: 'activity', label: 'Activity', icon: ClockIcon },
  { id: 'trends', label: 'Trends', icon: ShieldIcon },
] as const;

export type TabId = (typeof TABS)[number]['id'];
