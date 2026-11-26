import React, { useMemo, memo, useCallback, useDeferredValue, useEffect, useId, useRef, useState } from 'react';
import {
  Box, Paper, Tabs, Tab, Typography, Button, Collapse,
  Chip, useTheme, CircularProgress,
  ToggleButtonGroup, ToggleButton,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { CapaDropzone } from './components/CapaDropzone';
import { CompareOverviewView } from './components/CompareOverviewView';
import { BandCompareTable } from './components/BandCompareTable';
import { ComboCompareView } from './components/ComboCompareView';
import { FeaturesCompareView } from './components/FeaturesCompareView';
import { GlobalCompareFeaturesView, GlobalSingleFeaturesView } from './components/GlobalFeatureSearchView';
import { SingleDeviceView } from './components/SingleDeviceView';
import { SpecIssueReportDialog } from './components/SpecIssueReportDialog';
import { CompareTopBar, SingleTopBar } from './components/WorkbenchTopBar';
import { GlobalFileDropOverlay } from './components/GlobalFileDropOverlay';
import { EmptyCompareStage } from './components/EmptyCompareStage';
import { useCapaCompare } from './hooks/useCapaCompare';
import { getTauriAdapter } from './utils/tauriAdapter';
import { isValidCapaFileName } from './utils/fileDropUtils';
import {
  computeCrossRatMetrics,
  resolveKpiDrillDown,
  type DetailSection,
  type DrillDownTarget,
  type KpiKind,
} from './utils/compareMetrics';
import {
  buildGlobalCompareFeatureIndex,
  buildGlobalSingleFeatureIndex,
  filterGlobalCompareFeatures,
  filterGlobalSingleFeatures,
  getFeatureRowKey,
  type GlobalFeatureStatusFilter,
} from './utils/featureSearch';
import {
  MONO_FONT_FAMILY,
  RAT_TABS,
  STATUS_COLOR,
  getWorkbenchSurface,
} from './constants/statusMeta';
import { buildUnclassifiedSpecIssueReport } from '@ohmycapa/capa-core';
import type {
  RatType,
  ComboDisplayOptions,
  CapaCompareResult,
  RatCompareResult,
  CompareFormat,
  FeatureDiff,
  FeatureLeaf,
  UnclassifiedSpecIssueReport,
} from '@ohmycapa/capa-core';

// ─── Constants & Types ──────────────────────────────────────────────────────

type CompareViewMode = 'rat' | 'overview' | 'global-features';
type SingleViewMode = 'rat' | 'global-features';

const REPORT_NOTICE_KEY = 'ohmycapa:unclassified-report-notice-seen';
let reportNoticeShown = false;

// ─── Sub-components ──────────────────────────────────────────────────────────

const RatTabLabel = memo<{
  label: string;
  uniqueCount: number;
  featureDiffCount: number;
}>(({ label, uniqueCount, featureDiffCount }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <span>{label}</span>
    {uniqueCount > 0 && (
      <Chip
        label={uniqueCount}
        size="small"
        sx={{
          height: 16,
          fontSize: '0.62rem',
          fontWeight: 700,
          fontFamily: MONO_FONT_FAMILY,
          bgcolor: 'rgba(239,68,68,0.14)',
          color: STATUS_COLOR.red,
          '& .MuiChip-label': { px: 0.55 },
        }}
      />
    )}
    {featureDiffCount > 0 && (
      <Chip
        label={`F:${featureDiffCount}`}
        size="small"
        sx={{
          height: 16,
          fontSize: '0.62rem',
          fontWeight: 700,
          fontFamily: MONO_FONT_FAMILY,
          bgcolor: 'rgba(245,158,11,0.14)',
          color: STATUS_COLOR.amber,
          '& .MuiChip-label': { px: 0.55 },
        }}
      />
    )}
  </Box>
));

const RatDetailView = memo<{
  ratType: RatType;
  activeSection: DetailSection;
  ratResult?: RatCompareResult;
  compareResult: CapaCompareResult;
  deviceAName: string;
  deviceBName: string;
  comboOptions: ComboDisplayOptions;
  drillDownTarget: DrillDownTarget | null;
  onOpenUrl?: (url: string) => void;
}>(({
  ratType,
  activeSection,
  ratResult,
  compareResult,
  deviceAName,
  deviceBName,
  comboOptions,
  drillDownTarget,
  onOpenUrl,
}) => {
  const featureDiff = compareResult.featuresDiff?.[ratType];
  const hasData =
    (ratResult?.bandDiffs.length ?? 0) > 0 ||
    (ratResult?.comboDiffs.length ?? 0) > 0 ||
    (featureDiff?.diffs.length ?? 0) > 0;

  if (!hasData) {
    return (
      <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography variant="body2">No data for this RAT</Typography>
      </Box>
    );
  }

  const targetForRat = drillDownTarget?.rat === ratType ? drillDownTarget : null;

  return (
    <Box sx={{ p: 1.5, flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {activeSection === 'combos' && ratResult && (
        <ComboCompareView
          key={`combos-${ratType}`}
          comboDiffs={ratResult.comboDiffs}
          coverage={ratResult.coverage}
          deviceAName={deviceAName}
          deviceBName={deviceBName}
          displayOptions={comboOptions}
          ratType={ratType}
          initialFilter={targetForRat?.section === 'combos' ? targetForRat.comboFilter : undefined}
          filterVersion={targetForRat?.section === 'combos' ? targetForRat.version : undefined}
        />
      )}

      {activeSection === 'bands' && ratResult && (
        <BandCompareTable
          key={`bands-${ratType}`}
          bandDiffs={ratResult.bandDiffs}
          ratType={ratType}
          deviceAName={deviceAName}
          deviceBName={deviceBName}
          initialFilter={targetForRat?.section === 'bands' ? targetForRat.bandFilter : undefined}
          filterVersion={targetForRat?.section === 'bands' ? targetForRat.version : undefined}
        />
      )}

      {activeSection === 'features' && featureDiff && (
        <FeaturesCompareView
          key={`features-${ratType}`}
          featuresDiff={featureDiff}
          deviceAName={deviceAName}
          deviceBName={deviceBName}
          ratType={ratType}
          onOpenUrl={onOpenUrl}
          initialFilter={targetForRat?.section === 'features' ? targetForRat.featureFilter : undefined}
          initialMajor={targetForRat?.section === 'features' ? targetForRat.featureMajor : undefined}
          highlightFeatureId={targetForRat?.section === 'features' ? targetForRat.highlightFeatureId : undefined}
          navigationVersion={targetForRat?.section === 'features' ? targetForRat.version : undefined}
        />
      )}
    </Box>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

export interface CapaComparePageProps {
  onOpenUrl?: (url: string) => void;
  emptyStateExtra?: React.ReactNode;
}

const CapaComparePage: React.FC<CapaComparePageProps> = ({ onOpenUrl, emptyStateExtra }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);

  const {
    deviceA,
    deviceB,
    compareResult,
    activeRat,
    isComparing,
    comboOptions,
    setActiveRat,
    addFiles,
    removeFile,
    setDeviceName,
    clearDevice,
    swapDevices,
  } = useCapaCompare();

  // Workspace view states
  const [isFilesDrawerOpen, setIsFilesDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<CompareViewMode>('rat');
  const [singleViewMode, setSingleViewMode] = useState<SingleViewMode>('rat');
  const previousCompareViewRef = useRef<'rat' | 'overview'>('rat');
  const [sectionByRat, setSectionByRat] = useState<Partial<Record<RatType, DetailSection>>>({});
  const [drillDownTarget, setDrillDownTarget] = useState<DrillDownTarget | null>(null);
  const [singleJumpTarget, setSingleJumpTarget] = useState<{ rat: RatType; featureId: string; version: number } | null>(null);
  const navVersionRef = useRef(0);

  // Global feature search states
  const [globalFeatureQuery, setGlobalFeatureQuery] = useState('');
  const [globalFeatureStatus, setGlobalFeatureStatus] = useState<GlobalFeatureStatusFilter | undefined>(undefined);
  const [globalFeatureStatusVersion, setGlobalFeatureStatusVersion] = useState<number | undefined>(undefined);
  const globalSearchInputRef = useRef<HTMLInputElement | null>(null);

  // Unclassified spec notice / GitHub report dialog
  const [reportNotice, setReportNotice] = useState<UnclassifiedSpecIssueReport | null>(null);
  const [editingReport, setEditingReport] = useState<UnclassifiedSpecIssueReport | null>(null);
  const reportTitleId = useId();
  const reportDescriptionId = useId();

  // Browser/Electron global drag overlay state
  const [isDragOverlayOpen, setIsDragOverlayOpen] = useState(false);
  const dragDepthRef = useRef(0);

  const isProcessing = deviceA.isProcessing || deviceB.isProcessing;
  const hasResult = Boolean(compareResult);

  // Raw logs have parsed ASTs. Samples and restored snapshots only have normalized JSON.
  const analyzedA = deviceA.files.some(file => file.status === 'done' && file.ast) ? deviceA.normalized : null;
  const analyzedB = deviceB.files.some(file => file.status === 'done' && file.ast) ? deviceB.normalized : null;

  useEffect(() => {
    if (reportNoticeShown || isProcessing || (!analyzedA && !analyzedB)) return;
    try {
      if (window.localStorage.getItem(REPORT_NOTICE_KEY) === 'true') return;
    } catch {
      // Ignore storage access errors in restricted web contexts
    }

    const report = buildUnclassifiedSpecIssueReport([analyzedA, analyzedB]);
    if (report.totalCount === 0) return;
    reportNoticeShown = true;
    setReportNotice(report);
    try {
      window.localStorage.setItem(REPORT_NOTICE_KEY, 'true');
    } catch {
      // In-memory flag still covers this session
    }
  }, [analyzedA, analyzedB, isProcessing]);

  const closeReportNotice = () => setReportNotice(null);

  const editIssueReport = () => {
    setEditingReport(reportNotice);
    closeReportNotice();
  };

  const handleFilesDrop = useCallback(async (side: 'a' | 'b', files: File[]) => {
    const { hasError } = await addFiles(side, files);
    if (!hasError) setIsFilesDrawerOpen(false);
  }, [addFiles]);

  const handleClearDevice = useCallback((side: 'a' | 'b') => {
    clearDevice(side);
    setIsFilesDrawerOpen(false);
  }, [clearDevice]);

  const handleReset = useCallback(() => {
    clearDevice('a');
    clearDevice('b');
    setActiveRat('nr');
    setViewMode('rat');
    setSingleViewMode('rat');
    previousCompareViewRef.current = 'rat';
    setSectionByRat({});
    setDrillDownTarget(null);
    setSingleJumpTarget(null);
    setGlobalFeatureQuery('');
    setGlobalFeatureStatus(undefined);
    setIsFilesDrawerOpen(false);
  }, [clearDevice, setActiveRat]);

  // Browser / Electron drag-and-drop overlay handlers (disabled in Tauri v2)
  const isTauriEnv = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const hasDraggedFiles = (e: React.DragEvent): boolean =>
    Boolean(e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files'));

  // Derived single-device state
  const singleDeviceInfo = useMemo<{ device: CompareFormat; side: 'A' | 'B' } | null>(() => {
    if (hasResult || isProcessing || isComparing) return null;
    if (deviceA.normalized) return { device: deviceA.normalized, side: 'A' };
    if (deviceB.normalized) return { device: deviceB.normalized, side: 'B' };
    return null;
  }, [hasResult, isProcessing, isComparing, deviceA.normalized, deviceB.normalized]);

  const canUseGlobalDropOverlay = !isTauriEnv && (hasResult || Boolean(singleDeviceInfo)) && !isFilesDrawerOpen;

  const handleRootDragEnter = useCallback((e: React.DragEvent) => {
    if (!canUseGlobalDropOverlay || !hasDraggedFiles(e)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragOverlayOpen(true);
  }, [canUseGlobalDropOverlay]);

  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    if (!canUseGlobalDropOverlay || !hasDraggedFiles(e)) return;
    e.preventDefault();
  }, [canUseGlobalDropOverlay]);

  const handleRootDragLeave = useCallback((e: React.DragEvent) => {
    if (!canUseGlobalDropOverlay) return;
    if (dragDepthRef.current > 0) {
      dragDepthRef.current -= 1;
    }
    if (dragDepthRef.current === 0 || !e.relatedTarget) {
      dragDepthRef.current = 0;
      setIsDragOverlayOpen(false);
    }
  }, [canUseGlobalDropOverlay]);

  const handleRootDrop = useCallback(() => {
    dragDepthRef.current = 0;
    setIsDragOverlayOpen(false);
  }, []);

  useEffect(() => {
    if (!isDragOverlayOpen) return;
    const resetDrag = () => {
      dragDepthRef.current = 0;
      setIsDragOverlayOpen(false);
    };
    window.addEventListener('dragend', resetDrag);
    window.addEventListener('drop', resetDrag);
    return () => {
      window.removeEventListener('dragend', resetDrag);
      window.removeEventListener('drop', resetDrag);
    };
  }, [isDragOverlayOpen]);

  // Tauri v2 OS-level drag-and-drop
  useEffect(() => {
    const tauriAdapter = getTauriAdapter();
    if (!tauriAdapter) return;
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    (async () => {
      unlisten = await tauriAdapter.onDragDrop(async (paths, x) => {
        const validPaths = paths.filter(isValidCapaFileName);
        if (validPaths.length === 0) return;
        const files = await Promise.all(
          validPaths.map(async p => {
            const text = await tauriAdapter.readTextFile(p);
            return new File([text], p.split(/[\\/]/).pop() ?? p, { type: 'text/plain' });
          })
        );
        const physicalHalf = (window.innerWidth * (window.devicePixelRatio || 1)) / 2;
        const { hasError } = await addFiles(x > physicalHalf ? 'b' : 'a', files);
        if (!hasError) setIsFilesDrawerOpen(false);
      });
      if (cancelled) {
        unlisten();
        unlisten = undefined;
      }
    })().catch(console.error);
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [addFiles]);

  // Cross-RAT metrics for Overview, KPIs, and Tabs
  const crossRatMetrics = useMemo(
    () => (compareResult ? computeCrossRatMetrics(compareResult) : null),
    [compareResult]
  );

  // Memoized cross-RAT feature indexes (rebuilt only when compareResult / singleDevice changes)
  const globalCompareIndex = useMemo(
    () => (compareResult ? buildGlobalCompareFeatureIndex(compareResult) : undefined),
    [compareResult]
  );
  const globalSingleIndex = useMemo(
    () => (singleDeviceInfo ? buildGlobalSingleFeatureIndex(singleDeviceInfo.device) : undefined),
    [singleDeviceInfo]
  );

  const deferredGlobalQuery = useDeferredValue(globalFeatureQuery);

  // Global search live count badge for top bar
  const globalMatchCount = useMemo(() => {
    const trimmed = deferredGlobalQuery.trim();
    if (!trimmed) return undefined;
    if (globalCompareIndex) {
      return filterGlobalCompareFeatures(globalCompareIndex, { query: trimmed, status: 'all', rats: null }).totalMatchingQuery;
    }
    if (globalSingleIndex) {
      return filterGlobalSingleFeatures(globalSingleIndex, { query: trimmed, rats: null }).totalMatchingQuery;
    }
    return undefined;
  }, [deferredGlobalQuery, globalCompareIndex, globalSingleIndex]);

  const availableRats = useMemo(() => {
    if (!compareResult) return [];
    return RAT_TABS
      .filter(t => Boolean(compareResult.ratResults[t.value]) || (compareResult.featuresDiff?.[t.value]?.diffs.length ?? 0) > 0)
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

  const activeRatValue = useMemo(
    () => availableRats.find(t => t.value === activeRat)?.value ?? availableRats[0]?.value,
    [availableRats, activeRat]
  );

  const activeRatResult = activeRatValue ? compareResult?.ratResults[activeRatValue] : undefined;
  const activeFeatureDiff = activeRatValue ? compareResult?.featuresDiff?.[activeRatValue] : undefined;

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

  const handleGlobalQueryChange = useCallback((nextQuery: string) => {
    setGlobalFeatureQuery(nextQuery);
    if (nextQuery.trim()) {
      if (compareResult) {
        if (viewMode !== 'global-features') {
          previousCompareViewRef.current = viewMode;
        }
        setViewMode('global-features');
      } else if (singleDeviceInfo) {
        setSingleViewMode('global-features');
      }
    }
  }, [compareResult, singleDeviceInfo, viewMode]);

  const handleOpenGlobalFeatures = useCallback((status?: GlobalFeatureStatusFilter) => {
    if (viewMode !== 'global-features') {
      previousCompareViewRef.current = viewMode;
    }
    if (status) {
      setGlobalFeatureQuery('');
      setGlobalFeatureStatus(status);
      setGlobalFeatureStatusVersion(v => (v ?? 0) + 1);
    }
    setViewMode('global-features');
  }, [viewMode]);

  const handleDrillDown = useCallback((target: Omit<DrillDownTarget, 'version'>) => {
    navVersionRef.current += 1;
    setActiveRat(target.rat);
    setSectionByRat(prev => ({ ...prev, [target.rat]: target.section }));
    setDrillDownTarget({ ...target, version: navVersionRef.current });
    previousCompareViewRef.current = 'rat';
    setViewMode('rat');
  }, [setActiveRat]);

  const handleKpiClick = useCallback((kind: KpiKind) => {
    if (!crossRatMetrics) return;
    const res = resolveKpiDrillDown(crossRatMetrics, kind);
    if (!res) return;
    if (res.kind === 'global-features') {
      handleOpenGlobalFeatures(res.featureFilter);
      return;
    }
    handleDrillDown({
      rat: res.rat,
      section: res.section,
      comboFilter: res.comboFilter,
      bandFilter: res.bandFilter,
      featureFilter: res.featureFilter,
    });
  }, [crossRatMetrics, handleDrillDown, handleOpenGlobalFeatures]);

  const handleJumpFromGlobalCompare = useCallback((rat: RatType, diff: FeatureDiff) => {
    handleDrillDown({
      rat,
      section: 'features',
      featureFilter: diff.status === 'same' ? 'all' : 'diff',
      featureMajor: null,
      highlightFeatureId: getFeatureRowKey(diff.major, diff.middle, diff.leaf),
    });
  }, [handleDrillDown]);

  const handleJumpFromGlobalSingle = useCallback((rat: RatType, leaf: FeatureLeaf) => {
    navVersionRef.current += 1;
    setSingleJumpTarget({
      rat,
      featureId: getFeatureRowKey(leaf.major, leaf.middle, leaf.leaf),
      version: navVersionRef.current,
    });
    setSingleViewMode('rat');
  }, []);

  // Global keyboard shortcuts: Ctrl/Cmd+K, '/', and Escape
  useEffect(() => {
    const isDialogOpen = reportNotice !== null || editingReport !== null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDialogOpen) return;
      const active = document.activeElement as HTMLElement | null;
      const isInlineEditing = active?.dataset?.inlineEditing === 'true';

      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        if (!compareResult && !singleDeviceInfo) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        globalSearchInputRef.current?.focus();
        globalSearchInputRef.current?.select();
        return;
      }

      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!compareResult && !singleDeviceInfo) return;
        const tag = active?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active?.isContentEditable) return;
        e.preventDefault();
        e.stopPropagation();
        globalSearchInputRef.current?.focus();
        return;
      }

      if (e.key === 'Escape' && !isInlineEditing) {
        if (compareResult && (viewMode === 'global-features' || globalFeatureQuery.trim())) {
          e.preventDefault();
          e.stopPropagation();
          setGlobalFeatureQuery('');
          setViewMode(previousCompareViewRef.current);
          globalSearchInputRef.current?.blur();
        } else if (singleDeviceInfo && (singleViewMode === 'global-features' || globalFeatureQuery.trim())) {
          e.preventDefault();
          e.stopPropagation();
          setGlobalFeatureQuery('');
          setSingleViewMode('rat');
          globalSearchInputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [reportNotice, editingReport, compareResult, singleDeviceInfo, viewMode, singleViewMode, globalFeatureQuery]);

  const deviceAName = deviceA.deviceName || compareResult?.meta.deviceA.fileName || 'Device A';
  const deviceBName = deviceB.deviceName || compareResult?.meta.deviceB.fileName || 'Device B';

  const filesDrawerDropzone = (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        border: '1px solid',
        borderColor: surface.border,
        borderRadius: 2,
        bgcolor: surface.panelBg,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 1.5,
          alignItems: 'stretch',
        }}
      >
        <Box sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: surface.laneABorder, bgcolor: surface.laneABg }}>
          <CapaDropzone
            side="A"
            device={deviceA}
            compact
            onFilesDrop={files => { void handleFilesDrop('a', files); }}
            onRemoveFile={name => removeFile('a', name)}
            onClear={() => handleClearDevice('a')}
            onOpenUrl={onOpenUrl}
          />
        </Box>
        <Box sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: surface.laneBBorder, bgcolor: surface.laneBBg }}>
          <CapaDropzone
            side="B"
            device={deviceB}
            compact
            onFilesDrop={files => { void handleFilesDrop('b', files); }}
            onRemoveFile={name => removeFile('b', name)}
            onClear={() => handleClearDevice('b')}
            onOpenUrl={onOpenUrl}
          />
        </Box>
      </Box>
    </Paper>
  );

  const compareTabValue =
    viewMode === 'overview'
      ? '__overview__'
      : viewMode === 'global-features'
        ? '__global_features__'
        : (activeRatValue ?? false);

  return (
    <Box
      onDragEnter={handleRootDragEnter}
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        bgcolor: 'background.default',
        position: 'relative',
      }}
    >
      <GlobalFileDropOverlay
        open={isDragOverlayOpen}
        onDropSide={(side, files) => { void handleFilesDrop(side, files); }}
        onClose={() => {
          dragDepthRef.current = 0;
          setIsDragOverlayOpen(false);
        }}
      />

      <Dialog
        open={reportNotice !== null}
        onClose={closeReportNotice}
        aria-labelledby={reportTitleId}
        aria-describedby={reportDescriptionId}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id={reportTitleId}>Report unclassified capabilities?</DialogTitle>
        <DialogContent>
          <DialogContentText id={reportDescriptionId}>
            This analysis found {reportNotice?.totalCount} unclassified {reportNotice?.totalCount === 1 ? 'capability' : 'capabilities'}.
            You can include a log excerpt in the GitHub draft, or report later from the Features tab.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={closeReportNotice}>Not now</Button>
          <Button variant="contained" onClick={editIssueReport}>Report to GitHub</Button>
        </DialogActions>
      </Dialog>
      {editingReport && (
        <SpecIssueReportDialog report={editingReport} onClose={() => setEditingReport(null)} onOpenUrl={onOpenUrl} />
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          px: { xs: 1, sm: 2 },
          py: 1.25,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Top Workbench Bar + Collapsible Files Drawer */}
        {compareResult && crossRatMetrics ? (
          <>
            <CompareTopBar
              deviceA={deviceA}
              deviceB={deviceB}
              compareResult={compareResult}
              metrics={crossRatMetrics}
              isProcessing={isProcessing}
              isComparing={isComparing}
              isFilesExpanded={isFilesDrawerOpen}
              onToggleFiles={() => setIsFilesDrawerOpen(v => !v)}
              onSwap={swapDevices}
              onReset={handleReset}
              onRenameDevice={setDeviceName}
              onKpiClick={handleKpiClick}
              globalQuery={globalFeatureQuery}
              onGlobalQueryChange={handleGlobalQueryChange}
              globalSearchRef={globalSearchInputRef}
              globalMatchCount={globalMatchCount}
            />
            <Collapse in={isFilesDrawerOpen} unmountOnExit>
              <Box sx={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {filesDrawerDropzone}
              </Box>
            </Collapse>
          </>
        ) : singleDeviceInfo ? (
          <>
            <SingleTopBar
              device={singleDeviceInfo.device}
              side={singleDeviceInfo.side}
              deviceA={deviceA}
              deviceB={deviceB}
              isProcessing={isProcessing}
              isFilesExpanded={isFilesDrawerOpen}
              onExpandFiles={() => setIsFilesDrawerOpen(true)}
              onToggleFiles={() => setIsFilesDrawerOpen(v => !v)}
              onSwap={swapDevices}
              onReset={handleReset}
              onRenameDevice={setDeviceName}
              globalQuery={globalFeatureQuery}
              onGlobalQueryChange={handleGlobalQueryChange}
              globalSearchRef={globalSearchInputRef}
              globalMatchCount={globalMatchCount}
            />
            <Collapse in={isFilesDrawerOpen} unmountOnExit>
              <Box sx={{ maxHeight: '55vh', overflowY: 'auto' }}>
                {filesDrawerDropzone}
              </Box>
            </Collapse>
          </>
        ) : null}

        {/* Comparing Spinner */}
        {isComparing && !hasResult && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
            <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
              <CircularProgress size={32} sx={{ mb: 1.5 }} />
              <Typography variant="body2" sx={{ opacity: 0.75 }}>Comparing capabilities...</Typography>
            </Box>
          </Box>
        )}

        {/* Empty State */}
        {!hasResult && !isComparing && !singleDeviceInfo && (
          <EmptyCompareStage
            deviceA={deviceA}
            deviceB={deviceB}
            isProcessing={isProcessing}
            isComparing={isComparing}
            onFilesDrop={(side, files) => { void handleFilesDrop(side, files); }}
            onRemoveFile={removeFile}
            onClearDevice={handleClearDevice}
            onSwap={swapDevices}
            onOpenUrl={onOpenUrl}
            emptyStateExtra={emptyStateExtra}
          />
        )}

        {/* Single Device Workspace */}
        {singleDeviceInfo && (
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {singleViewMode === 'global-features' ? (
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
                    px: 1.5,
                    py: 0.65,
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <ManageSearchIcon sx={{ fontSize: 17, color: 'primary.main' }} />
                    <Typography variant="subtitle2" sx={{ fontSize: '0.78rem', fontWeight: 700 }}>
                      All Features Search · Device {singleDeviceInfo.side}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ArrowBackIcon sx={{ fontSize: 14 }} />}
                    onClick={() => {
                      setGlobalFeatureQuery('');
                      setSingleViewMode('rat');
                    }}
                    sx={{ fontSize: '0.68rem', py: 0.2, px: 1, textTransform: 'none', borderRadius: 1.5, minHeight: 26 }}
                  >
                    Back to RAT View
                  </Button>
                </Box>
                <Box sx={{ p: 1.5, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <GlobalSingleFeaturesView
                    device={singleDeviceInfo.device}
                    side={singleDeviceInfo.side}
                    query={globalFeatureQuery}
                    onQueryChange={handleGlobalQueryChange}
                    precomputedIndex={globalSingleIndex}
                    onJumpToRat={handleJumpFromGlobalSingle}
                    onOpenUrl={onOpenUrl}
                  />
                </Box>
              </Paper>
            ) : (
              <SingleDeviceView
                device={singleDeviceInfo.device}
                side={singleDeviceInfo.side}
                onOpenUrl={onOpenUrl}
                hideHeader
                onOpenGlobalFeatures={() => setSingleViewMode('global-features')}
                jumpTarget={singleJumpTarget}
              />
            )}
          </Box>
        )}

        {/* AB Compare Workspace */}
        {compareResult && crossRatMetrics && (
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
            {/* Unified Header Row: Overview + RAT Tabs + All Features (Left) | Sub-Section Switcher (Right) */}
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
                value={compareTabValue}
                onChange={(_, v) => {
                  if (v === '__overview__') {
                    previousCompareViewRef.current = 'overview';
                    setViewMode('overview');
                  } else if (v === '__global_features__') {
                    handleOpenGlobalFeatures();
                  } else {
                    previousCompareViewRef.current = 'rat';
                    setActiveRat(v as RatType);
                    setViewMode('rat');
                  }
                }}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 38,
                  maxWidth: '100%',
                  '& .MuiTab-root': { minHeight: 38, py: 0, fontSize: '0.74rem', textTransform: 'none', fontWeight: 600 },
                }}
              >
                <Tab
                  value="__overview__"
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <DashboardOutlinedIcon sx={{ fontSize: 15 }} />
                      <span>Overview</span>
                    </Box>
                  }
                />

                {availableRats.map(({ value, label, uniqueCount, featureDiffCount }) => (
                  <Tab
                    key={value}
                    value={value}
                    label={<RatTabLabel label={label} uniqueCount={uniqueCount} featureDiffCount={featureDiffCount} />}
                  />
                ))}

                {crossRatMetrics.totals.features.total > 0 && (
                  <Tab
                    value="__global_features__"
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ManageSearchIcon sx={{ fontSize: 15 }} />
                        <span>All Features</span>
                        <Chip
                          label={
                            crossRatMetrics.totals.features.diff > 0
                              ? crossRatMetrics.totals.features.diff
                              : crossRatMetrics.totals.features.total
                          }
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            fontFamily: MONO_FONT_FAMILY,
                            bgcolor:
                              crossRatMetrics.totals.features.diff > 0
                                ? 'rgba(245,158,11,0.14)'
                                : 'rgba(16,185,129,0.12)',
                            color:
                              crossRatMetrics.totals.features.diff > 0
                                ? STATUS_COLOR.amber
                                : STATUS_COLOR.green,
                            '& .MuiChip-label': { px: 0.55 },
                          }}
                        />
                      </Box>
                    }
                  />
                )}
              </Tabs>

              {viewMode === 'rat' && Boolean(activeRatResult || (activeFeatureDiff && activeFeatureDiff.diffs.length > 0)) && (
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
                        label={sectionMeta.combos.diff > 0 ? `${sectionMeta.combos.diff}/${sectionMeta.combos.total}` : `${sectionMeta.combos.total}`}
                        sx={{
                          height: 15,
                          fontSize: '0.58rem',
                          fontWeight: 700,
                          fontFamily: MONO_FONT_FAMILY,
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
                          height: 15,
                          fontSize: '0.58rem',
                          fontWeight: 700,
                          fontFamily: MONO_FONT_FAMILY,
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
                          height: 15,
                          fontSize: '0.58rem',
                          fontWeight: 700,
                          fontFamily: MONO_FONT_FAMILY,
                          bgcolor: sectionMeta.features.diff > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.12)',
                          color: sectionMeta.features.diff > 0 ? STATUS_COLOR.amber : STATUS_COLOR.green,
                        }}
                      />
                    </ToggleButton>
                  )}
                </ToggleButtonGroup>
              )}
            </Box>

            {/* Body */}
            {viewMode === 'overview' ? (
              <Box sx={{ p: 1.5, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <CompareOverviewView
                  compareResult={compareResult}
                  metrics={crossRatMetrics}
                  deviceAName={deviceAName}
                  deviceBName={deviceBName}
                  onDrillDown={handleDrillDown}
                  onOpenGlobalFeatures={handleOpenGlobalFeatures}
                />
              </Box>
            ) : viewMode === 'global-features' ? (
              <Box sx={{ p: 1.5, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <GlobalCompareFeaturesView
                  compareResult={compareResult}
                  query={globalFeatureQuery}
                  onQueryChange={handleGlobalQueryChange}
                  deviceAName={deviceAName}
                  deviceBName={deviceBName}
                  initialStatus={globalFeatureStatus}
                  statusVersion={globalFeatureStatusVersion}
                  precomputedIndex={globalCompareIndex}
                  onJumpToRat={handleJumpFromGlobalCompare}
                  onOpenUrl={onOpenUrl}
                />
              </Box>
            ) : availableRats.length > 0 && activeRatValue && (activeRatResult || (activeFeatureDiff && activeFeatureDiff.diffs.length > 0)) ? (
              <Box key={activeRatValue} sx={{ flexDirection: 'column', flex: 1, minHeight: 0, display: 'flex' }}>
                <RatDetailView
                  ratType={activeRatValue}
                  activeSection={activeSection}
                  ratResult={activeRatResult}
                  compareResult={compareResult}
                  deviceAName={deviceAName}
                  deviceBName={deviceBName}
                  comboOptions={comboOptions}
                  drillDownTarget={drillDownTarget}
                  onOpenUrl={onOpenUrl}
                />
              </Box>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>
                <Typography variant="body2">No RAT data available</Typography>
              </Box>
            )}
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default CapaComparePage;
