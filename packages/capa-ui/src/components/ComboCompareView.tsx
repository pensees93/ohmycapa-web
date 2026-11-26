import React, { memo, useState, useMemo, useCallback, useDeferredValue, useEffect, useTransition } from 'react';
import {
  Box, Typography, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton, Tooltip, Button, IconButton, useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
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
import { VirtualList } from './VirtualList';
import { shortenDeviceName } from './featureRenderHelpers';
import { copyTextToClipboard } from '../utils/clipboardUtils';
import type { ComboFilterKey } from '../utils/compareMetrics';

const STATUS_META = COMBO_STATUS_META;
const BAND_PARAM_NOTE_RE = /^[Bn]\d+\s+(?:classDL|classUL|DL-MIMO|UL-MIMO|DL-QAM|UL-QAM):/;
const NATURAL_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

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

// ─── Lightweight static styles & inline copy button ───────────────────────────

const PLACEHOLDER_CARD_STYLE_DARK: React.CSSProperties = {
  border: '1px dashed rgba(255,255,255,0.14)',
  borderRadius: 6,
  padding: '4px 8px',
  minHeight: 28,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  opacity: 0.5,
};
const PLACEHOLDER_CARD_STYLE_LIGHT: React.CSSProperties = {
  border: '1px dashed rgba(15,23,42,0.16)',
  borderRadius: 6,
  padding: '4px 8px',
  minHeight: 28,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  opacity: 0.55,
};
const PLACEHOLDER_TEXT_STYLE: React.CSSProperties = {
  fontSize: '0.68rem',
  fontStyle: 'italic',
  opacity: 0.65,
};
const COVERED_CARD_STYLE: React.CSSProperties = {
  border: `1px dashed ${STATUS_COLOR.indigo}66`,
  borderRadius: 6,
  padding: '4px 8px',
  minHeight: 28,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  backgroundColor: 'rgba(99,102,241,0.06)',
};
const COVERED_ARROW_STYLE: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: STATUS_COLOR.indigo,
  flexShrink: 0,
};
const CARD_CONTENT_STYLE: React.CSSProperties = {
  fontSize: '0.75rem',
  lineHeight: 1.3,
  overflow: 'hidden',
  minWidth: 0,
  flex: 1,
};

const ROW_GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 94px minmax(0, 1fr) 26px',
  gap: 4,
  paddingLeft: 2,
  paddingRight: 2,
  paddingBottom: 5,
  alignItems: 'start',
};
const STATUS_COL_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 5,
};
const DELTA_ROW_STYLE: React.CSSProperties = {
  gridColumn: '1 / -1',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 4,
  paddingLeft: 4,
  paddingRight: 4,
  paddingBottom: 2,
};
const DELTA_PREFIX_STYLE: React.CSSProperties = {
  fontSize: '0.6rem',
  fontWeight: 700,
  opacity: 0.45,
  marginRight: 2,
};
const COPY_BUTTON_BASE_STYLE: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 3,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  color: 'inherit',
  lineHeight: 1,
};

const InlineCopyButton = memo<{ getText: () => string; tooltip: string }>(({ getText, tooltip }) => {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    void copyTextToClipboard(getText()).then(ok => {
      if (!ok) return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  }, [getText]);

  const label = copied ? 'Copied!' : tooltip;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      style={{
        ...COPY_BUTTON_BASE_STYLE,
        color: copied ? STATUS_COLOR.green : 'inherit',
        opacity: copied ? 1 : 0.6,
      }}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" data-testid="CheckIcon" aria-hidden="true">
          <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
        </svg>
      )}
    </button>
  );
});

// ─── ComboSideCard ────────────────────────────────────────────────────────────

interface ComboSideCardProps {
  combo?: { key: string; powerClass?: string } | null;
  variant: 'solid' | 'placeholder' | 'covered';
  statusColor: string;
  isDark: boolean;
  coveringSupersets?: string[];
  baseKey?: string;
  referenceKey?: string;
  diffMode?: 'superset' | 'changed';
  displayOptions?: ComboDisplayOptions;
}

