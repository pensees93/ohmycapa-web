import React from 'react';
import { Box, Typography, Collapse, IconButton, Tooltip, ToggleButton, ToggleButtonGroup, Button, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import type { BandDiff, ChannelBWDiff } from '@ohmycapa/capa-core';
import { SplitCell } from './SplitCell';
import { BAND_STATUS_ROW_BG as STATUS_ROW_BG, BAND_STATUS_LABELS as STATUS_LABELS } from '../constants/statusMeta';

const tdSx = { py: 0.75, px: 0.5 } as const;

const ChannelBWCell = React.memo<{ bwDiff: ChannelBWDiff | undefined }>(({ bwDiff }) => {
  const [open, setOpen] = React.useState(false);
  if (!bwDiff) return <Box sx={{ color: 'text.disabled', fontSize: '0.72rem', textAlign: 'center' }}>--</Box>;

  const scsKeys = Object.keys(bwDiff) as (keyof ChannelBWDiff)[];
  const hasChange = scsKeys.some(k => bwDiff[k]?.status !== 'same');

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', justifyContent: 'center' }} onClick={() => setOpen(v => !v)}>
        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: hasChange ? '#f59e0b' : 'text.secondary', lineHeight: 1, pt: '2px' }}>
          {scsKeys.length} SCS {hasChange ? '⚠' : '✓'}
        </Typography>
        <IconButton size="small" sx={{ p: 0 }}>
          {open ? <ExpandLessIcon sx={{ fontSize: 12 }} /> : <ExpandMoreIcon sx={{ fontSize: 12 }} />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ mt: 0.25 }}>
          {scsKeys.map(scs => {
            const d = bwDiff[scs];
            if (!d) return null;
            return (
              <Box key={scs} sx={{ mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: '0.64rem', color: 'text.disabled', display: 'block' }}>{scs}</Typography>
                <SplitCell diff={d} format={arr => arr.join(',')} />
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
});

const NrParamsCell = React.memo<{ bd: BandDiff }>(({ bd }) => {
  const [open, setOpen] = React.useState(false);
  const diffs = [
    { label: 'mTCI', prop: bd.multipleTCI, format: (v: any) => v ? '✓' : '--' },
    { label: 'BWP WR', prop: bd.bwpWithoutRestriction, format: (v: any) => v ? '✓' : '--' },
    { label: 'BWP SN', prop: bd.bwpSameNumerology },
    { label: 'UL DC', prop: bd.maxUplinkDutyCycle },
    { label: 'π2 BPSK', prop: bd.powerBoostingPi2BPSK, format: (v: any) => v ? '✓' : '--' }
  ].filter(d => Boolean(d.prop));

  if (diffs.length === 0) return <Box sx={{ color: 'text.disabled', fontSize: '0.72rem', textAlign: 'center' }}>--</Box>;

  const hasChange = diffs.some(d => d.prop && d.prop.status !== 'same');

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', justifyContent: 'center' }} onClick={() => setOpen(v => !v)}>
        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: hasChange ? '#f59e0b' : 'text.secondary', whiteSpace: 'nowrap', lineHeight: 1, pt: '2px' }}>
          {diffs.length} Params {hasChange ? '⚠' : '✓'}
        </Typography>
        <IconButton size="small" sx={{ p: 0 }}>
          {open ? <ExpandLessIcon sx={{ fontSize: 12 }} /> : <ExpandMoreIcon sx={{ fontSize: 12 }} />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ mt: 0.25, display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
          {diffs.map(d => (
            <Box key={d.label} sx={{ textAlign: 'center' }}>
              <Tooltip title={NR_PARAMS_DESC[d.label] || d.label} arrow placement="left">
                <Typography variant="caption" sx={{ fontSize: '0.64rem', color: 'text.disabled', display: 'block', mb: 0.25, cursor: 'help' }}>
                  {d.label}
                </Typography>
              </Tooltip>
              <SplitCell diff={d.prop} format={d.format} />
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
});

const NR_PARAMS_DESC: Record<string, string> = {
  'mTCI': 'Multiple TCI support (multipleTCI)',
  'BWP WR': 'BWP operation without bandwidth restriction (bwp-WithoutRestriction)',
  'BWP SN': 'BWP adaptation with same numerology support (bwp-SameNumerology)',
  'UL DC': 'Max uplink duty cycle for PC2 FR1 (maxUplinkDutyCycle-PC2-FR1)',
  'π2 BPSK': 'Power boosting with pi/2 BPSK (powerBoosting-pi2BPSK)'
};

interface BandCompareTableProps {
  bandDiffs: BandDiff[];
  ratType: 'nr' | 'eutra' | 'eutra-nr' | 'utra';
}

export const BandCompareTable = React.memo<BandCompareTableProps>(({
  bandDiffs, ratType,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const isNR = ratType === 'nr';
  const isEutra = ratType === 'eutra' || ratType === 'eutra-nr';

  const diffCount = React.useMemo(
    () => bandDiffs.filter(bd => bd.status !== 'same').length,
    [bandDiffs]
  );
  const [userFilter, setUserFilter] = React.useState<'diff' | 'all' | null>(null);
  const filter = userFilter ?? (diffCount > 0 ? 'diff' : 'all');

  const displayedBands = React.useMemo(
    () => (filter === 'diff' ? bandDiffs.filter(bd => bd.status !== 'same') : bandDiffs),
    [bandDiffs, filter]
  );
  const hiddenCount = bandDiffs.length - displayedBands.length;

  const thSx = {
    py: 0.75, px: 1,
    fontSize: '0.68rem',
    fontWeight: 700,
    color: 'text.secondary',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
    borderBottom: '1px solid',
    borderColor: 'divider',
  };

  return (
    <Box>
      {/* Sticky Diff Only / All filter toolbar */}
      {bandDiffs.length > 0 && (
        <Box sx={{
          position: 'sticky',
          top: -12,
          zIndex: 5,
          pt: 1.5,
          pb: 0.75,
          mx: -1.5,
          px: 1.5,
          mb: 1,
          bgcolor: isDark ? 'rgba(24,24,27,0.92)' : 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
        }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filter}
            onChange={(_, v) => v && setUserFilter(v)}
            sx={{ '& .MuiToggleButton-root': { py: 0.2, px: 0.75, fontSize: '0.64rem', textTransform: 'none', minHeight: 24 } }}
          >
            <ToggleButton value="diff">Diff Only ({diffCount})</ToggleButton>
            <ToggleButton value="all">All ({bandDiffs.length})</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: diffCount === 0 ? '#10b981' : 'text.disabled' }}>
            {diffCount === 0
              ? `All ${bandDiffs.length} bands match identically`
              : hiddenCount > 0
                ? `${hiddenCount} identical bands hidden`
                : `Showing all ${bandDiffs.length} bands`}
          </Typography>
        </Box>
      )}

      {displayedBands.length === 0 && filter === 'diff' && bandDiffs.length > 0 ? (
        <Box sx={{
          py: 3, px: 2, textAlign: 'center', borderRadius: 2,
          border: '1px solid rgba(16,185,129,0.25)', bgcolor: 'rgba(16,185,129,0.05)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
        }}>
          <CheckCircleOutlinedIcon sx={{ fontSize: 26, color: '#10b981' }} />
          <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600 }}>
            All {bandDiffs.length} bands match identically
          </Typography>
          <Button size="small" variant="outlined" onClick={() => setUserFilter('all')} sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
            Show All ({bandDiffs.length})
          </Button>
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ ...thSx, textAlign: 'left', width: 60 }}>Band</Box>
                {isNR && <Box component="th" sx={thSx}>Power Class</Box>}
                {isEutra && <Box component="th" sx={thSx}>Half-Duplex</Box>}
                <Box component="th" sx={thSx}>DL MIMO</Box>
                <Box component="th" sx={thSx}>UL MIMO</Box>
                <Box component="th" sx={thSx}>DL QAM</Box>
                <Box component="th" sx={thSx}>UL QAM</Box>
                {isEutra && <Box component="th" sx={thSx}>NC-UL-RA</Box>}
                {isNR && <Box component="th" sx={{ ...thSx, minWidth: 100 }}>Ch.BW DL</Box>}
                {isNR && <Box component="th" sx={{ ...thSx, minWidth: 100 }}>Ch.BW UL</Box>}
                {isNR && <Box component="th" sx={{ ...thSx, minWidth: 80 }}>NR Params</Box>}
                <Box component="th" sx={{ ...thSx, width: 32 }}>St</Box>
              </Box>
              {/* Sub-header A/B indicator */}
              <Box component="tr" sx={{ bgcolor: 'transparent' }}>
                <Box component="th" sx={{ ...thSx, fontSize: '0.6rem', borderBottom: '2px solid', borderColor: 'divider' }} />
                {[
                  ...(isNR ? ['Power Class'] : []),
                  ...(isEutra ? ['Half-Duplex'] : []),
                  'DL MIMO', 'UL MIMO', 'DL QAM', 'UL QAM',
                  ...(isEutra ? ['NC-UL-RA'] : []),
                  ...(isNR ? ['Ch.BW DL', 'Ch.BW UL', 'NR Params'] : []),
                ].map((_, i) => (
                  <Box key={i} component="th" sx={{ ...thSx, fontSize: '0.6rem', color: 'text.disabled', borderBottom: '2px solid', borderColor: 'divider' }}>
                    A / B
                  </Box>
                ))}
                <Box component="th" sx={{ ...thSx, fontSize: '0.6rem', borderBottom: '2px solid', borderColor: 'divider' }} />
              </Box>
            </Box>
            <Box component="tbody">
              {displayedBands.map(bd => (
                <BandRow key={bd.band} bd={bd} isNR={isNR} isEutra={isEutra} />
              ))}
              {displayedBands.length === 0 && (
                <Box component="tr">
                  <Box component="td" colSpan={12} sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: '0.8rem' }}>
                    No band data
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
});

interface BandRowProps {
  bd: BandDiff;
  isNR: boolean;
  isEutra: boolean;
}

const BandRow = React.memo<BandRowProps>(({ bd, isNR, isEutra }) => {
  const statusInfo = STATUS_LABELS[bd.status] ?? STATUS_LABELS.same;
  return (
    <Box
      component="tr"
      sx={{
        bgcolor: STATUS_ROW_BG[bd.status] ?? 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box component="td" sx={{ py: 0.75, px: 1, fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
        {bd.displayName}
      </Box>
      {isNR && (
        <Box component="td" sx={tdSx}>
          <SplitCell diff={bd.powerClass} />
        </Box>
      )}
      {isEutra && (
        <Box component="td" sx={tdSx}>
          <SplitCell diff={bd.halfDuplex} format={v => v ? 'TDD' : 'FDD'} />
        </Box>
      )}
      <Box component="td" sx={tdSx}>
        <SplitCell diff={bd.dlMimo} format={v => `${v}x${v}`} />
      </Box>
      <Box component="td" sx={tdSx}>
        <SplitCell diff={bd.ulMimo} format={v => `${v}x${v}`} />
      </Box>
      <Box component="td" sx={tdSx}>
        <SplitCell diff={bd.dlQam} />
      </Box>
      <Box component="td" sx={tdSx}>
        <SplitCell diff={bd.ulQam} />
      </Box>
      {isEutra && (
        <Box component="td" sx={tdSx}>
          <SplitCell diff={bd.nonContiguousULRA} format={v => v ? '✓' : '--'} />
        </Box>
      )}
      {isNR && (
        <Box component="td" sx={tdSx}>
          <ChannelBWCell bwDiff={bd.channelBWsDL} />
        </Box>
      )}
      {isNR && (
        <Box component="td" sx={tdSx}>
          <ChannelBWCell bwDiff={bd.channelBWsUL} />
        </Box>
      )}
      {isNR && (
        <Box component="td" sx={{ py: 0.75, px: 0.5, verticalAlign: 'top' }}>
          <NrParamsCell bd={bd} />
        </Box>
      )}
      <Box component="td" sx={{ py: 0.75, px: 0.5, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: statusInfo.color }}>
          {statusInfo.label}
        </Typography>
      </Box>
    </Box>
  );
});
