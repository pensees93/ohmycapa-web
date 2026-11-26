import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import {
  Box, Typography, Collapse, IconButton, Tooltip, ToggleButton, ToggleButtonGroup,
  Button, TextField, InputAdornment, Chip, useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import type { BandDiff, ChannelBWDiff, RatType } from '@ohmycapa/capa-core';
import { SplitCell } from './SplitCell';
import {
  BAND_STATUS_ROW_BG as STATUS_ROW_BG,
  BAND_STATUS_LABELS as STATUS_LABELS,
  DEVICE_COLOR,
  MONO_FONT_FAMILY,
  STATUS_COLOR,
  getWorkbenchSurface,
} from '../constants/statusMeta';
import type { BandFilterKey } from '../utils/compareMetrics';
import { shortenDeviceName } from './featureRenderHelpers';

const tdSx = { py: 0.75, px: 0.5 } as const;

const ChannelBWCell = React.memo<{ bwDiff: ChannelBWDiff | undefined }>(({ bwDiff }) => {
  const [open, setOpen] = useState(false);
  if (!bwDiff) return <Box sx={{ color: 'text.disabled', fontSize: '0.72rem', textAlign: 'center' }}>--</Box>;

  const scsKeys = Object.keys(bwDiff) as (keyof ChannelBWDiff)[];
  const hasChange = scsKeys.some(k => bwDiff[k]?.status !== 'same');

  return (
    <Box>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', justifyContent: 'center' }}
        onClick={() => setOpen(v => !v)}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.7rem',
            fontFamily: MONO_FONT_FAMILY,
            fontVariantNumeric: 'tabular-nums',
            color: hasChange ? STATUS_COLOR.amber : 'text.secondary',
            lineHeight: 1,
            pt: '2px',
          }}
        >
          {scsKeys.length} SCS {hasChange ? 'Δ' : '✓'}
        </Typography>
        <IconButton size="small" sx={{ p: 0 }} aria-label="Toggle channel bandwidths">
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
                <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled', display: 'block' }}>{scs}</Typography>
                <SplitCell diff={d} format={arr => arr.join(',')} />
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
});

const NR_PARAMS_DESC: Record<string, string> = {
  mTCI: 'Multiple TCI support (multipleTCI)',
  'BWP WR': 'BWP operation without bandwidth restriction (bwp-WithoutRestriction)',
  'BWP SN': 'BWP adaptation with same numerology support (bwp-SameNumerology)',
  'UL DC': 'Max uplink duty cycle for PC2 FR1 (maxUplinkDutyCycle-PC2-FR1)',
  'π2 BPSK': 'Power boosting with pi/2 BPSK (powerBoosting-pi2BPSK)',
};

