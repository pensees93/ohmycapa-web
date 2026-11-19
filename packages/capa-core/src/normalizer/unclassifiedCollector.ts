/**
 * Unclassified Feature Collector for Stage 2 validation.
 * Discovers any canonical leaf path not covered by FeatureSpecs or structural exclusions.
 */

import type { Asn1Record } from '../types/astTypes';
import type { FeatureKind, UnknownFeature } from '../types/capaTypes';
import { isRecord } from './helpers';
import type { FeatureSpec } from './specs';

const SKIP_KEYS = new Set([
  'nonCriticalExtension',
  'lateNonCriticalExtension',
  'present',
  'CONTAINING',
  'dummy',
  'dummy1',
  'dummy2',
  'dummy3',
  'dummy4',
  'dummy5',
  'spare',
  'rat-Type',
  'start-CS',
  'start-PS',
  'start-cs',
  'start-ps',
  'predefinedConfigStatusList',
  'uE-SecurityInformation',
  'cipheringAlgorithmCap',
  'integrityProtectionAlgorithmCap',
  'interFreqNeedForGaps',
  'interRAT-NeedForGaps',
  'skipFallbackCombRequested-r13',
  'supportedROHC-Profiles',
]);

const SKIP_PREFIXES = [
  // NR structural/band/combo/featureSet trees
  'featureSetCombinations',
  'featureSets.featureSetsDownlink',
  'featureSets.featureSetsDownlink-v1540',
  'featureSets.featureSetsDownlinkPerCC',
  'featureSets.featureSetsDownlinkPerCC-v1700',
  'featureSets.featureSetsDownlinkPerCC-v1780',
  'featureSets.featureSetsUplink',
  'featureSets.featureSetsUplink-v1540',
  'featureSets.featureSetsUplink-v1630',
  'featureSets.featureSetsUplinkPerCC',
  'featureSets.featureSetsUplinkPerCC-v1700',
  'featureSets.featureSetsUplinkPerCC-v1780',
  'rf-Parameters.supportedBandListNR',
  'rf-Parameters-v16c0.supportedBandListNR-v16c0',
  'rf-Parameters.supportedBandCombinationList',
  'rf-Parameters.appliedFreqBandListFilter',
  'pdcp-Parameters.supportedROHC-Profiles',
  'interRAT-Parameters.eutra.eutra-ParametersCommon.modifiedMPR-BehaviorEUTRA',

  // EUTRA structural/band/combo/featureSet/FGI trees
  'featureSetsEUTRA-r15',
  'rf-Parameters.supportedBandListEUTRA',
  'rf-Parameters-v1250.supportedBandListEUTRA-v1250',
  'rf-Parameters-v1320.supportedBandListEUTRA-v1320',
  'rf-Parameters-v9e0.supportedBandListEUTRA-v9e0',
  'rf-Parameters-v1020.supportedBandCombination-r10',
  'rf-Parameters-v1060.supportedBandCombinationExt-r10',
  'rf-Parameters-v1090.supportedBandCombination-v1090',
  'rf-Parameters-v10i0.supportedBandCombination-v10i0',
  'rf-Parameters-v1130.supportedBandCombination-v1130',
  'rf-Parameters-v1390.supportedBandCombination-v1390',
  'rf-Parameters-v1430.supportedBandCombination-v1430',
  'rf-Parameters-v1180.supportedBandCombinationAdd-r11',
  'rf-Parameters-v1180.requestedBands-r11',
  'rf-Parameters-v11d0.supportedBandCombinationAdd-v11d0',
  'rf-Parameters-v1430.supportedBandCombinationAdd-v1430',
  'rf-Parameters-v1310.supportedBandCombinationReduced-r13',
  'rf-Parameters-v1430.supportedBandCombinationReduced-v1430',
  'rf-Parameters-v10f0.modifiedMPR-Behavior-r10',
  'phyLayerParameters-v1020.nonContiguousUL-RA-WithinCC-List-r10',
  'pdcp-ParametersNR-r15.rohc-Profiles-r15',
  'featureGroupIndicators',
  'featureGroupIndRel9Add-r9',
  'featureGroupIndRel10-r10',
  'featureGroupIndRel10-v1060',
  'fdd-Add-UE-EUTRA-Capabilities-v1060.featureGroupIndRel10-v1060',
  'tdd-Add-UE-EUTRA-Capabilities-v1060.featureGroupIndRel10-v1060',

  // MRDC structural/band/combo trees
  'rf-ParametersMRDC.supportedBandCombinationList',
  'rf-ParametersMRDC.appliedFreqBandListFilter',

  // UTRA band list & compressed mode measurement capability lists
  'ue-CapabilityContainer.ue-RadioAccessCapability-v370ext.ue-RadioAccessCapabBandFDDList',
  'ue-CapabilityContainer.ue-RadioAccessCapability.v4b0NonCriticalExtensions',
];

