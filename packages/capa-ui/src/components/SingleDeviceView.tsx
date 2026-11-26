import React, { useState, useCallback, useDeferredValue, memo, useMemo, useEffect, useTransition } from 'react';
import {
  Box, Typography, Chip, Paper, Tabs, Tab, Button,
  useTheme, Collapse, Checkbox, FormControlLabel, IconButton, Tooltip,
  TextField, InputAdornment, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import { exportSingleDeviceToExcelCompat } from '../utils/tauriExportUtils';
import { getBwClassCcCount, generateCombinationKey } from '@ohmycapa/capa-core';
import type {
  CompareFormat,
  RatType,
  NRBandInfo,
  EutraBandInfo,
  UtraBandInfo,
  BandCombination,
  BandParameter,
  ComboDisplayOptions,
} from '@ohmycapa/capa-core';
import { renderComboKey, ComboSymbolLegend } from './comboKeyRenderer';
import { SingleDeviceFeaturesView } from './FeaturesCompareView';
import { BandFilterChips } from './BandFilterChips';
import { VirtualList } from './VirtualList';
import { copyTextToClipboard } from '../utils/clipboardUtils';
import {
  DEVICE_COLOR,
  MONO_FONT_FAMILY,
  RAT_TABS,
  STATUS_COLOR,
  getWorkbenchSurface,
} from '../constants/statusMeta';
import type { DetailSection } from '../utils/compareMetrics';

// ─── Band table ───────────────────────────────────────────────────────────────

const SCS_KEYS = ['scs-15kHz', 'scs-30kHz', 'scs-60kHz', 'scs-120kHz'] as const;

const NR_PARAMS_DESC: Record<string, string> = {
  mTCI: 'Multiple TCI support (multipleTCI)',
  'BWP WR': 'BWP operation without bandwidth restriction (bwp-WithoutRestriction)',
  'BWP SN': 'BWP adaptation with same numerology support (bwp-SameNumerology)',
  'UL DC': 'Max uplink duty cycle for PC2 FR1 (maxUplinkDutyCycle-PC2-FR1)',
  'π2 BPSK': 'Power boosting with pi/2 BPSK (powerBoosting-pi2BPSK)',
};

const SingleBwCell = memo<{ bw: NRBandInfo['channelBWsDL'] }>(({ bw }) => {
  const [open, setOpen] = useState(false);
  if (!bw) return <Box sx={{ color: 'text.disabled', fontSize: '0.72rem', textAlign: 'center' }}>--</Box>;
  const numSort = (a: string, b: string) => parseInt(a) - parseInt(b);
  const present = SCS_KEYS.filter(k => bw[k]?.length);
  if (present.length === 0) return <Box sx={{ color: 'text.disabled', fontSize: '0.72rem', textAlign: 'center' }}>--</Box>;
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', justifyContent: 'center' }} onClick={() => setOpen(v => !v)}>
        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontFamily: MONO_FONT_FAMILY, color: 'text.secondary', lineHeight: 1, pt: '2px' }}>
          {present.length} SCS ✓
        </Typography>
        <IconButton size="small" sx={{ p: 0 }} aria-label="Toggle channel bandwidths">
          {open ? <ExpandLessIcon sx={{ fontSize: 12 }} /> : <ExpandMoreIcon sx={{ fontSize: 12 }} />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ mt: 0.25 }}>
          {present.map(scs => (
            <Box key={scs} sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled', display: 'block' }}>{scs}</Typography>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', fontFamily: MONO_FONT_FAMILY, color: 'text.primary' }}>
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
    { label: 'π2 BPSK', val: band.powerBoostingPi2BPSK ? '✓' : undefined },
  ].filter(d => d.val !== undefined);

  if (items.length === 0) return <Box sx={{ color: 'text.disabled', fontSize: '0.72rem', textAlign: 'center' }}>--</Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', justifyContent: 'center' }} onClick={() => setOpen(v => !v)}>
        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontFamily: MONO_FONT_FAMILY, color: 'text.secondary', whiteSpace: 'nowrap', lineHeight: 1, pt: '2px' }}>
          {items.length} Params ✓
        </Typography>
        <IconButton size="small" sx={{ p: 0 }} aria-label="Toggle NR parameters">
          {open ? <ExpandLessIcon sx={{ fontSize: 12 }} /> : <ExpandMoreIcon sx={{ fontSize: 12 }} />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ mt: 0.25, display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
          {items.map(d => (
            <Box key={d.label} sx={{ textAlign: 'center' }}>
              <Tooltip title={NR_PARAMS_DESC[d.label] || d.label} arrow placement="left">
                <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled', display: 'block', mb: 0.25, cursor: 'help' }}>
                  {d.label}
                </Typography>
              </Tooltip>
              <Typography variant="caption" sx={{ fontSize: '0.74rem', fontFamily: MONO_FONT_FAMILY, fontWeight: 600, color: 'text.primary', lineHeight: 1 }}>
                {d.val}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
});

interface BandDataRowProps {
  band: NRBandInfo | EutraBandInfo | UtraBandInfo;
  isMrdc: boolean;
  showHalfDuplex: boolean;
  showMimoQam: boolean;
  showNcUlRa: boolean;
  showNrCols: boolean;
}

const BandDataRow = memo<BandDataRowProps>(({
  band, isMrdc, showHalfDuplex, showMimoQam, showNcUlRa, showNrCols,
}) => {
  const nr = band as NRBandInfo;
  const eutra = band as EutraBandInfo;
  const isRowNr = band.displayName.startsWith('n');
  const tdSx = { py: 0.75, px: 0.5 };
  const val = (v: string | number | undefined) => (
    <Box
      sx={{
        fontSize: '0.76rem',
        fontFamily: MONO_FONT_FAMILY,
        fontVariantNumeric: 'tabular-nums',
        color: v !== undefined ? 'text.secondary' : 'text.disabled',
        textAlign: 'center',
      }}
    >
      {v ?? '--'}
    </Box>
  );
  const naCell = <Box sx={{ color: 'text.disabled', fontSize: '0.72rem', textAlign: 'center' }}>--</Box>;
  return (
    <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' }, '&:last-child': { borderBottom: 'none' } }}>
      <Box component="td" sx={{ ...tdSx, px: 1, fontWeight: 700, fontSize: '0.78rem', fontFamily: MONO_FONT_FAMILY, whiteSpace: 'nowrap' }}>{band.displayName}</Box>
      <Box component="td" sx={tdSx}>{val(nr.powerClass)}</Box>
      {showHalfDuplex && (
        <Box component="td" sx={tdSx}>
          {isMrdc && isRowNr ? naCell : val(eutra.halfDuplex !== undefined ? (eutra.halfDuplex ? 'TDD' : 'FDD') : undefined)}
        </Box>
      )}
      {showMimoQam && (
        <>
          <Box component="td" sx={tdSx}>{val(nr.dlMimo !== undefined ? `${nr.dlMimo}x${nr.dlMimo}` : undefined)}</Box>
          <Box component="td" sx={tdSx}>{val(nr.ulMimo !== undefined ? `${nr.ulMimo}x${nr.ulMimo}` : undefined)}</Box>
          <Box component="td" sx={tdSx}>{val(nr.dlQam)}</Box>
          <Box component="td" sx={tdSx}>{val(nr.ulQam)}</Box>
        </>
      )}
      {showNcUlRa && (
        <Box component="td" sx={tdSx}>
          {isMrdc && isRowNr ? naCell : val(eutra.nonContiguousULRA !== undefined ? (eutra.nonContiguousULRA ? '✓' : '--') : undefined)}
        </Box>
      )}
      {showNrCols && (
        <>
          <Box component="td" sx={tdSx}>{isMrdc && !isRowNr ? naCell : <SingleBwCell bw={nr.channelBWsDL} />}</Box>
          <Box component="td" sx={tdSx}>{isMrdc && !isRowNr ? naCell : <SingleBwCell bw={nr.channelBWsUL} />}</Box>
          <Box component="td" sx={{ ...tdSx, verticalAlign: 'top' }}>{isMrdc && !isRowNr ? naCell : <SingleNrParamsCell band={nr} />}</Box>
        </>
      )}
    </Box>
  );
});

const BandTable = memo<{ bands: (NRBandInfo | EutraBandInfo | UtraBandInfo)[]; ratType: RatType }>(({ bands, ratType }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const isNr = ratType === 'nr';
  const isEutra = ratType === 'eutra';
  const isMrdc = ratType === 'eutra-nr';
  const isUtra = ratType === 'utra';
  const showHalfDuplex = isEutra || isMrdc;
  const showMimoQam = !isUtra;
  const showNcUlRa = isEutra || isMrdc;
  const showNrCols = isNr || isMrdc;

  const sortedBands = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return [...bands]
      .filter(b => {
        if (!q) return true;
        const nr = b as NRBandInfo;
        return (
          b.displayName.toLowerCase().includes(q) ||
          String(b.band).includes(q) ||
          (nr.powerClass ?? '').toLowerCase().includes(q) ||
          (nr.dlQam ?? '').toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          (a.displayName[0] ?? '').localeCompare(b.displayName[0] ?? '') ||
          a.band - b.band
      );
  }, [bands, deferredSearch]);

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

  return (
    <Box>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Band Capabilities
          </Typography>
          <TextField
            size="small"
            placeholder="Search band..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14, color: 'text.disabled' }} /></InputAdornment>,
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.2 }} aria-label="Clear band search">
                      <CloseIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
                sx: { fontSize: '0.72rem', height: 26 },
              },
            }}
            sx={{ width: { xs: 150, sm: 180 } }}
          />
        </Box>
        <Chip
          size="small"
          label={deferredSearch.trim() ? `${sortedBands.length} / ${bands.length} bands` : `${bands.length} bands supported`}
          sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, bgcolor: 'rgba(16,185,129,0.1)', color: STATUS_COLOR.green }}
        />
      </Box>
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
            </Box>
          </Box>
          <Box component="tbody">
            {sortedBands.map(b => (
              <BandDataRow
                key={b.displayName}
                band={b}
                isMrdc={isMrdc}
                showHalfDuplex={showHalfDuplex}
                showMimoQam={showMimoQam}
                showNcUlRa={showNcUlRa}
                showNrCols={showNrCols}
              />
            ))}
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
    </Box>
  );
});

