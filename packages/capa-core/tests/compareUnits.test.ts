import { describe, expect, it } from 'vitest';
import {
  compareCapaFormats,
  generateCombinationKey,
  getBwClassCcCount,
  type CommonCapaJson,
} from '../src';

function makeDevice(name: string, partial: Partial<CommonCapaJson['rats']> = {}, features?: CommonCapaJson['features']): CommonCapaJson {
  return {
    schemaVersion: '2.0',
    meta: {
      deviceName: name,
      fileName: `${name}.txt`,
      vendor: 'SLSI',
      detectedRats: Object.keys(partial) as CommonCapaJson['meta']['detectedRats'],
    },
    rats: partial,
    features,
    diagnostics: { warnings: [], errors: [] },
  };
}

describe('Stage 3 Compare & Key Generation Unit Tests', () => {
  it('computes CC counts and canonical combination keys consistently', () => {
    expect(getBwClassCcCount('a')).toBe(1);
    expect(getBwClassCcCount('C')).toBe(2);
    expect(getBwClassCcCount('d')).toBe(3);
    expect(getBwClassCcCount(undefined)).toBe(1);

    const keyWithUl1 = generateCombinationKey({
      bands: [
        { ratType: 'nr', band: 78, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: 'qam256' },
        { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4 },
        { ratType: 'eutra', band: 1, bandwidthClassDL: 'c', dlMimo: 4 },
      ],
    });
    const keyWithoutUl1 = generateCombinationKey({
      bands: [
        { ratType: 'nr', band: 78, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, dlQam: 'qam256' },
        { ratType: 'eutra', band: 1, bandwidthClassDL: 'c', dlMimo: 4 },
        { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4 },
      ],
    });

    // EUTRA sorted before NR, ascending band, and ulMimo=1 equals omitted ulMimo
    expect(keyWithUl1).toBe('B1c(4)-B3a(4)-n78a(4)(qam256)(UL,a)');
    expect(keyWithoutUl1).toBe(keyWithUl1);

    // Display options hide QAM / MIMO when requested
    const stripped = generateCombinationKey(
      {
        bands: [{ ratType: 'nr', band: 78, bandwidthClassDL: 'a', dlMimo: 4, dlQam: 'qam256' }],
      },
      { showMimo: false, showQam: false }
    );
    expect(stripped).toBe('n78a');
  });

  it('calculates subset-aware combination coverage and honors ComboDisplayOptions', () => {
    const devA = makeDevice('A', {
      nr: {
        bands: [{ band: 78, displayName: 'n78' }, { band: 1, displayName: 'n1' }],
        bandCombinations: [
          // Superset of B's 1-band n78 combo
          {
            bands: [
              { ratType: 'nr', band: 1, bandwidthClassDL: 'a', dlMimo: 4 },
              { ratType: 'nr', band: 78, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, dlQam: 'qam256' },
            ],
            dlCc: 2,
            ulCc: 1,
          },
          // Only in A, even ignoring MIMO/QAM
          {
            bands: [{ ratType: 'nr', band: 3, bandwidthClassDL: 'a', dlMimo: 2 }],
            dlCc: 1,
            ulCc: 0,
          },
        ],
      },
    });
    const devB = makeDevice('B', {
      nr: {
        bands: [{ band: 78, displayName: 'n78' }],
        bandCombinations: [
          {
            bands: [
              { ratType: 'nr', band: 78, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 2, dlQam: 'qam64' },
            ],
            dlCc: 1,
            ulCc: 1,
          },
        ],
      },
    });

    const strictCompare = compareCapaFormats(devA, devB);
    expect(strictCompare.summary.perRat.nr?.combos.bOnlyCovered).toBe(1);
    expect(strictCompare.summary.perRat.nr?.combos.bOnlyUnique).toBe(0);
    expect(strictCompare.summary.perRat.nr?.coverage.bToA.coverageRate).toBe(1);
    expect(strictCompare.summary.perRat.nr?.combos.aOnlyUnique).toBe(2);

    // Matching ignoring QAM & MIMO: B's [n78a] still covered by A's [n1a + n78a]; and if exact match with MIMO/QAM diff:
    const devB2 = makeDevice('B2', {
      nr: {
        bands: [{ band: 78, displayName: 'n78' }],
        bandCombinations: [
          {
            bands: [
              { ratType: 'nr', band: 1, bandwidthClassDL: 'a', dlMimo: 2 },
              { ratType: 'nr', band: 78, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 2, dlQam: 'qam64' },
            ],
            dlCc: 2,
            ulCc: 1,
          },
        ],
      },
    });

    const relaxedCompare = compareCapaFormats(devA, devB2, { showQam: false, showMimo: false });
    expect(relaxedCompare.summary.perRat.nr?.combos.exactChanged).toBe(1);
    const changed = relaxedCompare.ratResults.nr?.comboDiffs.find((d) => d.status === 'exact-changed');
    expect(changed?.bandParamDiffs?.some((p) => p.dlMimo?.status === 'changed')).toBe(true);
  });

  it('computes StringListDiff (common, onlyInA, onlyInB) on FeatureDiff', () => {
    const devA = makeDevice('A', {}, {
      utra: {
        leaves: [
          {
            major: 'Security',
            middle: 'Ciphering',
            leaf: 'cipheringAlgorithmCap',
            kind: 'stringList',
            value: ['uea0', 'uea1', 'uea2'],
          },
        ],
      },
    });
    const devB = makeDevice('B', {}, {
      utra: {
        leaves: [
          {
            major: 'Security',
            middle: 'Ciphering',
            leaf: 'cipheringAlgorithmCap',
            kind: 'stringList',
            value: ['uea0', 'uea1'],
          },
        ],
      },
    });

    const res = compareCapaFormats(devA, devB);
    const diff = res.featuresDiff?.utra?.diffs[0];
    expect(diff?.status).toBe('different');
    expect(diff?.stringListDiff).toEqual({
      common: ['uea0', 'uea1'],
      onlyInA: ['uea2'],
      onlyInB: [],
    });
  });

  it('recognizes ASN.1 lowercase qam256 coverage dominance over qam64 and omitted QAM', () => {
    const devA = makeDevice('A', {
      'eutra-nr': {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4, dlQam: 'qam256' },
              { ratType: 'nr', band: 78, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulQam: 'qam256' },
            ],
            dlCc: 2,
            ulCc: 1,
          },
        ],
      },
    });
    const devB = makeDevice('B', {
      'eutra-nr': {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4, dlQam: 'qam64' },
              { ratType: 'nr', band: 78, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4 },
            ],
            dlCc: 2,
            ulCc: 1,
          },
        ],
      },
    });

    const res = compareCapaFormats(devA, devB);
    const diffs = res.ratResults['eutra-nr']?.comboDiffs ?? [];
    const coveredB = diffs.find((d) => d.status === 'b-only-covered');
    expect(coveredB).toBeDefined();
    expect(coveredB?.paramNotes?.some((n) => n.includes('256QAM covers 64QAM'))).toBe(true);
  });

  it('enforces 3GPP fallback rules: DL BW class (B3a cannot cover B3c), UL band match, and MIMO/QAM dominance', () => {
    // 1) B3a (1CC) + UL on B1 CANNOT cover B3c (2CC) + UL on B3
    const devA1 = makeDevice('A1', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, dlQam: 'qam256', ulQam: 'qam256' },
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4, dlQam: 'qam256' },
              { ratType: 'eutra', band: 5, bandwidthClassDL: 'a', dlMimo: 2, dlQam: 'qam256' },
              { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', dlMimo: 4, dlQam: 'qam256' },
              { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', dlMimo: 4, dlQam: 'qam256' },
            ],
            dlCc: 5,
            ulCc: 1,
          },
        ],
      },
    });
    const devB1 = makeDevice('B1', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', dlMimo: 4, dlQam: 'qam256' },
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'c', bandwidthClassUL: 'a', dlMimo: 2, dlQam: 'qam256', ulQam: 'qam256' },
            ],
            dlCc: 3,
            ulCc: 1,
          },
        ],
      },
    });
    const res1 = compareCapaFormats(devA1, devB1);
    expect(res1.ratResults.eutra?.comboDiffs.find((d) => d.b)?.status).toBe('b-only-unique');

    // 2) Same B3c DL class, but UL on B1 only CANNOT cover UL on B3
    const devA2 = makeDevice('A2', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4 },
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'c', dlMimo: 4 },
              { ratType: 'eutra', band: 5, bandwidthClassDL: 'a', dlMimo: 2 },
            ],
            dlCc: 4,
            ulCc: 1,
          },
        ],
      },
    });
    const devB2 = makeDevice('B2', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', dlMimo: 4 },
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'c', bandwidthClassUL: 'a', dlMimo: 4 },
            ],
            dlCc: 3,
            ulCc: 1,
          },
        ],
      },
    });
    const res2 = compareCapaFormats(devA2, devB2);
    expect(res2.ratResults.eutra?.comboDiffs.find((d) => d.b)?.status).toBe('b-only-unique');

    // 3) Superset with lower DL MIMO (2 < 4) CANNOT cover higher DL MIMO fallback
    const devA3 = makeDevice('A3', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', dlMimo: 4 },
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'c', bandwidthClassUL: 'a', dlMimo: 2 },
              { ratType: 'eutra', band: 5, bandwidthClassDL: 'a', dlMimo: 2 },
            ],
            dlCc: 4,
            ulCc: 1,
          },
        ],
      },
    });
    const devB3 = makeDevice('B3', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', dlMimo: 4 },
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4 },
            ],
            dlCc: 2,
            ulCc: 1,
          },
        ],
      },
    });
    const res3 = compareCapaFormats(devA3, devB3);
    expect(res3.ratResults.eutra?.comboDiffs.find((d) => d.b)?.status).toBe('b-only-unique');

    // 4) B3c (2CC) + UL on B3 + MIMO 4 + qam256 DOES cover B3a (1CC) + UL on B3 + MIMO 2 + qam256
    const devA4 = makeDevice('A4', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', dlMimo: 4, dlQam: 'qam256' },
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'c', bandwidthClassUL: 'a', dlMimo: 4, dlQam: 'qam256', ulQam: 'qam256' },
            ],
            dlCc: 3,
            ulCc: 1,
          },
        ],
      },
    });
    const devB4 = makeDevice('B4', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', dlMimo: 4, dlQam: 'qam256' },
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 2, dlQam: 'qam256', ulQam: 'qam256' },
            ],
            dlCc: 2,
            ulCc: 1,
          },
        ],
      },
    });
    const res4 = compareCapaFormats(devA4, devB4);
    expect(res4.ratResults.eutra?.comboDiffs.find((d) => d.b)?.status).toBe('b-only-covered');
  });

  it('supports contiguous UL class fallback (UL,c -> UL,a) for LTE and NR', () => {
    const devA = makeDevice('A', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 7, bandwidthClassDL: 'c', bandwidthClassUL: 'c', dlMimo: 4, ulMimo: 1, dlQam: 'qam256', ulQam: 'qam256' },
            ],
            dlCc: 2,
            ulCc: 2,
          },
        ],
      },
      nr: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'nr', band: 41, bandwidthClassDL: 'c', bandwidthClassUL: 'c', dlMimo: 4, ulMimo: 1, dlQam: 'qam256', ulQam: 'qam256' },
            ],
            dlCc: 2,
            ulCc: 2,
          },
        ],
      },
    });
    const devB = makeDevice('B', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 7, bandwidthClassDL: 'c', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: 'qam256', ulQam: 'qam256' },
            ],
            dlCc: 2,
            ulCc: 1,
          },
        ],
      },
      nr: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'nr', band: 41, bandwidthClassDL: 'c', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: 'qam256', ulQam: 'qam256' },
            ],
            dlCc: 2,
            ulCc: 1,
          },
        ],
      },
    });

    const ab = compareCapaFormats(devA, devB);
    const lteCovered = ab.ratResults.eutra?.comboDiffs.find((d) => d.status === 'b-only-covered');
    expect(lteCovered).toBeDefined();
    expect(lteCovered?.paramNotes).toContain('B7 UL-class: a→c');
    expect(ab.ratResults.eutra?.comboDiffs.find((d) => d.a)?.status).toBe('a-only-unique');

    const nrCovered = ab.ratResults.nr?.comboDiffs.find((d) => d.status === 'b-only-covered');
    expect(nrCovered).toBeDefined();
    expect(nrCovered?.paramNotes).toContain('n41 UL-class: a→c');
    expect(ab.ratResults.nr?.comboDiffs.find((d) => d.a)?.status).toBe('a-only-unique');
  });

  it('matches repeated same-band carriers independently between DL and UL vectors', () => {
    const devA1 = makeDevice('A1', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', dlMimo: 4, dlQam: 'qam256' },
              { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', dlMimo: 4, dlQam: 'qam256' },
              { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 2, dlQam: 'qam256', ulQam: 'qam256' },
            ],
            dlCc: 3,
            ulCc: 1,
          },
        ],
      },
    });
    const devB1 = makeDevice('B1', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, dlQam: 'qam256', ulQam: 'qam256' },
              { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', dlMimo: 2, dlQam: 'qam256' },
            ],
            dlCc: 2,
            ulCc: 1,
          },
        ],
      },
    });
    expect(compareCapaFormats(devA1, devB1).ratResults.eutra?.comboDiffs.find((d) => d.b)?.status).toBe('b-only-covered');

    const devA2 = makeDevice('A2', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', dlMimo: 4, dlQam: 'qam256' },
              { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 2, dlQam: 'qam256', ulQam: 'qam256' },
            ],
            dlCc: 2,
            ulCc: 1,
          },
        ],
      },
    });
    const devB2 = makeDevice('B2', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, dlQam: 'qam256', ulQam: 'qam64' },
              { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', dlMimo: 2, dlQam: 'qam256' },
            ],
            dlCc: 2,
            ulCc: 1,
          },
        ],
      },
    });
    const paramDiff = compareCapaFormats(devA2, devB2).ratResults.eutra?.comboDiffs.find((d) => d.b);
    expect(paramDiff?.status).toBe('b-only-covered');
    expect(paramDiff?.paramNotes?.some((n) => n.includes('256QAM covers 64QAM'))).toBe(true);
  });

  it('prefers direct same-caLevel superset over higher-caLevel subset and records compound UL+DL notes', () => {
    const devA = makeDevice('A', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4 },
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4 },
            ],
            dlCc: 2,
            ulCc: 1,
          },
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4 },
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4 },
              { ratType: 'eutra', band: 5, bandwidthClassDL: 'a', dlMimo: 2 },
            ],
            dlCc: 3,
            ulCc: 1,
          },
        ],
      },
    });
    const devB = makeDevice('B', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4 },
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 2 },
            ],
            dlCc: 2,
            ulCc: 1,
          },
        ],
      },
    });
    const priorityDiff = compareCapaFormats(devA, devB).ratResults.eutra?.comboDiffs.find((d) => d.b);
    expect(priorityDiff?.status).toBe('b-only-covered');
    expect(priorityDiff?.coveringSupersets?.[0]).toBe('B1a(4)(UL,a)-B3a(4)');

    const devCompoundA = makeDevice('CompA', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4 },
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4 },
              { ratType: 'eutra', band: 5, bandwidthClassDL: 'a', dlMimo: 2 },
            ],
            dlCc: 3,
            ulCc: 2,
          },
        ],
      },
    });
    const devCompoundB = makeDevice('CompB', {
      eutra: {
        bands: [],
        bandCombinations: [
          {
            bands: [
              { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4 },
              { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4 },
            ],
            dlCc: 2,
            ulCc: 1,
          },
        ],
      },
    });
    const compoundDiff = compareCapaFormats(devCompoundA, devCompoundB).ratResults.eutra?.comboDiffs.find((d) => d.b);
    expect(compoundDiff?.status).toBe('b-only-covered');
    expect(compoundDiff?.paramNotes).toContain('UL B3 carrier added coverage (1UL→2UL)');
  });
});
