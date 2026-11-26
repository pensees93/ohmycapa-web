import React from 'react';
import {
  Box, Card, CardContent, Typography, Chip, useTheme,
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, XAxis } from 'recharts';
import type { CapaCompareResult } from '@ohmycapa/capa-core';
import { DEVICE_COLOR, MONO_FONT_FAMILY, STATUS_COLOR, getWorkbenchSurface } from '../constants/statusMeta';

const RAT_LABELS: Record<string, string> = {
  nr: 'NR',
  eutra: 'EUTRA',
  'eutra-nr': 'EUTRA-NR',
  utra: 'UTRA',
};

interface CompareSummaryDashboardProps {
  result: CapaCompareResult;
}

export const CompareSummaryDashboard = React.memo<CompareSummaryDashboardProps>(({ result }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);
  const { summary, meta } = result;

  const { bandDonutData, comboBarData } = React.useMemo(() => {
    const stats = Object.values(summary.perRat).reduce(
      (acc, s) => {
        if (!s) return acc;
        return {
          shared: acc.shared + s.bands.shared,
          aOnly: acc.aOnly + s.bands.aOnly,
          bOnly: acc.bOnly + s.bands.bOnly,
          changed: acc.changed + s.bands.changed,
        };
      },
      { shared: 0, aOnly: 0, bOnly: 0, changed: 0 }
    );

    const donutData = [
      { name: 'Shared', value: Math.max(0, stats.shared - stats.changed), color: STATUS_COLOR.green },
      { name: 'Changed', value: stats.changed, color: STATUS_COLOR.amber },
      { name: 'A-only', value: stats.aOnly, color: DEVICE_COLOR.deviceA },
      { name: 'B-only', value: stats.bOnly, color: DEVICE_COLOR.deviceB },
    ].filter(d => d.value > 0);

    const barData = Object.entries(summary.perRat)
      .filter(([, s]) => s && s.combos.total > 0)
      .map(([rat, s]) => ({
        name: RAT_LABELS[rat] ?? rat,
        Exact: s!.combos.exactSame,
        Diff: s!.combos.exactChanged,
        Covered: s!.combos.aOnlyCovered + s!.combos.bOnlyCovered,
        Unique: s!.combos.aOnlyUnique + s!.combos.bOnlyUnique,
      }));

    return { bandDonutData: donutData, comboBarData: barData };
  }, [summary]);

  const { allCombosA, coveredA, allCombosB, coveredB } = Object.values(summary.perRat).reduce(
    (acc, r) => ({
      allCombosA: acc.allCombosA + (r?.coverage.aToB.total ?? 0),
      coveredA: acc.coveredA + (r?.coverage.aToB.exactMatch ?? 0) + (r?.coverage.aToB.exactChanged ?? 0) + (r?.coverage.aToB.coveredBySuperset ?? 0),
      allCombosB: acc.allCombosB + (r?.coverage.bToA.total ?? 0),
      coveredB: acc.coveredB + (r?.coverage.bToA.exactMatch ?? 0) + (r?.coverage.bToA.exactChanged ?? 0) + (r?.coverage.bToA.coveredBySuperset ?? 0),
    }),
    { allCombosA: 0, coveredA: 0, allCombosB: 0, coveredB: 0 }
  );
  const coverageRateA = allCombosA > 0 ? Math.round((coveredA / allCombosA) * 100) : 100;
  const coverageRateB = allCombosB > 0 ? Math.round((coveredB / allCombosB) * 100) : 100;

  const rateChipStyle = (pct: number) => ({
    height: 17,
    fontSize: '0.6rem',
    fontWeight: 700,
    fontFamily: MONO_FONT_FAMILY,
    bgcolor: pct >= 90 ? 'rgba(16,185,129,0.12)' : pct >= 70 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
    color: pct >= 90 ? STATUS_COLOR.green : pct >= 70 ? STATUS_COLOR.amber : STATUS_COLOR.red,
  });

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${surface.border}`,
    bgcolor: surface.elevatedBg,
    flex: 1,
    minWidth: 190,
  };

  return (
    <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
      {/* Band Match Card */}
      <Card elevation={0} sx={cardSx}>
        <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.66rem' }}>
            Bands
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            {bandDonutData.length > 0 && (
              <Box sx={{ width: 60, height: 60, flexShrink: 0 }}>
                <PieChart width={60} height={60}>
                  <Pie data={bandDonutData} cx={30} cy={30} innerRadius={17} outerRadius={27} dataKey="value" stroke="none" isAnimationActive={false}>
                    {bandDonutData.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              {Object.entries(summary.perRat).map(([rat, s]) => s && (
                <Typography key={rat} variant="caption" sx={{ display: 'block', fontSize: '0.69rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                  <b>{RAT_LABELS[rat]}</b>: {s.bands.shared}/{s.bands.shared + s.bands.aOnly + s.bands.bOnly}
                  {s.bands.aOnly > 0 && <Box component="span" sx={{ color: DEVICE_COLOR.deviceA, fontWeight: 700 }}> · A+{s.bands.aOnly}</Box>}
                  {s.bands.bOnly > 0 && <Box component="span" sx={{ color: DEVICE_COLOR.deviceB, fontWeight: 700 }}> · B+{s.bands.bOnly}</Box>}
                </Typography>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Combo Match Card */}
      <Card elevation={0} sx={{ ...cardSx, minWidth: 210 }}>
        <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.66rem' }}>
              Combos
            </Typography>
            <Chip label={`A→B ${coverageRateA}%`} size="small" sx={rateChipStyle(coverageRateA)} />
            <Chip label={`B→A ${coverageRateB}%`} size="small" sx={rateChipStyle(coverageRateB)} />
          </Box>
          {comboBarData.length > 0 ? (
            <Box sx={{ height: 64 }}>
              <ResponsiveContainer width="100%" height={64}>
                <BarChart data={comboBarData} barSize={14} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
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
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
              No combinations
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Key Differences Card */}
      <Card elevation={0} sx={{ ...cardSx, minWidth: 220 }}>
        <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.66rem' }}>
            Key Differences
          </Typography>
          <Box sx={{ mt: 0.5, maxHeight: 86, overflowY: 'auto' }}>
            {summary.keyDifferences.length === 0 ? (
              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: STATUS_COLOR.green, fontWeight: 600 }}>
                No significant differences
              </Typography>
            ) : (
              summary.keyDifferences.map((d, i) => (
                <Typography key={i} variant="caption" sx={{ display: 'block', fontSize: '0.68rem', color: STATUS_COLOR.amber, mb: 0.25 }}>
                  • {d}
                </Typography>
              ))
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Diagnostics Card */}
      <Card elevation={0} sx={cardSx}>
        <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.66rem' }}>
            Sources
          </Typography>
          {[
            { side: 'A', color: DEVICE_COLOR.deviceA, label: meta.deviceA.fileName, vendor: meta.deviceA.vendor },
            { side: 'B', color: DEVICE_COLOR.deviceB, label: meta.deviceB.fileName, vendor: meta.deviceB.vendor },
          ].map(({ side, color, label, vendor }) => (
            <Box key={side} sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
              <Typography variant="caption" sx={{ fontSize: '0.64rem', fontWeight: 800, color }}>{side}</Typography>
              <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <b>{label}</b> ({vendor})
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
});
