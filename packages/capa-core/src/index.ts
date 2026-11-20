/**
 * @ohmycapa/capa-core v2.0
 *
 * 3-stage UE Capability parsing, domain normalization, and AB Comparison engine:
 *   Stage 1 (Syntax):   SLSI / MTK / Qualcomm OTA logs & CommonCapaJson -> CanonicalAsn1Tree
 *   Stage 2 (Normalizer): CanonicalAsn1Tree -> CommonCapaJson v2.0
 *   Stage 3 (Compare):  AB Comparison, Workbook/Excel Export, & Input Validation
 */

// Stage 0: Types & Band Helpers
export type {
  Asn1Record,
  CanonicalAsn1Tree,
  CapaVendor,
  InputFormat,
  RatType,
  VendorDetectionResult,
} from './types/astTypes';

export type {
  AggregatedBW,
  AsReleaseInfo,
  BandCombination,
  BandParameter,
  CaParametersNR,
  ChannelBW,
  ComboDisplayOptions,
  CommonCapaJson,
  CompareFormat,
  CompareMeta,
  Diagnostics,
  EutraBandInfo,
  EUTRAFeatureSet,
  EutraRatInfo,
  FeatureKind,
  FeatureLeaf,
  FeatureSetCombination,
  FeatureSetCombinationsList,
  FeatureSetData,
  FeatureSetRef,
  FeatureSetsPerBand,
  FeaturesInfo,
  MimoInfo,
  MrdcParameters,
  MrdcRatInfo,
  NRBandInfo,
  NRFeatureSet,
  NRRatInfo,
  RatFeatures,
  RatInfo,
  SrsInfo,
  UnifiedFeatureSetData,
  UnknownFeature,
  UtraBandInfo,
  UtraRatInfo,
} from './types/capaTypes';

export {
  EUTRA_BAND_NAMES,
  NR_BAND_NAMES,
  UTRA_BAND_NAMES,
  getEutraBandName,
  getNRBandName,
  getUtraBandName,
} from './types/capaTypes';

export type {
  BandDiff,
  BandParamDiff,
  CapaCompareResult,
  ChannelBWDiff,
  ComboDiff,
  ComboMatchStatus,
  CompareSummary,
  CoverageAnalysis,
  CoverageDirection,
  DeviceState,
  DiffStatus,
  FeatureDiff,
  FeatureDiffStatus,
  ParsedFile,
  PropertyDiff,
  RatCompareResult,
  RatFeaturesDiff,
  RatSummary,
  StringListDiff,
} from './types/compareTypes';

// Stage 1: Syntax Layer
export {
  detectInputFormat,
  hexDescToBitString,
  mergeCanonicalAsts,
  normalizeBitString,
  parseCapaText,
  parseCommonCapaJson,
} from './syntax';

// Stage 2: Domain Normalizer
export {
  generateCombinationKey,
  getBwClassCcCount,
  normalizeCapa,
  normalizeMultipleCapa,
  type NormalizeOptions,
} from './normalizer';

// Stage 3: AB Comparison, Export, & Validation
export { compareCapaFormats } from './compare/capaCompare';
export {
  buildCapaCompareWorkbook,
  buildSingleDeviceWorkbook,
  exportCapaCompareToExcel,
  exportSingleDeviceToExcel,
  formatExportBaseName,
  serializeCommonCapaJson,
} from './compare/capaExport';
export {
  validateCapaFileHeader,
  validateFileExtension,
  type ValidationResult,
} from './compare/capaValidate';

// Excel styling utilities (shared with @ohmycapa/mtk-core)
export {
  aOnlyCellStyle,
  applySheetStyles,
  bOnlyCellStyle,
  changedCellStyle,
  defaultCellStyle,
  headerCellStyle,
} from './utils/excelUtils';
