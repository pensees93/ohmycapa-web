/**
 * Unclassified Feature Collector & 3GPP Auto-Classifier for Stage 2 validation.
 * Discovers any canonical leaf path not covered by FeatureSpecs or structural exclusions,
 * and infers 3GPP Major/Middle/Kind taxonomy for immediate AB comparison and GitHub auto-spec filing.
 */

import type { Asn1Record } from '../types/astTypes';
import type { FeatureKind, FeatureLeaf, UnknownFeature } from '../types/capaTypes';
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
  'dummy6',
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
  // NR structural/band-table/combo/featureSet trees (kept narrow so new Rel-18+ band/MIMO capabilities are discovered)
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
  'rf-Parameters.supportedBandListNR.bandNR',
  'rf-Parameters.supportedBandListNR.channelBWs-DL',
  'rf-Parameters.supportedBandListNR.channelBWs-UL',
  'rf-Parameters.supportedBandListNR.channelBWs-DL-v1590',
  'rf-Parameters.supportedBandListNR.channelBWs-UL-v1590',
  'rf-Parameters.supportedBandListNR.srs-TxSwitch',
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
const RE_TRANSPARENT = /^(?:nonCriticalExtension|lateNonCriticalExtension|present|CONTAINING|UE-EUTRA-Capability-v.*-IEs)$/;

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
  if (
    typeof value === 'boolean' ||
    value === 'supported' ||
    value === 'notSupported' ||
    value === 'true' ||
    value === 'false'
  ) {
    return 'bool';
  }
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

function inferMajorFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (
    lower.includes('mimo-parametersperband') ||
    lower.includes('phy-parameters') ||
    lower.includes('phylayerparameters') ||
    lower.includes('highspeed') ||
    lower.includes('laa-parameters') ||
    lower.includes('ce-parameters') ||
    lower.includes('physicalchannelcapability') ||
    lower.includes('transportchannelcapability')
  ) {
    return 'PHY';
  }
  if (lower.includes('mac-parameters')) return 'MAC';
  if (lower.includes('rlc-parameters') || lower.includes('rlc-capability')) return 'RLC';
  if (lower.includes('pdcp-parameters') || lower.includes('pdcp-capability')) return 'PDCP';
  if (lower.includes('sdap-parameters')) return 'SDAP';
  if (lower.includes('interrat-parameters') || lower.includes('irat-parameters')) return 'InterRAT';
  if (
    lower.includes('measandmobparameters') ||
    lower.includes('measparameters') ||
    lower.includes('neighcellsi-') ||
    lower.includes('csg-proximity') ||
    lower.includes('son-parameters') ||
    lower.includes('ue-basednetwperfmeas') ||
    lower.includes('ue-basedperfmeas') ||
    lower.includes('measurementcapability')
  ) {
    return 'Meas/Mob';
  }
  if (lower.includes('ims-parameters') || lower.includes('mmtel-parameters')) return 'IMS';
  if (lower.includes('nrdc-parameters') || lower.includes('generalparametersmrdc')) return 'MRDC';
  if (lower.startsWith('rf-parameters') || lower.includes('.rf-parameters')) return 'RF';
  return 'General';
}

function extractAddPrefix(segments: string[]): string | undefined {
  for (const seg of segments) {
    if (seg.startsWith('fr1-fr2-Add-')) return 'FR1-FR2-Add';
    if (seg.startsWith('fr1-Add-')) return 'FR1-Add';
    if (seg.startsWith('fr2-Add-')) return 'FR2-Add';
    if (seg.startsWith('fdd-Add-')) return 'FDD-Add';
    if (seg.startsWith('tdd-Add-')) return 'TDD-Add';
  }
  return undefined;
}

function formatMiddleSegment(seg: string): string {
  if (/frx-diff/i.test(seg)) return 'FRX-Diff';
  if (/xdd-diff/i.test(seg)) return 'XDD-Diff';
  if (/common/i.test(seg)) return 'Common';
  if (/parametersfr1/i.test(seg)) return 'FR1';
  if (/parametersfr2/i.test(seg)) return 'FR2';
  if (/supportedbandlistnr/i.test(seg)) return 'Band';
  if (/mimo-parametersperband/i.test(seg)) return 'MIMO-PerBand';

  const relMatch = seg.match(/-(r\d+|v\d+)$/i);
  const relSuffix = relMatch ? ` (${relMatch[1].toUpperCase()})` : '';
  const cleaned = seg
    .replace(/-(r\d+|v\d+)$/i, '')
    .replace(/-Parameters$/i, '')
    .replace(/^./, (c) => c.toUpperCase());
  return `${cleaned || 'Other'}${relSuffix}`;
}

