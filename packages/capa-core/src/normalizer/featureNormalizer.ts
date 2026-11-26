/**
 * Stage 2 Unified Feature Extractor.
 * Builds canonical feature maps from vendor-neutral ASTs and produces FeatureLeaf[]
 * including FGI indicators, ROHC profiles, UTRA security capabilities, and auto-classified features.
 */

import type { Asn1Record } from '../types/astTypes';
import type { FeatureKind, FeatureLeaf, RatFeatures } from '../types/capaTypes';
import {
  extractBitStringContent,
  extractNumber,
  findInExtensions,
  isRecord,
  utraBandToNumber,
} from './helpers';
import { collectUnclassifiedFeatures } from './unclassifiedCollector';
import {
  EUTRA_FEATURE_SPECS,
  FGI_REL10_TABLE,
  FGI_REL9_ADD_TABLE,
  FGI_REL9_TABLE,
  MRDC_FEATURE_SPECS,
  NR_FEATURE_SPECS,
  UTRA_FEATURE_SPECS,
  type FgiBitSpec,
  type FeatureSpec,
} from './specs';

const TRANSPARENT_CONTAINERS = new Set([
  'nonCriticalExtension',
  'lateNonCriticalExtension',
  'present',
  'CONTAINING',
]);

const ROHC_PROFILE_NAMES: Record<string, string> = {
  profile0x0000: 'ROHC Profile 0x0000 (No compression)',
  profile0x0001: 'ROHC Profile 0x0001 (RFC 3095)',
  profile0x0002: 'ROHC Profile 0x0002 (RFC 3095, IP/UDP/RTP)',
  profile0x0003: 'ROHC Profile 0x0003 (RFC 3095, IP/UDP)',
  profile0x0004: 'ROHC Profile 0x0004 (RFC 3095, IP/ESP)',
  profile0x0006: 'ROHC Profile 0x0006 (RFC 5225, IP/UDP/RTP)',
  profile0x0101: 'ROHC Profile 0x0101 (RFC 4815, IP)',
  profile0x0102: 'ROHC Profile 0x0102 (RFC 5225, IP/UDP)',
  profile0x0103: 'ROHC Profile 0x0103 (RFC 5225, IP/UDP/RTP)',
  profile0x0104: 'ROHC Profile 0x0104 (RFC 5225, IP/ESP)',
};

const COMPOUND_ENUM_RANKS: Record<string, number> = {
  // DMRS types
  type1and2: 2,
  type1: 1,
  type2: 1,
  // Codebook modes
  mode1andmode2: 3,
  mode1: 2,
  mode2: 1,
  // Intra-band EN-DC / CA support
  both: 3,
  'non-contiguous': 2,
  contiguous: 1,
  // Coherence
  fullcoherent: 3,
  partialandnoncoherent: 2,
  noncoherent: 1,
  // GPS
  'bothnetworkandue-based': 3,
  'ue-based': 2,
  networkbased: 2,
  nonetworkassistedgps: 1,
  // PDCCH monitoring
  'withoutdci-gap': 2,
  'withdci-gap': 1,
};

const featureMapCache = new WeakMap<Asn1Record, Map<string, unknown>>();
const multiValueCache = new WeakMap<Asn1Record, Map<string, unknown[]>>();

function isTransparentKey(key: string): boolean {
  return (
    TRANSPARENT_CONTAINERS.has(key) ||
    /^UE-EUTRA-Capability-v.*-IEs$/.test(key)
  );
}

/**
 * Strip structural segments (`nonCriticalExtension`, `lateNonCriticalExtension`, `present`, `CONTAINING`)
 * from a spec path so canonical lookups work identically across vendors.
 */
export function normalizeSpecLookupPath(path: string): string {
  return path
    .split('.')
    .filter((seg) => seg.length > 0 && !isTransparentKey(seg))
    .join('.');
}

function unwrapSingleChoiceValue(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  if ('supported' in raw) return raw['supported'];
  const keys = Object.keys(raw);
  if (keys.length === 1 && !isRecord(raw[keys[0]])) {
    return raw[keys[0]];
  }
  return raw;
}

