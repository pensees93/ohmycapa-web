/**
 * Stage 2 EUTRA (LTE) Domain Normalizer.
 * Extracts LTE bands, release-extended band properties, CA combinations
 * (`r10`, `Add-r11`, `Reduced-r13`), and Rel-15 FeatureSets (`featureSetsEUTRA-r15`).
 */

import type { Asn1Record } from '../types/astTypes';
import type {
  BandCombination,
  BandParameter,
  EutraBandInfo,
  EutraRatInfo,
  UnifiedFeatureSetData,
} from '../types/capaTypes';
import { getEutraBandName } from '../types/capaTypes';
import { generateCombinationKey, getBwClassCcCount } from './comboKey';
import { extractEutraFeatureSets, pickHigherQam } from './featureSets';
import {
  cleanPowerClass,
  extractNumber,
  findInExtensions,
  isRecord,
  isSupported,
  parseBitStringToIndices,
  parseMimoLayers,
  parseSupportedFlag,
  toArray,
} from './helpers';

interface RawEutraComboGroup {
  combos: BandCombination[];
}

function applyUl256QamFromExt(bp: BandParameter, extBandParam: Asn1Record): void {
  if (!bp.bandwidthClassUL) return;
  if (isSupported(extBandParam['ul-256QAM-r14']) || isSupported(extBandParam['ul-256QAM-r15'])) {
    bp.ulQam = pickHigherQam(bp.ulQam, 'qam256');
  }
  const perCcList = toArray(extBandParam['ul-256QAM-perCC-InfoList-r14']);
  for (const cc of perCcList) {
    if (isRecord(cc) && isSupported(cc['ul-256QAM-perCC-r14'])) {
      bp.ulQam = pickHigherQam(bp.ulQam, 'qam256');
    }
  }
}

function parseEutraBandParameters(
  rawBp: Asn1Record,
  suffix: 'r10' | 'r11' | 'r13'
): BandParameter[] {
  const band = extractNumber(
    rawBp[`bandEUTRA-${suffix}`] ??
      rawBp['bandEUTRA-r10'] ??
      rawBp['bandEUTRA-r11'] ??
      rawBp['bandEUTRA-r13'] ??
      rawBp['bandEUTRA']
  );
  if (band === undefined) return [];

  const dlItems = toArray(
    rawBp[`bandParametersDL-${suffix}`] ??
      rawBp['bandParametersDL-r10'] ??
      rawBp['bandParametersDL-r11'] ??
      rawBp['bandParametersDL-r13']
  ).filter(isRecord);

  const ulItems = toArray(
    rawBp[`bandParametersUL-${suffix}`] ??
      rawBp['bandParametersUL-r10'] ??
      rawBp['bandParametersUL-r11'] ??
      rawBp['bandParametersUL-r13']
  ).filter(isRecord);

  const count = Math.max(1, dlItems.length, ulItems.length);
  const out: BandParameter[] = [];

  for (let idx = 0; idx < count; idx++) {
    const dl = idx < dlItems.length ? dlItems[idx] : undefined;
    const ul = idx < ulItems.length ? ulItems[idx] : undefined;

    let bwClassDL: string | undefined;
    let dlMimo: number | undefined;
    let fourLayerTM3_TM4: boolean | undefined;
    if (dl) {
      const cls = dl[`ca-BandwidthClassDL-${suffix}`] ?? dl['ca-BandwidthClassDL-r10'] ?? dl['ca-BandwidthClassDL-r13'];
      if (typeof cls === 'string') bwClassDL = cls;

      const layers = parseMimoLayers(
        dl[`supportedMIMO-CapabilityDL-${suffix}`] ??
          dl['supportedMIMO-CapabilityDL-r10'] ??
          dl['supportedMIMO-CapabilityDL-r13']
      );
      if (layers !== undefined) {
        dlMimo = layers;
      }

      if (parseSupportedFlag(dl['fourLayerTM3-TM4-r13'] ?? dl['fourLayerTM3-TM4-r10'])) {
        fourLayerTM3_TM4 = true;
        if (dlMimo === undefined || dlMimo < 4) {
          dlMimo = 4;
        }
      }
    }

    let bwClassUL: string | undefined;
    let ulMimo: number | undefined;
    if (ul) {
      const cls = ul[`ca-BandwidthClassUL-${suffix}`] ?? ul['ca-BandwidthClassUL-r10'] ?? ul['ca-BandwidthClassUL-r13'];
      if (typeof cls === 'string') bwClassUL = cls;

      const layers = parseMimoLayers(
        ul[`supportedMIMO-CapabilityUL-${suffix}`] ??
          ul['supportedMIMO-CapabilityUL-r10'] ??
          ul['supportedMIMO-CapabilityUL-r13']
      );
      if (layers !== undefined) {
        ulMimo = layers;
      }
    }

    out.push({
      ratType: 'eutra',
      band,
      ...(bwClassDL ? { bandwidthClassDL: bwClassDL } : {}),
      ...(bwClassUL ? { bandwidthClassUL: bwClassUL } : {}),
      ...(dlMimo !== undefined ? { dlMimo } : {}),
      ...(ulMimo !== undefined ? { ulMimo } : {}),
      ...(fourLayerTM3_TM4 ? { fourLayerTM3_TM4: true } : {}),
    });
  }

  return out;
}

