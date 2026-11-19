import { describe, expect, it } from 'vitest';
import {
  detectInputFormat,
  hexDescToBitString,
  mergeCanonicalAsts,
  normalizeBitString,
  parseCapaText,
  validateCapaFileHeader,
  validateFileExtension,
} from '../src';
import { deepMergeFallback, mergePduCandidates, scorePduRichness } from '../src/syntax/pduMerger';
import type { Asn1Record, CanonicalAsn1Tree } from '../src/types/astTypes';

describe('Stage 1 Syntax Unit Tests', () => {
  describe('bitString utilities', () => {
    it('strips whitespace in normalizeBitString without stripping ASN.1 delimiters', () => {
      expect(normalizeBitString("'0101 0111 11'B")).toBe("'0101011111'B");
      expect(normalizeBitString("  '11 00'H  ")).toBe("'1100'H");
    });

    it('converts Wireshark/ELT hex + bit-length descriptions using BigInt without 32-bit overflow', () => {
      // 10-bit FR1 BW: 0x77c0 = 0111 0111 1100 0000 -> >> 6 = 0111011111 (10 bits)
      expect(
        hexDescToBitString('77c0', 'bit length 10, 6 LSB pad bits, 0111 0111  11.. .... decimal value 479')
      ).toBe("'0111011111'B");

      // 64-bit measGapPatterns-r15 (> 32 bits, tests BigInt high bits)
      expect(
        hexDescToBitString('8000000000000001', 'bit length 64')
      ).toBe(`'1${'0'.repeat(62)}1'B`);

      // Invalid/out-of-range inputs return null gracefully
      expect(hexDescToBitString('zzzz', 'bit length 8')).toBeNull();
      expect(hexDescToBitString('00', 'no bit info')).toBeNull();
      expect(hexDescToBitString('ff', 'bit length 0')).toBeNull();

      // Bit-pattern fallback from description when hex is non-hex
      expect(
        hexDescToBitString('--', 'bit length 4, 1010 .... decimal value 10')
      ).toBe("'1010'B");
    });
  });

  describe('detectInputFormat & capaValidate', () => {
    it('detects all 6 InputFormats accurately', () => {
      const commonJson = JSON.stringify({
        schemaVersion: '2.0',
        meta: { vendor: 'SLSI', deviceName: 'D', fileName: 'd.json', detectedRats: [] },
        rats: {},
        diagnostics: { warnings: [], errors: [] },
      });
      expect(detectInputFormat(commonJson)).toEqual({ vendor: 'SLSI', format: 'COMMON_JSON' });

      expect(
        detectInputFormat('---------------- EUTRA 23 Items----------------\nBand 1, Band 3')
      ).toEqual({ vendor: 'UNKNOWN', format: 'SUMMARY_TEXT' });

      expect(
        detectInputFormat('NR5G RRC OTA Packet\nInterpreted PDU:\nvalue UL-DCCH-Message ::= {}')
      ).toEqual({ vendor: 'QUALCOMM', format: 'OTA_QUALCOMM' });

      expect(
        detectInputFormat('[MS->NW] NR5G_RRC_UL_DCCH_Message\n\tUL-DCCH-Message\n')
      ).toEqual({ vendor: 'MTK', format: 'OTA_MTK' });

      expect(
        detectInputFormat('UL-DCCH-Message\n  message c1: ueCapabilityInformation')
      ).toEqual({ vendor: 'SLSI', format: 'OTA_SLSI' });

      expect(detectInputFormat('')).toEqual({ vendor: 'UNKNOWN', format: 'UNKNOWN' });
      expect(detectInputFormat('arbitrary random text')).toEqual({ vendor: 'UNKNOWN', format: 'UNKNOWN' });
    });

    it('validates file extensions and headers with clear errors', () => {
      expect(validateFileExtension('log.txt').valid).toBe(true);
      expect(validateFileExtension('trace.LOG').valid).toBe(true);
      expect(validateFileExtension('common.json').valid).toBe(true);
      expect(validateFileExtension('bad.xlsx').valid).toBe(false);

      expect(validateCapaFileHeader('').valid).toBe(false);
      expect(validateCapaFileHeader('---- NR 5 Items----\nn78').valid).toBe(false);
      expect(validateCapaFileHeader('unstructured garbage').valid).toBe(false);
      expect(validateCapaFileHeader('UL-DCCH-Message\n  message c1').valid).toBe(true);
    });
  });

  describe('pduMerger', () => {
    it('prefers combination-rich PDUs and fills missing subfields via deepMergeFallback', () => {
      const thinPdu: Asn1Record = {
        accessStratumRelease: 'rel16',
        'rf-Parameters': { supportedBandListNR: [{ bandNR: 78 }] },
        'mac-Parameters': { lcp: 'supported' },
      };
      const richPdu: Asn1Record = {
        'rf-Parameters': {
          supportedBandListNR: [{ bandNR: 78 }, { bandNR: 41 }],
          supportedBandCombinationList: [{ bandList: [{ nr: { bandNR: 78 } }] }],
        },
        'mac-Parameters': {},
      };

      expect(scorePduRichness(richPdu)).toBeGreaterThan(scorePduRichness(thinPdu));

      const merged = mergePduCandidates([thinPdu, richPdu]);
      expect(merged?.['accessStratumRelease']).toBe('rel16');
      expect(merged?.['mac-Parameters']).toEqual({ lcp: 'supported' });
      expect((merged?.['rf-Parameters'] as Asn1Record)['supportedBandListNR']).toHaveLength(2);

      // Primary array non-empty is not overwritten by secondary
      const direct = deepMergeFallback({ list: [1] }, { list: [2, 3], extra: 'ok' });
      expect(direct).toEqual({ list: [1], extra: 'ok' });
    });

    it('merges multiple CanonicalAsn1Trees keeping non-UNKNOWN vendor and all sourceFiles', () => {
      const a: CanonicalAsn1Tree = {
        vendor: 'UNKNOWN',
        fileName: 'a.txt',
        sourceFiles: ['a.txt'],
        pdus: { eutra: { 'rf-Parameters': { supportedBandListEUTRA: [{ bandEUTRA: 1 }] } } },
        warnings: ['w1'],
      };
      const b: CanonicalAsn1Tree = {
        vendor: 'MTK',
        fileName: 'b.txt',
        sourceFiles: ['b.txt'],
        pdus: { nr: { 'rf-Parameters': { supportedBandListNR: [{ bandNR: 78 }] } } },
        warnings: ['w2'],
      };

      const merged = mergeCanonicalAsts([a, b]);
      expect(merged.vendor).toBe('MTK');
      expect(merged.sourceFiles).toEqual(['a.txt', 'b.txt']);
      expect(merged.warnings).toEqual(['w1', 'w2']);
      expect(merged.pdus.eutra).toBeDefined();
      expect(merged.pdus.nr).toBeDefined();
    });
  });

  describe('qualcommAsn1Parser & indentationParser edge cases', () => {
    it('parses Qualcomm ASN.1 inline CHOICE, named bit sets, hex/bin strings, comments, and single-item arrays', () => {
      const qxdmSample = `
NR5G RRC OTA Packet
Interpreted PDU:
value UL-DCCH-Message ::= {
  message c1 : ueCapabilityInformation : {
    criticalExtensions ueCapabilityInformation : {
      ue-CapabilityRAT-ContainerList {
        {
          rat-Type nr,
          ue-CapabilityRAT-Container '00'H -- container hex comment
        }
      }
    }
  }
}
NR5G RRC OTA Packet
value UE-NR-Capability ::= {
  accessStratumRelease rel16,
  rf-Parameters {
    supportedBandListNR {
      {
        bandNR 78,
        multipleTCI supported
      }
    },
    supportedBandCombinationList {
      {
        bandList {
          nr : {
            bandNR 78,
            ca-BandwidthClassDL-NR a
          }
        },
        featureSetCombination 0,
        supportedBandwidthCombinationSet '101'B
      }
    }
  }
}
value UE-RadioAccessCapabilityInfo ::= {
  ue-RadioAccessCapability {
    ue-specificCapabilityInformation {
      cipheringAlgorithmCap { uea1, uea0 },
      integrityProtectionAlgorithmCap { uia1 }
    },
    physicalChannelCapability {
      fddPhysChCapability {
        downlinkPhysChCapability {
          turboDecodingSupport supported : b6400
        }
      }
    }
  }
}
`;
      const ast = parseCapaText(qxdmSample, 'synthetic_q.txt');
      expect(ast.vendor).toBe('QUALCOMM');
      expect(ast.pdus.nr?.['accessStratumRelease']).toBe('rel16');
      const combos = (ast.pdus.nr?.['rf-Parameters'] as Asn1Record)?.['supportedBandCombinationList'] as Asn1Record[];
      expect(Array.isArray(combos)).toBe(true);
      expect(Array.isArray(combos[0]['bandList'])).toBe(true);
      expect(combos[0]['supportedBandwidthCombinationSet']).toBe("'101'B");

      const radioCap = (ast.pdus.utra?.['ue-CapabilityContainer'] as Asn1Record)?.['present'] as Asn1Record;
      const utraInner = radioCap['ue-RadioAccessCapability'] as Asn1Record;
      const turbo = (((utraInner['physicalChannelCapability'] as Asn1Record)['fddPhysChCapability'] as Asn1Record)[
        'downlinkPhysChCapability'
      ] as Asn1Record)['turboDecodingSupport'];
      expect(turbo).toEqual({ supported: 'b6400' });
    });

    it('parses MTK flat lists, Wireshark bit dissections, 0 items, empty containers, and UTRA wrapper collapse', () => {
      const mtkFlatSample = `
[MS->NW] NR5G_RRC_UL_DCCH_Message
Message Content
  UL-DCCH-Message
    message: c1 (0)
      ueCapabilityInformation (0)
        criticalExtensions: ueCapabilityInformation (0)
          ue-CapabilityRAT-ContainerList: 2 items
            Item 0
              UE-CapabilityRAT-Container
                rat-Type: nr (1)
                ue-CapabilityRAT-Container: ...
                  UE-NR-Capability
                    accessStratumRelease: rel17 (3)
                    rf-Parameters
                      supportedBandCombinationList: 0 items
                      supportedBandListNR: 1 item
                        Item 0
                          BandNR
                            bandNR: 78
                            channelBWs-DL: fr1 (0)
                              fr1
                                0111 1111 11.. .... scs-30kHz: 7fc0 [bit length 10, 6 LSB pad bits, 0111 1111  11.. .... decimal value 511]
                            bwp-DiffNumerology
                    featureSets
                      featureSetsDownlink: 1 item
                        Item 0
                          FeatureSetDownlink
                            featureSetListPerDownlinkCC: 2 items
                            Item 0
                            FeatureSetDownlinkPerCC-Id: 1
                            Item 1
                            FeatureSetDownlinkPerCC-Id: 2
            Item 1
              UE-CapabilityRAT-Container
                rat-Type: utra (2)
                ue-CapabilityRAT-Container: ...
                  InterRATHandoverInfo
                    ue-CapabilityContainer: present (1)
                      present: aabbcc
                      UE-RadioAccessCapabilityInfo
                        ue-RadioAccessCapability
                          dummy: false
`;
      const ast = parseCapaText(mtkFlatSample, 'synthetic_mtk.txt');
      expect(ast.vendor).toBe('MTK');
      expect(ast.pdus.nr?.['accessStratumRelease']).toBe('rel17');

      const rf = ast.pdus.nr?.['rf-Parameters'] as Asn1Record;
      expect(rf['supportedBandCombinationList']).toEqual([]);
      const bands = rf['supportedBandListNR'] as Asn1Record[];
      expect(bands).toHaveLength(1);
      expect(bands[0]['bandNR']).toBe(78);
      expect(bands[0]['bwp-DiffNumerology']).toEqual({});
      expect(((bands[0]['channelBWs-DL'] as Asn1Record)['fr1'] as Asn1Record)['scs-30kHz']).toBe("'0111111111'B");

      const fsDl = (ast.pdus.nr?.['featureSets'] as Asn1Record)?.['featureSetsDownlink'] as Asn1Record[];
      expect(fsDl[0]['featureSetListPerDownlinkCC']).toEqual([1, 2]);

      const utraContainer = ast.pdus.utra?.['ue-CapabilityContainer'] as Asn1Record;
      expect(Object.keys(utraContainer)).toEqual(['present']);
      expect((utraContainer['present'] as Asn1Record)['ue-RadioAccessCapability']).toBeDefined();
    });
  });
});
