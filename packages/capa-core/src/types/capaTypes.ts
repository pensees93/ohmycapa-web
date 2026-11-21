/**
 * Stage 2: Common UE Capability JSON (CommonCapaJson v2.0) types.
 * Vendor-agnostic intermediate representation shared across SLSI, MTK, and Qualcomm.
 */

import type { CapaVendor, RatType } from './astTypes';

export type { CapaVendor, RatType } from './astTypes';

/**
 * Channel Bandwidth information for NR bands (per SCS in MHz strings, e.g. ["20", "40", "100"]).
 */
export interface ChannelBW {
  'scs-15kHz'?: string[];
  'scs-30kHz'?: string[];
  'scs-60kHz'?: string[];
  'scs-120kHz'?: string[];
}

/**
 * MIMO capability information.
 */
export interface MimoInfo {
  dlLayers?: number;
  ulLayers?: number;
  dlCapability?: 'twoLayers' | 'fourLayers';
  tm3Tm4?: boolean;
}

/**
 * SRS Tx Switch information.
 */
export interface SrsInfo {
  txSwitch?: string;
}

/**
 * Band information for NR (5G).
 */
export interface NRBandInfo {
  band: number;
  displayName: string;
  powerClass?: string;
  dlMimo?: number;
  ulMimo?: number;
  dlQam?: string;
  ulQam?: string;
  channelBWsDL?: ChannelBW;
  channelBWsUL?: ChannelBW;
  /** Special bandwidth supports (e.g., 90MHz, 80MHz) from FeatureSets */
  extraBws?: string[];
  dlBandwidth?: string;
  ulBandwidth?: string;
  dlFeatureSet?: number;
  ulFeatureSet?: number;
  srs?: SrsInfo;
  /** BWP adaptation with same numerology support (upto 2 or 4 BWPs) */
  bwpSameNumerology?: string;
  /** Multiple TCI support */
  multipleTCI?: boolean;
  /** BWP operation without bandwidth restriction */
  bwpWithoutRestriction?: boolean;
  /** Max uplink duty cycle for PC2 FR1 (e.g. "n100", TS 38.101-1) */
  maxUplinkDutyCycle?: string;
  /** Power boosting with pi/2 BPSK support (TS 38.101-1) */
  powerBoostingPi2BPSK?: boolean;
  /** Min bandwidth from featureSetsDownlinkPerCC-v1700 (3GPP TS 38.331 Rel-17) */
  dlMinBandwidth?: string;
  /** Min bandwidth from featureSetsUplinkPerCC-v1700 (3GPP TS 38.331 Rel-17) */
  ulMinBandwidth?: string;
}

/**
 * Band information for EUTRA (LTE).
 */
export interface EutraBandInfo {
  band: number;
  displayName: string;
  powerClass?: string;
  halfDuplex?: boolean;
  dlMimo?: number;
  ulMimo?: number;
  dlQam?: string;
  ulQam?: string;
  /** Non-contiguous UL resource allocation within CC (Rel-10) */
  nonContiguousULRA?: boolean;
}

/**
 * Band information for UTRA (3G).
 */
export interface UtraBandInfo {
  band: number;
  displayName: string;
  powerClass?: string;
}

/**
 * Band parameter in a combination.
 */
export interface BandParameter {
  ratType: 'nr' | 'eutra';
  band: number;
  bandwidthClassDL?: string;
  bandwidthClassUL?: string;
  dlQam?: string;
  ulQam?: string;
  dlMimo?: number;
  ulMimo?: number;
  dlBandwidth?: string;
  ulBandwidth?: string;
  srsTxSwitch?: string;
  fourLayerTM3_TM4?: boolean;
}

/**
 * Display/matching options for band combinations.
 */
export interface ComboDisplayOptions {
  showQam?: boolean;
  showMimo?: boolean;
  mergeRedundant?: boolean;
}

/**
 * MRDC-specific parameters for a band combination (3GPP TS 38.331).
 */