function parsePowerClassRank(val: string): number | undefined {
  const lower = val.trim().toLowerCase().replace(/dot/g, '.');
  const m = lower.match(/^(?:pc|p?class|powerclass)[_-]?(\d+(?:\.\d+)?)$/);
  if (!m) return undefined;
  const num = Number(m[1]);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  // Lower PC number (e.g. pc1dot5 < pc2 < pc3) represents higher TX power capability
  return 100 - num;
}

function parseOrderedEnumValue(val: string): number | undefined {
  const trimmed = val.trim();
  const m = trimmed.match(/^(?:rel|n|p|upto|cs|b|kbps|tb|tf|am|sym|s|mhz|mws|kb|e)(\d+(?:dot\d+)?)$/i);
  if (!m) return undefined;
  const num = Number(m[1].replace(/dot/i, '.'));
  return Number.isFinite(num) ? num : undefined;
}

function bitStringPopCount(val: string): number | undefined {
  const m = val.match(/^'([01]+)'B$/i);
  if (!m) return undefined;
  let count = 0;
  for (const ch of m[1]) {
    if (ch === '1') count++;
  }
  return count;
}

function isPositiveSupportVal(v: unknown): boolean {
  return v === true || v === 'supported' || v === 'true';
}

function isNegativeSupportVal(v: unknown): boolean {
  return v === false || v === 'notSupported' || v === 'false';
}

/**
 * Select the stronger / superset 3GPP capability value when multiple array entries
 * (e.g., per-band or per-variant lists) share the same canonical path.
 */
export function pickStrongerRawValue(existing: unknown, incoming: unknown): unknown {
  if (existing === undefined || existing === null) return incoming;
  if (incoming === undefined || incoming === null) return existing;

  if (Array.isArray(existing) || Array.isArray(incoming)) {
    if (Array.isArray(existing) && existing.length === 0 && Array.isArray(incoming) && incoming.length > 0) {
      return incoming;
    }
    return existing;
  }

  const uEx = unwrapSingleChoiceValue(existing);
  const uIn = unwrapSingleChoiceValue(incoming);

  if (isRecord(uEx) || isRecord(uIn)) {
    if (isRecord(uEx) && Object.keys(uEx).length === 0 && !isRecord(uIn)) return incoming;
    return existing;
  }

  // 1. Support flags: positive support always beats negative/absent
  if (isPositiveSupportVal(uIn) && isNegativeSupportVal(uEx)) return incoming;
  if (isPositiveSupportVal(uEx) && isNegativeSupportVal(uIn)) return existing;

  // 2. Numeric capabilities: max wins
  if (typeof uEx === 'number' && typeof uIn === 'number') {
    return uIn > uEx ? incoming : existing;
  }

  if (typeof uEx === 'string' && typeof uIn === 'string') {
    // 3. Power Class: pc1dot5 > pc2 > pc3 > pc4
    const pcEx = parsePowerClassRank(uEx);
    const pcIn = parsePowerClassRank(uIn);
    if (pcEx !== undefined && pcIn !== undefined) {
      return pcIn > pcEx ? incoming : existing;
    }

    // 4. Bit strings: higher number of enabled bits wins
    const popEx = bitStringPopCount(uEx);
    const popIn = bitStringPopCount(uIn);
    if (popEx !== undefined && popIn !== undefined) {
      return popIn > popEx ? incoming : existing;
    }

    // 5. Compound 3GPP capability enums
    const compEx = COMPOUND_ENUM_RANKS[uEx.toLowerCase()];
    const compIn = COMPOUND_ENUM_RANKS[uIn.toLowerCase()];
    if (compEx !== undefined && compIn !== undefined) {
      return compIn > compEx ? incoming : existing;
    }

    // 6. Ordered numeric-prefixed enums (n8/n16, p2/p32, upto2/upto4, cs16/cs24, etc.)
    const ordEx = parseOrderedEnumValue(uEx);
    const ordIn = parseOrderedEnumValue(uIn);
    if (ordEx !== undefined && ordIn !== undefined) {
      return ordIn > ordEx ? incoming : existing;
    }
  }

  return existing;
}

/**
 * Build a flat canonical path -> max/superset value map for a PDU tree.
 * Traverses all array items so per-band / per-variant capabilities aggregate to the device's max capability,
 * and caches all per-path values for list-type extraction.
 */
