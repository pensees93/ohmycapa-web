import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, IconButton, ToggleButton, ToggleButtonGroup, Tooltip, Typography, useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import type { CapaCompareResult, CompareFormat, FeatureDiff, FeatureLeaf, RatType } from '@ohmycapa/capa-core';
import {
  DEVICE_COLOR,
  MONO_FONT_FAMILY,
  RAT_TABS,
  STATUS_COLOR,
  getWorkbenchSurface,
} from '../constants/statusMeta';
import {
  buildGlobalCompareFeatureIndex,
  buildGlobalSingleFeatureIndex,
  filterGlobalCompareFeatures,
  filterGlobalSingleFeatures,
  formatFeatureCompareCopyText,
  formatFeatureValue,
  formatSingleFeatureCopyText,
  type GlobalFeatureCompareItem,
  type GlobalFeatureSingleItem,
  type GlobalFeatureStatusFilter,
} from '../utils/featureSearch';
import {
  CopyActionButton,
  FeatureScalarCell,
  FeatureStatusChip,
  HighlightText,
  OpenUrlContext,
  StringListCell,
  getStrongerSide,
  openExternalReportUrl,
  shortenDeviceName,
  useOpenUrlContext,
} from './featureRenderHelpers';

const INITIAL_RENDER_CAP = 250;

// ─── Global Compare Row ───────────────────────────────────────────────────────