// ─── Combo list ───────────────────────────────────────────────────────────────

const NATURAL_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

interface ComboListItem {
  combo: BandCombination;
  displayKey: string;
  naturalRank: number;
  estimatedHeight: number;
}

type VirtualSingleComboItem =
  | { type: 'group'; key: string; groupKey: string; title: string; count: number; collapsed: boolean }
  | { type: 'row'; key: string; item: ComboListItem };

const SINGLE_COPY_BTN_STYLE: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 3,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  color: 'inherit',
  lineHeight: 1,
};

const SingleInlineCopyButton = memo<{ getText: () => string }>(({ getText }) => {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    void copyTextToClipboard(getText()).then(ok => {
      if (!ok) return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  }, [getText]);

  const label = copied ? 'Copied!' : 'Copy combination';
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      style={{
        ...SINGLE_COPY_BTN_STYLE,
        color: copied ? STATUS_COLOR.green : 'inherit',
        opacity: copied ? 1 : 0.65,
      }}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" data-testid="CheckIcon" aria-hidden="true">
          <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
        </svg>
      )}
    </button>
  );
});

const SingleGroupHeader = memo<{
  groupKey: string;
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: (groupKey: string) => void;
}>(({ groupKey, title, count, collapsed, onToggle }) => (
  <div style={{ paddingBottom: collapsed ? 4 : 3 }}>
    <div
      role="button"
      tabIndex={0}
      className="capa-single-combo-group"
      onClick={() => onToggle(groupKey)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(groupKey);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        padding: '4px 5px',
        borderRadius: 4,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: '0.72rem', fontFamily: MONO_FONT_FAMILY, whiteSpace: 'nowrap' }}>
        {title}
      </span>
      <span style={{ flex: 1, height: 1, backgroundColor: 'currentColor', opacity: 0.14 }} />
      <span style={{ fontSize: '0.64rem', fontFamily: MONO_FONT_FAMILY, opacity: 0.55, whiteSpace: 'nowrap' }}>
        {count} combos
      </span>
      {collapsed ? <ExpandMoreIcon sx={{ fontSize: 14, opacity: 0.5 }} /> : <ExpandLessIcon sx={{ fontSize: 14, opacity: 0.5 }} />}
    </div>
  </div>
));