export function buildCanonicalFeatureMap(pdu: Asn1Record): Map<string, unknown> {
  const cached = featureMapCache.get(pdu);
  if (cached) return cached;

  const map = new Map<string, unknown>();
  const allVals = new Map<string, unknown[]>();
  const stack: Array<{ node: unknown; path: string }> = [{ node: pdu, path: '' }];

  while (stack.length > 0) {
    const { node, path } = stack.pop()!;
    if (!isRecord(node)) continue;

    const keys = Object.keys(node);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      const val = node[key];
      if (val === undefined || val === null) continue;

      if (isTransparentKey(key)) {
        if (isRecord(val)) {
          stack.push({ node: val, path });
        }
        continue;
      }

      const fullPath = path ? `${path}.${key}` : key;
      if (!map.has(fullPath)) {
        map.set(fullPath, val);
      } else {
        map.set(fullPath, pickStrongerRawValue(map.get(fullPath), val));
      }

      let bucket = allVals.get(fullPath);
      if (!bucket) {
        bucket = [];
        allVals.set(fullPath, bucket);
      }
      bucket.push(val);

      if (Array.isArray(val)) {
        for (let idx = val.length - 1; idx >= 0; idx--) {
          if (isRecord(val[idx])) {
            stack.push({ node: val[idx], path: fullPath });
          }
        }
      } else if (isRecord(val)) {
        stack.push({ node: val, path: fullPath });
      }
    }
  }

  featureMapCache.set(pdu, map);
  multiValueCache.set(pdu, allVals);
  return map;
}

function sortAndDedupeNumbers(nums: number[], leafName: string): number[] {
  const unique = new Set<number>();
  for (const n of nums) {
    // 3GPP TS 25.331: radioFrequencyBandEUTRA = 64 is a Rel-9 placeholder for extended bands (>64)
    if (leafName === 'radioFrequencyBandEUTRA' && n === 64) continue;
    unique.add(n);
  }
  return [...unique].sort((a, b) => a - b);
}

function sortAndDedupeStrings(strs: string[]): string[] {
  const unique = [...new Set(strs)];
  return unique.sort((a, b) => {
    const ua = utraBandToNumber(a);
    const ub = utraBandToNumber(b);
    if (ua !== undefined && ub !== undefined && ua !== ub) {
      return ua - ub;
    }
    return a.localeCompare(b);
  });
}

function extractNumbersFromRaw(raw: unknown, leafName: string): number[] {
  const out: number[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      out.push(...extractNumbersFromRaw(item, leafName));
    }
    return out;
  }
  const direct = extractNumber(raw);
  if (direct !== undefined) {
    out.push(direct);
    return out;
  }
  if (typeof raw === 'string') {
    const cleaned = Number(raw.trim().replace(/^n(?=\d)/i, ''));
    if (Number.isFinite(cleaned)) out.push(cleaned);
    return out;
  }
  if (isRecord(raw)) {
    const candidate =
      raw[leafName] ??
      (leafName.startsWith('bandNR') ? raw['bandNR'] ?? raw['bandNR-r15'] : undefined);
    if (candidate !== undefined) {
      out.push(...extractNumbersFromRaw(candidate, leafName));
    }
  }
  return out;
}

function extractStringsFromRaw(raw: unknown, leafName: string): string[] {
  const out: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      out.push(...extractStringsFromRaw(item, leafName));
    }
    return out;
  }
  if (typeof raw === 'string') {
    out.push(raw);
    return out;
  }
  if (isRecord(raw) && raw[leafName] !== undefined) {
    out.push(String(raw[leafName]));
  }
  return out;
}

/**
 * Extract typed FeatureLeaf value from raw AST node according to `FeatureKind`.
 */
