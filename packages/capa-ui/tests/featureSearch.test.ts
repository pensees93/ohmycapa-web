import { describe, expect, it } from 'vitest';
import type { CapaCompareResult, CompareFormat } from '@ohmycapa/capa-core';
import {
  buildGlobalCompareFeatureIndex,
  buildGlobalSingleFeatureIndex,
  filterGlobalCompareFeatures,
  filterGlobalSingleFeatures,
  formatFeatureCompareCopyText,
  formatSingleFeatureCopyText,
  splitHighlightSegments,
} from '../src/utils/featureSearch';

function makeMockCompareResult(): CapaCompareResult {
  return {
    meta: {
      deviceA: { deviceName: 'DevA', fileName: 'a.txt', vendor: 'MTK', detectedRats: ['nr', 'eutra', 'eutra-nr', 'utra'] },
      deviceB: { deviceName: 'DevB', fileName: 'b.txt', vendor: 'QUALCOMM', detectedRats: ['nr', 'eutra', 'eutra-nr', 'utra'] },
    },
    ratResults: {},
    featuresDiff: {
      nr: {
        diffs: [
          {
            major: 'PhyLayer',
            middle: 'MIMO',
            leaf: 'pdsch-256QAM-FR1',
            kind: 'bool',
            status: 'different',
            a: true,
            b: false,
            description: '256QAM PDSCH support on FR1',
            path: 'phy-Parameters.phy-ParametersFR1.pdsch-256QAM-FR1',
          },
          {
            major: 'General',
            middle: 'Release',
            leaf: 'accessStratumRelease',
            kind: 'enum',
            status: 'same',
            a: 'rel16',
            b: 'rel16',
            description: '3GPP AS Release',
            path: 'accessStratumRelease',
          },
        ],
        counts: { same: 1, different: 1, aOnly: 0, bOnly: 0 },
      },
      eutra: {
        diffs: [
          {
            major: 'FeatureGroupIndicators',
            middle: 'FGI-Rel10',
            leaf: 'FGI-101-DMRS',
            kind: 'fgiBit',
            status: 'a-only',
            a: true,
            description: 'DMRS enhancement for TM9',
            path: 'featureGroupIndRel10-r10[1]',
          },
        ],
        counts: { same: 0, different: 0, aOnly: 1, bOnly: 0 },
      },
      'eutra-nr': {
        diffs: [
          {
            major: 'MRDC',
            middle: 'PowerSharing',
            leaf: 'dynamicPowerSharingENDC',
            kind: 'bool',
            status: 'b-only',
            b: true,
            description: 'Dynamic EN-DC power sharing',
            path: 'mrdc-Parameters.dynamicPowerSharing',
          },
        ],
        counts: { same: 0, different: 0, aOnly: 0, bOnly: 1 },
      },
      utra: {
        diffs: [
          {
            major: 'HSPA',
            middle: 'Category',
            leaf: 'supportedBands',
            kind: 'stringList',
            status: 'different',
            a: ['bandI', 'bandV'],
            b: ['bandI'],
            stringListDiff: { common: ['bandI'], onlyInA: ['bandV'], onlyInB: [] },
          },
        ],
        counts: { same: 0, different: 1, aOnly: 0, bOnly: 0 },
      },
    },
    summary: { perRat: {}, keyDifferences: [] },
  };
}

function makeMockSingleDevice(): CompareFormat {
  return {
    schemaVersion: '2.0',
    meta: {
      deviceName: 'TestUE',
      fileName: 'test.txt',
      vendor: 'SLSI',
      detectedRats: ['nr', 'eutra'],
    },
    rats: {},
    features: {
      nr: {
        leaves: [
          {
            major: 'PhyLayer',
            middle: 'MIMO',
            leaf: 'ul-MIMO-FR1',
            kind: 'bool',
            value: true,
            description: 'UL MIMO FR1',
            path: 'phy.ulMimo',
          },
        ],
      },
      eutra: {
        leaves: [
          {
            major: 'FGI',
            middle: 'Rel9',
            leaf: 'FGI-27',
            kind: 'fgiBit',
            value: false,
            description: 'EUTRA Measurement',
          },
        ],
      },
    },
    diagnostics: { warnings: [], errors: [] },
  };
}

