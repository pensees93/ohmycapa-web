/**
 * Combo key abbreviated renderer
 *
 * Original key:  B3c(4)(256QAM)(UL,a)(256QAM)
 * Abbreviated:   B3c(4)◆  ↑a◆
 *
 * Color rules:
 *   MIMO      → bold number
 *   256QAM DL → amber ◆
 *   64QAM DL  → gray  ◇
 *   UL bw     → teal  ↑x
 *   UL 256QAM → teal  ◆
 *   UL 64QAM  → teal  ◇
 */
import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import type { ComboDisplayOptions } from '@ohmycapa/capa-core';

const MONO_FONT_STACK = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

// ─── Token parser ─────────────────────────────────────────────────────────────

export interface SegmentTokens {
  bandLabel: string;   // e.g. "B3c", "n78a"
  baseBand: string;    // e.g. "B3", "n78"
  dlMimo?: string;     // e.g. "4"
  dlQam?: string;      // canonical e.g. "256QAM", "64QAM"
  dlBw?: string;       // canonical e.g. "100MHz"
  ulBwCls?: string;    // e.g. "a"
  ulMimo?: string;     // e.g. "2"
  ulQam?: string;      // canonical e.g. "256QAM", "64QAM"
  ulBw?: string;       // canonical e.g. "100MHz"
}

function normalizeQamToken(raw: string): string {
  const asnMatch = raw.match(/^qam(\d+)$/i);
  if (asnMatch) return `${asnMatch[1]}QAM`;
  const suffixMatch = raw.match(/^(\d+)qam$/i);
  if (suffixMatch) return `${suffixMatch[1]}QAM`;
  return raw;
}

export function parseSegment(seg: string): SegmentTokens {
  // band label: leading [Bn]\d+[a-z]*
  const bandMatch = seg.match(/^([Bn]\d+[a-z]*)/i);
  const bandLabel = bandMatch ? bandMatch[1] : seg;
  const baseMatch = bandLabel.match(/^([Bn]\d+)/i);
  const baseBand = baseMatch ? baseMatch[1] : bandLabel;
  const rest = seg.slice(bandLabel.length);

  let dlMimo: string | undefined;
  let dlQam: string | undefined;
  let dlBw: string | undefined;
  let ulBwCls: string | undefined;
  let ulMimo: string | undefined;
  let ulQam: string | undefined;
  let ulBw: string | undefined;

  let inUl = false;
  for (const match of rest.matchAll(/\(([^)]+)\)/g)) {
    const token = match[1].trim();
    const ulMatch = token.match(/^UL,([a-z]+)$/i);
    if (ulMatch) {
      inUl = true;
      ulBwCls = ulMatch[1];
      continue;
    }
    if (/^\d+$/.test(token)) {
      if (inUl) ulMimo = token;
      else dlMimo = token;
      continue;
    }
    if (/^(?:qam\d+|\d+qam)$/i.test(token)) {
      const qam = normalizeQamToken(token);
      if (inUl) ulQam = qam;
      else dlQam = qam;
      continue;
    }
    const bwMatch = token.match(/^(?:(\d+)MHz|mhz(\d+))$/i);
    if (bwMatch) {
      const bw = `${bwMatch[1] ?? bwMatch[2]}MHz`;
      if (inUl) ulBw = bw;
      else dlBw = bw;
    }
  }

  return { bandLabel, baseBand, dlMimo, dlQam, dlBw, ulBwCls, ulMimo, ulQam, ulBw };
}

// ─── Single segment renderer ──────────────────────────────────────────────────

const DIFF_PILL_STYLE: Record<'superset' | 'changed', React.CSSProperties> = {
  superset: {
    color: '#6366f1',
    backgroundColor: 'rgba(99,102,241,0.16)',
    border: '1px solid rgba(99,102,241,0.45)',
    borderRadius: 4,
    padding: '0 3px',
  },
  changed: {
    color: '#d97706',
    backgroundColor: 'rgba(245,158,11,0.18)',
    border: '1px solid rgba(245,158,11,0.5)',
    borderRadius: 4,
    padding: '0 3px',
  },
};

function QamDiamond({ qam, isUl }: { qam: string; isUl: boolean }) {
  const norm = normalizeQamToken(qam);
  const is256 = norm === '256QAM' || norm === '1024QAM';
  const color = isUl ? '#00897B' : '#E65100';
  const symbol = is256 ? '◆' : '◇';
  return (
    <span style={{ color, fontSize: '1em', lineHeight: 1, verticalAlign: 'middle', marginLeft: 1 }}>
      {symbol}
    </span>
  );
}