export interface MrdcParameters {
  dynamicPowerSharingENDC?: boolean;
  tdm_PatternConfig?: boolean;
  simultaneousRxTxInterBandENDC?: boolean;
  asyncIntraBandENDC?: boolean;
  powerClass?: string;
}

/**
 * CA Parameters NR per band combination (3GPP TS 38.331).
 */
export interface CaParametersNR {
  simultaneousRxTxInterBandCA?: boolean;
  diffNumerologyWithinPUCCHGroupSmallerSCS?: boolean;
  diffNumerologyWithinPUCCHGroupLargerSCS?: boolean;
  maxNumberSimultaneousNZPCSIRSAllCC?: number;
  totalNumberPortsSimultaneousNZPCSIRSAllCC?: string;
  simultaneousCSIReportsAllCC?: number;
}

/**
 * Aggregated Bandwidth per CA combination (Rel-17, 3GPP TS 38.331).
 */
export interface AggregatedBW {
  scalingFactorSCS?: boolean;
  fddDl?: string;
  fddUl?: string;
  tddDl?: string;
  tddUl?: string;
  totalDl?: string;
  totalUl?: string;
}

/**
 * Band combination information (CA, DC).
 */
export interface BandCombination {
  bands: BandParameter[];
  featureSetCombination?: number;
  powerClass?: string;
  featureSetIndex?: number;
  key?: string;
  dlCc?: number;
  ulCc?: number;
  mrdcParameters?: MrdcParameters;
  supportedBandwidthCombinationSet?: number[];
  supportedBandwidthCombinationSetEUTRA?: number[];
  aggregatedBw?: AggregatedBW;
  caParametersNR?: CaParametersNR;
}

/**
 * FeatureSet reference for a band.
 */
export interface FeatureSetRef {
  dl?: number;
  ul?: number;
}

/**
 * FeatureSet per band (contains multiple options).
 */
export interface FeatureSetsPerBand {
  options: FeatureSetRef[];
}

export type FeatureSetCombination = FeatureSetRef[];
export type FeatureSetCombinationsList = FeatureSetRef[][][];

export interface FeatureSetData {
  dlQam?: string;
  ulQam?: string;
  dlMimo?: number;
  ulMimo?: number;
}

/**
 * NR FeatureSet entry.
 */
export interface NRFeatureSet {
  index: number;
  dl?: {
    qam?: string;
    mimo?: number;
    bandwidth?: string;
    minBandwidth?: string;
    extraBws?: string[];
    ccCount?: number;
  };
  ul?: {
    qam?: string;
    mimo?: number;
    bandwidth?: string;
    minBandwidth?: string;
    extraBws?: string[];
    ccCount?: number;
  };
}

/**
 * EUTRA FeatureSet entry.
 */
export interface EUTRAFeatureSet {
  index: number;
  dl?: {
    qam?: string;
    mimo?: number;
    bandwidth?: string;
    extraBws?: string[];
  };
  ul?: {
    qam?: string;
    mimo?: number;
    bandwidth?: string;
    extraBws?: string[];
  };
}

/**
 * Unified FeatureSet data for MRDC resolution.
 */
export interface UnifiedFeatureSetData {
  featureSetCombinations?: FeatureSetCombinationsList;
  nrFeatureSets?: NRFeatureSet[];
  eutraFeatureSets?: EUTRAFeatureSet[];
  nrFeatureSetMap?: Map<number, NRFeatureSet>;
  eutraFeatureSetMap?: Map<number, EUTRAFeatureSet>;
}

// ─── Feature leaf / taxonomy types ──────────────────────────────────────────

export type FeatureKind = 'bool' | 'enum' | 'number' | 'stringList' | 'numberList' | 'presence' | 'fgiBit';

