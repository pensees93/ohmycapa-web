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
});
