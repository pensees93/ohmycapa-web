/**
 * 3GPP FeatureSet & FeatureSetCombination extractor and resolver (NR & EUTRA).
 *
 * Per 3GPP TS 38.331 / TS 36.331:
 *   - NR FeatureSetDownlinkPerCC-Id / FeatureSetUplinkPerCC-Id is 1-based (`id - 1`).
 *   - EUTRA FeatureSetDL-PerCC-Id-r15 / FeatureSetUL-PerCC-Id-r15 is 0-based (`id`).
 *   - FeatureSetDL-Id / FeatureSetUL-Id inside FeatureSetCombination is 1-based (`0` = absent).
 */

import type { Asn1Record } from '../types/astTypes';
import type {
  BandCombination,
  BandParameter,
  EUTRAFeatureSet,
  FeatureSetCombinationsList,
  FeatureSetRef,
  NRBandInfo,
  NRFeatureSet,
  UnifiedFeatureSetData,
} from '../types/capaTypes';
import { mergeExtraBws, calcMaxNRBw } from './channelBw';
import {
  extractMhzValue,
  extractNumber,
  findInExtensions,
  isRecord,
  isSupported,
  parseMimoLayers,
  toArray,
} from './helpers';

const QAM_RANK: Record<string, number> = {
  qam16: 1,
  qam64: 2,
  qam256: 3,
  qam1024: 4,
};

const EXTRA_BW_FLAGS = [
  ['channelBW-90mhz', '90MHz'],
  ['channelBW-80mhz', '80MHz'],
  ['channelBW-40mhz', '40MHz'],
] as const;

export function pickHigherQam(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return (QAM_RANK[b] ?? 0) > (QAM_RANK[a] ?? 0) ? b : a;
}

export function pickHigherBw(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  const numA = parseInt(a, 10) || 0;
  const numB = parseInt(b, 10) || 0;
  return numB > numA ? b : a;
}

function pickLowerBw(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  const numA = parseInt(a, 10) || Infinity;
  const numB = parseInt(b, 10) || Infinity;
  return numB < numA ? b : a;
}

function collectExtraBws(perCC: Asn1Record, target: Set<string>): void {
  for (const [field, label] of EXTRA_BW_FLAGS) {
    if (isSupported(perCC[field])) {
      target.add(label);
    }
  }
}

function summarizeNrPerCCs(
  ids: number[],
  perCCList: Asn1Record[],
  perCCV1700List: Asn1Record[],
  isUl: boolean
): NRFeatureSet['dl'] | undefined {
  if (ids.length === 0) return undefined;

  let qam: string | undefined;
  let mimo: number | undefined;
  let bandwidth: string | undefined;
  let minBandwidth: string | undefined;
  const extraBws = new Set<string>();

  for (const id of ids) {
    // 3GPP TS 38.331: FeatureSetDownlinkPerCC-Id / UplinkPerCC-Id is 1-based (1..maxNrofPerCC-Ids)
    const idx = id - 1;
    if (idx < 0 || idx >= perCCList.length) continue;

    const perCC = perCCList[idx];
    const perCCV1700 = idx < perCCV1700List.length ? perCCV1700List[idx] : undefined;

    const qamVal = perCC[isUl ? 'supportedModulationOrderUL' : 'supportedModulationOrderDL'];
    if (typeof qamVal === 'string') {
      qam = pickHigherQam(qam, qamVal);
    }

    const rawMimo = isUl
      ? (isRecord(perCC['mimo-CB-PUSCH'])
          ? perCC['mimo-CB-PUSCH']['maxNumberMIMO-LayersCB-PUSCH']
          : undefined) ??
        perCC['maxNumberMIMO-LayersNonCB-PUSCH'] ??
        perCC['maxNumberMIMO-LayersPUSCH']
      : perCC['maxNumberMIMO-LayersPDSCH'];
    const layers = parseMimoLayers(rawMimo);
    if (layers !== undefined && (mimo === undefined || layers > mimo)) {
      mimo = layers;
    }

    const bwVal = extractMhzValue(perCC[isUl ? 'supportedBandwidthUL' : 'supportedBandwidthDL']);
    bandwidth = pickHigherBw(bandwidth, bwVal);

    if (isRecord(perCCV1700)) {
      const minBw = extractMhzValue(
        perCCV1700[isUl ? 'supportedMinBandwidthUL-r17' : 'supportedMinBandwidthDL-r17'] ??
          perCCV1700[isUl ? 'supportedMinBandwidthUL' : 'supportedMinBandwidthDL']
      );
      minBandwidth = pickLowerBw(minBandwidth, minBw);
    }

    collectExtraBws(perCC, extraBws);
  }

  return {
    ...(qam ? { qam } : {}),
    ...(mimo !== undefined ? { mimo } : {}),
    ...(bandwidth ? { bandwidth } : {}),
    ...(minBandwidth ? { minBandwidth } : {}),
    ...(extraBws.size > 0 ? { extraBws: [...extraBws] } : {}),
    ccCount: ids.length,
  };
}

