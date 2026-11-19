/**
 * Stage 3: AB Compare & UI state types.
 */

import type { CanonicalAsn1Tree, CapaVendor, RatType } from './astTypes';
import type { BandCombination, CommonCapaJson, CompareMeta, FeatureKind, FeatureLeaf } from './capaTypes';

export type DiffStatus = 'same' | 'changed' | 'a-only' | 'b-only';

/**
 * Subset-aware combo match status.
 */
export type ComboMatchStatus =
  | 'exact-same'
  | 'exact-changed'
  | 'a-only-covered'
  | 'a-only-unique'
  | 'b-only-covered'
  | 'b-only-unique';

export interface PropertyDiff<V> {
  a?: V;
  b?: V;
  status: DiffStatus;
}

export interface ChannelBWDiff {
  'scs-15kHz'?: PropertyDiff<string[]>;
  'scs-30kHz'?: PropertyDiff<string[]>;
  'scs-60kHz'?: PropertyDiff<string[]>;
  'scs-120kHz'?: PropertyDiff<string[]>;
}

export interface BandDiff {
  band: number;
  displayName: string;
  status: DiffStatus;
  powerClass?: PropertyDiff<string>;
  dlMimo?: PropertyDiff<number>;
  ulMimo?: PropertyDiff<number>;
  dlQam?: PropertyDiff<string>;
  ulQam?: PropertyDiff<string>;
  halfDuplex?: PropertyDiff<boolean>;
  nonContiguousULRA?: PropertyDiff<boolean>;
  channelBWsDL?: ChannelBWDiff;
  channelBWsUL?: ChannelBWDiff;
  multipleTCI?: PropertyDiff<boolean>;
  bwpWithoutRestriction?: PropertyDiff<boolean>;
  bwpSameNumerology?: PropertyDiff<string>;
  maxUplinkDutyCycle?: PropertyDiff<string>;
  powerBoostingPi2BPSK?: PropertyDiff<boolean>;
}

export interface BandParamDiff {
  band: number;
  ratType: 'nr' | 'eutra';
  displayName: string;
  bandwidthClassDL?: PropertyDiff<string>;
  bandwidthClassUL?: PropertyDiff<string>;
  dlMimo?: PropertyDiff<number>;
  ulMimo?: PropertyDiff<number>;
  dlQam?: PropertyDiff<string>;
  ulQam?: PropertyDiff<string>;
}

export interface ComboDiff {
  key: string;
  status: ComboMatchStatus;
  caLevel: number;
  ulLevel: number;
  a?: BandCombination;
  b?: BandCombination;
  bandParamDiffs?: BandParamDiff[];
  coveringSupersets?: string[];
  paramNotes?: string[];
}

export interface CoverageDirection {
  exactMatch: number;
  exactChanged: number;
  coveredBySuperset: number;
  trulyUnique: number;
  total: number;
  coverageRate: number;
}

export interface CoverageAnalysis {
  aToB: CoverageDirection;
  bToA: CoverageDirection;
}

export interface RatCompareResult {
  bandDiffs: BandDiff[];
  comboDiffs: ComboDiff[];
  coverage: CoverageAnalysis;
}

export interface RatSummary {
  bands: {
    total: number;
    shared: number;
    aOnly: number;
    bOnly: number;
    changed: number;
  };
  combos: {
    total: number;
    exactSame: number;
    exactChanged: number;
    aOnlyCovered: number;
    aOnlyUnique: number;
    bOnlyCovered: number;
    bOnlyUnique: number;
  };
  coverage: CoverageAnalysis;
}

export interface CompareSummary {
  perRat: Partial<Record<RatType, RatSummary>>;
  keyDifferences: string[];
}

export type FeatureDiffStatus = 'same' | 'different' | 'a-only' | 'b-only';

export interface StringListDiff {
  common: string[];
  onlyInA: string[];
  onlyInB: string[];
}

export interface FeatureDiff {
  major: string;
  middle: string;
  leaf: string;
  kind: FeatureKind;
  status: FeatureDiffStatus;
  a?: FeatureLeaf['value'];
  b?: FeatureLeaf['value'];
  stringListDiff?: StringListDiff;
  description?: string;
  bit?: number;
}

export interface RatFeaturesDiff {
  diffs: FeatureDiff[];
  counts: {
    same: number;
    different: number;
    aOnly: number;
    bOnly: number;
  };
}

export interface CapaCompareResult {
  meta: {
    deviceA: CompareMeta;
    deviceB: CompareMeta;
  };
  ratResults: Partial<Record<RatType, RatCompareResult>>;
  featuresDiff?: Partial<Record<RatType, RatFeaturesDiff>>;
  summary: CompareSummary;
}

export interface ParsedFile {
  file: File;
  ast: CanonicalAsn1Tree | null;
  commonJson?: CommonCapaJson | null;
  vendor: CapaVendor;
  status: 'parsing' | 'done' | 'error';
  error?: string;
}

export interface DeviceState {
  files: ParsedFile[];
  normalized: CommonCapaJson | null;
  deviceName: string;
  isProcessing: boolean;
}
