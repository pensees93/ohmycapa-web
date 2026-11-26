import React from 'react';
import { Box, Chip, Paper, Tooltip, Typography, useTheme } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ReTooltip, XAxis } from 'recharts';
import type { CapaCompareResult, CompareMeta } from '@ohmycapa/capa-core';
import { DEVICE_COLOR, MONO_FONT_FAMILY, STATUS_COLOR, getWorkbenchSurface } from '../constants/statusMeta';
import type { CrossRatMetrics, DrillDownTarget } from '../utils/compareMetrics';
import type { GlobalFeatureStatusFilter } from '../utils/featureSearch';

interface CompareOverviewViewProps {
  compareResult: CapaCompareResult;
  metrics: CrossRatMetrics;
  deviceAName: string;
  deviceBName: string;
  onDrillDown: (target: Omit<DrillDownTarget, 'version'>) => void;
  onOpenGlobalFeatures: (status?: GlobalFeatureStatusFilter) => void;
}

function CoverageGaugeBar({
  label,
  percent,
  coveredCount,
  totalCount,
  isDark,
}: {
  label: string;
  percent: number;
  coveredCount: number;
  totalCount: number;
  isDark: boolean;
}) {
  const color = percent >= 90 ? STATUS_COLOR.green : percent >= 70 ? STATUS_COLOR.amber : STATUS_COLOR.red;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'text.secondary' }}>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, fontFamily: MONO_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', color }}>
            {percent}%
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.62rem', fontFamily: MONO_FONT_FAMILY, color: 'text.disabled' }}>
            ({coveredCount}/{totalCount})
          </Typography>
        </Box>
      </Box>
      <Box sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.08)', overflow: 'hidden' }}>
        <Box sx={{ width: `${percent}%`, height: '100%', bgcolor: color, borderRadius: 3, transition: 'width 200ms ease' }} />
      </Box>
    </Box>
  );
}

function DeviceProfileCard({
  side,
  displayName,
  meta,
}: {
  side: 'A' | 'B';
  displayName: string;
  meta: CompareMeta;
}) {
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);
  const color = side === 'A' ? DEVICE_COLOR.deviceA : DEVICE_COLOR.deviceB;
  const relEntries = meta.asRelease
    ? Object.entries(meta.asRelease).filter(([, v]) => Boolean(v))
    : [];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        border: '1px solid',
        borderColor: side === 'A' ? surface.laneABorder : surface.laneBBorder,
        borderTop: `3px solid ${color}`,
        borderRadius: 2,
        bgcolor: surface.elevatedBg,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
        <Chip
          size="small"
          label={`Device ${side}`}
          sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, color, bgcolor: `${color}1f` }}
        />
        {meta.vendor && meta.vendor !== 'UNKNOWN' && (
          <Chip size="small" label={meta.vendor} sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} />
        )}
        {relEntries.map(([rat, rel]) => (
          <Chip
            key={rat}
            size="small"
            label={`${rat.toUpperCase()} ${rel}`}
            sx={{ height: 18, fontSize: '0.6rem', fontFamily: MONO_FONT_FAMILY, bgcolor: 'action.hover' }}
          />
        ))}
      </Box>

      <Typography
        variant="subtitle2"
        title={displayName}
        sx={{ fontWeight: 700, fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {displayName}
      </Typography>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', fontSize: '0.67rem', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {(meta.sourceFiles && meta.sourceFiles.length > 0 ? meta.sourceFiles : [meta.fileName]).join(', ')}
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
        {meta.detectedRats.map(r => (
          <Chip
            key={r}
            size="small"
            label={r.toUpperCase()}
            sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' }}
          />
        ))}
      </Box>
    </Paper>
  );
}

/**
 * Interactive Cross-RAT Overview tab displaying Device A/B profiles, bidirectional
 * combo coverage, clickable Cross-RAT Diff Matrix, and summary charts.
 */
