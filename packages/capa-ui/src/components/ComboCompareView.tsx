import React, { useState, useMemo, useCallback, useDeferredValue, useEffect } from 'react';
import {
  Box, Typography, Chip, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton, Tooltip, Button, IconButton, useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { getBwClassCcCount, generateCombinationKey } from '@ohmycapa/capa-core';
import type { ComboDiff, CoverageAnalysis, ComboDisplayOptions, RatType } from '@ohmycapa/capa-core';
import { renderComboKey, renderComboKeyDiff, extractSupersetDeltaLabels, ComboSymbolLegend } from './comboKeyRenderer';
import {
  COMBO_STATUS_META,
  DEVICE_COLOR,
  MONO_FONT_FAMILY,
  STATUS_COLOR,
  getWorkbenchSurface,
} from '../constants/statusMeta';
import { BandFilterChips } from './BandFilterChips';
import { CopyActionButton, shortenDeviceName } from './featureRenderHelpers';
import type { ComboFilterKey } from '../utils/compareMetrics';

const STATUS_META = COMBO_STATUS_META;

const VARIANT_B: Record<string, 'solid' | 'placeholder' | 'covered'> = {
  'a-only-covered': 'covered',
  'a-only-unique': 'placeholder',
};
function getVariantA(status: string): 'solid' | 'placeholder' | 'covered' {
  if (status === 'b-only-covered') return 'covered';
  if (status === 'b-only-unique') return 'placeholder';
  return 'solid';
}
function getVariantB(status: string): 'solid' | 'placeholder' | 'covered' {
  return VARIANT_B[status] ?? 'solid';
}

const STATUS_SEVERITY_RANK: Record<string, number> = {
  'a-only-unique': 0,
  'b-only-unique': 1,
  'exact-changed': 2,
  'a-only-covered': 3,
  'b-only-covered': 4,
  'exact-same': 5,
};

const STATUS_GROUP_ORDER: { status: ComboDiff['status']; title: string }[] = [
  { status: 'a-only-unique', title: 'A Only — Unique (Not Covered)' },
  { status: 'b-only-unique', title: 'B Only — Unique (Not Covered)' },
  { status: 'exact-changed', title: 'Exact Match — Parameter Diff' },
  { status: 'a-only-covered', title: 'A Only — Covered by B Superset' },
  { status: 'b-only-covered', title: 'B Only — Covered by A Superset' },
  { status: 'exact-same', title: 'Exact Match — Identical' },
];

// ─── ComboSideCard ────────────────────────────────────────────────────────────

interface ComboSideCardProps {
  combo?: { key: string; powerClass?: string } | null;
  variant: 'solid' | 'placeholder' | 'covered';
  statusColor: string;
  coveringSupersets?: string[];
  baseKey?: string;
  referenceKey?: string;
  diffMode?: 'superset' | 'changed';
  displayOptions?: ComboDisplayOptions;
}

const ComboSideCard = React.memo(function ComboSideCard({
  combo, variant, statusColor, coveringSupersets, baseKey, referenceKey, diffMode, displayOptions,
}: ComboSideCardProps) {
  const isDark = useTheme().palette.mode === 'dark';

  if (variant === 'placeholder') {
    return (
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1.25,
          px: 1,
          py: 0.45,
          minHeight: 28,
          display: 'flex',
          alignItems: 'center',
          opacity: 0.45,
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem', fontStyle: 'italic' }}>
          — not supported
        </Typography>
      </Box>
    );
  }

  if (variant === 'covered') {
    const superset = coveringSupersets?.[0];
    return (
      <Box
        sx={{
          border: '1px dashed',
          borderColor: `${STATUS_COLOR.indigo}66`,
          borderRadius: 1.25,
          px: 1,
          py: 0.45,
          minHeight: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          bgcolor: 'rgba(99,102,241,0.06)',
        }}
      >
        <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: STATUS_COLOR.indigo, flexShrink: 0 }}>
          ↑
        </Typography>
        <Typography variant="caption" component="div" sx={{ fontSize: '0.74rem', color: 'text.primary', lineHeight: 1.3, overflow: 'hidden', minWidth: 0, flex: 1 }}>
          {superset ? renderComboKeyDiff(superset, baseKey, 'superset', displayOptions, isDark) : 'covered'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: `${statusColor}44`,
        borderRadius: 1.25,
        px: 1,
        py: 0.45,
        minHeight: 28,
        display: 'flex',
        alignItems: 'center',
        bgcolor: isDark ? `${statusColor}12` : `${statusColor}09`,
      }}
    >
      <Typography variant="caption" component="div" sx={{ fontSize: '0.76rem', color: 'text.primary', lineHeight: 1.3, overflow: 'hidden', minWidth: 0, flex: 1 }}>
        {combo
          ? (diffMode === 'changed' && referenceKey
            ? renderComboKeyDiff(combo, referenceKey, 'changed', displayOptions, isDark)
            : renderComboKey(combo, displayOptions, isDark))
          : '─'}
      </Typography>
    </Box>
  );
});