const ComboSideCard = memo<ComboSideCardProps>(({
  combo, variant, statusColor, isDark, coveringSupersets, baseKey, referenceKey, diffMode, displayOptions,
}) => {
  if (variant === 'placeholder') {
    return (
      <div style={isDark ? PLACEHOLDER_CARD_STYLE_DARK : PLACEHOLDER_CARD_STYLE_LIGHT}>
        <span style={PLACEHOLDER_TEXT_STYLE}>— not supported</span>
      </div>
    );
  }

  if (variant === 'covered') {
    const superset = coveringSupersets?.[0];
    return (
      <div style={COVERED_CARD_STYLE}>
        <span style={COVERED_ARROW_STYLE}>↑</span>
        <div style={CARD_CONTENT_STYLE}>
          {superset ? renderComboKeyDiff(superset, baseKey, 'superset', displayOptions, isDark) : 'covered'}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: `1px solid ${statusColor}44`,
        borderRadius: 6,
        padding: '4px 8px',
        minHeight: 28,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: isDark ? `${statusColor}12` : `${statusColor}09`,
      }}
    >
      <div style={CARD_CONTENT_STYLE}>
        {combo
          ? (diffMode === 'changed' && referenceKey
            ? renderComboKeyDiff(combo, referenceKey, 'changed', displayOptions, isDark)
            : renderComboKey(combo, displayOptions, isDark))
          : '─'}
      </div>
    </div>
  );
});

// ─── Delta helpers ────────────────────────────────────────────────────────────

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

// ─── Indexed Model & ComboRow ─────────────────────────────────────────────────

interface IndexedComboDiff {
  diff: ComboDiff;
  keyA: string;
  keyB: string;
  lowerKey: string;
  bandKeys: Set<string>;
  eutraDlCc: number;
  nrDlCc: number;
  caGroupKey: string;
  caGroupTitle: string;
  naturalRank: number;
  deltaBadges: { labels: string[]; color: string; bg: string };
  exactChangedTooltip?: string;
  estimatedHeight: number;
}

const DEFAULT_DISPLAY_OPTS: ComboDisplayOptions = { showMimo: true, showQam: true };

