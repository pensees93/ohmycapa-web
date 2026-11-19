/**
 * Stage 2 UTRA (3G) Domain Normalizer.
 *
 * Primary source: `utraPdu['ue-CapabilityContainer']?.['present']`
 *   - `ue-RadioAccessCapability-v370ext['ue-RadioAccessCapabBandFDDList']`
 *   - `ue-RadioAccessCapability` v4b0..v690 extension chain (`ue-RadioAccessCapabBandFDDList2`)
 * Secondary fallback/augmentation:
 *   - `eutraPdu['interRAT-Parameters']?.['utraFDD']?.['supportedBandListUTRA-FDD']`
 */

import type { Asn1Record } from '../types/astTypes';
import type { UtraBandInfo, UtraRatInfo } from '../types/capaTypes';
import { getUtraBandName } from '../types/capaTypes';
import { cleanPowerClass, isRecord, toArray, utraBandToNumber } from './helpers';

function addUtraBandEntry(
  bandMap: Map<number, UtraBandInfo>,
  rawBandName: unknown,
  rawPowerClass?: unknown
): void {
  const bandNum = utraBandToNumber(rawBandName);
  if (bandNum === undefined) return;

  const displayName = getUtraBandName(
    typeof rawBandName === 'string' && rawBandName in { fdd2100: 1, fdd1900: 1, fdd1800: 1 }
      ? rawBandName
      : `band${toRoman(bandNum)}`
  );
  const powerClass = cleanPowerClass(rawPowerClass);

  const existing = bandMap.get(bandNum);
  if (existing) {
    if (!existing.powerClass && powerClass) {
      existing.powerClass = powerClass;
    }
    return;
  }

  bandMap.set(bandNum, {
    band: bandNum,
    displayName,
    ...(powerClass ? { powerClass } : {}),
  });
}

const NUM_TO_ROMAN: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
  10: 'X',
  11: 'XI',
  12: 'XII',
  13: 'XIII',
  14: 'XIV',
  19: 'XIX',
  20: 'XX',
  21: 'XXI',
  22: 'XXII',
  25: 'XXV',
  26: 'XXVI',
};

function toRoman(num: number): string {
  return NUM_TO_ROMAN[num] ?? String(num);
}

function collectUtraFddBandList(list: unknown, bandMap: Map<number, UtraBandInfo>): void {
  for (const item of toArray(list)) {
    if (!isRecord(item)) continue;
    const bandKey = item['radioFrequencyBandFDD'] ?? item['radioFrequencyBandFDD2'];
    const fddCap = item['fddRF-Capability'];
    const rawPc = isRecord(fddCap) ? fddCap['ue-PowerClass'] : undefined;
    addUtraBandEntry(bandMap, bandKey, rawPc);
  }
}

/**
 * Extract UTRA (3G FDD) bands and power classes from UTRA PDU and EUTRA inter-RAT parameters.
 */
export function extractUtraRat(utraPdu?: Asn1Record, eutraPdu?: Asn1Record): UtraRatInfo | undefined {
  const bandMap = new Map<number, UtraBandInfo>();

  // 1. Primary: UTRA InterRATHandoverInfo -> ue-CapabilityContainer -> present
  if (utraPdu) {
    const capContainer = utraPdu['ue-CapabilityContainer'];
    const present = isRecord(capContainer) && isRecord(capContainer['present'])
      ? capContainer['present']
      : capContainer;

    if (isRecord(present)) {
      const v370 = present['ue-RadioAccessCapability-v370ext'];
      if (isRecord(v370)) {
        collectUtraFddBandList(v370['ue-RadioAccessCapabBandFDDList'], bandMap);
      }

      // Walk v4b0..v690 extensions inside ue-RadioAccessCapability for extended FDD bands
      const radioCap = present['ue-RadioAccessCapability'];
      if (isRecord(radioCap)) {
        const v4b0 = radioCap['v4b0NonCriticalExtensions'];
        const v590 = isRecord(v4b0) ? v4b0['v590NonCriticalExtensions'] : undefined;
        const v5c0 = isRecord(v590) ? v590['v5c0NonCriticalExtensions'] : undefined;
        const v690Ext = isRecord(v5c0) ? v5c0['v690NonCriticalExtensions'] : undefined;
        const v690 = isRecord(v690Ext) ? v690Ext['ue-RadioAccessCapability-v690ext'] : undefined;
        if (isRecord(v690)) {
          collectUtraFddBandList(v690['ue-RadioAccessCapabBandFDDList2'], bandMap);
        }
      }
    }

    // Rel-6+ InterRATHandoverInfo v390 -> v3a0 -> r3-add-ext -> v690ext1 (bandVIII..XXII)
    const v390 = utraPdu['v390NonCriticalExtensions'];
    const v390Present = isRecord(v390) && isRecord(v390['present']) ? v390['present'] : v390;
    const v3a0 = isRecord(v390Present) ? v390Present['v3a0NonCriticalExtensions'] : undefined;
    const laterExt = isRecord(v3a0) ? v3a0['laterNonCriticalExtensions'] : undefined;
    const addExt = isRecord(laterExt) ? laterExt['interRATHandoverInfo-r3-add-ext'] : undefined;
    const v690Ext1 = isRecord(addExt) ? addExt['interRATHandoverInfo-v690ext1'] : undefined;
    const v650Ext = isRecord(v690Ext1) ? v690Ext1['ue-RadioAccessCapability-v650ext'] : undefined;
    if (isRecord(v650Ext)) {
      collectUtraFddBandList(v650Ext['ue-RadioAccessCapabBandFDDList2'], bandMap);
    }
  }

  // 2. Secondary: EUTRA interRAT-Parameters.utraFDD.supportedBandListUTRA-FDD
  if (eutraPdu) {
    const interRat = eutraPdu['interRAT-Parameters'];
    const utraFdd = isRecord(interRat) ? interRat['utraFDD'] : undefined;
    if (isRecord(utraFdd)) {
      for (const bandName of toArray(utraFdd['supportedBandListUTRA-FDD'])) {
        addUtraBandEntry(bandMap, bandName);
      }
    }
  }

  if (bandMap.size === 0) return undefined;

  const bands = [...bandMap.values()].sort((a, b) => a.band - b.band);
  return {
    bands,
    bandCombinations: [],
  };
}
