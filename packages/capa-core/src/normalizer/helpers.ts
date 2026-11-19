/**
 * Shared 3GPP domain helper utilities for Stage 2 normalization.
 * Strictly vendor-agnostic: operates only on canonical ASN.1 AST values.
 */

import type { Asn1Record } from '../types/astTypes';
import { normalizeBitString } from '../syntax/bitString';

const MAX_EXT_NODES = 128;

const MIMO_MAP: Record<string, number> = {
  oneLayer: 1,
  twoLayers: 2,
  fourLayers: 4,
  eightLayers: 8,
  n1: 1,
  n2: 2,
  n4: 4,
  n8: 8,
};

const UTRA_BAND_NUMBERS: Record<string, number> = {
  bandI: 1,
  bandII: 2,
  bandIII: 3,
  bandIV: 4,
  bandV: 5,
  bandVI: 6,
  bandVII: 7,
  bandVIII: 8,
  bandIX: 9,
  bandX: 10,
  bandXI: 11,
  bandXII: 12,
  bandXIII: 13,
  bandXIV: 14,
  bandXV: 15,
  bandXVI: 16,
  bandXVII: 17,
  bandXVIII: 18,
  bandXIX: 19,
  bandXX: 20,
  bandXXI: 21,
  bandXXII: 22,
  bandXXV: 25,
  bandXXVI: 26,
  fdd2100: 1,
  fdd1900: 2,
  fdd1800: 3,
};

export function isRecord(val: unknown): val is Asn1Record {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

export function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

export function isSupported(val: unknown): boolean {
  return val === 'supported' || val === true || val === 'true';
}

export function parseSupportedFlag(val: unknown): true | undefined {
  return isSupported(val) ? true : undefined;
}

export function extractNumber(val: unknown): number | undefined {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : undefined;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
  }
  return undefined;
}

export function cleanPowerClass(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? `pc${val}` : undefined;
  }
  if (typeof val !== 'string') return undefined;

  const trimmed = val.trim();
  if (!trimmed) return undefined;

  const pcMatch = trimmed.match(/^pc(\d+(?:dot\d+)?)$/i);
  if (pcMatch) return `pc${pcMatch[1]}`;

  const classMatch = trimmed.match(/^(?:p?class|powerclass)[_-]?(\d+(?:dot\d+)?)$/i);
  if (classMatch) return `pc${classMatch[1]}`;

  if (/^\d+$/.test(trimmed)) return `pc${trimmed}`;

  return trimmed;
}

export function parseMimoLayers(val: unknown): number | undefined {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : undefined;
  }
  if (typeof val !== 'string') return undefined;

  const trimmed = val.trim();
  if (trimmed in MIMO_MAP) return MIMO_MAP[trimmed];

  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return undefined;
}

export function extractBitStringContent(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const compacted = normalizeBitString(raw);
  const binMatch = compacted.match(/^'([01]+)'B$/i);
  if (binMatch) return binMatch[1];

  const hexMatch = compacted.match(/^'([0-9a-fA-F]+)'H$/i);
  if (hexMatch) {
    return [...hexMatch[1]]
      .map((ch) => parseInt(ch, 16).toString(2).padStart(4, '0'))
      .join('');
  }

  return /^[01]+$/.test(compacted) ? compacted : '';
}

export function parseBitStringToIndices(raw: unknown): number[] {
  const bits = extractBitStringContent(raw);
  if (!bits) return [];

  const indices: number[] = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      indices.push(i);
    }
  }
  return indices;
}

export function extractMhzValue(val: unknown): string | undefined {
  if (isRecord(val)) {
    const direct = val['fr1'] ?? val['fr2'] ?? val['fr1-r17'] ?? val['fr2-r17'];
    if (direct !== undefined) return extractMhzValue(direct);
    for (const [k, v] of Object.entries(val)) {
      if (/^fr[12](?:-r\d+)?$/i.test(k)) {
        return extractMhzValue(v);
      }
    }
    return undefined;
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    return `${val}MHz`;
  }
  if (typeof val !== 'string') return undefined;

  const trimmed = val.trim();
  const mhzMatch = trimmed.match(/^mhz(\d+)$/i);
  if (mhzMatch) return `${mhzMatch[1]}MHz`;

  const suffixMatch = trimmed.match(/^(\d+)\s*mhz$/i);
  if (suffixMatch) return `${suffixMatch[1]}MHz`;

  return undefined;
}

/**
 * Breadth-first lookup across extension chains (`nonCriticalExtension`, `lateNonCriticalExtension`,
 * and `rf-Parameters*` / `phyLayerParameters*` extension containers).
 */
export function findInExtensions(root: unknown, key: string): unknown {
  if (!isRecord(root)) return undefined;

  const queue: Asn1Record[] = [root];
  const visited = new Set<Asn1Record>([root]);

  for (let i = 0; i < queue.length && queue.length < MAX_EXT_NODES * 4; i++) {
    const cur = queue[i];
    if (cur[key] !== undefined) {
      return cur[key];
    }
    for (const [k, next] of Object.entries(cur)) {
      if (
        isRecord(next) &&
        !visited.has(next) &&
        (k === 'nonCriticalExtension' ||
          k === 'lateNonCriticalExtension' ||
          k.startsWith('rf-Parameters') ||
          k.startsWith('phyLayerParameters'))
      ) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return undefined;
}

export function utraBandToNumber(bandName: unknown): number | undefined {
  if (typeof bandName === 'number' && Number.isFinite(bandName)) {
    return bandName;
  }
  if (typeof bandName !== 'string') return undefined;

  const trimmed = bandName.trim();
  if (trimmed in UTRA_BAND_NUMBERS) {
    return UTRA_BAND_NUMBERS[trimmed];
  }
  const numMatch = trimmed.match(/^band(\d+)$/i);
  if (numMatch) {
    return Number(numMatch[1]);
  }
  return undefined;
}