const GlobalCompareRow = React.memo<{
  item: GlobalFeatureCompareItem;
  query: string;
  isDark: boolean;
  deviceAName: string;
  deviceBName: string;
  onJumpToRat: (rat: RatType, diff: FeatureDiff) => void;
}>(({ item, query, isDark, deviceAName, deviceBName, onJumpToRat }) => {
  const openUrl = useOpenUrlContext();
  const { diff, rat, ratShortLabel, ratAccentColor } = item;
  const strongerSide = useMemo(() => getStrongerSide(diff), [diff]);
  const subtitle = diff.description ?? diff.path;

  const rowBg = useMemo(() => {
    if (diff.status === 'different') return 'rgba(245,158,11,0.06)';
    if (diff.status === 'a-only') return isDark ? 'rgba(33,150,243,0.08)' : 'rgba(33,150,243,0.05)';
    if (diff.status === 'b-only') return isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)';
    return 'transparent';
  }, [diff.status, isDark]);

  const getCopyText = useCallback(
    () => formatFeatureCompareCopyText({ rat, diff, deviceAName, deviceBName }),
    [rat, diff, deviceAName, deviceBName]
  );

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 2.3fr) minmax(130px, 1fr) minmax(130px, 1fr)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: rowBg,
        alignItems: 'center',
        minHeight: 42,
        contentVisibility: 'auto',
        containIntrinsicSize: '0 46px',
        '&:last-child': { borderBottom: 'none' },
        '& .row-hover-actions': { opacity: { xs: 0.85, md: 0.25 }, transition: 'opacity 120ms' },
        '&:hover .row-hover-actions, &:focus-within .row-hover-actions': { opacity: 1 },
      }}
    >
      {/* Left: RAT badge + Major/Middle breadcrumb + Leaf + Metadata + Actions */}
      <Box sx={{ px: 1.5, py: 0.6, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 0.2 }}>
            <Chip
              size="small"
              label={ratShortLabel}
              sx={{
                height: 15,
                fontSize: '0.56rem',
                fontWeight: 800,
                fontFamily: MONO_FONT_FAMILY,
                color: ratAccentColor,
                bgcolor: `${ratAccentColor}1f`,
                border: `1px solid ${ratAccentColor}44`,
                '& .MuiChip-label': { px: 0.55 },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.62rem',
                color: 'text.disabled',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <HighlightText text={diff.major} query={query} />
              {' › '}
              <HighlightText text={diff.middle} query={query} />
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
              <HighlightText text={diff.leaf} query={query} />
            </Typography>
            {diff.autoDiscovered && (
              <Tooltip title={diff.path ? `Auto-classified from ASN.1 path: ${diff.path}` : 'Auto-classified 3GPP feature'} placement="top" arrow>
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
            {diff.description && (
              <>
                <Tooltip title={diff.path ? `${diff.description}\nASN.1: ${diff.path}` : diff.description} placement="top" arrow>
                  <InfoOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled', flexShrink: 0 }} />
                </Tooltip>
                <Tooltip title={`Search 3GPP spec: ${diff.description}`} placement="top" arrow>
                  <OpenInNewIcon
                    sx={{ fontSize: 12, color: 'primary.main', cursor: 'pointer', flexShrink: 0, opacity: 0.65, '&:hover': { opacity: 1 } }}
                    onClick={() => openExternalReportUrl(`https://www.google.com/search?q=${encodeURIComponent(diff.description!)}`, openUrl)}
                  />
                </Tooltip>
              </>
            )}
            <FeatureStatusChip status={diff.status} />
          </Box>

          {subtitle && (
            <Tooltip title={diff.path ? `${subtitle}${subtitle !== diff.path ? ` · ${diff.path}` : ''}` : subtitle} placement="bottom-start" arrow>
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
                <HighlightText text={subtitle} query={query} />
              </Typography>
            </Tooltip>
          )}
        </Box>

        <Box className="row-hover-actions" sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
          <CopyActionButton getText={getCopyText} tooltip="Copy feature comparison" size={12} />
          <Tooltip title={`Open in ${ratShortLabel} Features`} placement="top" arrow>
            <IconButton
              size="small"
              aria-label={`Jump to ${ratShortLabel} Features`}
              onClick={() => onJumpToRat(rat, diff)}
              sx={{ p: 0.3, color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
            >
              <ArrowForwardIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* A value */}
      <Box sx={{ px: 1.5, py: 0.6, minWidth: 0, borderLeft: '1px solid', borderColor: 'divider' }}>
        {(diff.kind === 'stringList' || diff.kind === 'numberList') && diff.stringListDiff ? (
          <StringListCell slDiff={diff.stringListDiff} side="a" isDark={isDark} isStronger={strongerSide === 'a'} searchQuery={query} />
        ) : (
          <FeatureScalarCell diff={diff} side="a" isDark={isDark} isStronger={strongerSide === 'a'} searchQuery={query} />
        )}
      </Box>

      {/* B value */}
      <Box sx={{ px: 1.5, py: 0.6, minWidth: 0, borderLeft: '1px solid', borderColor: 'divider' }}>
        {(diff.kind === 'stringList' || diff.kind === 'numberList') && diff.stringListDiff ? (
          <StringListCell slDiff={diff.stringListDiff} side="b" isDark={isDark} isStronger={strongerSide === 'b'} searchQuery={query} />
        ) : (
          <FeatureScalarCell diff={diff} side="b" isDark={isDark} isStronger={strongerSide === 'b'} searchQuery={query} />
        )}
      </Box>
    </Box>
  );
});

// ─── GlobalCompareFeaturesView ────────────────────────────────────────────────

export interface GlobalCompareFeaturesViewProps {
  compareResult: CapaCompareResult;
  query: string;
  onQueryChange: (q: string) => void;
  deviceAName: string;
  deviceBName: string;
  initialStatus?: GlobalFeatureStatusFilter;
  statusVersion?: number;
  precomputedIndex?: GlobalFeatureCompareItem[];
  onJumpToRat: (rat: RatType, diff: FeatureDiff) => void;
  onOpenUrl?: (url: string) => void;
}

export const GlobalCompareFeaturesView: React.FC<GlobalCompareFeaturesViewProps> = ({
  compareResult,
  query,
  onQueryChange,
  deviceAName,
  deviceBName,
  initialStatus,
  statusVersion,
  precomputedIndex,
  onJumpToRat,
  onOpenUrl,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);
  const deferredQuery = useDeferredValue(query);

  const index = useMemo(
    () => precomputedIndex ?? buildGlobalCompareFeatureIndex(compareResult),
    [precomputedIndex, compareResult]
  );
  const hasAnyDiff = useMemo(() => index.some(item => item.diff.status !== 'same'), [index]);

  const [userStatus, setUserStatus] = useState<GlobalFeatureStatusFilter | null>(initialStatus ?? null);
  const [selectedRats, setSelectedRats] = useState<Set<RatType>>(new Set());
  const [showAllRows, setShowAllRows] = useState(false);

  // When a search query is typed/changed, clear any prior non-search filter (e.g. 'diff' from KPI click)
  // so matching identical features are immediately visible instead of hidden.
  useEffect(() => {
    setUserStatus(null);
  }, [deferredQuery]);

  useEffect(() => {
    if (statusVersion !== undefined && initialStatus) {
      setUserStatus(initialStatus);
    }
  }, [statusVersion, initialStatus]);

  useEffect(() => {
    setShowAllRows(false);
  }, [deferredQuery, userStatus, selectedRats]);

  const effectiveStatus: GlobalFeatureStatusFilter =
    userStatus ?? (deferredQuery.trim() ? 'all' : hasAnyDiff ? 'diff' : 'all');

  const { items, ratCounts, statusCounts } = useMemo(
    () =>
      filterGlobalCompareFeatures(index, {
        query: deferredQuery,
        status: effectiveStatus,
        rats: selectedRats.size > 0 ? selectedRats : null,
      }),
    [index, deferredQuery, effectiveStatus, selectedRats]
  );

  const toggleRat = useCallback((rat: RatType) => {
    setSelectedRats(prev => {
      const next = new Set(prev);
      if (next.has(rat)) next.delete(rat);
      else next.add(rat);
      return next;
    });
  }, []);

  const visibleItems = showAllRows ? items : items.slice(0, INITIAL_RENDER_CAP);
  const shortA = useMemo(() => shortenDeviceName(deviceAName, 'Device A'), [deviceAName]);
  const shortB = useMemo(() => shortenDeviceName(deviceBName, 'Device B'), [deviceBName]);

  const availableRatsInIndex = useMemo(() => {
    const present = new Set(index.map(i => i.rat));
    return RAT_TABS.filter(t => present.has(t.value));
  }, [index]);

  return (
    <OpenUrlContext.Provider value={onOpenUrl}>
      <Box>
        {/* Sticky Toolbar */}
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
            flexDirection: 'column',
            gap: 0.75,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={effectiveStatus}
              onChange={(_, v) => v && setUserStatus(v)}
              sx={{ '& .MuiToggleButton-root': { py: 0.2, px: 0.8, fontSize: '0.64rem', textTransform: 'none', minHeight: 24 }, flexWrap: 'wrap' }}
            >
              <ToggleButton value="diff">Diff ({statusCounts.diff})</ToggleButton>
              <ToggleButton value="different" sx={{ color: STATUS_COLOR.amber }}>Value ({statusCounts.different})</ToggleButton>
              <ToggleButton value="a-only" sx={{ color: DEVICE_COLOR.deviceA }}>A-only ({statusCounts['a-only']})</ToggleButton>
              <ToggleButton value="b-only" sx={{ color: DEVICE_COLOR.deviceB }}>B-only ({statusCounts['b-only']})</ToggleButton>
              <ToggleButton value="all">All ({statusCounts.all})</ToggleButton>
            </ToggleButtonGroup>

            <Typography variant="caption" sx={{ fontSize: '0.66rem', fontFamily: MONO_FONT_FAMILY, fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
              {deferredQuery.trim()
                ? `Matches: ${items.length} · Query "${deferredQuery.trim()}"`
                : `Showing ${items.length} of ${index.length} cross-RAT features`}
            </Typography>
          </Box>

          {/* RAT Filter Chips */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              clickable
              label={`All RATs (${Object.values(ratCounts).reduce((a, b) => a + (b ?? 0), 0)})`}
              onClick={() => setSelectedRats(new Set())}
              sx={{
                height: 20,
                fontSize: '0.62rem',
                fontWeight: selectedRats.size === 0 ? 700 : 500,
                bgcolor: selectedRats.size === 0 ? 'primary.main' : surface.subtleBg,
                color: selectedRats.size === 0 ? 'primary.contrastText' : 'text.secondary',
                border: '1px solid',
                borderColor: selectedRats.size === 0 ? 'primary.main' : surface.border,
              }}
            />
            {availableRatsInIndex.map(tab => {
              const selected = selectedRats.has(tab.value);
              const count = ratCounts[tab.value] ?? 0;
              return (
                <Chip
                  key={tab.value}
                  size="small"
                  clickable
                  label={`${tab.shortLabel} (${count})`}
                  onClick={() => toggleRat(tab.value)}
                  sx={{
                    height: 20,
                    fontSize: '0.62rem',
                    fontFamily: MONO_FONT_FAMILY,
                    fontWeight: selected ? 700 : 500,
                    bgcolor: selected ? `${tab.accentColor}22` : surface.subtleBg,
                    color: selected ? tab.accentColor : count === 0 ? 'text.disabled' : 'text.secondary',
                    border: '1px solid',
                    borderColor: selected ? tab.accentColor : surface.border,
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Results Table */}
        {items.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center', color: 'text.disabled', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <SearchOffIcon sx={{ fontSize: 32, opacity: 0.4 }} />
            <Typography variant="body2">
              {index.length === 0 ? 'No features extracted for this comparison' : 'No features match the current search or filter'}
            </Typography>
            {index.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {deferredQuery.trim() && (
                  <Button size="small" variant="outlined" onClick={() => onQueryChange('')} sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
                    Clear Search
                  </Button>
                )}
                {effectiveStatus !== 'all' && (
                  <Button size="small" variant="outlined" onClick={() => setUserStatus('all')} sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
                    Include Identical (All)
                  </Button>
                )}
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: surface.border, borderRadius: 2, bgcolor: surface.panelBg }}>
            <Box sx={{ minWidth: 540 }}>
              {/* Sticky Column Header */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(240px, 2.3fr) minmax(130px, 1fr) minmax(130px, 1fr)',
                  borderBottom: '1px solid',
                  borderColor: surface.border,
                  bgcolor: surface.headerBg,
                }}
              >
                <Typography sx={{ px: 1.5, py: 0.65, fontSize: '0.65rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  RAT / Feature / 3GPP Spec
                </Typography>
                <Tooltip title={deviceAName} placement="top" arrow>
                  <Typography
                    sx={{
                      px: 1.5,
                      py: 0.65,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: DEVICE_COLOR.deviceA,
                      borderLeft: '1px solid',
                      borderColor: surface.border,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    A · {shortA}
                  </Typography>
                </Tooltip>
                <Tooltip title={deviceBName} placement="top" arrow>
                  <Typography
                    sx={{
                      px: 1.5,
                      py: 0.65,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: DEVICE_COLOR.deviceB,
                      borderLeft: '1px solid',
                      borderColor: surface.border,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    B · {shortB}
                  </Typography>
                </Tooltip>
              </Box>

              {visibleItems.map(item => (
                <GlobalCompareRow
                  key={item.id}
                  item={item}
                  query={deferredQuery}
                  isDark={isDark}
                  deviceAName={deviceAName}
                  deviceBName={deviceBName}
                  onJumpToRat={onJumpToRat}
                />
              ))}
            </Box>

            {!showAllRows && items.length > INITIAL_RENDER_CAP && (
              <Box sx={{ p: 1.25, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider', bgcolor: surface.subtleBg }}>
                <Button size="small" variant="outlined" onClick={() => setShowAllRows(true)} sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
                  Show all {items.length} matches (showing first {INITIAL_RENDER_CAP})
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </OpenUrlContext.Provider>
  );
};

// ─── GlobalSingleFeaturesView ─────────────────────────────────────────────────

const GlobalSingleRow = React.memo<{
  item: GlobalFeatureSingleItem;
  query: string;
  onJumpToRat: (rat: RatType, leaf: FeatureLeaf) => void;
}>(({ item, query, onJumpToRat }) => {
  const openUrl = useOpenUrlContext();
  const { leaf, rat, ratShortLabel, ratAccentColor } = item;
  const isBool = leaf.kind === 'bool' || leaf.kind === 'fgiBit' || leaf.kind === 'presence';
  const displayVal = formatFeatureValue(leaf.value, leaf.kind);
  const subtitle = leaf.description ?? leaf.path;

  const getCopyText = useCallback(
    () => formatSingleFeatureCopyText({ rat, leaf }),
    [rat, leaf]
  );

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 2.3fr) minmax(130px, 1fr)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        alignItems: 'center',
        minHeight: 40,
        contentVisibility: 'auto',
        containIntrinsicSize: '0 44px',
        '&:last-child': { borderBottom: 'none' },
        '& .row-hover-actions': { opacity: { xs: 0.85, md: 0.25 }, transition: 'opacity 120ms' },
        '&:hover .row-hover-actions, &:focus-within .row-hover-actions': { opacity: 1 },
      }}
    >
      <Box sx={{ px: 1.5, py: 0.6, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 0.2 }}>
            <Chip
              size="small"
              label={ratShortLabel}
              sx={{
                height: 15,
                fontSize: '0.56rem',
                fontWeight: 800,
                fontFamily: MONO_FONT_FAMILY,
                color: ratAccentColor,
                bgcolor: `${ratAccentColor}1f`,
                border: `1px solid ${ratAccentColor}44`,
                '& .MuiChip-label': { px: 0.55 },
              }}
            />
            <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <HighlightText text={leaf.major} query={query} />
              {' › '}
              <HighlightText text={leaf.middle} query={query} />
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: 'text.primary' }}>
              <HighlightText text={leaf.leaf} query={query} />
            </Typography>
            {leaf.description && (
              <>
                <Tooltip title={leaf.path ? `${leaf.description}\nASN.1: ${leaf.path}` : leaf.description} placement="top" arrow>
                  <InfoOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                </Tooltip>
                <OpenInNewIcon
                  sx={{ fontSize: 12, color: 'primary.main', cursor: 'pointer', opacity: 0.65, '&:hover': { opacity: 1 } }}
                  onClick={() => openExternalReportUrl(`https://www.google.com/search?q=${encodeURIComponent(leaf.description!)}`, openUrl)}
                />
              </>
            )}
          </Box>
          {subtitle && (
            <Typography sx={{ fontSize: '0.64rem', color: 'text.secondary', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <HighlightText text={subtitle} query={query} />
            </Typography>
          )}
        </Box>

        <Box className="row-hover-actions" sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
          <CopyActionButton getText={getCopyText} tooltip="Copy feature" size={12} />
          <Tooltip title={`Open in ${ratShortLabel} Features`} placement="top" arrow>
            <IconButton size="small" onClick={() => onJumpToRat(rat, leaf)} sx={{ p: 0.3, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
              <ArrowForwardIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ px: 1.5, py: 0.6, minWidth: 0, borderLeft: '1px solid', borderColor: 'divider' }}>
        <Typography
          sx={{
            fontSize: '0.74rem',
            fontFamily: MONO_FONT_FAMILY,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            wordBreak: 'break-word',
            color: isBool ? (leaf.value ? STATUS_COLOR.green : STATUS_COLOR.red) : 'text.primary',
          }}
        >
          <HighlightText text={displayVal} query={query} />
        </Typography>
      </Box>
    </Box>
  );
});

export interface GlobalSingleFeaturesViewProps {
  device: CompareFormat;
  side: 'A' | 'B';
  query: string;
  onQueryChange: (q: string) => void;
  precomputedIndex?: GlobalFeatureSingleItem[];
  onJumpToRat: (rat: RatType, leaf: FeatureLeaf) => void;
  onOpenUrl?: (url: string) => void;
}

export const GlobalSingleFeaturesView: React.FC<GlobalSingleFeaturesViewProps> = ({
  device,
  side,
  query,
  onQueryChange,
  precomputedIndex,
  onJumpToRat,
  onOpenUrl,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);
  const deferredQuery = useDeferredValue(query);
  const sideColor = side === 'A' ? DEVICE_COLOR.deviceA : DEVICE_COLOR.deviceB;
  const deviceLabel = device.meta.deviceName || device.meta.fileName;

  const index = useMemo(
    () => precomputedIndex ?? buildGlobalSingleFeatureIndex(device),
    [precomputedIndex, device]
  );
  const [selectedRats, setSelectedRats] = useState<Set<RatType>>(new Set());
  const [showAllRows, setShowAllRows] = useState(false);

  useEffect(() => {
    setShowAllRows(false);
  }, [deferredQuery, selectedRats]);

  const { items, ratCounts } = useMemo(
    () =>
      filterGlobalSingleFeatures(index, {
        query: deferredQuery,
        rats: selectedRats.size > 0 ? selectedRats : null,
      }),
    [index, deferredQuery, selectedRats]
  );

  const availableRatsInIndex = useMemo(() => {
    const present = new Set(index.map(i => i.rat));
    return RAT_TABS.filter(t => present.has(t.value));
  }, [index]);

  const toggleRat = useCallback((rat: RatType) => {
    setSelectedRats(prev => {
      const next = new Set(prev);
      if (next.has(rat)) next.delete(rat);
      else next.add(rat);
      return next;
    });
  }, []);

  const visibleItems = showAllRows ? items : items.slice(0, INITIAL_RENDER_CAP);

  return (
    <OpenUrlContext.Provider value={onOpenUrl}>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              clickable
              label={`All RATs (${Object.values(ratCounts).reduce((a, b) => a + (b ?? 0), 0)})`}
              onClick={() => setSelectedRats(new Set())}
              sx={{
                height: 20,
                fontSize: '0.62rem',
                fontWeight: selectedRats.size === 0 ? 700 : 500,
                bgcolor: selectedRats.size === 0 ? 'primary.main' : surface.subtleBg,
                color: selectedRats.size === 0 ? 'primary.contrastText' : 'text.secondary',
                border: '1px solid',
                borderColor: selectedRats.size === 0 ? 'primary.main' : surface.border,
              }}
            />
            {availableRatsInIndex.map(tab => {
              const selected = selectedRats.has(tab.value);
              const count = ratCounts[tab.value] ?? 0;
              return (
                <Chip
                  key={tab.value}
                  size="small"
                  clickable
                  label={`${tab.shortLabel} (${count})`}
                  onClick={() => toggleRat(tab.value)}
                  sx={{
                    height: 20,
                    fontSize: '0.62rem',
                    fontFamily: MONO_FONT_FAMILY,
                    fontWeight: selected ? 700 : 500,
                    bgcolor: selected ? `${tab.accentColor}22` : surface.subtleBg,
                    color: selected ? tab.accentColor : count === 0 ? 'text.disabled' : 'text.secondary',
                    border: '1px solid',
                    borderColor: selected ? tab.accentColor : surface.border,
                  }}
                />
              );
            })}
          </Box>

          <Typography variant="caption" sx={{ fontSize: '0.66rem', fontFamily: MONO_FONT_FAMILY, color: 'text.secondary' }}>
            Showing {items.length} / {index.length} features
          </Typography>
        </Box>

        {items.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center', color: 'text.disabled', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <SearchOffIcon sx={{ fontSize: 32, opacity: 0.4 }} />
            <Typography variant="body2">No features match the current search</Typography>
            {deferredQuery.trim() && (
              <Button size="small" variant="outlined" onClick={() => onQueryChange('')} sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
                Clear Search
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: surface.border, borderRadius: 2, bgcolor: surface.panelBg }}>
            <Box sx={{ minWidth: 440 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(240px, 2.3fr) minmax(130px, 1fr)',
                  borderBottom: '1px solid',
                  borderColor: surface.border,
                  bgcolor: surface.headerBg,
                }}
              >
                <Typography sx={{ px: 1.5, py: 0.65, fontSize: '0.65rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  RAT / Feature / 3GPP Spec
                </Typography>
                <Typography sx={{ px: 1.5, py: 0.65, fontSize: '0.65rem', fontWeight: 700, color: sideColor, borderLeft: '1px solid', borderColor: surface.border }}>
                  {side} · {shortenDeviceName(deviceLabel, `Device ${side}`)}
                </Typography>
              </Box>

              {visibleItems.map(item => (
                <GlobalSingleRow key={item.id} item={item} query={deferredQuery} onJumpToRat={onJumpToRat} />
              ))}
            </Box>

            {!showAllRows && items.length > INITIAL_RENDER_CAP && (
              <Box sx={{ p: 1.25, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider', bgcolor: surface.subtleBg }}>
                <Button size="small" variant="outlined" onClick={() => setShowAllRows(true)} sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
                  Show all {items.length} matches (showing first {INITIAL_RENDER_CAP})
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </OpenUrlContext.Provider>
  );
};