// ─── DeltaSummaryBar ──────────────────────────────────────────────────────────

const BAND_PARAM_NOTE_RE = /^[Bn]\d+\s+(?:classDL|classUL|DL-MIMO|UL-MIMO|DL-QAM|UL-QAM):/;

function buildDeltaBadges(diff: ComboDiff): { labels: string[]; color: string; bg: string } {
  if (diff.status === 'exact-changed') {
    const labels: string[] = [];
    if (diff.bandParamDiffs) {
      for (const bd of diff.bandParamDiffs) {
        if (bd.bandwidthClassDL && bd.bandwidthClassDL.status !== 'same')
          labels.push(`${bd.displayName} BW DL: ${bd.bandwidthClassDL.a ?? '—'}→${bd.bandwidthClassDL.b ?? '—'}`);
        if (bd.bandwidthClassUL && bd.bandwidthClassUL.status !== 'same')
          labels.push(`${bd.displayName} BW UL: ${bd.bandwidthClassUL.a ?? '—'}→${bd.bandwidthClassUL.b ?? '—'}`);
        if (bd.dlMimo && bd.dlMimo.status !== 'same')
          labels.push(`${bd.displayName} DL MIMO: ${bd.dlMimo.a ?? '—'}→${bd.dlMimo.b ?? '—'}`);
        if (bd.ulMimo && bd.ulMimo.status !== 'same')
          labels.push(`${bd.displayName} UL MIMO: ${bd.ulMimo.a ?? '—'}→${bd.ulMimo.b ?? '—'}`);
        if (bd.dlQam && bd.dlQam.status !== 'same')
          labels.push(`${bd.displayName} DL QAM: ${bd.dlQam.a ?? '—'}→${bd.dlQam.b ?? '—'}`);
        if (bd.ulQam && bd.ulQam.status !== 'same')
          labels.push(`${bd.displayName} UL QAM: ${bd.ulQam.a ?? '—'}→${bd.ulQam.b ?? '—'}`);
      }
    }
    if (diff.paramNotes) {
      for (const note of diff.paramNotes) {
        if (!BAND_PARAM_NOTE_RE.test(note) && !labels.includes(note)) {
          labels.push(note);
        }
      }
    }
    return { labels, color: STATUS_COLOR.amber, bg: 'rgba(245,158,11,0.12)' };
  }

  if (diff.status === 'a-only-covered' || diff.status === 'b-only-covered') {
    const superset = diff.coveringSupersets?.[0];
    const labels = superset ? extractSupersetDeltaLabels(superset, diff.key) : [];
    if (labels.length === 0 && diff.paramNotes) {
      for (const note of diff.paramNotes) {
        if (!labels.includes(note)) labels.push(note);
      }
    } else if (diff.paramNotes) {
      for (const note of diff.paramNotes) {
        if (note.startsWith('UL ') && !labels.some(l => l.includes('+UL'))) {
          labels.push(note);
        }
      }
    }
    return { labels, color: STATUS_COLOR.indigo, bg: 'rgba(99,102,241,0.12)' };
  }

  return { labels: [], color: STATUS_COLOR.amber, bg: 'rgba(245,158,11,0.1)' };
}

function DeltaSummaryBar({ diff }: { diff: ComboDiff }) {
  const { labels, color, bg } = buildDeltaBadges(diff);
  if (labels.length === 0) return null;

  return (
    <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, px: 0.5, pb: 0.25 }}>
      <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'text.disabled', mr: 0.25 }}>
        Δ
      </Typography>
      {labels.map((label, idx) => (
        <Chip
          key={`${label}-${idx}`}
          size="small"
          label={label}
          sx={{ height: 15, fontSize: '0.6rem', fontWeight: 600, color, bgcolor: bg }}
        />
      ))}
    </Box>
  );
}

