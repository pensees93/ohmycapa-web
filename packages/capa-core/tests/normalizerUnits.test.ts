import { describe, expect, it } from 'vitest';
import { extractEutraRat } from '../src/normalizer/eutraNormalizer';
import {
  extractEutraFeatureSets,
  extractNRFeatureSets,
} from '../src/normalizer/featureSets';
import {
  cleanPowerClass,
  extractBitStringContent,
  extractMhzValue,
  findInExtensions,
  parseMimoLayers,
  utraBandToNumber,
} from '../src/normalizer/helpers';
import { extractUtraRat } from '../src/normalizer/utraNormalizer';
import type { Asn1Record } from '../src/types/astTypes';

describe('Stage 2 Normalizer Unit Tests', () => {
  describe('helpers', () => {
    it('normalizes power classes, MIMO layers, UTRA band names, and MHz values including Rel-17 keys', () => {
      expect(cleanPowerClass('pc2')).toBe('pc2');
      expect(cleanPowerClass('class3')).toBe('pc3');
      expect(cleanPowerClass('pclass1dot5')).toBe('pc1dot5');
      expect(cleanPowerClass(2)).toBe('pc2');
      expect(cleanPowerClass('')).toBeUndefined();

      expect(parseMimoLayers('twoLayers')).toBe(2);
      expect(parseMimoLayers('fourLayers')).toBe(4);
      expect(parseMimoLayers('eightLayers')).toBe(8);
      expect(parseMimoLayers('n4')).toBe(4);

      expect(utraBandToNumber('bandI')).toBe(1);
      expect(utraBandToNumber('fdd2100')).toBe(1);
      expect(utraBandToNumber('bandVIII')).toBe(8);
      expect(utraBandToNumber('band26')).toBe(26);

      expect(extractMhzValue({ fr1: 'mhz100' })).toBe('100MHz');
      expect(extractMhzValue({ fr2: 'mhz200' })).toBe('200MHz');
      expect(extractMhzValue({ 'fr1-r17': 'mhz250' })).toBe('250MHz');
      expect(extractMhzValue({ 'fr2-r17': 'mhz400' })).toBe('400MHz');

      expect(extractBitStringContent("'1010 0011'B")).toBe('10100011');
      expect(extractBitStringContent("'A5'H")).toBe('10100101');
    });

    it('walks deep nonCriticalExtension and lateNonCriticalExtension BFS chains', () => {
      let leafNode: Asn1Record = { 'featureSetsEUTRA-r15': { 'featureSetsDL-r15': [] } };
      for (let i = 0; i < 25; i++) {
        leafNode = i === 12 ? { lateNonCriticalExtension: leafNode } : { nonCriticalExtension: leafNode };
      }
      expect(findInExtensions(leafNode, 'featureSetsEUTRA-r15')).toEqual({ 'featureSetsDL-r15': [] });
    });
  });

  describe('featureSets indexing (NR 1-based vs EUTRA 0-based PerCC)', () => {
    it('resolves NR 1-based PerCC IDs, extraBws, and Rel-17 minBandwidth', () => {
      const nrPdu: Asn1Record = {
        featureSets: {
          featureSetsDownlinkPerCC: [
            { supportedBandwidthDL: { fr1: 'mhz40' }, supportedModulationOrderDL: 'qam64', 'maxNumberMIMO-LayersPDSCH': 'twoLayers' },
            { supportedBandwidthDL: { fr1: 'mhz100' }, 'channelBW-90mhz': 'supported', supportedModulationOrderDL: 'qam256', 'maxNumberMIMO-LayersPDSCH': 'fourLayers' },
          ],
          'featureSetsDownlinkPerCC-v1700': [
            { 'supportedMinBandwidthDL-r17': { 'fr1-r17': 'mhz10' } },
            { 'supportedMinBandwidthDL-r17': { 'fr1-r17': 'mhz5' } },
          ],
          featureSetsDownlink: [
            { featureSetListPerDownlinkCC: [2, 999] }, // 2 -> PerCC index 1; 999 -> safely ignored
          ],
          featureSetsUplinkPerCC: [
            { supportedBandwidthUL: { fr1: 'mhz100' }, 'channelBW-80mhz': 'supported', supportedModulationOrderUL: 'qam256', 'mimo-CB-PUSCH': { 'maxNumberMIMO-LayersCB-PUSCH': 'twoLayers' } },
          ],
          featureSetsUplink: [{ featureSetListPerUplinkCC: [1] }],
        },
      };

      const fsData = extractNRFeatureSets(nrPdu);
      expect(fsData.nrFeatureSets).toHaveLength(1);
      expect(fsData.nrFeatureSets![0]).toEqual({
        index: 1,
        dl: {
          qam: 'qam256',
          mimo: 4,
          bandwidth: '100MHz',
          minBandwidth: '5MHz',
          extraBws: ['90MHz'],
          ccCount: 2,
        },
        ul: {
          qam: 'qam256',
          mimo: 2,
          bandwidth: '100MHz',
          extraBws: ['80MHz'],
          ccCount: 1,
        },
      });
    });

    it('resolves EUTRA 0-based PerCC IDs and fourLayerTM3-TM4-r15 4x4 MIMO promotion', () => {
      const eutraPdu: Asn1Record = {
        nonCriticalExtension: {
          'featureSetsEUTRA-r15': {
            'featureSetsDL-PerCC-r15': [
              { 'supportedMIMO-CapabilityDL-MRDC-r15': 'twoLayers', 'fourLayerTM3-TM4-r15': 'supported' },
              { 'supportedMIMO-CapabilityDL-MRDC-r15': 'fourLayers', 'dl-256QAM-r15': 'supported' },
            ],
            'featureSetsDL-r15': [
              { 'featureSetPerCC-ListDL-r15': [0] }, // 0-based -> entry 0 (twoLayers + fourLayerTM3-TM4 => 4)
              { 'featureSetPerCC-ListDL-r15': [1] }, // 0-based -> entry 1
            ],
          },
        },
      };

      const fsData = extractEutraFeatureSets(eutraPdu);
      expect(fsData.eutraFeatureSets).toEqual([
        { index: 1, dl: { mimo: 4 } },
        { index: 2, dl: { qam: 'qam256', mimo: 4 } },
      ]);
    });
  });

  describe('eutraNormalizer alignment & Rel-9..14 extensions', () => {
    it('applies v9e0/v1090 band 64 overrides, r10 extensions BEFORE Add-r11, v1250/v1320/v1020, and BCS', () => {
      const syntheticEutra: Asn1Record = {
        'rf-Parameters': {
          supportedBandListEUTRA: [
            { bandEUTRA: 3, halfDuplex: false },
            { bandEUTRA: 64, halfDuplex: false }, // Overridden to 66 via v9e0
          ],
        },
        nonCriticalExtension: {
          'rf-Parameters-v9e0': {
            'supportedBandListEUTRA-v9e0': [{}, { 'bandEUTRA-v9e0': 66 }],
          },
          'phyLayerParameters-v1020': {
            'nonContiguousUL-RA-WithinCC-List-r10': [
              { 'nonContiguousUL-RA-WithinCC-Info-r10': 'supported' },
              {},
            ],
          },
          'rf-Parameters-v1020': {
            'supportedBandCombination-r10': [
              [
                {
                  'bandEUTRA-r10': 64, // Overridden to 66 via v1090
                  'bandParametersDL-r10': [{ 'ca-BandwidthClassDL-r10': 'a', 'supportedMIMO-CapabilityDL-r10': 'twoLayers' }],
                  'bandParametersUL-r10': [{ 'ca-BandwidthClassUL-r10': 'a' }],
                },
              ],
            ],
          },
          'rf-Parameters-v1060': {
            'supportedBandCombinationExt-r10': [
              { 'supportedBandwidthCombinationSet-r10': "'101'B" },
            ],
          },
          'rf-Parameters-v1090': {
            'supportedBandCombination-v1090': [[{ 'bandEUTRA-v1090': 66 }]],
          },
          'rf-Parameters-v10i0': {
            'supportedBandCombination-v10i0': [
              { 'bandParameterList-v10i0': [{ 'bandParametersDL-v10i0': [{ 'fourLayerTM3-TM4-r10': 'supported' }] }] },
            ],
          },
          'rf-Parameters-v1180': {
            'supportedBandCombinationAdd-r11': [
              {
                'bandParameterList-r11': [
                  {
                    'bandEUTRA-r11': 3,
                    'bandParametersDL-r11': [{ 'ca-BandwidthClassDL-r10': 'a', 'supportedMIMO-CapabilityDL-r10': 'twoLayers' }],
                  },
                ],
                'supportedBandwidthCombinationSet-r11': "'11'B",
              },
            ],
          },
          'rf-Parameters-v1250': {
            'supportedBandListEUTRA-v1250': [
              { 'dl-256QAM-r12': 'supported', 'ul-64QAM-r12': 'supported' },
              { 'dl-256QAM-r12': 'supported' },
            ],
          },
          'rf-Parameters-v1320': {
            'supportedBandListEUTRA-v1320': [
              {},
              { 'ue-PowerClass-N-r13': 'class2' },
            ],
          },
          'rf-Parameters-v1430': {
            'supportedBandCombination-v1430': [
              { 'bandParameterList-v1430': [{ 'ul-256QAM-r14': 'supported' }] },
            ],
          },
        },
      };

      const { ratInfo } = extractEutraRat(syntheticEutra);

      expect(ratInfo.bands).toEqual([
        { band: 3, displayName: 'B3', halfDuplex: false, dlQam: 'qam256', ulQam: 'qam64', nonContiguousULRA: true, dlMimo: 2 },
        { band: 66, displayName: 'B66', halfDuplex: false, powerClass: 'pc2', dlQam: 'qam256', ulQam: 'qam256', dlMimo: 4 },
      ]);

      const b66Combo = ratInfo.bandCombinations.find((c) => c.bands.some((b) => b.band === 66));
      expect(b66Combo?.bands[0].fourLayerTM3_TM4).toBe(true);
      expect(b66Combo?.bands[0].dlMimo).toBe(4);
      expect(b66Combo?.bands[0].ulQam).toBe('qam256');
      expect(b66Combo?.supportedBandwidthCombinationSet).toEqual([0, 2]);

      const b3Combo = ratInfo.bandCombinations.find((c) => c.bands.some((b) => b.band === 3));
      // Add-r11 must NOT wrongly receive r10's v10i0 fourLayerTM3_TM4 or v1430 ul-256QAM!
      expect(b3Combo?.bands[0].dlMimo).toBe(2);
      expect(b3Combo?.bands[0].fourLayerTM3_TM4).toBeUndefined();
      expect(b3Combo?.supportedBandwidthCombinationSet).toEqual([0, 1]);
    });
  });

  describe('utraNormalizer primary + EUTRA fallback', () => {
    it('merges v370ext + v690ext1 powerClasses with EUTRA interRAT fallback without losing powerClass', () => {
      const utraPdu: Asn1Record = {
        'ue-CapabilityContainer': {
          present: {
            'ue-RadioAccessCapability-v370ext': {
              'ue-RadioAccessCapabBandFDDList': [
                { radioFrequencyBandFDD: 'fdd2100', 'fddRF-Capability': { 'ue-PowerClass': 'class3' } },
              ],
            },
          },
        },
        v390NonCriticalExtensions: {
          present: {
            v3a0NonCriticalExtensions: {
              laterNonCriticalExtensions: {
                'interRATHandoverInfo-r3-add-ext': {
                  'interRATHandoverInfo-v690ext1': {
                    'ue-RadioAccessCapability-v650ext': {
                      'ue-RadioAccessCapabBandFDDList2': [
                        { radioFrequencyBandFDD2: 'bandVIII', 'fddRF-Capability': { 'ue-PowerClass': 'class3' } },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      };
      const eutraPdu: Asn1Record = {
        'interRAT-Parameters': {
          utraFDD: {
            'supportedBandListUTRA-FDD': ['bandI', 'bandV', 'bandVIII'],
          },
        },
      };

      const utra = extractUtraRat(utraPdu, eutraPdu);
      expect(utra?.bands).toEqual([
        { band: 1, displayName: 'bandI', powerClass: 'pc3' },
        { band: 5, displayName: 'bandV' },
        { band: 8, displayName: 'bandVIII', powerClass: 'pc3' },
      ]);
    });
  });
});