const SingleComboRow = memo<{ item: ComboListItem; options: ComboDisplayOptions; isDark: boolean }>(({ item, options, isDark }) => {
  const { combo, displayKey } = item;
  const getCopyText = useCallback(
    () => (combo.powerClass ? `${displayKey} (${combo.powerClass})` : displayKey),
    [combo.powerClass, displayKey]
  );

  return (
    <div style={{ paddingBottom: 4 }}>
      <div
        className="capa-single-combo-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '4px 8px',
          minHeight: 28,
          boxSizing: 'border-box',
          borderRadius: 5,
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(15,23,42,0.1)',
          backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.015)',
        }}
      >
        <div style={{ fontSize: '0.76rem', lineHeight: 1.3, overflow: 'hidden', minWidth: 0, flex: 1 }}>
          {renderComboKey({ key: displayKey, powerClass: combo.powerClass }, options, isDark)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {combo.powerClass && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 15,
                padding: '0 6px',
                borderRadius: 8,
                fontSize: '0.58rem',
                fontWeight: 600,
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)',
              }}
            >
              {combo.powerClass}
            </span>
          )}
          <div className="single-combo-copy" style={{ opacity: 0.25, transition: 'opacity 120ms' }}>
            <SingleInlineCopyButton getText={getCopyText} />
          </div>
        </div>
      </div>
    </div>
  );
});