function buildExactChangedTooltip(diff: ComboDiff): string {
  const lines: string[] = [];

  if (diff.bandParamDiffs) {
    for (const bd of diff.bandParamDiffs) {
      if (bd.bandwidthClassDL && bd.bandwidthClassDL.status !== 'same')
        lines.push(`${bd.displayName} bwClassDL: ${bd.bandwidthClassDL.a ?? '—'} → ${bd.bandwidthClassDL.b ?? '—'}`);
      if (bd.bandwidthClassUL && bd.bandwidthClassUL.status !== 'same')
        lines.push(`${bd.displayName} bwClassUL: ${bd.bandwidthClassUL.a ?? '—'} → ${bd.bandwidthClassUL.b ?? '—'}`);
      if (bd.dlMimo && bd.dlMimo.status !== 'same')
        lines.push(`${bd.displayName} DL MIMO: ${bd.dlMimo.a ?? '—'} → ${bd.dlMimo.b ?? '—'}`);
      if (bd.ulMimo && bd.ulMimo.status !== 'same')
        lines.push(`${bd.displayName} UL MIMO: ${bd.ulMimo.a ?? '—'} → ${bd.ulMimo.b ?? '—'}`);
      if (bd.dlQam && bd.dlQam.status !== 'same')
        lines.push(`${bd.displayName} DL QAM: ${bd.dlQam.a ?? '—'} → ${bd.dlQam.b ?? '—'}`);
      if (bd.ulQam && bd.ulQam.status !== 'same')
        lines.push(`${bd.displayName} UL QAM: ${bd.ulQam.a ?? '—'} → ${bd.ulQam.b ?? '—'}`);
    }
  }

  if (diff.paramNotes) {
    for (const note of diff.paramNotes) {
      if (!BAND_PARAM_NOTE_RE.test(note) && !lines.includes(note)) {
        lines.push(note);
      }
    }
  }

  return lines.length > 0 ? lines.join('\n') : 'Parameters differ';
}

// ─── ComboRow ─────────────────────────────────────────────────────────────────

const ComboRow = React.memo(function ComboRow({
  diff,
  displayOptions,
  deviceAName,
  deviceBName,
}: {
  diff: ComboDiff;
  displayOptions?: ComboDisplayOptions;
  deviceAName?: string;
  deviceBName?: string;
}) {
  const meta = STATUS_META[diff.status] ?? STATUS_META['exact-same'];

  const { keyA, keyB, effectiveOpts } = useMemo(() => {
    const opts: ComboDisplayOptions = {
      ...displayOptions,
      showMimo: true,
      showQam: true,
    };
    if (diff.status !== 'exact-changed') {
      return { keyA: diff.key, keyB: diff.key, effectiveOpts: opts };
    }
    return {
      keyA: diff.a ? generateCombinationKey(diff.a, opts) : diff.key,
      keyB: diff.b ? generateCombinationKey(diff.b, opts) : diff.key,
      effectiveOpts: opts,
    };
  }, [diff, displayOptions]);

  const comboA = diff.a ? { key: keyA, powerClass: diff.a.powerClass } : null;
  const comboB = diff.b ? { key: keyB, powerClass: diff.b.powerClass } : null;
  const isChanged = diff.status === 'exact-changed';

  const getCopyText = useCallback(() => {
    const nameA = shortenDeviceName(deviceAName, 'Device A');
    const nameB = shortenDeviceName(deviceBName, 'Device B');
    if (diff.status === 'exact-same') return keyA;
    if (diff.status === 'exact-changed') return `${nameA}: ${keyA} | ${nameB}: ${keyB}`;
    if (diff.status === 'a-only-covered') {
      const sup = diff.coveringSupersets?.[0];
      return sup ? `${nameA}: ${keyA} (covered by ${nameB}: ${sup})` : `${nameA}: ${keyA}`;
    }
    if (diff.status === 'b-only-covered') {
      const sup = diff.coveringSupersets?.[0];
      return sup ? `${nameB}: ${keyB} (covered by ${nameA}: ${sup})` : `${nameB}: ${keyB}`;
    }
    if (diff.status === 'a-only-unique') return `${nameA} only: ${keyA}`;
    return `${nameB} only: ${keyB}`;
  }, [diff.status, diff.coveringSupersets, keyA, keyB, deviceAName, deviceBName]);

  const statusChip = (
    <Chip
      label={meta.label}
      size="small"
      sx={{
        height: 16,
        fontSize: '0.58rem',
        fontWeight: 700,
        color: meta.color,
        bgcolor: meta.bg,
        border: `1px solid ${meta.color}33`,
        '& .MuiChip-label': { px: 0.55 },
      }}
    />
  );

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 94px minmax(0, 1fr) 26px',
        gap: 0.5,
        mb: 0.5,
        alignItems: 'start',
        px: 0.25,
        contentVisibility: 'auto',
        containIntrinsicSize: '0 36px',
        '& .combo-copy-btn': { opacity: { xs: 0.8, md: 0.2 }, transition: 'opacity 120ms' },
        '&:hover .combo-copy-btn, &:focus-within .combo-copy-btn': { opacity: 1 },
      }}
    >
      <ComboSideCard
        combo={comboA}
        variant={getVariantA(diff.status)}
        statusColor={meta.color}
        coveringSupersets={diff.status === 'b-only-covered' ? diff.coveringSupersets : undefined}
        baseKey={diff.status === 'b-only-covered' ? diff.key : undefined}
        referenceKey={isChanged ? keyB : undefined}
        diffMode={isChanged ? 'changed' : undefined}
        displayOptions={effectiveOpts}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pt: 0.6 }}>
        {isChanged ? (
          <Tooltip title={<Box sx={{ whiteSpace: 'pre-line', fontSize: '0.7rem' }}>{buildExactChangedTooltip(diff)}</Box>} arrow placement="top">
            {statusChip}
          </Tooltip>
        ) : (
          statusChip
        )}
      </Box>

      <ComboSideCard
        combo={comboB}
        variant={getVariantB(diff.status)}
        statusColor={meta.color}
        coveringSupersets={diff.status === 'a-only-covered' ? diff.coveringSupersets : undefined}
        baseKey={diff.status === 'a-only-covered' ? diff.key : undefined}
        referenceKey={isChanged ? keyA : undefined}
        diffMode={isChanged ? 'changed' : undefined}
        displayOptions={effectiveOpts}
      />

      <Box className="combo-copy-btn" sx={{ display: 'flex', justifyContent: 'center', pt: 0.35 }}>
        <CopyActionButton getText={getCopyText} tooltip="Copy combo comparison" size={12} />
      </Box>

      {(isChanged || diff.status === 'a-only-covered' || diff.status === 'b-only-covered') && (
        <DeltaSummaryBar diff={diff} />
      )}
    </Box>
  );
});

