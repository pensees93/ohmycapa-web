import { Box, Tooltip } from '@mui/material';
import type { PropertyDiff } from '@ohmycapa/capa-core';
import { DEVICE_COLOR, MONO_FONT_FAMILY, STATUS_COLOR } from '../constants/statusMeta';

interface SplitCellProps<V> {
  diff: PropertyDiff<V> | undefined;
  format?: (v: V) => string;
  /** String to display when value is missing */
  emptyLabel?: string;
}

const STATUS_STYLE = {
  same: { bg: 'transparent', text: 'text.secondary' },
  changed: { bg: 'rgba(245,158,11,0.10)', text: STATUS_COLOR.amber },
  'a-only': { bg: 'rgba(33,150,243,0.10)', text: DEVICE_COLOR.deviceA },
  'b-only': { bg: 'rgba(20,184,166,0.10)', text: DEVICE_COLOR.deviceB },
} as const;

export function SplitCell<V>({ diff, format, emptyLabel = '--' }: SplitCellProps<V>) {
  if (!diff) {
    return (
      <Box sx={{ fontSize: '0.75rem', fontFamily: MONO_FONT_FAMILY, color: 'text.disabled', textAlign: 'center' }}>
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
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.same;

  if (status === 'same') {
    return (
      <Box
        sx={{
          fontSize: '0.75rem',
          fontFamily: MONO_FONT_FAMILY,
          fontVariantNumeric: 'tabular-nums',
          color: 'text.secondary',
          textAlign: 'center',
        }}
      >
        {fmt(a)}
      </Box>
    );
  }

  if (status === 'a-only') {
    return (
      <Box
        sx={{
          bgcolor: style.bg,
          border: `1px solid ${DEVICE_COLOR.deviceA}33`,
          borderRadius: 1,
          px: 0.6,
          py: 0.2,
          textAlign: 'center',
          fontFamily: MONO_FONT_FAMILY,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4 }}>
          <Box component="span" sx={{ fontSize: '0.56rem', fontWeight: 800, color: DEVICE_COLOR.deviceA }}>A</Box>
          <Box component="span" sx={{ fontSize: '0.74rem', color: DEVICE_COLOR.deviceA, fontWeight: 700 }}>{fmt(a)}</Box>
        </Box>
        <Box sx={{ fontSize: '0.68rem', color: 'text.disabled', lineHeight: 1.1 }}>{emptyLabel}</Box>
      </Box>
    );
  }

  if (status === 'b-only') {
    return (
      <Box
        sx={{
          bgcolor: style.bg,
          border: `1px solid ${DEVICE_COLOR.deviceB}33`,
          borderRadius: 1,
          px: 0.6,
          py: 0.2,
          textAlign: 'center',
          fontFamily: MONO_FONT_FAMILY,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <Box sx={{ fontSize: '0.68rem', color: 'text.disabled', lineHeight: 1.1 }}>{emptyLabel}</Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4 }}>
          <Box component="span" sx={{ fontSize: '0.56rem', fontWeight: 800, color: DEVICE_COLOR.deviceB }}>B</Box>
          <Box component="span" sx={{ fontSize: '0.74rem', color: DEVICE_COLOR.deviceB, fontWeight: 700 }}>{fmt(b)}</Box>
        </Box>
      </Box>
    );
  }

  // changed
  return (
    <Box
      sx={{
        bgcolor: style.bg,
        border: `1px solid ${STATUS_COLOR.amber}44`,
        borderRadius: 1,
        px: 0.6,
        py: 0.2,
        textAlign: 'center',
        fontFamily: MONO_FONT_FAMILY,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <Tooltip title={`A: ${fmt(a)}`} placement="top" arrow>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4 }}>
          <Box component="span" sx={{ fontSize: '0.56rem', fontWeight: 800, color: DEVICE_COLOR.deviceA }}>A</Box>
          <Box component="span" sx={{ fontSize: '0.74rem', color: STATUS_COLOR.amber, fontWeight: 700 }}>{fmt(a)}</Box>
        </Box>
      </Tooltip>
      <Box sx={{ height: '1px', bgcolor: 'divider', my: 0.2 }} />
      <Tooltip title={`B: ${fmt(b)}`} placement="bottom" arrow>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4 }}>
          <Box component="span" sx={{ fontSize: '0.56rem', fontWeight: 800, color: DEVICE_COLOR.deviceB }}>B</Box>
          <Box component="span" sx={{ fontSize: '0.74rem', color: STATUS_COLOR.amber, fontWeight: 700 }}>{fmt(b)}</Box>
        </Box>
      </Tooltip>
    </Box>
  );
}
