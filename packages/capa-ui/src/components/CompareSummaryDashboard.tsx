import React from 'react';
import {
  Box, Card, CardContent, Typography, Chip, useTheme,
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, XAxis } from 'recharts';
import type { CapaCompareResult } from '@ohmycapa/capa-core';

const RAT_LABELS: Record<string, string> = {
  nr: 'NR', eutra: 'EUTRA', 'eutra-nr': 'EUTRA-NR', utra: 'UTRA',
};

interface CompareSummaryDashboardProps {
  result: CapaCompareResult;
}

export const CompareSummaryDashboard = React.memo<CompareSummaryDashboardProps>(({ result }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { summary, meta } = result;

  // ── Memoized derived data calculations ────────────────────────────────────
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
      { name: 'Shared', value: stats.shared - stats.changed, color: '#10b981' },
      { name: 'Changed', value: stats.changed, color: '#f59e0b' },
      { name: `A-only`, value: stats.aOnly, color: '#ef4444' },
      { name: `B-only`, value: stats.bOnly, color: '#6366f1' },
    ].filter(d => d.value > 0);

    const barData = Object.entries(summary.perRat)
      .filter(([, s]) => s && (s.combos.total > 0))
      .map(([rat, s]) => ({
        name: RAT_LABELS[rat] ?? rat,
        Exact: (s!.combos.exactSame + s!.combos.exactChanged),
        Covered: (s!.combos.aOnlyCovered + s!.combos.bOnlyCovered),
        Unique: (s!.combos.aOnlyUnique + s!.combos.bOnlyUnique),
      }));

    return { bandDonutData: donutData, comboBarData: barData };
  }, [summary]);

  // ── Coverage rate across all RATs ────────────────────────────────────────
  const { allCombosA, coveredA } = Object.values(summary.perRat).reduce(
    (acc, r) => ({
      allCombosA: acc.allCombosA + (r?.coverage.aToB.total ?? 0),
      coveredA: acc.coveredA + (r?.coverage.aToB.exactMatch ?? 0) + (r?.coverage.aToB.exactChanged ?? 0) + (r?.coverage.aToB.coveredBySuperset ?? 0),
    }),
    { allCombosA: 0, coveredA: 0 }
  );
  const coverageRateA = allCombosA > 0 ? Math.round((coveredA / allCombosA) * 100) : 100;

  // ── Diagnostics ──────────────────────────────────────────────────────────

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'}`,
    bgcolor: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.03)',
    boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
    backdropFilter: 'blur(10px)',
    flex: 1,
    minWidth: 0,
  };

  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
      {/* ── Band Match Card ─────────────────────────────────────── */}
      <Card elevation={0} sx={cardSx}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem' }}>
            Bands
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            {bandDonutData.length > 0 ? (
              <Box sx={{ width: 60, height: 60 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={bandDonutData} cx="50%" cy="50%" innerRadius={18} outerRadius={28} dataKey="value" stroke="none">
                      {bandDonutData.map(entry => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            ) : null}
            <Box>
              {Object.entries(summary.perRat).map(([rat, s]) => s && (
                <Typography key={rat} variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: 'text.secondary' }}>
                  <b>{RAT_LABELS[rat]}</b>: {s.bands.shared}/{s.bands.shared + s.bands.aOnly + s.bands.bOnly} match
                  {s.bands.aOnly > 0 ? ` · A+${s.bands.aOnly}` : ''}
                  {s.bands.bOnly > 0 ? ` · B+${s.bands.bOnly}` : ''}
                </Typography>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── Combo Match Card ────────────────────────────────────── */}
      <Card elevation={0} sx={{ ...cardSx, minWidth: 200 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem' }}>
              Combos
            </Typography>
            <Chip
              label={`A→B ${coverageRateA}%`}
              size="small"
              sx={{
                height: 16, fontSize: '0.62rem', fontWeight: 700,
                bgcolor: coverageRateA >= 90 ? 'rgba(16,185,129,0.12)' : coverageRateA >= 70 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                color: coverageRateA >= 90 ? '#10b981' : coverageRateA >= 70 ? '#f59e0b' : '#ef4444',
              }}
            />
          </Box>
          {comboBarData.length > 0 ? (
            <Box sx={{ height: 65 }}>
              <ResponsiveContainer>
                <BarChart data={comboBarData} barSize={14} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <ReTooltip />
                  <Bar dataKey="Exact" stackId="a" fill="#10b981" />
                  <Bar dataKey="Covered" stackId="a" fill="#6366f1" />
                  <Bar dataKey="Unique" stackId="a" fill="#ef4444" />
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

      {/* ── Key Differences Card ────────────────────────────────── */}
      <Card elevation={0} sx={{ ...cardSx, minWidth: 220 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem' }}>
            Key Differences
          </Typography>
          <Box sx={{ mt: 0.5, maxHeight: 90, overflowY: 'auto' }}>
            {summary.keyDifferences.length === 0 ? (
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                No significant differences
              </Typography>
            ) : (
              summary.keyDifferences.map((d, i) => (
                <Typography key={i} variant="caption" sx={{ display: 'block', fontSize: '0.68rem', color: '#f59e0b', mb: 0.25 }}>
                  • {d}
                </Typography>
              ))
            )}
          </Box>
        </CardContent>
      </Card>

      {/* ── Diagnostics Card ────────────────────────────────────── */}
      <Card elevation={0} sx={cardSx}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem' }}>
            Diagnostics
          </Typography>
          {[
            { label: meta.deviceA.fileName, vendor: meta.deviceA.vendor },
            { label: meta.deviceB.fileName, vendor: meta.deviceB.vendor },
          ].map(({ label, vendor }) => (
            <Box key={label} sx={{ mt: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                <b>{label}</b> ({vendor})
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
});