export interface FeatureLeaf {
  major: string;
  middle: string;
  leaf: string;
  kind: FeatureKind;
  value: boolean | number | string | string[] | number[] | undefined;
  description?: string;
  bit?: number;
  /** Canonical AST path for traceability and GitHub spec auto-registration. */
  path?: string;
  /** True when classified dynamically by the auto-classifier rather than a static FeatureSpec. */
  autoDiscovered?: boolean;
}

export interface UnknownFeature {
  major: string;
  middle: string;
  leaf: string;
  path: string;
  kind: FeatureKind;
  value: unknown;
  description?: string;
  codeSnippet: string;
}

export interface RatFeatures {
  leaves: FeatureLeaf[];
  unclassified?: UnknownFeature[];
}

export interface FeaturesInfo {
  nr?: RatFeatures;
  eutra?: RatFeatures;
  'eutra-nr'?: RatFeatures;
  utra?: RatFeatures;
}

// ─── RAT container types ────────────────────────────────────────────────────

export interface NRRatInfo {
  bands: NRBandInfo[];
  bandCombinations: BandCombination[];
  featureSets?: NRFeatureSet[];
}

export interface EutraRatInfo {
  bands: EutraBandInfo[];
  bandCombinations: BandCombination[];
  featureSets?: EUTRAFeatureSet[];
}

export interface MrdcRatInfo {
  bands: (NRBandInfo | EutraBandInfo)[];
  bandCombinations: BandCombination[];
}

export interface UtraRatInfo {
  bands: UtraBandInfo[];
  bandCombinations: BandCombination[];
}

export interface RatInfo {
  bands: (NRBandInfo | EutraBandInfo | UtraBandInfo)[];
  bandCombinations: BandCombination[];
}

export interface AsReleaseInfo {
  nr?: string;
  eutra?: string;
  utra?: string;
}

export interface CompareMeta {
  deviceName: string;
  fileName: string;
  sourceFiles?: string[];
  vendor: CapaVendor;
  fileSize?: number;
  totalLines?: number;
  detectedRats: RatType[];
  asRelease?: AsReleaseInfo;
}

export interface Diagnostics {
  warnings: string[];
  errors: string[];
  parsedLines?: number;
  skippedLines?: number;
}

/**
 * Common UE Capability JSON v2.0 format used for storage, inspection, and A/B comparison.
 */
export interface CommonCapaJson {
  schemaVersion: '2.0';
  meta: CompareMeta;
  rats: {
    nr?: NRRatInfo;
    eutra?: EutraRatInfo;
    'eutra-nr'?: MrdcRatInfo;
    utra?: UtraRatInfo;
  };
  features?: FeaturesInfo;
  diagnostics: Diagnostics;
}

/** Alias for compatibility with compare consumers */
export type CompareFormat = CommonCapaJson;

// ─── Band name helpers ──────────────────────────────────────────────────────

/**
 * NR Band to display name mapping (3GPP TS 38.101-1 / TS 38.101-2).
 */
export const NR_BAND_NAMES: Record<number, string> = {
  1: 'n1', 2: 'n2', 3: 'n3', 5: 'n5', 7: 'n7', 8: 'n8',
  12: 'n12', 14: 'n14', 18: 'n18', 20: 'n20', 25: 'n25',
  26: 'n26', 28: 'n28', 29: 'n29', 30: 'n30', 34: 'n34',
  38: 'n38', 39: 'n39', 40: 'n40', 41: 'n41', 46: 'n46',
  48: 'n48', 50: 'n50', 51: 'n51', 53: 'n53', 65: 'n65',
  66: 'n66', 67: 'n67', 70: 'n70', 71: 'n71', 74: 'n74',
  75: 'n75', 76: 'n76', 77: 'n77', 78: 'n78', 79: 'n79',
  80: 'n80', 81: 'n81', 82: 'n82', 83: 'n83', 84: 'n84',
  86: 'n86', 89: 'n89', 90: 'n90', 91: 'n91', 92: 'n92',
  93: 'n93', 94: 'n94', 95: 'n95', 96: 'n96', 257: 'n257',
  258: 'n258', 259: 'n259', 260: 'n260', 261: 'n261',
};

