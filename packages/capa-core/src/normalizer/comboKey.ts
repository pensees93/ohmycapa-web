/**
 * BandCombination normalization key generation utility.
 * Generates deterministic capability keys shared across all vendors for AB Comparison.
 */

import type { BandCombination, BandParameter, ComboDisplayOptions } from '../types/capaTypes';

const BW_CLASS_CC_COUNT: Record<string, number> = {
  a: 1,
  b: 2,
  c: 2,
  d: 3,
  e: 4,
  f: 5,
  g: 6,
  h: 7,
  i: 8,
  q: 1,
};

// 3GPP TS 38.101-2 Table 5.3A.4-1 (NR FR2 CA bandwidth classes)
const FR2_BW_CLASS_CC_COUNT: Record<string, number> = {
  a: 1,
  b: 2,
  c: 2,
  d: 2,
  e: 3,
  f: 4,
  g: 2,
  h: 3,
  i: 4,
  j: 5,
  k: 6,
  l: 7,
  m: 8,
  q: 4,
};

export function getBwClassCcCount(
  bwClass: string | undefined,
  ratType?: 'nr' | 'eutra',
  isFr2 = false
): number {
  if (!bwClass) return 1;
  const lower = bwClass.toLowerCase();
  if (ratType === 'nr' && isFr2) {
    return FR2_BW_CLASS_CC_COUNT[lower] ?? BW_CLASS_CC_COUNT[lower] ?? 1;
  }
  return BW_CLASS_CC_COUNT[lower] ?? 1;
}

function bandParamToKeySegment(bp: BandParameter, opts: ComboDisplayOptions = {}): string {
  const { showQam = true, showMimo = true } = opts;
  const prefix = bp.ratType === 'nr' ? 'n' : 'B';
  const bwDL = bp.bandwidthClassDL || '';

  const dlMimo = showMimo && bp.dlMimo !== undefined ? `(${bp.dlMimo})` : '';
  const dlQam = showQam && bp.dlQam ? `(${bp.dlQam})` : '';
  const dlBw = bp.dlBandwidth ? `(${bp.dlBandwidth})` : '';

  let ul = '';
  if (bp.bandwidthClassUL) {
    // 3GPP TS 38.306 §4.1.13 / TS 36.306 §4.3.5: omit default ulMimo=1 so undefined and 1 match
    const ulMimoVal = bp.ulMimo !== undefined && bp.ulMimo !== 1 ? `(${bp.ulMimo})` : '';
    const ulMimo = showMimo ? ulMimoVal : '';
    const ulQam = showQam && bp.ulQam ? `(${bp.ulQam})` : '';
    const ulBw = bp.ulBandwidth ? `(${bp.ulBandwidth})` : '';
    ul = `(UL,${bp.bandwidthClassUL})${ulMimo}${ulQam}${ulBw}`;
  }

  return `${prefix}${bp.band}${bwDL}${dlMimo}${dlQam}${dlBw}${ul}`;
}

export function generateCombinationKey(combo: BandCombination, opts: ComboDisplayOptions = {}): string {
  const withSegs = combo.bands.map((bp) => ({ bp, seg: bandParamToKeySegment(bp, opts) }));
  withSegs.sort((a, b) => {
    // EUTRA ('B') before NR ('n'), then ascending band number, then deterministic segment tie-breaker
    if (a.bp.ratType !== b.bp.ratType) return a.bp.ratType === 'eutra' ? -1 : 1;
    if (a.bp.band !== b.bp.band) return a.bp.band - b.bp.band;
    return a.seg.localeCompare(b.seg);
  });
  return withSegs.map((x) => x.seg).join('-');
}