/**
 * Extract NR FeatureSets from `UE-NR-Capability`.
 */
export function extractNRFeatureSets(nrPdu: Asn1Record): UnifiedFeatureSetData {
  const fsContainer = nrPdu['featureSets'];
  if (!isRecord(fsContainer)) {
    return { nrFeatureSets: [], nrFeatureSetMap: new Map() };
  }

  const dlList = toArray(fsContainer['featureSetsDownlink']).filter(isRecord);
  const ulList = toArray(fsContainer['featureSetsUplink']).filter(isRecord);
  const dlPerCC = toArray(fsContainer['featureSetsDownlinkPerCC']).filter(isRecord);
  const ulPerCC = toArray(fsContainer['featureSetsUplinkPerCC']).filter(isRecord);
  const dlPerCCV1700 = toArray(fsContainer['featureSetsDownlinkPerCC-v1700']).filter(isRecord);
  const ulPerCCV1700 = toArray(fsContainer['featureSetsUplinkPerCC-v1700']).filter(isRecord);

  const count = Math.max(dlList.length, ulList.length);
  const nrFeatureSets: NRFeatureSet[] = [];
  const nrFeatureSetMap = new Map<number, NRFeatureSet>();

  for (let i = 0; i < count; i++) {
    const index = i + 1; // FeatureSet IDs in combinations are 1-based
    const dlObj = i < dlList.length ? dlList[i] : undefined;
    const ulObj = i < ulList.length ? ulList[i] : undefined;

    const dlIds = dlObj
      ? toArray(dlObj['featureSetListPerDownlinkCC']).map(extractNumber).filter((n): n is number => n !== undefined)
      : [];
    const ulIds = ulObj
      ? toArray(ulObj['featureSetListPerUplinkCC']).map(extractNumber).filter((n): n is number => n !== undefined)
      : [];

    const entry: NRFeatureSet = {
      index,
      ...(dlIds.length > 0 ? { dl: summarizeNrPerCCs(dlIds, dlPerCC, dlPerCCV1700, false) } : {}),
      ...(ulIds.length > 0 ? { ul: summarizeNrPerCCs(ulIds, ulPerCC, ulPerCCV1700, true) } : {}),
    };

    if (entry.dl || entry.ul) {
      nrFeatureSets.push(entry);
      nrFeatureSetMap.set(index, entry);
    }
  }

  const rawFsc = nrPdu['featureSetCombinations'];
  const featureSetCombinations = rawFsc ? parseFeatureSetCombinations(rawFsc) : undefined;

  return {
    nrFeatureSets,
    nrFeatureSetMap,
    ...(featureSetCombinations ? { featureSetCombinations } : {}),
  };
}

