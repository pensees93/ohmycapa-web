// Shared status color palette, RAT metadata, and Precision Instrument surface tokens.
import type { RatType } from '@ohmycapa/capa-core';

export const STATUS_COLOR = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  indigo: '#6366f1',
  auto: '#8b5cf6',
} as const;

export const DEVICE_COLOR = {
  deviceA: '#2196F3',
  deviceB: '#14B8A6',
} as const;

export const MONO_FONT_FAMILY =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export interface RatTabMeta {
  value: RatType;
  label: string;
  shortLabel: string;
  accentColor: string;
}

export const RAT_TABS: readonly RatTabMeta[] = [
  { value: 'nr', label: 'NR (5G)', shortLabel: 'NR', accentColor: '#14B8A6' },
  { value: 'eutra', label: 'EUTRA (LTE)', shortLabel: 'LTE', accentColor: '#2196F3' },
  { value: 'eutra-nr', label: 'EUTRA-NR (MRDC)', shortLabel: 'MRDC', accentColor: '#6366F1' },
  { value: 'utra', label: 'UTRA (3G)', shortLabel: 'UTRA', accentColor: '#F59E0B' },
] as const;

export const RAT_META_MAP: Record<RatType, RatTabMeta> = {
  nr: RAT_TABS[0],
  eutra: RAT_TABS[1],
  'eutra-nr': RAT_TABS[2],
  utra: RAT_TABS[3],
};

export interface WorkbenchSurfaceTokens {
  panelBg: string;
  toolbarBg: string;
  elevatedBg: string;
  subtleBg: string;
  headerBg: string;
  border: string;
  borderStrong: string;
  laneABg: string;
  laneBBg: string;
  laneABorder: string;
  laneBBorder: string;
}

/**
 * Returns crisp Precision Instrument surface and border tokens for light/dark themes.
 */
export function getWorkbenchSurface(isDark: boolean): WorkbenchSurfaceTokens {
  return {
    panelBg: isDark ? '#141922' : '#ffffff',
    toolbarBg: isDark ? 'rgba(20, 25, 34, 0.96)' : 'rgba(255, 255, 255, 0.96)',
    elevatedBg: isDark ? '#1a212e' : '#f8fafc',
    subtleBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.025)',
    headerBg: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.035)',
    border: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(15, 23, 42, 0.10)',
    borderStrong: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(15, 23, 42, 0.18)',
    laneABg: isDark ? 'rgba(33, 150, 243, 0.09)' : 'rgba(33, 150, 243, 0.06)',
    laneBBg: isDark ? 'rgba(20, 184, 166, 0.09)' : 'rgba(20, 184, 166, 0.06)',
    laneABorder: 'rgba(33, 150, 243, 0.36)',
    laneBBorder: 'rgba(20, 184, 166, 0.36)',
  };
}

// ─── Combo-level status ───────────────────────────────────────────────────────

export const COMBO_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  'exact-same': { label: 'Exact ✓', color: STATUS_COLOR.green, bg: 'rgba(16,185,129,0.10)' },
  'exact-changed': { label: 'Param Δ', color: STATUS_COLOR.amber, bg: 'rgba(245,158,11,0.12)' },
  'a-only-covered': { label: 'Cov by B ↑', color: STATUS_COLOR.indigo, bg: 'rgba(99,102,241,0.12)' },
  'a-only-unique': { label: 'A Only ⚠', color: DEVICE_COLOR.deviceA, bg: 'rgba(33,150,243,0.12)' },
  'b-only-covered': { label: 'Cov by A ↑', color: STATUS_COLOR.indigo, bg: 'rgba(99,102,241,0.12)' },
  'b-only-unique': { label: 'B Only ⚠', color: DEVICE_COLOR.deviceB, bg: 'rgba(20,184,166,0.12)' },
};

// ─── Band-level status ────────────────────────────────────────────────────────

export const BAND_STATUS_ROW_BG: Record<string, string> = {
  same: 'transparent',
  changed: 'rgba(245,158,11,0.06)',
  'a-only': 'rgba(33,150,243,0.07)',
  'b-only': 'rgba(20,184,166,0.07)',
};

export const BAND_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  same: { label: '✓', color: STATUS_COLOR.green },
  changed: { label: 'Δ', color: STATUS_COLOR.amber },
  'a-only': { label: 'A', color: DEVICE_COLOR.deviceA },
  'b-only': { label: 'B', color: DEVICE_COLOR.deviceB },
};
