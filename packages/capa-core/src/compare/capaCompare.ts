import type {
  CompareFormat,
  BandCombination,
  BandParameter,
  NRBandInfo,
  EutraBandInfo,
  UtraBandInfo,
  RatType,
  ChannelBW,
  ComboDisplayOptions,
} from '../types/capaTypes';
import { getNRBandName, getEutraBandName } from '../types/capaTypes';
import { generateCombinationKey, getBwClassCcCount } from '../normalizer/comboKey';
import type {
  CapaCompareResult,
  RatCompareResult,
  BandDiff,
  ComboDiff,
  BandParamDiff,
  PropertyDiff,
  ChannelBWDiff,
  CoverageAnalysis,
  CoverageDirection,
  RatSummary,
  ComboMatchStatus,
  FeatureDiff,
  RatFeaturesDiff,
  StringListDiff,
} from '../types/compareTypes';
import type { FeatureLeaf, RatFeatures } from '../types/capaTypes';

// ─── Constants ──────────────────────────────────────────────────────────────

const QAM_LABELS = ['16QAM', '64QAM', '256QAM', '1024QAM'] as const;
const SCS_KEYS = ['scs-15kHz', 'scs-30kHz', 'scs-60kHz', 'scs-120kHz'] as const;

// ─── Utility helpers ─────────────────────────────────────────────────────────

function fastEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!fastEqual(a[i], b[i])) return false;
    }
    return true;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function prop<V>(a: V | undefined, b: V | undefined): PropertyDiff<V> {
  if (a === undefined && b === undefined) return { status: 'same' };
  if (a === undefined) return { b, status: 'b-only' };
  if (b === undefined) return { a, status: 'a-only' };
  // Fast path: identical reference or structural equality without unconditional JSON serialization
  return { a, b, status: fastEqual(a, b) ? 'same' : 'changed' };
}


// ─── Channel BW comparison ───────────────────────────────────────────────────