function summarizeEutraPerCCs(
  ids: number[],
  perCCList: Asn1Record[],
  isUl: boolean
): EUTRAFeatureSet['dl'] | undefined {
  if (ids.length === 0) return undefined;

  let qam: string | undefined;
  let mimo: number | undefined;
  let bandwidth: string | undefined;

  for (const id of ids) {
    // 3GPP TS 36.331: FeatureSetDL-PerCC-Id-r15 / UL-PerCC-Id-r15 is 0-based
    if (id < 0 || id >= perCCList.length) continue;
    const perCC = perCCList[id];

    const mimoVal =
      perCC[isUl ? 'supportedMIMO-CapabilityUL-r15' : 'supportedMIMO-CapabilityDL-MRDC-r15'] ??
      perCC[isUl ? 'supportedMIMO-CapabilityUL-MRDC-r15' : 'supportedMIMO-CapabilityDL-r15'];
    const layers = parseMimoLayers(mimoVal);
    if (layers !== undefined && (mimo === undefined || layers > mimo)) {
      mimo = layers;
    }
    if (!isUl && isSupported(perCC['fourLayerTM3-TM4-r15'])) {
      if (mimo === undefined || mimo < 4) {
        mimo = 4;
      }
    }

    const qamVal = perCC[isUl ? 'ul-256QAM-r15' : 'dl-256QAM-r15'];
    if (isSupported(qamVal)) {
      qam = pickHigherQam(qam, 'qam256');
    }

    const bwVal = extractMhzValue(perCC[isUl ? 'supportedBandwidthUL-r15' : 'supportedBandwidthDL-r15']);
    bandwidth = pickHigherBw(bandwidth, bwVal);
  }

  return {
    ...(qam ? { qam } : {}),
    ...(mimo !== undefined ? { mimo } : {}),
    ...(bandwidth ? { bandwidth } : {}),
  };
}

/**
 * Extract EUTRA FeatureSets (`featureSetsEUTRA-r15`) from `UE-EUTRA-Capability` extensions.
 */
export function extractEutraFeatureSets(eutraPdu: Asn1Record): UnifiedFeatureSetData {
  const fsContainer = findInExtensions(eutraPdu, 'featureSetsEUTRA-r15');
  if (!isRecord(fsContainer)) {
    return { eutraFeatureSets: [], eutraFeatureSetMap: new Map() };
  }

  const dlList = toArray(fsContainer['featureSetsDL-r15']).filter(isRecord);
  const ulList = toArray(fsContainer['featureSetsUL-r15']).filter(isRecord);
  const dlPerCC = toArray(fsContainer['featureSetsDL-PerCC-r15']).filter(isRecord);
  const ulPerCC = toArray(fsContainer['featureSetsUL-PerCC-r15']).filter(isRecord);

  const count = Math.max(dlList.length, ulList.length);
  const eutraFeatureSets: EUTRAFeatureSet[] = [];
  const eutraFeatureSetMap = new Map<number, EUTRAFeatureSet>();

  for (let i = 0; i < count; i++) {
    const index = i + 1; // FeatureSetDL-EUTRA-Id / UL-EUTRA-Id in FeatureSetCombination is 1-based
    const dlObj = i < dlList.length ? dlList[i] : undefined;
    const ulObj = i < ulList.length ? ulList[i] : undefined;

    const dlIds = dlObj
      ? toArray(dlObj['featureSetPerCC-ListDL-r15']).map(extractNumber).filter((n): n is number => n !== undefined)
      : [];
    const ulIds = ulObj
      ? toArray(ulObj['featureSetPerCC-ListUL-r15']).map(extractNumber).filter((n): n is number => n !== undefined)
      : [];

    const entry: EUTRAFeatureSet = {
      index,
      ...(dlIds.length > 0 ? { dl: summarizeEutraPerCCs(dlIds, dlPerCC, false) } : {}),
      ...(ulIds.length > 0 ? { ul: summarizeEutraPerCCs(ulIds, ulPerCC, true) } : {}),
    };

    if (entry.dl || entry.ul) {
      eutraFeatureSets.push(entry);
      eutraFeatureSetMap.set(index, entry);
    }
  }

  return { eutraFeatureSets, eutraFeatureSetMap };
}

/**
 * Parse raw `featureSetCombinations` AST list into `FeatureSetRef[][][]`.
 * Each FeatureSet entry is `{ nr: { downlinkSetNR, uplinkSetNR } }` or `{ eutra: { downlinkSetEUTRA, uplinkSetEUTRA } }`.
 */
