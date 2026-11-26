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
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
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

function getDiffPillStyle(diffMode: 'superset' | 'changed', isDark: boolean): React.CSSProperties {
  if (diffMode === 'superset') {
    return {
      color: isDark ? '#a5b4fc' : '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.18)',
      border: '1px solid rgba(99,102,241,0.45)',
      borderRadius: 4,
      padding: '0 3px',
    };
  }
  return {
    color: isDark ? '#fbbf24' : '#d97706',
    backgroundColor: 'rgba(245,158,11,0.18)',
    border: '1px solid rgba(245,158,11,0.5)',
    borderRadius: 4,
    padding: '0 3px',
  };
}

function QamDiamond({ qam, isUl, isDark = false }: { qam: string; isUl: boolean; isDark?: boolean }) {
  const norm = normalizeQamToken(qam);
  const is1024 = norm === '1024QAM';
  const is256 = norm === '256QAM';
  const color = isDark
    ? (is1024 ? (isUl ? '#5eead4' : '#ce93d8') : (isUl ? '#2dd4bf' : '#fb923c'))
    : (is1024 ? (isUl ? '#00695C' : '#8E24AA') : (isUl ? '#00897B' : '#E65100'));
  const symbol = is1024 ? '◈' : is256 ? '◆' : '◇';
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
  diffMode: 'superset' | 'changed' = 'superset',
  isDark = false
) {
  const pillStyle = getDiffPillStyle(diffMode, isDark);
  const ulTextColor = isDark ? '#2dd4bf' : '#00695C';
  const ulBwColor = isDark ? '#5eead4' : '#00897B';
  const dlBwColor = isDark ? '#38bdf8' : '#0288D1';

  if (isAddedSegment) {
    return (
      <span key={key} style={{ ...pillStyle, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', fontWeight: 700 }}>
        {diffMode === 'superset' ? '+' : ''}
        <span>{t.bandLabel}</span>
        {t.dlMimo && <span style={{ fontSize: '0.9em' }}>({t.dlMimo})</span>}
        {t.dlQam && <QamDiamond qam={t.dlQam} isUl={false} isDark={isDark} />}
        {t.dlBw && <span style={{ fontSize: '0.8em', marginLeft: 2 }}>{t.dlBw.replace('MHz', 'M')}</span>}
        {t.ulBwCls && (
          <span style={{ fontSize: '0.9em', marginLeft: 2 }}>
            {'↑'}{t.ulBwCls}
            {t.ulMimo && t.ulMimo !== '1' && <span>({t.ulMimo})</span>}
            {t.ulQam && <QamDiamond qam={t.ulQam} isUl={true} isDark={isDark} />}
            {t.ulBw && <span style={{ fontSize: '0.85em', marginLeft: 2 }}>{t.ulBw.replace('MHz', 'M')}</span>}
          </span>
        )}
      </span>
    );
  }

  const bandChanged = ref !== undefined && t.bandLabel !== ref.bandLabel;
  const dlMimoChanged = ref !== undefined && (t.dlMimo ?? '') !== (ref.dlMimo ?? '');
  const dlQamChanged = ref !== undefined && (t.dlQam ?? '64QAM') !== (ref.dlQam ?? '64QAM');
  const dlBwChanged = ref !== undefined && (t.dlBw ?? '') !== (ref.dlBw ?? '');

  const ulBwClsChanged = ref !== undefined && (t.ulBwCls ?? '') !== (ref.ulBwCls ?? '');
  const tUlMimo = t.ulMimo ?? (t.ulBwCls ? '1' : undefined);
  const rUlMimo = ref?.ulMimo ?? (ref?.ulBwCls ? '1' : undefined);
  const ulMimoChanged = ref !== undefined && !!t.ulBwCls && (tUlMimo ?? '') !== (rUlMimo ?? '');
  const ulQamChanged = ref !== undefined && !!t.ulBwCls && (t.ulQam ?? '64QAM') !== (ref.ulQam ?? '64QAM');
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
          <QamDiamond qam={t.dlQam} isUl={false} isDark={isDark} />
        </span>
      )}

      {/* DL BW */}
      {t.dlBw && (
        <span style={dlBwChanged
          ? { ...pillStyle, fontSize: '0.8em', marginLeft: 2, fontWeight: 700, letterSpacing: '-0.02em' }
          : { color: dlBwColor, fontSize: '0.8em', marginLeft: 2, fontWeight: 600, letterSpacing: '-0.02em' }
        }>
          {t.dlBw.replace('MHz', 'M')}
        </span>
      )}

      {/* UL section */}
      {t.ulBwCls && (
        <span style={{ color: ulTextColor, fontWeight: 600, fontSize: '0.9em', marginLeft: 2 }}>
          <span style={ulBwClsChanged ? { ...pillStyle, fontWeight: 700 } : undefined}>
            {'↑'}{t.ulBwCls}
          </span>
          {((t.ulMimo && t.ulMimo !== '1') || (ulMimoChanged && tUlMimo === '1')) && (
            <span style={ulMimoChanged ? { ...pillStyle, fontWeight: 700, marginLeft: 1 } : undefined}>
              ({tUlMimo})
            </span>
          )}
          {t.ulQam && (
            <span style={ulQamChanged ? { ...pillStyle, marginLeft: 1, padding: '0 2px' } : undefined}>
              <QamDiamond qam={t.ulQam} isUl={true} isDark={isDark} />
            </span>
          )}
          {t.ulBw && (
            <span style={ulBwChanged
              ? { ...pillStyle, fontSize: '0.85em', fontWeight: 700, marginLeft: 2, letterSpacing: '-0.02em' }
              : { color: ulBwColor, fontSize: '0.85em', fontWeight: 600, marginLeft: 2, letterSpacing: '-0.02em' }
            }>
              {t.ulBw.replace('MHz', 'M')}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

function renderSegment(seg: string, key: number, isDark = false) {
  return renderTokens(parseSegment(seg), key, undefined, false, 'superset', isDark);
}

/**
 * Greedy multi-pass matching of target segments against reference segments:
 * 1) exact bandLabel match (preferring same UL presence, e.g. intra-band B7a+B7a),
 * 2) baseBand match (handles bandwidthClass upgrade e.g. B3a -> B3c).
 */
function matchSegments(targetSegs: SegmentTokens[], refSegs: SegmentTokens[]): (SegmentTokens | undefined)[] {
  const usedRef = new Set<number>();
  const matched: (SegmentTokens | undefined)[] = new Array(targetSegs.length).fill(undefined);

  const passes: Array<(t: SegmentTokens, r: SegmentTokens) => boolean> = [
    (t, r) =>
      r.bandLabel.toLowerCase() === t.bandLabel.toLowerCase() &&
      Boolean(r.ulBwCls) === Boolean(t.ulBwCls) &&
      (r.dlMimo ?? '') === (t.dlMimo ?? '') &&
      (r.dlQam ?? '64QAM') === (t.dlQam ?? '64QAM'),
    (t, r) =>
      r.bandLabel.toLowerCase() === t.bandLabel.toLowerCase() &&
      (r.dlMimo ?? '') === (t.dlMimo ?? '') &&
      (r.dlQam ?? '64QAM') === (t.dlQam ?? '64QAM'),
    (t, r) => r.bandLabel.toLowerCase() === t.bandLabel.toLowerCase() && Boolean(r.ulBwCls) === Boolean(t.ulBwCls),
    (t, r) => r.bandLabel.toLowerCase() === t.bandLabel.toLowerCase(),
    (t, r) =>
      r.baseBand.toLowerCase() === t.baseBand.toLowerCase() &&
      Boolean(r.ulBwCls) === Boolean(t.ulBwCls) &&
      (r.dlMimo ?? '') === (t.dlMimo ?? '') &&
      (r.dlQam ?? '64QAM') === (t.dlQam ?? '64QAM'),
    (t, r) =>
      r.baseBand.toLowerCase() === t.baseBand.toLowerCase() &&
      (r.dlMimo ?? '') === (t.dlMimo ?? '') &&
      (r.dlQam ?? '64QAM') === (t.dlQam ?? '64QAM'),
    (t, r) => r.baseBand.toLowerCase() === t.baseBand.toLowerCase() && Boolean(r.ulBwCls) === Boolean(t.ulBwCls),
    (t, r) => r.baseBand.toLowerCase() === t.baseBand.toLowerCase(),
  ];

  for (const pred of passes) {
    targetSegs.forEach((t, ti) => {
      if (matched[ti]) return;
      const ri = refSegs.findIndex((r, idx) => !usedRef.has(idx) && pred(t, r));
      if (ri >= 0) {
        usedRef.add(ri);
        matched[ti] = refSegs[ri];
      }
    });
  }

  return matched;
}

// ─── Public API ───────────────────────────────────────────────────────────────

const COMBO_KEY_CACHE_MAX = 8000;
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
    <span title={tooltipText} style={COMBO_SPAN_STYLE}>
      {children}
    </span>
  );
}

/**
 * Renders a combo key as compact inline elements inside a Tooltip.
 * Full raw key is shown on hover. Result is cached per key string (LRU max 4000).
 */
export function renderComboKey(
  comboDef: { key: string; powerClass?: string } | string,
  _opts?: ComboDisplayOptions,
  isDark = false
): React.ReactNode {
  const keyStr = typeof comboDef === 'string' ? comboDef : comboDef.key;
  const powerClass = typeof comboDef === 'object' ? comboDef.powerClass : undefined;
  const themeTag = isDark ? 'd' : 'l';
  const cacheKey = powerClass ? `${themeTag}__${keyStr}__${powerClass}` : `${themeTag}__${keyStr}`;

  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const segments = keyStr.split('-');
  const tooltipText = powerClass ? `${keyStr} ${powerClass}` : keyStr;

  const result = wrapComboTooltip(
    tooltipText,
    segments.map((seg, i) => (
      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
        {renderSegment(seg, i, isDark)}
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
  opts?: ComboDisplayOptions,
  isDark = false
): React.ReactNode {
  if (!referenceKey) {
    return renderComboKey(comboDef, opts, isDark);
  }

  const keyStr = typeof comboDef === 'string' ? comboDef : comboDef.key;
  const powerClass = typeof comboDef === 'object' ? comboDef.powerClass : undefined;
  const themeTag = isDark ? 'd' : 'l';
  const cacheKey = `diff__${themeTag}__${diffMode}__${keyStr}__${powerClass ?? ''}__${referenceKey}`;

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
          {renderTokens(tok, i, refTok, isAdded, diffMode, isDark)}
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
    const sDlQam = sTok.dlQam ?? '64QAM';
    const bDlQam = bTok.dlQam ?? '64QAM';
    if (sDlQam !== bDlQam && sTok.dlQam) {
      labels.push(`${sTok.baseBand} DL QAM: ${bDlQam}→${sDlQam}`);
    }
    if ((sTok.ulBwCls ?? '') !== (bTok.ulBwCls ?? '') && sTok.ulBwCls) {
      if (bTok.ulBwCls) {
        labels.push(`${sTok.baseBand} UL BW: ${bTok.ulBwCls}→${sTok.ulBwCls}`);
      } else {
        const supUlCount = supTokens.filter(t => t.baseBand === sTok.baseBand && t.ulBwCls).length;
        const baseUlCount = baseTokens.filter(t => t.baseBand === sTok.baseBand && t.ulBwCls).length;
        if (supUlCount > baseUlCount) {
          labels.push(`${sTok.baseBand} +UL(${sTok.ulBwCls})`);
        }
      }
    }
    const sUlMimo = sTok.ulMimo ?? (sTok.ulBwCls ? '1' : undefined);
    const bUlMimo = bTok.ulMimo ?? (bTok.ulBwCls ? '1' : undefined);
    if (sTok.ulBwCls && bTok.ulBwCls && sUlMimo !== bUlMimo) {
      labels.push(`${sTok.baseBand} UL MIMO: ${bUlMimo}→${sUlMimo}`);
    }
    const sUlQam = sTok.ulQam ?? '64QAM';
    const bUlQam = bTok.ulQam ?? '64QAM';
    if (sTok.ulBwCls && bTok.ulBwCls && sUlQam !== bUlQam && sTok.ulQam) {
      labels.push(`${sTok.baseBand} UL QAM: ${bUlQam}→${sUlQam}`);
    }
  });

  return labels;
}

/**
 * Compact inline legend explaining abbreviated MIMO, QAM, and UL token symbols.
 */
export const ComboSymbolLegend: React.FC = () => {
  const isDark = useTheme().palette.mode === 'dark';
  const c1024 = isDark ? '#ce93d8' : '#8E24AA';
  const cQam = isDark ? '#fb923c' : '#E65100';
  const cUlText = isDark ? '#2dd4bf' : '#00695C';
  const cUlDia = isDark ? '#5eead4' : '#00897B';
  return (
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
        <span style={{ color: c1024 }}>◈</span> 1024QAM
      </span>
      <span>
        <span style={{ color: cQam }}>◆</span> 256QAM
      </span>
      <span>
        <span style={{ color: cQam }}>◇</span> 64QAM
      </span>
      <span>
        <span style={{ color: cUlText, fontWeight: 600 }}>↑a</span>
        <span style={{ color: cUlDia }}>◆</span> UL
      </span>
    </Box>
  );
};
