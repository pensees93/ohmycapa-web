import type { CapaCompareResult, RatType } from '@ohmycapa/capa-core';
import { RAT_TABS } from '../constants/statusMeta';

export type DetailSection = 'combos' | 'bands' | 'features';
export type ComboFilterKey = 'diff' | 'unique' | 'exact-changed' | 'covered' | 'a-only' | 'b-only' | 'shared' | 'all';
export type BandFilterKey = 'diff' | 'a-only' | 'b-only' | 'all';
export type FeatureFilterKey = 'all' | 'diff' | 'different' | 'a-only' | 'b-only';
export type KpiKind = 'unique' | 'param' | 'covered' | 'bands' | 'features';

export interface DrillDownTarget {
  rat: RatType;
  section: DetailSection;
  comboFilter?: ComboFilterKey;
  bandFilter?: BandFilterKey;
  featureFilter?: FeatureFilterKey;
  featureMajor?: string | null;
  highlightFeatureId?: string | null;
  version: number;
}

export interface CoveragePercentSummary {
  coveredCount: number;
  totalCount: number;
  rate: number;
  percent: number;
}

export interface RatMetrics {
  rat: RatType;
  label: string;
  shortLabel: string;
  accentColor: string;
  hasData: boolean;
  combos: {
    total: number;
    exactSame: number;
    exactChanged: number;
    aOnlyCovered: number;
    bOnlyCovered: number;
    aOnlyUnique: number;
    bOnlyUnique: number;
    unique: number;
    covered: number;
    diff: number;
    coverageAtoB: CoveragePercentSummary;
    coverageBtoA: CoveragePercentSummary;
  };
  bands: {
    total: number;
    same: number;
    changed: number;
    aOnly: number;
    bOnly: number;
    diff: number;
  };
  features: {
    total: number;
    same: number;
    different: number;
    aOnly: number;
    bOnly: number;
    diff: number;
    autoCount: number;
  };
}

export interface CrossRatMetrics {
  perRat: RatMetrics[];
  totals: Omit<RatMetrics, 'rat' | 'label' | 'shortLabel' | 'accentColor' | 'hasData'>;
  overallCoverageAtoB: CoveragePercentSummary;
  overallCoverageBtoA: CoveragePercentSummary;
  allIdentical: boolean;
  totalDiffs: number;
}

function buildCoveragePercent(coveredCount: number, totalCount: number): CoveragePercentSummary {
  const rate = totalCount > 0 ? coveredCount / totalCount : 1;
  return {
    coveredCount,
    totalCount,
    rate,
    percent: Math.round(rate * 100),
  };
}

/**
 * Computes consistent per-RAT and cross-RAT summary metrics, including bidirectional
 * combo coverage (A->B and B->A), from a CapaCompareResult.
 */