export function extractLeafValue(
  raw: unknown,
  kind: FeatureKind,
  leafName: string
): FeatureLeaf['value'] {
  if (raw === undefined || raw === null) return undefined;

  switch (kind) {
    case 'presence':
      return true;

    case 'bool': {
      const unwrapped = unwrapSingleChoiceValue(raw);
      if (typeof unwrapped === 'boolean') return unwrapped;
      if (unwrapped === 'supported' || unwrapped === 'true') return true;
      if (unwrapped === 'notSupported' || unwrapped === 'false') return false;
      if (isRecord(unwrapped) && Object.keys(unwrapped).length === 0) return true;
      return true;
    }

    case 'enum': {
      const unwrapped = unwrapSingleChoiceValue(raw);
      if (typeof unwrapped === 'string') return unwrapped;
      if (typeof unwrapped === 'boolean') return String(unwrapped);
      return undefined;
    }

    case 'number': {
      const unwrapped = unwrapSingleChoiceValue(raw);
      if (typeof unwrapped === 'number' && Number.isFinite(unwrapped)) return unwrapped;
      if (typeof unwrapped === 'string') {
        const cleaned = unwrapped.trim().replace(/^n(?=\d)/i, '');
        const num = Number(cleaned);
        return Number.isFinite(num) ? num : undefined;
      }
      return undefined;
    }

    case 'stringList': {
      const strs = sortAndDedupeStrings(extractStringsFromRaw(raw, leafName));
      return strs.length > 0 ? strs : undefined;
    }

    case 'numberList': {
      const nums = sortAndDedupeNumbers(extractNumbersFromRaw(raw, leafName), leafName);
      return nums.length > 0 ? nums : undefined;
    }

    default:
      return undefined;
  }
}

function buildLeavesFromSpecs(pdu: Asn1Record, specs: FeatureSpec[]): FeatureLeaf[] {
  const map = buildCanonicalFeatureMap(pdu);
  const allValsMap = multiValueCache.get(pdu);

  const leaves: FeatureLeaf[] = [];
  const seenKeys = new Set<string>();
  for (const spec of specs) {
    const dedupeKey = `${spec.major}|${spec.middle}|${spec.leaf}`;
    if (seenKeys.has(dedupeKey)) continue;

    const candidatePaths = [spec.path, ...(spec.pathAlternatives ?? [])];
    let value: FeatureLeaf['value'];

    if (spec.kind === 'numberList') {
      const collected: number[] = [];
      for (const candidate of candidatePaths) {
        const normalized = normalizeSpecLookupPath(candidate);
        const raws = allValsMap?.get(normalized) ?? (map.has(normalized) ? [map.get(normalized)] : []);
        for (const r of raws) {
          collected.push(...extractNumbersFromRaw(r, spec.leaf));
        }
      }
      const sorted = sortAndDedupeNumbers(collected, spec.leaf);
      if (sorted.length > 0) value = sorted;
    } else if (spec.kind === 'stringList') {
      const collected: string[] = [];
      for (const candidate of candidatePaths) {
        const normalized = normalizeSpecLookupPath(candidate);
        const raws = allValsMap?.get(normalized) ?? (map.has(normalized) ? [map.get(normalized)] : []);
        for (const r of raws) {
          collected.push(...extractStringsFromRaw(r, spec.leaf));
        }
      }
      const sorted = sortAndDedupeStrings(collected);
      if (sorted.length > 0) value = sorted;
    } else {
      let bestRaw: unknown;
      for (const candidate of candidatePaths) {
        const normalized = normalizeSpecLookupPath(candidate);
        if (map.has(normalized)) {
          bestRaw = pickStrongerRawValue(bestRaw, map.get(normalized));
        }
      }
      value = extractLeafValue(bestRaw, spec.kind, spec.leaf);
    }

    if (value !== undefined) {
      seenKeys.add(dedupeKey);
      leaves.push({
        major: spec.major,
        middle: spec.middle,
        leaf: spec.leaf,
        kind: spec.kind,
        value,
        description: spec.description,
        path: spec.path,
      });
    }
  }

  return leaves;
}

function appendAutoClassifiedLeaves(
  pdu: Asn1Record,
  specs: FeatureSpec[],
  map: Map<string, unknown>,
  leaves: FeatureLeaf[],
  includeUnclassified: boolean
): RatFeatures {
  const unclassified = collectUnclassifiedFeatures(pdu, specs, map, leaves);
  for (const u of unclassified) {
    const coerced = extractLeafValue(u.value, u.kind, u.leaf);
    if (coerced === undefined) continue;
    leaves.push({
      major: u.major,
      middle: u.middle,
      leaf: u.leaf,
      kind: u.kind,
      value: coerced,
      description: u.description,
      path: u.path,
      autoDiscovered: true,
    });
  }
  return includeUnclassified && unclassified.length > 0
    ? { leaves, unclassified }
    : { leaves };
}