describe('featureSearch utilities', () => {
  it('indexes features across all RATs in canonical order', () => {
    const idx = buildGlobalCompareFeatureIndex(makeMockCompareResult());
    expect(idx).toHaveLength(5);
    expect(idx.map(i => i.rat)).toEqual(['nr', 'nr', 'eutra', 'eutra-nr', 'utra']);
  });

  it('supports multi-token AND search across leaf, description, path, and values', () => {
    const idx = buildGlobalCompareFeatureIndex(makeMockCompareResult());

    const res1 = filterGlobalCompareFeatures(idx, { query: '256qam fr1', status: 'all', rats: null });
    expect(res1.items.map(i => i.diff.leaf)).toEqual(['pdsch-256QAM-FR1']);

    const res2 = filterGlobalCompareFeatures(idx, { query: 'rel16', status: 'all', rats: null });
    expect(res2.items.map(i => i.diff.leaf)).toEqual(['accessStratumRelease']);

    const res3 = filterGlobalCompareFeatures(idx, { query: 'bandv', status: 'all', rats: null });
    expect(res3.items.map(i => i.diff.leaf)).toEqual(['supportedBands']);
  });

  it('filters by status and RAT while tracking per-RAT and per-status counts', () => {
    const idx = buildGlobalCompareFeatureIndex(makeMockCompareResult());

    const diffOnly = filterGlobalCompareFeatures(idx, { query: '', status: 'diff', rats: null });
    expect(diffOnly.items).toHaveLength(4);
    expect(diffOnly.ratCounts).toEqual({ nr: 1, eutra: 1, 'eutra-nr': 1, utra: 1 });
    expect(diffOnly.statusCounts).toEqual({
      all: 5,
      diff: 4,
      different: 2,
      'a-only': 1,
      'b-only': 1,
      same: 1,
    });

    const bOnlyMrdc = filterGlobalCompareFeatures(idx, {
      query: '',
      status: 'b-only',
      rats: new Set(['eutra-nr']),
    });
    expect(bOnlyMrdc.items.map(i => i.diff.leaf)).toEqual(['dynamicPowerSharingENDC']);
  });

  it('indexes and filters single-device features across RATs', () => {
    const idx = buildGlobalSingleFeatureIndex(makeMockSingleDevice());
    expect(idx).toHaveLength(2);

    const filtered = filterGlobalSingleFeatures(idx, { query: 'measurement', rats: null });
    expect(filtered.items.map(i => i.leaf.leaf)).toEqual(['FGI-27']);
    expect(filtered.ratCounts).toEqual({ eutra: 1 });
  });

  it('splits highlight segments safely with regex metacharacters', () => {
    const segs = splitHighlightSegments('pdsch-(256QAM)+[FR1]', '(256qam) [fr1]');
    expect(segs.filter(s => s.match).map(s => s.text)).toEqual(['(256QAM)', '[FR1]']);
    expect(segs.map(s => s.text).join('')).toBe('pdsch-(256QAM)+[FR1]');
  });

  it('formats compare and single feature copy lines cleanly', () => {
    const idx = buildGlobalCompareFeatureIndex(makeMockCompareResult());
    const line = formatFeatureCompareCopyText({
      rat: 'nr',
      diff: idx[0].diff,
      deviceAName: 'PhoneA',
      deviceBName: 'PhoneB',
    });
    expect(line).toBe('[NR] pdsch-256QAM-FR1 (phy-Parameters.phy-ParametersFR1.pdsch-256QAM-FR1) | PhoneA: ✓ | PhoneB: ✗');

    const singleIdx = buildGlobalSingleFeatureIndex(makeMockSingleDevice());
    const singleLine = formatSingleFeatureCopyText({ rat: 'nr', leaf: singleIdx[0].leaf });
    expect(singleLine).toBe('[NR] ul-MIMO-FR1 (phy.ulMimo): ✓');
  });
});
