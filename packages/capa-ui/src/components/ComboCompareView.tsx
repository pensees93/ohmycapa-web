import React, { useState, useMemo, useCallback, useDeferredValue } from 'react';
import {
  Box, Typography, Chip, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton, Tooltip, Button,
  Checkbox, FormControlLabel, useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { getBwClassCcCount, generateCombinationKey } from '@ohmycapa/capa-core';
import type { ComboDiff, CoverageAnalysis, ComboDisplayOptions, RatType } from '@ohmycapa/capa-core';
import { renderComboKey, renderComboKeyDiff, extractSupersetDeltaLabels } from './comboKeyRenderer';
import { COMBO_STATUS_META } from '../constants/statusMeta';
import { BandFilterChips } from './BandFilterChips';

const STATUS_META = COMBO_STATUS_META;

const VARIANT_B: Record<string, 'solid' | 'placeholder' | 'covered'> = {
  'a-only-covered': 'covered',
  'a-only-unique':  'placeholder',
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
  'a-only-unique':  0,
  'b-only-unique':  1,
  'exact-changed':  2,
  'a-only-covered': 3,
  'b-only-covered': 4,
  'exact-same':     5,
};

const STATUS_GROUP_ORDER: { status: ComboDiff['status']; title: string }[] = [
  { status: 'a-only-unique',  title: 'A Only — Unique (Not Covered)' },
  { status: 'b-only-unique',  title: 'B Only — Unique (Not Covered)' },
  { status: 'exact-changed',  title: 'Exact Match — Parameter Diff' },
  { status: 'a-only-covered', title: 'A Only — Covered by B Superset' },
  { status: 'b-only-covered', title: 'B Only — Covered by A Superset' },
  { status: 'exact-same',     title: 'Exact Match — Identical' },
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
      <Box sx={{
        border: '1px dashed', borderColor: 'divider', borderRadius: 1,
        px: 1, py: 0.5, minHeight: 26, display: 'flex', alignItems: 'center',
        opacity: 0.4,
      }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem', fontStyle: 'italic' }}>
          — not supported
        </Typography>
      </Box>
    );
  }

  if (variant === 'covered') {
    const superset = coveringSupersets?.[0];
    return (
      <Box sx={{
        border: '1px dashed', borderColor: '#6366f155', borderRadius: 1,
        px: 1, py: 0.5, minHeight: 26, display: 'flex', alignItems: 'center', gap: 0.5,
        bgcolor: 'rgba(99,102,241,0.05)',
      }}>
        <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>
          ↑
        </Typography>
        <Typography variant="caption" component="div" sx={{ fontSize: '0.74rem', color: 'text.primary', lineHeight: 1.3, overflow: 'hidden', minWidth: 0, flex: 1 }}>
          {superset ? renderComboKeyDiff(superset, baseKey, 'superset', displayOptions) : 'covered'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      border: '1px solid', borderColor: `${statusColor}44`, borderRadius: 1,
      px: 1, py: 0.5, minHeight: 26, display: 'flex', alignItems: 'center',
      bgcolor: isDark ? `${statusColor}0d` : `${statusColor}08`,
    }}>
      <Typography variant="caption" component="div" sx={{ fontSize: '0.76rem', color: 'text.primary', lineHeight: 1.3, overflow: 'hidden', minWidth: 0, flex: 1 }}>
        {combo
          ? (diffMode === 'changed' && referenceKey
              ? renderComboKeyDiff(combo, referenceKey, 'changed', displayOptions)
              : renderComboKey(combo, displayOptions))
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
        if (bd.bandwidthClassDL?.status === 'changed')
          labels.push(`${bd.displayName} BW DL: ${bd.bandwidthClassDL.a ?? '—'}→${bd.bandwidthClassDL.b ?? '—'}`);
        if (bd.bandwidthClassUL?.status === 'changed')
          labels.push(`${bd.displayName} BW UL: ${bd.bandwidthClassUL.a ?? '—'}→${bd.bandwidthClassUL.b ?? '—'}`);
        if (bd.dlMimo?.status === 'changed')
          labels.push(`${bd.displayName} DL MIMO: ${bd.dlMimo.a ?? '—'}→${bd.dlMimo.b ?? '—'}`);
        if (bd.ulMimo?.status === 'changed')
          labels.push(`${bd.displayName} UL MIMO: ${bd.ulMimo.a ?? '—'}→${bd.ulMimo.b ?? '—'}`);
        if (bd.dlQam?.status === 'changed')
          labels.push(`${bd.displayName} DL QAM: ${bd.dlQam.a ?? '—'}→${bd.dlQam.b ?? '—'}`);
        if (bd.ulQam?.status === 'changed')
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
    return { labels, color: '#d97706', bg: 'rgba(245,158,11,0.1)' };
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
    return { labels, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' };
  }

  return { labels: [], color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
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

// ─── Build tooltip text for exact-changed diffs ──────────────────────────────

function buildExactChangedTooltip(diff: ComboDiff): string {
  const lines: string[] = [];

  if (diff.bandParamDiffs) {
    for (const bd of diff.bandParamDiffs) {
      if (bd.bandwidthClassDL?.status === 'changed')
        lines.push(`${bd.displayName} bwClassDL: ${bd.bandwidthClassDL.a ?? '—'} → ${bd.bandwidthClassDL.b ?? '—'}`);
      if (bd.bandwidthClassUL?.status === 'changed')
        lines.push(`${bd.displayName} bwClassUL: ${bd.bandwidthClassUL.a ?? '—'} → ${bd.bandwidthClassUL.b ?? '—'}`);
      if (bd.dlMimo?.status === 'changed')
        lines.push(`${bd.displayName} DL MIMO: ${bd.dlMimo.a ?? '—'} → ${bd.dlMimo.b ?? '—'}`);
      if (bd.ulMimo?.status === 'changed')
        lines.push(`${bd.displayName} UL MIMO: ${bd.ulMimo.a ?? '—'} → ${bd.ulMimo.b ?? '—'}`);
      if (bd.dlQam?.status === 'changed')
        lines.push(`${bd.displayName} DL QAM: ${bd.dlQam.a ?? '—'} → ${bd.dlQam.b ?? '—'}`);
      if (bd.ulQam?.status === 'changed')
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

const ComboRow = React.memo(function ComboRow({ diff, displayOptions }: { diff: ComboDiff; displayOptions?: ComboDisplayOptions }) {
  const meta = STATUS_META[diff.status] ?? STATUS_META['exact-same'];

  // When parameters differ (even if MIMO/QAM toggles are off), reveal differing tokens on both sides
  const { keyA, keyB, effectiveOpts } = useMemo(() => {
    if (diff.status !== 'exact-changed') {
      return { keyA: diff.key, keyB: diff.key, effectiveOpts: displayOptions };
    }
    const hasMimoDiff = diff.bandParamDiffs?.some(bd => bd.dlMimo?.status === 'changed' || bd.ulMimo?.status === 'changed') ?? false;
    const hasQamDiff = diff.bandParamDiffs?.some(bd => bd.dlQam?.status === 'changed' || bd.ulQam?.status === 'changed') ?? false;
    const opts: ComboDisplayOptions = {
      ...displayOptions,
      showMimo: !!displayOptions?.showMimo || hasMimoDiff,
      showQam: !!displayOptions?.showQam || hasQamDiff,
    };
    return {
      keyA: diff.a ? generateCombinationKey(diff.a, opts) : diff.key,
      keyB: diff.b ? generateCombinationKey(diff.b, opts) : diff.key,
      effectiveOpts: opts,
    };
  }, [diff, displayOptions]);

  const comboA = diff.a ? { key: keyA, powerClass: diff.a.powerClass } : null;
  const comboB = diff.b ? { key: keyB, powerClass: diff.b.powerClass } : null;
  const isChanged = diff.status === 'exact-changed';

  const statusChip = (
    <Chip label={meta.label} size="small" sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700, color: meta.color, bgcolor: `${meta.color}18`, px: 0.25 }} />
  );

  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 82px minmax(0, 1fr)',
      gap: 0.5,
      mb: 0.5,
      alignItems: 'start',
      px: 0.25,
    }}>
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

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pt: 0.5 }}>
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
  const counts = useMemo(() => diffs.reduce((acc, d) => {
    if (d.status === 'exact-same') acc.exact++;
    else if (d.status === 'exact-changed') acc.changed++;
    else if (d.status === 'a-only-covered' || d.status === 'b-only-covered') acc.covered++;
    else acc.unique++;
    return acc;
  }, { exact: 0, changed: 0, covered: 0, unique: 0 }), [diffs]);

  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
        py: 0.4, px: 0.5, borderRadius: 1,
        '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
      }}
    >
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
          {title}
        </Typography>
        <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled', whiteSpace: 'nowrap' }}>
          {diffs.length} combos
        </Typography>
        {counts.unique > 0 && (
          <Chip size="small" label={`Unique:${counts.unique}`} sx={{ height: 14, fontSize: '0.58rem', fontWeight: 600, color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)' }} />
        )}
        {counts.changed > 0 && (
          <Chip size="small" label={`Δ:${counts.changed}`} sx={{ height: 14, fontSize: '0.58rem', fontWeight: 600, color: '#f59e0b', bgcolor: 'rgba(245,158,11,0.1)' }} />
        )}
        {counts.covered > 0 && (
          <Chip size="small" label={`↑:${counts.covered}`} sx={{ height: 14, fontSize: '0.58rem', fontWeight: 600, color: '#6366f1', bgcolor: 'rgba(99,102,241,0.1)' }} />
        )}
        {counts.exact > 0 && (
          <Chip size="small" label={`✓${counts.exact}`} sx={{ height: 14, fontSize: '0.58rem', color: '#10b981', bgcolor: 'rgba(16,185,129,0.1)' }} />
        )}
      </Box>
      {collapsed
        ? <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
        : <ExpandLessIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
      }
    </Box>
  );
});