export function extractROHCProfiles(rohcObj: unknown, middle = 'ROHC Profiles'): FeatureLeaf[] {
  if (!isRecord(rohcObj)) return [];
  const leaves: FeatureLeaf[] = [];

  for (const [key, val] of Object.entries(rohcObj)) {
    const baseKey = key.replace(/-r\d+$/, '');
    const profileId = baseKey.replace(/^profile/, '');
    const description = ROHC_PROFILE_NAMES[baseKey] || `ROHC Profile ${profileId}`;
    const boolVal = typeof val === 'boolean' ? val : val === 'supported' || val === 'true';

    leaves.push({
      major: 'PDCP',
      middle,
      leaf: key,
      kind: 'bool',
      value: boolVal,
      description,
    });
  }

  return leaves;
}

export function extractFgiBits(
  rawFgi: unknown,
  fgiMiddle: string,
  table: FgiBitSpec[],
  bitOffset: number
): FeatureLeaf[] {
  if (rawFgi === undefined || rawFgi === null) return [];
  const bits = extractBitStringContent(rawFgi);
  if (!bits) return [];

  return table.map((spec) => ({
    major: 'FeatureGroupIndicators',
    middle: fgiMiddle,
    leaf: `Indicator ${spec.bit} — ${spec.shortName}`,
    kind: 'fgiBit' as FeatureKind,
    value: bits[spec.bit - bitOffset - 1] === '1',
    description: spec.description,
    bit: spec.bit,
  }));
}

// 3GPP TS 25.331 §10.3.3.37 (16-bit strings, bits 0..12 are spare15..spare3)
const CIPHERING_BIT_MAP: Readonly<Record<number, string>> = {
  13: 'uea2',
  14: 'uea1',
  15: 'uea0',
};

const INTEGRITY_BIT_MAP: Readonly<Record<number, string>> = {
  13: 'uia2',
  14: 'uia1',
};

export function decodeAlgorithmCapBits(raw: unknown, prefix: 'uea' | 'uia'): string[] | undefined {
  if (Array.isArray(raw)) {
    const items = raw.filter((x): x is string => typeof x === 'string').sort();
    return items.length > 0 ? items : undefined;
  }
  const bits = extractBitStringContent(raw);
  if (!bits) return undefined;

  const bitMap = prefix === 'uea' ? CIPHERING_BIT_MAP : INTEGRITY_BIT_MAP;
  const algos: string[] = [];
  for (const [idxStr, name] of Object.entries(bitMap)) {
    const idx = Number(idxStr);
    if (idx < bits.length && bits[idx] === '1') {
      algos.push(name);
    }
  }
  return algos.length > 0 ? algos.sort() : undefined;
}

export function extractNRFeatures(nrPdu: Asn1Record, includeUnclassified = true): RatFeatures {
  const map = buildCanonicalFeatureMap(nrPdu);
  const leaves = buildLeavesFromSpecs(nrPdu, NR_FEATURE_SPECS);

  const rohc = map.get('pdcp-Parameters.supportedROHC-Profiles');
  if (rohc) {
    leaves.push(...extractROHCProfiles(rohc));
  }

  return appendAutoClassifiedLeaves(nrPdu, NR_FEATURE_SPECS, map, leaves, includeUnclassified);
}

