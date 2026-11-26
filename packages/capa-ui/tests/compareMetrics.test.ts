import { describe, expect, it } from 'vitest';
import type { CapaCompareResult } from '@ohmycapa/capa-core';
import { computeCrossRatMetrics, resolveKpiDrillDown } from '../src/utils/compareMetrics';

function makeMetricsCompareResult(identical = false): CapaCompareResult {
  if (identical) {
    return {
      meta: {
        deviceA: { deviceName: 'A', fileName: 'a.txt', vendor: 'MTK', detectedRats: ['nr'] },
        deviceB: { deviceName: 'B', fileName: 'b.txt', vendor: 'MTK', detectedRats: ['nr'] },
      },
      ratResults: {
        nr: {
          bandDiffs: [{ band: 78, ratType: 'nr', displayName: 'n78', status: 'same' }],
          comboDiffs: [{ key: 'n78a(4)', status: 'exact-same', caLevel: 1, ulLevel: 1 }],
          coverage: {
            aToB: { exactMatch: 1, exactChanged: 0, coveredBySuperset: 0, trulyUnique: 0, total: 1, coverageRate: 1 },
            bToA: { exactMatch: 1, exactChanged: 0, coveredBySuperset: 0, trulyUnique: 0, total: 1, coverageRate: 1 },
          },
        },
      },
      featuresDiff: {
        nr: {
          diffs: [{ major: 'Phy', middle: 'MIMO', leaf: 'f1', kind: 'bool', status: 'same', a: true, b: true }],
          counts: { same: 1, different: 0, aOnly: 0, bOnly: 0 },
        },
      },
      summary: {
        perRat: {
          nr: {
            bands: { total: 1, shared: 1, aOnly: 0, bOnly: 0, changed: 0 },
            combos: { total: 1, exactSame: 1, exactChanged: 0, aOnlyCovered: 0, aOnlyUnique: 0, bOnlyCovered: 0, bOnlyUnique: 0 },
            coverage: {
              aToB: { exactMatch: 1, exactChanged: 0, coveredBySuperset: 0, trulyUnique: 0, total: 1, coverageRate: 1 },
              bToA: { exactMatch: 1, exactChanged: 0, coveredBySuperset: 0, trulyUnique: 0, total: 1, coverageRate: 1 },
            },
          },
        },
        keyDifferences: [],
      },
    };
  }

  return {
    meta: {
      deviceA: { deviceName: 'A', fileName: 'a.txt', vendor: 'MTK', detectedRats: ['nr', 'eutra'] },
      deviceB: { deviceName: 'B', fileName: 'b.txt', vendor: 'QUALCOMM', detectedRats: ['nr', 'eutra'] },
    },
    ratResults: {
      nr: {
        bandDiffs: [
          { band: 78, ratType: 'nr', displayName: 'n78', status: 'changed' },
          { band: 77, ratType: 'nr', displayName: 'n77', status: 'a-only' },
        ],
        comboDiffs: [
          { key: 'n78a(4)', status: 'exact-changed', caLevel: 1, ulLevel: 1 },
          { key: 'n77a(4)', status: 'a-only-unique', caLevel: 1, ulLevel: 1 },
        ],
        coverage: {
          aToB: { exactMatch: 0, exactChanged: 1, coveredBySuperset: 0, trulyUnique: 1, total: 2, coverageRate: 0.5 },
          bToA: { exactMatch: 0, exactChanged: 1, coveredBySuperset: 0, trulyUnique: 0, total: 1, coverageRate: 1 },
        },
      },
      eutra: {
        bandDiffs: [{ band: 3, ratType: 'eutra', displayName: 'B3', status: 'same' }],
        comboDiffs: [{ key: 'B3a(4)', status: 'b-only-covered', caLevel: 1, ulLevel: 1 }],
        coverage: {
          aToB: { exactMatch: 0, exactChanged: 0, coveredBySuperset: 0, trulyUnique: 0, total: 0, coverageRate: 1 },
          bToA: { exactMatch: 0, exactChanged: 0, coveredBySuperset: 1, trulyUnique: 0, total: 1, coverageRate: 1 },
        },
      },
    },
    featuresDiff: {
      eutra: {
        diffs: [
          { major: 'FGI', middle: 'Rel9', leaf: 'FGI-1', kind: 'fgiBit', status: 'b-only', b: true },
        ],
        counts: { same: 0, different: 0, aOnly: 0, bOnly: 1 },
      },
    },
    summary: {
      perRat: {
        nr: {
          bands: { total: 2, shared: 1, aOnly: 1, bOnly: 0, changed: 1 },
          combos: { total: 2, exactSame: 0, exactChanged: 1, aOnlyCovered: 0, aOnlyUnique: 1, bOnlyCovered: 0, bOnlyUnique: 0 },
          coverage: {
            aToB: { exactMatch: 0, exactChanged: 1, coveredBySuperset: 0, trulyUnique: 1, total: 2, coverageRate: 0.5 },
            bToA: { exactMatch: 0, exactChanged: 1, coveredBySuperset: 0, trulyUnique: 0, total: 1, coverageRate: 1 },
          },
        },
        eutra: {
          bands: { total: 1, shared: 1, aOnly: 0, bOnly: 0, changed: 0 },
          combos: { total: 1, exactSame: 0, exactChanged: 0, aOnlyCovered: 0, aOnlyUnique: 0, bOnlyCovered: 1, bOnlyUnique: 0 },
          coverage: {
            aToB: { exactMatch: 0, exactChanged: 0, coveredBySuperset: 0, trulyUnique: 0, total: 0, coverageRate: 1 },
            bToA: { exactMatch: 0, exactChanged: 0, coveredBySuperset: 1, trulyUnique: 0, total: 1, coverageRate: 1 },
          },
        },
      },
      keyDifferences: ['n77 A-only'],
    },
  };
}

