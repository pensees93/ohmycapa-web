/**
 * Stage 2 Unified Feature Extractor.
 * Builds canonical feature maps from vendor-neutral ASTs and produces FeatureLeaf[]
 * including FGI indicators, ROHC profiles, and UTRA security capabilities.
 */

import type { Asn1Record } from '../types/astTypes';
import type { FeatureKind, FeatureLeaf, RatFeatures } from '../types/capaTypes';
import { extractBitStringContent, extractNumber, findInExtensions, isRecord } from './helpers';
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

const featureMapCache = new WeakMap<Asn1Record, Map<string, unknown>>();

function isTransparentKey(key: string): boolean {
  return (
    TRANSPARENT_CONTAINERS.has(key) ||
    key.includes('Add-UE-EUTRA-Capabilities-v') ||
    /^UE-EUTRA-Capability-v.*-IEs$/.test(key)
  );
}

/**
 * Strip structural segments (`nonCriticalExtension`, `lateNonCriticalExtension`, `present`)
 * from a spec path so canonical lookups work identically across vendors.
 */
export function normalizeSpecLookupPath(path: string): string {
  return path
    .split('.')
    .filter((seg) => seg.length > 0 && !isTransparentKey(seg))
    .join('.');
}

/**
 * Build a flat canonical path -> value map for a PDU tree.
 * Traverses all array items so per-band features are discovered even beyond element 0.
 */
export function buildCanonicalFeatureMap(pdu: Asn1Record): Map<string, unknown> {
  const cached = featureMapCache.get(pdu);
  if (cached) return cached;

  const map = new Map<string, unknown>();
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
      } else if (val === 'supported' || val === true) {
        // When aggregating across array elements (e.g. per-band flags), prefer positive support
        map.set(fullPath, val);
      }

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
  return map;
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
      return true;
    }

    case 'enum': {
      const unwrapped = unwrapSingleChoiceValue(raw);
      return typeof unwrapped === 'string' ? unwrapped : undefined;
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
      if (Array.isArray(raw)) {
        const out: string[] = [];
        for (const item of raw) {
          if (typeof item === 'string') {
            out.push(item);
          } else if (isRecord(item) && item[leafName] !== undefined) {
            out.push(String(item[leafName]));
          }
        }
        return out.length > 0 ? out : undefined;
      }
      return typeof raw === 'string' ? [raw] : undefined;
    }

    case 'numberList': {
      if (Array.isArray(raw)) {
        const out: number[] = [];
        for (const item of raw) {
          const direct = extractNumber(item);
          if (direct !== undefined) {
            out.push(direct);
            continue;
          }
          if (typeof item === 'string') {
            const cleaned = Number(item.trim().replace(/^n(?=\d)/i, ''));
            if (Number.isFinite(cleaned)) out.push(cleaned);
            continue;
          }
          if (isRecord(item)) {
            const candidate =
              item[leafName] ??
              (leafName.startsWith('bandNR') ? item['bandNR'] ?? item['bandNR-r15'] : undefined);
            const num = extractNumber(candidate);
            if (num !== undefined) out.push(num);
          }
        }
        return out.length > 0 ? out : undefined;
      }
      const single = extractLeafValue(raw, 'number', leafName);
      return typeof single === 'number' ? [single] : undefined;
    }

    default:
      return undefined;
  }
}