/**
 * EUTRA Band to display name mapping (3GPP TS 36.101).
 */
export const EUTRA_BAND_NAMES: Record<number, string> = {
  1: 'B1', 2: 'B2', 3: 'B3', 4: 'B4', 5: 'B5', 6: 'B6',
  7: 'B7', 8: 'B8', 9: 'B9', 10: 'B10', 11: 'B11', 12: 'B12',
  13: 'B13', 14: 'B14', 17: 'B17', 18: 'B18', 19: 'B19', 20: 'B20',
  21: 'B21', 22: 'B22', 23: 'B23', 24: 'B24', 25: 'B25', 26: 'B26',
  27: 'B27', 28: 'B28', 29: 'B29', 30: 'B30', 31: 'B31', 32: 'B32',
  33: 'B33', 34: 'B34', 35: 'B35', 36: 'B36', 37: 'B37', 38: 'B38',
  39: 'B39', 40: 'B40', 41: 'B41', 42: 'B42', 43: 'B43', 44: 'B44',
  45: 'B45', 46: 'B46', 47: 'B47', 48: 'B48', 49: 'B49', 50: 'B50',
  51: 'B51', 52: 'B52', 53: 'B53', 54: 'B54', 55: 'B55', 56: 'B56',
  57: 'B57', 58: 'B58', 59: 'B59', 60: 'B60', 61: 'B61', 62: 'B62',
  63: 'B63', 64: 'B64', 65: 'B65', 66: 'B66', 67: 'B67', 68: 'B68',
  69: 'B69', 70: 'B70', 71: 'B71', 72: 'B72', 73: 'B73', 74: 'B74',
  75: 'B75', 76: 'B76', 77: 'B77', 78: 'B78', 79: 'B79', 80: 'B80',
  81: 'B81', 82: 'B82', 83: 'B83', 84: 'B84', 85: 'B85', 86: 'B86',
  87: 'B87', 88: 'B88', 89: 'B89', 90: 'B90', 91: 'B91', 92: 'B92',
  93: 'B93', 94: 'B94', 95: 'B95', 96: 'B96', 97: 'B97', 98: 'B98',
  99: 'B99', 100: 'B100', 101: 'B101', 102: 'B102', 103: 'B103',
  104: 'B104', 105: 'B105', 106: 'B106', 107: 'B107', 108: 'B108',
};

/**
 * UTRA Band to display name mapping (3GPP TS 25.101).
 */
export const UTRA_BAND_NAMES: Record<string, string> = {
  'bandI': 'bandI', 'bandII': 'bandII', 'bandIII': 'bandIII',
  'bandIV': 'bandIV', 'bandV': 'bandV', 'bandVI': 'bandVI',
  'bandVII': 'bandVII', 'bandVIII': 'bandVIII', 'bandIX': 'bandIX',
  'bandX': 'bandX', 'bandXI': 'bandXI', 'bandXII': 'bandXII',
  'bandXIII': 'bandXIII', 'bandXIV': 'bandXIV', 'bandXIX': 'bandXIX',
  'bandXX': 'bandXX', 'bandXXI': 'bandXXI', 'bandXXII': 'bandXXII',
  'bandXXV': 'bandXXV', 'bandXXVI': 'bandXXVI',
  'fdd2100': 'bandI', 'fdd1900': 'bandII', 'fdd1800': 'bandIII',
};

export function getNRBandName(band: number): string {
  return NR_BAND_NAMES[band] || `n${band}`;
}

export function getEutraBandName(band: number): string {
  return EUTRA_BAND_NAMES[band] || `B${band}`;
}

export function getUtraBandName(band: string | number): string {
  const key = typeof band === 'number' ? `band${band}` : band;
  return UTRA_BAND_NAMES[key] || band.toString();
}
