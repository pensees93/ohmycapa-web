import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import {
  buildUnclassifiedSpecIssueReport,
  type CommonCapaJson,
  type FeatureDiff,
  type FeatureKind,
  type RatType,
  type UnknownFeature,
} from '@ohmycapa/capa-core';
import { DEVICE_COLOR, MONO_FONT_FAMILY, STATUS_COLOR } from '../constants/statusMeta';
import { copyTextToClipboard } from '../utils/clipboardUtils';
import { formatFeatureValue, splitHighlightSegments } from '../utils/featureSearch';

export const OpenUrlContext = createContext<((url: string) => void) | undefined>(undefined);

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

export function shortenDeviceName(name: string | undefined, fallback: string): string {
  if (!name) return fallback;
  const stripped = name.replace(/\.(txt|log|json)$/i, '');
  return stripped.length > 26 ? `${stripped.slice(0, 24)}…` : stripped;
}

export function formatBitStringTooltip(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.match(/^'([01]+)'B$/i);
  if (!m) return null;
  let setCount = 0;
  for (const ch of m[1]) {
    if (ch === '1') setCount++;
  }
  return `Binary bitmap: ${setCount}/${m[1].length} bits set`;
}

export function featureValueColor(v: FeatureDiff['a'], kind: FeatureDiff['kind'], isDark: boolean): string {
  if (v === undefined) return isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
  if (kind === 'bool' || kind === 'fgiBit' || kind === 'presence') {
    return v ? STATUS_COLOR.green : STATUS_COLOR.red;
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

  const symMatch = val.trim().match(/^sym(\d+(?:dot\d+)?)$/i);
  if (symMatch) {
    const n = Number(symMatch[1].replace(/dot/i, '.'));
    return Number.isFinite(n) ? -n : undefined;
  }

  const ordMatch = val.trim().match(/^(?:rel|n|p|upto|cs|b|kbps|tb|tf|am|s|mhz|mws|kb|e)(\d+(?:dot\d+)?)$/i);
  if (ordMatch) {
    const n = Number(ordMatch[1].replace(/dot/i, '.'));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function getStrongerSide(diff: FeatureDiff): 'a' | 'b' | null {
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

export function buildAutoIssueUrlFromEntries(
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

export function openExternalReportUrl(url: string, openUrl?: (u: string) => void) {
  if (openUrl) {
    openUrl(url);
  } else if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function useOpenUrlContext() {
  return useContext(OpenUrlContext);
}

// ─── HighlightText ────────────────────────────────────────────────────────────

export const HighlightText = React.memo<{ text: string; query?: string }>(({ text, query = '' }) => {
  const segments = useMemo(() => splitHighlightSegments(text, query), [text, query]);
  if (!query.trim()) return <>{text}</>;

  return (
    <>
      {segments.map((seg, idx) =>
        seg.match ? (
          <Box
            key={idx}
            component="mark"
            sx={{
              bgcolor: 'rgba(245, 158, 11, 0.28)',
              color: 'inherit',
              px: '2px',
              borderRadius: '3px',
              fontWeight: 700,
            }}
          >
            {seg.text}
          </Box>
        ) : (
          <React.Fragment key={idx}>{seg.text}</React.Fragment>
        )
      )}
    </>
  );
});

// ─── CopyActionButton ─────────────────────────────────────────────────────────

interface CopyActionButtonProps {
  getText: () => string;
  tooltip?: string;
  size?: number;
}

export const CopyActionButton = React.memo<CopyActionButtonProps>(({
  getText,
  tooltip = 'Copy row summary',
  size = 13,
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyTextToClipboard(getText());
    if (ok) {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    }
  }, [getText]);

  return (
    <Tooltip title={copied ? 'Copied!' : tooltip} placement="top" arrow>
      <IconButton
        size="small"
        aria-label={tooltip}
        onClick={e => { void handleCopy(e); }}
        sx={{
          p: 0.3,
          color: copied ? STATUS_COLOR.green : 'text.disabled',
          '&:hover': { color: copied ? STATUS_COLOR.green : 'text.primary', bgcolor: 'action.hover' },
        }}
      >
        {copied ? <CheckIcon sx={{ fontSize: size }} /> : <ContentCopyIcon sx={{ fontSize: size }} />}
      </IconButton>
    </Tooltip>
  );
});

// ─── FeatureStatusChip ────────────────────────────────────────────────────────

export const FeatureStatusChip = React.memo<{ status: FeatureDiff['status'] }>(({ status }) => {
  if (status === 'same') return null;
  const cfg =
    status === 'different'
      ? { label: 'Diff', color: STATUS_COLOR.amber }
      : status === 'a-only'
        ? { label: 'A only', color: DEVICE_COLOR.deviceA }
        : { label: 'B only', color: DEVICE_COLOR.deviceB };

  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        height: 16,
        fontSize: '0.58rem',
        fontWeight: 700,
        color: cfg.color,
        bgcolor: `${cfg.color}20`,
        border: `1px solid ${cfg.color}40`,
        '& .MuiChip-label': { px: 0.6 },
      }}
    />
  );
});

// ─── StringListCell ───────────────────────────────────────────────────────────

interface StringListCellProps {
  slDiff: NonNullable<FeatureDiff['stringListDiff']>;
  side: 'a' | 'b';
  isDark: boolean;
  isStronger?: boolean;
  searchQuery?: string;
}

export const StringListCell = React.memo<StringListCellProps>(({
  slDiff,
  side,
  isDark,
  isStronger,
  searchQuery = '',
}) => {
  const unique = side === 'a' ? slDiff.onlyInA : slDiff.onlyInB;
  const common = slDiff.common;
  const sideColor = side === 'a' ? DEVICE_COLOR.deviceA : DEVICE_COLOR.deviceB;

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
    return <Typography sx={{ fontSize: '0.78rem', opacity: 0.35, fontFamily: MONO_FONT_FAMILY }}>—</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, alignItems: 'center' }}>
        {sortedItems.map(({ v, unique: isUnique }) => (
          <Chip
            key={v}
            label={<HighlightText text={isUnique ? `+${v}` : v} query={searchQuery} />}
            size="small"
            sx={{
              height: 17,
              fontSize: '0.64rem',
              fontFamily: MONO_FONT_FAMILY,
              fontWeight: isUnique ? 700 : 500,
              bgcolor: isUnique
                ? `${sideColor}22`
                : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'),
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
                fontSize: '0.6rem',
                fontWeight: 800,
                color: STATUS_COLOR.green,
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
      {(sortedItems.length > 4 || unique.length > 0) && (
        <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
          {sortedItems.length} total{unique.length > 0 ? ` · +${unique.length} unique` : ''}
        </Typography>
      )}
    </Box>
  );
});

// ─── FeatureScalarCell ────────────────────────────────────────────────────────

interface FeatureScalarCellProps {
  diff: FeatureDiff;
  side: 'a' | 'b';
  isDark: boolean;
  isStronger: boolean;
  searchQuery?: string;
}

export const FeatureScalarCell = React.memo<FeatureScalarCellProps>(({
  diff,
  side,
  isDark,
  isStronger,
  searchQuery = '',
}) => {
  const v = side === 'a' ? diff.a : diff.b;
  const absent = side === 'a' ? diff.status === 'b-only' : diff.status === 'a-only';
  const bitTip = !absent ? formatBitStringTooltip(v) : null;
  const sideColor = side === 'a' ? DEVICE_COLOR.deviceA : DEVICE_COLOR.deviceB;
  const formatted = absent ? '—' : formatFeatureValue(v, diff.kind);

  const textEl = (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, maxWidth: '100%' }}>
      <Typography
        sx={{
          fontSize: '0.74rem',
          fontFamily: MONO_FONT_FAMILY,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: absent ? 400 : isStronger ? 700 : 600,
          wordBreak: 'break-word',
          color: absent
            ? (isDark ? 'rgba(255,255,255,0.24)' : 'rgba(15,23,42,0.24)')
            : diff.status === (side === 'a' ? 'a-only' : 'b-only')
              ? sideColor
              : featureValueColor(v, diff.kind, isDark),
        }}
      >
        {absent ? '—' : <HighlightText text={formatted} query={searchQuery} />}
      </Typography>
      {isStronger && (
        <Tooltip title="Higher 3GPP capability value" placement="top" arrow>
          <Box
            component="span"
            sx={{
              fontSize: '0.62rem',
              fontWeight: 800,
              color: STATUS_COLOR.green,
              lineHeight: 1,
              px: 0.35,
              py: 0.1,
              borderRadius: 0.5,
              bgcolor: 'rgba(16,185,129,0.14)',
              flexShrink: 0,
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
});
