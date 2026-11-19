import React, { useMemo, memo, useCallback, useEffect, useState } from 'react';
import {
  Box, Paper, Tabs, Tab, Typography, Button, Divider, Collapse,
  Chip, useTheme, CircularProgress, Tooltip, IconButton,
  Menu, MenuItem, ListItemIcon, ListItemText,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { CapaDropzone } from './components/CapaDropzone';
import { CompareSummaryDashboard } from './components/CompareSummaryDashboard';
import { BandCompareTable } from './components/BandCompareTable';
import { ComboCompareView } from './components/ComboCompareView';
import { FeaturesCompareView } from './components/FeaturesCompareView';
import { SingleDeviceView } from './components/SingleDeviceView';
import { useCapaCompare } from './hooks/useCapaCompare';
import {
  exportCapaCompareToExcelCompat,
  exportCommonJsonCompat,
  exportSingleDeviceToExcelCompat,
} from './utils/tauriExportUtils';
import { getTauriAdapter } from './utils/tauriAdapter';
import { DEVICE_COLOR, STATUS_COLOR } from './constants/statusMeta';
import type { RatType, ComboDisplayOptions, CapaCompareResult, RatCompareResult } from '@ohmycapa/capa-core';

// ─── Constants & Types ──────────────────────────────────────────────────────

const RAT_TABS: { value: RatType; label: string }[] = [
  { value: 'nr', label: 'NR (5G)' },
  { value: 'eutra', label: 'EUTRA (LTE)' },
  { value: 'eutra-nr', label: 'EUTRA-NR (MRDC)' },
  { value: 'utra', label: 'UTRA (3G)' },
];

type DetailSection = 'combos' | 'bands' | 'features';

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * Unified Export dropdown consolidating Compare Excel and A/B single exports.
 */
const ExportMenu = memo<{
  deviceA: any;
  deviceB: any;
  compareResult: CapaCompareResult | null;
}>(({ deviceA, deviceB, compareResult }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const close = () => setAnchorEl(null);

  return (
    <>
      <Button
        size="small"
        variant="contained"
        disableElevation
        startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 14 }} />}
        onClick={e => setAnchorEl(e.currentTarget)}
        sx={{ fontSize: '0.7rem', py: 0.3, px: 1.1, textTransform: 'none', borderRadius: 1.5, minHeight: 26 }}
      >
        Export
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 190, mt: 0.5 } } }}
      >
        {compareResult && (
          <MenuItem
            dense
            onClick={() => {
              close();
              void exportCapaCompareToExcelCompat(compareResult);
            }}
          >
            <ListItemIcon sx={{ minWidth: 26 }}>
              <DownloadIcon sx={{ fontSize: 15, color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText primary="Export Compare Excel" slotProps={{ primary: { sx: { fontSize: '0.75rem', fontWeight: 600 } } }} />
          </MenuItem>
        )}
        {compareResult && (deviceA.normalized || deviceB.normalized) && <Divider sx={{ my: 0.5 }} />}
        {deviceA.normalized && (
          <MenuItem
            dense
            onClick={() => {
              close();
              void exportSingleDeviceToExcelCompat(deviceA.normalized!, 'A');
            }}
          >
            <ListItemIcon sx={{ minWidth: 26 }}>
              <DownloadIcon sx={{ fontSize: 15, color: DEVICE_COLOR.deviceA }} />
            </ListItemIcon>
            <ListItemText primary="Device A Excel" slotProps={{ primary: { sx: { fontSize: '0.74rem' } } }} />
          </MenuItem>
        )}
        {deviceA.normalized && (
          <MenuItem
            dense
            onClick={() => {
              close();
              void exportCommonJsonCompat(deviceA.normalized!, 'A');
            }}
          >
            <ListItemIcon sx={{ minWidth: 26 }}>
              <DownloadIcon sx={{ fontSize: 15, color: DEVICE_COLOR.deviceA }} />
            </ListItemIcon>
            <ListItemText primary="Device A JSON" slotProps={{ primary: { sx: { fontSize: '0.74rem' } } }} />
          </MenuItem>
        )}
        {deviceB.normalized && (
          <MenuItem
            dense
            onClick={() => {
              close();
              void exportSingleDeviceToExcelCompat(deviceB.normalized!, 'B');
            }}
          >
            <ListItemIcon sx={{ minWidth: 26 }}>
              <DownloadIcon sx={{ fontSize: 15, color: DEVICE_COLOR.deviceB }} />
            </ListItemIcon>
            <ListItemText primary="Device B Excel" slotProps={{ primary: { sx: { fontSize: '0.74rem' } } }} />
          </MenuItem>
        )}
        {deviceB.normalized && (
          <MenuItem
            dense
            onClick={() => {
              close();
              void exportCommonJsonCompat(deviceB.normalized!, 'B');
            }}
          >
            <ListItemIcon sx={{ minWidth: 26 }}>
              <DownloadIcon sx={{ fontSize: 15, color: DEVICE_COLOR.deviceB }} />
            </ListItemIcon>
            <ListItemText primary="Device B JSON" slotProps={{ primary: { sx: { fontSize: '0.74rem' } } }} />
          </MenuItem>
        )}
      </Menu>
    </>
  );
});