export function parseFeatureSetCombinations(raw: unknown): FeatureSetCombinationsList {
  const combinations: FeatureSetCombinationsList = [];

  for (const rawComb of toArray(raw)) {
    const perBandList: FeatureSetRef[][] = [];
    for (const rawBandOpts of toArray(rawComb)) {
      const options: FeatureSetRef[] = [];
      for (const rawOpt of toArray(rawBandOpts)) {
        if (!isRecord(rawOpt)) continue;
        const inner = isRecord(rawOpt['nr'])
          ? rawOpt['nr']
          : isRecord(rawOpt['eutra'])
            ? rawOpt['eutra']
            : rawOpt;
        const dl = extractNumber(inner['downlinkSetNR'] ?? inner['downlinkSetEUTRA']);
        const ul = extractNumber(inner['uplinkSetNR'] ?? inner['uplinkSetEUTRA']);
        if (dl !== undefined || ul !== undefined) {
          options.push({ dl, ul });
        }
      }
      perBandList.push(options);
    }
    combinations.push(perBandList);
  }

  return combinations;
}

function applyNrFeatureSetToBandParam(bp: BandParameter, fs: NRFeatureSet, useDl: boolean, useUl: boolean): void {
  if (useDl && fs.dl) {
    if (fs.dl.mimo !== undefined && (bp.dlMimo === undefined || fs.dl.mimo > bp.dlMimo)) {
      bp.dlMimo = fs.dl.mimo;
    }
    if (fs.dl.qam) bp.dlQam = pickHigherQam(bp.dlQam, fs.dl.qam);
    if (fs.dl.bandwidth) bp.dlBandwidth = pickHigherBw(bp.dlBandwidth, fs.dl.bandwidth);
  }
  if (useUl && fs.ul) {
    if (fs.ul.mimo !== undefined && (bp.ulMimo === undefined || fs.ul.mimo > bp.ulMimo)) {
      bp.ulMimo = fs.ul.mimo;
    }
    if (fs.ul.qam) bp.ulQam = pickHigherQam(bp.ulQam, fs.ul.qam);
    if (fs.ul.bandwidth) bp.ulBandwidth = pickHigherBw(bp.ulBandwidth, fs.ul.bandwidth);
  }
}

function applyEutraFeatureSetToBandParam(
  bp: BandParameter,
  fs: EUTRAFeatureSet,
  useDl: boolean,
  useUl: boolean
): void {
  if (useDl && fs.dl) {
    if (fs.dl.mimo !== undefined && (bp.dlMimo === undefined || fs.dl.mimo > bp.dlMimo)) {
      bp.dlMimo = fs.dl.mimo;
    }
    if (fs.dl.qam) bp.dlQam = pickHigherQam(bp.dlQam, fs.dl.qam);
    if (fs.dl.bandwidth) bp.dlBandwidth = pickHigherBw(bp.dlBandwidth, fs.dl.bandwidth);
  }
  if (useUl && fs.ul) {
    if (fs.ul.mimo !== undefined && (bp.ulMimo === undefined || fs.ul.mimo > bp.ulMimo)) {
      bp.ulMimo = fs.ul.mimo;
    }
    if (fs.ul.qam) bp.ulQam = pickHigherQam(bp.ulQam, fs.ul.qam);
    if (fs.ul.bandwidth) bp.ulBandwidth = pickHigherBw(bp.ulBandwidth, fs.ul.bandwidth);
  }
}

/**
 * Resolve FeatureSetCombination references onto BandParameters in NR/MRDC BandCombinations,
 * and enrich NRBandInfo entries from resolved FeatureSets.
 */