// ─── ComboGroupHeader ─────────────────────────────────────────────────────────

interface ComboGroupHeaderProps {
  title: string;
  diffs: ComboDiff[];
  collapsed: boolean;
  onToggle: () => void;
}

const ComboGroupHeader = React.memo(function ComboGroupHeader({ title, diffs, collapsed, onToggle }: ComboGroupHeaderProps) {
  const isDark = useTheme().palette.mode === 'dark';
  const counts = useMemo(
    () =>
      diffs.reduce(
        (acc, d) => {
          if (d.status === 'exact-same') acc.exact++;
          else if (d.status === 'exact-changed') acc.changed++;
          else if (d.status === 'a-only-covered' || d.status === 'b-only-covered') acc.covered++;
          else if (d.status === 'a-only-unique') acc.aUnique++;
          else acc.bUnique++;
          return acc;
        },
        { exact: 0, changed: 0, covered: 0, aUnique: 0, bUnique: 0 }
      ),
    [diffs]
  );

  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        cursor: 'pointer',
        py: 0.45,
        px: 0.75,
        borderRadius: 1,
        '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' },
      }}
    >
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem', fontFamily: MONO_FONT_FAMILY, color: 'text.primary', whiteSpace: 'nowrap' }}>
          {title}
        </Typography>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
        <Typography variant="caption" sx={{ fontSize: '0.64rem', fontFamily: MONO_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', color: 'text.disabled', whiteSpace: 'nowrap' }}>
          {diffs.length}
        </Typography>
        {counts.aUnique > 0 && (
          <Chip size="small" label={`A:${counts.aUnique}`} sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700, color: DEVICE_COLOR.deviceA, bgcolor: 'rgba(33,150,243,0.12)' }} />
        )}
        {counts.bUnique > 0 && (
          <Chip size="small" label={`B:${counts.bUnique}`} sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700, color: DEVICE_COLOR.deviceB, bgcolor: 'rgba(20,184,166,0.12)' }} />
        )}
        {counts.changed > 0 && (
          <Chip size="small" label={`Δ:${counts.changed}`} sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700, color: STATUS_COLOR.amber, bgcolor: 'rgba(245,158,11,0.12)' }} />
        )}
        {counts.covered > 0 && (
          <Chip size="small" label={`↑:${counts.covered}`} sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700, color: STATUS_COLOR.indigo, bgcolor: 'rgba(99,102,241,0.12)' }} />
        )}
        {counts.exact > 0 && (
          <Chip size="small" label={`✓${counts.exact}`} sx={{ height: 15, fontSize: '0.58rem', color: STATUS_COLOR.green, bgcolor: 'rgba(16,185,129,0.10)' }} />
        )}
      </Box>
      {collapsed ? <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.disabled' }} /> : <ExpandLessIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
    </Box>
  );
});