const NrParamsCell = React.memo<{ bd: BandDiff }>(({ bd }) => {
  const [open, setOpen] = useState(false);
  const diffs = [
    { label: 'mTCI', prop: bd.multipleTCI, format: (v: boolean) => (v ? '✓' : '--') },
    { label: 'BWP WR', prop: bd.bwpWithoutRestriction, format: (v: boolean) => (v ? '✓' : '--') },
    { label: 'BWP SN', prop: bd.bwpSameNumerology },
    { label: 'UL DC', prop: bd.maxUplinkDutyCycle },
    { label: 'π2 BPSK', prop: bd.powerBoostingPi2BPSK, format: (v: boolean) => (v ? '✓' : '--') },
  ].filter(d => Boolean(d.prop));

  if (diffs.length === 0) return <Box sx={{ color: 'text.disabled', fontSize: '0.72rem', textAlign: 'center' }}>--</Box>;

  const hasChange = diffs.some(d => d.prop && d.prop.status !== 'same');

  return (
    <Box>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', justifyContent: 'center' }}
        onClick={() => setOpen(v => !v)}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.7rem',
            fontFamily: MONO_FONT_FAMILY,
            fontVariantNumeric: 'tabular-nums',
            color: hasChange ? STATUS_COLOR.amber : 'text.secondary',
            whiteSpace: 'nowrap',
            lineHeight: 1,
            pt: '2px',
          }}
        >
          {diffs.length} Params {hasChange ? 'Δ' : '✓'}
        </Typography>
        <IconButton size="small" sx={{ p: 0 }} aria-label="Toggle NR parameters">
          {open ? <ExpandLessIcon sx={{ fontSize: 12 }} /> : <ExpandMoreIcon sx={{ fontSize: 12 }} />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ mt: 0.25, display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
          {diffs.map(d => (
            <Box key={d.label} sx={{ textAlign: 'center' }}>
              <Tooltip title={NR_PARAMS_DESC[d.label] || d.label} arrow placement="left">
                <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled', display: 'block', mb: 0.25, cursor: 'help' }}>
                  {d.label}
                </Typography>
              </Tooltip>
              <SplitCell diff={d.prop as never} format={d.format as never} />
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
});

export interface BandCompareTableProps {
  bandDiffs: BandDiff[];
  ratType: RatType;
  deviceAName?: string;
  deviceBName?: string;
  initialFilter?: BandFilterKey;
  filterVersion?: number;
}

export const BandCompareTable = React.memo<BandCompareTableProps>(({
  bandDiffs,
  ratType,
  deviceAName,
  deviceBName,
  initialFilter,
  filterVersion,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);
  const isNR = ratType === 'nr';
  const isEutra = ratType === 'eutra';
  const isMrdc = ratType === 'eutra-nr';
  const isUtra = ratType === 'utra';
  const showHalfDuplex = isEutra || isMrdc;
  const showMimoQam = !isUtra;
  const showNcUlRa = isEutra || isMrdc;
  const showNrCols = isNR || isMrdc;

  const counts = useMemo(() => {
    let diff = 0;
    let aOnly = 0;
    let bOnly = 0;
    for (const bd of bandDiffs) {
      if (bd.status !== 'same') diff++;
      if (bd.status === 'a-only') aOnly++;
      else if (bd.status === 'b-only') bOnly++;
    }
    return { diff, aOnly, bOnly };
  }, [bandDiffs]);

  const [userFilter, setUserFilter] = useState<BandFilterKey | null>(initialFilter ?? null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (filterVersion !== undefined && initialFilter) {
      setUserFilter(initialFilter);
    }
  }, [filterVersion, initialFilter]);

  const filter: BandFilterKey = userFilter ?? (counts.diff > 0 ? 'diff' : 'all');

  const displayedBands = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return bandDiffs.filter(bd => {
      if (filter === 'diff' && bd.status === 'same') return false;
      if (filter === 'a-only' && bd.status !== 'a-only') return false;
      if (filter === 'b-only' && bd.status !== 'b-only') return false;

      if (!q) return true;
      const haystack = [
        bd.displayName,
        String(bd.band),
        bd.powerClass?.a ?? '',
        bd.powerClass?.b ?? '',
        bd.dlMimo?.a ? `${bd.dlMimo.a}x${bd.dlMimo.a}` : '',
        bd.dlMimo?.b ? `${bd.dlMimo.b}x${bd.dlMimo.b}` : '',
        bd.dlQam?.a ?? '',
        bd.dlQam?.b ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [bandDiffs, filter, deferredSearch]);

  const shortA = useMemo(() => shortenDeviceName(deviceAName, 'Device A'), [deviceAName]);
  const shortB = useMemo(() => shortenDeviceName(deviceBName, 'Device B'), [deviceBName]);

  const thSx = {
    py: 0.75,
    px: 1,
    fontSize: '0.67rem',
    fontWeight: 700,
    color: 'text.secondary',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
    borderBottom: '1px solid',
    borderColor: surface.border,
  };

  const paramCols = [
    'Power Class',
    ...(showHalfDuplex ? ['Half-Duplex'] : []),
    ...(showMimoQam ? ['DL MIMO', 'UL MIMO', 'DL QAM', 'UL QAM'] : []),
    ...(showNcUlRa ? ['NC-UL-RA'] : []),
    ...(showNrCols ? ['Ch.BW DL', 'Ch.BW UL', 'NR Params'] : []),
  ];

  return (
    <Box>
      {/* Sticky Filter + Search + A/B Legend Toolbar */}
      {bandDiffs.length > 0 && (
        <Box
          sx={{
            position: 'sticky',
            top: -12,
            zIndex: 5,
            pt: 1.25,
            pb: 0.75,
            mx: -1.5,
            px: 1.5,
            mb: 1,
            bgcolor: surface.toolbarBg,
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid',
            borderColor: surface.border,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search band, PC, MIMO..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.2 }} aria-label="Clear band search">
                        <CloseIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                  sx: { fontSize: '0.73rem', height: 26 },
                },
              }}
              sx={{ width: { xs: '100%', sm: 185 } }}
            />

            <ToggleButtonGroup
              size="small"
              exclusive
              value={filter}
              onChange={(_, v) => v && setUserFilter(v)}
              sx={{ '& .MuiToggleButton-root': { py: 0.2, px: 0.75, fontSize: '0.64rem', textTransform: 'none', minHeight: 24 } }}
            >
              <ToggleButton value="diff">Diff ({counts.diff})</ToggleButton>
              <ToggleButton value="a-only" sx={{ color: DEVICE_COLOR.deviceA }}>A-only ({counts.aOnly})</ToggleButton>
              <ToggleButton value="b-only" sx={{ color: DEVICE_COLOR.deviceB }}>B-only ({counts.bOnly})</ToggleButton>
              <ToggleButton value="all">All ({bandDiffs.length})</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label={`A · ${shortA}`}
              sx={{
                height: 19,
                fontSize: '0.62rem',
                fontWeight: 700,
                color: DEVICE_COLOR.deviceA,
                bgcolor: surface.laneABg,
                border: `1px solid ${surface.laneABorder}`,
              }}
            />
            <Chip
              size="small"
              label={`B · ${shortB}`}
              sx={{
                height: 19,
                fontSize: '0.62rem',
                fontWeight: 700,
                color: DEVICE_COLOR.deviceB,
                bgcolor: surface.laneBBg,
                border: `1px solid ${surface.laneBBorder}`,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.65rem',
                fontFamily: MONO_FONT_FAMILY,
                fontVariantNumeric: 'tabular-nums',
                color: counts.diff === 0 ? STATUS_COLOR.green : 'text.disabled',
              }}
            >
              {displayedBands.length}/{bandDiffs.length}
            </Typography>
          </Box>
        </Box>
      )}

      {displayedBands.length === 0 && filter === 'diff' && counts.diff === 0 && bandDiffs.length > 0 && !deferredSearch.trim() ? (
        <Box
          sx={{
            py: 3,
            px: 2,
            textAlign: 'center',
            borderRadius: 2,
            border: '1px solid rgba(16,185,129,0.25)',
            bgcolor: 'rgba(16,185,129,0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CheckCircleOutlinedIcon sx={{ fontSize: 26, color: STATUS_COLOR.green }} />
          <Typography variant="body2" sx={{ color: STATUS_COLOR.green, fontWeight: 600 }}>
            All {bandDiffs.length} bands match identically
          </Typography>
          <Button size="small" variant="outlined" onClick={() => setUserFilter('all')} sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
            Show All ({bandDiffs.length})
          </Button>
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: surface.border, borderRadius: 2, bgcolor: surface.panelBg }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <Box component="thead" sx={{ bgcolor: surface.headerBg }}>
              <Box component="tr">
                <Box component="th" sx={{ ...thSx, textAlign: 'left', width: 68 }}>Band</Box>
                <Box component="th" sx={thSx}>Power Class</Box>
                {showHalfDuplex && <Box component="th" sx={thSx}>Half-Duplex</Box>}
                {showMimoQam && (
                  <>
                    <Box component="th" sx={thSx}>DL MIMO</Box>
                    <Box component="th" sx={thSx}>UL MIMO</Box>
                    <Box component="th" sx={thSx}>DL QAM</Box>
                    <Box component="th" sx={thSx}>UL QAM</Box>
                  </>
                )}
                {showNcUlRa && <Box component="th" sx={thSx}>NC-UL-RA</Box>}
                {showNrCols && <Box component="th" sx={{ ...thSx, minWidth: 100 }}>Ch.BW DL</Box>}
                {showNrCols && <Box component="th" sx={{ ...thSx, minWidth: 100 }}>Ch.BW UL</Box>}
                {showNrCols && <Box component="th" sx={{ ...thSx, minWidth: 80 }}>NR Params</Box>}
                <Box component="th" sx={{ ...thSx, width: 34 }}>St</Box>
              </Box>
              {/* Sub-header A / B color indicator */}
              <Box component="tr">
                <Box component="th" sx={{ ...thSx, py: 0.35, fontSize: '0.58rem', borderBottom: '2px solid', borderColor: surface.border }} />
                {paramCols.map(col => (
                  <Box
                    key={col}
                    component="th"
                    sx={{ ...thSx, py: 0.35, fontSize: '0.58rem', borderBottom: '2px solid', borderColor: surface.border }}
                  >
                    <Box component="span" sx={{ color: DEVICE_COLOR.deviceA, fontWeight: 800 }}>A</Box>
                    <Box component="span" sx={{ color: 'text.disabled', mx: 0.4 }}>/</Box>
                    <Box component="span" sx={{ color: DEVICE_COLOR.deviceB, fontWeight: 800 }}>B</Box>
                  </Box>
                ))}
                <Box component="th" sx={{ ...thSx, py: 0.35, fontSize: '0.58rem', borderBottom: '2px solid', borderColor: surface.border }} />
              </Box>
            </Box>
            <Box component="tbody">
              {displayedBands.map(bd => (
                <BandRow
                  key={bd.ratType ? `${bd.ratType}:${bd.band}` : bd.displayName}
                  bd={bd}
                  isMrdc={isMrdc}
                  showHalfDuplex={showHalfDuplex}
                  showMimoQam={showMimoQam}
                  showNcUlRa={showNcUlRa}
                  showNrCols={showNrCols}
                />
              ))}
              {displayedBands.length === 0 && (
                <Box component="tr">
                  <Box component="td" colSpan={12} sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: '0.8rem' }}>
                    {bandDiffs.length === 0 ? 'No band data' : 'No bands match the current filter'}
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
  isMrdc: boolean;
  showHalfDuplex: boolean;
  showMimoQam: boolean;
  showNcUlRa: boolean;
  showNrCols: boolean;
}

const BandRow = React.memo<BandRowProps>(({
  bd, isMrdc, showHalfDuplex, showMimoQam, showNcUlRa, showNrCols,
}) => {
  const statusInfo = STATUS_LABELS[bd.status] ?? STATUS_LABELS.same;
  const isRowNr = bd.ratType ? bd.ratType === 'nr' : bd.displayName.startsWith('n');
  const naCell = (
    <Box sx={{ color: 'text.disabled', fontSize: '0.72rem', textAlign: 'center' }}>--</Box>
  );
  return (
    <Box
      component="tr"
      sx={{
        bgcolor: STATUS_ROW_BG[bd.status] ?? 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box
        component="td"
        sx={{
          py: 0.75,
          px: 1,
          fontWeight: 700,
          fontSize: '0.78rem',
          fontFamily: MONO_FONT_FAMILY,
          whiteSpace: 'nowrap',
        }}
      >
        {bd.displayName}
      </Box>
      <Box component="td" sx={tdSx}>
        <SplitCell diff={bd.powerClass} />
      </Box>
      {showHalfDuplex && (
        <Box component="td" sx={tdSx}>
          {isMrdc && isRowNr ? naCell : <SplitCell diff={bd.halfDuplex} format={v => (v ? 'TDD' : 'FDD')} />}
        </Box>
      )}
      {showMimoQam && (
        <>
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
        </>
      )}
      {showNcUlRa && (
        <Box component="td" sx={tdSx}>
          {isMrdc && isRowNr ? naCell : <SplitCell diff={bd.nonContiguousULRA} format={v => (v ? '✓' : '--')} />}
        </Box>
      )}
      {showNrCols && (
        <>
          <Box component="td" sx={tdSx}>
            {isMrdc && !isRowNr ? naCell : <ChannelBWCell bwDiff={bd.channelBWsDL} />}
          </Box>
          <Box component="td" sx={tdSx}>
            {isMrdc && !isRowNr ? naCell : <ChannelBWCell bwDiff={bd.channelBWsUL} />}
          </Box>
          <Box component="td" sx={{ py: 0.75, px: 0.5, verticalAlign: 'top' }}>
            {isMrdc && !isRowNr ? naCell : <NrParamsCell bd={bd} />}
          </Box>
        </>
      )}
      <Box component="td" sx={{ py: 0.75, px: 0.5, textAlign: 'center' }}>
        <Chip
          size="small"
          label={statusInfo.label}
          sx={{
            height: 18,
            minWidth: 22,
            fontSize: '0.66rem',
            fontWeight: 800,
            fontFamily: MONO_FONT_FAMILY,
            color: statusInfo.color,
            bgcolor: `${statusInfo.color}18`,
            '& .MuiChip-label': { px: 0.5 },
          }}
        />
      </Box>
    </Box>
  );
});