// ─── ColHeader ───────────────────────────────────────────────────────────────

const ColHeader = React.memo(function ColHeader({ deviceAName, deviceBName }: { deviceAName?: string; deviceBName?: string }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 82px 1fr', gap: 0.5, px: 0.5, py: 0.3 }}>
      <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled', fontWeight: 600 }}>
        {deviceAName ?? 'Device A'}
      </Typography>
      <Box />
      <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled', fontWeight: 600 }}>
        {deviceBName ?? 'Device B'}
      </Typography>
    </Box>
  );
});

// ─── Inline Coverage Meter (replaces 110px block) ─────────────────────────────

function InlineCoverageMeter({ coverage }: { coverage: CoverageAnalysis }) {
  const isDark = useTheme().palette.mode === 'dark';
  const pctA = Math.round(coverage.aToB.coverageRate * 100);
  const pctB = Math.round(coverage.bToA.coverageRate * 100);
  const colorOf = (pct: number) => (pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444');

  const tooltipContent = (
    <Box sx={{ fontSize: '0.68rem', lineHeight: 1.5 }}>
      <Box><b>Exact Match:</b> {coverage.aToB.exactMatch + coverage.aToB.exactChanged} (Param Diff: {coverage.aToB.exactChanged})</Box>
      <Box><b>A → B ({pctA}%):</b> {coverage.aToB.coveredBySuperset} covered · {coverage.aToB.trulyUnique} unique / {coverage.aToB.total}</Box>
      <Box><b>B → A ({pctB}%):</b> {coverage.bToA.coveredBySuperset} covered · {coverage.bToA.trulyUnique} unique / {coverage.bToA.total}</Box>
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.35, borderRadius: 1.5,
        border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        ml: 'auto', cursor: 'help',
      }}>
        <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled', fontWeight: 600 }}>
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
              <Box sx={{ width: 28, height: 5, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <Box sx={{ width: `${item.pct}%`, height: '100%', bgcolor: item.color, borderRadius: 3 }} />
              </Box>
              <Typography variant="caption" sx={{ fontSize: '0.64rem', fontWeight: 700, color: item.color, fontFamily: 'monospace' }}>
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

type FilterType = 'diff' | 'unique' | 'exact-changed' | 'covered' | 'a-only' | 'b-only' | 'shared' | 'all';
type GroupMode = 'ca' | 'status';

interface ComboCompareViewProps {
  comboDiffs: ComboDiff[];
  coverage: CoverageAnalysis;
  deviceAName?: string;
  deviceBName?: string;
  displayOptions?: ComboDisplayOptions;
  ratType?: RatType;
  onDisplayOptionsChange?: (updates: Partial<ComboDisplayOptions>) => void;
}

export const ComboCompareView: React.FC<ComboCompareViewProps> = ({
  comboDiffs, coverage, deviceAName, deviceBName, displayOptions, ratType, onDisplayOptionsChange,
}) => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [userFilter, setUserFilter] = useState<FilterType | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>('ca');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedBands, setSelectedBands] = useState<Set<string>>(new Set());
  const isDark = useTheme().palette.mode === 'dark';

  const counts = useMemo(() => comboDiffs.reduce((acc, d) => {
    if (d.status !== 'exact-same') acc.diff++;
    if (d.status === 'exact-same' || d.status === 'exact-changed') acc.exact++;
    if (d.status === 'exact-changed') acc.exactChanged++;
    if (d.status === 'a-only-covered' || d.status === 'b-only-covered') acc.covered++;
    if (d.status === 'a-only-covered' || d.status === 'a-only-unique') acc.aOnly++;
    if (d.status === 'b-only-covered' || d.status === 'b-only-unique') acc.bOnly++;
    if (d.status === 'a-only-unique' || d.status === 'b-only-unique') acc.unique++;
    return acc;
  }, { diff: 0, exact: 0, exactChanged: 0, covered: 0, aOnly: 0, bOnly: 0, unique: 0 }), [comboDiffs]);

  const filter: FilterType = userFilter ?? (counts.diff > 0 ? 'diff' : 'all');

  const allBandsInDiffs = useMemo(() => {
    const seen = new Set<string>();
    const result: { ratType: 'nr' | 'eutra'; band: number }[] = [];
    for (const d of comboDiffs) {
      for (const b of [...(d.a?.bands ?? []), ...(d.b?.bands ?? [])]) {
        const k = `${b.ratType}:${b.band}`;
        if (!seen.has(k)) { seen.add(k); result.push({ ratType: b.ratType, band: b.band }); }
      }
    }
    return result.sort((a, b) => a.ratType === b.ratType ? a.band - b.band : a.ratType === 'eutra' ? -1 : 1);
  }, [comboDiffs]);

  const toggleBand = useCallback((key: string) => {
    setSelectedBands(prev => {
      const n = new Set(prev);
      if (n.has(key)) {
        n.delete(key);
      } else {
        n.add(key);
      }
      return n;
    });
  }, []);

  const selectedBandsArr = useMemo(() => [...selectedBands], [selectedBands]);

  const filtered = useMemo(() => {
    const searchLower = deferredSearch.toLowerCase();
    const parsedSelectedBands = selectedBandsArr.map(k => {
      const [rt, bStr] = k.split(':');
      return { ratType: rt, band: Number(bStr) };
    });

    return comboDiffs.filter(d => {
      const matchSearch = !searchLower || d.key.toLowerCase().includes(searchLower);
      const matchFilter = filter === 'all' ? true
        : filter === 'diff' ? d.status !== 'exact-same'
        : filter === 'unique' ? (d.status === 'a-only-unique' || d.status === 'b-only-unique')
        : filter === 'exact-changed' ? d.status === 'exact-changed'
        : filter === 'covered' ? (d.status === 'a-only-covered' || d.status === 'b-only-covered')
        : filter === 'shared' ? (d.status === 'exact-same' || d.status === 'exact-changed')
        : filter === 'a-only' ? (d.status === 'a-only-covered' || d.status === 'a-only-unique')
        : (d.status === 'b-only-covered' || d.status === 'b-only-unique');

      const matchBands = parsedSelectedBands.length === 0 || parsedSelectedBands.every(psb => {
        const bands = d.a?.bands ?? d.b?.bands ?? [];
        return bands.some((b: any) => b.ratType === psb.ratType && b.band === psb.band);
      });
      return matchSearch && matchFilter && matchBands;
    });
  }, [comboDiffs, deferredSearch, filter, selectedBandsArr]);

  const groups = useMemo(() => {
    if (groupMode === 'status') {
      const byStatus = new Map<ComboDiff['status'], ComboDiff[]>();
      for (const d of filtered) {
        const arr = byStatus.get(d.status) ?? [];
        arr.push(d);
        byStatus.set(d.status, arr);
      }
      return STATUS_GROUP_ORDER
        .filter(({ status }) => byStatus.has(status))
        .map(({ status, title }) => {
          const sortedDiffs = [...byStatus.get(status)!].sort((a, b) => {
            if (b.caLevel !== a.caLevel) return b.caLevel - a.caLevel;
            if (b.ulLevel !== a.ulLevel) return b.ulLevel - a.ulLevel;
            return a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' });
          });
          return { key: `status:${status}`, title, diffs: sortedDiffs };
        });
    }

    const isEndc = ratType === 'eutra-nr';
    const grouped = new Map<string, { title: string; caLevel: number; ulLevel: number; eutraDlCc: number; nrDlCc: number; diffs: ComboDiff[] }>();

    for (const d of filtered) {
      let eutraDlCc = 0;
      let nrDlCc = 0;
      if (isEndc) {
        const bands = d.a?.bands ?? d.b?.bands ?? [];
        for (const b of bands) {
          const cc = getBwClassCcCount(b.bandwidthClassDL);
          if (b.ratType === 'eutra') eutraDlCc += cc;
          else nrDlCc += cc;
        }
      }
      const key = isEndc
        ? `${eutraDlCc}LTE+${nrDlCc}NR·${d.caLevel}DL${d.ulLevel}UL`
        : `${d.caLevel}DL${d.ulLevel}UL`;
      const title = isEndc
        ? `${eutraDlCc}LTE + ${nrDlCc}NR · ${d.caLevel}DL${d.ulLevel}UL-ENDC`
        : `${d.caLevel}DL${d.ulLevel}UL-CA`;

      if (!grouped.has(key)) {
        grouped.set(key, { title, caLevel: d.caLevel, ulLevel: d.ulLevel, eutraDlCc, nrDlCc, diffs: [] });
      }
      grouped.get(key)!.diffs.push(d);
    }

    return [...grouped.entries()]
      .sort(([, a], [, b]) => {
        if (b.caLevel !== a.caLevel) return b.caLevel - a.caLevel;
        if (b.ulLevel !== a.ulLevel) return b.ulLevel - a.ulLevel;
        if (b.nrDlCc !== a.nrDlCc) return b.nrDlCc - a.nrDlCc;
        return b.eutraDlCc - a.eutraDlCc;
      })
      .map(([key, g]) => {
        const sortedDiffs = [...g.diffs].sort((a, b) => {
          const rankDiff = (STATUS_SEVERITY_RANK[a.status] ?? 9) - (STATUS_SEVERITY_RANK[b.status] ?? 9);
          if (rankDiff !== 0) return rankDiff;
          return a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' });
        });
        return { key, title: g.title, diffs: sortedDiffs };
      });
  }, [filtered, groupMode, ratType]);

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
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
      {/* Sticky Filter + Grouping + Display Options + Inline Coverage + Band Chips Toolbar */}
      <Box sx={{
        position: 'sticky',
        top: -12,
        zIndex: 5,
        pt: 1.5,
        pb: 0.75,
        mx: -1.5,
        px: 1.5,
        mb: 1,
        bgcolor: isDark ? 'rgba(24,24,27,0.92)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', gap: 1, mb: allBandsInDiffs.length > 0 ? 0.75 : 0, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search combo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15, color: 'text.disabled' }} /></InputAdornment>,
              }
            }}
            sx={{ width: 170, '& .MuiInputBase-input': { fontSize: '0.74rem', py: 0.4 } }}
          />

          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, v) => v && setUserFilter(v)}
            size="small"
            sx={filterBtnSx}
          >
            <ToggleButton value="diff">Diff ({counts.diff})</ToggleButton>
            <ToggleButton value="unique" sx={{ color: '#ef4444' }}>Unique ({counts.unique})</ToggleButton>
            {counts.exactChanged > 0 && (
              <ToggleButton value="exact-changed" sx={{ color: '#f59e0b' }}>Param ({counts.exactChanged})</ToggleButton>
            )}
            <ToggleButton value="covered" sx={{ color: '#6366f1' }}>Covered ({counts.covered})</ToggleButton>
            <ToggleButton value="a-only" sx={{ color: '#ef4444' }}>A-only ({counts.aOnly})</ToggleButton>
            <ToggleButton value="b-only" sx={{ color: '#6366f1' }}>B-only ({counts.bOnly})</ToggleButton>
            <ToggleButton value="shared" sx={{ color: '#10b981' }}>Shared ({counts.exact})</ToggleButton>
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

          {onDisplayOptionsChange && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControlLabel
                control={<Checkbox size="small" checked={!!displayOptions?.showQam} onChange={e => onDisplayOptionsChange({ showQam: e.target.checked })} sx={{ p: 0.3 }} />}
                label={<Typography sx={{ fontSize: '0.64rem' }}>QAM</Typography>}
                sx={{ m: 0 }}
              />
              <FormControlLabel
                control={<Checkbox size="small" checked={!!displayOptions?.showMimo} onChange={e => onDisplayOptionsChange({ showMimo: e.target.checked })} sx={{ p: 0.3 }} />}
                label={<Typography sx={{ fontSize: '0.64rem' }}>MIMO</Typography>}
                sx={{ m: 0 }}
              />
            </Box>
          )}

          <InlineCoverageMeter coverage={coverage} />
        </Box>

        {/* Band filter chips */}
        {allBandsInDiffs.length > 0 && (
          <BandFilterChips allBands={allBandsInDiffs} selected={selectedBands} onToggle={toggleBand} onClear={() => setSelectedBands(new Set())} />
        )}
      </Box>

      {/* Groups list */}
      {filtered.length === 0 ? (
        filter === 'diff' && counts.diff === 0 ? (
          <Box sx={{
            py: 3, px: 2, textAlign: 'center', borderRadius: 2,
            border: '1px solid rgba(16,185,129,0.25)', bgcolor: 'rgba(16,185,129,0.05)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
          }}>
            <CheckCircleOutlinedIcon sx={{ fontSize: 28, color: '#10b981' }} />
            <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600 }}>
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
        <Box sx={{ mb: 1 }}>
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
                    {diffs.map(diff => <ComboRow key={`${diff.status}:${diff.key}`} diff={diff} displayOptions={displayOptions} />)}
                  </Box>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};
