import React, { useState, useMemo, useDeferredValue, useCallback, useEffect, useRef } from 'react';
import {
  Box, Typography, Chip, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton,
  Accordion, AccordionSummary, AccordionDetails,
  Tooltip, Button, IconButton, useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import BugReportIcon from '@mui/icons-material/BugReport';
import {
  buildUnclassifiedSpecIssueReport,
  type CommonCapaJson,
  type FeatureDiff,
  type FeatureLeaf,
  type RatFeaturesDiff,
  type RatType,
  type UnclassifiedSpecIssueReport,
} from '@ohmycapa/capa-core';
import { SpecIssueReportDialog } from './SpecIssueReportDialog';
import { useOptionalCapaCompare } from '../contexts/CapaCompareContext';
import { DEVICE_COLOR, MONO_FONT_FAMILY, STATUS_COLOR, getWorkbenchSurface } from '../constants/statusMeta';
import type { FeatureFilterKey } from '../utils/compareMetrics';
import {
  formatFeatureCompareCopyText,
  formatFeatureValue,
  formatSingleFeatureCopyText,
  getFeatureRowKey,
  tokenizeQuery,
} from '../utils/featureSearch';
import {
  CopyActionButton,
  FeatureScalarCell,
  FeatureStatusChip,
  HighlightText,
  OpenUrlContext,
  StringListCell,
  buildAutoIssueUrlFromEntries,
  getStrongerSide,
  openExternalReportUrl,
  shortenDeviceName,
  useOpenUrlContext,
} from './featureRenderHelpers';

// ─── Filter & expand types ────────────────────────────────────────────────────

type FilterMode = FeatureFilterKey;

interface ExpandSignal {
  mode: 'auto' | 'all' | 'none';
  version: number;
  forceMajor?: string;
}

const FGI_MIDDLE_ORDER = ['FGI-Rel9', 'FGI-Rel9-Add', 'FGI-Rel10', 'FGI-Rel10-FDD', 'FGI-Rel10-TDD'];

// ─── Single feature diff row ──────────────────────────────────────────────────

interface FeatureRowProps {
  diff: FeatureDiff;
  isDark: boolean;
  searchQuery: string;
  isHighlighted: boolean;
  ratType?: RatType;
  deviceAName?: string;
  deviceBName?: string;
}

const FeatureRow = React.memo<FeatureRowProps>(({
  diff,
  isDark,
  searchQuery,
  isHighlighted,
  ratType,
  deviceAName,
  deviceBName,
}) => {
  const openUrl = useOpenUrlContext();
  const { major, middle, leaf, kind, status, description, path, autoDiscovered, stringListDiff } = diff;
  const rowKey = getFeatureRowKey(major, middle, leaf);

  const strongerSide = useMemo(() => getStrongerSide(diff), [diff]);

  const rowBg = useMemo(() => {
    if (isHighlighted) return isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.14)';
    if (status === 'same') return 'transparent';
    if (status === 'different') return 'rgba(245,158,11,0.06)';
    if (status === 'a-only') return isDark ? 'rgba(33,150,243,0.08)' : 'rgba(33,150,243,0.05)';
    if (status === 'b-only') return isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)';
    return 'transparent';
  }, [status, isDark, isHighlighted]);

  const getCopyText = useCallback(
    () => formatFeatureCompareCopyText({ rat: ratType, diff, deviceAName, deviceBName }),
    [ratType, diff, deviceAName, deviceBName]
  );

  const subtitle = description ?? path;

  return (
    <Box
      data-feature-key={rowKey}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1fr)',
        minHeight: 36,
        borderBottom: '1px solid',
        borderColor: isHighlighted ? STATUS_COLOR.amber : 'divider',
        outline: isHighlighted ? `2px solid ${STATUS_COLOR.amber}` : 'none',
        outlineOffset: '-2px',
        bgcolor: rowBg,
        alignItems: 'center',
        transition: 'background-color 250ms ease, outline-color 250ms ease',
        contentVisibility: 'auto',
        containIntrinsicSize: '0 40px',
        '&:last-child': { borderBottom: 'none' },
        '& .feat-copy-btn': { opacity: { xs: 0.75, md: 0 }, transition: 'opacity 120ms' },
        '&:hover .feat-copy-btn, &:focus-within .feat-copy-btn': { opacity: 1 },
      }}
    >
      {/* Leaf name & 3GPP metadata */}
      <Box sx={{ px: 1.5, py: 0.55, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}>
              <HighlightText text={leaf} query={searchQuery} />
            </Typography>
            {autoDiscovered && (
              <Tooltip title={path ? `Auto-classified from ASN.1 path: ${path}` : 'Auto-classified 3GPP feature'} placement="top" arrow>
                <Chip
                  label="AUTO"
                  size="small"
                  sx={{
                    height: 14,
                    fontSize: '0.55rem',
                    fontWeight: 700,
                    bgcolor: `${STATUS_COLOR.auto}22`,
                    color: STATUS_COLOR.auto,
                    '& .MuiChip-label': { px: 0.5 },
                  }}
                />
              </Tooltip>
            )}
            {description && (
              <>
                <Tooltip title={path ? `${description}\nASN.1: ${path}` : description} placement="top" arrow>
                  <InfoOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled', cursor: 'default', flexShrink: 0 }} />
                </Tooltip>
                <Tooltip title={`Search 3GPP spec: ${description}`} placement="top" arrow>
                  <OpenInNewIcon
                    sx={{ fontSize: 12, color: 'primary.main', cursor: 'pointer', flexShrink: 0, opacity: 0.65, '&:hover': { opacity: 1 } }}
                    onClick={() => {
                      const query = encodeURIComponent(description);
                      openExternalReportUrl(`https://www.google.com/search?q=${query}`, openUrl);
                    }}
                  />
                </Tooltip>
              </>
            )}
            <FeatureStatusChip status={status} />
          </Box>
          {subtitle && (
            <Tooltip title={path ? `${subtitle}${subtitle !== path ? ` · ${path}` : ''}` : subtitle} placement="bottom-start" arrow>
              <Typography
                sx={{
                  fontSize: '0.64rem',
                  color: 'text.secondary',
                  opacity: 0.8,
                  lineHeight: 1.25,
                  mt: 0.15,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <HighlightText text={subtitle} query={searchQuery} />
              </Typography>
            </Tooltip>
          )}
        </Box>

        <Box className="feat-copy-btn" sx={{ flexShrink: 0 }}>
          <CopyActionButton getText={getCopyText} tooltip="Copy feature comparison" size={12} />
        </Box>
      </Box>

      {/* A value */}
      <Box sx={{ px: 1.5, py: 0.55, minWidth: 0, borderLeft: '1px solid', borderColor: 'divider' }}>
        {(kind === 'stringList' || kind === 'numberList') && stringListDiff ? (
          <StringListCell slDiff={stringListDiff} side="a" isDark={isDark} isStronger={strongerSide === 'a'} searchQuery={searchQuery} />
        ) : (
          <FeatureScalarCell diff={diff} side="a" isDark={isDark} isStronger={strongerSide === 'a'} searchQuery={searchQuery} />
        )}
      </Box>

      {/* B value */}
      <Box sx={{ px: 1.5, py: 0.55, minWidth: 0, borderLeft: '1px solid', borderColor: 'divider' }}>
        {(kind === 'stringList' || kind === 'numberList') && stringListDiff ? (
          <StringListCell slDiff={stringListDiff} side="b" isDark={isDark} isStronger={strongerSide === 'b'} searchQuery={searchQuery} />
        ) : (
          <FeatureScalarCell diff={diff} side="b" isDark={isDark} isStronger={strongerSide === 'b'} searchQuery={searchQuery} />
        )}
      </Box>
    </Box>
  );
});