interface IndexedSingleCombo {
  combo: BandCombination;
  displayKey: string;
  lowerKey: string;
  bandKeys: Set<string>;
  dlLevel: number;
  ulLevel: number;
  eutraDlCc: number;
  nrDlCc: number;
  groupKey: string;
  groupTitle: string;
  naturalRank: number;
  estimatedHeight: number;
}

const BandComboSection = memo<{ combos: BandCombination[]; ratType: RatType }>(({ combos, ratType }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);
  const [mergeRedundant, setMergeRedundant] = useState(true);
  const options = useMemo<ComboDisplayOptions>(
    () => ({ showQam: true, showMimo: true, mergeRedundant }),
    [mergeRedundant]
  );
  const [selectedBands, setSelectedBands] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const { allBands, indexedCombos } = useMemo(() => {
    const seen = new Set<string>();
    const bandList: { ratType: 'nr' | 'eutra'; band: number }[] = [];
    const isEndc = ratType === 'eutra-nr';

    const rawIndexed: IndexedSingleCombo[] = [];
    const seenMerge = new Set<string>();

    for (const c of combos) {
      const displayKey = mergeRedundant && c.key
        ? c.key
        : generateCombinationKey(c, { showQam: true, showMimo: true, mergeRedundant });

      if (mergeRedundant) {
        if (seenMerge.has(displayKey)) continue;
        seenMerge.add(displayKey);
      }

      const bandKeys = new Set<string>();
      for (const b of c.bands) {
        const k = `${b.ratType}:${b.band}`;
        bandKeys.add(k);
        if (!seen.has(k)) { seen.add(k); bandList.push({ ratType: b.ratType, band: b.band }); }
      }

      const dlLevel = c.dlCc ?? c.bands.reduce((s: number, b: BandParameter) => s + (b.bandwidthClassDL ? getBwClassCcCount(b.bandwidthClassDL, b.ratType, b.ratType === 'nr' && b.band >= 257) : 0), 0);
      const ulLevel = c.ulCc ?? c.bands.reduce((s: number, b: BandParameter) => s + (b.bandwidthClassUL ? getBwClassCcCount(b.bandwidthClassUL, b.ratType, b.ratType === 'nr' && b.band >= 257) : 0), 0);

      let eutraDlCc = 0;
      let nrDlCc = 0;
      if (isEndc) {
        for (const b of c.bands) {
          if (!b.bandwidthClassDL) continue;
          const cc = getBwClassCcCount(b.bandwidthClassDL, b.ratType, b.ratType === 'nr' && b.band >= 257);
          if (b.ratType === 'eutra') eutraDlCc += cc;
          else nrDlCc += cc;
        }
      }

      const groupKey = isEndc
        ? `${eutraDlCc}LTE+${nrDlCc}NR·${dlLevel}DL${ulLevel}UL`
        : `${dlLevel}DL${ulLevel}UL`;
      const groupTitle = isEndc
        ? `${eutraDlCc}LTE + ${nrDlCc}NR · ${dlLevel}DL${ulLevel}UL-ENDC`
        : `${dlLevel}DL${ulLevel}UL-CA`;

      rawIndexed.push({
        combo: c,
        displayKey,
        lowerKey: displayKey.toLowerCase(),
        bandKeys,
        dlLevel,
        ulLevel,
        eutraDlCc,
        nrDlCc,
        groupKey,
        groupTitle,
        naturalRank: 0,
        estimatedHeight: displayKey.length > 96 ? 48 : 34,
      });
    }

    const order = rawIndexed.map((_, i) => i);
    order.sort((a, b) => NATURAL_COLLATOR.compare(rawIndexed[a].displayKey, rawIndexed[b].displayKey));
    order.forEach((origIdx, rank) => {
      rawIndexed[origIdx].naturalRank = rank;
    });

    bandList.sort((a, b) => (a.ratType === b.ratType ? a.band - b.band : a.ratType === 'eutra' ? -1 : 1));
    return { allBands: bandList, indexedCombos: rawIndexed };
  }, [combos, ratType, mergeRedundant]);

  const validBandKeySet = useMemo(
    () => new Set(allBands.map(b => `${b.ratType}:${b.band}`)),
    [allBands]
  );

  const effectiveSelectedBands = useMemo(
    () => new Set([...selectedBands].filter(k => validBandKeySet.has(k))),
    [selectedBands, validBandKeySet]
  );

  const filteredIndexed = useMemo(() => {
    const selectedArr = effectiveSelectedBands.size > 0 ? [...effectiveSelectedBands] : null;
    const searchLower = deferredSearch ? deferredSearch.toLowerCase() : '';
    if (!selectedArr && !searchLower) return indexedCombos;
    return indexedCombos.filter(item =>
      (!selectedArr || selectedArr.every(k => item.bandKeys.has(k))) &&
      (!searchLower || item.lowerKey.includes(searchLower))
    );
  }, [indexedCombos, effectiveSelectedBands, deferredSearch]);

  const processedGroups = useMemo(() => {
    const grouped = new Map<string, { title: string; dlLevel: number; ulLevel: number; eutraDlCc: number; nrDlCc: number; items: ComboListItem[] }>();
    for (const item of filteredIndexed) {
      let g = grouped.get(item.groupKey);
      if (!g) {
        g = {
          title: item.groupTitle,
          dlLevel: item.dlLevel,
          ulLevel: item.ulLevel,
          eutraDlCc: item.eutraDlCc,
          nrDlCc: item.nrDlCc,
          items: [],
        };
        grouped.set(item.groupKey, g);
      }
      g.items.push({
        combo: item.combo,
        displayKey: item.displayKey,
        naturalRank: item.naturalRank,
        estimatedHeight: item.estimatedHeight,
      });
    }

    return [...grouped.entries()]
      .sort(([, a], [, b]) => {
        if (b.dlLevel !== a.dlLevel) return b.dlLevel - a.dlLevel;
        if (b.ulLevel !== a.ulLevel) return b.ulLevel - a.ulLevel;
        if (b.nrDlCc !== a.nrDlCc) return b.nrDlCc - a.nrDlCc;
        return b.eutraDlCc - a.eutraDlCc;
      })
      .map(([key, g]) => {
        g.items.sort((a, b) => a.naturalRank - b.naturalRank);
        return { key, title: g.title, items: g.items };
      });
  }, [filteredIndexed]);

  const toggleBand = useCallback((key: string) => {
    startTransition(() => {
      setSelectedBands(prev => {
        const n = new Set(prev);
        if (n.has(key)) n.delete(key);
        else n.add(key);
        return n;
      });
    });
  }, []);

  const toggleGroup = useCallback((groupKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  const allCollapsed = processedGroups.length > 0 && processedGroups.every(g => collapsedGroups.has(g.key));
  const toggleAllGroups = useCallback(() => {
    if (allCollapsed) setCollapsedGroups(new Set());
    else setCollapsedGroups(new Set(processedGroups.map(g => g.key)));
  }, [allCollapsed, processedGroups]);

  const virtualItems = useMemo<VirtualSingleComboItem[]>(() => {
    const flat: VirtualSingleComboItem[] = [];
    for (const g of processedGroups) {
      const collapsed = collapsedGroups.has(g.key);
      flat.push({ type: 'group', key: `sgrp:${g.key}`, groupKey: g.key, title: g.title, count: g.items.length, collapsed });
      if (!collapsed) {
        for (let i = 0; i < g.items.length; i++) {
          const it = g.items[i];
          flat.push({ type: 'row', key: `srow:${g.key}:${it.displayKey}:${i}`, item: it });
        }
      }
    }
    return flat;
  }, [processedGroups, collapsedGroups]);

  const getVirtualKey = useCallback((v: VirtualSingleComboItem) => v.key, []);
  const estimateVirtualHeight = useCallback(
    (v: VirtualSingleComboItem) => (v.type === 'group' ? 30 : v.item.estimatedHeight),
    []
  );
  const renderVirtualItem = useCallback((v: VirtualSingleComboItem) => {
    if (v.type === 'group') {
      return (
        <SingleGroupHeader
          groupKey={v.groupKey}
          title={v.title}
          count={v.count}
          collapsed={v.collapsed}
          onToggle={toggleGroup}
        />
      );
    }
    return <SingleComboRow item={v.item} options={options} isDark={isDark} />;
  }, [toggleGroup, options, isDark]);

  const isFiltered = effectiveSelectedBands.size > 0 || !!deferredSearch;
  const resetScrollKey = `${ratType}|${mergeRedundant}|${deferredSearch}|${[...effectiveSelectedBands].join(',')}`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box
        sx={{
          flexShrink: 0,
          zIndex: 5,
          pt: 1.25,
          pb: 0.75,
          px: 1.5,
          bgcolor: surface.toolbarBg,
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid',
          borderColor: surface.border,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search combo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15, color: 'text.disabled' }} /></InputAdornment>,
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.2 }} aria-label="Clear combo search">
                        <CloseIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                  sx: { fontSize: '0.73rem', height: 26 },
                },
              }}
              sx={{ width: { xs: '100%', sm: 170 } }}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={mergeRedundant} onChange={e => startTransition(() => setMergeRedundant(e.target.checked))} sx={{ p: 0.3 }} />}
              label={<Typography sx={{ fontSize: '0.64rem' }}>Merge</Typography>}
              sx={{ m: 0 }}
            />
            {processedGroups.length > 1 && (
              <Tooltip title={allCollapsed ? 'Expand all combo groups' : 'Collapse all combo groups'} arrow placement="top">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={toggleAllGroups}
                  startIcon={allCollapsed ? <UnfoldMoreIcon sx={{ fontSize: 13 }} /> : <UnfoldLessIcon sx={{ fontSize: 13 }} />}
                  sx={{
                    py: 0.2,
                    px: 0.75,
                    minHeight: 24,
                    fontSize: '0.64rem',
                    textTransform: 'none',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '& .MuiButton-startIcon': { mr: 0.35 },
                  }}
                >
                  {allCollapsed ? 'Expand All' : 'Collapse All'}
                </Button>
              </Tooltip>
            )}
          </Box>
          <Chip
            size="small"
            label={isFiltered ? `${filteredIndexed.length} / ${indexedCombos.length} combos` : `${indexedCombos.length} combos`}
            sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)' }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {allBands.length > 0 && (
              <BandFilterChips allBands={allBands} selected={effectiveSelectedBands} onToggle={toggleBand} onClear={() => startTransition(() => setSelectedBands(new Set()))} />
            )}
          </Box>
          <ComboSymbolLegend />
        </Box>
      </Box>

      {filteredIndexed.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
          <Typography variant="body2">No band combinations</Typography>
        </Box>
      ) : (
        <VirtualList
          items={virtualItems}
          getItemKey={getVirtualKey}
          estimateHeight={estimateVirtualHeight}
          renderItem={renderVirtualItem}
          overscan={10}
          threshold={80}
          resetScrollKey={resetScrollKey}
          sx={{
            px: 1.5,
            py: 1,
            '& .capa-single-combo-row:hover .single-combo-copy, & .capa-single-combo-row:focus-within .single-combo-copy': {
              opacity: '1 !important',
            },
            '& .capa-single-combo-group:hover': {
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
            },
          }}
        />
      )}
    </Box>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────