const ComboRow = memo<{
  item: IndexedComboDiff;
  isDark: boolean;
  displayOptions?: ComboDisplayOptions;
  shortDeviceA: string;
  shortDeviceB: string;
}>(({ item, isDark, displayOptions, shortDeviceA, shortDeviceB }) => {
  const { diff, keyA, keyB, deltaBadges, exactChangedTooltip } = item;
  const meta = STATUS_META[diff.status] ?? STATUS_META['exact-same'];
  const effectiveOpts = useMemo<ComboDisplayOptions>(
    () => (displayOptions ? { ...displayOptions, showMimo: true, showQam: true } : DEFAULT_DISPLAY_OPTS),
    [displayOptions]
  );

  const comboA = useMemo(() => (diff.a ? { key: keyA, powerClass: diff.a.powerClass } : null), [diff.a, keyA]);
  const comboB = useMemo(() => (diff.b ? { key: keyB, powerClass: diff.b.powerClass } : null), [diff.b, keyB]);
  const isChanged = diff.status === 'exact-changed';

  const getCopyText = useCallback(() => {
    if (diff.status === 'exact-same') return keyA;
    if (diff.status === 'exact-changed') return `${shortDeviceA}: ${keyA} | ${shortDeviceB}: ${keyB}`;
    if (diff.status === 'a-only-covered') {
      const sup = diff.coveringSupersets?.[0];
      return sup ? `${shortDeviceA}: ${keyA} (covered by ${shortDeviceB}: ${sup})` : `${shortDeviceA}: ${keyA}`;
    }
    if (diff.status === 'b-only-covered') {
      const sup = diff.coveringSupersets?.[0];
      return sup ? `${shortDeviceB}: ${keyB} (covered by ${shortDeviceA}: ${sup})` : `${shortDeviceB}: ${keyB}`;
    }
    if (diff.status === 'a-only-unique') return `${shortDeviceA} only: ${keyA}`;
    return `${shortDeviceB} only: ${keyB}`;
  }, [diff.status, diff.coveringSupersets, keyA, keyB, shortDeviceA, shortDeviceB]);

  return (
    <div className="capa-combo-row" style={ROW_GRID_STYLE}>
      <ComboSideCard
        combo={comboA}
        variant={getVariantA(diff.status)}
        statusColor={meta.color}
        isDark={isDark}
        coveringSupersets={diff.status === 'b-only-covered' ? diff.coveringSupersets : undefined}
        baseKey={diff.status === 'b-only-covered' ? diff.key : undefined}
        referenceKey={isChanged ? keyB : undefined}
        diffMode={isChanged ? 'changed' : undefined}
        displayOptions={effectiveOpts}
      />

      <div style={STATUS_COL_STYLE}>
        <span
          title={exactChangedTooltip}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 16,
            padding: '0 6px',
            borderRadius: 8,
            fontSize: '0.58rem',
            fontWeight: 700,
            color: meta.color,
            backgroundColor: meta.bg,
            border: `1px solid ${meta.color}33`,
            whiteSpace: 'nowrap',
            lineHeight: 1,
            cursor: exactChangedTooltip ? 'help' : 'default',
          }}
        >
          {meta.label}
        </span>
      </div>

      <ComboSideCard
        combo={comboB}
        variant={getVariantB(diff.status)}
        statusColor={meta.color}
        isDark={isDark}
        coveringSupersets={diff.status === 'a-only-covered' ? diff.coveringSupersets : undefined}
        baseKey={diff.status === 'a-only-covered' ? diff.key : undefined}
        referenceKey={isChanged ? keyA : undefined}
        diffMode={isChanged ? 'changed' : undefined}
        displayOptions={effectiveOpts}
      />

      <div
        className="combo-copy-btn"
        style={{ display: 'flex', justifyContent: 'center', paddingTop: 3, opacity: 0.35, transition: 'opacity 120ms' }}
      >
        <InlineCopyButton getText={getCopyText} tooltip="Copy combo comparison" />
      </div>

      {deltaBadges.labels.length > 0 && (
        <div style={DELTA_ROW_STYLE}>
          <span style={DELTA_PREFIX_STYLE}>Δ</span>
          {deltaBadges.labels.map((label, idx) => (
            <span
              key={`${label}-${idx}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 15,
                padding: '0 6px',
                borderRadius: 8,
                fontSize: '0.6rem',
                fontWeight: 600,
                color: deltaBadges.color,
                backgroundColor: deltaBadges.bg,
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── ComboGroupHeader ─────────────────────────────────────────────────────────

interface GroupCounts {
  exact: number;
  changed: number;
  covered: number;
  aUnique: number;
  bUnique: number;
}

const GROUP_BADGE_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 15,
  padding: '0 6px',
  borderRadius: 8,
  fontSize: '0.58rem',
  fontWeight: 700,
  fontFamily: MONO_FONT_FAMILY,
  whiteSpace: 'nowrap',
  lineHeight: 1,
};

const ComboGroupHeader = memo<{
  groupKey: string;
  title: string;
  totalCount: number;
  counts: GroupCounts;
  collapsed: boolean;
  onToggle: (groupKey: string) => void;
}>(({ groupKey, title, totalCount, counts, collapsed, onToggle }) => (
  <div style={{ paddingBottom: collapsed ? 4 : 3 }}>
    <div
      role="button"
      tabIndex={0}
      className="capa-combo-group"
      onClick={() => onToggle(groupKey)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(groupKey);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        padding: '4px 6px',
        borderRadius: 4,
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ fontWeight: 700, fontSize: '0.72rem', fontFamily: MONO_FONT_FAMILY, whiteSpace: 'nowrap' }}>
          {title}
        </span>
        <span style={{ flex: 1, height: 1, backgroundColor: 'currentColor', opacity: 0.14 }} />
        <span style={{ fontSize: '0.64rem', fontFamily: MONO_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', opacity: 0.55, whiteSpace: 'nowrap' }}>
          {totalCount}
        </span>
        {counts.aUnique > 0 && (
          <span style={{ ...GROUP_BADGE_BASE, color: DEVICE_COLOR.deviceA, backgroundColor: 'rgba(33,150,243,0.12)' }}>
            A:{counts.aUnique}
          </span>
        )}
        {counts.bUnique > 0 && (
          <span style={{ ...GROUP_BADGE_BASE, color: DEVICE_COLOR.deviceB, backgroundColor: 'rgba(20,184,166,0.12)' }}>
            B:{counts.bUnique}
          </span>
        )}
        {counts.changed > 0 && (
          <span style={{ ...GROUP_BADGE_BASE, color: STATUS_COLOR.amber, backgroundColor: 'rgba(245,158,11,0.12)' }}>
            Δ:{counts.changed}
          </span>
        )}
        {counts.covered > 0 && (
          <span style={{ ...GROUP_BADGE_BASE, color: STATUS_COLOR.indigo, backgroundColor: 'rgba(99,102,241,0.12)' }}>
            ↑:{counts.covered}
          </span>
        )}
        {counts.exact > 0 && (
          <span style={{ ...GROUP_BADGE_BASE, color: STATUS_COLOR.green, backgroundColor: 'rgba(16,185,129,0.10)' }}>
            ✓{counts.exact}
          </span>
        )}
      </div>
      {collapsed ? <ExpandMoreIcon sx={{ fontSize: 14, opacity: 0.5 }} /> : <ExpandLessIcon sx={{ fontSize: 14, opacity: 0.5 }} />}
    </div>
  </div>
));

// ─── ColHeader ───────────────────────────────────────────────────────────────

const ColHeader = memo<{ shortDeviceA: string; shortDeviceB: string }>(({ shortDeviceA, shortDeviceB }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 94px minmax(0, 1fr) 26px',
      gap: 4,
      padding: '3px 4px 5px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: `2px solid ${DEVICE_COLOR.deviceA}66`, paddingBottom: 2, minWidth: 0 }}>
      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: DEVICE_COLOR.deviceA }}>A</span>
      <span style={{ fontSize: '0.64rem', fontWeight: 700, color: DEVICE_COLOR.deviceA, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {shortDeviceA}
      </span>
    </div>
    <div />
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: `2px solid ${DEVICE_COLOR.deviceB}66`, paddingBottom: 2, minWidth: 0 }}>
      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: DEVICE_COLOR.deviceB }}>B</span>
      <span style={{ fontSize: '0.64rem', fontWeight: 700, color: DEVICE_COLOR.deviceB, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {shortDeviceB}
      </span>
    </div>
    <div />
  </div>
));

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

type FilterType = ComboFilterKey;
type GroupMode = 'ca' | 'status';

type VirtualComboItem =
  | { type: 'group'; key: string; groupKey: string; title: string; totalCount: number; counts: GroupCounts; collapsed: boolean }
  | { type: 'col-header'; key: string }
  | { type: 'row'; key: string; item: IndexedComboDiff };

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
  const [, startTransition] = useTransition();
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);

  const shortDeviceA = useMemo(() => shortenDeviceName(deviceAName, 'Device A'), [deviceAName]);
  const shortDeviceB = useMemo(() => shortenDeviceName(deviceBName, 'Device B'), [deviceBName]);

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

    const rawIndexed: IndexedComboDiff[] = comboDiffs.map(d => {
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

      const keyA = d.status === 'exact-changed' && d.a ? generateCombinationKey(d.a, DEFAULT_DISPLAY_OPTS) : d.key;
      const keyB = d.status === 'exact-changed' && d.b ? generateCombinationKey(d.b, DEFAULT_DISPLAY_OPTS) : d.key;
      const deltaBadges = (d.status === 'exact-changed' || d.status === 'a-only-covered' || d.status === 'b-only-covered')
        ? buildDeltaBadges(d)
        : { labels: [], color: STATUS_COLOR.amber, bg: 'rgba(245,158,11,0.1)' };
      const exactChangedTooltip = d.status === 'exact-changed' ? buildExactChangedTooltip(d) : undefined;
      const maxLen = Math.max(keyA.length, keyB.length);
      const estimatedHeight = 36 + (deltaBadges.labels.length > 0 ? 22 : 0) + (maxLen > 74 ? 18 : 0);

      const caGroupKey = isEndc
        ? `${eutraDlCc}LTE+${nrDlCc}NR·${d.caLevel}DL${d.ulLevel}UL`
        : `${d.caLevel}DL${d.ulLevel}UL`;
      const caGroupTitle = isEndc
        ? `${eutraDlCc}LTE + ${nrDlCc}NR · ${d.caLevel}DL${d.ulLevel}UL-ENDC`
        : `${d.caLevel}DL${d.ulLevel}UL-CA`;

      return {
        diff: d,
        keyA,
        keyB,
        lowerKey: d.key.toLowerCase(),
        bandKeys,
        eutraDlCc,
        nrDlCc,
        caGroupKey,
        caGroupTitle,
        naturalRank: 0,
        deltaBadges,
        exactChangedTooltip,
        estimatedHeight,
      };
    });

    // Compute natural key rank once so subsequent filter/group changes avoid repeated collator comparisons.
    const order = rawIndexed.map((_, i) => i);
    order.sort((a, b) => NATURAL_COLLATOR.compare(rawIndexed[a].diff.key, rawIndexed[b].diff.key));
    order.forEach((origIdx, rank) => {
      rawIndexed[origIdx].naturalRank = rank;
    });

    bandList.sort((a, b) => (a.ratType === b.ratType ? a.band - b.band : a.ratType === 'eutra' ? -1 : 1));
    return { counts: accCounts, allBandsInDiffs: bandList, indexedDiffs: rawIndexed };
  }, [comboDiffs, ratType]);

  const filter: FilterType =
    userFilter === 'exact-changed' && counts.exactChanged === 0
      ? (counts.diff > 0 ? 'diff' : 'all')
      : (userFilter ?? (counts.diff > 0 ? 'diff' : 'all'));

  const toggleBand = useCallback((key: string) => {
    startTransition(() => {
      setSelectedBands(prev => {
        const n = new Set(prev);
        if (n.has(key)) n.delete(key);
        else n.add(key);
        return n;
      });
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
    const accumulateCounts = (items: IndexedComboDiff[]): GroupCounts => {
      const c: GroupCounts = { exact: 0, changed: 0, covered: 0, aUnique: 0, bUnique: 0 };
      for (const item of items) {
        const s = item.diff.status;
        if (s === 'exact-same') c.exact++;
        else if (s === 'exact-changed') c.changed++;
        else if (s === 'a-only-covered' || s === 'b-only-covered') c.covered++;
        else if (s === 'a-only-unique') c.aUnique++;
        else c.bUnique++;
      }
      return c;
    };

    if (groupMode === 'status') {
      const byStatus = new Map<ComboDiff['status'], IndexedComboDiff[]>();
      for (const item of filtered) {
        let arr = byStatus.get(item.diff.status);
        if (!arr) { arr = []; byStatus.set(item.diff.status, arr); }
        arr.push(item);
      }
      return STATUS_GROUP_ORDER
        .filter(({ status }) => byStatus.has(status))
        .map(({ status, title }) => {
          const sortedItems = byStatus.get(status)!.sort((a, b) => {
            if (b.diff.caLevel !== a.diff.caLevel) return b.diff.caLevel - a.diff.caLevel;
            if (b.diff.ulLevel !== a.diff.ulLevel) return b.diff.ulLevel - a.diff.ulLevel;
            return a.naturalRank - b.naturalRank;
          });
          return { key: `status:${status}`, title, items: sortedItems, counts: accumulateCounts(sortedItems) };
        });
    }

    const grouped = new Map<string, { title: string; caLevel: number; ulLevel: number; eutraDlCc: number; nrDlCc: number; items: IndexedComboDiff[] }>();

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
          items: [],
        };
        grouped.set(item.caGroupKey, g);
      }
      g.items.push(item);
    }

    return [...grouped.entries()]
      .sort(([, a], [, b]) => {
        if (b.caLevel !== a.caLevel) return b.caLevel - a.caLevel;
        if (b.ulLevel !== a.ulLevel) return b.ulLevel - a.ulLevel;
        if (b.nrDlCc !== a.nrDlCc) return b.nrDlCc - a.nrDlCc;
        return b.eutraDlCc - a.eutraDlCc;
      })
      .map(([key, g]) => {
        g.items.sort((a, b) => {
          const rankDiff = (STATUS_SEVERITY_RANK[a.diff.status] ?? 9) - (STATUS_SEVERITY_RANK[b.diff.status] ?? 9);
          if (rankDiff !== 0) return rankDiff;
          return a.naturalRank - b.naturalRank;
        });
        return { key, title: g.title, items: g.items, counts: accumulateCounts(g.items) };
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

  const allCollapsed = groups.length > 0 && groups.every(g => collapsedGroups.has(g.key));
  const toggleAllGroups = useCallback(() => {
    if (allCollapsed) {
      setCollapsedGroups(new Set());
    } else {
      setCollapsedGroups(new Set(groups.map(g => g.key)));
    }
  }, [allCollapsed, groups]);

  const virtualItems = useMemo<VirtualComboItem[]>(() => {
    const flat: VirtualComboItem[] = [];
    for (const g of groups) {
      const collapsed = collapsedGroups.has(g.key);
      flat.push({
        type: 'group',
        key: `grp:${g.key}`,
        groupKey: g.key,
        title: g.title,
        totalCount: g.items.length,
        counts: g.counts,
        collapsed,
      });
      if (!collapsed) {
        flat.push({ type: 'col-header', key: `col:${g.key}` });
        for (const item of g.items) {
          flat.push({
            type: 'row',
            key: `row:${item.diff.status}:${item.diff.key}`,
            item,
          });
        }
      }
    }
    return flat;
  }, [groups, collapsedGroups]);

  const getVirtualKey = useCallback((v: VirtualComboItem) => v.key, []);
  const estimateVirtualHeight = useCallback((v: VirtualComboItem) => {
    if (v.type === 'group') return 32;
    if (v.type === 'col-header') return 26;
    return v.item.estimatedHeight;
  }, []);

  const renderVirtualItem = useCallback((v: VirtualComboItem) => {
    if (v.type === 'group') {
      return (
        <ComboGroupHeader
          groupKey={v.groupKey}
          title={v.title}
          totalCount={v.totalCount}
          counts={v.counts}
          collapsed={v.collapsed}
          onToggle={toggleGroup}
        />
      );
    }
    if (v.type === 'col-header') {
      return <ColHeader shortDeviceA={shortDeviceA} shortDeviceB={shortDeviceB} />;
    }
    return (
      <ComboRow
        item={v.item}
        isDark={isDark}
        displayOptions={displayOptions}
        shortDeviceA={shortDeviceA}
        shortDeviceB={shortDeviceB}
      />
    );
  }, [toggleGroup, shortDeviceA, shortDeviceB, isDark, displayOptions]);

  const resetScrollKey = `${ratType ?? ''}|${filter}|${groupMode}|${deferredSearch}|${selectedBandsArr.join(',')}`;

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
  const isFilteredView = filtered.length !== comboDiffs.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Pinned Filter + Grouping + Inline Coverage + Band Chips Toolbar */}
      <Box
        sx={{
          flexShrink: 0,
          zIndex: 5,
          pt: 1.25,
          pb: 0.75,
          px: 1.5,
          bgcolor: surface.toolbarBg,
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid',
          borderColor: surface.border,
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.85, mb: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
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
            onChange={(_, v) => {
              if (!v) return;
              startTransition(() => setUserFilter(v));
            }}
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
            onChange={(_, v) => {
              if (!v) return;
              startTransition(() => setGroupMode(v));
            }}
            size="small"
            sx={filterBtnSx}
          >
            <ToggleButton value="ca">{ratType === 'eutra-nr' ? 'xLTE+yNR' : 'CA Level'}</ToggleButton>
            <ToggleButton value="status">By Status</ToggleButton>
          </ToggleButtonGroup>

          {groups.length > 1 && (
            <Tooltip title={allCollapsed ? 'Expand all combo groups' : 'Collapse all combo groups'} arrow placement="top">
              <Button
                size="small"
                variant="outlined"
                onClick={toggleAllGroups}
                startIcon={allCollapsed ? <UnfoldMoreIcon sx={{ fontSize: 13 }} /> : <UnfoldLessIcon sx={{ fontSize: 13 }} />}
                sx={{
                  py: 0.2,
                  px: 0.75,
                  minHeight: 24,
                  fontSize: '0.64rem',
                  textTransform: 'none',
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '& .MuiButton-startIcon': { mr: 0.35 },
                }}
              >
                {allCollapsed ? 'Expand All' : 'Collapse All'}
              </Button>
            </Tooltip>
          )}

          {isFilteredView && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.64rem',
                fontFamily: MONO_FONT_FAMILY,
                fontVariantNumeric: 'tabular-nums',
                color: 'text.secondary',
              }}
            >
              {filtered.length} / {comboDiffs.length}
            </Typography>
          )}

          <InlineCoverageMeter coverage={coverage} />
        </Box>

        {/* Band filter chips + Symbol legend */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {allBandsInDiffs.length > 0 && (
              <BandFilterChips allBands={allBandsInDiffs} selected={effectiveSelectedBands} onToggle={toggleBand} onClear={() => startTransition(() => setSelectedBands(new Set()))} />
            )}
          </Box>
          <ComboSymbolLegend />
        </Box>
      </Box>

      {/* Groups list */}
      {filtered.length === 0 ? (
        <Box sx={{ p: 1.5, flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {filter === 'diff' && counts.diff === 0 ? (
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
          )}
        </Box>
      ) : (
        <VirtualList
          items={virtualItems}
          getItemKey={getVirtualKey}
          estimateHeight={estimateVirtualHeight}
          renderItem={renderVirtualItem}
          minContentWidth={540}
          overscan={10}
          threshold={80}
          resetScrollKey={resetScrollKey}
          sx={{
            px: 1.5,
            py: 1,
            '& .capa-combo-row:hover .combo-copy-btn, & .capa-combo-row:focus-within .combo-copy-btn': {
              opacity: '1 !important',
            },
            '& .capa-combo-group:hover': {
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
            },
          }}
        />
      )}
    </Box>
  );
};
