import { Box, Tooltip } from '@mui/material';
import type { PropertyDiff } from '@ohmycapa/capa-core';

interface SplitCellProps<V> {
  diff: PropertyDiff<V> | undefined;
  format?: (v: V) => string;
  /** String to display when value is missing */
  emptyLabel?: string;
}

const STATUS_COLORS = {
  same: { bg: 'transparent', text: 'text.primary' },
  changed: { bg: 'rgba(245,158,11,0.12)', text: '#d97706' },
  'a-only': { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' },
  'b-only': { bg: 'rgba(16,185,129,0.1)', text: '#059669' },
};

export function SplitCell<V>({ diff, format, emptyLabel = '--' }: SplitCellProps<V>) {
  if (!diff) {
    return (
      <Box sx={{ fontSize: '0.78rem', color: 'text.disabled', textAlign: 'center' }}>
        {emptyLabel}
      </Box>
    );
  }

  const fmt = (v: V | undefined): string => {
    if (v === undefined || v === null) return emptyLabel;
    if (format) return format(v);
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
  };

  const { status, a, b } = diff;
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.same;

  if (status === 'same') {
    return (
      <Box sx={{ fontSize: '0.78rem', color: 'text.secondary', textAlign: 'center' }}>
        {fmt(a)}
      </Box>
    );
  }

  if (status === 'a-only') {
    return (
      <Box sx={{ bgcolor: colors.bg, borderRadius: 1, px: 0.5, textAlign: 'center' }}>
        <Box sx={{ fontSize: '0.78rem', color: colors.text, fontWeight: 600 }}>{fmt(a)}</Box>
        <Box sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>{emptyLabel}</Box>
      </Box>
    );
  }

  if (status === 'b-only') {
    return (
      <Box sx={{ bgcolor: colors.bg, borderRadius: 1, px: 0.5, textAlign: 'center' }}>
        <Box sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>{emptyLabel}</Box>
        <Box sx={{ fontSize: '0.78rem', color: colors.text, fontWeight: 600 }}>{fmt(b)}</Box>
      </Box>
    );
  }

  // changed
  return (
    <Box sx={{ bgcolor: colors.bg, borderRadius: 1, px: 0.5, textAlign: 'center' }}>
      <Tooltip title={`A: ${fmt(a)}`} placement="top">
        <Box sx={{ fontSize: '0.78rem', color: colors.text, fontWeight: 600 }}>{fmt(a)}</Box>
      </Tooltip>
      <Box sx={{ fontSize: '0.65rem', color: 'text.disabled', lineHeight: 1 }}>↕</Box>
      <Tooltip title={`B: ${fmt(b)}`} placement="bottom">
        <Box sx={{ fontSize: '0.78rem', color: colors.text, fontWeight: 600 }}>{fmt(b)}</Box>
      </Tooltip>
    </Box>
  );
}