/**
 * Compact 1-line compare header shown once comparison results are ready.
 * Keeps ~85%+ of vertical space focused on combo/band/feature diffs.
 */
const CompactCompareHeader = memo<{
  deviceA: any;
  deviceB: any;
  compareResult: CapaCompareResult;
  isProcessing: boolean;
  isComparing: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSwap: () => void;
}>(({ deviceA, deviceB, compareResult, isProcessing, isComparing, isExpanded, onToggleExpand, onSwap }) => {
  const isDark = useTheme().palette.mode === 'dark';

  const kpi = useMemo(() => {
    let unique = 0;
    let paramDiff = 0;
    let covered = 0;
    let bandDiff = 0;
    let featureDiff = 0;

    for (const s of Object.values(compareResult.summary.perRat)) {
      if (!s) continue;
      unique += s.combos.aOnlyUnique + s.combos.bOnlyUnique;
      paramDiff += s.combos.exactChanged;
      covered += s.combos.aOnlyCovered + s.combos.bOnlyCovered;
      bandDiff += s.bands.changed + s.bands.aOnly + s.bands.bOnly;
    }

    if (compareResult.featuresDiff) {
      for (const fd of Object.values(compareResult.featuresDiff)) {
        if (!fd) continue;
        featureDiff += fd.counts.different + fd.counts.aOnly + fd.counts.bOnly;
      }
    }

    return { unique, paramDiff, covered, bandDiff, featureDiff };
  }, [compareResult]);

  const nameA = deviceA.deviceName || compareResult.meta.deviceA.fileName;
  const nameB = deviceB.deviceName || compareResult.meta.deviceB.fileName;
  const vendorA = compareResult.meta.deviceA.vendor;
  const vendorB = compareResult.meta.deviceB.vendor;
  const allIdentical =
    kpi.unique === 0 && kpi.paramDiff === 0 && kpi.covered === 0 && kpi.bandDiff === 0 && kpi.featureDiff === 0;

  return (
    <Paper
      elevation={0}
      sx={{
        px: 1.5,
        py: 0.75,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        borderRadius: 2.5,
        bgcolor: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        flexWrap: 'wrap',
      }}
    >
      {/* Left: Device A <-> B pills + Global Diff KPIs */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
        {/* Device A Pill */}
        <Tooltip title={nameA} placement="bottom">
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.6, px: 1, py: 0.3, borderRadius: 1.5,
            border: '1px solid', borderColor: `${DEVICE_COLOR.deviceA}44`, bgcolor: `${DEVICE_COLOR.deviceA}0d`,
          }}>
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.68rem', color: DEVICE_COLOR.deviceA }}>
              A
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nameA}
            </Typography>
            {vendorA && vendorA !== 'UNKNOWN' && (
              <Chip label={vendorA} size="small" sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700 }} />
            )}
          </Box>
        </Tooltip>

        {/* Swap / Spinner */}
        {isProcessing || isComparing ? (
          <CircularProgress size={16} />
        ) : (
          <Tooltip title="Swap A ↔ B" placement="top">
            <IconButton size="small" onClick={onSwap} sx={{ p: 0.4, color: 'primary.main' }}>
              <SwapHorizIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Device B Pill */}
        <Tooltip title={nameB} placement="bottom">
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.6, px: 1, py: 0.3, borderRadius: 1.5,
            border: '1px solid', borderColor: `${DEVICE_COLOR.deviceB}44`, bgcolor: `${DEVICE_COLOR.deviceB}0d`,
          }}>
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.68rem', color: DEVICE_COLOR.deviceB }}>
              B
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nameB}
            </Typography>
            {vendorB && vendorB !== 'UNKNOWN' && (
              <Chip label={vendorB} size="small" sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700 }} />
            )}
          </Box>
        </Tooltip>

        {/* Global Cross-RAT Diff KPI Badges */}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.3 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap' }}>
          {allIdentical ? (
            <Chip
              size="small"
              label="100% Identical ✓"
              sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(16,185,129,0.12)', color: STATUS_COLOR.green }}
            />
          ) : (
            <>
              {kpi.unique > 0 && (
                <Chip
                  size="small"
                  label={`Unique ${kpi.unique}`}
                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(239,68,68,0.12)', color: STATUS_COLOR.red }}
                />
              )}
              {kpi.paramDiff > 0 && (
                <Chip
                  size="small"
                  label={`Param ${kpi.paramDiff}`}
                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(245,158,11,0.12)', color: STATUS_COLOR.amber }}
                />
              )}
              {kpi.covered > 0 && (
                <Chip
                  size="small"
                  label={`Covered ${kpi.covered}`}
                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(99,102,241,0.12)', color: STATUS_COLOR.indigo }}
                />
              )}
              {kpi.bandDiff > 0 && (
                <Chip
                  size="small"
                  label={`Bands ${kpi.bandDiff}`}
                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, bgcolor: 'rgba(245,158,11,0.1)', color: STATUS_COLOR.amber }}
                />
              )}
              {kpi.featureDiff > 0 && (
                <Chip
                  size="small"
                  label={`Features ${kpi.featureDiff}`}
                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, bgcolor: 'rgba(245,158,11,0.1)', color: STATUS_COLOR.amber }}
                />
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Right: Expand/Collapse Files & Summary Drawer + Unified Export */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          endIcon={isExpanded ? <ExpandLessIcon sx={{ fontSize: 15 }} /> : <ExpandMoreIcon sx={{ fontSize: 15 }} />}
          onClick={onToggleExpand}
          sx={{
            fontSize: '0.7rem', py: 0.25, px: 1, textTransform: 'none',
            borderRadius: 1.5, minHeight: 26, color: 'text.secondary', borderColor: 'divider',
          }}
        >
          Files & Summary
        </Button>
        <ExportMenu deviceA={deviceA} deviceB={deviceB} compareResult={compareResult} />
      </Box>
    </Paper>
  );
});

