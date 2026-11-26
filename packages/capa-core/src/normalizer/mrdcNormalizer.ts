/**
 * Stage 2 MRDC (EN-DC / EUTRA-NR) Domain Normalizer.
 * Extracts EN-DC band combinations and resolves both NR and EUTRA FeatureSets.
 */

import type { Asn1Record } from '../types/astTypes';
import type {
  BandCombination,
  BandParameter,
  EutraBandInfo,
  EutraRatInfo,
  MrdcParameters,
  MrdcRatInfo,
  NRBandInfo,
  NRRatInfo,
  UnifiedFeatureSetData,
} from '../types/capaTypes';
import { generateCombinationKey, getBwClassCcCount } from './comboKey';
import {
  parseFeatureSetCombinations,
  pickHigherQam,
  resolveBandCombinationsWithFeatureSets,
} from './featureSets';
import {
  cleanPowerClass,
  extractNumber,
  isRecord,
  isSupported,
  parseBitStringToIndices,
  parseSupportedFlag,
  toArray,
} from './helpers';
import { extractAggregatedBw, extractCaParametersNR } from './nrNormalizer';

function extractMrdcParameters(base?: unknown, v1590?: unknown, v1630?: unknown): MrdcParameters | undefined {
  const out: MrdcParameters = {};

  if (isRecord(base)) {
    if (parseSupportedFlag(base['dynamicPowerSharingENDC'])) out.dynamicPowerSharingENDC = true;
    if (parseSupportedFlag(base['tdm-Pattern'])) out.tdm_PatternConfig = true;
    if (parseSupportedFlag(base['simultaneousRxTxInterBandENDC'])) out.simultaneousRxTxInterBandENDC = true;
    if (parseSupportedFlag(base['asyncIntraBandENDC'])) out.asyncIntraBandENDC = true;
    const pc = cleanPowerClass(base['powerClass-v1530']);
    if (pc) out.powerClass = pc;
  }

  if (isRecord(v1590)) {
    if (parseSupportedFlag(v1590['tdm-Pattern'])) out.tdm_PatternConfig = true;
    if (parseSupportedFlag(v1590['asyncIntraBandENDC'])) out.asyncIntraBandENDC = true;
  }

  void v1630;
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseMrdcBandParams(bandList: Asn1Record[]): BandParameter[] {
  const params: BandParameter[] = [];

  for (const entry of bandList) {
    if (isRecord(entry['eutra'])) {
      const e = entry['eutra'];
      const band = extractNumber(e['bandEUTRA']);
      if (band === undefined) continue;
      const dlClass = typeof e['ca-BandwidthClassDL-EUTRA'] === 'string'
        ? e['ca-BandwidthClassDL-EUTRA']
        : undefined;
      const ulClass = typeof e['ca-BandwidthClassUL-EUTRA'] === 'string'
        ? e['ca-BandwidthClassUL-EUTRA']
        : undefined;

      params.push({
        ratType: 'eutra',
        band,
        ...(dlClass ? { bandwidthClassDL: dlClass } : {}),
        ...(ulClass ? { bandwidthClassUL: ulClass } : {}),
      });
    } else if (isRecord(entry['nr'])) {
      const n = entry['nr'];
      const band = extractNumber(n['bandNR']);
      if (band === undefined) continue;
      const dlClass = typeof n['ca-BandwidthClassDL-NR'] === 'string'
        ? n['ca-BandwidthClassDL-NR']
        : undefined;
      const ulClass = typeof n['ca-BandwidthClassUL-NR'] === 'string'
        ? n['ca-BandwidthClassUL-NR']
        : undefined;

      params.push({
        ratType: 'nr',
        band,
        ...(dlClass ? { bandwidthClassDL: dlClass } : {}),
        ...(ulClass ? { bandwidthClassUL: ulClass } : {}),
      });
    }
  }

  return params;
}

/**
 * Extract EN-DC (`eutra-nr`) RAT information from `UE-MRDC-Capability`.
 */
export function extractMrdcRat(
  mrdcPdu: Asn1Record,
  nrRat: NRRatInfo | undefined,
  eutraRat: EutraRatInfo | undefined,
  nrFsData: UnifiedFeatureSetData,
  eutraFsData: UnifiedFeatureSetData
): MrdcRatInfo {
  const rfMrdc = isRecord(mrdcPdu['rf-ParametersMRDC']) ? mrdcPdu['rf-ParametersMRDC'] : {};

  const baseList = toArray(rfMrdc['supportedBandCombinationList']).filter(isRecord);
  const v1540List = toArray(rfMrdc['supportedBandCombinationList-v1540']);
  const v1560List = toArray(rfMrdc['supportedBandCombinationList-v1560']);
  const v1590List = toArray(rfMrdc['supportedBandCombinationList-v1590']);
  const v1610List = toArray(rfMrdc['supportedBandCombinationList-v1610']);
  const v1630List = toArray(rfMrdc['supportedBandCombinationList-v1630']);
  const v1780List = toArray(rfMrdc['supportedBandCombinationList-v1780']);

  const combos: BandCombination[] = [];
  const rawBandLists: Asn1Record[][] = [];

  for (let i = 0; i < baseList.length; i++) {
    const rawCombo = baseList[i];
    const bandList = toArray(rawCombo['bandList']).filter(isRecord);
    const bandParams = parseMrdcBandParams(bandList);
    if (bandParams.length === 0) continue;

    const v1540 = i < v1540List.length && isRecord(v1540List[i]) ? v1540List[i] as Asn1Record : undefined;
    const v1560 = i < v1560List.length && isRecord(v1560List[i]) ? v1560List[i] as Asn1Record : undefined;
    const v1590 = i < v1590List.length && isRecord(v1590List[i]) ? v1590List[i] as Asn1Record : undefined;
    const v1610 = i < v1610List.length && isRecord(v1610List[i]) ? v1610List[i] as Asn1Record : undefined;
    const v1630 = i < v1630List.length && isRecord(v1630List[i]) ? v1630List[i] as Asn1Record : undefined;
    const v1780 = i < v1780List.length && isRecord(v1780List[i]) ? v1780List[i] as Asn1Record : undefined;

    // Apply v1540 per-band srs-TxSwitch
    const v1540Bands = v1540 ? toArray(v1540['bandList-v1540']) : [];
    for (let j = 0; j < bandParams.length && j < v1540Bands.length; j++) {
      const bExt = v1540Bands[j];
      if (!isRecord(bExt)) continue;
      const srs = bExt['srs-TxSwitch'];
      if (isRecord(srs)) {
        const sw = srs['supportedSRS-TxPortSwitch'];
        if (typeof sw === 'string' && sw !== 'notSupported') {
          bandParams[j].srsTxSwitch = sw;
        }
      }
    }

    const fsc = extractNumber(rawCombo['featureSetCombination']);
    const powerClass = cleanPowerClass(v1610?.['powerClass-v1610'] ?? rawCombo['powerClass-v1530'] ?? rawCombo['powerClass-v1610']);
    const bcs = parseBitStringToIndices(rawCombo['supportedBandwidthCombinationSet']);
    const caEutra = isRecord(rawCombo['ca-ParametersEUTRA']) ? rawCombo['ca-ParametersEUTRA'] : undefined;
    const bcsEutra = caEutra
      ? parseBitStringToIndices(caEutra['supportedBandwidthCombinationSetEUTRA-v1530'])
      : [];

    const mrdcParameters = extractMrdcParameters(
      rawCombo['mrdc-Parameters'],
      v1590?.['mrdc-Parameters-v1590'],
      v1630?.['mrdc-Parameters-v1630']
    );
    const caParametersNR = extractCaParametersNR(
      rawCombo['ca-ParametersNR'],
      v1540?.['ca-ParametersNR-v1540'],
      v1560?.['ca-ParametersNR-v1560']
    );
    const aggregatedBw = extractAggregatedBw(v1780);

    combos.push({
      bands: bandParams,
      ...(fsc !== undefined ? { featureSetCombination: fsc } : {}),
      ...(powerClass ? { powerClass } : {}),
      ...(bcs.length > 0 ? { supportedBandwidthCombinationSet: bcs } : {}),
      ...(bcsEutra.length > 0 ? { supportedBandwidthCombinationSetEUTRA: bcsEutra } : {}),
      ...(mrdcParameters ? { mrdcParameters } : {}),
      ...(caParametersNR ? { caParametersNR } : {}),
      ...(aggregatedBw ? { aggregatedBw } : {}),
    });
    rawBandLists.push(bandList);
  }

  // Resolve NR & EUTRA FeatureSets (and enrich NR bands from MRDC combinations)
  const rawFsc = mrdcPdu['featureSetCombinations'];
  const fscList = rawFsc ? parseFeatureSetCombinations(rawFsc) : undefined;

  const resolvedCombos = resolveBandCombinationsWithFeatureSets(
    combos,
    rawBandLists,
    fscList,
    nrFsData.nrFeatureSetMap,
    eutraFsData.eutraFeatureSetMap,
    nrRat?.bands ?? []
  );

  // Fill any missing band-level fallbacks and compute keys + CC totals
  const nrBandMap = new Map<number, NRBandInfo>((nrRat?.bands ?? []).map((b) => [b.band, b]));
  const eutraBandMap = new Map<number, EutraBandInfo>((eutraRat?.bands ?? []).map((b) => [b.band, b]));

  const mrdcBandSet = new Map<string, NRBandInfo | EutraBandInfo>();

  for (const combo of resolvedCombos) {
    let dlCc = 0;
    let ulCc = 0;
    const hasResolvedCc = combo.dlCc !== undefined && combo.ulCc !== undefined;

    for (const bp of combo.bands) {
      if (bp.ratType === 'nr') {
        const b = nrBandMap.get(bp.band);
        if (b) {
          mrdcBandSet.set(`nr:${b.band}`, b);
          if (!bp.dlQam && b.dlQam) bp.dlQam = b.dlQam;
          if (!bp.ulQam && b.ulQam && bp.bandwidthClassUL) bp.ulQam = pickHigherQam(bp.ulQam, b.ulQam);
        }
      } else {
        const b = eutraBandMap.get(bp.band);
        if (b) {
          mrdcBandSet.set(`eutra:${b.band}`, b);
          if (!bp.dlQam && b.dlQam) bp.dlQam = b.dlQam;
          if (!bp.ulQam && b.ulQam && bp.bandwidthClassUL) bp.ulQam = pickHigherQam(bp.ulQam, b.ulQam);
          if (bp.dlMimo === undefined && b.dlMimo !== undefined) bp.dlMimo = b.dlMimo;
        }
      }
      if (!hasResolvedCc) {
        const isFr2 = bp.ratType === 'nr' && bp.band >= 257;
        if (bp.bandwidthClassDL) dlCc += getBwClassCcCount(bp.bandwidthClassDL, bp.ratType, isFr2);
        if (bp.bandwidthClassUL) ulCc += getBwClassCcCount(bp.bandwidthClassUL, bp.ratType, isFr2);
      }
    }

    if (!hasResolvedCc) {
      combo.dlCc = dlCc;
      combo.ulCc = ulCc;
    }
    combo.key = generateCombinationKey(combo);
  }

  // Silence unused import check when isSupported isn't needed directly
  void isSupported;

  return {
    bands: [...mrdcBandSet.values()],
    bandCombinations: resolvedCombos,
  };
}
