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

export function getBwClassCcCount(bwClass: string | undefined): number {
  if (!bwClass) return 1;
  return BW_CLASS_CC_COUNT[bwClass.toLowerCase()] ?? 1;
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
  const sorted = [...combo.bands].sort((a, b) => {
    // EUTRA ('B') before NR ('n'), then ascending band number
    if (a.ratType !== b.ratType) return a.ratType === 'eutra' ? -1 : 1;
    return a.band - b.band;
  });
  return sorted.map((bp) => bandParamToKeySegment(bp, opts)).join('-');
}