function buildEutraCombosFromGroup(
  rawList: unknown[],
  itemMode: 'array' | 'object',
  suffix: 'r10' | 'r11' | 'r13',
  extensions: {
    extR10?: unknown[];
    v1090?: unknown[];
    v10i0?: unknown[];
    v1390?: unknown[];
    v1430?: unknown[];
  }
): RawEutraComboGroup {
  const combos: BandCombination[] = [];

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    const rawParams =
      itemMode === 'array'
        ? toArray(item).filter(isRecord)
        : isRecord(item)
          ? toArray(item[`bandParameterList-${suffix}`]).filter(isRecord)
          : [];

    if (rawParams.length === 0) continue;

    const bandsByGroup: BandParameter[][] = [];
    for (const rawBp of rawParams) {
      const parsedBps = parseEutraBandParameters(rawBp, suffix);
      if (parsedBps.length > 0) bandsByGroup.push(parsedBps);
    }
    if (bandsByGroup.length === 0) continue;

    // Apply v1090 band number extensions (e.g. band 64 -> band 66/71)
    const v1090Item = extensions.v1090 && i < extensions.v1090.length ? extensions.v1090[i] : undefined;
    const v1090List = toArray(
      isRecord(v1090Item) ? v1090Item['bandParameterList-v1090'] ?? v1090Item : v1090Item
    );
    for (let bIdx = 0; bIdx < bandsByGroup.length && bIdx < v1090List.length; bIdx++) {
      const extBp = v1090List[bIdx];
      if (!isRecord(extBp)) continue;
      const extBand = extractNumber(extBp['bandEUTRA-v1090']);
      if (extBand !== undefined) {
        for (const bp of bandsByGroup[bIdx]) {
          if (bp.band === 64) bp.band = extBand;
        }
      }
    }

    // Apply v10i0 / v11d0 (fourLayerTM3-TM4-r10 & extended MIMO)
    const v10i0Item = extensions.v10i0 && i < extensions.v10i0.length ? extensions.v10i0[i] : undefined;
    const v10i0List = isRecord(v10i0Item) ? toArray(v10i0Item['bandParameterList-v10i0']) : [];
    for (let bIdx = 0; bIdx < bandsByGroup.length && bIdx < v10i0List.length; bIdx++) {
      const extBp = v10i0List[bIdx];
      if (!isRecord(extBp)) continue;
      const dlExtList = toArray(extBp['bandParametersDL-v10i0']).filter(isRecord);
      for (let ccIdx = 0; ccIdx < bandsByGroup[bIdx].length; ccIdx++) {
        const dlExt = dlExtList[ccIdx] ?? (dlExtList.length === 1 ? dlExtList[0] : undefined);
        if (!dlExt) continue;
        if (parseSupportedFlag(dlExt['fourLayerTM3-TM4-r10'])) {
          bandsByGroup[bIdx][ccIdx].fourLayerTM3_TM4 = true;
          const curDlMimo = bandsByGroup[bIdx][ccIdx].dlMimo;
          if (curDlMimo === undefined || curDlMimo < 4) {
            bandsByGroup[bIdx][ccIdx].dlMimo = 4;
          }
        }
      }
    }

    // Apply v1430 / Reduced-v1430 (UL 256QAM)
    const v1430Item = extensions.v1430 && i < extensions.v1430.length ? extensions.v1430[i] : undefined;
    const v1430List = isRecord(v1430Item) ? toArray(v1430Item['bandParameterList-v1430']) : [];
    for (let bIdx = 0; bIdx < bandsByGroup.length && bIdx < v1430List.length; bIdx++) {
      const extBp = v1430List[bIdx];
      if (isRecord(extBp)) {
        for (const bp of bandsByGroup[bIdx]) {
          applyUl256QamFromExt(bp, extBp);
        }
      }
    }

    const bands = bandsByGroup.flat();

    // Extract BCS & PowerClass per combo
    const extR10Item = extensions.extR10 && i < extensions.extR10.length ? extensions.extR10[i] : undefined;
    const rawBcs =
      (isRecord(item)
        ? item['supportedBandwidthCombinationSet-r13'] ??
          item['supportedBandwidthCombinationSet-r11'] ??
          item['supportedBandwidthCombinationSet-r10']
        : undefined) ??
      (isRecord(extR10Item) ? extR10Item['supportedBandwidthCombinationSet-r10'] : undefined);
    const bcs = parseBitStringToIndices(rawBcs);

    const v1390Item = extensions.v1390 && i < extensions.v1390.length ? extensions.v1390[i] : undefined;
    const powerClass = cleanPowerClass(
      (isRecord(item) ? item['ue-CA-PowerClass-N-r13'] : undefined) ??
        (isRecord(v1390Item) ? v1390Item['ue-CA-PowerClass-N-r13'] : undefined)
    );

    combos.push({
      bands,
      ...(bcs.length > 0 ? { supportedBandwidthCombinationSet: bcs } : {}),
      ...(powerClass ? { powerClass } : {}),
    });
  }

  return { combos };
}