function renderTokens(
  t: SegmentTokens,
  key: number,
  ref?: SegmentTokens,
  isAddedSegment?: boolean,
  diffMode: 'superset' | 'changed' = 'superset'
) {
  const pillStyle = DIFF_PILL_STYLE[diffMode];

  if (isAddedSegment) {
    return (
      <span key={key} style={{ ...pillStyle, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', fontWeight: 700 }}>
        {diffMode === 'superset' ? '+' : ''}
        <span>{t.bandLabel}</span>
        {t.dlMimo && <span style={{ fontSize: '0.9em' }}>({t.dlMimo})</span>}
        {t.dlQam && <QamDiamond qam={t.dlQam} isUl={false} />}
        {t.dlBw && <span style={{ fontSize: '0.8em', marginLeft: 2 }}>{t.dlBw.replace('MHz', 'M')}</span>}
        {t.ulBwCls && (
          <span style={{ fontSize: '0.9em', marginLeft: 2 }}>
            {'↑'}{t.ulBwCls}
            {t.ulMimo && t.ulMimo !== '1' && <span>({t.ulMimo})</span>}
            {t.ulQam && <QamDiamond qam={t.ulQam} isUl={true} />}
            {t.ulBw && <span style={{ fontSize: '0.85em', marginLeft: 2 }}>{t.ulBw.replace('MHz', 'M')}</span>}
          </span>
        )}
      </span>
    );
  }

  const bandChanged = ref !== undefined && t.bandLabel !== ref.bandLabel;
  const dlMimoChanged = ref !== undefined && (t.dlMimo ?? '') !== (ref.dlMimo ?? '');
  const dlQamChanged = ref !== undefined && (t.dlQam ?? '') !== (ref.dlQam ?? '');
  const dlBwChanged = ref !== undefined && (t.dlBw ?? '') !== (ref.dlBw ?? '');

  const ulBwClsChanged = ref !== undefined && (t.ulBwCls ?? '') !== (ref.ulBwCls ?? '');
  const tUlMimo = t.ulMimo ?? (t.ulBwCls ? '1' : undefined);
  const rUlMimo = ref?.ulMimo ?? (ref?.ulBwCls ? '1' : undefined);
  const ulMimoChanged = ref !== undefined && !!t.ulBwCls && (tUlMimo ?? '') !== (rUlMimo ?? '');
  const ulQamChanged = ref !== undefined && !!t.ulBwCls && (t.ulQam ?? '') !== (ref.ulQam ?? '');
  const ulBwChanged = ref !== undefined && !!t.ulBwCls && (t.ulBw ?? '') !== (ref.ulBw ?? '');

  return (
    <span key={key} style={{ whiteSpace: 'nowrap' }}>
      {/* Band label: bold */}
      <span style={bandChanged ? { ...pillStyle, fontWeight: 700 } : { fontWeight: 700 }}>
        {t.bandLabel}
      </span>

      {/* DL MIMO: (4) with parentheses */}
      {t.dlMimo && (
        <span style={dlMimoChanged ? { ...pillStyle, fontWeight: 700, fontSize: '0.9em', marginLeft: 1 } : { fontWeight: 600, fontSize: '0.9em' }}>
          ({t.dlMimo})
        </span>
      )}

      {/* DL QAM diamond */}
      {t.dlQam && (
        <span style={dlQamChanged ? { ...pillStyle, marginLeft: 1, padding: '0 2px' } : undefined}>
          <QamDiamond qam={t.dlQam} isUl={false} />
        </span>
      )}

      {/* DL BW */}
      {t.dlBw && (
        <span style={dlBwChanged
          ? { ...pillStyle, fontSize: '0.8em', marginLeft: 2, fontWeight: 700, letterSpacing: '-0.02em' }
          : { color: '#0288D1', fontSize: '0.8em', marginLeft: 2, fontWeight: 600, letterSpacing: '-0.02em' }
        }>
          {t.dlBw.replace('MHz', 'M')}
        </span>
      )}

      {/* UL section */}
      {t.ulBwCls && (
        <span style={{ color: '#00695C', fontWeight: 600, fontSize: '0.9em', marginLeft: 2 }}>
          <span style={ulBwClsChanged ? { ...pillStyle, fontWeight: 700 } : undefined}>
            {'↑'}{t.ulBwCls}
          </span>
          {t.ulMimo && t.ulMimo !== '1' && (
            <span style={ulMimoChanged ? { ...pillStyle, fontWeight: 700, marginLeft: 1 } : undefined}>
              ({t.ulMimo})
            </span>
          )}
          {t.ulQam && (
            <span style={ulQamChanged ? { ...pillStyle, marginLeft: 1, padding: '0 2px' } : undefined}>
              <QamDiamond qam={t.ulQam} isUl={true} />
            </span>
          )}
          {t.ulBw && (
            <span style={ulBwChanged
              ? { ...pillStyle, fontSize: '0.85em', fontWeight: 700, marginLeft: 2, letterSpacing: '-0.02em' }
              : { color: '#00897B', fontSize: '0.85em', fontWeight: 600, marginLeft: 2, letterSpacing: '-0.02em' }
            }>
              {t.ulBw.replace('MHz', 'M')}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

function renderSegment(seg: string, key: number) {
  return renderTokens(parseSegment(seg), key);
}

/**
 * Greedy 2-pass matching of target segments against reference segments:
 * 1) exact bandLabel match (handles intra-band CA ordering),
 * 2) baseBand match (handles bandwidthClass upgrade e.g. B3a -> B3c).
 */
function matchSegments(targetSegs: SegmentTokens[], refSegs: SegmentTokens[]): (SegmentTokens | undefined)[] {
  const usedRef = new Set<number>();
  const matched: (SegmentTokens | undefined)[] = new Array(targetSegs.length).fill(undefined);

  // Pass 1: exact bandLabel match
  targetSegs.forEach((t, ti) => {
    const ri = refSegs.findIndex((r, idx) => !usedRef.has(idx) && r.bandLabel.toLowerCase() === t.bandLabel.toLowerCase());
    if (ri >= 0) {
      usedRef.add(ri);
      matched[ti] = refSegs[ri];
    }
  });

  // Pass 2: baseBand match
  targetSegs.forEach((t, ti) => {
    if (matched[ti]) return;
    const ri = refSegs.findIndex((r, idx) => !usedRef.has(idx) && r.baseBand.toLowerCase() === t.baseBand.toLowerCase());
    if (ri >= 0) {
      usedRef.add(ri);
      matched[ti] = refSegs[ri];
    }
  });

  return matched;
}

// ─── Public API ───────────────────────────────────────────────────────────────

const COMBO_KEY_CACHE_MAX = 4000;
const _comboKeyCache = new Map<string, React.ReactNode>();

function cacheGet(key: string): React.ReactNode | undefined {
  const v = _comboKeyCache.get(key);
  if (v !== undefined) {
    _comboKeyCache.delete(key);
    _comboKeyCache.set(key, v);
  }
  return v;
}

function cacheSet(key: string, value: React.ReactNode): void {
  if (_comboKeyCache.size >= COMBO_KEY_CACHE_MAX) {
    _comboKeyCache.delete(_comboKeyCache.keys().next().value!);
  }
  _comboKeyCache.set(key, value);
}

const COMBO_SPAN_STYLE: React.CSSProperties = {
  fontFamily: MONO_FONT_STACK,
  fontSize: '0.78rem',
  cursor: 'default',
  display: 'inline-flex',
  flexWrap: 'wrap',
  gap: '2px 4px',
  alignItems: 'center',
  verticalAlign: 'middle',
  maxWidth: '100%',
  lineHeight: 1.5,
  paddingTop: '2px',
  paddingBottom: '2px',
};

function wrapComboTooltip(tooltipText: string, children: React.ReactNode): React.ReactNode {
  return (
    <Tooltip
      title={
        <Box sx={{ fontFamily: MONO_FONT_STACK, fontSize: '0.72rem', maxWidth: 480, wordBreak: 'break-all' }}>
          {tooltipText}
        </Box>
      }
      placement="top"
      enterDelay={300}
    >
      <span style={COMBO_SPAN_STYLE}>
        {children}
      </span>
    </Tooltip>
  );
}

/**
 * Renders a combo key as compact inline elements inside a Tooltip.
 * Full raw key is shown on hover. Result is cached per key string (LRU max 4000).
 */
export function renderComboKey(
  comboDef: { key: string; powerClass?: string } | string,
  _opts?: ComboDisplayOptions
): React.ReactNode {
  const keyStr = typeof comboDef === 'string' ? comboDef : comboDef.key;
  const powerClass = typeof comboDef === 'object' ? comboDef.powerClass : undefined;
  const cacheKey = powerClass ? `${keyStr}__${powerClass}` : keyStr;

  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const segments = keyStr.split('-');
  const tooltipText = powerClass ? `${keyStr} ${powerClass}` : keyStr;

  const result = wrapComboTooltip(
    tooltipText,
    segments.map((seg, i) => (
      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
        {renderSegment(seg, i)}
        {i < segments.length - 1 && (
          <span style={{ opacity: 0.4, marginLeft: 4, marginRight: 2, userSelect: 'none' }}>·</span>
        )}
      </span>
    ))
  );
  cacheSet(cacheKey, result);
  return result;
}

/**
 * Renders a combo key with inline token-level diff highlighting against a reference key.
 * Added segments (in superset mode) are prefixed with `+` and highlighted; differing tokens
 * (BW class, DL/UL MIMO, DL/UL QAM, UL carrier) are highlighted in amber (`changed`) or indigo (`superset`).
 */
export function renderComboKeyDiff(
  comboDef: { key: string; powerClass?: string } | string,
  referenceKey?: string,
  diffMode: 'superset' | 'changed' = 'superset',
  opts?: ComboDisplayOptions
): React.ReactNode {
  if (!referenceKey) {
    return renderComboKey(comboDef, opts);
  }

  const keyStr = typeof comboDef === 'string' ? comboDef : comboDef.key;
  const powerClass = typeof comboDef === 'object' ? comboDef.powerClass : undefined;
  const cacheKey = `diff__${diffMode}__${keyStr}__${powerClass ?? ''}__${referenceKey}`;

  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const targetTokens = keyStr.split('-').map(parseSegment);
  const refTokens = referenceKey.split('-').map(parseSegment);
  const matchedRefs = matchSegments(targetTokens, refTokens);
  const tooltipText = powerClass ? `${keyStr} ${powerClass}` : keyStr;

  const result = wrapComboTooltip(
    tooltipText,
    targetTokens.map((tok, i) => {
      const refTok = matchedRefs[i];
      const isAdded = refTok === undefined;
      return (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          {renderTokens(tok, i, refTok, isAdded, diffMode)}
          {i < targetTokens.length - 1 && (
            <span style={{ opacity: 0.4, marginLeft: 4, marginRight: 2, userSelect: 'none' }}>·</span>
          )}
        </span>
      );
    })
  );
  cacheSet(cacheKey, result);
  return result;
}

/**
 * Extracts concise human-readable delta badges explaining how a superset combo
 * covers a smaller/weaker base combo (e.g., `+B7a`, `B1 DL MIMO: 2→4`).
 */
export function extractSupersetDeltaLabels(supersetKey: string, baseKey: string): string[] {
  const supTokens = supersetKey.split('-').map(parseSegment);
  const baseTokens = baseKey.split('-').map(parseSegment);
  const matchedBase = matchSegments(supTokens, baseTokens);
  const labels: string[] = [];

  supTokens.forEach((sTok, i) => {
    const bTok = matchedBase[i];
    if (!bTok) {
      labels.push(`+${sTok.bandLabel}`);
      return;
    }
    if (sTok.bandLabel !== bTok.bandLabel) {
      labels.push(`${sTok.baseBand} BW: ${bTok.bandLabel}→${sTok.bandLabel}`);
    }
    if ((sTok.dlMimo ?? '') !== (bTok.dlMimo ?? '') && sTok.dlMimo) {
      labels.push(`${sTok.baseBand} DL MIMO: ${bTok.dlMimo ?? '—'}→${sTok.dlMimo}`);
    }
    if ((sTok.dlQam ?? '') !== (bTok.dlQam ?? '') && sTok.dlQam) {
      labels.push(`${sTok.baseBand} DL QAM: ${bTok.dlQam ?? '64QAM'}→${sTok.dlQam}`);
    }
    if ((sTok.ulBwCls ?? '') !== (bTok.ulBwCls ?? '') && sTok.ulBwCls) {
      labels.push(
        bTok.ulBwCls
          ? `${sTok.baseBand} UL BW: ${bTok.ulBwCls}→${sTok.ulBwCls}`
          : `${sTok.baseBand} +UL(${sTok.ulBwCls})`
      );
    }
    const sUlMimo = sTok.ulMimo ?? (sTok.ulBwCls ? '1' : undefined);
    const bUlMimo = bTok.ulMimo ?? (bTok.ulBwCls ? '1' : undefined);
    if (sTok.ulBwCls && bTok.ulBwCls && sUlMimo !== bUlMimo) {
      labels.push(`${sTok.baseBand} UL MIMO: ${bUlMimo}→${sUlMimo}`);
    }
    if (sTok.ulBwCls && (sTok.ulQam ?? '') !== (bTok.ulQam ?? '') && sTok.ulQam) {
      labels.push(`${sTok.baseBand} UL QAM: ${bTok.ulQam ?? '64QAM'}→${sTok.ulQam}`);
    }
  });

  return labels;
}

/**
 * Compact inline legend explaining abbreviated MIMO, QAM, and UL token symbols.
 */
export const ComboSymbolLegend: React.FC = () => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 1,
      flexWrap: 'wrap',
      fontFamily: MONO_FONT_STACK,
      fontSize: '0.62rem',
      color: 'text.secondary',
      flexShrink: 0,
    }}
  >
    <span><b>(4)</b> MIMO</span>
    <span>
      <span style={{ color: '#E65100' }}>◆</span> 256QAM
    </span>
    <span>
      <span style={{ color: '#E65100' }}>◇</span> 64QAM
    </span>
    <span>
      <span style={{ color: '#00695C', fontWeight: 600 }}>↑a</span>
      <span style={{ color: '#00897B' }}>◆</span> UL
    </span>
  </Box>
);