const RE_SKIP_COMBO_LIST = /^rf-Parameters(?:MRDC)?\.supportedBandCombinationList(?:-v\d+)?(?:\.|$)/;

function isLeafScalarOrPrimitiveArray(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const t = typeof val;
  if (t === 'boolean' || t === 'number' || t === 'string') return true;
  if (Array.isArray(val)) {
    return val.length > 0 && val.every((v) => v === null || typeof v !== 'object');
  }
  return false;
}

function inferKind(value: unknown): FeatureKind {
  if (typeof value === 'boolean' || value === 'supported' || value === 'notSupported') return 'bool';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'enum';
  if (Array.isArray(value)) {
    return value.every((v) => typeof v === 'number') ? 'numberList' : 'stringList';
  }
  return 'presence';
}

function shouldSkipPath(path: string): boolean {
  const segments = path.split('.');
  const last = segments[segments.length - 1] ?? '';
  if (SKIP_KEYS.has(last)) return true;
  if (RE_SKIP_COMBO_LIST.test(path)) return true;

  for (const prefix of SKIP_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}.`)) {
      return true;
    }
  }
  return false;
}

/**
 * Collect canonical feature paths not matched by `specs` or structural exclusions.
 */
export function collectUnclassifiedFeatures(
  pdu: Asn1Record,
  specs: FeatureSpec[],
  featureMap: Map<string, unknown>
): UnknownFeature[] {
  void pdu;
  const knownPaths = new Set<string>();
  const knownLeaves = new Set<string>();

  for (const spec of specs) {
    knownLeaves.add(spec.leaf);
    const cleanPrimary = spec.path.split('.').filter((s) => s !== 'present').join('.');
    knownPaths.add(cleanPrimary);
    knownLeaves.add(cleanPrimary.split('.').pop()!);
    for (const alt of spec.pathAlternatives ?? []) {
      const cleanAlt = alt.split('.').filter((s) => s !== 'present').join('.');
      knownPaths.add(cleanAlt);
      knownLeaves.add(cleanAlt.split('.').pop()!);
    }
  }

  const unclassified: UnknownFeature[] = [];
  for (const [path, value] of featureMap.entries()) {
    // Handle inline single-key CHOICE objects like `{ supported: 'b6400' }` via parent key OR '.supported'
    const normalizedVal = isRecord(value) && typeof value['supported'] === 'string'
      ? value['supported']
      : value;
    if (!isLeafScalarOrPrimitiveArray(normalizedVal)) continue;
    if (shouldSkipPath(path)) continue;

    // Ignore `.supported` child when parent inline CHOICE path is already covered
    const effectivePath = path.endsWith('.supported') ? path.slice(0, -'.supported'.length) : path;
    const leaf = effectivePath.split('.').pop()!;
    if (knownPaths.has(path) || knownPaths.has(effectivePath) || knownLeaves.has(leaf)) {
      continue;
    }

    const kind = inferKind(normalizedVal);
    unclassified.push({
      major: 'Unclassified',
      middle: effectivePath.split('.')[0] || 'Other',
      leaf,
      path: effectivePath,
      kind,
      value: normalizedVal,
      codeSnippet: `{ major: 'Unclassified', middle: '${effectivePath.split('.')[0] || 'Other'}', leaf: '${leaf}', path: '${effectivePath}', kind: '${kind}' }`,
    });
  }

  return unclassified;
}