export function computeCrossRatMetrics(compareResult: CapaCompareResult): CrossRatMetrics {
  const perRat: RatMetrics[] = [];

  let comboTotal = 0;
  let comboExactSame = 0;
  let comboExactChanged = 0;
  let comboAOnlyCovered = 0;
  let comboBOnlyCovered = 0;
  let comboAOnlyUnique = 0;
  let comboBOnlyUnique = 0;
  let covACovered = 0;
  let covATotal = 0;
  let covBCovered = 0;
  let covBTotal = 0;

  let bandTotal = 0;
  let bandSame = 0;
  let bandChanged = 0;
  let bandAOnly = 0;
  let bandBOnly = 0;

  let featTotal = 0;
  let featSame = 0;
  let featDifferent = 0;
  let featAOnly = 0;
  let featBOnly = 0;
  let featAuto = 0;

  for (const tab of RAT_TABS) {
    const rat = tab.value;
    const ratRes = compareResult.ratResults[rat];
    const ratSum = compareResult.summary.perRat[rat];
    const featDiff = compareResult.featuresDiff?.[rat];

    const hasRatData = Boolean(ratRes) || (featDiff?.diffs.length ?? 0) > 0;
    if (!hasRatData) continue;

    // Combos
    const cExactSame = ratSum?.combos.exactSame ?? ratRes?.comboDiffs.filter(d => d.status === 'exact-same').length ?? 0;
    const cExactChanged = ratSum?.combos.exactChanged ?? ratRes?.comboDiffs.filter(d => d.status === 'exact-changed').length ?? 0;
    const cAOnlyCov = ratSum?.combos.aOnlyCovered ?? ratRes?.comboDiffs.filter(d => d.status === 'a-only-covered').length ?? 0;
    const cBOnlyCov = ratSum?.combos.bOnlyCovered ?? ratRes?.comboDiffs.filter(d => d.status === 'b-only-covered').length ?? 0;
    const cAOnlyUniq = ratSum?.combos.aOnlyUnique ?? ratRes?.comboDiffs.filter(d => d.status === 'a-only-unique').length ?? 0;
    const cBOnlyUniq = ratSum?.combos.bOnlyUnique ?? ratRes?.comboDiffs.filter(d => d.status === 'b-only-unique').length ?? 0;
    const cTotal = ratSum?.combos.total ?? ratRes?.comboDiffs.length ?? 0;
    const cUnique = cAOnlyUniq + cBOnlyUniq;
    const cCovered = cAOnlyCov + cBOnlyCov;
    const cDiff = cUnique + cExactChanged + cCovered;

    const aDir = ratRes?.coverage.aToB ?? ratSum?.coverage.aToB;
    const bDir = ratRes?.coverage.bToA ?? ratSum?.coverage.bToA;
    const aCovNum = aDir ? (aDir.exactMatch + aDir.exactChanged + aDir.coveredBySuperset) : 0;
    const aCovDen = aDir ? aDir.total : 0;
    const bCovNum = bDir ? (bDir.exactMatch + bDir.exactChanged + bDir.coveredBySuperset) : 0;
    const bCovDen = bDir ? bDir.total : 0;

    // Bands
    const bArr = ratRes?.bandDiffs ?? [];
    const bChanged = ratSum?.bands.changed ?? bArr.filter(b => b.status === 'changed').length;
    const bAOnly = ratSum?.bands.aOnly ?? bArr.filter(b => b.status === 'a-only').length;
    const bBOnly = ratSum?.bands.bOnly ?? bArr.filter(b => b.status === 'b-only').length;
    const bTotal = bArr.length > 0 ? bArr.length : ((ratSum?.bands.shared ?? 0) + bAOnly + bBOnly);
    const bSame = Math.max(0, bTotal - bChanged - bAOnly - bBOnly);
    const bDiff = bChanged + bAOnly + bBOnly;

    // Features
    const fSame = featDiff?.counts.same ?? 0;
    const fDifferent = featDiff?.counts.different ?? 0;
    const fAOnly = featDiff?.counts.aOnly ?? 0;
    const fBOnly = featDiff?.counts.bOnly ?? 0;
    const fTotal = featDiff?.diffs.length ?? (fSame + fDifferent + fAOnly + fBOnly);
    const fDiff = fDifferent + fAOnly + fBOnly;
    const fAuto = featDiff ? featDiff.diffs.filter(d => d.autoDiscovered).length : 0;

    perRat.push({
      rat,
      label: tab.label,
      shortLabel: tab.shortLabel,
      accentColor: tab.accentColor,
      hasData: true,
      combos: {
        total: cTotal,
        exactSame: cExactSame,
        exactChanged: cExactChanged,
        aOnlyCovered: cAOnlyCov,
        bOnlyCovered: cBOnlyCov,
        aOnlyUnique: cAOnlyUniq,
        bOnlyUnique: cBOnlyUniq,
        unique: cUnique,
        covered: cCovered,
        diff: cDiff,
        coverageAtoB: buildCoveragePercent(aCovNum, aCovDen),
        coverageBtoA: buildCoveragePercent(bCovNum, bCovDen),
      },
      bands: {
        total: bTotal,
        same: bSame,
        changed: bChanged,
        aOnly: bAOnly,
        bOnly: bBOnly,
        diff: bDiff,
      },
      features: {
        total: fTotal,
        same: fSame,
        different: fDifferent,
        aOnly: fAOnly,
        bOnly: fBOnly,
        diff: fDiff,
        autoCount: fAuto,
      },
    });

    comboTotal += cTotal;
    comboExactSame += cExactSame;
    comboExactChanged += cExactChanged;
    comboAOnlyCovered += cAOnlyCov;
    comboBOnlyCovered += cBOnlyCov;
    comboAOnlyUnique += cAOnlyUniq;
    comboBOnlyUnique += cBOnlyUniq;
    covACovered += aCovNum;
    covATotal += aCovDen;
    covBCovered += bCovNum;
    covBTotal += bCovDen;

    bandTotal += bTotal;
    bandSame += bSame;
    bandChanged += bChanged;
    bandAOnly += bAOnly;
    bandBOnly += bBOnly;

    featTotal += fTotal;
    featSame += fSame;
    featDifferent += fDifferent;
    featAOnly += fAOnly;
    featBOnly += fBOnly;
    featAuto += fAuto;
  }

  const overallCoverageAtoB = buildCoveragePercent(covACovered, covATotal);
  const overallCoverageBtoA = buildCoveragePercent(covBCovered, covBTotal);
  const comboUnique = comboAOnlyUnique + comboBOnlyUnique;
  const comboCovered = comboAOnlyCovered + comboBOnlyCovered;
  const comboDiff = comboUnique + comboExactChanged + comboCovered;
  const bandDiff = bandChanged + bandAOnly + bandBOnly;
  const featDiff = featDifferent + featAOnly + featBOnly;
  const totalDiffs = comboDiff + bandDiff + featDiff;

  return {
    perRat,
    totals: {
      combos: {
        total: comboTotal,
        exactSame: comboExactSame,
        exactChanged: comboExactChanged,
        aOnlyCovered: comboAOnlyCovered,
        bOnlyCovered: comboBOnlyCovered,
        aOnlyUnique: comboAOnlyUnique,
        bOnlyUnique: comboBOnlyUnique,
        unique: comboUnique,
        covered: comboCovered,
        diff: comboDiff,
        coverageAtoB: overallCoverageAtoB,
        coverageBtoA: overallCoverageBtoA,
      },
      bands: {
        total: bandTotal,
        same: bandSame,
        changed: bandChanged,
        aOnly: bandAOnly,
        bOnly: bandBOnly,
        diff: bandDiff,
      },
      features: {
        total: featTotal,
        same: featSame,
        different: featDifferent,
        aOnly: featAOnly,
        bOnly: featBOnly,
        diff: featDiff,
        autoCount: featAuto,
      },
    },
    overallCoverageAtoB,
    overallCoverageBtoA,
    allIdentical: totalDiffs === 0,
    totalDiffs,
  };
}

