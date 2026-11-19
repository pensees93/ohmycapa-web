/**
 * Stage 2 Domain Normalizer Entry Point.
 * Transforms CanonicalAsn1Tree -> CommonCapaJson v2.0 with zero vendor-specific branches.
 */

import type { Asn1Record, CanonicalAsn1Tree, RatType } from '../types/astTypes';
import type {
  AsReleaseInfo,
  CommonCapaJson,
  FeaturesInfo,
  UnifiedFeatureSetData,
} from '../types/capaTypes';
import { mergeCanonicalAsts } from '../syntax/pduMerger';
import { extractEutraRat } from './eutraNormalizer';
import {
  extractEUTRAFeatures,
  extractMRDCFeatures,
  extractNRFeatures,
  extractUTRAFeatures,
} from './featureNormalizer';
import { extractMrdcRat } from './mrdcNormalizer';
import { extractNRRat } from './nrNormalizer';
import { extractUtraRat } from './utraNormalizer';

export interface NormalizeOptions {
  deviceName?: string;
  includeUnclassified?: boolean;
}

function extractAsRelease(pdu?: Asn1Record): string | undefined {
  if (!pdu) return undefined;
  const rel = pdu['accessStratumRelease'];
  return typeof rel === 'string' && rel.trim() ? rel.trim() : undefined;
}

/**
 * Normalize a single vendor-neutral `CanonicalAsn1Tree` into `CommonCapaJson` v2.0.
 */
export function normalizeCapa(ast: CanonicalAsn1Tree, options: NormalizeOptions = {}): CommonCapaJson {
  const { deviceName = 'Device', includeUnclassified = false } = options;

  const detectedRats: RatType[] = [];
  const rats: CommonCapaJson['rats'] = {};
  const features: FeaturesInfo = {};
  const asRelease: AsReleaseInfo = {};

  let nrFsData: UnifiedFeatureSetData = {};
  let eutraFsData: UnifiedFeatureSetData = {};

  // 1. Extract EUTRA first so EUTRA FeatureSets are available for EN-DC resolution
  if (ast.pdus.eutra) {
    const eutraOut = extractEutraRat(ast.pdus.eutra);
    eutraFsData = eutraOut.fsData;
    rats.eutra = eutraOut.ratInfo;
    detectedRats.push('eutra');
    features.eutra = extractEUTRAFeatures(ast.pdus.eutra, includeUnclassified);
    const eutraRel = extractAsRelease(ast.pdus.eutra);
    if (eutraRel) asRelease.eutra = eutraRel;
  }

  // 2. Extract NR
  if (ast.pdus.nr) {
    const nrOut = extractNRRat(ast.pdus.nr);
    nrFsData = nrOut.fsData;
    rats.nr = nrOut.ratInfo;
    detectedRats.push('nr');
    features.nr = extractNRFeatures(ast.pdus.nr, includeUnclassified);
    const nrRel = extractAsRelease(ast.pdus.nr);
    if (nrRel) asRelease.nr = nrRel;
  }

  // 3. Extract MRDC (EN-DC) and enrich NR bands from MRDC featureSets
  if (ast.pdus.mrdc) {
    const mrdcInfo = extractMrdcRat(ast.pdus.mrdc, rats.nr, rats.eutra, nrFsData, eutraFsData);
    if (mrdcInfo.bandCombinations.length > 0 || mrdcInfo.bands.length > 0) {
      rats['eutra-nr'] = mrdcInfo;
      detectedRats.push('eutra-nr');
    }
    const mrdcFeat = extractMRDCFeatures(ast.pdus.mrdc, includeUnclassified);
    if (mrdcFeat.leaves.length > 0 || mrdcFeat.unclassified?.length) {
      features['eutra-nr'] = mrdcFeat;
    }
  }

  // 4. Extract UTRA (from InterRATHandoverInfo container + EUTRA inter-RAT fallback)
  const utraInfo = extractUtraRat(ast.pdus.utra, ast.pdus.eutra);
  if (utraInfo) {
    rats.utra = utraInfo;
    detectedRats.push('utra');
  }
  if (ast.pdus.utra) {
    const utraFeat = extractUTRAFeatures(ast.pdus.utra, includeUnclassified);
    if (utraFeat.leaves.length > 0 || utraFeat.unclassified?.length) {
      features.utra = utraFeat;
    }
  }

  const totalLines = ast.metadata?.['totalLines'] ? Number(ast.metadata['totalLines']) : undefined;
  const fileSize = ast.metadata?.['fileSize'] ? Number(ast.metadata['fileSize']) : undefined;

  return {
    schemaVersion: '2.0',
    meta: {
      deviceName,
      fileName: ast.fileName ?? ast.sourceFiles.join(', ') ?? deviceName,
      ...(ast.sourceFiles.length > 0 ? { sourceFiles: ast.sourceFiles } : {}),
      vendor: ast.vendor,
      ...(fileSize !== undefined && Number.isFinite(fileSize) ? { fileSize } : {}),
      ...(totalLines !== undefined && Number.isFinite(totalLines) ? { totalLines } : {}),
      detectedRats,
      ...(Object.keys(asRelease).length > 0 ? { asRelease } : {}),
    },
    rats,
    ...(Object.keys(features).length > 0 ? { features } : {}),
    diagnostics: {
      warnings: [...ast.warnings],
      errors: [],
    },
  };
}

/**
 * Merge multiple parsed AST files from the same device and normalize into a single `CommonCapaJson` v2.0.
 */
export function normalizeMultipleCapa(
  asts: CanonicalAsn1Tree[],
  deviceName: string,
  includeUnclassified = false
): CommonCapaJson {
  const merged = mergeCanonicalAsts(asts);
  return normalizeCapa(merged, { deviceName, includeUnclassified });
}

export { generateCombinationKey, getBwClassCcCount } from './comboKey';
