// Shared status color palette and metadata for combo/band compare views.

export const STATUS_COLOR = {
  green:   '#10b981',
  amber:   '#f59e0b',
  red:     '#ef4444',
  indigo:  '#6366f1',
} as const;

export const DEVICE_COLOR = {
  deviceA: '#2196F3',
  deviceB: '#4DB6AC',
} as const;

// ─── Combo-level status ───────────────────────────────────────────────────────

export const COMBO_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  'exact-same':     { label: 'Exact ✓',   color: STATUS_COLOR.green,  bg: 'rgba(16,185,129,0.1)'  },
  'exact-changed':  { label: 'Exact Diff ⚠',    color: STATUS_COLOR.amber,  bg: 'rgba(245,158,11,0.1)'  },
  'a-only-covered': { label: 'Covered ✓', color: STATUS_COLOR.indigo, bg: 'rgba(99,102,241,0.1)'  },
  'a-only-unique':  { label: 'A Only ⚠',  color: STATUS_COLOR.red,    bg: 'rgba(239,68,68,0.1)'   },
  'b-only-covered': { label: 'Covered ✓', color: STATUS_COLOR.indigo, bg: 'rgba(99,102,241,0.1)'  },
  'b-only-unique':  { label: 'B Only ⚠',  color: STATUS_COLOR.red,    bg: 'rgba(239,68,68,0.1)'   },
};

// ─── Band-level status ────────────────────────────────────────────────────────

export const BAND_STATUS_ROW_BG: Record<string, string> = {
  same:     'transparent',
  changed:  'rgba(245,158,11,0.06)',
  'a-only': 'rgba(239,68,68,0.06)',
  'b-only': 'rgba(99,102,241,0.06)',
};

export const BAND_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  same:     { label: '✓', color: STATUS_COLOR.green  },
  changed:  { label: '⚠', color: STATUS_COLOR.amber  },
  'a-only': { label: 'A', color: STATUS_COLOR.red    },
  'b-only': { label: 'B', color: STATUS_COLOR.indigo },
};