export const CompareOverviewView: React.FC<CompareOverviewViewProps> = ({
  compareResult,
  metrics,
  deviceAName,
  deviceBName,
  onDrillDown,
  onOpenGlobalFeatures,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);
  const { perRat, totals, overallCoverageAtoB, overallCoverageBtoA, allIdentical, totalDiffs } = metrics;

  const { bandDonutData, comboBarData } = React.useMemo(() => {
    const donut = [
      { name: 'Identical', value: Math.max(0, totals.bands.same), color: STATUS_COLOR.green },
      { name: 'Changed', value: totals.bands.changed, color: STATUS_COLOR.amber },
      { name: 'A-only', value: totals.bands.aOnly, color: DEVICE_COLOR.deviceA },
      { name: 'B-only', value: totals.bands.bOnly, color: DEVICE_COLOR.deviceB },
    ].filter(d => d.value > 0);

    const bars = perRat
      .filter(r => r.combos.total > 0)
      .map(r => ({
        name: r.shortLabel,
        Exact: r.combos.exactSame,
        Diff: r.combos.exactChanged,
        Covered: r.combos.covered,
        Unique: r.combos.unique,
      }));

    return { bandDonutData: donut, comboBarData: bars };
  }, [perRat, totals]);

  const thSx = {
    py: 0.9,
    px: 1.25,
    fontSize: '0.67rem',
    fontWeight: 700,
    color: 'text.secondary',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid',
    borderColor: surface.border,
    whiteSpace: 'nowrap' as const,
  };

  const clickableCellSx = {
    py: 0.9,
    px: 1.25,
    borderBottom: '1px solid',
    borderColor: 'divider',
    cursor: 'pointer',
    transition: 'background-color 120ms',
    '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)' },
    '& .jump-arrow': { opacity: 0.25, transition: 'opacity 120ms, transform 120ms' },
    '&:hover .jump-arrow': { opacity: 0.9, transform: 'translateX(2px)' },
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Section 1: Device Profiles & Bidirectional Coverage */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr minmax(260px, 0.95fr) 1fr' },
          gap: 1.25,
        }}
      >
        <DeviceProfileCard side="A" displayName={deviceAName} meta={compareResult.meta.deviceA} />

        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            border: '1px solid',
            borderColor: surface.border,
            borderRadius: 2,
            bgcolor: surface.elevatedBg,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="caption" sx={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
              Bidirectional Coverage
            </Typography>
            <Chip
              size="small"
              icon={allIdentical ? <CheckCircleOutlinedIcon sx={{ fontSize: '13px !important', color: `${STATUS_COLOR.green} !important` }} /> : undefined}
              label={allIdentical ? '100% Match' : `${totalDiffs} Total Diffs`}
              sx={{
                height: 19,
                fontSize: '0.62rem',
                fontWeight: 700,
                fontFamily: MONO_FONT_FAMILY,
                bgcolor: allIdentical ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)',
                color: allIdentical ? STATUS_COLOR.green : STATUS_COLOR.amber,
              }}
            />
          </Box>

          <CoverageGaugeBar
            label="A → B Coverage (A covered by B)"
            percent={overallCoverageAtoB.percent}
            coveredCount={overallCoverageAtoB.coveredCount}
            totalCount={overallCoverageAtoB.totalCount}
            isDark={isDark}
          />
          <CoverageGaugeBar
            label="B → A Coverage (B covered by A)"
            percent={overallCoverageBtoA.percent}
            coveredCount={overallCoverageBtoA.coveredCount}
            totalCount={overallCoverageBtoA.totalCount}
            isDark={isDark}
          />
        </Paper>

        <DeviceProfileCard side="B" displayName={deviceBName} meta={compareResult.meta.deviceB} />
      </Box>

      {/* Section 2: Interactive Cross-RAT Diff Matrix */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: surface.border,
          borderRadius: 2,
          bgcolor: surface.panelBg,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 1.5, py: 0.85, bgcolor: surface.headerBg, borderBottom: '1px solid', borderColor: surface.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
            Cross-RAT Diff Matrix
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
            Click any cell to jump directly to its diff view
          </Typography>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 660 }}>
            <Box component="thead" sx={{ bgcolor: surface.subtleBg }}>
              <Box component="tr">
                <Box component="th" sx={{ ...thSx, textAlign: 'left', width: 150 }}>RAT</Box>
                <Box component="th" sx={{ ...thSx, textAlign: 'left' }}>Combos (Unique / Param / Cov / Rate)</Box>
                <Box component="th" sx={{ ...thSx, textAlign: 'left' }}>Bands</Box>
                <Box component="th" sx={{ ...thSx, textAlign: 'left' }}>Features</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {perRat.map(r => (
                <Box component="tr" key={r.rat}>
                  <Box component="td" sx={{ py: 0.9, px: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: r.accentColor, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>{r.label}</Typography>
                    </Box>
                  </Box>

                  {/* Combos Cell */}
                  <Tooltip title={`Open ${r.shortLabel} Combos`} placement="top" arrow>
                    <Box
                      component="td"
                      sx={clickableCellSx}
                      onClick={() =>
                        onDrillDown({
                          rat: r.rat,
                          section: 'combos',
                          comboFilter: r.combos.diff > 0 ? 'diff' : 'all',
                        })
                      }
                    >
                      {r.combos.total === 0 ? (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            {r.combos.aOnlyUnique > 0 && (
                              <Chip size="small" label={`A:${r.combos.aOnlyUnique}`} sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(33,150,243,0.14)', color: DEVICE_COLOR.deviceA }} />
                            )}
                            {r.combos.bOnlyUnique > 0 && (
                              <Chip size="small" label={`B:${r.combos.bOnlyUnique}`} sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(20,184,166,0.14)', color: DEVICE_COLOR.deviceB }} />
                            )}
                            {r.combos.exactChanged > 0 && (
                              <Chip size="small" label={`Δ:${r.combos.exactChanged}`} sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(245,158,11,0.14)', color: STATUS_COLOR.amber }} />
                            )}
                            {r.combos.covered > 0 && (
                              <Chip size="small" label={`↑:${r.combos.covered}`} sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(99,102,241,0.14)', color: STATUS_COLOR.indigo }} />
                            )}
                            {r.combos.diff === 0 && (
                              <Chip size="small" label={`✓ ${r.combos.total}`} sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(16,185,129,0.12)', color: STATUS_COLOR.green }} />
                            )}
                            <Typography variant="caption" sx={{ fontSize: '0.62rem', fontFamily: MONO_FONT_FAMILY, color: 'text.disabled' }}>
                              {r.combos.coverageAtoB.percent}% / {r.combos.coverageBtoA.percent}%
                            </Typography>
                          </Box>
                          <ArrowForwardIcon className="jump-arrow" sx={{ fontSize: 13, color: 'text.secondary', flexShrink: 0 }} />
                        </Box>
                      )}
                    </Box>
                  </Tooltip>

                  {/* Bands Cell */}
                  <Tooltip title={`Open ${r.shortLabel} Bands`} placement="top" arrow>
                    <Box
                      component="td"
                      sx={clickableCellSx}
                      onClick={() =>
                        onDrillDown({
                          rat: r.rat,
                          section: 'bands',
                          bandFilter: r.bands.diff > 0 ? 'diff' : 'all',
                        })
                      }
                    >
                      {r.bands.total === 0 ? (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            {r.bands.changed > 0 && (
                              <Chip size="small" label={`Δ:${r.bands.changed}`} sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(245,158,11,0.14)', color: STATUS_COLOR.amber }} />
                            )}
                            {r.bands.aOnly > 0 && (
                              <Chip size="small" label={`A+${r.bands.aOnly}`} sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(33,150,243,0.14)', color: DEVICE_COLOR.deviceA }} />
                            )}
                            {r.bands.bOnly > 0 && (
                              <Chip size="small" label={`B+${r.bands.bOnly}`} sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(20,184,166,0.14)', color: DEVICE_COLOR.deviceB }} />
                            )}
                            {r.bands.diff === 0 && (
                              <Chip size="small" label={`✓ ${r.bands.total}`} sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(16,185,129,0.12)', color: STATUS_COLOR.green }} />
                            )}
                          </Box>
                          <ArrowForwardIcon className="jump-arrow" sx={{ fontSize: 13, color: 'text.secondary', flexShrink: 0 }} />
                        </Box>
                      )}
                    </Box>
                  </Tooltip>

                  {/* Features Cell */}
                  <Tooltip title={`Open ${r.shortLabel} Features`} placement="top" arrow>
                    <Box
                      component="td"
                      sx={clickableCellSx}
                      onClick={() =>
                        onDrillDown({
                          rat: r.rat,
                          section: 'features',
                          featureFilter: r.features.diff > 0 ? 'diff' : 'all',
                        })
                      }
                    >
                      {r.features.total === 0 ? (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            {r.features.different > 0 && (
                              <Chip size="small" label={`Δ:${r.features.different}`} sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(245,158,11,0.14)', color: STATUS_COLOR.amber }} />
                            )}
                            {r.features.aOnly > 0 && (
                              <Chip size="small" label={`A:${r.features.aOnly}`} sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(33,150,243,0.14)', color: DEVICE_COLOR.deviceA }} />
                            )}
                            {r.features.bOnly > 0 && (
                              <Chip size="small" label={`B:${r.features.bOnly}`} sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(20,184,166,0.14)', color: DEVICE_COLOR.deviceB }} />
                            )}
                            {r.features.diff === 0 && (
                              <Chip size="small" label={`✓ ${r.features.total}`} sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(16,185,129,0.12)', color: STATUS_COLOR.green }} />
                            )}
                          </Box>
                          <ArrowForwardIcon className="jump-arrow" sx={{ fontSize: 13, color: 'text.secondary', flexShrink: 0 }} />
                        </Box>
                      )}
                    </Box>
                  </Tooltip>
                </Box>
              ))}

              {/* Totals Row */}
              <Box component="tr" sx={{ bgcolor: surface.headerBg }}>
                <Box component="td" sx={{ py: 0.9, px: 1.25, fontWeight: 800, fontSize: '0.74rem' }}>
                  Total
                </Box>
                <Box component="td" sx={{ py: 0.9, px: 1.25, fontSize: '0.7rem', fontFamily: MONO_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                  {totals.combos.total} combos · {totals.combos.diff} diffs
                </Box>
                <Box component="td" sx={{ py: 0.9, px: 1.25, fontSize: '0.7rem', fontFamily: MONO_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                  {totals.bands.total} bands · {totals.bands.diff} diffs
                </Box>
                <Tooltip title="Open All Features cross-RAT view" placement="top" arrow>
                  <Box
                    component="td"
                    onClick={() => onOpenGlobalFeatures(totals.features.diff > 0 ? 'diff' : 'all')}
                    sx={{
                      py: 0.9,
                      px: 1.25,
                      fontSize: '0.7rem',
                      fontFamily: MONO_FONT_FAMILY,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'primary.main',
                      fontWeight: 700,
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {totals.features.total} features · {totals.features.diff} diffs →
                  </Box>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Section 3: Key Differences & Charts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.1fr 1fr' }, gap: 1.25 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            border: '1px solid',
            borderColor: surface.border,
            borderRadius: 2,
            bgcolor: surface.elevatedBg,
          }}
        >
          <Typography variant="caption" sx={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
            Key Differences
          </Typography>
          <Box sx={{ mt: 0.75, maxHeight: 150, overflowY: 'auto' }}>
            {compareResult.summary.keyDifferences.length === 0 ? (
              <Typography variant="caption" sx={{ fontSize: '0.74rem', color: STATUS_COLOR.green, fontWeight: 600 }}>
                No significant differences detected across RATs.
              </Typography>
            ) : (
              compareResult.summary.keyDifferences.map((d, i) => (
                <Typography key={i} variant="caption" sx={{ display: 'block', fontSize: '0.72rem', color: STATUS_COLOR.amber, mb: 0.35 }}>
                  • {d}
                </Typography>
              ))
            )}
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            border: '1px solid',
            borderColor: surface.border,
            borderRadius: 2,
            bgcolor: surface.elevatedBg,
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 185 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '0.64rem', fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
                BANDS
              </Typography>
              {bandDonutData.length > 0 ? (
                <PieChart width={80} height={80}>
                  <Pie
                    data={bandDonutData}
                    cx={40}
                    cy={40}
                    innerRadius={22}
                    outerRadius={36}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {bandDonutData.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              ) : (
                <Typography variant="caption" color="text.disabled">—</Typography>
              )}
            </Box>
            {bandDonutData.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                {bandDonutData.map(entry => (
                  <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: entry.color, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ fontSize: '0.64rem', fontFamily: MONO_FONT_FAMILY, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {entry.name} <b>{entry.value}</b>
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ fontSize: '0.64rem', fontWeight: 700, color: 'text.secondary' }}>
                COMBO DISTRIBUTION BY RAT
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                {[
                  { label: 'Exact', color: STATUS_COLOR.green },
                  { label: 'Diff', color: STATUS_COLOR.amber },
                  { label: 'Cov', color: STATUS_COLOR.indigo },
                  { label: 'Unique', color: STATUS_COLOR.red },
                ].map(item => (
                  <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '2px', bgcolor: item.color }} />
                    <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.disabled' }}>{item.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            {comboBarData.length > 0 ? (
              <Box sx={{ height: 86, minWidth: 160 }}>
                <ResponsiveContainer width="100%" height={86}>
                  <BarChart data={comboBarData} barSize={18} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <ReTooltip />
                    <Bar dataKey="Exact" stackId="a" fill={STATUS_COLOR.green} isAnimationActive={false} />
                    <Bar dataKey="Diff" stackId="a" fill={STATUS_COLOR.amber} isAnimationActive={false} />
                    <Bar dataKey="Covered" stackId="a" fill={STATUS_COLOR.indigo} isAnimationActive={false} />
                    <Bar dataKey="Unique" stackId="a" fill={STATUS_COLOR.red} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography variant="caption" color="text.disabled">No combinations</Typography>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