/**
 * Detailed label for RAT tabs including diff badges.
 */
const RatTabLabel = memo<{
  label: string;
  uniqueCount: number;
  featureDiffCount: number;
}>(({ label, uniqueCount, featureDiffCount }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    {label}
    {uniqueCount > 0 && (
      <Chip
        label={uniqueCount}
        size="small"
        sx={{ height: 16, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'rgba(239,68,68,0.15)', color: STATUS_COLOR.red, ml: 0.5 }}
      />
    )}
    {featureDiffCount > 0 && (
      <Chip
        label={`F:${featureDiffCount}`}
        size="small"
        sx={{ height: 16, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'rgba(245,158,11,0.15)', color: STATUS_COLOR.amber, ml: 0.5 }}
      />
    )}
  </Box>
));

/**
 * Detailed view for a specific RAT's active sub-section (Combos / Bands / Features).
 */
const RatDetailView = memo<{
  ratType: RatType;
  activeSection: DetailSection;
  ratResult: RatCompareResult;
  compareResult: CapaCompareResult;
  comboOptions: ComboDisplayOptions;
  onComboOptionsChange: (options: Partial<ComboDisplayOptions>) => void;
  onOpenUrl?: (url: string) => void;
}>(({ ratType, activeSection, ratResult, compareResult, comboOptions, onComboOptionsChange, onOpenUrl }) => {
  const featureDiff = compareResult.featuresDiff?.[ratType];
  const hasData = ratResult.bandDiffs.length > 0 || ratResult.comboDiffs.length > 0 || !!featureDiff;

  if (!hasData) {
    return (
      <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography variant="body2">No data for this RAT</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1.5, flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {activeSection === 'combos' && (
        <ComboCompareView
          key={`combos-${ratType}`}
          comboDiffs={ratResult.comboDiffs}
          coverage={ratResult.coverage}
          deviceAName={compareResult.meta.deviceA.fileName}
          deviceBName={compareResult.meta.deviceB.fileName}
          displayOptions={comboOptions}
          ratType={ratType}
          onDisplayOptionsChange={onComboOptionsChange}
        />
      )}

      {activeSection === 'bands' && (
        <BandCompareTable
          key={`bands-${ratType}`}
          bandDiffs={ratResult.bandDiffs}
          ratType={ratType}
        />
      )}

      {activeSection === 'features' && featureDiff && (
        <FeaturesCompareView
          key={`features-${ratType}`}
          featuresDiff={featureDiff}
          deviceAName={compareResult.meta.deviceA.fileName}
          deviceBName={compareResult.meta.deviceB.fileName}
          onOpenUrl={onOpenUrl}
        />
      )}
    </Box>
  );
});

/**
 * Tab panel showing RAT tabs (left), Sub-section selector (right), and active diff view.
 */
const ComparisonPanel = memo<{
  compareResult: CapaCompareResult;
  availableRats: { value: RatType; label: string; uniqueCount: number; featureDiffCount: number }[];
  activeRatValue: RatType | undefined;
  comboOptions: ComboDisplayOptions;
  onRatChange: (rat: RatType) => void;
  onComboOptionsChange: (updates: Partial<ComboDisplayOptions>) => void;
  onOpenUrl?: (url: string) => void;
}>(({ compareResult, availableRats, activeRatValue, comboOptions, onRatChange, onComboOptionsChange, onOpenUrl }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [sectionByRat, setSectionByRat] = useState<Partial<Record<RatType, DetailSection>>>({});

  const activeRatResult = activeRatValue ? compareResult.ratResults[activeRatValue] : undefined;
  const activeFeatureDiff = activeRatValue ? compareResult.featuresDiff?.[activeRatValue] : undefined;

  const sectionMeta = useMemo(() => {
    const comboTotal = activeRatResult?.comboDiffs.length ?? 0;
    const comboDiff = activeRatResult?.comboDiffs.filter(d => d.status !== 'exact-same').length ?? 0;
    const bandTotal = activeRatResult?.bandDiffs.length ?? 0;
    const bandDiff = activeRatResult?.bandDiffs.filter(d => d.status !== 'same').length ?? 0;
    const featureTotal = activeFeatureDiff?.diffs.length ?? 0;
    const featureDiff = activeFeatureDiff
      ? activeFeatureDiff.counts.different + activeFeatureDiff.counts.aOnly + activeFeatureDiff.counts.bOnly
      : 0;

    return {
      combos: { total: comboTotal, diff: comboDiff, available: comboTotal > 0 },
      bands: { total: bandTotal, diff: bandDiff, available: bandTotal > 0 },
      features: { total: featureTotal, diff: featureDiff, available: featureTotal > 0 },
    };
  }, [activeRatResult, activeFeatureDiff]);

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

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 3,
        overflow: 'hidden',
        bgcolor: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Unified Header Row: RAT Tabs (Left) + Sub-Tab Segmented Switch (Right) */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid', borderColor: 'divider', px: 1, py: 0.25, gap: 1, flexWrap: 'wrap',
      }}>
        <Tabs
          value={activeRatValue ?? false}
          onChange={(_, v) => onRatChange(v as RatType)}
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0, fontSize: '0.75rem', textTransform: 'none' } }}
        >
          {availableRats.map(({ value, label, uniqueCount, featureDiffCount }) => (
            <Tab key={value} value={value} label={<RatTabLabel label={label} uniqueCount={uniqueCount} featureDiffCount={featureDiffCount} />} />
          ))}
        </Tabs>

        {activeRatResult && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={activeSection}
            onChange={handleSectionChange}
            sx={{
              '& .MuiToggleButton-root': {
                py: 0.25, px: 1, fontSize: '0.68rem', fontWeight: 600,
                textTransform: 'none', minHeight: 26, gap: 0.5,
              },
            }}
          >
            {sectionMeta.combos.available && (
              <ToggleButton value="combos">
                <span>Combos</span>
                <Chip
                  size="small"
                  label={sectionMeta.combos.diff > 0 ? `${sectionMeta.combos.diff}/${sectionMeta.combos.total}` : `${sectionMeta.combos.total}`}
                  sx={{
                    height: 15, fontSize: '0.58rem', fontWeight: 700,
                    bgcolor: sectionMeta.combos.diff > 0 ? 'rgba(239,68,68,0.14)' : 'rgba(16,185,129,0.12)',
                    color: sectionMeta.combos.diff > 0 ? STATUS_COLOR.red : STATUS_COLOR.green,
                  }}
                />
              </ToggleButton>
            )}
            {sectionMeta.bands.available && (
              <ToggleButton value="bands">
                <span>Bands</span>
                <Chip
                  size="small"
                  label={sectionMeta.bands.diff > 0 ? `${sectionMeta.bands.diff}` : `${sectionMeta.bands.total}`}
                  sx={{
                    height: 15, fontSize: '0.58rem', fontWeight: 700,
                    bgcolor: sectionMeta.bands.diff > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.12)',
                    color: sectionMeta.bands.diff > 0 ? STATUS_COLOR.amber : STATUS_COLOR.green,
                  }}
                />
              </ToggleButton>
            )}
            {sectionMeta.features.available && (
              <ToggleButton value="features">
                <span>Features</span>
                <Chip
                  size="small"
                  label={sectionMeta.features.diff > 0 ? `${sectionMeta.features.diff}` : `${sectionMeta.features.total}`}
                  sx={{
                    height: 15, fontSize: '0.58rem', fontWeight: 700,
                    bgcolor: sectionMeta.features.diff > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.12)',
                    color: sectionMeta.features.diff > 0 ? STATUS_COLOR.amber : STATUS_COLOR.green,
                  }}
                />
              </ToggleButton>
            )}
          </ToggleButtonGroup>
        )}
      </Box>

      {availableRats.length > 0 && activeRatValue && activeRatResult ? (
        <Box key={activeRatValue} sx={{ flexDirection: 'column', flex: 1, minHeight: 0, display: 'flex' }}>
          <RatDetailView
            ratType={activeRatValue}
            activeSection={activeSection}
            ratResult={activeRatResult}
            compareResult={compareResult}
            comboOptions={comboOptions}
            onComboOptionsChange={onComboOptionsChange}
            onOpenUrl={onOpenUrl}
          />
        </Box>
      ) : (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>
          <Typography variant="body2">No RAT data available</Typography>
        </Box>
      )}
    </Paper>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