function compareChannelBWs(
  a: ChannelBW | undefined,
  b: ChannelBW | undefined
): ChannelBWDiff | undefined {
  if (!a && !b) return undefined;
  const numSort = (x: string, y: string) => parseInt(x) - parseInt(y);
  const result: ChannelBWDiff = {};
  for (const scs of SCS_KEYS) {
    const aArr = a?.[scs];
    const bArr = b?.[scs];
    if (!aArr && !bArr) continue;
    // Numeric sort for stable comparison (lexicographic sort mis-orders '100' < '40')
    const aSet = aArr ? [...aArr].sort(numSort) : undefined;
    const bSet = bArr ? [...bArr].sort(numSort) : undefined;
    result[scs] = prop(aSet, bSet);
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

// ─── Band comparison ─────────────────────────────────────────────────────────

// Helper to compare bands of any RAT type
function compareBandsGeneric<T extends { band: number }>(
  bandsA: T[],
  bandsB: T[],
  displayNameFn: (band: number) => string,
  compareDetailFn: (a: T, b: T) => Partial<BandDiff>
): BandDiff[] {
  const mapA = new Map(bandsA.map(b => [b.band, b]));
  const mapB = new Map(bandsB.map(b => [b.band, b]));
  const allBands = [...new Set([...mapA.keys(), ...mapB.keys()])].sort((x, y) => x - y);

  return allBands.map(band => {
    const a = mapA.get(band);
    const b = mapB.get(band);
    const displayName = displayNameFn(band);

    const detail = compareDetailFn(a ?? ({} as T), b ?? ({} as T));

    const changed = !!(a && b && Object.values(detail).some(d => {
      if (!d) return false;
      if ('status' in (d as any)) return (d as any).status !== 'same';
      return Object.values(d as any).some((v: any) => v?.status !== 'same');
    }));

    const status = !a ? 'b-only' as const : !b ? 'a-only' as const : (changed ? 'changed' as const : 'same' as const);
    return { band, displayName, status, ...detail } as BandDiff;
  });
}

function compareNRBands(bandsA: NRBandInfo[], bandsB: NRBandInfo[]): BandDiff[] {
  return compareBandsGeneric(bandsA, bandsB, getNRBandName, (a, b) => {
    // v1590 BWs are already merged into channelBWsDL/UL at parse time
    return {
      powerClass: prop(a.powerClass, b.powerClass),
      dlMimo: prop(a.dlMimo, b.dlMimo),
      ulMimo: prop(a.ulMimo, b.ulMimo),
      dlQam: prop(a.dlQam, b.dlQam),
      ulQam: prop(a.ulQam, b.ulQam),
      channelBWsDL: compareChannelBWs(a.channelBWsDL, b.channelBWsDL),
      channelBWsUL: compareChannelBWs(a.channelBWsUL, b.channelBWsUL),
      multipleTCI: prop(a.multipleTCI, b.multipleTCI),
      bwpWithoutRestriction: prop(a.bwpWithoutRestriction, b.bwpWithoutRestriction),
      bwpSameNumerology: prop(a.bwpSameNumerology, b.bwpSameNumerology),
      maxUplinkDutyCycle: prop(a.maxUplinkDutyCycle, b.maxUplinkDutyCycle),
      powerBoostingPi2BPSK: prop(a.powerBoostingPi2BPSK, b.powerBoostingPi2BPSK),
    };
  });
}

function compareEutraBands(bandsA: EutraBandInfo[], bandsB: EutraBandInfo[]): BandDiff[] {
  return compareBandsGeneric(bandsA, bandsB, getEutraBandName, (a, b) => ({
    powerClass: prop(a.powerClass, b.powerClass),
    halfDuplex: prop(a.halfDuplex, b.halfDuplex),
    dlMimo: prop(a.dlMimo, b.dlMimo),
    ulMimo: prop(a.ulMimo, b.ulMimo),
    dlQam: prop(a.dlQam, b.dlQam),
    ulQam: prop(a.ulQam, b.ulQam),
    nonContiguousULRA: prop(a.nonContiguousULRA, b.nonContiguousULRA),
  }));
}

function compareUtraBands(bandsA: UtraBandInfo[], bandsB: UtraBandInfo[]): BandDiff[] {
  return compareBandsGeneric(bandsA, bandsB, b => `Band-${b}`, (a, b) => ({
    powerClass: prop(a.powerClass, b.powerClass),
  }));
}

function compareMrdcBands(
  bandsA: (NRBandInfo | EutraBandInfo)[],
  bandsB: (NRBandInfo | EutraBandInfo)[]
): BandDiff[] {
  const isNrBand = (b: NRBandInfo | EutraBandInfo): b is NRBandInfo =>
    b.displayName?.startsWith('n') || 'channelBWsDL' in b || 'channelBWsUL' in b || 'extraBws' in b;

  const lteA = bandsA.filter((b): b is EutraBandInfo => !isNrBand(b));
  const lteB = bandsB.filter((b): b is EutraBandInfo => !isNrBand(b));
  const nrA = bandsA.filter(isNrBand);
  const nrB = bandsB.filter(isNrBand);

  const lteDiffs = compareEutraBands(lteA, lteB).map(d => ({ ...d, ratType: 'eutra' as const }));
  const nrDiffs = compareNRBands(nrA, nrB).map(d => ({ ...d, ratType: 'nr' as const }));
  return [...lteDiffs, ...nrDiffs];
}

// ─── Subset logic ────────────────────────────────────────────────────────────

// ─── ComboCache: pre-computed per-combo data to avoid O(n²) recomputation ────

interface ComboCache {
  key: string;
  combo: BandCombination;
  /** Sorted fingerprint string for O(1) multiset equality: "eutra:3×2,nr:78×1" */
  bandFingerprint: string;
  /** Pre-sorted per-(rat:band) DL and UL entries for zero-allocation matching */
  dlGroups: Record<string, BandParameter[]>;
  dlGroupKeys: string[];
  ulGroups: Record<string, BandParameter[]>;
  ulGroupKeys: string[];
  ulCounts: { m: Record<string, number>; total: number };
  caLevel: number;
  ulLevel: number;
  /** Parameter values per band type (sorted descending for coverage check) */
  mimoMap: Record<string, number[]>;
  dlQamMap: Record<string, number[]>;
  dlBwMap: Record<string, number[]>;
  ulQamMap: Record<string, number[]>;
  ulMimoMap: Record<string, number[]>;
  ulBwMap: Record<string, number[]>;
}

function parseBwMhz(bw: string | undefined): number {
  if (!bw) return 0;
  const n = parseFloat(bw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function isFr2Band(b: BandParameter): boolean {
  return b.ratType === 'nr' && b.band >= 257;
}

function dlBandScore(b: BandParameter): number {
  const cc = b.bandwidthClassDL ? getBwClassCcCount(b.bandwidthClassDL, b.ratType, isFr2Band(b)) : 0;
  return cc * 1000 + (b.dlMimo ?? 0) * 100 + qamRank(b.dlQam) * 10 + Math.min(9, parseBwMhz(b.dlBandwidth) / 100);
}

function ulBandScore(b: BandParameter): number {
  const cc = b.bandwidthClassUL ? getBwClassCcCount(b.bandwidthClassUL, b.ratType, isFr2Band(b)) : 0;
  return cc * 1000 + (b.ulMimo ?? 1) * 100 + qamRank(b.ulQam) * 10 + Math.min(9, parseBwMhz(b.ulBandwidth) / 100);
}

function buildComboCache(combo: BandCombination, key: string): ComboCache {
  const dlGroups: Record<string, BandParameter[]> = {};
  const ulGroups: Record<string, BandParameter[]> = {};
  const ulM: Record<string, number> = {};
  let ulTotal = 0;

  // Track parameter values per band type (sorted descending for coverage)
  const mimoMap: Record<string, number[]> = {};
  const dlQamMap: Record<string, number[]> = {};
  const dlBwMap: Record<string, number[]> = {};
  const ulQamMap: Record<string, number[]> = {};
  const ulMimoMap: Record<string, number[]> = {};
  const ulBwMap: Record<string, number[]> = {};

  let dlCcSum = 0;
  let ulCcSum = 0;

  for (const b of combo.bands) {
    const groupKey = `${b.ratType}:${b.band}`;
    const isFr2 = isFr2Band(b);

    // SUL-only bands have bandwidthClassUL without bandwidthClassDL and must not contribute to DL groups/CCs.
    if (b.bandwidthClassDL || !b.bandwidthClassUL) {
      (dlGroups[groupKey] ??= []).push(b);

      const k = `${groupKey}:${b.bandwidthClassDL ?? 'a'}`;
      (mimoMap[k] ??= []).push(b.dlMimo ?? 0);
      (dlQamMap[k] ??= []).push(qamRank(b.dlQam));
      (dlBwMap[k] ??= []).push(parseBwMhz(b.dlBandwidth));
      if (b.bandwidthClassDL) {
        dlCcSum += getBwClassCcCount(b.bandwidthClassDL, b.ratType, isFr2);
      }
    }

    if (b.bandwidthClassUL) {
      (ulGroups[groupKey] ??= []).push(b);
      ulM[groupKey] = (ulM[groupKey] ?? 0) + 1;
      ulTotal++;

      const uk = `${groupKey}:${b.bandwidthClassUL}`;
      (ulQamMap[uk] ??= []).push(qamRank(b.ulQam));
      (ulMimoMap[uk] ??= []).push(b.ulMimo ?? 1);
      (ulBwMap[uk] ??= []).push(parseBwMhz(b.ulBandwidth));
      ulCcSum += getBwClassCcCount(b.bandwidthClassUL, b.ratType, isFr2);
    }
  }

  const dlGroupKeys = Object.keys(dlGroups).sort();
  const ulGroupKeys = Object.keys(ulGroups);

  let bandFingerprint = '';
  for (let i = 0; i < dlGroupKeys.length; i++) {
    const gk = dlGroupKeys[i];
    const grp = dlGroups[gk];
    if (grp.length > 1) grp.sort((a, b) => dlBandScore(b) - dlBandScore(a));
    if (i > 0) bandFingerprint += ',';
    bandFingerprint += `${gk}×${grp.length}`;
  }

  for (const gk of ulGroupKeys) {
    const grp = ulGroups[gk];
    if (grp.length > 1) grp.sort((a, b) => ulBandScore(b) - ulBandScore(a));
  }

  // Sort parameter arrays descending only when multiple CCs share a band/class key
  const allMaps = [mimoMap, dlQamMap, dlBwMap, ulQamMap, ulMimoMap, ulBwMap];
  for (const m of allMaps) {
    for (const k of Object.keys(m)) {
      if (m[k].length > 1) m[k].sort((x, y) => y - x);
    }
  }

  // Use FeatureSet-based CC count if available, otherwise fallback to bandwidth class
  const caLevel = combo.dlCc ?? dlCcSum;
  const ulLevel = combo.ulCc ?? ulCcSum;

  return {
    key,
    combo,
    bandFingerprint,
    dlGroups,
    dlGroupKeys,
    ulGroups,
    ulGroupKeys,
    ulCounts: { m: ulM, total: ulTotal },
    caLevel,
    ulLevel,
    mimoMap,
    dlQamMap,
    dlBwMap,
    ulQamMap,
    ulMimoMap,
    ulBwMap,
  };
}

const CONTIGUOUS_BW_CHAIN = ['a', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] as const;
const FR2_FALLBACK_CHAINS = [
  ['a', 'd', 'e', 'f'],
  ['a', 'g', 'h', 'i', 'j', 'k', 'l', 'm'],
  ['a', 'q'],
  ['a', 'b'],
  ['a', 'c'],
] as const;

/**
 * 3GPP TS 36.101 Table 5.6A.1-1 / TS 36.306 §4.3.5.12 / TS 38.306 §4.2.7.10 / TS 38.101-2 Table 5.3A.4-1:
 * A parent CA bandwidth class covers an equal or smaller contiguous fallback class within the same
 * fallback group (e.g. c -> a, FR2 m -> g -> a), never a larger one or a disjoint FR2 group (d vs g).
 */
function bwClassCovers(
  smallCls: string | undefined,
  largeCls: string | undefined,
  ratType?: 'nr' | 'eutra',
  isFr2 = false
): boolean {
  const s = (smallCls || 'a').toLowerCase();
  const l = (largeCls || 'a').toLowerCase();
  if (s === l) return true;
  if (ratType === 'nr' && isFr2) {
    return FR2_FALLBACK_CHAINS.some((chain) => {
      const sIdx = chain.indexOf(s as never);
      const lIdx = chain.indexOf(l as never);
      return sIdx >= 0 && lIdx >= 0 && lIdx >= sIdx;
    });
  }
  if (s === 'a' && l === 'b') return true;
  const sIdx = CONTIGUOUS_BW_CHAIN.indexOf(s as (typeof CONTIGUOUS_BW_CHAIN)[number]);
  const lIdx = CONTIGUOUS_BW_CHAIN.indexOf(l as (typeof CONTIGUOUS_BW_CHAIN)[number]);
  return sIdx >= 0 && lIdx >= 0 && lIdx >= sIdx;
}

function dlEntryCovers(
  s: BandParameter,
  l: BandParameter,
  opts: Pick<ComboDisplayOptions, 'showQam' | 'showMimo'> = {},
  requireSameDlBwClass = false
): boolean {
  if (s.ratType !== l.ratType || s.band !== l.band) return false;
  const { showQam = true, showMimo = true } = opts;

  if (requireSameDlBwClass) {
    if ((s.bandwidthClassDL || 'a').toLowerCase() !== (l.bandwidthClassDL || 'a').toLowerCase()) {
      return false;
    }
  } else if (!bwClassCovers(s.bandwidthClassDL, l.bandwidthClassDL, s.ratType, isFr2Band(s))) {
    return false;
  }

  if (showMimo && (l.dlMimo ?? 0) < (s.dlMimo ?? 0)) return false;
  if (showQam && qamRank(l.dlQam) < qamRank(s.dlQam)) return false;
  const sBw = parseBwMhz(s.dlBandwidth);
  if (sBw > 0 && parseBwMhz(l.dlBandwidth) < sBw) return false;
  return true;
}

function ulEntryCovers(
  s: BandParameter,
  l: BandParameter,
  opts: Pick<ComboDisplayOptions, 'showQam' | 'showMimo'> = {},
  requireSameUlBwClass = false
): boolean {
  if (s.ratType !== l.ratType || s.band !== l.band) return false;
  if (!s.bandwidthClassUL || !l.bandwidthClassUL) return false;
  const { showQam = true, showMimo = true } = opts;

  if (requireSameUlBwClass) {
    if (s.bandwidthClassUL.toLowerCase() !== l.bandwidthClassUL.toLowerCase()) {
      return false;
    }
  } else if (!bwClassCovers(s.bandwidthClassUL, l.bandwidthClassUL, s.ratType, isFr2Band(s))) {
    return false;
  }

  if (showMimo && (l.ulMimo ?? 1) < (s.ulMimo ?? 1)) return false;
  if (showQam && qamRank(l.ulQam) < qamRank(s.ulQam)) return false;
  const sBw = parseBwMhz(s.ulBandwidth);
  if (sBw > 0 && parseBwMhz(l.ulBandwidth) < sBw) return false;
  return true;
}

interface MatchedBandPair {
  s: BandParameter;
  l: BandParameter;
}

interface CoveringMatchResult {
  dlPairs: MatchedBandPair[];
  ulPairs: MatchedBandPair[];
}

/**
 * Matches pre-grouped, pre-sorted entries 1-to-1 within each (ratType, band) group
 * without allocating temporary maps or sorted arrays in the hot matching path.
 */
function matchBandGroups(
  sGroups: Record<string, BandParameter[]>,
  sKeys: string[],
  lGroups: Record<string, BandParameter[]>,
  coversFn: (s: BandParameter, l: BandParameter) => boolean
): MatchedBandPair[] | null {
  if (sKeys.length === 0) return [];

  for (const k of sKeys) {
    const lList = lGroups[k];
    if (!lList || lList.length < sGroups[k].length) return null;
  }

  const matched: MatchedBandPair[] = [];

  for (const k of sKeys) {
    const sList = sGroups[k];
    const lList = lGroups[k];
    if (sList.length === 1 && lList.length === 1) {
      if (!coversFn(sList[0], lList[0])) return null;
      matched.push({ s: sList[0], l: lList[0] });
      continue;
    }

    const usedL = new Array<boolean>(lList.length).fill(false);
    const groupPairs: MatchedBandPair[] = [];

    const backtrack = (sIdx: number): boolean => {
      if (sIdx === sList.length) return true;
      const sEntry = sList[sIdx];
      for (let lIdx = 0; lIdx < lList.length; lIdx++) {
        if (usedL[lIdx]) continue;
        if (coversFn(sEntry, lList[lIdx])) {
          usedL[lIdx] = true;
          groupPairs.push({ s: sEntry, l: lList[lIdx] });
          if (backtrack(sIdx + 1)) return true;
          groupPairs.pop();
          usedL[lIdx] = false;
        }
      }
      return false;
    };

    if (!backtrack(0)) return null;
    matched.push(...groupPairs);
  }

  return matched;
}

/**
 * Matches DL band entries and UL band entries independently within each (ratType, band)
 * group so repeated non-contiguous carriers (e.g. B7a+B7a) are not tied to one vendor's
 * arbitrary UL attachment order.
 */
function matchCoveringBandEntries(
  smallCache: ComboCache,
  largeCache: ComboCache,
  opts: Pick<ComboDisplayOptions, 'showQam' | 'showMimo'> = {},
  requireSameDlBwClass = false,
  requireSameUlBwClass = false
): CoveringMatchResult | null {
  if (smallCache.combo.bands.length > largeCache.combo.bands.length) return null;
  if (smallCache.ulCounts.total > largeCache.ulCounts.total) return null;

  const dlPairs = matchBandGroups(
    smallCache.dlGroups,
    smallCache.dlGroupKeys,
    largeCache.dlGroups,
    (s, l) => dlEntryCovers(s, l, opts, requireSameDlBwClass)
  );
  if (!dlPairs) return null;

  const ulPairs = matchBandGroups(
    smallCache.ulGroups,
    smallCache.ulGroupKeys,
    largeCache.ulGroups,
    (s, l) => ulEntryCovers(s, l, opts, requireSameUlBwClass)
  );
  if (!ulPairs) return null;

  return { dlPairs, ulPairs };
}

function collectCoverageParamNotes(
  match: CoveringMatchResult,
  opts: Pick<ComboDisplayOptions, 'showQam' | 'showMimo'> = {}
): string[] {
  const { showQam = true, showMimo = true } = opts;
  const notes: string[] = [];

  for (const { s, l } of match.dlPairs) {
    const prefix = s.ratType === 'nr' ? `n${s.band}` : `B${s.band}`;
    const sDlCls = s.bandwidthClassDL ?? 'a';
    const lDlCls = l.bandwidthClassDL ?? 'a';
    if (sDlCls.toLowerCase() !== lDlCls.toLowerCase()) {
      notes.push(`${prefix} DL-class: ${sDlCls}→${lDlCls}`);
    }
    if (showMimo && (l.dlMimo ?? 0) > (s.dlMimo ?? 0) && l.dlMimo !== undefined) {
      notes.push(`${prefix} DL-MIMO: ${s.dlMimo ?? '—'}→${l.dlMimo}`);
    }
    if (showQam && qamRank(l.dlQam) > qamRank(s.dlQam)) {
      const sLabel = QAM_LABELS[qamRank(s.dlQam)] || String(s.dlQam ?? '64QAM');
      const lLabel = QAM_LABELS[qamRank(l.dlQam)] || String(l.dlQam ?? '');
      notes.push(`${prefix} DL-QAM: ${sLabel}→${lLabel}`);
    }
    if (parseBwMhz(l.dlBandwidth) > parseBwMhz(s.dlBandwidth) && l.dlBandwidth) {
      notes.push(`${prefix} DL-BW: ${s.dlBandwidth ?? '—'}→${l.dlBandwidth}`);
    }
  }

  for (const { s, l } of match.ulPairs) {
    if (!s.bandwidthClassUL || !l.bandwidthClassUL) continue;
    const prefix = s.ratType === 'nr' ? `n${s.band}` : `B${s.band}`;
    if (s.bandwidthClassUL.toLowerCase() !== l.bandwidthClassUL.toLowerCase()) {
      notes.push(`${prefix} UL-class: ${s.bandwidthClassUL}→${l.bandwidthClassUL}`);
    }
    const sUlMimo = s.ulMimo ?? 1;
    const lUlMimo = l.ulMimo ?? 1;
    if (showMimo && lUlMimo > sUlMimo) {
      notes.push(`${prefix} UL-MIMO: ${sUlMimo}→${lUlMimo}`);
    }
    if (showQam && qamRank(l.ulQam) > qamRank(s.ulQam)) {
      const sLabel = QAM_LABELS[qamRank(s.ulQam)] || String(s.ulQam ?? '64QAM');
      const lLabel = QAM_LABELS[qamRank(l.ulQam)] || String(l.ulQam ?? '');
      notes.push(`${prefix} UL-QAM: ${sLabel}→${lLabel}`);
    }
    if (parseBwMhz(l.ulBandwidth) > parseBwMhz(s.ulBandwidth) && l.ulBandwidth) {
      notes.push(`${prefix} UL-BW: ${s.ulBandwidth ?? '—'}→${l.ulBandwidth}`);
    }
  }

  return notes;
}

function appendExtraUlCoverageNote(notes: string[], fewerCache: ComboCache, moreCache: ComboCache): void {
  const extraUl = moreCache.ulGroupKeys
    .filter((k) => moreCache.ulGroups[k].length > (fewerCache.ulGroups[k]?.length ?? 0))
    .map((k) => {
      const [rt, band] = k.split(':');
      return rt === 'nr' ? `n${band}` : `B${band}`;
    });
  if (extraUl.length > 0) {
    notes.push(`UL ${extraUl.join('+')} carrier added coverage (${fewerCache.ulLevel}UL→${moreCache.ulLevel}UL)`);
  }
}

/**
 * Determine if small is a strict 3GPP fallback subset of large (cache-based).
 * Enforces per-band DL BW class containment, UL carrier + UL BW class containment,
 * and per-entry MIMO/QAM dominance.
 */
function isSubsetCombo(
  smallCache: ComboCache,
  largeCache: ComboCache,
  opts: Pick<ComboDisplayOptions, 'showQam' | 'showMimo'> = {}
): { isSubset: boolean; paramNotes: string[] } {
  if (smallCache.caLevel >= largeCache.caLevel) return { isSubset: false, paramNotes: [] };
  if (smallCache.ulLevel > largeCache.ulLevel) return { isSubset: false, paramNotes: [] };

  const match = matchCoveringBandEntries(smallCache, largeCache, opts, false, false);
  if (!match) return { isSubset: false, paramNotes: [] };

  const paramNotes = collectCoverageParamNotes(match, opts);
  appendExtraUlCoverageNote(paramNotes, smallCache, largeCache);
  return { isSubset: true, paramNotes };
}

/**
 * UL carrier & contiguous UL class subset coverage (3GPP TS 36.101 §5.5A / TS 36.306 §4.3.5.12)
 *
 * Between two combos with the same DL band & BW class set, the one with more UL CCs
 * (extra UL carriers or wider contiguous UL BW class e.g. UL,c ⊇ UL,a) covers the smaller
 * if all existing DL/UL entries also dominate MIMO/QAM.
 */
function isUlCoveredCombo(
  fewerCache: ComboCache,
  moreCache: ComboCache,
  opts: Pick<ComboDisplayOptions, 'showQam' | 'showMimo'> = {}
): { isCovered: boolean; paramNotes: string[] } {
  if (fewerCache.caLevel !== moreCache.caLevel) return { isCovered: false, paramNotes: [] };

  // O(1) fingerprint check — return immediately if band multisets differ
  if (fewerCache.bandFingerprint !== moreCache.bandFingerprint) return { isCovered: false, paramNotes: [] };
  if (fewerCache.combo.bands.length > moreCache.combo.bands.length) return { isCovered: false, paramNotes: [] };

  const fewer = fewerCache.ulCounts;
  const more = moreCache.ulCounts;

  if (fewerCache.ulLevel >= moreCache.ulLevel && fewer.total >= more.total) {
    return { isCovered: false, paramNotes: [] };
  }

  for (const [k, count] of Object.entries(fewer.m)) {
    if ((more.m[k] ?? 0) < count) return { isCovered: false, paramNotes: [] };
  }

  const match = matchCoveringBandEntries(fewerCache, moreCache, opts, true, false);
  if (!match) return { isCovered: false, paramNotes: [] };

  const paramNotes = collectCoverageParamNotes(match, opts);
  appendExtraUlCoverageNote(paramNotes, fewerCache, moreCache);

  return { isCovered: true, paramNotes };
}

/**
 * QAM capability ordering for coverage dominance check.
 * 3GPP default UL modulation is 64QAM (TS 36.101 mandatory minimum).
 * undefined → 64QAM (UE did not report higher capability).
 * Higher rank = superset of lower rank.
 */
function qamRank(q: string | undefined): number {
  switch (q?.toLowerCase()) {
    case '1024qam':
    case 'qam1024': return 3;
    case '256qam':
    case 'qam256':  return 2;
    case '64qam':
    case 'qam64':   return 1;
    case '16qam':
    case 'qam16':   return 0;
    default:        return 1; // undefined = 64QAM default
  }
}

/**
 * Check if stronger's MIMO array covers weaker's MIMO array.
 * Each index represents a CC, sorted descending. stronger[i] >= weaker[i] for all i.
 */
function mimoCovers(weakerMimos: number[], strongerMimos: number[]): boolean {
  if (strongerMimos.length < weakerMimos.length) return false;
  for (let i = 0; i < weakerMimos.length; i++) {
    if (strongerMimos[i] < weakerMimos[i]) return false;
  }
  return true;
}

function isParamCoveredCombo(
  weakerCache: ComboCache,
  strongerCache: ComboCache,
  opts: Pick<ComboDisplayOptions, 'showQam' | 'showMimo'> = {}
): { isCovered: boolean; paramNotes: string[] } {
  if (weakerCache.caLevel !== strongerCache.caLevel) return { isCovered: false, paramNotes: [] };
  if (weakerCache.ulLevel !== strongerCache.ulLevel) return { isCovered: false, paramNotes: [] };

  // O(1) fingerprint check
  if (weakerCache.bandFingerprint !== strongerCache.bandFingerprint) return { isCovered: false, paramNotes: [] };
  if (weakerCache.combo.bands.length !== strongerCache.combo.bands.length) return { isCovered: false, paramNotes: [] };

  const weakerUL = weakerCache.ulCounts;
  const strongerUL = strongerCache.ulCounts;
  if (weakerUL.total !== strongerUL.total) return { isCovered: false, paramNotes: [] };
  for (const [k, count] of Object.entries(weakerUL.m)) {
    if ((strongerUL.m[k] ?? 0) !== count) return { isCovered: false, paramNotes: [] };
  }

  if (!matchCoveringBandEntries(weakerCache, strongerCache, opts, true, true)) {
    return { isCovered: false, paramNotes: [] };
  }

  const { showQam = true, showMimo = true } = opts;
  const mapsToCompare: Array<{ weaker: Record<string, number[]>; stronger: Record<string, number[]>; label: string }> = [
    ...(showMimo
      ? [
          { weaker: weakerCache.mimoMap, stronger: strongerCache.mimoMap, label: 'DL-MIMO' },
          { weaker: weakerCache.ulMimoMap, stronger: strongerCache.ulMimoMap, label: 'UL-MIMO' },
        ]
      : []),
    ...(showQam
      ? [
          { weaker: weakerCache.dlQamMap, stronger: strongerCache.dlQamMap, label: 'DL-QAM' },
          { weaker: weakerCache.ulQamMap, stronger: strongerCache.ulQamMap, label: 'UL-QAM' },
        ]
      : []),
    { weaker: weakerCache.dlBwMap, stronger: strongerCache.dlBwMap, label: 'DL-BW' },
    { weaker: weakerCache.ulBwMap, stronger: strongerCache.ulBwMap, label: 'UL-BW' },
  ];

  for (const { weaker, stronger } of mapsToCompare) {
    for (const [bandKey, weakerVals] of Object.entries(weaker)) {
      const strongerVals = stronger[bandKey];
      // stronger must have at least as many carriers in this band and each carrier must be >=
      if (!strongerVals || !mimoCovers(weakerVals, strongerVals)) {
        return { isCovered: false, paramNotes: [] };
      }
    }
  }

  // Parameter dominance: stronger ≥ weaker on all params, strictly > on at least one
  const paramNotes: string[] = [];
  let hasStrictlyBetter = false;

  for (const { weaker, stronger, label } of mapsToCompare) {
    for (const [bandKey, weakerVals] of Object.entries(weaker)) {
      const strongerVals = stronger[bandKey];
      if (!strongerVals) continue;

      for (let i = 0; i < weakerVals.length; i++) {
        if (strongerVals[i] > weakerVals[i]) {
          hasStrictlyBetter = true;
          const [rat, band, bwClass] = bandKey.split(':');
          const prefix = rat === 'nr' ? `n${band}` : `B${band}`;
          
          let sVal = String(strongerVals[i]);
          let wVal = String(weakerVals[i]);
          if (label.includes('QAM')) {
            sVal = QAM_LABELS[strongerVals[i]] || sVal;
            wVal = QAM_LABELS[weakerVals[i]] || wVal;
            paramNotes.push(`${prefix}(${bwClass}) ${label}: ${sVal} covers ${wVal}`);
          } else if (label.includes('BW')) {
            sVal = `${strongerVals[i]}MHz`;
            wVal = weakerVals[i] > 0 ? `${weakerVals[i]}MHz` : '—';
            paramNotes.push(`${prefix}(${bwClass}) ${label}: ${sVal} covers ${wVal}`);
          } else {
            paramNotes.push(`${prefix}(${bwClass}) ${label}: ${sVal} covers ${wVal}`);
          }
        }
      }
    }
  }

  if (!hasStrictlyBetter) return { isCovered: false, paramNotes: [] };

  return { isCovered: true, paramNotes };
}

// ─── Band combination comparison ─────────────────────────────────────────────

function sortBandParamsDeterministically(params: BandParameter[]): BandParameter[] {
  return [...params].sort((a, b) => {
    if (a.ratType !== b.ratType) return a.ratType === 'eutra' ? -1 : 1;
    if (a.band !== b.band) return a.band - b.band;
    const scoreDiff = dlBandScore(b) + ulBandScore(b) - (dlBandScore(a) + ulBandScore(a));
    if (scoreDiff !== 0) return scoreDiff;
    return (b.bandwidthClassUL ?? '').localeCompare(a.bandwidthClassUL ?? '');
  });
}

function compareOnePairBandParams(
  paramsA: BandParameter[],
  paramsB: BandParameter[]
): BandParamDiff[] {
  const sortedA = sortBandParamsDeterministically(paramsA);
  const sortedB = sortBandParamsDeterministically(paramsB);
  const diffs: BandParamDiff[] = [];
  const usedB = new Set<number>();
  for (const bpA of sortedA) {
    const matchIdx = sortedB.findIndex(
      (bpB, i) => !usedB.has(i) && bpB.ratType === bpA.ratType && bpB.band === bpA.band
    );
    const bpB = matchIdx >= 0 ? sortedB[matchIdx] : undefined;
    if (matchIdx >= 0) usedB.add(matchIdx);

    const prefix = bpA.ratType === 'nr' ? 'n' : 'B';
    const displayName = `${prefix}${bpA.band}`;
    const ulMimoA = bpA.bandwidthClassUL ? (bpA.ulMimo ?? 1) : undefined;
    const ulMimoB = bpB?.bandwidthClassUL ? (bpB.ulMimo ?? 1) : undefined;
    const ulQamA = bpA.bandwidthClassUL ? bpA.ulQam : undefined;
    const ulQamB = bpB?.bandwidthClassUL ? bpB.ulQam : undefined;
    diffs.push({
      band: bpA.band,
      ratType: bpA.ratType,
      displayName,
      bandwidthClassDL: prop(bpA.bandwidthClassDL, bpB?.bandwidthClassDL),
      bandwidthClassUL: prop(bpA.bandwidthClassUL, bpB?.bandwidthClassUL),
      dlMimo: prop(bpA.dlMimo, bpB?.dlMimo),
      ulMimo: prop(ulMimoA, ulMimoB),
      dlQam: prop(bpA.dlQam, bpB?.dlQam),
      ulQam: prop(ulQamA, ulQamB),
    });
  }
  return diffs;
}

function valDisplay(v: any): string {
  if (v === undefined || v === null) return '--';
  if (typeof v === 'boolean') return v ? 'O' : 'X';
  if (Array.isArray(v)) return `[${v.join(',')}]`;
  return String(v);
}

function compareComboLevelParams(a: BandCombination, b: BandCombination): string[] {
  const notes: string[] = [];
  const diff = (valA: any, valB: any, label: string) => {
    if (!fastEqual(valA, valB)) {
      notes.push(`${label}: ${valDisplay(valA)}→${valDisplay(valB)}`);
    }
  };

  // BCS
  diff(a.supportedBandwidthCombinationSet, b.supportedBandwidthCombinationSet, 'BCS');
  diff(a.supportedBandwidthCombinationSetEUTRA, b.supportedBandwidthCombinationSetEUTRA, 'BCS-EUTRA');

  // Top-level Power Class
  diff(a.powerClass, b.powerClass, 'PowerClass');

  // MRDC Parameters
  const mrdcKeys = ['dynamicPowerSharingENDC', 'tdm_PatternConfig', 'simultaneousRxTxInterBandENDC', 'asyncIntraBandENDC', 'powerClass'] as const;
  for (const k of mrdcKeys) {
    diff(a.mrdcParameters?.[k], b.mrdcParameters?.[k], k);
  }

  // CA Parameters NR
  const caKeys = [
    'simultaneousRxTxInterBandCA',
    'diffNumerologyWithinPUCCHGroupSmallerSCS',
    'diffNumerologyWithinPUCCHGroupLargerSCS',
    'maxNumberSimultaneousNZPCSIRSAllCC',
    'totalNumberPortsSimultaneousNZPCSIRSAllCC',
    'simultaneousCSIReportsAllCC'
  ] as const;
  for (const k of caKeys) {
    diff(a.caParametersNR?.[k], b.caParametersNR?.[k], k);
  }

  // Aggregated BW
  const aggKeys = ['fddDl', 'fddUl', 'tddDl', 'tddUl', 'totalDl', 'totalUl', 'scalingFactorSCS'] as const;
  for (const k of aggKeys) {
    diff(a.aggregatedBw?.[k], b.aggregatedBw?.[k], `AggBW-${k}`);
  }

  return notes;
}

function buildCoverageDirection(
  comboDiffs: ComboDiff[],
  srcSide: 'a' | 'b'
): CoverageDirection {
  const coveredStatus: ComboMatchStatus = srcSide === 'a' ? 'a-only-covered' : 'b-only-covered';
  const uniqueStatus: ComboMatchStatus = srcSide === 'a' ? 'a-only-unique' : 'b-only-unique';

  // Single-pass counting over deduplicated combo keys
  let exactSame = 0, exactChanged = 0, covered = 0, unique = 0;
  for (const d of comboDiffs) {
    if (d.status === 'exact-same') exactSame++;
    else if (d.status === 'exact-changed') exactChanged++;
    else if (d.status === coveredStatus) covered++;
    else if (d.status === uniqueStatus) unique++;
  }

  const total = exactSame + exactChanged + covered + unique;
  const coverageRate = total === 0
    ? 1
    : (exactSame + exactChanged + covered) / total;

  return { exactMatch: exactSame, exactChanged, coveredBySuperset: covered, trulyUnique: unique, total, coverageRate };
}

function comboCapabilityScore(c: BandCombination): number {
  return c.bands.reduce((acc, bp) => acc + dlBandScore(bp) + (bp.bandwidthClassUL ? ulBandScore(bp) : 0), 0);
}

function insertStrongerCombo(map: Map<string, BandCombination>, key: string, c: BandCombination): void {
  const existing = map.get(key);
  if (!existing || comboCapabilityScore(c) > comboCapabilityScore(existing)) {
    map.set(key, c);
  }
}

function indexCandidates(caches: Iterable<ComboCache>): {
  byLevel: Map<number, ComboCache[]>;
  byFingerprint: Map<string, ComboCache[]>;
  maxLevel: number;
} {
  const byLevel = new Map<number, ComboCache[]>();
  const byFingerprint = new Map<string, ComboCache[]>();
  let maxLevel = 0;

  for (const c of caches) {
    let lvlArr = byLevel.get(c.caLevel);
    if (!lvlArr) { lvlArr = []; byLevel.set(c.caLevel, lvlArr); }
    lvlArr.push(c);
    if (c.caLevel > maxLevel) maxLevel = c.caLevel;

    let fpArr = byFingerprint.get(c.bandFingerprint);
    if (!fpArr) { fpArr = []; byFingerprint.set(c.bandFingerprint, fpArr); }
    fpArr.push(c);
  }

  return { byLevel, byFingerprint, maxLevel };
}

function compareCombos(
  combosA: BandCombination[],
  combosB: BandCombination[],
  opts: Pick<ComboDisplayOptions, 'showQam' | 'showMimo'> = {}
): { comboDiffs: ComboDiff[]; coverage: CoverageAnalysis } {
  const useCachedKey = opts.showQam !== false && opts.showMimo !== false;
  const getComboKey = (c: BandCombination): string =>
    useCachedKey && c.key ? c.key : generateCombinationKey(c, opts);

  const mapA = new Map<string, BandCombination>();
  const mapB = new Map<string, BandCombination>();

  for (const c of combosA) insertStrongerCombo(mapA, getComboKey(c), c);
  for (const c of combosB) insertStrongerCombo(mapB, getComboKey(c), c);

  // Pre-build caches once per combo — avoids O(n²) recomputation in coverage loops
  const cacheA = new Map<string, ComboCache>();
  const cacheB = new Map<string, ComboCache>();
  for (const [key, c] of mapA) cacheA.set(key, buildComboCache(c, key));
  for (const [key, c] of mapB) cacheB.set(key, buildComboCache(c, key));

  const diffs: ComboDiff[] = [];

  // Layer 1: exact key match
  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  for (const key of allKeys) {
    const a = mapA.get(key);
    const b = mapB.get(key);

    if (a && b) {
      const bandParamDiffs = compareOnePairBandParams(a.bands, b.bands);
      const comboLevelNotes = compareComboLevelParams(a, b);
      
      const bandParamChanged = bandParamDiffs.some(d =>
        [d.bandwidthClassDL, d.bandwidthClassUL, d.dlMimo, d.ulMimo, d.dlQam, d.ulQam]
          .some(p => p && p.status !== 'same')
      );

      const notes: string[] = [...comboLevelNotes];
      if (bandParamChanged) {
        for (const bd of bandParamDiffs) {
          const props = [
            { v: bd.bandwidthClassDL, l: 'classDL' },
            { v: bd.bandwidthClassUL, l: 'classUL' },
            { v: bd.dlMimo, l: 'DL-MIMO' },
            { v: bd.ulMimo, l: 'UL-MIMO' },
            { v: bd.dlQam, l: 'DL-QAM' },
            { v: bd.ulQam, l: 'UL-QAM' },
          ];
          for (const p of props) {
            if (p.v && p.v.status !== 'same') {
              notes.push(`${bd.displayName} ${p.l}: ${valDisplay(p.v.a)}→${valDisplay(p.v.b)}`);
            }
          }
        }
      }

      const changed = notes.length > 0;

      // Use cached values from ComboCache
      const cachedA = cacheA.get(key)!;
      const caLevel = cachedA.caLevel;
      const ulLevel = cachedA.ulLevel;
      diffs.push({
        key,
        caLevel,
        ulLevel,
        status: changed ? 'exact-changed' : 'exact-same',
        a,
        b,
        bandParamDiffs,
        paramNotes: notes.length > 0 ? notes : undefined,
      });
    } else if (a) {
      // Use cached values from ComboCache
      const cachedA = cacheA.get(key)!;
      diffs.push({
        key,
        caLevel: cachedA.caLevel,
        ulLevel: cachedA.ulLevel,
        status: 'a-only-unique',
        a,
      });
    } else if (b) {
      // Use cached values from ComboCache
      const cachedB = cacheB.get(key)!;
      diffs.push({
        key,
        caLevel: cachedB.caLevel,
        ulLevel: cachedB.ulLevel,
        status: 'b-only-unique',
        b: b!,
      });
    }
  }

  // Layer 2: subset coverage analysis via level & fingerprint indices
  const idxB = indexCandidates(cacheB.values());
  const idxA = indexCandidates(cacheA.values());

  const findCoveringSuperset = (
    targetCache: ComboCache,
    candidateByLevel: Map<number, ComboCache[]>,
    candidateByFingerprint: Map<string, ComboCache[]>,
    maxCandidateLevel: number
  ): { supersets: string[]; notes: string[] } | null => {
    const sameBandCands = candidateByFingerprint.get(targetCache.bandFingerprint);

    if (sameBandCands) {
      // 1. Param-covered: same caLevel + DL/UL band/class set, higher MIMO/QAM
      for (const cand of sameBandCands) {
        const r = isParamCoveredCombo(targetCache, cand, opts);
        if (r.isCovered) {
          return { supersets: [cand.key], notes: r.paramNotes };
        }
      }

      // 2. UL-covered: same caLevel + DL band/class set, more UL carriers or wider contiguous UL class
      for (const cand of sameBandCands) {
        const r = isUlCoveredCombo(targetCache, cand, opts);
        if (r.isCovered) {
          return { supersets: [cand.key], notes: r.paramNotes };
        }
      }
    }

    // 3. Subset-covered: strictly larger caLevel (more DL CCs/bands or wider DL BW class)
    for (let lvl = targetCache.caLevel + 1; lvl <= maxCandidateLevel; lvl++) {
      for (const cand of (candidateByLevel.get(lvl) ?? [])) {
        const r = isSubsetCombo(targetCache, cand, opts);
        if (r.isSubset) {
          return { supersets: [cand.key], notes: r.paramNotes };
        }
      }
    }

    return null;
  };

  for (const diff of diffs) {
    if (diff.status === 'a-only-unique' && diff.a) {
      const hit = findCoveringSuperset(cacheA.get(diff.key!)!, idxB.byLevel, idxB.byFingerprint, idxB.maxLevel);
      if (hit) {
        diff.status = 'a-only-covered';
        diff.coveringSupersets = [...new Set(hit.supersets)];
        diff.paramNotes = [...new Set(hit.notes)];
      }
    } else if (diff.status === 'b-only-unique' && diff.b) {
      const hit = findCoveringSuperset(cacheB.get(diff.key!)!, idxA.byLevel, idxA.byFingerprint, idxA.maxLevel);
      if (hit) {
        diff.status = 'b-only-covered';
        diff.coveringSupersets = [...new Set(hit.supersets)];
        diff.paramNotes = [...new Set(hit.notes)];
      }
    }
  }

  // Layer 3: coverage scoring
  const aToB = buildCoverageDirection(diffs, 'a');
  const bToA = buildCoverageDirection(diffs, 'b');

  return { comboDiffs: diffs, coverage: { aToB, bToA } };
}

// ─── RAT comparison ──────────────────────────────────────────────────────────

function compareRat(
  ratType: RatType,
  ratA: { bands: (NRBandInfo | EutraBandInfo | UtraBandInfo)[]; bandCombinations: BandCombination[] } | undefined,
  ratB: { bands: (NRBandInfo | EutraBandInfo | UtraBandInfo)[]; bandCombinations: BandCombination[] } | undefined,
  opts: Pick<ComboDisplayOptions, 'showQam' | 'showMimo'> = {}
): RatCompareResult | null {
  if (!ratA && !ratB) return null;

  const bandsA = ratA?.bands ?? [];
  const bandsB = ratB?.bands ?? [];

  let bandDiffs: BandDiff[];
  if (ratType === 'nr') {
    bandDiffs = compareNRBands(bandsA as NRBandInfo[], bandsB as NRBandInfo[]);
  } else if (ratType === 'eutra') {
    bandDiffs = compareEutraBands(bandsA as EutraBandInfo[], bandsB as EutraBandInfo[]);
  } else if (ratType === 'eutra-nr') {
    bandDiffs = compareMrdcBands(
      bandsA as (NRBandInfo | EutraBandInfo)[],
      bandsB as (NRBandInfo | EutraBandInfo)[]
    );
  } else {
    bandDiffs = compareUtraBands(bandsA as UtraBandInfo[], bandsB as UtraBandInfo[]);
  }

  const combosA = ratA?.bandCombinations ?? [];
  const combosB = ratB?.bandCombinations ?? [];
  const { comboDiffs, coverage } = compareCombos(combosA, combosB, opts);

  return { bandDiffs, comboDiffs, coverage };
}

// ─── Summary generation ──────────────────────────────────────────────────────

function buildRatSummary(result: RatCompareResult): RatSummary {
  const { bandDiffs, comboDiffs, coverage } = result;
  let sharedBands = 0, aOnlyBands = 0, bOnlyBands = 0, changedBands = 0;
  for (const d of bandDiffs) {
    if (d.status === 'same') sharedBands++;
    else if (d.status === 'changed') { sharedBands++; changedBands++; }
    else if (d.status === 'a-only') aOnlyBands++;
    else if (d.status === 'b-only') bOnlyBands++;
  }

  let exactSame = 0, exactChanged = 0, aOnlyCovered = 0, aOnlyUnique = 0, bOnlyCovered = 0, bOnlyUnique = 0;
  for (const d of comboDiffs) {
    switch (d.status) {
      case 'exact-same': exactSame++; break;
      case 'exact-changed': exactChanged++; break;
      case 'a-only-covered': aOnlyCovered++; break;
      case 'a-only-unique': aOnlyUnique++; break;
      case 'b-only-covered': bOnlyCovered++; break;
      case 'b-only-unique': bOnlyUnique++; break;
    }
  }

  return {
    bands: {
      total: bandDiffs.length,
      shared: sharedBands,
      aOnly: aOnlyBands,
      bOnly: bOnlyBands,
      changed: changedBands,
    },
    combos: {
      total: comboDiffs.length,
      exactSame,
      exactChanged,
      aOnlyCovered,
      aOnlyUnique,
      bOnlyCovered,
      bOnlyUnique,
    },
    coverage,
  };
}

function generateKeyDifferences(
  formatA: CompareFormat,
  formatB: CompareFormat,
  ratResults: Partial<Record<RatType, RatCompareResult>>
): string[] {
  const diffs: string[] = [];

  // Vendor difference
  if (formatA.meta.vendor !== formatB.meta.vendor) {
    diffs.push(`Vendor: ${formatA.meta.vendor} vs ${formatB.meta.vendor}`);
  }

  // RAT support
  const ratsA = new Set(formatA.meta.detectedRats);
  const ratsB = new Set(formatB.meta.detectedRats);
  for (const rat of ratsA) {
    if (!ratsB.has(rat)) diffs.push(`RAT ${rat}: Supported only in A`);
  }
  for (const rat of ratsB) {
    if (!ratsA.has(rat)) diffs.push(`RAT ${rat}: Supported only in B`);
  }

  // NR power class
  const nrResult = ratResults.nr;
  if (nrResult) {
    for (const bd of nrResult.bandDiffs) {
      if (bd.powerClass && bd.powerClass.status === 'changed') {
        diffs.push(`NR ${bd.displayName} PowerClass: ${bd.powerClass.a} → ${bd.powerClass.b}`);
      }
    }
  }

  // EUTRA-NR missing entirely
  const eutraNrA = formatA.rats['eutra-nr'];
  const eutraNrB = formatB.rats['eutra-nr'];
  if (eutraNrA && !eutraNrB) diffs.push('EUTRA-NR(MRDC): Supported only in A, not in B');
  if (!eutraNrA && eutraNrB) diffs.push('EUTRA-NR(MRDC): Supported only in B, not in A');

  // Unique combos summary
  const RAT_LABELS: Partial<Record<RatType, string>> = {
    nr: 'NR', eutra: 'EUTRA', 'eutra-nr': 'EUTRA-NR', utra: 'UTRA',
  };
  for (const [rat, result] of Object.entries(ratResults) as [RatType, RatCompareResult][]) {
    const unique = result.comboDiffs.filter(
      d => d.status === 'a-only-unique' || d.status === 'b-only-unique'
    );
    if (unique.length > 0) {
      const aU = unique.filter(d => d.status === 'a-only-unique').length;
      const bU = unique.filter(d => d.status === 'b-only-unique').length;
      const label = RAT_LABELS[rat] ?? rat;
      if (aU > 0) diffs.push(`${label} A unique combos: ${aU} (not covered in B)`);
      if (bU > 0) diffs.push(`${label} B unique combos: ${bU} (not covered in A)`);
    }
  }

  return diffs;
}

// ─── Feature comparison ──────────────────────────────────────────────────────

function compareFeatureLeaves(
  aLeaves: FeatureLeaf[],
  bLeaves: FeatureLeaf[]
): RatFeaturesDiff {
  const diffs: FeatureDiff[] = [];

  // Build lookup by (major|middle|leaf) key
  const aMap = new Map<string, FeatureLeaf>();
  const bMap = new Map<string, FeatureLeaf>();
  const makeKey = (l: FeatureLeaf) => `${l.major}|||${l.middle}|||${l.leaf}`;

  for (const l of aLeaves) aMap.set(makeKey(l), l);
  for (const l of bLeaves) bMap.set(makeKey(l), l);

  const allKeys = new Set([...aMap.keys(), ...bMap.keys()]);

  for (const key of allKeys) {
    const a = aMap.get(key);
    const b = bMap.get(key);
    const ref = a ?? b!;

    const diff: FeatureDiff = {
      major: ref.major,
      middle: ref.middle,
      leaf: ref.leaf,
      kind: ref.kind,
      status: 'same',
      a: a?.value,
      b: b?.value,
      description: ref.description,
      bit: ref.bit,
      ...(ref.path ? { path: ref.path } : {}),
      ...(a?.autoDiscovered || b?.autoDiscovered ? { autoDiscovered: true } : {}),
    };

    if (!a) {
      diff.status = 'b-only';
    } else if (!b) {
      diff.status = 'a-only';
    } else if ((ref.kind === 'stringList' || ref.kind === 'numberList') && Array.isArray(a.value) && Array.isArray(b.value)) {
      const aArr = a.value.map(String);
      const bArr = b.value.map(String);
      const aSet = new Set(aArr);
      const bSet = new Set(bArr);
      const common = aArr.filter(v => bSet.has(v));
      const onlyInA = aArr.filter(v => !bSet.has(v));
      const onlyInB = bArr.filter(v => !aSet.has(v));
      const slDiff: StringListDiff = { common, onlyInA, onlyInB };
      diff.stringListDiff = slDiff;
      diff.status = (onlyInA.length === 0 && onlyInB.length === 0) ? 'same' : 'different';
    } else {
      // For bool/presence/fgiBit/scalar/mismatched kinds: exact structural compare
      diff.status = fastEqual(a.value, b.value) ? 'same' : 'different';
    }

    diffs.push(diff);
  }

  // Sort: major → middle → bit (FGI) or leaf
  // FGI middles have a canonical order that differs from alphabetical
  const FGI_MIDDLE_ORDER = ['FGI-Rel9', 'FGI-Rel9-Add', 'FGI-Rel10', 'FGI-Rel10-FDD', 'FGI-Rel10-TDD'];
  const fgiMiddleRank = (m: string) => {
    const i = FGI_MIDDLE_ORDER.indexOf(m);
    return i === -1 ? 99 : i;
  };
  diffs.sort((x, y) => {
    const ma = x.major.localeCompare(y.major);
    if (ma !== 0) return ma;
    // For FeatureGroupIndicators, use canonical FGI order
    if (x.major === 'FeatureGroupIndicators') {
      const mi = fgiMiddleRank(x.middle) - fgiMiddleRank(y.middle);
      if (mi !== 0) return mi;
    } else {
      const mi = x.middle.localeCompare(y.middle);
      if (mi !== 0) return mi;
    }
    if (x.bit !== undefined && y.bit !== undefined) return x.bit - y.bit;
    return x.leaf.localeCompare(y.leaf);
  });

  const counts = { same: 0, different: 0, aOnly: 0, bOnly: 0 };
  for (const d of diffs) {
    if (d.status === 'same') counts.same++;
    else if (d.status === 'different') counts.different++;
    else if (d.status === 'a-only') counts.aOnly++;
    else counts.bOnly++;
  }

  return { diffs, counts };
}

function compareRatFeatures(
  aFeatures: RatFeatures | undefined,
  bFeatures: RatFeatures | undefined
): RatFeaturesDiff | undefined {
  if (!aFeatures && !bFeatures) return undefined;
  const aLeaves = aFeatures?.leaves ?? [];
  const bLeaves = bFeatures?.leaves ?? [];
  return compareFeatureLeaves(aLeaves, bLeaves);
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function compareCapaFormats(
  formatA: CompareFormat,
  formatB: CompareFormat,
  opts: ComboDisplayOptions = {}
): CapaCompareResult {
  const { showQam, showMimo } = opts; // mergeRedundant is not passed to the engine — comparison is always using capability-only keys
  const RAT_TYPES: RatType[] = ['nr', 'eutra', 'eutra-nr', 'utra'];
  const ratResults: Partial<Record<RatType, RatCompareResult>> = {};

  for (const rat of RAT_TYPES) {
    const result = compareRat(
      rat,
      formatA.rats[rat] as any,
      formatB.rats[rat] as any,
      { showQam, showMimo }
    );
    if (result) ratResults[rat] = result;
  }

  const perRat: Partial<Record<RatType, RatSummary>> = {};
  for (const [rat, result] of Object.entries(ratResults) as [RatType, RatCompareResult][]) {
    perRat[rat] = buildRatSummary(result);
  }

  const keyDifferences = generateKeyDifferences(formatA, formatB, ratResults);

  // Feature comparison
  const featuresDiff: Partial<Record<RatType, RatFeaturesDiff>> = {};
  for (const rat of RAT_TYPES) {
    const result = compareRatFeatures(
      formatA.features?.[rat as RatType],
      formatB.features?.[rat as RatType]
    );
    if (result) featuresDiff[rat as RatType] = result;
  }

  return {
    meta: { deviceA: formatA.meta, deviceB: formatB.meta },
    ratResults,
    featuresDiff: Object.keys(featuresDiff).length > 0 ? featuresDiff : undefined,
    summary: { perRat, keyDifferences },
  };
}