/**
 * Automatically classify an unknown 3GPP capability path into `{ major, middle, leaf, kind, description }`.
 */
export function classifyUnknownFeaturePath(
  effectivePath: string,
  normalizedVal: unknown,
  takenKeys?: Set<string>
): { major: string; middle: string; leaf: string; kind: FeatureKind; description: string } {
  const segments = effectivePath.split('.').filter(Boolean);
  const baseLeaf = segments[segments.length - 1] ?? effectivePath;
  const major = inferMajorFromPath(effectivePath);
  const addPrefix = extractAddPrefix(segments);

  let subMiddle = 'Auto';
  if (segments.length >= 2) {
    const parent = segments[segments.length - 2];
    const grand = segments.length >= 3 ? segments[segments.length - 3] : undefined;
    const chosen = /^(?:scs-\d+kHz|fr[12](?:-r\d+)?)$/i.test(parent) && grand ? grand : parent;
    subMiddle = formatMiddleSegment(chosen);
  } else {
    const relMatch = baseLeaf.match(/-(r\d+|v\d+)$/i);
    subMiddle = relMatch ? `Rel-${relMatch[1].slice(1)}` : 'General';
  }

  let middle = addPrefix && !subMiddle.includes(addPrefix)
    ? `${addPrefix} (${subMiddle})`
    : subMiddle;
  let leaf = baseLeaf;

  if (takenKeys) {
    const candidateKey = `${major}|${middle}|${leaf}`;
    if (takenKeys.has(candidateKey)) {
      const disambiguator = segments.length >= 2 ? segments[segments.length - 2] : 'ext';
      leaf = `${baseLeaf} (${disambiguator})`;
      let suffix = 2;
      while (takenKeys.has(`${major}|${middle}|${leaf}`)) {
        leaf = `${baseLeaf} (${disambiguator}-${suffix++})`;
      }
    }
    takenKeys.add(`${major}|${middle}|${leaf}`);
  }

  const kind = inferKind(normalizedVal);
  const description = `Auto-discovered 3GPP capability (${effectivePath})`;

  return { major, middle, leaf, kind, description };
}

/**
 * Collect canonical feature paths not matched by `specs` or structural exclusions.
 */
export function collectUnclassifiedFeatures(
  pdu: Asn1Record,
  specs: FeatureSpec[],
  featureMap: Map<string, unknown>,
  existingLeaves: FeatureLeaf[] = []
): UnknownFeature[] {
  void pdu;
  const knownPaths = new Set<string>();
  const takenKeys = new Set<string>();

  for (const spec of specs) {
    takenKeys.add(`${spec.major}|${spec.middle}|${spec.leaf}`);
    const cleanPrimary = spec.path.split('.').filter((s) => s.length > 0 && !RE_TRANSPARENT.test(s)).join('.');
    knownPaths.add(cleanPrimary);
    for (const alt of spec.pathAlternatives ?? []) {
      const cleanAlt = alt.split('.').filter((s) => s.length > 0 && !RE_TRANSPARENT.test(s)).join('.');
      knownPaths.add(cleanAlt);
    }
  }

  for (const l of existingLeaves) {
    takenKeys.add(`${l.major}|${l.middle}|${l.leaf}`);
  }

  const unclassified: UnknownFeature[] = [];
  for (const [path, value] of featureMap.entries()) {
    const normalizedVal = isRecord(value) && typeof value['supported'] === 'string' && Object.keys(value).length === 1
      ? value['supported']
      : value;
    if (!isLeafScalarOrPrimitiveArray(normalizedVal)) continue;
    if (shouldSkipPath(path)) continue;

    // Ignore `.supported` child when parent inline CHOICE path is already covered
    const effectivePath = path.endsWith('.supported') ? path.slice(0, -'.supported'.length) : path;
    if (knownPaths.has(path) || knownPaths.has(effectivePath)) {
      continue;
    }

    const { major, middle, leaf, kind, description } = classifyUnknownFeaturePath(
      effectivePath,
      normalizedVal,
      takenKeys
    );

    unclassified.push({
      major,
      middle,
      leaf,
      path: effectivePath,
      kind,
      value: normalizedVal,
      description,
      codeSnippet: JSON.stringify({ major, middle, leaf, path: effectivePath, kind, description }, null, 2),
    });
  }

  return unclassified;
}