// ─── ColHeader ───────────────────────────────────────────────────────────────

const ColHeader = React.memo(function ColHeader({ deviceAName, deviceBName }: { deviceAName?: string; deviceBName?: string }) {
  const shortA = shortenDeviceName(deviceAName, 'Device A');
  const shortB = shortenDeviceName(deviceBName, 'Device B');
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 94px minmax(0, 1fr) 26px',
        gap: 0.5,
        px: 0.5,
        py: 0.35,
        mb: 0.25,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderBottom: `2px solid ${DEVICE_COLOR.deviceA}66`, pb: 0.25, minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 800, color: DEVICE_COLOR.deviceA }}>A</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.64rem', fontWeight: 700, color: DEVICE_COLOR.deviceA, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {shortA}
        </Typography>
      </Box>
      <Box />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderBottom: `2px solid ${DEVICE_COLOR.deviceB}66`, pb: 0.25, minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 800, color: DEVICE_COLOR.deviceB }}>B</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.64rem', fontWeight: 700, color: DEVICE_COLOR.deviceB, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {shortB}
        </Typography>
      </Box>
      <Box />
    </Box>
  );
});

// ─── Inline Coverage Meter ────────────────────────────────────────────────────

function InlineCoverageMeter({ coverage }: { coverage: CoverageAnalysis }) {
  const isDark = useTheme().palette.mode === 'dark';
  const pctA = Math.round(coverage.aToB.coverageRate * 100);
  const pctB = Math.round(coverage.bToA.coverageRate * 100);
  const colorOf = (pct: number) => (pct >= 90 ? STATUS_COLOR.green : pct >= 70 ? STATUS_COLOR.amber : STATUS_COLOR.red);

  const tooltipContent = (
    <Box sx={{ fontSize: '0.68rem', lineHeight: 1.5 }}>
      <Box><b>Exact Match:</b> {coverage.aToB.exactMatch + coverage.aToB.exactChanged} (Param Diff: {coverage.aToB.exactChanged})</Box>
      <Box><b>A → B ({pctA}%):</b> {coverage.aToB.coveredBySuperset} covered · {coverage.aToB.trulyUnique} unique / {coverage.aToB.total}</Box>
      <Box><b>B → A ({pctB}%):</b> {coverage.bToA.coveredBySuperset} covered · {coverage.bToA.trulyUnique} unique / {coverage.bToA.total}</Box>
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1,
          py: 0.35,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)',
          bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.025)',
          ml: 'auto',
          cursor: 'help',
        }}
      >
        <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled', fontWeight: 700 }}>
          Cov
        </Typography>
        {[
          { label: 'A→B', pct: pctA, color: colorOf(pctA) },
          { label: 'B→A', pct: pctB, color: colorOf(pctB) },
        ].map((item, idx) => (
          <React.Fragment key={item.label}>
            {idx > 0 && <Box sx={{ width: '1px', height: 12, bgcolor: 'divider' }} />}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.63rem', color: 'text.secondary', fontWeight: 600 }}>
                {item.label}
              </Typography>
              <Box sx={{ width: 28, height: 5, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)', overflow: 'hidden' }}>
                <Box sx={{ width: `${item.pct}%`, height: '100%', bgcolor: item.color, borderRadius: 3 }} />
              </Box>
              <Typography variant="caption" sx={{ fontSize: '0.64rem', fontWeight: 700, color: item.color, fontFamily: MONO_FONT_FAMILY, fontVariantNumeric: 'tabular-nums' }}>
                {item.pct}%
              </Typography>
            </Box>
          </React.Fragment>
        ))}
      </Box>
    </Tooltip>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

const NATURAL_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

type FilterType = ComboFilterKey;
type GroupMode = 'ca' | 'status';

export interface ComboCompareViewProps {
  comboDiffs: ComboDiff[];
  coverage: CoverageAnalysis;
  deviceAName?: string;
  deviceBName?: string;
  displayOptions?: ComboDisplayOptions;
  ratType?: RatType;
  initialFilter?: FilterType;
  filterVersion?: number;
}

interface IndexedComboDiff {
  diff: ComboDiff;
  lowerKey: string;
  bandKeys: Set<string>;
  eutraDlCc: number;
  nrDlCc: number;
  caGroupKey: string;
  caGroupTitle: string;
}

export const ComboCompareView: React.FC<ComboCompareViewProps> = ({
  comboDiffs,
  coverage,
  deviceAName,
  deviceBName,
  displayOptions,
  ratType,
  initialFilter,
  filterVersion,
}) => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [userFilter, setUserFilter] = useState<FilterType | null>(initialFilter ?? null);
  const [groupMode, setGroupMode] = useState<GroupMode>('ca');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedBands, setSelectedBands] = useState<Set<string>>(new Set());
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);

  useEffect(() => {
    if (filterVersion !== undefined && initialFilter) {
      setUserFilter(initialFilter);
    }
  }, [filterVersion, initialFilter]);

  const { counts, allBandsInDiffs, indexedDiffs } = useMemo(() => {
    const accCounts = { diff: 0, exact: 0, exactChanged: 0, covered: 0, aOnly: 0, bOnly: 0, unique: 0 };
    const seenBands = new Set<string>();
    const bandList: { ratType: 'nr' | 'eutra'; band: number }[] = [];
    const isEndc = ratType === 'eutra-nr';

    const indexed: IndexedComboDiff[] = comboDiffs.map(d => {
      if (d.status !== 'exact-same') accCounts.diff++;
      if (d.status === 'exact-same' || d.status === 'exact-changed') accCounts.exact++;
      if (d.status === 'exact-changed') accCounts.exactChanged++;
      if (d.status === 'a-only-covered' || d.status === 'b-only-covered') accCounts.covered++;
      if (d.status === 'a-only-covered' || d.status === 'a-only-unique') accCounts.aOnly++;
      if (d.status === 'b-only-covered' || d.status === 'b-only-unique') accCounts.bOnly++;
      if (d.status === 'a-only-unique' || d.status === 'b-only-unique') accCounts.unique++;

      const bandKeys = new Set<string>();
      const bands = d.a?.bands ?? d.b?.bands ?? [];
      let eutraDlCc = 0;
      let nrDlCc = 0;
      for (const b of bands) {
        const k = `${b.ratType}:${b.band}`;
        bandKeys.add(k);
        if (!seenBands.has(k)) {
          seenBands.add(k);
          bandList.push({ ratType: b.ratType, band: b.band });
        }
        if (isEndc && b.bandwidthClassDL) {
          const cc = getBwClassCcCount(b.bandwidthClassDL, b.ratType, b.ratType === 'nr' && b.band >= 257);
          if (b.ratType === 'eutra') eutraDlCc += cc;
          else nrDlCc += cc;
        }
      }
      if (d.a && d.b) {
        for (const b of d.b.bands) {
          const k = `${b.ratType}:${b.band}`;
          bandKeys.add(k);
          if (!seenBands.has(k)) {
            seenBands.add(k);
            bandList.push({ ratType: b.ratType, band: b.band });
          }
        }
      }

      const caGroupKey = isEndc
        ? `${eutraDlCc}LTE+${nrDlCc}NR·${d.caLevel}DL${d.ulLevel}UL`
        : `${d.caLevel}DL${d.ulLevel}UL`;
      const caGroupTitle = isEndc
        ? `${eutraDlCc}LTE + ${nrDlCc}NR · ${d.caLevel}DL${d.ulLevel}UL-ENDC`
        : `${d.caLevel}DL${d.ulLevel}UL-CA`;

      return {
        diff: d,
        lowerKey: d.key.toLowerCase(),
        bandKeys,
        eutraDlCc,
        nrDlCc,
        caGroupKey,
        caGroupTitle,
      };
    });

    bandList.sort((a, b) => (a.ratType === b.ratType ? a.band - b.band : a.ratType === 'eutra' ? -1 : 1));
    return { counts: accCounts, allBandsInDiffs: bandList, indexedDiffs: indexed };
  }, [comboDiffs, ratType]);

  const filter: FilterType =
    userFilter === 'exact-changed' && counts.exactChanged === 0
      ? (counts.diff > 0 ? 'diff' : 'all')
      : (userFilter ?? (counts.diff > 0 ? 'diff' : 'all'));

  const toggleBand = useCallback((key: string) => {
    setSelectedBands(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }, []);

  const validBandKeySet = useMemo(
    () => new Set(allBandsInDiffs.map(b => `${b.ratType}:${b.band}`)),
    [allBandsInDiffs]
  );
  const selectedBandsArr = useMemo(
    () => [...selectedBands].filter(k => validBandKeySet.has(k)),
    [selectedBands, validBandKeySet]
  );
  const effectiveSelectedBands = useMemo(() => new Set(selectedBandsArr), [selectedBandsArr]);

  const filtered = useMemo(() => {
    const searchLower = deferredSearch.toLowerCase();

    return indexedDiffs.filter(item => {
      if (searchLower && !item.lowerKey.includes(searchLower)) return false;

      const s = item.diff.status;
      const matchFilter =
        filter === 'all' ? true
          : filter === 'diff' ? s !== 'exact-same'
            : filter === 'unique' ? (s === 'a-only-unique' || s === 'b-only-unique')
              : filter === 'exact-changed' ? s === 'exact-changed'
                : filter === 'covered' ? (s === 'a-only-covered' || s === 'b-only-covered')
                  : filter === 'shared' ? (s === 'exact-same' || s === 'exact-changed')
                    : filter === 'a-only' ? (s === 'a-only-covered' || s === 'a-only-unique')
                      : (s === 'b-only-covered' || s === 'b-only-unique');
      if (!matchFilter) return false;

      return selectedBandsArr.length === 0 || selectedBandsArr.every(k => item.bandKeys.has(k));
    });
  }, [indexedDiffs, deferredSearch, filter, selectedBandsArr]);

  const groups = useMemo(() => {
    if (groupMode === 'status') {
      const byStatus = new Map<ComboDiff['status'], ComboDiff[]>();
      for (const item of filtered) {
        const d = item.diff;
        let arr = byStatus.get(d.status);
        if (!arr) { arr = []; byStatus.set(d.status, arr); }
        arr.push(d);
      }
      return STATUS_GROUP_ORDER
        .filter(({ status }) => byStatus.has(status))
        .map(({ status, title }) => {
          const sortedDiffs = byStatus.get(status)!.sort((a, b) => {
            if (b.caLevel !== a.caLevel) return b.caLevel - a.caLevel;
            if (b.ulLevel !== a.ulLevel) return b.ulLevel - a.ulLevel;
            return NATURAL_COLLATOR.compare(a.key, b.key);
          });
          return { key: `status:${status}`, title, diffs: sortedDiffs };
        });
    }

    const grouped = new Map<string, { title: string; caLevel: number; ulLevel: number; eutraDlCc: number; nrDlCc: number; diffs: ComboDiff[] }>();

    for (const item of filtered) {
      const d = item.diff;
      let g = grouped.get(item.caGroupKey);
      if (!g) {
        g = {
          title: item.caGroupTitle,
          caLevel: d.caLevel,
          ulLevel: d.ulLevel,
          eutraDlCc: item.eutraDlCc,
          nrDlCc: item.nrDlCc,
          diffs: [],
        };
        grouped.set(item.caGroupKey, g);
      }
      g.diffs.push(d);
    }

    return [...grouped.entries()]
      .sort(([, a], [, b]) => {
        if (b.caLevel !== a.caLevel) return b.caLevel - a.caLevel;
        if (b.ulLevel !== a.ulLevel) return b.ulLevel - a.ulLevel;
        if (b.nrDlCc !== a.nrDlCc) return b.nrDlCc - a.nrDlCc;
        return b.eutraDlCc - a.eutraDlCc;
      })
      .map(([key, g]) => {
        g.diffs.sort((a, b) => {
          const rankDiff = (STATUS_SEVERITY_RANK[a.status] ?? 9) - (STATUS_SEVERITY_RANK[b.status] ?? 9);
          if (rankDiff !== 0) return rankDiff;
          return NATURAL_COLLATOR.compare(a.key, b.key);
        });
        return { key, title: g.title, diffs: g.diffs };
      });
  }, [filtered, groupMode]);

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (comboDiffs.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>
        <Typography variant="body2">No band combinations</Typography>
      </Box>
    );
  }

  const filterBtnSx = {
    '& .MuiToggleButton-root': { py: 0.2, px: 0.7, fontSize: '0.64rem', textTransform: 'none', minHeight: 24 },
  };

  return (
    <Box>
      {/* Sticky Filter + Grouping + Inline Coverage + Band Chips Toolbar */}
      <Box
        sx={{
          position: 'sticky',
          top: -12,
          zIndex: 5,
          pt: 1.25,
          pb: 0.75,
          mx: -1.5,
          px: 1.5,
          mb: 1,
          bgcolor: surface.toolbarBg,
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid',
          borderColor: surface.border,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, mb: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search combo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15, color: 'text.disabled' }} /></InputAdornment>,
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.2 }} aria-label="Clear combo search">
                      <CloseIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
                sx: { fontSize: '0.73rem', height: 26 },
              },
            }}
            sx={{ width: { xs: '100%', sm: 170 } }}
          />

          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, v) => v && setUserFilter(v)}
            size="small"
            sx={{ ...filterBtnSx, flexWrap: 'wrap' }}
          >
            <ToggleButton value="diff">Diff ({counts.diff})</ToggleButton>
            <ToggleButton value="unique" sx={{ color: STATUS_COLOR.red }}>Unique ({counts.unique})</ToggleButton>
            {counts.exactChanged > 0 && (
              <ToggleButton value="exact-changed" sx={{ color: STATUS_COLOR.amber }}>Param ({counts.exactChanged})</ToggleButton>
            )}
            <ToggleButton value="covered" sx={{ color: STATUS_COLOR.indigo }}>Covered ({counts.covered})</ToggleButton>
            <ToggleButton value="a-only" sx={{ color: DEVICE_COLOR.deviceA }}>A-only ({counts.aOnly})</ToggleButton>
            <ToggleButton value="b-only" sx={{ color: DEVICE_COLOR.deviceB }}>B-only ({counts.bOnly})</ToggleButton>
            <ToggleButton value="shared" sx={{ color: STATUS_COLOR.green }}>Shared ({counts.exact})</ToggleButton>
            <ToggleButton value="all">All ({comboDiffs.length})</ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            value={groupMode}
            exclusive
            onChange={(_, v) => v && setGroupMode(v)}
            size="small"
            sx={filterBtnSx}
          >
            <ToggleButton value="ca">{ratType === 'eutra-nr' ? 'xLTE+yNR' : 'CA Level'}</ToggleButton>
            <ToggleButton value="status">By Status</ToggleButton>
          </ToggleButtonGroup>

          <InlineCoverageMeter coverage={coverage} />
        </Box>

        {/* Band filter chips + Symbol legend */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {allBandsInDiffs.length > 0 && (
              <BandFilterChips allBands={allBandsInDiffs} selected={effectiveSelectedBands} onToggle={toggleBand} onClear={() => setSelectedBands(new Set())} />
            )}
          </Box>
          <ComboSymbolLegend />
        </Box>
      </Box>

      {/* Groups list */}
      {filtered.length === 0 ? (
        filter === 'diff' && counts.diff === 0 ? (
          <Box
            sx={{
              py: 3,
              px: 2,
              textAlign: 'center',
              borderRadius: 2,
              border: '1px solid rgba(16,185,129,0.25)',
              bgcolor: 'rgba(16,185,129,0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <CheckCircleOutlinedIcon sx={{ fontSize: 28, color: STATUS_COLOR.green }} />
            <Typography variant="body2" sx={{ color: STATUS_COLOR.green, fontWeight: 600 }}>
              All {comboDiffs.length} combinations match identically
            </Typography>
            <Button size="small" variant="outlined" onClick={() => setUserFilter('all')} sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
              Show All ({comboDiffs.length})
            </Button>
          </Box>
        ) : (
          <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
            <Typography variant="body2">No results match the current filter</Typography>
          </Box>
        )
      ) : (
        <Box sx={{ overflowX: 'auto', mb: 1 }}>
          <Box sx={{ minWidth: 540 }}>
            {groups.map(({ key, title, diffs }) => (
              <Box key={key} sx={{ mb: 1 }}>
                <ComboGroupHeader
                  title={title}
                  diffs={diffs}
                  collapsed={collapsedGroups.has(key)}
                  onToggle={() => toggleGroup(key)}
                />
                {!collapsedGroups.has(key) && (
                  <Box sx={{ mt: 0.4 }}>
                    <ColHeader deviceAName={deviceAName} deviceBName={deviceBName} />
                    <Box sx={{ px: 0.25 }}>
                      {diffs.map(diff => (
                        <ComboRow
                          key={`${diff.status}:${diff.key}`}
                          diff={diff}
                          displayOptions={displayOptions}
                          deviceAName={deviceAName}
                          deviceBName={deviceBName}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};