describe('compareMetrics utilities', () => {
  it('detects 100% identical results accurately', () => {
    const metrics = computeCrossRatMetrics(makeMetricsCompareResult(true));
    expect(metrics.allIdentical).toBe(true);
    expect(metrics.totalDiffs).toBe(0);
    expect(metrics.overallCoverageAtoB.percent).toBe(100);
    expect(metrics.overallCoverageBtoA.percent).toBe(100);
  });

  it('aggregates cross-RAT diffs and bidirectional coverage accurately', () => {
    const metrics = computeCrossRatMetrics(makeMetricsCompareResult(false));
    expect(metrics.allIdentical).toBe(false);
    expect(metrics.totals.combos.unique).toBe(1);
    expect(metrics.totals.combos.exactChanged).toBe(1);
    expect(metrics.totals.combos.covered).toBe(1);
    expect(metrics.totals.bands.diff).toBe(2);
    expect(metrics.totals.features.diff).toBe(1);
    expect(metrics.overallCoverageAtoB).toEqual({ coveredCount: 1, totalCount: 2, rate: 0.5, percent: 50 });
    expect(metrics.overallCoverageBtoA).toEqual({ coveredCount: 2, totalCount: 2, rate: 1, percent: 100 });
  });

  it('resolves KPI drill-down targets to the matching RAT and section', () => {
    const metrics = computeCrossRatMetrics(makeMetricsCompareResult(false));
    expect(resolveKpiDrillDown(metrics, 'unique')).toEqual({
      kind: 'rat',
      rat: 'nr',
      section: 'combos',
      comboFilter: 'unique',
    });
    expect(resolveKpiDrillDown(metrics, 'param')).toEqual({
      kind: 'rat',
      rat: 'nr',
      section: 'combos',
      comboFilter: 'exact-changed',
    });
    expect(resolveKpiDrillDown(metrics, 'covered')).toEqual({
      kind: 'rat',
      rat: 'eutra',
      section: 'combos',
      comboFilter: 'covered',
    });
    expect(resolveKpiDrillDown(metrics, 'bands')).toEqual({
      kind: 'rat',
      rat: 'nr',
      section: 'bands',
      bandFilter: 'diff',
    });
    expect(resolveKpiDrillDown(metrics, 'features')).toEqual({
      kind: 'global-features',
      featureFilter: 'diff',
    });
  });
});