export type KpiResolution =
  | ({ kind: 'rat' } & Omit<DrillDownTarget, 'version'>)
  | { kind: 'global-features'; featureFilter: 'diff' };

/**
 * Resolves a top-bar KPI chip click to the most relevant RAT/section/filter or
 * cross-RAT feature diff view.
 */
export function resolveKpiDrillDown(metrics: CrossRatMetrics, kind: KpiKind): KpiResolution | null {
  if (kind === 'features') {
    if (metrics.totals.features.diff === 0) return null;
    return { kind: 'global-features', featureFilter: 'diff' };
  }
  if (kind === 'unique') {
    const target = metrics.perRat.find(r => r.combos.unique > 0);
    return target ? { kind: 'rat', rat: target.rat, section: 'combos', comboFilter: 'unique' } : null;
  }
  if (kind === 'param') {
    const target = metrics.perRat.find(r => r.combos.exactChanged > 0);
    return target ? { kind: 'rat', rat: target.rat, section: 'combos', comboFilter: 'exact-changed' } : null;
  }
  if (kind === 'covered') {
    const target = metrics.perRat.find(r => r.combos.covered > 0);
    return target ? { kind: 'rat', rat: target.rat, section: 'combos', comboFilter: 'covered' } : null;
  }
  if (kind === 'bands') {
    const target = metrics.perRat.find(r => r.bands.diff > 0);
    return target ? { kind: 'rat', rat: target.rat, section: 'bands', bandFilter: 'diff' } : null;
  }
  return null;
}