// ─── Middle-level sub-section ────────────────────────────────────────────────

interface MiddleSectionProps {
  middle: string;
  diffs: FeatureDiff[];
  isDark: boolean;
  searchQuery: string;
  highlightedKey: string | null;
  ratType?: RatType;
  deviceAName?: string;
  deviceBName?: string;
}

const MiddleSection = React.memo<MiddleSectionProps>(({
  middle,
  diffs,
  isDark,
  searchQuery,
  highlightedKey,
  ratType,
  deviceAName,
  deviceBName,
}) => {
  const diffOnly = diffs.filter(d => d.status === 'different').length;
  const aOnly = diffs.filter(d => d.status === 'a-only').length;
  const bOnly = diffs.filter(d => d.status === 'b-only').length;

  return (
    <Box sx={{ mb: 0.5 }}>
      <Box
        sx={{
          px: 1.5,
          py: 0.45,
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.035)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 0.6,
        }}
      >
        <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <HighlightText text={middle} query={searchQuery} />
        </Typography>
        <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', fontFamily: MONO_FONT_FAMILY }}>
          ({diffs.length})
        </Typography>
        {diffOnly > 0 && (
          <Chip label={`${diffOnly} diff`} size="small" sx={{ height: 14, fontSize: '0.56rem', fontWeight: 700, bgcolor: 'rgba(245,158,11,0.15)', color: STATUS_COLOR.amber }} />
        )}
        {aOnly > 0 && (
          <Chip label={`${aOnly} A`} size="small" sx={{ height: 14, fontSize: '0.56rem', fontWeight: 700, bgcolor: 'rgba(33,150,243,0.15)', color: DEVICE_COLOR.deviceA }} />
        )}
        {bOnly > 0 && (
          <Chip label={`${bOnly} B`} size="small" sx={{ height: 14, fontSize: '0.56rem', fontWeight: 700, bgcolor: 'rgba(20,184,166,0.15)', color: DEVICE_COLOR.deviceB }} />
        )}
      </Box>
      {diffs.map(d => {
        const key = getFeatureRowKey(d.major, d.middle, d.leaf);
        return (
          <FeatureRow
            key={key}
            diff={d}
            isDark={isDark}
            searchQuery={searchQuery}
            isHighlighted={highlightedKey === key}
            ratType={ratType}
            deviceAName={deviceAName}
            deviceBName={deviceBName}
          />
        );
      })}
    </Box>
  );
});

// ─── Major-level accordion ───────────────────────────────────────────────────

interface MajorAccordionProps {
  major: string;
  diffs: FeatureDiff[];
  isDark: boolean;
  defaultExpanded: boolean;
  expandSignal: ExpandSignal;
  headerA: string;
  headerB: string;
  fullNameA?: string;
  fullNameB?: string;
  searchQuery: string;
  highlightedKey: string | null;
  ratType?: RatType;
}

