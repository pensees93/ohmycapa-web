import React, { useState, useCallback, useDeferredValue, memo, useMemo } from 'react';
import {
  Box, Typography, Chip, Paper, Tabs, Tab, Divider,
  useTheme, Collapse, Checkbox, FormControlLabel, IconButton, Tooltip,
  TextField, InputAdornment,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import { exportSingleDeviceToExcelCompat } from '../utils/tauriExportUtils';
import { getBwClassCcCount, generateCombinationKey } from '@ohmycapa/capa-core';
import type { CompareFormat, RatType, NRBandInfo, EutraBandInfo, BandCombination, BandParameter, ComboDisplayOptions } from '@ohmycapa/capa-core';
import { renderComboKey } from './comboKeyRenderer';
import { SingleDeviceFeaturesView } from './FeaturesCompareView';
import { BandFilterChips } from './BandFilterChips';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RAT_TABS: { value: RatType; label: string }[] = [
  { value: 'nr',       label: 'NR (5G)'        },
  { value: 'eutra',    label: 'EUTRA (LTE)'    },
  { value: 'eutra-nr', label: 'EUTRA-NR (MRDC)'},
  { value: 'utra',     label: 'UTRA (3G)'      },
];


// ─── Band table ───────────────────────────────────────────────────────────────

const SCS_KEYS = ['scs-15kHz', 'scs-30kHz', 'scs-60kHz', 'scs-120kHz'] as const;

const NR_PARAMS_DESC: Record<string, string> = {
  'mTCI': 'Multiple TCI support (multipleTCI)',
  'BWP WR': 'BWP operation without bandwidth restriction (bwp-WithoutRestriction)',
  'BWP SN': 'BWP adaptation with same numerology support (bwp-SameNumerology)',
  'UL DC': 'Max uplink duty cycle for PC2 FR1 (maxUplinkDutyCycle-PC2-FR1)',
  'π2 BPSK': 'Power boosting with pi/2 BPSK (powerBoosting-pi2BPSK)'
};

const SingleBwCell = memo<{ bw: NRBandInfo['channelBWsDL'] }>(({ bw }) => {
  const [open, setOpen] = useState(false);
  if (!bw) return <Box sx={{ color: 'text.disabled', fontSize: '0.72rem', textAlign: 'center' }}>--</Box>;
  const numSort = (a: string, b: string) => parseInt(a) - parseInt(b);
  const present = SCS_KEYS.filter(k => bw[k]?.length);
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', justifyContent: 'center' }} onClick={() => setOpen(v => !v)}>
        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', lineHeight: 1, pt: '2px' }}>
          {present.length} SCS ✓
        </Typography>
        <IconButton size="small" sx={{ p: 0 }}>
          {open ? <ExpandLessIcon sx={{ fontSize: 12 }} /> : <ExpandMoreIcon sx={{ fontSize: 12 }} />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ mt: 0.25 }}>
          {present.map(scs => (
            <Box key={scs} sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.64rem', color: 'text.disabled', display: 'block' }}>{scs}</Typography>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.primary' }}>
                {[...bw[scs]!].sort(numSort).join(',')}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
});

const SingleNrParamsCell = memo<{ band: NRBandInfo }>(({ band }) => {
  const [open, setOpen] = useState(false);
  const items = [
    { label: 'mTCI', val: band.multipleTCI ? '✓' : undefined },
    { label: 'BWP WR', val: band.bwpWithoutRestriction ? '✓' : undefined },
    { label: 'BWP SN', val: band.bwpSameNumerology },
    { label: 'UL DC', val: band.maxUplinkDutyCycle },
    { label: 'π2 BPSK', val: band.powerBoostingPi2BPSK ? '✓' : undefined }
  ].filter(d => d.val !== undefined);

  if (items.length === 0) return <Box sx={{ color: 'text.disabled', fontSize: '0.72rem', textAlign: 'center' }}>--</Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', justifyContent: 'center' }} onClick={() => setOpen(v => !v)}>
        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', whiteSpace: 'nowrap', lineHeight: 1, pt: '2px' }}>
          {items.length} Params ✓
        </Typography>
        <IconButton size="small" sx={{ p: 0 }}>
          {open ? <ExpandLessIcon sx={{ fontSize: 12 }} /> : <ExpandMoreIcon sx={{ fontSize: 12 }} />}
        </IconButton>
      </Box>
      <Collapse in={open}>
         <Box sx={{ mt: 0.25, display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
          {items.map(d => (
            <Box key={d.label} sx={{ textAlign: 'center' }}>
              <Tooltip title={NR_PARAMS_DESC[d.label] || d.label} arrow placement="left">
                <Typography variant="caption" sx={{ fontSize: '0.64rem', color: 'text.disabled', display: 'block', mb: 0.25, cursor: 'help' }}>
                  {d.label}
                </Typography>
              </Tooltip>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.primary', lineHeight: 1 }}>{d.val}</Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
});

const BandDataRow = memo<{ band: NRBandInfo | EutraBandInfo; isNr: boolean; isEutra: boolean }>(({ band, isNr, isEutra }) => {
  const nr = band as NRBandInfo;
  const eutra = band as EutraBandInfo;
  const tdSx = { py: 0.75, px: 0.5 };
  const val = (v: string | number | undefined) => (
    <Box sx={{ fontSize: '0.78rem', color: v !== undefined ? 'text.secondary' : 'text.disabled', textAlign: 'center' }}>
      {v ?? '--'}
    </Box>
  );
  return (
    <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
      <Box component="td" sx={{ ...tdSx, px: 1, fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{band.displayName}</Box>
      {isNr  && <Box component="td" sx={tdSx}>{val(nr.powerClass)}</Box>}
      {isEutra && <Box component="td" sx={tdSx}>{val(eutra.halfDuplex !== undefined ? (eutra.halfDuplex ? 'TDD' : 'FDD') : undefined)}</Box>}
      <Box component="td" sx={tdSx}>{val(nr.dlMimo !== undefined ? `${nr.dlMimo}x${nr.dlMimo}` : undefined)}</Box>
      <Box component="td" sx={tdSx}>{val(nr.ulMimo !== undefined ? `${nr.ulMimo}x${nr.ulMimo}` : undefined)}</Box>
      <Box component="td" sx={tdSx}>{val(nr.dlQam)}</Box>
      <Box component="td" sx={tdSx}>{val(nr.ulQam)}</Box>
      {isEutra && <Box component="td" sx={tdSx}>{val(eutra.nonContiguousULRA !== undefined ? (eutra.nonContiguousULRA ? '✓' : '--') : undefined)}</Box>}
      {isNr && <Box component="td" sx={tdSx}><SingleBwCell bw={nr.channelBWsDL} /></Box>}
      {isNr && <Box component="td" sx={tdSx}><SingleBwCell bw={nr.channelBWsUL} /></Box>}
      {isNr && <Box component="td" sx={{ ...tdSx, verticalAlign: 'top' }}><SingleNrParamsCell band={nr} /></Box>}
    </Box>
  );
});

const BandTable = memo<{ bands: (NRBandInfo | EutraBandInfo)[]; ratType: RatType }>(({ bands, ratType }) => {
  const isNr = ratType === 'nr';
  const isEutra = ratType === 'eutra' || ratType === 'eutra-nr';
  const sortedBands = useMemo(() => [...bands].sort((a, b) => a.band - b.band), [bands]);
  const thSx = {
    py: 0.75, px: 1,
    fontSize: '0.68rem', fontWeight: 700,
    color: 'text.secondary', textTransform: 'uppercase' as const,
    letterSpacing: '0.05em', textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
    borderBottom: '1px solid', borderColor: 'divider',
  };
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <Box component="thead">
          <Box component="tr">
            <Box component="th" sx={{ ...thSx, textAlign: 'left', width: 60 }}>Band</Box>
            {isNr   && <Box component="th" sx={thSx}>Power Class</Box>}
            {isEutra && <Box component="th" sx={thSx}>Half-Duplex</Box>}
            <Box component="th" sx={thSx}>DL MIMO</Box>
            <Box component="th" sx={thSx}>UL MIMO</Box>
            <Box component="th" sx={thSx}>DL QAM</Box>
            <Box component="th" sx={thSx}>UL QAM</Box>
            {isEutra && <Box component="th" sx={thSx}>NC-UL-RA</Box>}
            {isNr   && <Box component="th" sx={{ ...thSx, minWidth: 100 }}>Ch.BW DL</Box>}
            {isNr   && <Box component="th" sx={{ ...thSx, minWidth: 100 }}>Ch.BW UL</Box>}
            {isNr   && <Box component="th" sx={{ ...thSx, minWidth: 80 }}>NR Params</Box>}
          </Box>
        </Box>
        <Box component="tbody">
          {sortedBands.map(b => <BandDataRow key={b.band} band={b} isNr={isNr} isEutra={isEutra} />)}
          {sortedBands.length === 0 && (
            <Box component="tr">
              <Box component="td" colSpan={10} sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: '0.8rem' }}>
                No band data
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
});

// ─── Combo list ───────────────────────────────────────────────────────────────

const ComboGroup = memo<{ dlLevel: number; ulLevel: number; combos: BandCombination[]; options: ComboDisplayOptions }>(({ dlLevel, ulLevel, combos, options }) => {
  const [open, setOpen] = useState(true);
  const isDark = useTheme().palette.mode === 'dark';

  return (
    <Box sx={{ mb: 0.75 }}>
      <Box
        onClick={() => setOpen(v => !v)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
          py: 0.4, px: 0.5, borderRadius: 1,
          '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', minWidth: 70 }}>
          {dlLevel}DL{ulLevel}UL-CA
        </Typography>
        <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
          {combos.length}
        </Typography>
        {open ? <ExpandLessIcon sx={{ fontSize: 14, color: 'text.disabled' }} /> : <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
      </Box>

      <Collapse in={open}>
        <Box sx={{ px: 0.5 }}>
          {combos.map((combo, i) => {
            const displayKey = generateCombinationKey(combo, options);
            return (
              <Box key={`${displayKey}-${i}`} sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                px: 1, py: 0.35, mb: 0.3,
                borderRadius: 1, border: '1px solid', borderColor: 'divider',
                bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
              }}>
                <Chip
                  label={`${dlLevel}DL${ulLevel}UL`}
                  size="small"
                  sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700, minWidth: 50, bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}
                />
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.primary' }}>
                  {renderComboKey({ key: displayKey, powerClass: combo.powerClass }, options)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
});

const ComboList = memo<{ combos: BandCombination[]; options: ComboDisplayOptions }>(({ combos, options }) => {
  const processedGroups = useMemo(() => {
    if (combos.length === 0) return [];

    let displayedCombos = combos;
    if (options.mergeRedundant !== false) {
      const seen = new Map<string, BandCombination>();
      for (const c of combos) {
        const k = generateCombinationKey(c, options);
        if (!seen.has(k)) seen.set(k, c);
      }
      displayedCombos = Array.from(seen.values());
    }

    // Group by CA level (DL/UL) descending
    // Prefer FeatureSet-based CC count (dlCc/ulCc) over bandwidth class heuristic
    const grouped = new Map<string, BandCombination[]>();
    for (const c of displayedCombos) {
      // Use FeatureSet-based CC count if available, otherwise fallback to bandwidth class
      const dlLevel = c.dlCc ?? c.bands.reduce((s: number, b: BandParameter) => s + getBwClassCcCount(b.bandwidthClassDL), 0);
      const ulLevel = c.ulCc ?? c.bands.reduce((s: number, b: BandParameter) => s + (b.bandwidthClassUL ? getBwClassCcCount(b.bandwidthClassUL) : 0), 0);
      const key = `${dlLevel}DL${ulLevel}UL`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(c);
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => {
        const [aDL] = a.split('DL').map(Number);
        const [bDL] = b.split('DL').map(Number);
        if (bDL !== aDL) return bDL - aDL;
        const aUL = Number(a.split('DL')[1].replace('UL', ''));
        const bUL = Number(b.split('DL')[1].replace('UL', ''));
        return bUL - aUL;
      })
      .map(([key, cs]) => {
        const sortedCs = [...cs].sort((a, b) => {
          const keyA = generateCombinationKey(a, options);
          const keyB = generateCombinationKey(b, options);
          return keyA.localeCompare(keyB, undefined, { numeric: true, sensitivity: 'base' });
        });
        return [key, sortedCs] as [string, BandCombination[]];
      });
  }, [combos, options]);

  if (combos.length === 0) {
    return (
      <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography variant="body2">No band combinations</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {processedGroups.map(([key, cs]) => {
        const [dlLevel, ulPart] = key.split('DL');
        const ulLevel = ulPart.replace('UL', '');
        return (
        <ComboGroup key={key} dlLevel={Number(dlLevel)} ulLevel={Number(ulLevel)} combos={cs} options={options} />
        );
      })}
    </Box>
  );
});

// ─── Band combo section (filter + list) ──────────────────────────────────────

const BandComboSection = memo<{ combos: BandCombination[]; mt?: number }>(({ combos, mt }) => {
  const [options, setOptions] = useState<ComboDisplayOptions>({
    showQam: true, showMimo: true, mergeRedundant: true,
  });
  const [selectedBands, setSelectedBands] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const allBands = useMemo(() => {
    const seen = new Set<string>();
    const result: { ratType: 'nr' | 'eutra'; band: number }[] = [];
    for (const c of combos) {
      for (const b of c.bands) {
        const k = `${b.ratType}:${b.band}`;
        if (!seen.has(k)) { seen.add(k); result.push({ ratType: b.ratType, band: b.band }); }
      }
    }
    return result.sort((a, b) => a.ratType === b.ratType ? a.band - b.band : a.ratType === 'eutra' ? -1 : 1);
  }, [combos]);

  const filteredCombos = useMemo(() => {
    let result = combos;
    if (selectedBands.size > 0)
      result = result.filter(c =>
        [...selectedBands].every(k => {
          const [rt, bStr] = k.split(':');
          return c.bands.some(bp => bp.ratType === rt && bp.band === +bStr);
        })
      );
    if (deferredSearch)
      result = result.filter(c =>
        generateCombinationKey(c, options).toLowerCase().includes(deferredSearch.toLowerCase())
      );
    return result;
  }, [combos, selectedBands, deferredSearch, options]);

  const toggleBand = useCallback((key: string) => {
    setSelectedBands(prev => {
      const n = new Set(prev);
      if (n.has(key)) {
        n.delete(key);
      } else {
        n.add(key);
      }
      return n;
    });
  }, []);

  const isFiltered = selectedBands.size > 0 || !!deferredSearch;

  return (
    <Box sx={{ mt }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Band Combinations ({isFiltered ? `${filteredCombos.length}/` : ''}{combos.length})
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FormControlLabel
            control={<Checkbox size="small" checked={!!options.showQam} onChange={e => setOptions(p => ({ ...p, showQam: e.target.checked }))} sx={{ p: 0.4 }} />}
            label={<Typography sx={{ fontSize: '0.65rem' }}>QAM</Typography>} sx={{ m: 0 }}
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={!!options.showMimo} onChange={e => setOptions(p => ({ ...p, showMimo: e.target.checked }))} sx={{ p: 0.4 }} />}
            label={<Typography sx={{ fontSize: '0.65rem' }}>MIMO</Typography>} sx={{ m: 0 }}
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={options.mergeRedundant !== false} onChange={e => setOptions(p => ({ ...p, mergeRedundant: e.target.checked }))} sx={{ p: 0.4 }} />}
            label={<Typography sx={{ fontSize: '0.65rem' }}>Merge</Typography>} sx={{ m: 0 }}
          />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, minWidth: 0 }}>
        <TextField
          size="small"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14, color: 'text.disabled' }} /></InputAdornment>
            }
          }}
          sx={{ flexShrink: 0, width: 130, '& .MuiInputBase-input': { fontSize: '0.72rem', py: 0.4 } }}
        />
        <BandFilterChips allBands={allBands} selected={selectedBands} onToggle={toggleBand} onClear={() => setSelectedBands(new Set())} />
      </Box>
      <ComboList combos={filteredCombos} options={options} />
    </Box>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────

interface SingleDeviceViewProps {
  device: CompareFormat;
  side: 'A' | 'B';
  onOpenUrl?: (url: string) => void;
}

export const SingleDeviceView: React.FC<SingleDeviceViewProps> = ({ device, side, onOpenUrl }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const sideColor = side === 'A' ? '#2196F3' : '#4DB6AC';

  const availableRats = RAT_TABS.filter(t => device.rats[t.value]);
  const [activeRat, setActiveRat] = useState<RatType>(availableRats[0]?.value ?? 'nr');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', minHeight: 0 }}>
      {/* Header info */}
      <Box sx={{
        flexShrink: 0,
        p: 1.5, borderRadius: 2, border: '1px solid', borderColor: `${sideColor}44`,
        bgcolor: isDark ? `${sideColor}0d` : `${sideColor}08`,
        display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
      }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem', color: sideColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Device {side}
        </Typography>
        <Chip label={device.meta.vendor} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, color: sideColor, bgcolor: `${sideColor}22`, border: `1px solid ${sideColor}55` }} />
        {device.meta.detectedRats.map(r => (
          <Chip key={r} label={r.toUpperCase()} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }} />
        ))}
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
          {device.meta.fileName}
        </Typography>
        <Tooltip title="Export to Excel" placement="top">
          <IconButton
            size="small"
            onClick={() => void exportSingleDeviceToExcelCompat(device, side)}
            sx={{ ml: 'auto', color: 'text.disabled', '&:hover': { color: 'primary.main' } }}
          >
            <DownloadIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* RAT tabs + content */}
      <Paper elevation={0} sx={{
        border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 3,
        overflow: 'hidden',
        bgcolor: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      }}>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 1 }}>
          <Tabs
            value={availableRats.find(t => t.value === activeRat) ? activeRat : availableRats[0]?.value ?? false}
            onChange={(_, v) => setActiveRat(v as RatType)}
            sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0, fontSize: '0.75rem', textTransform: 'none' } }}
          >
            {availableRats.map(({ value, label }) => (
              <Tab key={value} value={value} label={label} />
            ))}
          </Tabs>
        </Box>

        {availableRats.length > 0 && availableRats.map(({ value }) => {
          const ratInfo = device.rats[value];
          if (!ratInfo) return null;
          
          return (
            <Box key={value} sx={{ p: 2, flex: 1, minHeight: 0, overflowY: 'auto', display: activeRat === value ? 'block' : 'none' }}>
              {/* Band capabilities */}
              {ratInfo.bands.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1 }}>
                    Band Capabilities ({ratInfo.bands.length})
                  </Typography>
                  <BandTable bands={ratInfo.bands as (NRBandInfo | EutraBandInfo)[]} ratType={value as RatType} />
                </Box>
              )}

              {/* Band combinations */}
              {ratInfo.bandCombinations.length > 0 && (
                <BandComboSection combos={ratInfo.bandCombinations} mt={ratInfo.bands.length > 0 ? 2 : 0} />
              )}

              {/* Features */}
              {(() => {
                const ratFeatures = device.features?.[value as RatType];
                if (!ratFeatures || ratFeatures.leaves.length === 0) return null;
                const hasPrev = ratInfo.bands.length > 0 || ratInfo.bandCombinations.length > 0;
                return (
                  <>
                    {hasPrev && <Divider sx={{ my: 2 }} />}
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1 }}>
                      Features ({ratFeatures.leaves.length})
                    </Typography>
                    <SingleDeviceFeaturesView leaves={ratFeatures.leaves} onOpenUrl={onOpenUrl} />
                  </>
                );
              })()}

              {ratInfo.bands.length === 0 && ratInfo.bandCombinations.length === 0 && !device.features?.[value as RatType]?.leaves.length && (
                <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
                  <Typography variant="body2">No data for this RAT</Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Paper>
    </Box>
  );
};