/**
 * Extract EUTRA RAT information (bands, CA combinations, FeatureSets).
 */
export function extractEutraRat(eutraPdu: Asn1Record): {
  ratInfo: EutraRatInfo;
  fsData: UnifiedFeatureSetData;
} {
  const rfParams = isRecord(eutraPdu['rf-Parameters']) ? eutraPdu['rf-Parameters'] : {};
  const fsData = extractEutraFeatureSets(eutraPdu);

  // 1. Extract base bands
  const bands: EutraBandInfo[] = [];
  for (const rawBand of toArray(rfParams['supportedBandListEUTRA'])) {
    if (!isRecord(rawBand)) continue;
    const band = extractNumber(rawBand['bandEUTRA']);
    if (band === undefined) continue;

    const halfDuplex = typeof rawBand['halfDuplex'] === 'boolean' ? rawBand['halfDuplex'] : undefined;
    bands.push({
      band,
      displayName: getEutraBandName(band),
      ...(halfDuplex !== undefined ? { halfDuplex } : {}),
    });
  }

  // 2. Apply index-aligned band extensions (v9e0, v1250, v1320, phyLayerParameters-v1020)
  const v9e0Bands = toArray(findInExtensions(eutraPdu, 'supportedBandListEUTRA-v9e0'));
  const v1250Bands = toArray(findInExtensions(eutraPdu, 'supportedBandListEUTRA-v1250'));
  const v1320Bands = toArray(findInExtensions(eutraPdu, 'supportedBandListEUTRA-v1320'));
  const phyV1020 = findInExtensions(eutraPdu, 'phyLayerParameters-v1020');
  const nonContigList = isRecord(phyV1020)
    ? toArray(phyV1020['nonContiguousUL-RA-WithinCC-List-r10'])
    : [];

  for (let i = 0; i < bands.length; i++) {
    const bandInfo = bands[i];

    const v9e0 = i < v9e0Bands.length ? v9e0Bands[i] : undefined;
    if (isRecord(v9e0)) {
      const extBand = extractNumber(v9e0['bandEUTRA-v9e0']);
      if (extBand !== undefined && bandInfo.band === 64) {
        bandInfo.band = extBand;
        bandInfo.displayName = getEutraBandName(extBand);
      }
    }

    const v1250 = i < v1250Bands.length ? v1250Bands[i] : undefined;
    if (isRecord(v1250)) {
      if (isSupported(v1250['dl-256QAM-r12'])) {
        bandInfo.dlQam = pickHigherQam(bandInfo.dlQam, 'qam256');
      }
      if (isSupported(v1250['ul-64QAM-r12'])) {
        bandInfo.ulQam = pickHigherQam(bandInfo.ulQam, 'qam64');
      }
    }

    const v1320 = i < v1320Bands.length ? v1320Bands[i] : undefined;
    if (isRecord(v1320)) {
      const pc = cleanPowerClass(v1320['ue-PowerClass-N-r13']);
      if (pc) bandInfo.powerClass = pc;
    }

    const nonContig = i < nonContigList.length ? nonContigList[i] : undefined;
    if (isRecord(nonContig) && parseSupportedFlag(nonContig['nonContiguousUL-RA-WithinCC-Info-r10'])) {
      bandInfo.nonContiguousULRA = true;
    }
  }

  // 3. Extract combinations with strict extension alignment:
  //    r10 extensions applied BEFORE appending Add-r11 (+ v11d0 / Add-v1430)
  const r10Raw = toArray(findInExtensions(eutraPdu, 'supportedBandCombination-r10'));
  const r10Group = buildEutraCombosFromGroup(r10Raw, 'array', 'r10', {
    extR10: toArray(findInExtensions(eutraPdu, 'supportedBandCombinationExt-r10')),
    v1090: toArray(findInExtensions(eutraPdu, 'supportedBandCombination-v1090')),
    v10i0: toArray(findInExtensions(eutraPdu, 'supportedBandCombination-v10i0')),
    v1390: toArray(findInExtensions(eutraPdu, 'supportedBandCombination-v1390')),
    v1430: toArray(findInExtensions(eutraPdu, 'supportedBandCombination-v1430')),
  });

  const addR11Raw = toArray(findInExtensions(eutraPdu, 'supportedBandCombinationAdd-r11'));
  const addGroup = buildEutraCombosFromGroup(addR11Raw, 'object', 'r11', {
    v10i0: toArray(findInExtensions(eutraPdu, 'supportedBandCombinationAdd-v11d0')),
    v1430: toArray(findInExtensions(eutraPdu, 'supportedBandCombinationAdd-v1430')),
  });

  const reducedR13Raw = toArray(findInExtensions(eutraPdu, 'supportedBandCombinationReduced-r13'));
  const reducedGroup = buildEutraCombosFromGroup(reducedR13Raw, 'object', 'r13', {
    v1430: toArray(findInExtensions(eutraPdu, 'supportedBandCombinationReduced-v1430')),
  });

  const allCombos = [...r10Group.combos, ...addGroup.combos, ...reducedGroup.combos];

  // 4. Bidirectional band <-> combo capability propagation (MIMO / QAM)
  const bandLookup = new Map<number, EutraBandInfo>(bands.map((b) => [b.band, b]));
  // Track per-band UL QAM from v1250 separately so per-combination ul-256QAM-r14 is not promoted across all CA combos
  const perBandUlQam = new Map<number, string>();
  for (const b of bands) {
    if (b.ulQam) perBandUlQam.set(b.band, b.ulQam);
  }

  // Single-band combos -> band info (max MIMO, UL 256QAM)
  for (const combo of allCombos) {
    if (combo.bands.length !== 1) continue;
    const bp = combo.bands[0];
    const bandInfo = bandLookup.get(bp.band);
    if (!bandInfo) continue;

    if (bp.dlMimo !== undefined && (bandInfo.dlMimo === undefined || bp.dlMimo > bandInfo.dlMimo)) {
      bandInfo.dlMimo = bp.dlMimo;
    }
    if (bp.ulMimo !== undefined && (bandInfo.ulMimo === undefined || bp.ulMimo > bandInfo.ulMimo)) {
      bandInfo.ulMimo = bp.ulMimo;
    }
    if (bp.ulQam) {
      bandInfo.ulQam = pickHigherQam(bandInfo.ulQam, bp.ulQam);
    }
  }

  // Band info QAM/MIMO fallback -> combo band parameters, compute CC counts & deduplicate by key
  const dedupedCombos: BandCombination[] = [];
  const seenKeys = new Set<string>();

  for (const combo of allCombos) {
    let dlCc = 0;
    let ulCc = 0;

    for (const bp of combo.bands) {
      const bandInfo = bandLookup.get(bp.band);
      if (bandInfo) {
        if (bandInfo.dlQam) {
          bp.dlQam = pickHigherQam(bp.dlQam, bandInfo.dlQam);
        }
        const fallbackUlQam = perBandUlQam.get(bp.band);
        if (bp.bandwidthClassUL && fallbackUlQam) {
          bp.ulQam = pickHigherQam(bp.ulQam, fallbackUlQam);
        }
        if (bp.dlMimo === undefined && bandInfo.dlMimo !== undefined) {
          bp.dlMimo = bandInfo.dlMimo;
        }
      }
      if (bp.bandwidthClassDL) dlCc += getBwClassCcCount(bp.bandwidthClassDL);
      if (bp.bandwidthClassUL) ulCc += getBwClassCcCount(bp.bandwidthClassUL);
    }

    combo.dlCc = dlCc;
    combo.ulCc = ulCc;
    combo.key = generateCombinationKey(combo);

    if (!seenKeys.has(combo.key)) {
      seenKeys.add(combo.key);
      dedupedCombos.push(combo);
    }
  }

  return {
    ratInfo: {
      bands,
      bandCombinations: dedupedCombos,
      ...(fsData.eutraFeatureSets && fsData.eutraFeatureSets.length > 0
        ? { featureSets: fsData.eutraFeatureSets }
        : {}),
    },
    fsData,
  };
}
