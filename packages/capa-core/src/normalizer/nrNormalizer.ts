/**
 * Stage 2 NR (5G SA) Domain Normalizer.
 * Extracts NR bands, Channel BWs (TS 38.306), NR CA combinations, and FeatureSets.
 */

import type { Asn1Record } from '../types/astTypes';
import type {
  AggregatedBW,
  BandCombination,
  BandParameter,
  CaParametersNR,
  NRBandInfo,
  NRRatInfo,
  UnifiedFeatureSetData,
} from '../types/capaTypes';
import { calcMaxNRBw, extractNRBandChannelBws } from './channelBw';
import { generateCombinationKey, getBwClassCcCount } from './comboKey';
import {
  extractNRFeatureSets,
  pickHigherQam,
  resolveBandCombinationsWithFeatureSets,
} from './featureSets';
import {
  cleanPowerClass,
  extractMhzValue,
  extractNumber,
  isRecord,
  isSupported,
  parseBitStringToIndices,
  parseSupportedFlag,
  toArray,
} from './helpers';

function extractNrBandInfo(rawBand: Asn1Record, fr1Supports256Qam: boolean): NRBandInfo | undefined {
  const band = extractNumber(rawBand['bandNR']);
  if (band === undefined) return undefined;

  const { dl: channelBWsDL, ul: channelBWsUL } = extractNRBandChannelBws(rawBand);

  const powerClass = cleanPowerClass(rawBand['ue-PowerClass-v1610'] ?? rawBand['ue-PowerClass']);

  let dlQam: string | undefined;
  if (band >= 257) {
    if (isSupported(rawBand['pdsch-256QAM-FR2'])) {
      dlQam = 'qam256';
    }
  } else if (fr1Supports256Qam) {
    dlQam = 'qam256';
  }
  let ulQam: string | undefined;
  if (isSupported(rawBand['pusch-256QAM'])) {
    ulQam = 'qam256';
  }

  let srsTxSwitch: string | undefined;
  if (isRecord(rawBand['srs-TxSwitch'])) {
    const sw = rawBand['srs-TxSwitch']['supportedSRS-TxPortSwitch'];
    if (typeof sw === 'string' && sw !== 'notSupported') {
      srsTxSwitch = sw;
    }
  }

  const bwpSame = typeof rawBand['bwp-SameNumerology'] === 'string'
    ? rawBand['bwp-SameNumerology']
    : undefined;
  const maxDuty =
    (typeof rawBand['maxUplinkDutyCycle-PC1dot5-MPE-FR1-r16'] === 'string'
      ? rawBand['maxUplinkDutyCycle-PC1dot5-MPE-FR1-r16']
      : undefined) ??
    (typeof rawBand['maxUplinkDutyCycle-PC2-FR1'] === 'string'
      ? rawBand['maxUplinkDutyCycle-PC2-FR1']
      : undefined) ??
    (typeof rawBand['maxUplinkDutyCycle-FR2'] === 'string'
      ? rawBand['maxUplinkDutyCycle-FR2']
      : undefined);

  const dlBandwidth = calcMaxNRBw(channelBWsDL);
  const ulBandwidth = calcMaxNRBw(channelBWsUL);

  return {
    band,
    displayName: `n${band}`,
    ...(powerClass ? { powerClass } : {}),
    ...(dlQam ? { dlQam } : {}),
    ...(ulQam ? { ulQam } : {}),
    ...(channelBWsDL ? { channelBWsDL } : {}),
    ...(channelBWsUL ? { channelBWsUL } : {}),
    ...(dlBandwidth ? { dlBandwidth } : {}),
    ...(ulBandwidth ? { ulBandwidth } : {}),
    ...(srsTxSwitch ? { srs: { txSwitch: srsTxSwitch } } : {}),
    ...(bwpSame ? { bwpSameNumerology: bwpSame } : {}),
    ...(parseSupportedFlag(rawBand['multipleTCI']) ? { multipleTCI: true } : {}),
    ...(parseSupportedFlag(rawBand['bwp-WithoutRestriction']) ? { bwpWithoutRestriction: true } : {}),
    ...(parseSupportedFlag(rawBand['powerBoosting-pi2BPSK']) ? { powerBoostingPi2BPSK: true } : {}),
    ...(maxDuty ? { maxUplinkDutyCycle: maxDuty } : {}),
  };
}

