/**
 * 3GPP TS 38.306 NR Channel Bandwidth decoder & merger.
 *
 * TS 38.306 Table 4.2.7.2-1 / 4.2.7.2-2:
 *   - FR1 base `channelBWs-DL` / `channelBWs-UL` (10 bits per SCS):
 *     bit 0..9 -> [5, 10, 15, 20, 25, 30, 40, 50, 60, 80] MHz
 *   - FR1 `v1590` `channelBWs-DL-v1590` / `channelBWs-UL-v1590` (16 bits per SCS):
 *     bit 0..3 -> [70, 45, 35, 100] MHz
 *   - FR2 base `channelBWs-DL` / `channelBWs-UL` (`BIT STRING (SIZE (3))` per SCS, TS 38.331):
 *     bit 0..2 -> [50, 100, 200] MHz
 */

import type { Asn1Record } from '../types/astTypes';
import type { ChannelBW } from '../types/capaTypes';
import { isRecord, parseBitStringToIndices } from './helpers';

export const FR1_BASE_BWS = ['5', '10', '15', '20', '25', '30', '40', '50', '60', '80'] as const;
export const FR1_V1590_BWS = ['70', '45', '35', '100'] as const;
export const FR2_BASE_BWS = ['50', '100', '200'] as const;

type ScsKey = keyof ChannelBW;

const FR1_SCS_KEYS: readonly ScsKey[] = ['scs-15kHz', 'scs-30kHz', 'scs-60kHz'];
const FR2_SCS_KEYS: readonly ScsKey[] = ['scs-60kHz', 'scs-120kHz'];

function decodeScsTable(
  scsMap: Asn1Record,
  scsKeys: readonly ScsKey[],
  bwTable: readonly string[],
  out: ChannelBW
): void {
  for (const scs of scsKeys) {
    const rawBits = scsMap[scs];
    if (rawBits === undefined) continue;

    const indices = parseBitStringToIndices(rawBits);
    const decoded: string[] = [];
    for (const idx of indices) {
      if (idx < bwTable.length) {
        decoded.push(bwTable[idx]);
      }
    }
    if (decoded.length > 0) {
      out[scs] = decoded;
    }
  }
}

/**
 * Decode a `channelBWs-DL` / `channelBWs-UL` or `-v1590` AST object into ChannelBW.
 */
export function decodeChannelBwObject(raw: unknown, isV1590 = false): ChannelBW | undefined {
  if (!isRecord(raw)) return undefined;

  const result: ChannelBW = {};
  if (isRecord(raw['fr1'])) {
    decodeScsTable(raw['fr1'], FR1_SCS_KEYS, isV1590 ? FR1_V1590_BWS : FR1_BASE_BWS, result);
  }
  if (!isV1590 && isRecord(raw['fr2'])) {
    decodeScsTable(raw['fr2'], FR2_SCS_KEYS, FR2_BASE_BWS, result);
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Merge two ChannelBW objects, deduplicating and sorting per-SCS MHz entries numerically.
 */
export function mergeChannelBws(base?: ChannelBW, ext?: ChannelBW): ChannelBW | undefined {
  if (!base && !ext) return undefined;

  const merged: ChannelBW = {};
  const allScs: readonly ScsKey[] = ['scs-15kHz', 'scs-30kHz', 'scs-60kHz', 'scs-120kHz'];

  for (const scs of allScs) {
    const combined = new Set<string>([...(base?.[scs] ?? []), ...(ext?.[scs] ?? [])]);
    if (combined.size > 0) {
      merged[scs] = [...combined].sort((a, b) => Number(a) - Number(b));
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

/**
 * Extract merged DL and UL ChannelBW for an NR band object.
 */
export function extractNRBandChannelBws(bandObj: Asn1Record): {
  dl?: ChannelBW;
  ul?: ChannelBW;
} {
  const dl = mergeChannelBws(
    decodeChannelBwObject(bandObj['channelBWs-DL'], false),
    decodeChannelBwObject(bandObj['channelBWs-DL-v1590'], true)
  );
  const ul = mergeChannelBws(
    decodeChannelBwObject(bandObj['channelBWs-UL'], false),
    decodeChannelBwObject(bandObj['channelBWs-UL-v1590'], true)
  );
  return { dl, ul };
}

/**
 * Merge FeatureSet extra bandwidth flags (e.g. "90MHz", "80MHz", "40MHz") into FR1 `scs-30kHz`.
 * Extra BWs are only added to `scs-30kHz` when `!isFr2` and `channelBWs['scs-30kHz']` already exists.
 */
export function mergeExtraBws(
  channelBWs: ChannelBW | undefined,
  extraBws: string[] | undefined,
  isFr2: boolean
): ChannelBW | undefined {
  if (isFr2 || !channelBWs?.['scs-30kHz'] || !extraBws || extraBws.length === 0) {
    return channelBWs;
  }

  const scs30Set = new Set(channelBWs['scs-30kHz']);
  for (const bw of extraBws) {
    const m = bw.match(/^(\d+)/);
    if (m) {
      scs30Set.add(m[1]);
    }
  }

  return {
    ...channelBWs,
    'scs-30kHz': [...scs30Set].sort((a, b) => Number(a) - Number(b)),
  };
}

/**
 * Compute maximum supported NR bandwidth as "<N>MHz" from ChannelBW or fallback FeatureSet bandwidth.
 */
export function calcMaxNRBw(channelBWs?: ChannelBW, fsBandwidth?: string): string | undefined {
  let maxMhz = 0;

  if (channelBWs) {
    const scsLists = [
      channelBWs['scs-15kHz'],
      channelBWs['scs-30kHz'],
      channelBWs['scs-60kHz'],
      channelBWs['scs-120kHz'],
    ];
    for (const list of scsLists) {
      if (!list) continue;
      for (const bw of list) {
        const num = Number(bw);
        if (Number.isFinite(num) && num > maxMhz) {
          maxMhz = num;
        }
      }
    }
  }

  if (fsBandwidth) {
    const num = Number(fsBandwidth.replace(/MHz$/i, ''));
    if (Number.isFinite(num) && num > maxMhz) {
      maxMhz = num;
    }
  }

  return maxMhz > 0 ? `${maxMhz}MHz` : undefined;
}