export interface SingleDeviceViewProps {
  device: CompareFormat;
  side: 'A' | 'B';
  onOpenUrl?: (url: string) => void;
  hideHeader?: boolean;
  onOpenGlobalFeatures?: () => void;
  jumpTarget?: { rat: RatType; featureId: string; version: number } | null;
}

export const SingleDeviceView: React.FC<SingleDeviceViewProps> = ({
  device,
  side,
  onOpenUrl,
  hideHeader = false,
  onOpenGlobalFeatures,
  jumpTarget,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);
  const sideColor = side === 'A' ? DEVICE_COLOR.deviceA : DEVICE_COLOR.deviceB;

  const availableRats = useMemo(
    () => RAT_TABS.filter(t => Boolean(device.rats[t.value]) || (device.features?.[t.value]?.leaves.length ?? 0) > 0),
    [device.rats, device.features]
  );
  const [activeRat, setActiveRat] = useState<RatType>(availableRats[0]?.value ?? 'nr');
  const [sectionByRat, setSectionByRat] = useState<Partial<Record<RatType, DetailSection>>>({});

  useEffect(() => {
    if (!jumpTarget) return;
    setActiveRat(jumpTarget.rat);
    setSectionByRat(prev => ({ ...prev, [jumpTarget.rat]: 'features' }));
  }, [jumpTarget]);

  const activeRatValue = useMemo(
    () => availableRats.find(t => t.value === activeRat)?.value ?? availableRats[0]?.value,
    [availableRats, activeRat]
  );

  const activeRatInfo = activeRatValue ? device.rats[activeRatValue] : undefined;
  const activeRatFeatures = activeRatValue ? device.features?.[activeRatValue] : undefined;

  const sectionMeta = useMemo(() => {
    const comboCount = activeRatInfo?.bandCombinations.length ?? 0;
    const bandCount = activeRatInfo?.bands.length ?? 0;
    const featureCount = activeRatFeatures?.leaves.length ?? 0;
    return {
      combos: { count: comboCount, available: comboCount > 0 },
      bands: { count: bandCount, available: bandCount > 0 },
      features: { count: featureCount, available: featureCount > 0 },
    };
  }, [activeRatInfo, activeRatFeatures]);

  const defaultSection: DetailSection = sectionMeta.combos.available
    ? 'combos'
    : sectionMeta.bands.available
      ? 'bands'
      : 'features';

  const savedSection = activeRatValue ? sectionByRat[activeRatValue] : undefined;
  const activeSection: DetailSection =
    savedSection && sectionMeta[savedSection].available ? savedSection : defaultSection;

  const handleSectionChange = useCallback((_: React.MouseEvent<HTMLElement>, next: DetailSection | null) => {
    if (!next || !activeRatValue) return;
    setSectionByRat(prev => ({ ...prev, [activeRatValue]: next }));
  }, [activeRatValue]);

  const totalFeaturesAcrossRats = useMemo(
    () => availableRats.reduce((acc, r) => acc + (device.features?.[r.value]?.leaves.length ?? 0), 0),
    [availableRats, device.features]
  );

  const hasActiveData = Boolean(
    (activeRatInfo &&
      (activeRatInfo.bands.length > 0 || activeRatInfo.bandCombinations.length > 0)) ||
    (activeRatFeatures?.leaves.length ?? 0) > 0
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, height: '100%', minHeight: 0 }}>
      {!hideHeader && (
        <Paper
          elevation={0}
          sx={{
            flexShrink: 0,
            px: 1.5,
            py: 0.75,
            border: '1px solid',
            borderColor: `${sideColor}44`,
            borderRadius: 2,
            bgcolor: isDark ? `${sideColor}0d` : `${sideColor}08`,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.72rem', color: sideColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Device {side}
          </Typography>
          <Chip label={device.meta.vendor} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, color: sideColor, bgcolor: `${sideColor}22`, border: `1px solid ${sideColor}55` }} />
          {device.meta.detectedRats.map(r => (
            <Chip key={r} label={r.toUpperCase()} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)' }} />
          ))}
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 600 }}>
            {device.meta.deviceName || device.meta.fileName}
          </Typography>
          <Tooltip title="Export to Excel" placement="top">
            <IconButton
              size="small"
              onClick={() => {
                exportSingleDeviceToExcelCompat(device, side).catch(console.error);
              }}
              sx={{ ml: 'auto', color: 'text.disabled', '&:hover': { color: 'primary.main' } }}
            >
              <DownloadIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Paper>
      )}

      {/* Unified RAT tabs (left) + Sub-Tab Segmented Switch (right) */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: surface.border,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: surface.panelBg,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: surface.border,
            bgcolor: surface.headerBg,
            px: 1,
            py: 0.25,
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Tabs
            value={activeRatValue ?? false}
            onChange={(_, v) => {
              if (v === '__global_features__') {
                onOpenGlobalFeatures?.();
                return;
              }
              setActiveRat(v as RatType);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0, fontSize: '0.74rem', textTransform: 'none', fontWeight: 600 } }}
          >
            {availableRats.map(({ value, label }) => {
              const comboCount = device.rats[value]?.bandCombinations.length ?? 0;
              return (
                <Tab
                  key={value}
                  value={value}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span>{label}</span>
                      {comboCount > 0 && (
                        <Chip
                          label={comboCount}
                          size="small"
                          sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }}
                        />
                      )}
                    </Box>
                  }
                />
              );
            })}
            {onOpenGlobalFeatures && totalFeaturesAcrossRats > 0 && (
              <Tab
                value="__global_features__"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ManageSearchIcon sx={{ fontSize: 15 }} />
                    <span>All Features</span>
                    <Chip
                      label={totalFeaturesAcrossRats}
                      size="small"
                      sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(99,102,241,0.14)', color: STATUS_COLOR.indigo }}
                    />
                  </Box>
                }
              />
            )}
          </Tabs>

          {Boolean(activeRatInfo || (activeRatFeatures?.leaves.length ?? 0) > 0) && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={activeSection}
              onChange={handleSectionChange}
              sx={{
                '& .MuiToggleButton-root': {
                  py: 0.25,
                  px: 1,
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  minHeight: 26,
                  gap: 0.5,
                },
              }}
            >
              {sectionMeta.combos.available && (
                <ToggleButton value="combos">
                  <span>Combos</span>
                  <Chip
                    size="small"
                    label={sectionMeta.combos.count}
                    sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: `${sideColor}1f`, color: sideColor }}
                  />
                </ToggleButton>
              )}
              {sectionMeta.bands.available && (
                <ToggleButton value="bands">
                  <span>Bands</span>
                  <Chip
                    size="small"
                    label={sectionMeta.bands.count}
                    sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(16,185,129,0.12)', color: STATUS_COLOR.green }}
                  />
                </ToggleButton>
              )}
              {sectionMeta.features.available && (
                <ToggleButton value="features">
                  <span>Features</span>
                  <Chip
                    size="small"
                    label={sectionMeta.features.count}
                    sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700, fontFamily: MONO_FONT_FAMILY, bgcolor: 'rgba(99,102,241,0.12)', color: STATUS_COLOR.indigo }}
                  />
                </ToggleButton>
              )}
            </ToggleButtonGroup>
          )}
        </Box>

        {availableRats.length > 0 && activeRatValue && (activeRatInfo || (activeRatFeatures?.leaves.length ?? 0) > 0) ? (
          hasActiveData ? (
            <Box
              key={activeRatValue}
              sx={
                activeSection === 'combos' && activeRatInfo
                  ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
                  : { p: 1.5, flex: 1, minHeight: 0, overflowY: 'auto' }
              }
            >
              {activeSection === 'combos' && activeRatInfo && (
                <BandComboSection
                  key={`single-combos-${activeRatValue}`}
                  combos={activeRatInfo.bandCombinations}
                  ratType={activeRatValue}
                />
              )}

              {activeSection === 'bands' && activeRatInfo && (
                <BandTable
                  key={`single-bands-${activeRatValue}`}
                  bands={activeRatInfo.bands as (NRBandInfo | EutraBandInfo | UtraBandInfo)[]}
                  ratType={activeRatValue}
                />
              )}

              {activeSection === 'features' && activeRatFeatures && (
                <SingleDeviceFeaturesView
                  key={`single-features-${activeRatValue}`}
                  leaves={activeRatFeatures.leaves}
                  ratType={activeRatValue}
                  onOpenUrl={onOpenUrl}
                  highlightFeatureId={jumpTarget?.rat === activeRatValue ? jumpTarget.featureId : undefined}
                  navigationVersion={jumpTarget?.rat === activeRatValue ? jumpTarget.version : undefined}
                />
              )}
            </Box>
          ) : (
            <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
              <Typography variant="body2">No data for this RAT</Typography>
            </Box>
          )
        ) : (
          <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>
            <Typography variant="body2">No RAT data available</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