const MajorAccordion = React.memo<MajorAccordionProps>(({
  major,
  diffs,
  isDark,
  defaultExpanded,
  expandSignal,
  headerA,
  headerB,
  fullNameA,
  fullNameB,
  searchQuery,
  highlightedKey,
  ratType,
}) => {
  const diffOnly = diffs.filter(d => d.status === 'different').length;
  const aOnly = diffs.filter(d => d.status === 'a-only').length;
  const bOnly = diffs.filter(d => d.status === 'b-only').length;

  const middles = useMemo(() => {
    const map = new Map<string, FeatureDiff[]>();
    for (const d of diffs) {
      const arr = map.get(d.middle) ?? [];
      arr.push(d);
      map.set(d.middle, arr);
    }
    if (major === 'FeatureGroupIndicators') {
      const sorted = new Map<string, FeatureDiff[]>();
      for (const key of FGI_MIDDLE_ORDER) {
        if (map.has(key)) sorted.set(key, map.get(key)!);
      }
      for (const [key, val] of map.entries()) {
        if (!sorted.has(key)) sorted.set(key, val);
      }
      return sorted;
    }
    return map;
  }, [diffs, major]);

  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  const lastVersionRef = useRef(expandSignal.version);
  const prevDefaultExpandedRef = useRef(defaultExpanded);

  useEffect(() => {
    if (expandSignal.version !== lastVersionRef.current) {
      lastVersionRef.current = expandSignal.version;
      prevDefaultExpandedRef.current = defaultExpanded;
      if (expandSignal.forceMajor === major) {
        setLocalExpanded(true);
      } else if (expandSignal.mode === 'all') {
        setLocalExpanded(true);
      } else if (expandSignal.mode === 'none') {
        setLocalExpanded(false);
      } else {
        setLocalExpanded(defaultExpanded);
      }
      return;
    }
    if (expandSignal.mode === 'auto' && defaultExpanded !== prevDefaultExpandedRef.current) {
      prevDefaultExpandedRef.current = defaultExpanded;
      setLocalExpanded(defaultExpanded);
    }
  }, [expandSignal.mode, expandSignal.version, expandSignal.forceMajor, major, defaultExpanded]);

  return (
    <Accordion
      expanded={localExpanded}
      onChange={() => setLocalExpanded(!localExpanded)}
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '6px !important',
        mb: 0.75,
        overflow: 'hidden',
        '&:before': { display: 'none' },
        '& .MuiAccordionSummary-root': { minHeight: 34, px: 1.5 },
        '& .MuiAccordionSummary-content': { my: 0.5 },
        '& .MuiAccordionDetails-root': { p: 0 },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'text.primary' }}>
            <HighlightText text={major} query={searchQuery} />
          </Typography>
          <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', fontFamily: MONO_FONT_FAMILY }}>
            ({diffs.length})
          </Typography>
          {diffOnly > 0 && (
            <Chip label={`${diffOnly} diff`} size="small" sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(245,158,11,0.15)', color: STATUS_COLOR.amber }} />
          )}
          {aOnly > 0 && (
            <Chip label={`${aOnly} A-only`} size="small" sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(33,150,243,0.15)', color: DEVICE_COLOR.deviceA }} />
          )}
          {bOnly > 0 && (
            <Chip label={`${bOnly} B-only`} size="small" sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(20,184,166,0.15)', color: DEVICE_COLOR.deviceB }} />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 520 }}>
            {/* Column header with actual device names */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1fr)',
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.035)',
              }}
            >
              <Typography sx={{ px: 1.5, py: 0.5, fontSize: '0.65rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Feature / 3GPP Spec
              </Typography>
              <Tooltip title={fullNameA ?? 'Device A'} placement="top" arrow>
                <Typography
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: DEVICE_COLOR.deviceA,
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  A · {headerA}
                </Typography>
              </Tooltip>
              <Tooltip title={fullNameB ?? 'Device B'} placement="top" arrow>
                <Typography
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: DEVICE_COLOR.deviceB,
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  B · {headerB}
                </Typography>
              </Tooltip>
            </Box>
            {Array.from(middles.entries()).map(([middle, mDiffs]) => (
              <MiddleSection
                key={middle}
                middle={middle}
                diffs={mDiffs}
                isDark={isDark}
                searchQuery={searchQuery}
                highlightedKey={highlightedKey}
                ratType={ratType}
                deviceAName={fullNameA}
                deviceBName={fullNameB}
              />
            ))}
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────

export interface FeaturesCompareViewProps {
  featuresDiff: RatFeaturesDiff;
  deviceAName?: string;
  deviceBName?: string;
  ratType?: RatType;
  onOpenUrl?: (url: string) => void;
  initialFilter?: FilterMode;
  initialMajor?: string | null;
  highlightFeatureId?: string | null;
  navigationVersion?: number;
}

const FeaturesCompareViewInner = React.memo<FeaturesCompareViewProps>(({
  featuresDiff,
  deviceAName,
  deviceBName,
  ratType,
  initialFilter,
  initialMajor,
  highlightFeatureId,
  navigationVersion,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);
  const capaCtx = useOptionalCapaCompare();
  const containerRef = useRef<HTMLDivElement>(null);

  const { counts } = featuresDiff;
  const totalDiff = counts.different + counts.aOnly + counts.bOnly;

  const [userFilter, setUserFilter] = useState<FilterMode | null>(initialFilter ?? null);
  const filter: FilterMode = userFilter ?? (totalDiff > 0 ? 'diff' : 'all');
  const [selectedMajor, setSelectedMajor] = useState<string | null>(initialMajor ?? null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [expandSignal, setExpandSignal] = useState<ExpandSignal>({ mode: 'auto', version: 0 });
  const [issueReport, setIssueReport] = useState<UnclassifiedSpecIssueReport | null>(null);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  useEffect(() => {
    if (navigationVersion === undefined) return;
    if (initialFilter) setUserFilter(initialFilter);
    if (initialMajor !== undefined) setSelectedMajor(initialMajor);

    if (highlightFeatureId) {
      const majorFromId = highlightFeatureId.split('|')[0];
      setExpandSignal(s => ({ mode: 'auto', version: s.version + 1, forceMajor: majorFromId }));
      setHighlightedKey(highlightFeatureId);

      const scrollTimer = setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;
        const rows = container.querySelectorAll<HTMLElement>('[data-feature-key]');
        for (const el of rows) {
          if (el.dataset.featureKey === highlightFeatureId) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
        }
      }, 90);
      const clearTimer = setTimeout(() => setHighlightedKey(null), 2400);
      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(clearTimer);
      };
    }
    return undefined;
  }, [navigationVersion, initialFilter, initialMajor, highlightFeatureId]);

  const headerA = useMemo(() => shortenDeviceName(deviceAName, 'Device A'), [deviceAName]);
  const headerB = useMemo(() => shortenDeviceName(deviceBName, 'Device B'), [deviceBName]);

  const allSearchMatchCount = useMemo(() => {
    const tokens = tokenizeQuery(deferredSearch);
    if (tokens.length === 0) return featuresDiff.diffs.length;
    return featuresDiff.diffs.filter(d => {
      const haystack = [
        d.leaf,
        d.major,
        d.middle,
        d.description ?? '',
        d.path ?? '',
        formatFeatureValue(d.a, d.kind),
        formatFeatureValue(d.b, d.kind),
      ]
        .join('\n')
        .toLowerCase();
      return tokens.every(t => haystack.includes(t));
    }).length;
  }, [featuresDiff.diffs, deferredSearch]);

  const statusAndSearchFiltered = useMemo(() => {
    let diffs = featuresDiff.diffs;
    if (filter === 'diff') diffs = diffs.filter(d => d.status !== 'same');
    else if (filter === 'different') diffs = diffs.filter(d => d.status === 'different');
    else if (filter === 'a-only') diffs = diffs.filter(d => d.status === 'a-only');
    else if (filter === 'b-only') diffs = diffs.filter(d => d.status === 'b-only');

    const tokens = tokenizeQuery(deferredSearch);
    if (tokens.length > 0) {
      diffs = diffs.filter(d => {
        const haystack = [
          d.leaf,
          d.major,
          d.middle,
          d.description ?? '',
          d.path ?? '',
          formatFeatureValue(d.a, d.kind),
          formatFeatureValue(d.b, d.kind),
        ]
          .join('\n')
          .toLowerCase();
        return tokens.every(t => haystack.includes(t));
      });
    }
    return diffs;
  }, [featuresDiff.diffs, filter, deferredSearch]);

  const majorPills = useMemo(() => {
    const countsByMajor = new Map<string, { total: number; diffs: number }>();
    for (const d of statusAndSearchFiltered) {
      const cur = countsByMajor.get(d.major) ?? { total: 0, diffs: 0 };
      cur.total++;
      if (d.status !== 'same') cur.diffs++;
      countsByMajor.set(d.major, cur);
    }
    return Array.from(countsByMajor.entries()).map(([major, stat]) => ({ major, ...stat }));
  }, [statusAndSearchFiltered]);

  const activeMajor = useMemo(() => {
    if (!selectedMajor) return null;
    return majorPills.some(p => p.major === selectedMajor) ? selectedMajor : null;
  }, [selectedMajor, majorPills]);

  const filtered = useMemo(() => {
    if (!activeMajor) return statusAndSearchFiltered;
    return statusAndSearchFiltered.filter(d => d.major === activeMajor);
  }, [statusAndSearchFiltered, activeMajor]);

  const byMajor = useMemo(() => {
    const map = new Map<string, FeatureDiff[]>();
    for (const d of filtered) {
      const arr = map.get(d.major) ?? [];
      arr.push(d);
      map.set(d.major, arr);
    }
    return map;
  }, [filtered]);

  const autoDiscoveredDiffs = useMemo(
    () => featuresDiff.diffs.filter(d => d.autoDiscovered),
    [featuresDiff.diffs]
  );

  const handleReportAutoSpecs = useCallback(() => {
    if (autoDiscoveredDiffs.length === 0) return;
    const devices = [capaCtx?.deviceA.normalized, capaCtx?.deviceB.normalized].filter(
      (d): d is CommonCapaJson => Boolean(d)
    );
    if (devices.length > 0) {
      const realReport = buildUnclassifiedSpecIssueReport(devices, { ratFilter: ratType });
      if (realReport.totalCount > 0) {
        setIssueReport(realReport);
        return;
      }
    }
    const report = buildAutoIssueUrlFromEntries(
      autoDiscoveredDiffs.map(d => ({
        major: d.major,
        middle: d.middle,
        leaf: d.leaf,
        kind: d.kind,
        path: d.path,
        description: d.description,
        valueA: d.a,
        valueB: d.b,
      })),
      ratType,
      deviceAName,
      deviceBName
    );
    setIssueReport(report);
  }, [autoDiscoveredDiffs, capaCtx, ratType, deviceAName, deviceBName]);

  const openUrl = useOpenUrlContext();

  return (
    <Box ref={containerRef}>
      {issueReport && (
        <SpecIssueReportDialog report={issueReport} onClose={() => setIssueReport(null)} onOpenUrl={openUrl} />
      )}
      {/* Sticky Unified Filter + Search + Category Quick-Filter Bar */}
      <Box
        sx={{
          position: 'sticky',
          top: -12,
          zIndex: 5,
          pt: 1.25,
          pb: 0.75,
          mx: -1.5,
          px: 1.5,
          mb: 1.25,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          bgcolor: surface.toolbarBg,
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid',
          borderColor: surface.border,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={filter}
              onChange={(_, v) => {
                if (v) {
                  setUserFilter(v);
                  setExpandSignal(s => ({ mode: 'auto', version: s.version + 1 }));
                }
              }}
              sx={{ '& .MuiToggleButton-root': { py: 0.2, px: 0.8, fontSize: '0.64rem', textTransform: 'none', minHeight: 24 }, flexWrap: 'wrap' }}
            >
              <ToggleButton value="diff">Diff ({totalDiff})</ToggleButton>
              <ToggleButton value="different" sx={{ color: STATUS_COLOR.amber }}>Value ({counts.different})</ToggleButton>
              <ToggleButton value="a-only" sx={{ color: DEVICE_COLOR.deviceA }}>A-only ({counts.aOnly})</ToggleButton>
              <ToggleButton value="b-only" sx={{ color: DEVICE_COLOR.deviceB }}>B-only ({counts.bOnly})</ToggleButton>
              <ToggleButton value="all">All ({featuresDiff.diffs.length})</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              size="small"
              placeholder="Filter in RAT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14 }} /></InputAdornment>,
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.2 }} aria-label="Clear feature filter">
                        <CloseIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                  sx: { fontSize: '0.72rem', height: 26 },
                },
              }}
              sx={{ width: { xs: '100%', sm: 210 } }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.65, flexWrap: 'wrap' }}>
            {byMajor.size > 1 && (
              <>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<UnfoldMoreIcon sx={{ fontSize: 13 }} />}
                  onClick={() => setExpandSignal(s => ({ mode: 'all', version: s.version + 1 }))}
                  sx={{ fontSize: '0.6rem', py: 0.1, px: 0.6, minHeight: 22, minWidth: 0, textTransform: 'none', color: 'text.secondary' }}
                >
                  Expand All
                </Button>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<UnfoldLessIcon sx={{ fontSize: 13 }} />}
                  onClick={() => setExpandSignal(s => ({ mode: 'none', version: s.version + 1 }))}
                  sx={{ fontSize: '0.6rem', py: 0.1, px: 0.6, minHeight: 22, minWidth: 0, textTransform: 'none', color: 'text.secondary' }}
                >
                  Collapse All
                </Button>
              </>
            )}

            <Chip label={`${counts.same} exact`} size="small" sx={{ height: 17, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(16,185,129,0.1)', color: STATUS_COLOR.green }} />
            {counts.different > 0 && (
              <Chip label={`${counts.different} diff`} size="small" sx={{ height: 17, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(245,158,11,0.12)', color: STATUS_COLOR.amber }} />
            )}
            {counts.aOnly > 0 && (
              <Chip label={`${counts.aOnly} A-only`} size="small" sx={{ height: 17, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(33,150,243,0.12)', color: DEVICE_COLOR.deviceA }} />
            )}
            {counts.bOnly > 0 && (
              <Chip label={`${counts.bOnly} B-only`} size="small" sx={{ height: 17, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(20,184,166,0.12)', color: DEVICE_COLOR.deviceB }} />
            )}
            {totalDiff === 0 && (
              <Typography sx={{ fontSize: '0.64rem', color: STATUS_COLOR.green, fontWeight: 600 }}>All match</Typography>
            )}

            {autoDiscoveredDiffs.length > 0 && (
              <Tooltip title="Prepare a GitHub Issue with an optional log excerpt" placement="top" arrow>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<BugReportIcon sx={{ fontSize: 13 }} />}
                  onClick={handleReportAutoSpecs}
                  sx={{
                    height: 22,
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 1.5,
                    color: STATUS_COLOR.auto,
                    borderColor: `${STATUS_COLOR.auto}66`,
                    bgcolor: `${STATUS_COLOR.auto}10`,
                    '&:hover': { borderColor: STATUS_COLOR.auto, bgcolor: `${STATUS_COLOR.auto}1f` },
                  }}
                >
                  +{autoDiscoveredDiffs.length} New Spec{autoDiscoveredDiffs.length > 1 ? 's' : ''} · Report
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Category Quick-Filter Pill Bar */}
        {majorPills.length > 1 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={`All Categories (${statusAndSearchFiltered.length})`}
              size="small"
              clickable
              onClick={() => setSelectedMajor(null)}
              sx={{
                height: 19,
                fontSize: '0.62rem',
                fontWeight: activeMajor === null ? 700 : 500,
                bgcolor: activeMajor === null ? 'primary.main' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'),
                color: activeMajor === null ? 'primary.contrastText' : 'text.secondary',
              }}
            />
            {majorPills.map(({ major, total }) => {
              const selected = activeMajor === major;
              return (
                <Chip
                  key={major}
                  label={`${major} (${total})`}
                  size="small"
                  clickable
                  onClick={() => setSelectedMajor(selected ? null : major)}
                  sx={{
                    height: 19,
                    fontSize: '0.62rem',
                    fontWeight: selected ? 700 : 500,
                    bgcolor: selected ? 'primary.main' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'),
                    color: selected ? 'primary.contrastText' : 'text.secondary',
                  }}
                />
              );
            })}
          </Box>
        )}
      </Box>

      {/* Accordion list */}
      {byMajor.size === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">
            {deferredSearch.trim() && filter !== 'all' && allSearchMatchCount > 0
              ? `No features match "${deferredSearch.trim()}" in the current filter (${allSearchMatchCount} match${allSearchMatchCount === 1 ? '' : 'es'} in All)`
              : 'No features match the current filter'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            {deferredSearch.trim() && filter !== 'all' && allSearchMatchCount > 0 && (
              <Button
                size="small"
                variant="contained"
                disableElevation
                onClick={() => setUserFilter('all')}
                sx={{ textTransform: 'none', fontSize: '0.72rem' }}
              >
                Include Identical ({allSearchMatchCount})
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setUserFilter('all');
                setSearch('');
                setSelectedMajor(null);
              }}
              sx={{ textTransform: 'none', fontSize: '0.72rem' }}
            >
              Show All
            </Button>
          </Box>
        </Box>
      ) : (
        Array.from(byMajor.entries()).map(([major, diffs], idx) => (
          <MajorAccordion
            key={major}
            major={major}
            diffs={diffs}
            isDark={isDark}
            defaultExpanded={filter !== 'all' || activeMajor !== null || deferredSearch.trim() !== '' || idx === 0}
            expandSignal={expandSignal}
            headerA={headerA}
            headerB={headerB}
            fullNameA={deviceAName}
            fullNameB={deviceBName}
            searchQuery={deferredSearch}
            highlightedKey={highlightedKey}
            ratType={ratType}
          />
        ))
      )}
    </Box>
  );
});

export const FeaturesCompareView = React.memo<FeaturesCompareViewProps>(props => (
  <OpenUrlContext.Provider value={props.onOpenUrl}>
    <FeaturesCompareViewInner {...props} />
  </OpenUrlContext.Provider>
));

// ─── Single device features view ─────────────────────────────────────────────

interface SingleFeatureRowProps {
  leaf: FeatureLeaf;
  searchQuery: string;
  isHighlighted: boolean;
  ratType?: RatType;
}

const SingleFeatureRow = React.memo<SingleFeatureRowProps>(({ leaf: l, searchQuery, isHighlighted, ratType }) => {
  const openUrl = useOpenUrlContext();
  const isBool = l.kind === 'bool' || l.kind === 'fgiBit' || l.kind === 'presence';
  const displayVal = formatFeatureValue(l.value, l.kind);
  const subtitle = l.description ?? l.path;
  const rowKey = getFeatureRowKey(l.major, l.middle, l.leaf);

  const getCopyText = useCallback(
    () => formatSingleFeatureCopyText({ rat: ratType, leaf: l }),
    [ratType, l]
  );

  return (
    <Box
      data-feature-key={rowKey}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 1fr)',
        minHeight: 36,
        borderBottom: '1px solid',
        borderColor: isHighlighted ? STATUS_COLOR.amber : 'divider',
        outline: isHighlighted ? `2px solid ${STATUS_COLOR.amber}` : 'none',
        outlineOffset: '-2px',
        bgcolor: isHighlighted ? 'rgba(245,158,11,0.12)' : 'transparent',
        alignItems: 'center',
        contentVisibility: 'auto',
        containIntrinsicSize: '0 38px',
        '&:last-child': { borderBottom: 'none' },
        '& .feat-copy-btn': { opacity: { xs: 0.75, md: 0 }, transition: 'opacity 120ms' },
        '&:hover .feat-copy-btn, &:focus-within .feat-copy-btn': { opacity: 1 },
      }}
    >
      <Box sx={{ px: 1.5, py: 0.55, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.primary' }}>
              <HighlightText text={l.leaf} query={searchQuery} />
            </Typography>
            {l.autoDiscovered && (
              <Tooltip title={l.path ? `Auto-classified from ASN.1 path: ${l.path}` : 'Auto-classified 3GPP feature'} placement="top" arrow>
                <Chip
                  label="AUTO"
                  size="small"
                  sx={{
                    height: 14,
                    fontSize: '0.55rem',
                    fontWeight: 700,
                    bgcolor: `${STATUS_COLOR.auto}22`,
                    color: STATUS_COLOR.auto,
                    '& .MuiChip-label': { px: 0.5 },
                  }}
                />
              </Tooltip>
            )}
            {l.description && (
              <>
                <Tooltip title={l.path ? `${l.description}\nASN.1: ${l.path}` : l.description} placement="top" arrow>
                  <InfoOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                </Tooltip>
                <Tooltip title={`Search 3GPP spec: ${l.description}`} placement="top" arrow>
                  <OpenInNewIcon
                    sx={{ fontSize: 12, color: 'primary.main', cursor: 'pointer', opacity: 0.65, '&:hover': { opacity: 1 } }}
                    onClick={() => {
                      const query = encodeURIComponent(l.description!);
                      openExternalReportUrl(`https://www.google.com/search?q=${query}`, openUrl);
                    }}
                  />
                </Tooltip>
              </>
            )}
          </Box>
          {subtitle && (
            <Typography
              sx={{
                fontSize: '0.64rem',
                color: 'text.secondary',
                opacity: 0.78,
                lineHeight: 1.25,
                mt: 0.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <HighlightText text={subtitle} query={searchQuery} />
            </Typography>
          )}
        </Box>
        <Box className="feat-copy-btn" sx={{ flexShrink: 0 }}>
          <CopyActionButton getText={getCopyText} tooltip="Copy feature" size={12} />
        </Box>
      </Box>
      <Box sx={{ px: 1.5, py: 0.55, minWidth: 0, borderLeft: '1px solid', borderColor: 'divider' }}>
        <Typography
          sx={{
            fontSize: '0.74rem',
            fontFamily: MONO_FONT_FAMILY,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            wordBreak: 'break-word',
            color: isBool ? (l.value ? STATUS_COLOR.green : STATUS_COLOR.red) : 'text.primary',
          }}
        >
          <HighlightText text={displayVal} query={searchQuery} />
        </Typography>
      </Box>
    </Box>
  );
});

export interface SingleDeviceFeaturesViewProps {
  leaves: FeatureLeaf[];
  ratType?: RatType;
  onOpenUrl?: (url: string) => void;
  highlightFeatureId?: string | null;
  navigationVersion?: number;
}

export const SingleDeviceFeaturesView = React.memo<SingleDeviceFeaturesViewProps>(({
  leaves,
  ratType,
  onOpenUrl,
  highlightFeatureId,
  navigationVersion,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);
  const capaCtx = useOptionalCapaCompare();
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [issueReport, setIssueReport] = useState<UnclassifiedSpecIssueReport | null>(null);
  const [expandedOverrides, setExpandedOverrides] = useState<Record<string, boolean>>({});
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (navigationVersion === undefined || !highlightFeatureId) return;
    const majorFromId = highlightFeatureId.split('|')[0];
    setSelectedMajor(null);
    setExpandedOverrides(prev => ({ ...prev, [majorFromId]: true }));
    setHighlightedKey(highlightFeatureId);

    const scrollTimer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const rows = container.querySelectorAll<HTMLElement>('[data-feature-key]');
      for (const el of rows) {
        if (el.dataset.featureKey === highlightFeatureId) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    }, 90);
    const clearTimer = setTimeout(() => setHighlightedKey(null), 2400);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [navigationVersion, highlightFeatureId]);

  const searchFiltered = useMemo(() => {
    const tokens = tokenizeQuery(deferredSearch);
    if (tokens.length === 0) return leaves;
    return leaves.filter(l => {
      const haystack = [
        l.leaf,
        l.major,
        l.middle,
        l.description ?? '',
        l.path ?? '',
        formatFeatureValue(l.value, l.kind),
      ]
        .join('\n')
        .toLowerCase();
      return tokens.every(t => haystack.includes(t));
    });
  }, [leaves, deferredSearch]);

  const majorPills = useMemo(() => {
    const countsByMajor = new Map<string, number>();
    for (const l of searchFiltered) {
      countsByMajor.set(l.major, (countsByMajor.get(l.major) ?? 0) + 1);
    }
    return Array.from(countsByMajor.entries()).map(([major, total]) => ({ major, total }));
  }, [searchFiltered]);

  const activeMajor = useMemo(() => {
    if (!selectedMajor) return null;
    return majorPills.some(p => p.major === selectedMajor) ? selectedMajor : null;
  }, [selectedMajor, majorPills]);

  const filtered = useMemo(() => {
    if (!activeMajor) return searchFiltered;
    return searchFiltered.filter(l => l.major === activeMajor);
  }, [searchFiltered, activeMajor]);

  const byMajor = useMemo(() => {
    const map = new Map<string, Map<string, typeof filtered>>();
    for (const l of filtered) {
      if (!map.has(l.major)) map.set(l.major, new Map());
      const midMap = map.get(l.major)!;
      if (!midMap.has(l.middle)) midMap.set(l.middle, []);
      midMap.get(l.middle)!.push(l);
    }
    for (const [major, midMap] of map.entries()) {
      if (major === 'FeatureGroupIndicators') {
        const sorted = new Map<string, typeof filtered>();
        for (const key of FGI_MIDDLE_ORDER) {
          if (midMap.has(key)) sorted.set(key, midMap.get(key)!);
        }
        for (const [key, val] of midMap.entries()) {
          if (!sorted.has(key)) sorted.set(key, val);
        }
        map.set(major, sorted);
      }
    }
    return map;
  }, [filtered]);

  const autoDiscoveredLeaves = useMemo(() => leaves.filter(l => l.autoDiscovered), [leaves]);

  const handleReportAutoSpecs = useCallback(() => {
    if (autoDiscoveredLeaves.length === 0) return;
    const singleDevice = capaCtx?.deviceA.normalized ?? capaCtx?.deviceB.normalized;
    if (singleDevice) {
      const realReport = buildUnclassifiedSpecIssueReport([singleDevice], { ratFilter: ratType });
      if (realReport.totalCount > 0) {
        setIssueReport(realReport);
        return;
      }
    }
    const report = buildAutoIssueUrlFromEntries(
      autoDiscoveredLeaves.map(l => ({
        major: l.major,
        middle: l.middle,
        leaf: l.leaf,
        kind: l.kind,
        path: l.path,
        description: l.description,
        valueA: l.value,
      })),
      ratType
    );
    setIssueReport(report);
  }, [autoDiscoveredLeaves, capaCtx, ratType]);

  useEffect(() => {
    setExpandedOverrides({});
  }, [activeMajor, deferredSearch]);

  return (
    <OpenUrlContext.Provider value={onOpenUrl}>
      <Box ref={containerRef}>
        {issueReport && (
          <SpecIssueReportDialog report={issueReport} onClose={() => setIssueReport(null)} onOpenUrl={onOpenUrl} />
        )}
        {/* Sticky Search + Count + Category Quick-Filter Toolbar */}
        <Box
          sx={{
            position: 'sticky',
            top: -12,
            zIndex: 5,
            pt: 1.25,
            pb: 0.75,
            mx: -1.5,
            px: 1.5,
            mb: 1.25,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
            bgcolor: surface.toolbarBg,
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid',
            borderColor: surface.border,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Filter in RAT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14 }} /></InputAdornment>,
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.2 }} aria-label="Clear filter">
                        <CloseIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                  sx: { fontSize: '0.72rem', height: 26 },
                },
              }}
              sx={{ width: { xs: '100%', sm: 220 } }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Chip
                size="small"
                label={filtered.length < leaves.length ? `${filtered.length} / ${leaves.length} features` : `${leaves.length} features`}
                sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)' }}
              />
              {autoDiscoveredLeaves.length > 0 && (
                <Tooltip title="Prepare a GitHub Issue with an optional log excerpt" placement="top" arrow>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<BugReportIcon sx={{ fontSize: 13 }} />}
                    onClick={handleReportAutoSpecs}
                    sx={{
                      height: 22,
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      color: STATUS_COLOR.auto,
                      borderColor: `${STATUS_COLOR.auto}66`,
                      bgcolor: `${STATUS_COLOR.auto}10`,
                      '&:hover': { borderColor: STATUS_COLOR.auto, bgcolor: `${STATUS_COLOR.auto}1f` },
                    }}
                  >
                    +{autoDiscoveredLeaves.length} New Spec{autoDiscoveredLeaves.length > 1 ? 's' : ''} · Report
                  </Button>
                </Tooltip>
              )}
            </Box>
          </Box>

          {majorPills.length > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Chip
                label={`All Categories (${searchFiltered.length})`}
                size="small"
                clickable
                onClick={() => setSelectedMajor(null)}
                sx={{
                  height: 19,
                  fontSize: '0.62rem',
                  fontWeight: activeMajor === null ? 700 : 500,
                  bgcolor: activeMajor === null ? 'primary.main' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'),
                  color: activeMajor === null ? 'primary.contrastText' : 'text.secondary',
                }}
              />
              {majorPills.map(({ major, total }) => {
                const selected = activeMajor === major;
                return (
                  <Chip
                    key={major}
                    label={`${major} (${total})`}
                    size="small"
                    clickable
                    onClick={() => setSelectedMajor(selected ? null : major)}
                    sx={{
                      height: 19,
                      fontSize: '0.62rem',
                      fontWeight: selected ? 700 : 500,
                      bgcolor: selected ? 'primary.main' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'),
                      color: selected ? 'primary.contrastText' : 'text.secondary',
                    }}
                  />
                );
              })}
            </Box>
          )}
        </Box>

        {Array.from(byMajor.entries()).map(([major, midMap], idx) => {
          const defaultExpanded = activeMajor !== null || deferredSearch.trim() !== '' || idx === 0;
          const isExpanded = expandedOverrides[major] ?? defaultExpanded;
          return (
            <Accordion
              key={major}
              expanded={isExpanded}
              onChange={(_, exp) => setExpandedOverrides(prev => ({ ...prev, [major]: exp }))}
              disableGutters
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '6px !important',
                mb: 0.75,
                overflow: 'hidden',
                '&:before': { display: 'none' },
                '& .MuiAccordionSummary-root': { minHeight: 32, px: 1.5 },
                '& .MuiAccordionSummary-content': { my: 0.5 },
                '& .MuiAccordionDetails-root': { p: 0 },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}>
                <Typography sx={{ fontSize: '0.76rem', fontWeight: 700 }}>
                  <HighlightText text={major} query={deferredSearch} />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {Array.from(midMap.entries()).map(([middle, mLeaves]) => (
                  <Box key={middle} sx={{ mb: 0.5 }}>
                    <Box sx={{ px: 1.5, py: 0.5, bgcolor: surface.headerBg, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <HighlightText text={middle} query={deferredSearch} />
                      </Typography>
                    </Box>
                    {mLeaves.map(l => {
                      const key = getFeatureRowKey(l.major, l.middle, l.leaf);
                      return (
                        <SingleFeatureRow
                          key={key}
                          leaf={l}
                          searchQuery={deferredSearch}
                          isHighlighted={highlightedKey === key}
                          ratType={ratType}
                        />
                      );
                    })}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          );
        })}

        {byMajor.size === 0 && (
          <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
            <Typography variant="body2">No features found</Typography>
          </Box>
        )}
      </Box>
    </OpenUrlContext.Provider>
  );
});