export interface CapaComparePageProps {
  onOpenUrl?: (url: string) => void;
  emptyStateExtra?: React.ReactNode;
}

const CapaComparePage: React.FC<CapaComparePageProps> = ({ onOpenUrl, emptyStateExtra }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const {
    deviceA, deviceB,
    compareResult, activeRat, isComparing, setActiveRat,
    comboOptions, setComboOptions,
    addFiles, removeFile, setDeviceName, clearDevice, swapDevices,
  } = useCapaCompare();

  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);

  const isProcessing = deviceA.isProcessing || deviceB.isProcessing;
  const hasResult = !!compareResult;

  const handleFilesDrop = useCallback(async (side: 'a' | 'b', files: File[]) => {
    await addFiles(side, files);
    setIsHeaderExpanded(false);
  }, [addFiles]);

  const handleClearDevice = useCallback((side: 'a' | 'b') => {
    clearDevice(side);
    setIsHeaderExpanded(false);
  }, [clearDevice]);

  // Auto-expand dropzones when dragging files over a collapsed comparison page
  const handleRootDragEnter = useCallback((e: React.DragEvent) => {
    if (hasResult && !isHeaderExpanded && e.dataTransfer?.types?.includes('Files')) {
      setIsHeaderExpanded(true);
    }
  }, [hasResult, isHeaderExpanded]);

  // Tauri v2: browser DragEvent is not fired for OS-level file drops.
  // Uses registered TauriAdapter (set by OhMyCapa App.tsx via registerTauriAdapter).
  useEffect(() => {
    const tauriAdapter = getTauriAdapter();
    if (!tauriAdapter) return;
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    (async () => {
      unlisten = await tauriAdapter.onDragDrop(async (paths, x) => {
        const validPaths = paths.filter(p => { const n = p.toLowerCase(); return n.endsWith('.txt') || n.endsWith('.json'); });
        if (validPaths.length === 0) return;
        const files = await Promise.all(
          validPaths.map(async (p) => {
            const text = await tauriAdapter.readTextFile(p);
            return new File([text], p.split(/[\\/]/).pop() ?? p, { type: 'text/plain' });
          })
        );
        const physicalHalf = window.innerWidth * (window.devicePixelRatio || 1) / 2;
        await addFiles(x > physicalHalf ? 'b' : 'a', files);
        setIsHeaderExpanded(false);
      });
      if (cancelled) { unlisten(); unlisten = undefined; }
    })().catch(console.error);
    return () => { cancelled = true; unlisten?.(); };
  }, [addFiles]);

  // Derive single device info when no comparison is active
  const singleDeviceInfo = useMemo(() => {
    if (hasResult || isProcessing || isComparing) return null;
    if (deviceA.normalized) return { device: deviceA.normalized, side: 'A' as const };
    if (deviceB.normalized) return { device: deviceB.normalized, side: 'B' as const };
    return null;
  }, [hasResult, isProcessing, isComparing, deviceA.normalized, deviceB.normalized]);

  // Available RATs derived from compare result
  const availableRats = useMemo(() => {
    if (!compareResult) return [];
    return RAT_TABS
      .filter(t => !!compareResult.ratResults[t.value])
      .map(t => {
        const ratResult = compareResult.ratResults[t.value];
        const featuresDiff = compareResult.featuresDiff?.[t.value];

        const uniqueCount = ratResult
          ? ratResult.comboDiffs.filter(d => d.status === 'a-only-unique' || d.status === 'b-only-unique').length
          : 0;

        const featureDiffCount = featuresDiff
          ? featuresDiff.counts.different + featuresDiff.counts.aOnly + featuresDiff.counts.bOnly
          : 0;

        return { ...t, uniqueCount, featureDiffCount };
      });
  }, [compareResult]);

  const activeRatValue = useMemo(() => {
    return availableRats.find(t => t.value === activeRat)?.value ?? availableRats[0]?.value;
  }, [availableRats, activeRat]);

  const handleComboOptionsChange = useCallback((updates: Partial<ComboDisplayOptions>) => {
    setComboOptions(prev => ({ ...prev, ...updates }));
  }, [setComboOptions]);

  const dropzoneCard = (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        borderRadius: 3,
        bgcolor: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
      }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 2, alignItems: 'stretch' }}>
        <CapaDropzone
          side="A"
          device={deviceA}
          onFilesDrop={files => { void handleFilesDrop('a', files); }}
          onRemoveFile={name => removeFile('a', name)}
          onNameChange={name => setDeviceName('a', name)}
          onClear={() => handleClearDevice('a')}
        />

        {/* Center Area: Swap or Loading Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            {isProcessing || isComparing ? (
              <CircularProgress size={20} />
            ) : (
              <Tooltip title="Swap A ↔ B" placement="top">
                <span>
                  <IconButton
                    size="small"
                    onClick={swapDevices}
                    disabled={!deviceA.files.length && !deviceB.files.length}
                    sx={{
                      color: hasResult ? 'primary.main' : 'text.disabled',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <SwapHorizIcon sx={{ fontSize: 28 }} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
              vs
            </Typography>
          </Box>
        </Box>

        <CapaDropzone
          side="B"
          device={deviceB}
          onFilesDrop={files => { void handleFilesDrop('b', files); }}
          onRemoveFile={name => removeFile('b', name)}
          onNameChange={name => setDeviceName('b', name)}
          onClear={() => handleClearDevice('b')}
        />
      </Box>
    </Paper>
  );

  return (
    <Box
      onDragEnter={handleRootDragEnter}
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', bgcolor: 'background.default', position: 'relative' }}
    >
      {/* Premium subtle gradient background */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 350,
        background: isDark
          ? 'linear-gradient(180deg, rgba(33,150,243,0.06) 0%, rgba(33,150,243,0) 100%)'
          : 'linear-gradient(180deg, rgba(33,150,243,0.04) 0%, rgba(33,150,243,0) 100%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', px: 2, py: 1.25, display: 'flex', flexDirection: 'column', gap: 1.25, zIndex: 1 }}>
        {/* When comparing: compact 1-line header + collapsible Files/Summary drawer */}
        {compareResult ? (
          <>
            <CompactCompareHeader
              deviceA={deviceA}
              deviceB={deviceB}
              compareResult={compareResult}
              isProcessing={isProcessing}
              isComparing={isComparing}
              isExpanded={isHeaderExpanded}
              onToggleExpand={() => setIsHeaderExpanded(v => !v)}
              onSwap={swapDevices}
            />
            <Collapse in={isHeaderExpanded} unmountOnExit>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {dropzoneCard}
                <CompareSummaryDashboard result={compareResult} />
              </Box>
            </Collapse>
          </>
        ) : (
          dropzoneCard
        )}

        {/* Global States: Comparing / Empty */}
        {isComparing && !hasResult && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
            <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
              <CircularProgress size={32} sx={{ mb: 1.5 }} />
              <Typography variant="body2" sx={{ opacity: 0.7 }}>Comparing...</Typography>
            </Box>
          </Box>
        )}

        {!hasResult && !isProcessing && !isComparing && !singleDeviceInfo && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
            <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
              <CompareArrowsIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
              <Typography variant="body2" sx={{ opacity: 0.6 }}>
                Drop UE CAPA files of two devices to start comparison
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.4, display: 'block', mt: 0.5 }}>
                Supports MTK / SLSI / QUALCOMM .txt files · Automatic RAT merging by dropping multiple files
              </Typography>
              {emptyStateExtra && (
                <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {emptyStateExtra}
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Single Device View */}
        {singleDeviceInfo && (
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <SingleDeviceView device={singleDeviceInfo.device} side={singleDeviceInfo.side} onOpenUrl={onOpenUrl} />
          </Box>
        )}

        {/* Comparison Result View */}
        {compareResult && (
          <ComparisonPanel
            compareResult={compareResult}
            availableRats={availableRats}
            activeRatValue={activeRatValue}
            comboOptions={comboOptions}
            onRatChange={setActiveRat}
            onComboOptionsChange={handleComboOptionsChange}
            onOpenUrl={onOpenUrl}
          />
        )}
      </Box>
    </Box>
  );
};

export default CapaComparePage;