export function extractCaParametersNR(
  base?: unknown,
  v1540?: unknown,
  v1560?: unknown
): CaParametersNR | undefined {
  const out: CaParametersNR = {};

  if (isRecord(base)) {
    if (parseSupportedFlag(base['simultaneousRxTxInterBandCA'])) {
      out.simultaneousRxTxInterBandCA = true;
    }
    if (parseSupportedFlag(base['diffNumerologyWithinPUCCH-GroupSmallerSCS'])) {
      out.diffNumerologyWithinPUCCHGroupSmallerSCS = true;
    }
    if (parseSupportedFlag(base['diffNumerologyWithinPUCCH-GroupLargerSCS'])) {
      out.diffNumerologyWithinPUCCHGroupLargerSCS = true;
    }
    if (isSupported(base['parallelTxSRS-PUCCH-PUSCH'])) {
      // Optional field retained on feature tree
    }
  }

  for (const ext of [v1540, v1560]) {
    if (!isRecord(ext)) continue;
    if (parseSupportedFlag(ext['diffNumerologyWithinPUCCH-GroupSmallerSCS'])) {
      out.diffNumerologyWithinPUCCHGroupSmallerSCS = true;
    }
    if (parseSupportedFlag(ext['diffNumerologyWithinPUCCH-GroupLargerSCS'])) {
      out.diffNumerologyWithinPUCCHGroupLargerSCS = true;
    }
    const csiIm = ext['csi-RS-IM-ReceptionForFeedbackPerBandComb'];
    if (isRecord(csiIm)) {
      const maxNzp = extractNumber(csiIm['maxNumberSimultaneousNZP-CSI-RS-ActBWP-AllCC']);
      if (maxNzp !== undefined) out.maxNumberSimultaneousNZPCSIRSAllCC = maxNzp;
      const ports = csiIm['totalNumberPortsSimultaneousNZP-CSI-RS-ActBWP-AllCC'];
      if (ports !== undefined) out.totalNumberPortsSimultaneousNZPCSIRSAllCC = String(ports);
    }
    const maxNzpDirect = extractNumber(ext['maxNumberSimultaneousNZP-CSI-RS-AllCC']);
    if (maxNzpDirect !== undefined) out.maxNumberSimultaneousNZPCSIRSAllCC = maxNzpDirect;
    const reports = extractNumber(ext['simultaneousCSI-ReportsAllCC']);
    if (reports !== undefined) out.simultaneousCSIReportsAllCC = reports;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

export function extractAggregatedBw(v1780Combo: unknown): AggregatedBW | undefined {
  if (!isRecord(v1780Combo)) return undefined;
  const caV1780 = isRecord(v1780Combo['ca-ParametersNR-v1780'])
    ? v1780Combo['ca-ParametersNR-v1780']
    : v1780Combo;
  const agg = caV1780['supportedAggBW-FR1-r17'] ?? caV1780['supportedAggBW-FR2-r17'];
  if (!isRecord(agg)) return undefined;

  const out: AggregatedBW = {};
  if (isSupported(agg['scalingFactorSCS-r17'])) {
    out.scalingFactorSCS = true;
  }
  const fddDl = extractMhzValue(agg['supportedAggBW-FDD-DL-r17']);
  if (fddDl) out.fddDl = fddDl;
  const fddUl = extractMhzValue(agg['supportedAggBW-FDD-UL-r17']);
  if (fddUl) out.fddUl = fddUl;
  const tddDl = extractMhzValue(agg['supportedAggBW-TDD-DL-r17']);
  if (tddDl) out.tddDl = tddDl;
  const tddUl = extractMhzValue(agg['supportedAggBW-TDD-UL-r17']);
  if (tddUl) out.tddUl = tddUl;
  const totalDl = extractMhzValue(agg['supportedAggBW-TotalDL-r17']);
  if (totalDl) out.totalDl = totalDl;
  const totalUl = extractMhzValue(agg['supportedAggBW-TotalUL-r17']);
  if (totalUl) out.totalUl = totalUl;

  return Object.keys(out).length > 0 ? out : undefined;
}

function parseNrBandParams(bandList: unknown[]): BandParameter[] {
  const params: BandParameter[] = [];
  for (const item of bandList) {
    if (!isRecord(item)) continue;
    const nrEntry = isRecord(item['nr']) ? item['nr'] : item;
    const band = extractNumber(nrEntry['bandNR']);
    if (band === undefined) continue;

    const dlClass = typeof nrEntry['ca-BandwidthClassDL-NR'] === 'string'
      ? nrEntry['ca-BandwidthClassDL-NR']
      : undefined;
    const ulClass = typeof nrEntry['ca-BandwidthClassUL-NR'] === 'string'
      ? nrEntry['ca-BandwidthClassUL-NR']
      : undefined;

    params.push({
      ratType: 'nr',
      band,
      ...(dlClass ? { bandwidthClassDL: dlClass } : {}),
      ...(ulClass ? { bandwidthClassUL: ulClass } : {}),
    });
  }
  return params;
}

/**
 * Extract NR RAT information (bands, NR CA combinations, and FeatureSets).
 */
export function extractNRRat(nrPdu: Asn1Record): {
  ratInfo: NRRatInfo;
  fsData: UnifiedFeatureSetData;
} {
  const rfParams = isRecord(nrPdu['rf-Parameters']) ? nrPdu['rf-Parameters'] : {};
  const fsData = extractNRFeatureSets(nrPdu);
  const phyParams = nrPdu['phy-Parameters'];
  const phyFr1 = isRecord(phyParams) ? phyParams['phy-ParametersFR1'] : undefined;
  const fr1Supports256Qam = isRecord(phyFr1) && isSupported(phyFr1['pdsch-256QAM-FR1']);

  // Extract NR bands
  const bands: NRBandInfo[] = [];
  for (const rawBand of toArray(rfParams['supportedBandListNR'])) {
    if (!isRecord(rawBand)) continue;
    const info = extractNrBandInfo(rawBand, fr1Supports256Qam);
    if (info) bands.push(info);
  }

  // Extract NR CA combinations + index-aligned extensions
  const baseList = toArray(rfParams['supportedBandCombinationList']).filter(isRecord);
  const v1540List = toArray(rfParams['supportedBandCombinationList-v1540']);
  const v1560List = toArray(rfParams['supportedBandCombinationList-v1560']);
  const v1610List = toArray(rfParams['supportedBandCombinationList-v1610']);
  const v1780List = toArray(rfParams['supportedBandCombinationList-v1780']);

  const combos: BandCombination[] = [];
  const rawBandLists: Asn1Record[][] = [];

  for (let i = 0; i < baseList.length; i++) {
    const rawCombo = baseList[i];
    const bandList = toArray(rawCombo['bandList']).filter(isRecord);
    const bandParams = parseNrBandParams(bandList);
    if (bandParams.length === 0) continue;

    const v1540 = i < v1540List.length && isRecord(v1540List[i]) ? v1540List[i] as Asn1Record : undefined;
    const v1560 = i < v1560List.length && isRecord(v1560List[i]) ? v1560List[i] as Asn1Record : undefined;
    const v1610 = i < v1610List.length && isRecord(v1610List[i]) ? v1610List[i] as Asn1Record : undefined;
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
      ...(caParametersNR ? { caParametersNR } : {}),
      ...(aggregatedBw ? { aggregatedBw } : {}),
    });
    rawBandLists.push(bandList);
  }

  // Resolve FeatureSet references onto NR combinations and enrich NR bands
  const resolvedCombos = resolveBandCombinationsWithFeatureSets(
    combos,
    rawBandLists,
    fsData.featureSetCombinations,
    fsData.nrFeatureSetMap,
    undefined,
    bands
  );

  // Fill NR BandParam fallbacks from band capabilities and finalize keys + CC counts
  const bandLookup = new Map<number, NRBandInfo>(bands.map((b) => [b.band, b]));
  for (const combo of resolvedCombos) {
    let dlCc = 0;
    let ulCc = 0;
    const hasResolvedCc = combo.dlCc !== undefined && combo.ulCc !== undefined;
    for (const bp of combo.bands) {
      const bandInfo = bandLookup.get(bp.band);
      if (bandInfo) {
        if (!bp.dlQam && bandInfo.dlQam) bp.dlQam = bandInfo.dlQam;
        if (!bp.ulQam && bandInfo.ulQam && bp.bandwidthClassUL) {
          bp.ulQam = pickHigherQam(bp.ulQam, bandInfo.ulQam);
        }
      }
      if (!hasResolvedCc) {
        const isFr2 = bp.band >= 257;
        if (bp.bandwidthClassDL) dlCc += getBwClassCcCount(bp.bandwidthClassDL, 'nr', isFr2);
        if (bp.bandwidthClassUL) ulCc += getBwClassCcCount(bp.bandwidthClassUL, 'nr', isFr2);
      }
    }
    if (!hasResolvedCc) {
      combo.dlCc = dlCc;
      combo.ulCc = ulCc;
    }
    combo.key = generateCombinationKey(combo);
  }

  return {
    ratInfo: {
      bands,
      bandCombinations: resolvedCombos,
      ...(fsData.nrFeatureSets && fsData.nrFeatureSets.length > 0
        ? { featureSets: fsData.nrFeatureSets }
        : {}),
    },
    fsData,
  };
}