export function extractEUTRAFeatures(eutraPdu: Asn1Record, includeUnclassified = true): RatFeatures {
  const map = buildCanonicalFeatureMap(eutraPdu);
  const leaves = buildLeavesFromSpecs(eutraPdu, EUTRA_FEATURE_SPECS);

  const rohc = map.get('pdcp-Parameters.supportedROHC-Profiles');
  if (rohc) {
    leaves.push(...extractROHCProfiles(rohc));
  }

  const rohcNr = map.get('pdcp-ParametersNR-r15.rohc-Profiles-r15');
  if (rohcNr) {
    leaves.push(...extractROHCProfiles(rohcNr, 'ROHC Profiles (NR PDCP Rel-15)'));
  }

  const fgiRel9 = map.get('featureGroupIndicators');
  if (fgiRel9 !== undefined) {
    leaves.push(...extractFgiBits(fgiRel9, 'FGI-Rel9', FGI_REL9_TABLE, 0));
  }

  const fgiRel9Add = map.get('featureGroupIndRel9Add-r9');
  if (fgiRel9Add !== undefined) {
    leaves.push(...extractFgiBits(fgiRel9Add, 'FGI-Rel9-Add', FGI_REL9_ADD_TABLE, 32));
  }

  const fgiRel10 = map.get('featureGroupIndRel10-r10');
  const fgiRel10Bits = extractBitStringContent(fgiRel10);
  if (fgiRel10 !== undefined) {
    leaves.push(...extractFgiBits(fgiRel10, 'FGI-Rel10', FGI_REL10_TABLE, 100));
  }

  const fddContainer = findInExtensions(eutraPdu, 'fdd-Add-UE-EUTRA-Capabilities-v1060');
  const fgiRel10Fdd = isRecord(fddContainer)
    ? fddContainer['featureGroupIndRel10-v1060']
    : undefined;
  if (fgiRel10Fdd !== undefined && extractBitStringContent(fgiRel10Fdd) !== fgiRel10Bits) {
    leaves.push(...extractFgiBits(fgiRel10Fdd, 'FGI-Rel10-FDD', FGI_REL10_TABLE, 100));
  }

  const tddContainer = findInExtensions(eutraPdu, 'tdd-Add-UE-EUTRA-Capabilities-v1060');
  const fgiRel10Tdd = isRecord(tddContainer)
    ? tddContainer['featureGroupIndRel10-v1060']
    : undefined;
  if (fgiRel10Tdd !== undefined && extractBitStringContent(fgiRel10Tdd) !== fgiRel10Bits) {
    leaves.push(...extractFgiBits(fgiRel10Tdd, 'FGI-Rel10-TDD', FGI_REL10_TABLE, 100));
  }

  return appendAutoClassifiedLeaves(eutraPdu, EUTRA_FEATURE_SPECS, map, leaves, includeUnclassified);
}

export function extractMRDCFeatures(mrdcPdu: Asn1Record, includeUnclassified = true): RatFeatures {
  const map = buildCanonicalFeatureMap(mrdcPdu);
  const leaves = buildLeavesFromSpecs(mrdcPdu, MRDC_FEATURE_SPECS);

  return appendAutoClassifiedLeaves(mrdcPdu, MRDC_FEATURE_SPECS, map, leaves, includeUnclassified);
}

export function extractUTRAFeatures(utraPdu: Asn1Record, includeUnclassified = true): RatFeatures {
  const map = buildCanonicalFeatureMap(utraPdu);
  const leaves = buildLeavesFromSpecs(utraPdu, UTRA_FEATURE_SPECS);

  // Extract UTRA security capabilities into canonical algorithm lists (uea*/uia*)
  const ciph = decodeAlgorithmCapBits(
    map.get('ue-CapabilityContainer.ue-RadioAccessCapability.ue-specificCapabilityInformation.cipheringAlgorithmCap') ??
      map.get('ue-CapabilityContainer.ue-RadioAccessCapability.securityCapability.cipheringAlgorithmCap'),
    'uea'
  );
  if (ciph) {
    leaves.push({
      major: 'Security',
      middle: 'Ciphering',
      leaf: 'cipheringAlgorithmCap',
      kind: 'stringList',
      value: ciph,
      description: 'UTRA ciphering algorithms (UEA0/1/2)',
    });
  }

  const integ = decodeAlgorithmCapBits(
    map.get('ue-CapabilityContainer.ue-RadioAccessCapability.ue-specificCapabilityInformation.integrityProtectionAlgorithmCap') ??
      map.get('ue-CapabilityContainer.ue-RadioAccessCapability.securityCapability.integrityProtectionAlgorithmCap'),
    'uia'
  );
  if (integ) {
    leaves.push({
      major: 'Security',
      middle: 'Integrity',
      leaf: 'integrityProtectionAlgorithmCap',
      kind: 'stringList',
      value: integ,
      description: 'UTRA integrity protection algorithms (UIA1/2)',
    });
  }

  return appendAutoClassifiedLeaves(utraPdu, UTRA_FEATURE_SPECS, map, leaves, includeUnclassified);
}