function buildLeavesFromSpecs(pdu: Asn1Record, specs: FeatureSpec[]): FeatureLeaf[] {
  const map = buildCanonicalFeatureMap(pdu);

  const leafLookup = new Map<string, unknown>();
  for (const [fullPath, val] of map.entries()) {
    const leafName = fullPath.split('.').pop()!;
    if (!leafLookup.has(leafName) || val === 'supported' || val === true) {
      leafLookup.set(leafName, val);
    }
  }

  const leaves: FeatureLeaf[] = [];
  const seenKeys = new Set<string>();
  for (const spec of specs) {
    const dedupeKey = `${spec.major}|${spec.middle}|${spec.leaf}`;
    if (seenKeys.has(dedupeKey)) continue;

    const candidatePaths = [spec.path, ...(spec.pathAlternatives ?? [])];
    let raw: unknown;

    for (const candidate of candidatePaths) {
      const normalized = normalizeSpecLookupPath(candidate);
      if (map.has(normalized)) {
        raw = map.get(normalized);
        break;
      }
    }

    if (raw === undefined) {
      const pathLeaf = spec.path.split('.').pop()!;
      if (leafLookup.has(spec.leaf)) {
        raw = leafLookup.get(spec.leaf);
      } else if (leafLookup.has(pathLeaf)) {
        raw = leafLookup.get(pathLeaf);
      }
    }

    const value = extractLeafValue(raw, spec.kind, spec.leaf);
    if (value !== undefined) {
      seenKeys.add(dedupeKey);
      leaves.push({
        major: spec.major,
        middle: spec.middle,
        leaf: spec.leaf,
        kind: spec.kind,
        value,
        description: spec.description,
      });
    }
  }

  return leaves;
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

export function extractNRFeatures(nrPdu: Asn1Record, includeUnclassified = false): RatFeatures {
  const map = buildCanonicalFeatureMap(nrPdu);
  const leaves = buildLeavesFromSpecs(nrPdu, NR_FEATURE_SPECS);

  const rohc = map.get('pdcp-Parameters.supportedROHC-Profiles');
  if (rohc) {
    leaves.push(...extractROHCProfiles(rohc));
  }

  if (!includeUnclassified) return { leaves };
  const unclassified = collectUnclassifiedFeatures(nrPdu, NR_FEATURE_SPECS, map);
  return unclassified.length > 0 ? { leaves, unclassified } : { leaves };
}

export function extractEUTRAFeatures(eutraPdu: Asn1Record, includeUnclassified = false): RatFeatures {
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
  if (fgiRel10 !== undefined) {
    leaves.push(...extractFgiBits(fgiRel10, 'FGI-Rel10', FGI_REL10_TABLE, 100));
  }

  const fddContainer = findInExtensions(eutraPdu, 'fdd-Add-UE-EUTRA-Capabilities-v1060');
  const fgiRel10Fdd = isRecord(fddContainer)
    ? fddContainer['featureGroupIndRel10-v1060']
    : undefined;
  if (fgiRel10Fdd !== undefined && fgiRel10Fdd !== fgiRel10) {
    leaves.push(...extractFgiBits(fgiRel10Fdd, 'FGI-Rel10-FDD', FGI_REL10_TABLE, 100));
  }

  const tddContainer = findInExtensions(eutraPdu, 'tdd-Add-UE-EUTRA-Capabilities-v1060');
  const fgiRel10Tdd = isRecord(tddContainer)
    ? tddContainer['featureGroupIndRel10-v1060']
    : undefined;
  if (fgiRel10Tdd !== undefined && fgiRel10Tdd !== fgiRel10) {
    leaves.push(...extractFgiBits(fgiRel10Tdd, 'FGI-Rel10-TDD', FGI_REL10_TABLE, 100));
  }

  if (!includeUnclassified) return { leaves };
  const unclassified = collectUnclassifiedFeatures(eutraPdu, EUTRA_FEATURE_SPECS, map);
  return unclassified.length > 0 ? { leaves, unclassified } : { leaves };
}

export function extractMRDCFeatures(mrdcPdu: Asn1Record, includeUnclassified = false): RatFeatures {
  const map = buildCanonicalFeatureMap(mrdcPdu);
  const leaves = buildLeavesFromSpecs(mrdcPdu, MRDC_FEATURE_SPECS);

  if (!includeUnclassified) return { leaves };
  const unclassified = collectUnclassifiedFeatures(mrdcPdu, MRDC_FEATURE_SPECS, map);
  return unclassified.length > 0 ? { leaves, unclassified } : { leaves };
}

export function extractUTRAFeatures(utraPdu: Asn1Record, includeUnclassified = false): RatFeatures {
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

  if (!includeUnclassified) return { leaves };
  const unclassified = collectUnclassifiedFeatures(utraPdu, UTRA_FEATURE_SPECS, map);
  return unclassified.length > 0 ? { leaves, unclassified } : { leaves };
}