export function resolveBandCombinationsWithFeatureSets(
  combos: BandCombination[],
  rawBandLists: Asn1Record[][],
  fscList: FeatureSetCombinationsList | undefined,
  nrMap: Map<number, NRFeatureSet> | undefined,
  eutraMap: Map<number, EUTRAFeatureSet> | undefined,
  nrBands: NRBandInfo[]
): void {
  const nrBandLookup = new Map<number, NRBandInfo>();
  for (const b of nrBands) {
    nrBandLookup.set(b.band, b);
  }

  for (let cIdx = 0; cIdx < combos.length; cIdx++) {
    const combo = combos[cIdx];
    const fscIdx = combo.featureSetCombination;
    if (fscIdx === undefined || !fscList || fscIdx < 0 || fscIdx >= fscList.length) continue;

    const perBandOptions = fscList[fscIdx];
    for (let bIdx = 0; bIdx < combo.bands.length && bIdx < perBandOptions.length; bIdx++) {
      const bp = combo.bands[bIdx];
      const options = perBandOptions[bIdx];
      if (!options || options.length === 0) continue;

      for (const opt of options) {
        if (bp.ratType === 'nr' && nrMap) {
          if (opt.dl && opt.dl > 0) {
            const dlFs = nrMap.get(opt.dl);
            if (dlFs) {
              applyNrFeatureSetToBandParam(bp, dlFs, Boolean(bp.bandwidthClassDL), false);
              enrichNrBandFromFs(nrBandLookup.get(bp.band), opt.dl, dlFs, true, false);
            }
          }
          if (opt.ul && opt.ul > 0) {
            const ulFs = nrMap.get(opt.ul);
            if (ulFs) {
              applyNrFeatureSetToBandParam(bp, ulFs, false, Boolean(bp.bandwidthClassUL));
              enrichNrBandFromFs(nrBandLookup.get(bp.band), opt.ul, ulFs, false, true);
            }
          }
        } else if (bp.ratType === 'eutra' && eutraMap) {
          if (opt.dl && opt.dl > 0) {
            const dlFs = eutraMap.get(opt.dl);
            if (dlFs) applyEutraFeatureSetToBandParam(bp, dlFs, Boolean(bp.bandwidthClassDL), false);
          }
          if (opt.ul && opt.ul > 0) {
            const ulFs = eutraMap.get(opt.ul);
            if (ulFs) applyEutraFeatureSetToBandParam(bp, ulFs, false, Boolean(bp.bandwidthClassUL));
          }
        }
      }
    }

    // Also store first NR DL featureSet index if present on combo
    void rawBandLists[cIdx];
  }

  // Recompute NRBandInfo max bandwidths now that extraBws/dlBandwidth may be populated
  for (const band of nrBands) {
    const isFr2 = band.band >= 257;
    band.channelBWsDL = mergeExtraBws(band.channelBWsDL, band.extraBws, isFr2);
    band.channelBWsUL = mergeExtraBws(band.channelBWsUL, band.extraBws, isFr2);
    const maxDl = calcMaxNRBw(band.channelBWsDL, band.dlBandwidth);
    const maxUl = calcMaxNRBw(band.channelBWsUL, band.ulBandwidth);
    if (maxDl) band.dlBandwidth = maxDl;
    if (maxUl) band.ulBandwidth = maxUl;
  }
}

function enrichNrBandFromFs(
  band: NRBandInfo | undefined,
  fsId: number,
  fs: NRFeatureSet,
  hasDl: boolean,
  hasUl: boolean
): void {
  if (!band) return;

  if (hasDl && fs.dl) {
    band.dlFeatureSet = band.dlFeatureSet ?? fsId;
    if (fs.dl.mimo !== undefined && (band.dlMimo === undefined || fs.dl.mimo > band.dlMimo)) {
      band.dlMimo = fs.dl.mimo;
    }
    if (fs.dl.qam) band.dlQam = pickHigherQam(band.dlQam, fs.dl.qam);
    if (fs.dl.bandwidth) band.dlBandwidth = pickHigherBw(band.dlBandwidth, fs.dl.bandwidth);
    if (fs.dl.minBandwidth) band.dlMinBandwidth = pickLowerBw(band.dlMinBandwidth, fs.dl.minBandwidth);
    if (fs.dl.extraBws?.length) {
      band.extraBws = [...new Set([...(band.extraBws ?? []), ...fs.dl.extraBws])];
    }
  }

  if (hasUl && fs.ul) {
    band.ulFeatureSet = band.ulFeatureSet ?? fsId;
    if (fs.ul.mimo !== undefined && (band.ulMimo === undefined || fs.ul.mimo > band.ulMimo)) {
      band.ulMimo = fs.ul.mimo;
    }
    if (fs.ul.qam) band.ulQam = pickHigherQam(band.ulQam, fs.ul.qam);
    if (fs.ul.bandwidth) band.ulBandwidth = pickHigherBw(band.ulBandwidth, fs.ul.bandwidth);
    if (fs.ul.minBandwidth) band.ulMinBandwidth = pickLowerBw(band.ulMinBandwidth, fs.ul.minBandwidth);
    if (fs.ul.extraBws?.length) {
      band.extraBws = [...new Set([...(band.extraBws ?? []), ...fs.ul.extraBws])];
    }
  }
}
