import React, { useState, useMemo, useDeferredValue, useContext, createContext, useCallback, useEffect } from 'react';
import {
  Box, Typography, Chip, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton,
  Accordion, AccordionSummary, AccordionDetails,
  Tooltip, Button, useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import BugReportIcon from '@mui/icons-material/BugReport';
import {
  buildUnclassifiedSpecIssueReport,
  type CommonCapaJson,
  type FeatureDiff,
  type FeatureKind,
  type FeatureLeaf,
  type RatFeaturesDiff,
  type RatType,
  type UnknownFeature,
} from '@ohmycapa/capa-core';

const OpenUrlContext = createContext<((url: string) => void) | undefined>(undefined);

// ─── Visual tokens (aligned across toolbar, accordions, badges, and cells) ──

const COLOR_SAME = '#10b981';
const COLOR_DIFF = '#f59e0b';
const COLOR_A = '#2196F3';
const COLOR_B = '#14b8a6';
const COLOR_AUTO = '#8b5cf6';

const COMPOUND_COMPARE_RANKS: Readonly<Record<string, number>> = {
  type1and2: 2,
  type1: 1,
  type2: 1,
  mode1andmode2: 3,
  mode1: 2,
  mode2: 1,
  both: 3,
  'non-contiguous': 2,
  contiguous: 1,
  fullcoherent: 3,
  partialandnoncoherent: 2,
  noncoherent: 1,
  oneandthree: 3,
  three: 2,
  one: 1,
};

// ─── Filter & expand types ────────────────────────────────────────────────────

type FilterMode = 'all' | 'diff' | 'a-only' | 'b-only';

interface ExpandSignal {
  mode: 'auto' | 'all' | 'none';
  version: number;
}

// ─── Formatting & 3GPP comparison helpers ─────────────────────────────────────

function shortenDeviceName(name: string | undefined, fallback: string): string {
  if (!name) return fallback;
  const stripped = name.replace(/\.(txt|json)$/i, '');
  return stripped.length > 26 ? `${stripped.slice(0, 24)}…` : stripped;
}

function formatValue(v: FeatureDiff['a'], kind: FeatureDiff['kind']): string {
  if (v === undefined || v === null) return '—';
  if (kind === 'bool' || kind === 'fgiBit' || kind === 'presence') {
    return v ? '✓' : '✗';
  }
  if ((kind === 'stringList' || kind === 'numberList') && Array.isArray(v)) {
    return v.length === 0 ? '(none)' : v.join(', ');
  }
  return String(v);
}

function formatBitStringTooltip(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.match(/^'([01]+)'B$/i);
  if (!m) return null;
  let setCount = 0;
  for (const ch of m[1]) {
    if (ch === '1') setCount++;
  }
  return `Binary bitmap: ${setCount}/${m[1].length} bits set`;
}

function valueColor(v: FeatureDiff['a'], kind: FeatureDiff['kind'], isDark: boolean): string {
  if (v === undefined) return isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
  if (kind === 'bool' || kind === 'fgiBit' || kind === 'presence') {
    return v ? COLOR_SAME : '#ef4444';
  }
  return 'inherit';
}

function parseCapabilityOrderRank(val: string): number | undefined {
  const lower = val.trim().toLowerCase().replace(/dot/g, '.');
  const pcMatch = lower.match(/^(?:pc|p?class|powerclass)[_-]?(\d+(?:\.\d+)?)$/);
  if (pcMatch) {
    const n = Number(pcMatch[1]);
    return Number.isFinite(n) && n > 0 ? 1000 - n : undefined;
  }
  const bitMatch = val.match(/^'([01]+)'B$/i);
  if (bitMatch) {
    let pop = 0;
    for (const ch of bitMatch[1]) {
      if (ch === '1') pop++;
    }
    return pop;
  }
  const compound = COMPOUND_COMPARE_RANKS[lower];
  if (compound !== undefined) return compound;

  const ordMatch = val.trim().match(/^(?:rel|n|p|upto|cs|b|kbps|tb|tf|am|sym|s|mhz|mws|kb|e)(\d+(?:dot\d+)?)$/i);
  if (ordMatch) {
    const n = Number(ordMatch[1].replace(/dot/i, '.'));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function getStrongerSide(diff: FeatureDiff): 'a' | 'b' | null {
  if (diff.status !== 'different') return null;
  const { a, b, kind, stringListDiff } = diff;

  if (kind === 'bool' || kind === 'presence' || kind === 'fgiBit') {
    if (Boolean(a) === Boolean(b)) return null;
    return a ? 'a' : 'b';
  }
  if (kind === 'number') {
    if (typeof a === 'number' && typeof b === 'number' && a !== b) {
      return a > b ? 'a' : 'b';
    }
    return null;
  }
  if ((kind === 'stringList' || kind === 'numberList') && stringListDiff) {
    if (stringListDiff.onlyInA.length > 0 && stringListDiff.onlyInB.length === 0) return 'a';
    if (stringListDiff.onlyInB.length > 0 && stringListDiff.onlyInA.length === 0) return 'b';
    return null;
  }
  if (kind === 'enum' && typeof a === 'string' && typeof b === 'string') {
    const ra = parseCapabilityOrderRank(a);
    const rb = parseCapabilityOrderRank(b);
    if (ra !== undefined && rb !== undefined && ra !== rb) {
      return ra > rb ? 'a' : 'b';
    }
  }
  return null;
}

function compareListLabelsNatural(x: string, y: string): number {
  const nx = Number(x);
  const ny = Number(y);
  if (Number.isFinite(nx) && Number.isFinite(ny)) return nx - ny;
  return x.localeCompare(y, undefined, { numeric: true });
}

function buildAutoIssueUrlFromEntries(
  items: Array<{
    major: string;
    middle: string;
    leaf: string;
    kind: FeatureKind;
    path?: string;
    description?: string;
    valueA?: unknown;
    valueB?: unknown;
  }>,
  ratType: RatType | undefined,
  deviceAName?: string,
  deviceBName?: string
) {
  const rat: RatType = ratType ?? 'nr';
  const unA: UnknownFeature[] = [];
  const unB: UnknownFeature[] = [];

  for (const item of items) {
    const path = item.path ?? `${item.middle}.${item.leaf}`;
    if (item.valueA !== undefined) {
      unA.push({
        major: item.major,
        middle: item.middle,
        leaf: item.leaf,
        path,
        kind: item.kind,
        value: item.valueA,
        codeSnippet: '',
        description: item.description,
      });
    }
    if (item.valueB !== undefined || item.valueA === undefined) {
      unB.push({
        major: item.major,
        middle: item.middle,
        leaf: item.leaf,
        path,
        kind: item.kind,
        value: item.valueB ?? item.valueA,
        codeSnippet: '',
        description: item.description,
      });
    }
  }

  const devices: CommonCapaJson[] = [];
  if (unA.length > 0) {
    devices.push({
      schemaVersion: '2.0',
      meta: {
        deviceName: deviceAName ?? 'Device A',
        fileName: deviceAName ?? 'device-a.txt',
        vendor: 'UNKNOWN',
        detectedRats: [rat],
      },
      rats: {},
      features: { [rat]: { leaves: [], unclassified: unA } },
      diagnostics: { warnings: [], errors: [] },
    });
  }
  if (unB.length > 0) {
    devices.push({
      schemaVersion: '2.0',
      meta: {
        deviceName: deviceBName ?? 'Device B',
        fileName: deviceBName ?? 'device-b.txt',
        vendor: 'UNKNOWN',
        detectedRats: [rat],
      },
      rats: {},
      features: { [rat]: { leaves: [], unclassified: unB } },
      diagnostics: { warnings: [], errors: [] },
    });
  }

  return buildUnclassifiedSpecIssueReport(devices, { ratFilter: rat });
}

function openExternalReportUrl(url: string, openUrl?: (u: string) => void) {
  if (openUrl) {
    openUrl(url);
  } else if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// ─── Single feature diff row ──────────────────────────────────────────────────

interface FeatureRowProps {
  diff: FeatureDiff;
  isDark: boolean;
}

const FeatureRow = React.memo<FeatureRowProps>(({ diff, isDark }) => {
  const openUrl = useContext(OpenUrlContext);
  const { leaf, kind, status, a, b, description, path, autoDiscovered, stringListDiff } = diff;

  const strongerSide = useMemo(() => getStrongerSide(diff), [diff]);

  const rowBg = useMemo(() => {
    if (status === 'same') return 'transparent';
    if (status === 'different') return 'rgba(245,158,11,0.07)';
    if (status === 'a-only') return isDark ? 'rgba(33,150,243,0.08)' : 'rgba(33,150,243,0.06)';
    if (status === 'b-only') return isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.06)';
    return 'transparent';
  }, [status, isDark]);

  const statusChip = useMemo(() => {
    if (status === 'same') return null;
    const cfg: Record<string, { label: string; color: string }> = {
      'different': { label: 'Diff',   color: COLOR_DIFF },
      'a-only':    { label: 'A only', color: COLOR_A },
      'b-only':    { label: 'B only', color: COLOR_B },
    };
    const c = cfg[status];
    if (!c) return null;
    return (
      <Chip
        label={c.label}
        size="small"
        sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700, color: c.color, bgcolor: `${c.color}22`, ml: 0.25 }}
      />
    );
  }, [status]);

  const renderScalarCell = (side: 'a' | 'b') => {
    const v = side === 'a' ? a : b;
    const absent = side === 'a' ? status === 'b-only' : status === 'a-only';
    const isStronger = strongerSide === side;
    const bitTip = !absent ? formatBitStringTooltip(v) : null;
    const sideColor = side === 'a' ? COLOR_A : COLOR_B;

    const textEl = (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            fontWeight: absent ? 400 : isStronger ? 700 : 600,
            color: absent
              ? (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)')
              : status === (side === 'a' ? 'a-only' : 'b-only')
                ? sideColor
                : valueColor(v, kind, isDark),
          }}
        >
          {absent ? '—' : formatValue(v, kind)}
        </Typography>
        {isStronger && (
          <Tooltip title="Higher 3GPP capability value" placement="top" arrow>
            <Box
              component="span"
              sx={{
                fontSize: '0.62rem',
                fontWeight: 800,
                color: COLOR_SAME,
                lineHeight: 1,
                px: 0.35,
                py: 0.1,
                borderRadius: 0.5,
                bgcolor: 'rgba(16,185,129,0.14)',
              }}
            >
              ▲
            </Box>
          </Tooltip>
        )}
      </Box>
    );

    return bitTip ? (
      <Tooltip title={bitTip} placement="top" arrow>
        <span>{textEl}</span>
      </Tooltip>
    ) : textEl;
  };

  const subtitle = description ?? path;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '2.2fr 1fr 1fr',
        minHeight: 34,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: rowBg,
        alignItems: 'center',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      {/* Leaf name & 3GPP metadata */}
      <Box sx={{ px: 1.5, py: 0.5, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}>
            {leaf}
          </Typography>
          {autoDiscovered && (
            <Tooltip title={path ? `Auto-classified from ASN.1 path: ${path}` : 'Auto-classified 3GPP feature'} placement="top" arrow>
              <Chip
                label="AUTO"
                size="small"
                sx={{
                  height: 14, fontSize: '0.55rem', fontWeight: 700,
                  bgcolor: `${COLOR_AUTO}22`, color: COLOR_AUTO,
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            </Tooltip>
          )}
          {description && (
            <>
              <Tooltip title={path ? `${description}\nASN.1: ${path}` : description} placement="top" arrow>
                <InfoOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled', cursor: 'default', flexShrink: 0 }} />
              </Tooltip>
              <Tooltip title={`Search 3GPP spec: ${description}`} placement="top" arrow>
                <OpenInNewIcon
                  sx={{ fontSize: 12, color: 'primary.main', cursor: 'pointer', flexShrink: 0, opacity: 0.65, '&:hover': { opacity: 1 } }}
                  onClick={() => {
                    const query = encodeURIComponent(description);
                    openExternalReportUrl(`https://www.google.com/search?q=${query}`, openUrl);
                  }}
                />
              </Tooltip>
            </>
          )}
          {statusChip}
        </Box>
        {subtitle && (
          <Tooltip title={path ? `${subtitle}${subtitle !== path ? ` · ${path}` : ''}` : subtitle} placement="bottom-start" arrow>
            <Typography
              sx={{
                fontSize: '0.64rem',
                color: 'text.secondary',
                opacity: 0.78,
                lineHeight: 1.25,
                mt: 0.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {subtitle}
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* A value */}
      <Box sx={{ px: 1.5, py: 0.5, borderLeft: '1px solid', borderColor: 'divider' }}>
        {(kind === 'stringList' || kind === 'numberList') && stringListDiff ? (
          <StringListCell slDiff={stringListDiff} side="a" isDark={isDark} isStronger={strongerSide === 'a'} />
        ) : renderScalarCell('a')}
      </Box>

      {/* B value */}
      <Box sx={{ px: 1.5, py: 0.5, borderLeft: '1px solid', borderColor: 'divider' }}>
        {(kind === 'stringList' || kind === 'numberList') && stringListDiff ? (
          <StringListCell slDiff={stringListDiff} side="b" isDark={isDark} isStronger={strongerSide === 'b'} />
        ) : renderScalarCell('b')}
      </Box>
    </Box>
  );
});

// ─── StringList diff cell ────────────────────────────────────────────────────

interface StringListCellProps {
  slDiff: NonNullable<FeatureDiff['stringListDiff']>;
  side: 'a' | 'b';
  isDark: boolean;
  isStronger?: boolean;
}

const StringListCell = React.memo<StringListCellProps>(({ slDiff, side, isDark, isStronger }) => {
  const unique = side === 'a' ? slDiff.onlyInA : slDiff.onlyInB;
  const common = slDiff.common;
  const sideColor = side === 'a' ? COLOR_A : COLOR_B;

  const sortedItems = useMemo(() => {
    const uniqueSet = new Set(unique);
    const merged = [
      ...common.map(v => ({ v, unique: false })),
      ...unique.filter(v => !common.includes(v)).map(v => ({ v, unique: true })),
    ];
    merged.sort((x, y) => compareListLabelsNatural(x.v, y.v));
    return merged.map(item => ({ v: item.v, unique: item.unique || uniqueSet.has(item.v) }));
  }, [common, unique]);

  if (sortedItems.length === 0) {
    return <Typography sx={{ fontSize: '0.8rem', opacity: 0.35 }}>—</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, alignItems: 'center' }}>
        {sortedItems.map(({ v, unique: isUnique }) => (
          <Chip
            key={v}
            label={isUnique ? `+${v}` : v}
            size="small"
            sx={{
              height: 16,
              fontSize: '0.64rem',
              fontFamily: 'monospace',
              fontWeight: isUnique ? 700 : 500,
              bgcolor: isUnique
                ? `${sideColor}22`
                : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
              color: isUnique ? sideColor : 'text.secondary',
              border: isUnique ? `1px solid ${sideColor}55` : 'none',
            }}
          />
        ))}
        {isStronger && (
          <Tooltip title="Superset capability list" placement="top" arrow>
            <Box
              component="span"
              sx={{
                fontSize: '0.6rem', fontWeight: 800, color: COLOR_SAME,
                px: 0.35, py: 0.1, borderRadius: 0.5, bgcolor: 'rgba(16,185,129,0.14)',
              }}
            >
              ▲
            </Box>
          </Tooltip>
        )}
      </Box>
      {(sortedItems.length > 4 || unique.length > 0) && (
        <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled' }}>
          {sortedItems.length} total{unique.length > 0 ? ` · +${unique.length} unique` : ''}
        </Typography>
      )}
    </Box>
  );
});

// ─── Middle-level sub-section ────────────────────────────────────────────────

interface MiddleSectionProps {
  middle: string;
  diffs: FeatureDiff[];
  isDark: boolean;
}

const MiddleSection = React.memo<MiddleSectionProps>(({ middle, diffs, isDark }) => {
  const diffOnly = diffs.filter(d => d.status === 'different').length;
  const aOnly = diffs.filter(d => d.status === 'a-only').length;
  const bOnly = diffs.filter(d => d.status === 'b-only').length;

  return (
    <Box sx={{ mb: 0.5 }}>
      <Box
        sx={{
          px: 1.5, py: 0.45,
          bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex', alignItems: 'center', gap: 0.6,
        }}
      >
        <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {middle}
        </Typography>
        <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
          ({diffs.length})
        </Typography>
        {diffOnly > 0 && (
          <Chip label={`${diffOnly} diff`} size="small"
            sx={{ height: 14, fontSize: '0.56rem', fontWeight: 700, bgcolor: 'rgba(245,158,11,0.15)', color: COLOR_DIFF }} />
        )}
        {aOnly > 0 && (
          <Chip label={`${aOnly} A`} size="small"
            sx={{ height: 14, fontSize: '0.56rem', fontWeight: 700, bgcolor: 'rgba(33,150,243,0.15)', color: COLOR_A }} />
        )}
        {bOnly > 0 && (
          <Chip label={`${bOnly} B`} size="small"
            sx={{ height: 14, fontSize: '0.56rem', fontWeight: 700, bgcolor: 'rgba(20,184,166,0.15)', color: COLOR_B }} />
        )}
      </Box>
      {diffs.map((d) => (
        <FeatureRow key={`${d.major}|${d.middle}|${d.leaf}`} diff={d} isDark={isDark} />
      ))}
    </Box>
  );
});

// ─── Major-level accordion ───────────────────────────────────────────────────

interface MajorAccordionProps {
  major: string;
  diffs: FeatureDiff[];
  isDark: boolean;
  defaultExpanded: boolean;
  expandSignal: ExpandSignal;
  headerA: string;
  headerB: string;
  fullNameA?: string;
  fullNameB?: string;
}

const MajorAccordion = React.memo<MajorAccordionProps>(({
  major, diffs, isDark, defaultExpanded, expandSignal, headerA, headerB, fullNameA, fullNameB,
}) => {
  const FGI_MIDDLE_ORDER_LOCAL = ['FGI-Rel9', 'FGI-Rel9-Add', 'FGI-Rel10'];
  const diffOnly = diffs.filter(d => d.status === 'different').length;
  const aOnly = diffs.filter(d => d.status === 'a-only').length;
  const bOnly = diffs.filter(d => d.status === 'b-only').length;

  const middles = useMemo(() => {
    const map = new Map<string, FeatureDiff[]>();
    for (const d of diffs) {
      const arr = map.get(d.middle) ?? [];
      arr.push(d);
      map.set(d.middle, arr);
    }
    if (major === 'FeatureGroupIndicators') {
      const sorted = new Map<string, FeatureDiff[]>();
      for (const key of FGI_MIDDLE_ORDER_LOCAL) {
        if (map.has(key)) sorted.set(key, map.get(key)!);
      }
      for (const [key, val] of map.entries()) {
        if (!sorted.has(key)) sorted.set(key, val);
      }
      return sorted;
    }
    return map;
  }, [diffs, major]);

  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (expandSignal.mode === 'all') setLocalExpanded(true);
    else if (expandSignal.mode === 'none') setLocalExpanded(false);
    else setLocalExpanded(defaultExpanded);
  }, [expandSignal.mode, expandSignal.version, defaultExpanded]);

  return (
    <Accordion
      expanded={localExpanded}
      onChange={() => setLocalExpanded(!localExpanded)}
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '6px !important',
        mb: 0.75,
        overflow: 'hidden',
        '&:before': { display: 'none' },
        '& .MuiAccordionSummary-root': { minHeight: 34, px: 1.5 },
        '& .MuiAccordionSummary-content': { my: 0.5 },
        '& .MuiAccordionDetails-root': { p: 0 },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: 'text.primary' }}>
            {major}
          </Typography>
          <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>
            ({diffs.length} items)
          </Typography>
          {diffOnly > 0 && (
            <Chip label={`${diffOnly} diff`} size="small"
              sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(245,158,11,0.15)', color: COLOR_DIFF }} />
          )}
          {aOnly > 0 && (
            <Chip label={`${aOnly} A-only`} size="small"
              sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(33,150,243,0.15)', color: COLOR_A }} />
          )}
          {bOnly > 0 && (
            <Chip label={`${bOnly} B-only`} size="small"
              sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(20,184,166,0.15)', color: COLOR_B }} />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {/* Column header with actual device names */}
        <Box sx={{
          display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr',
          borderBottom: '1px solid', borderColor: 'divider',
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        }}>
          <Typography sx={{ px: 1.5, py: 0.5, fontSize: '0.66rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Feature / 3GPP Spec
          </Typography>
          <Tooltip title={fullNameA ?? 'Device A'} placement="top" arrow>
            <Typography sx={{
              px: 1.5, py: 0.5, fontSize: '0.66rem', fontWeight: 700, color: COLOR_A,
              borderLeft: '1px solid', borderColor: 'divider',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              A · {headerA}
            </Typography>
          </Tooltip>
          <Tooltip title={fullNameB ?? 'Device B'} placement="top" arrow>
            <Typography sx={{
              px: 1.5, py: 0.5, fontSize: '0.66rem', fontWeight: 700, color: COLOR_B,
              borderLeft: '1px solid', borderColor: 'divider',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              B · {headerB}
            </Typography>
          </Tooltip>
        </Box>
        {Array.from(middles.entries()).map(([middle, mDiffs]) => (
          <MiddleSection
            key={middle}
            middle={middle}
            diffs={mDiffs}
            isDark={isDark}
          />
        ))}
      </AccordionDetails>
    </Accordion>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────

export interface FeaturesCompareViewProps {
  featuresDiff: RatFeaturesDiff;
  deviceAName?: string;
  deviceBName?: string;
  ratType?: RatType;
  onOpenUrl?: (url: string) => void;
}

const FeaturesCompareViewInner = React.memo<FeaturesCompareViewProps>(({
  featuresDiff,
  deviceAName,
  deviceBName,
  ratType,
  onOpenUrl,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { counts } = featuresDiff;
  const totalDiff = counts.different + counts.aOnly + counts.bOnly;

  const [userFilter, setUserFilter] = useState<FilterMode | null>(null);
  const filter: FilterMode = userFilter ?? (totalDiff > 0 ? 'diff' : 'all');
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [expandSignal, setExpandSignal] = useState<ExpandSignal>({ mode: 'auto', version: 0 });
  const [reportedToast, setReportedToast] = useState(false);

  const headerA = useMemo(() => shortenDeviceName(deviceAName, 'Device A'), [deviceAName]);
  const headerB = useMemo(() => shortenDeviceName(deviceBName, 'Device B'), [deviceBName]);

  const statusAndSearchFiltered = useMemo(() => {
    let diffs = featuresDiff.diffs;
    if (filter === 'diff') diffs = diffs.filter(d => d.status !== 'same');
    else if (filter === 'a-only') diffs = diffs.filter(d => d.status === 'a-only');
    else if (filter === 'b-only') diffs = diffs.filter(d => d.status === 'b-only');

    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      diffs = diffs.filter(d =>
        d.leaf.toLowerCase().includes(q) ||
        d.major.toLowerCase().includes(q) ||
        d.middle.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q) ||
        (d.path ?? '').toLowerCase().includes(q) ||
        formatValue(d.a, d.kind).toLowerCase().includes(q) ||
        formatValue(d.b, d.kind).toLowerCase().includes(q)
      );
    }
    return diffs;
  }, [featuresDiff.diffs, filter, deferredSearch]);

  const majorPills = useMemo(() => {
    const countsByMajor = new Map<string, { total: number; diffs: number }>();
    for (const d of statusAndSearchFiltered) {
      const cur = countsByMajor.get(d.major) ?? { total: 0, diffs: 0 };
      cur.total++;
      if (d.status !== 'same') cur.diffs++;
      countsByMajor.set(d.major, cur);
    }
    return Array.from(countsByMajor.entries()).map(([major, stat]) => ({ major, ...stat }));
  }, [statusAndSearchFiltered]);

  const activeMajor = useMemo(() => {
    if (!selectedMajor) return null;
    return majorPills.some(p => p.major === selectedMajor) ? selectedMajor : null;
  }, [selectedMajor, majorPills]);

  const filtered = useMemo(() => {
    if (!activeMajor) return statusAndSearchFiltered;
    return statusAndSearchFiltered.filter(d => d.major === activeMajor);
  }, [statusAndSearchFiltered, activeMajor]);

  const byMajor = useMemo(() => {
    const map = new Map<string, FeatureDiff[]>();
    for (const d of filtered) {
      const arr = map.get(d.major) ?? [];
      arr.push(d);
      map.set(d.major, arr);
    }
    return map;
  }, [filtered]);

  const autoDiscoveredDiffs = useMemo(
    () => featuresDiff.diffs.filter(d => d.autoDiscovered),
    [featuresDiff.diffs]
  );

  const handleReportAutoSpecs = useCallback(() => {
    if (autoDiscoveredDiffs.length === 0) return;
    const report = buildAutoIssueUrlFromEntries(
      autoDiscoveredDiffs.map(d => ({
        major: d.major,
        middle: d.middle,
        leaf: d.leaf,
        kind: d.kind,
        path: d.path,
        description: d.description,
        valueA: d.a,
        valueB: d.b,
      })),
      ratType,
      deviceAName,
      deviceBName
    );
    navigator.clipboard?.writeText(report.markdownBody).catch(() => {});
    setReportedToast(true);
    setTimeout(() => setReportedToast(false), 2500);
    openExternalReportUrl(report.issueUrl, onOpenUrl);
  }, [autoDiscoveredDiffs, ratType, deviceAName, deviceBName, onOpenUrl]);

  return (
    <Box>
      {/* Sticky Unified Filter + Search + Category Quick-Filter Bar */}
      <Box sx={{
        position: 'sticky',
        top: -12,
        zIndex: 5,
        pt: 1.5,
        pb: 0.75,
        mx: -1.5,
        px: 1.5,
        mb: 1.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        bgcolor: isDark ? 'rgba(24,24,27,0.94)' : 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={filter}
              onChange={(_, v) => {
                if (v) {
                  setUserFilter(v);
                  setExpandSignal(s => ({ mode: 'auto', version: s.version + 1 }));
                }
              }}
              sx={{ '& .MuiToggleButton-root': { py: 0.2, px: 0.85, fontSize: '0.64rem', textTransform: 'none', minHeight: 24 } }}
            >
              <ToggleButton value="diff">Diff ({totalDiff})</ToggleButton>
              <ToggleButton value="a-only">A-only ({counts.aOnly})</ToggleButton>
              <ToggleButton value="b-only">B-only ({counts.bOnly})</ToggleButton>
              <ToggleButton value="all">All ({featuresDiff.diffs.length})</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              size="small"
              placeholder="Search feature, path, value..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14 }} /></InputAdornment>,
                  sx: { fontSize: '0.72rem', height: 26 },
                },
              }}
              sx={{ width: 220 }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.65, flexWrap: 'wrap' }}>
            {byMajor.size > 1 && (
              <>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<UnfoldMoreIcon sx={{ fontSize: 13 }} />}
                  onClick={() => setExpandSignal(s => ({ mode: 'all', version: s.version + 1 }))}
                  sx={{ fontSize: '0.6rem', py: 0.1, px: 0.6, minHeight: 22, minWidth: 0, textTransform: 'none', color: 'text.secondary' }}
                >
                  Expand All
                </Button>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<UnfoldLessIcon sx={{ fontSize: 13 }} />}
                  onClick={() => setExpandSignal(s => ({ mode: 'none', version: s.version + 1 }))}
                  sx={{ fontSize: '0.6rem', py: 0.1, px: 0.6, minHeight: 22, minWidth: 0, textTransform: 'none', color: 'text.secondary' }}
                >
                  Collapse All
                </Button>
              </>
            )}

            <Chip label={`${counts.same} exact`} size="small"
              sx={{ height: 17, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(16,185,129,0.1)', color: COLOR_SAME }} />
            {counts.different > 0 && (
              <Chip label={`${counts.different} diff`} size="small"
                sx={{ height: 17, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(245,158,11,0.12)', color: COLOR_DIFF }} />
            )}
            {counts.aOnly > 0 && (
              <Chip label={`${counts.aOnly} A-only`} size="small"
                sx={{ height: 17, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(33,150,243,0.12)', color: COLOR_A }} />
            )}
            {counts.bOnly > 0 && (
              <Chip label={`${counts.bOnly} B-only`} size="small"
                sx={{ height: 17, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(20,184,166,0.12)', color: COLOR_B }} />
            )}
            {totalDiff === 0 && (
              <Typography sx={{ fontSize: '0.64rem', color: COLOR_SAME, fontWeight: 600 }}>All match</Typography>
            )}

            {autoDiscoveredDiffs.length > 0 && (
              <Tooltip title="Report auto-discovered specs to GitHub & open PR automation (payload copied to clipboard)" placement="top" arrow>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<BugReportIcon sx={{ fontSize: 13 }} />}
                  onClick={handleReportAutoSpecs}
                  sx={{
                    height: 22,
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 1.5,
                    color: COLOR_AUTO,
                    borderColor: `${COLOR_AUTO}66`,
                    bgcolor: `${COLOR_AUTO}10`,
                    '&:hover': { borderColor: COLOR_AUTO, bgcolor: `${COLOR_AUTO}1f` },
                  }}
                >
                  {reportedToast ? 'Copied & Opening GitHub…' : `+${autoDiscoveredDiffs.length} New Spec${autoDiscoveredDiffs.length > 1 ? 's' : ''} · Report to GitHub`}
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Category Quick-Filter Pill Bar */}
        {majorPills.length > 1 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={`All Categories (${statusAndSearchFiltered.length})`}
              size="small"
              clickable
              onClick={() => setSelectedMajor(null)}
              sx={{
                height: 19,
                fontSize: '0.62rem',
                fontWeight: activeMajor === null ? 700 : 500,
                bgcolor: activeMajor === null ? 'primary.main' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                color: activeMajor === null ? 'primary.contrastText' : 'text.secondary',
              }}
            />
            {majorPills.map(({ major, total }) => {
              const selected = activeMajor === major;
              return (
                <Chip
                  key={major}
                  label={`${major} (${total})`}
                  size="small"
                  clickable
                  onClick={() => setSelectedMajor(selected ? null : major)}
                  sx={{
                    height: 19,
                    fontSize: '0.62rem',
                    fontWeight: selected ? 700 : 500,
                    bgcolor: selected ? 'primary.main' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                    color: selected ? 'primary.contrastText' : 'text.secondary',
                  }}
                />
              );
            })}
          </Box>
        )}
      </Box>

      {/* Accordion list */}
      {byMajor.size === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
          <Typography variant="body2">No features match the current filter</Typography>
        </Box>
      ) : (
        Array.from(byMajor.entries()).map(([major, diffs], idx) => (
          <MajorAccordion
            key={major}
            major={major}
            diffs={diffs}
            isDark={isDark}
            defaultExpanded={filter !== 'all' || activeMajor !== null || idx === 0}
            expandSignal={expandSignal}
            headerA={headerA}
            headerB={headerB}
            fullNameA={deviceAName}
            fullNameB={deviceBName}
          />
        ))
      )}
    </Box>
  );
});

export const FeaturesCompareView = React.memo<FeaturesCompareViewProps>((props) => (
  <OpenUrlContext.Provider value={props.onOpenUrl}>
    <FeaturesCompareViewInner {...props} />
  </OpenUrlContext.Provider>
));

// ─── Single device features view ─────────────────────────────────────────────

interface SingleFeatureRowProps {
  leaf: FeatureLeaf;
}

const SingleFeatureRow = React.memo<SingleFeatureRowProps>(({ leaf: l }) => {
  const openUrl = useContext(OpenUrlContext);
  const isBool = l.kind === 'bool' || l.kind === 'fgiBit' || l.kind === 'presence';
  const displayVal = (l.kind === 'stringList' || l.kind === 'numberList') && Array.isArray(l.value)
    ? (l.value.length === 0 ? '(none)' : l.value.join(', '))
    : isBool ? (l.value ? '✓' : '✗') : String(l.value ?? '—');
  const subtitle = l.description ?? l.path;

  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: '2.2fr 1fr',
      minHeight: 34, borderBottom: '1px solid', borderColor: 'divider',
      alignItems: 'center', '&:last-child': { borderBottom: 'none' },
    }}>
      <Box sx={{ px: 1.5, py: 0.5, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.primary' }}>{l.leaf}</Typography>
          {l.autoDiscovered && (
            <Tooltip title={l.path ? `Auto-classified from ASN.1 path: ${l.path}` : 'Auto-classified 3GPP feature'} placement="top" arrow>
              <Chip
                label="AUTO"
                size="small"
                sx={{
                  height: 14, fontSize: '0.55rem', fontWeight: 700,
                  bgcolor: `${COLOR_AUTO}22`, color: COLOR_AUTO,
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            </Tooltip>
          )}
          {l.description && (
            <>
              <Tooltip title={l.path ? `${l.description}\nASN.1: ${l.path}` : l.description} placement="top" arrow>
                <InfoOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
              </Tooltip>
              <Tooltip title={`Search 3GPP spec: ${l.description}`} placement="top" arrow>
                <OpenInNewIcon
                  sx={{ fontSize: 12, color: 'primary.main', cursor: 'pointer', opacity: 0.65, '&:hover': { opacity: 1 } }}
                  onClick={() => {
                    const query = encodeURIComponent(l.description!);
                    openExternalReportUrl(`https://www.google.com/search?q=${query}`, openUrl);
                  }}
                />
              </Tooltip>
            </>
          )}
        </Box>
        {subtitle && (
          <Typography
            sx={{
              fontSize: '0.64rem',
              color: 'text.secondary',
              opacity: 0.78,
              lineHeight: 1.25,
              mt: 0.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ px: 1.5, py: 0.5, borderLeft: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{
          fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 600,
          color: isBool ? (l.value ? COLOR_SAME : '#ef4444') : 'text.primary',
        }}>
          {displayVal}
        </Typography>
      </Box>
    </Box>
  );
});

export interface SingleDeviceFeaturesViewProps {
  leaves: FeatureLeaf[];
  ratType?: RatType;
  onOpenUrl?: (url: string) => void;
}

export const SingleDeviceFeaturesView = React.memo<SingleDeviceFeaturesViewProps>(({ leaves, ratType, onOpenUrl }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [search, setSearch] = useState('');
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [reportedToast, setReportedToast] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const searchFiltered = useMemo(() => {
    if (!deferredSearch.trim()) return leaves;
    const q = deferredSearch.toLowerCase();
    return leaves.filter(l =>
      l.leaf.toLowerCase().includes(q) ||
      l.major.toLowerCase().includes(q) ||
      l.middle.toLowerCase().includes(q) ||
      (l.description ?? '').toLowerCase().includes(q) ||
      (l.path ?? '').toLowerCase().includes(q)
    );
  }, [leaves, deferredSearch]);

  const majorPills = useMemo(() => {
    const countsByMajor = new Map<string, number>();
    for (const l of searchFiltered) {
      countsByMajor.set(l.major, (countsByMajor.get(l.major) ?? 0) + 1);
    }
    return Array.from(countsByMajor.entries()).map(([major, total]) => ({ major, total }));
  }, [searchFiltered]);

  const activeMajor = useMemo(() => {
    if (!selectedMajor) return null;
    return majorPills.some(p => p.major === selectedMajor) ? selectedMajor : null;
  }, [selectedMajor, majorPills]);

  const filtered = useMemo(() => {
    if (!activeMajor) return searchFiltered;
    return searchFiltered.filter(l => l.major === activeMajor);
  }, [searchFiltered, activeMajor]);

  const FGI_MIDDLE_ORDER = ['FGI-Rel9', 'FGI-Rel9-Add', 'FGI-Rel10'];

  const byMajor = useMemo(() => {
    const map = new Map<string, Map<string, typeof filtered>>();
    for (const l of filtered) {
      if (!map.has(l.major)) map.set(l.major, new Map());
      const midMap = map.get(l.major)!;
      if (!midMap.has(l.middle)) midMap.set(l.middle, []);
      midMap.get(l.middle)!.push(l);
    }
    // Ensure FGI middles appear in canonical order regardless of filter state
    for (const [major, midMap] of map.entries()) {
      if (major === 'FeatureGroupIndicators') {
        const sorted = new Map<string, typeof filtered>();
        for (const key of FGI_MIDDLE_ORDER) {
          if (midMap.has(key)) sorted.set(key, midMap.get(key)!);
        }
        for (const [key, val] of midMap.entries()) {
          if (!sorted.has(key)) sorted.set(key, val);
        }
        map.set(major, sorted);
      }
    }
    return map;
  }, [filtered]);

  const autoDiscoveredLeaves = useMemo(
    () => leaves.filter(l => l.autoDiscovered),
    [leaves]
  );

  const handleReportAutoSpecs = useCallback(() => {
    if (autoDiscoveredLeaves.length === 0) return;
    const report = buildAutoIssueUrlFromEntries(
      autoDiscoveredLeaves.map(l => ({
        major: l.major,
        middle: l.middle,
        leaf: l.leaf,
        kind: l.kind,
        path: l.path,
        description: l.description,
        valueA: l.value,
      })),
      ratType
    );
    navigator.clipboard?.writeText(report.markdownBody).catch(() => {});
    setReportedToast(true);
    setTimeout(() => setReportedToast(false), 2500);
    openExternalReportUrl(report.issueUrl, onOpenUrl);
  }, [autoDiscoveredLeaves, ratType, onOpenUrl]);

  return (
    <OpenUrlContext.Provider value={onOpenUrl}>
    <Box>
      {/* Sticky Search + Count + Category Quick-Filter Toolbar */}
      <Box sx={{
        position: 'sticky',
        top: -12,
        zIndex: 5,
        pt: 1.5,
        pb: 0.75,
        mx: -1.5,
        px: 1.5,
        mb: 1.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        bgcolor: isDark ? 'rgba(24,24,27,0.94)' : 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search feature, path..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14 }} /></InputAdornment>,
                sx: { fontSize: '0.72rem', height: 26 },
              },
            }}
            sx={{ width: 220 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Chip
              size="small"
              label={filtered.length < leaves.length ? `${filtered.length} / ${leaves.length} features` : `${leaves.length} features`}
              sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}
            />
            {autoDiscoveredLeaves.length > 0 && (
              <Tooltip title="Report auto-discovered specs to GitHub (payload copied to clipboard)" placement="top" arrow>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<BugReportIcon sx={{ fontSize: 13 }} />}
                  onClick={handleReportAutoSpecs}
                  sx={{
                    height: 22,
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 1.5,
                    color: COLOR_AUTO,
                    borderColor: `${COLOR_AUTO}66`,
                    bgcolor: `${COLOR_AUTO}10`,
                    '&:hover': { borderColor: COLOR_AUTO, bgcolor: `${COLOR_AUTO}1f` },
                  }}
                >
                  {reportedToast ? 'Copied & Opening GitHub…' : `+${autoDiscoveredLeaves.length} New Spec${autoDiscoveredLeaves.length > 1 ? 's' : ''} · Report to GitHub`}
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>

        {majorPills.length > 1 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={`All Categories (${searchFiltered.length})`}
              size="small"
              clickable
              onClick={() => setSelectedMajor(null)}
              sx={{
                height: 19,
                fontSize: '0.62rem',
                fontWeight: activeMajor === null ? 700 : 500,
                bgcolor: activeMajor === null ? 'primary.main' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                color: activeMajor === null ? 'primary.contrastText' : 'text.secondary',
              }}
            />
            {majorPills.map(({ major, total }) => {
              const selected = activeMajor === major;
              return (
                <Chip
                  key={major}
                  label={`${major} (${total})`}
                  size="small"
                  clickable
                  onClick={() => setSelectedMajor(selected ? null : major)}
                  sx={{
                    height: 19,
                    fontSize: '0.62rem',
                    fontWeight: selected ? 700 : 500,
                    bgcolor: selected ? 'primary.main' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                    color: selected ? 'primary.contrastText' : 'text.secondary',
                  }}
                />
              );
            })}
          </Box>
        )}
      </Box>

      {Array.from(byMajor.entries()).map(([major, midMap], idx) => (
        <Accordion key={major} defaultExpanded={activeMajor !== null || idx === 0} disableGutters elevation={0}
          sx={{
            border: '1px solid', borderColor: 'divider', borderRadius: '6px !important', mb: 0.75,
            overflow: 'hidden', '&:before': { display: 'none' },
            '& .MuiAccordionSummary-root': { minHeight: 32, px: 1.5 },
            '& .MuiAccordionSummary-content': { my: 0.5 },
            '& .MuiAccordionDetails-root': { p: 0 },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{major}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {Array.from(midMap.entries()).map(([middle, mLeaves]) => (
              <Box key={middle} sx={{ mb: 0.5 }}>
                <Box sx={{ px: 1.5, py: 0.5, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{middle}</Typography>
                </Box>
                {mLeaves.map((l) => (
                  <SingleFeatureRow key={`${l.major}|${l.middle}|${l.leaf}`} leaf={l} />
                ))}
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {byMajor.size === 0 && (
        <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
          <Typography variant="body2">No features found</Typography>
        </Box>
      )}
    </Box>
    </OpenUrlContext.Provider>
  );
});
