import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Divider, IconButton, InputAdornment,
  ListItemIcon, ListItemText, Menu, MenuItem, Paper, TextField, Tooltip, Typography, useTheme,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import type { CapaCompareResult, CompareFormat, DeviceState } from '@ohmycapa/capa-core';
import {
  exportCapaCompareToExcelCompat,
  exportCommonJsonCompat,
  exportSingleDeviceToExcelCompat,
} from '../utils/tauriExportUtils';
import { DEVICE_COLOR, MONO_FONT_FAMILY, STATUS_COLOR, getWorkbenchSurface } from '../constants/statusMeta';
import type { CrossRatMetrics, KpiKind } from '../utils/compareMetrics';

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? navigator.userAgent ?? '');
}

// ─── ExportMenu ──────────────────────────────────────────────────────────────

const ExportMenu = memo<{
  deviceA: DeviceState;
  deviceB: DeviceState;
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
        sx={{
          fontSize: '0.7rem',
          py: 0.25,
          px: 0.85,
          textTransform: 'none',
          borderRadius: 1.5,
          minHeight: 27,
          whiteSpace: 'nowrap',
          '& .MuiButton-startIcon': { mr: 0.45 },
          '& .MuiButton-endIcon': { ml: 0.25 },
        }}
      >
        Export
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 196, mt: 0.5 } } }}
      >
        {compareResult && (
          <MenuItem
            dense
            onClick={() => {
              close();
              exportCapaCompareToExcelCompat(compareResult).catch(console.error);
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
              exportSingleDeviceToExcelCompat(deviceA.normalized!, 'A').catch(console.error);
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
              exportCommonJsonCompat(deviceA.normalized!, 'A').catch(console.error);
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
              exportSingleDeviceToExcelCompat(deviceB.normalized!, 'B').catch(console.error);
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
              exportCommonJsonCompat(deviceB.normalized!, 'B').catch(console.error);
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

// ─── ResetButton ─────────────────────────────────────────────────────────────

function ResetButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Tooltip title="Reset loaded devices" placement="top" arrow>
      <span>
        <Button
          type="button"
          size="small"
          variant="outlined"
          aria-label="Reset loaded devices"
          startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
          onClick={onClick}
          disabled={disabled}
          sx={{
            fontSize: '0.7rem',
            py: 0.25,
            px: 0.75,
            textTransform: 'none',
            borderRadius: 1.5,
            minHeight: 27,
            minWidth: 28,
            whiteSpace: 'nowrap',
            color: 'text.secondary',
            borderColor: 'divider',
            '& .MuiButton-startIcon': { mr: 0.4 },
            '@container (min-width: 980px) and (max-width: 1139px)': {
              px: 0.55,
              '& .MuiButton-startIcon': { mx: 0 },
            },
          }}
        >
          <Box
            component="span"
            sx={{
              '@container (min-width: 980px) and (max-width: 1139px)': {
                display: 'none',
              },
            }}
          >
            Reset
          </Box>
        </Button>
      </span>
    </Tooltip>
  );
}

// ─── DeviceIdentityPill (inline rename with draft commit on Enter/blur) ──────

const DeviceIdentityPill = memo<{
  side: 'A' | 'B';
  name: string;
  vendor?: string;
  fileCount: number;
  onRename: (nextName: string) => void;
}>(({ side, name, vendor, fileCount, onRename }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const color = side === 'A' ? DEVICE_COLOR.deviceA : DEVICE_COLOR.deviceB;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    } else {
      setDraft(name);
    }
  }, [draft, name, onRename]);

  const cancel = useCallback(() => {
    setDraft(name);
    setEditing(false);
  }, [name]);

  if (editing) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.85,
          py: 0.25,
          borderRadius: 1.5,
          border: `1px solid ${color}`,
          bgcolor: isDark ? `${color}18` : `${color}10`,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.68rem', color }}>
          {side}
        </Typography>
        <Box
          component="input"
          type="text"
          value={draft}
          autoFocus
          data-inline-editing="true"
          aria-label={`Edit Device ${side} name`}
          onFocus={e => e.currentTarget.select()}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              cancel();
            }
          }}
          sx={{
            width: 130,
            border: 'none',
            outline: 'none',
            bgcolor: 'transparent',
            color: 'text.primary',
            fontSize: '0.73rem',
            fontWeight: 600,
            fontFamily: 'inherit',
            p: 0,
          }}
        />
      </Box>
    );
  }

  return (
    <Tooltip title={`${name} — Click to rename`} placement="bottom" arrow>
      <Box
        role="button"
        tabIndex={0}
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setDraft(name);
            setEditing(true);
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.45,
          px: 0.65,
          py: 0.25,
          minWidth: 0,
          flex: '0 1 auto',
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: `${color}55`,
          bgcolor: isDark ? `${color}14` : `${color}0d`,
          cursor: 'pointer',
          transition: 'border-color 120ms, background-color 120ms',
          '&:hover': {
            borderColor: color,
            bgcolor: isDark ? `${color}20` : `${color}15`,
          },
          '& .edit-hint-icon': { opacity: 0.45, transition: 'opacity 120ms' },
          '&:hover .edit-hint-icon': { opacity: 1 },
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.68rem', color, flexShrink: 0 }}>
          {side}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: '0.73rem',
            minWidth: 0,
            maxWidth: 175,
            '@container (max-width: 1259px)': { maxWidth: 150 },
            '@container (max-width: 1139px)': { maxWidth: 120 },
            '@container (max-width: 979px)': { maxWidth: 165 },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </Typography>
        {vendor && vendor !== 'UNKNOWN' && (
          <Chip
            label={vendor}
            size="small"
            sx={{
              height: 15,
              fontSize: '0.55rem',
              fontWeight: 700,
              flexShrink: 0,
              '& .MuiChip-label': { px: 0.5 },
            }}
          />
        )}
        {fileCount > 1 && (
          <Chip
            label={`${fileCount}f`}
            size="small"
            sx={{
              height: 15,
              fontSize: '0.55rem',
              fontFamily: MONO_FONT_FAMILY,
              bgcolor: 'action.hover',
              flexShrink: 0,
              '& .MuiChip-label': { px: 0.5 },
            }}
          />
        )}
        <EditOutlinedIcon
          className="edit-hint-icon"
          sx={{
            fontSize: 11,
            color: 'text.secondary',
            flexShrink: 0,
            '@container (min-width: 980px) and (max-width: 1139px)': { display: 'none' },
          }}
        />
      </Box>
    </Tooltip>
  );
});

// ─── GlobalSearchInput ────────────────────────────────────────────────────────

const GlobalSearchInput = memo<{
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  matchCount?: number;
}>(({ value, onChange, inputRef, matchCount }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const shortcutLabel = isMacPlatform() ? '⌘K' : 'Ctrl+K';

  return (
    <TextField
      size="small"
      inputRef={inputRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Search all features..."
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 15, color: value ? 'primary.main' : 'text.disabled' }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {value ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  {matchCount !== undefined && (
                    <Chip
                      size="small"
                      label={matchCount}
                      sx={{
                        height: 16,
                        fontSize: '0.58rem',
                        fontWeight: 700,
                        fontFamily: MONO_FONT_FAMILY,
                        bgcolor: 'rgba(99,102,241,0.16)',
                        color: STATUS_COLOR.indigo,
                        '& .MuiChip-label': { px: 0.5 },
                      }}
                    />
                  )}
                  <IconButton size="small" onClick={() => onChange('')} sx={{ p: 0.2 }} aria-label="Clear global feature search">
                    <CloseIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Box>
              ) : (
                <Box
                  component="kbd"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 0.55,
                    py: 0.1,
                    borderRadius: 0.75,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)',
                    fontSize: '0.58rem',
                    fontFamily: MONO_FONT_FAMILY,
                    color: 'text.disabled',
                    lineHeight: 1.3,
                    '@container (max-width: 1259px)': { display: 'none' },
                  }}
                >
                  {shortcutLabel}
                </Box>
              )}
            </InputAdornment>
          ),
          sx: {
            fontSize: '0.72rem',
            height: 27,
            borderRadius: 1.5,
            pl: 0.85,
            pr: 0.6,
            '& .MuiInputAdornment-positionStart': { mr: 0.45 },
            '& .MuiInputAdornment-positionEnd': { ml: 0.3 },
          },
        },
      }}
      sx={{
        width: 205,
        flexShrink: 0,
        '@container (max-width: 1259px)': { width: 175 },
        '@container (max-width: 1139px)': { width: 155 },
        '@container (max-width: 979px)': { width: 'auto', flex: '1 1 180px', minWidth: 150 },
        '@container (max-width: 519px)': { width: '100%', flex: '1 0 100%' },
      }}
    />
  );
});

// ─── CompareTopBar ────────────────────────────────────────────────────────────

export interface CompareTopBarProps {
  deviceA: DeviceState;
  deviceB: DeviceState;
  compareResult: CapaCompareResult;
  metrics: CrossRatMetrics;
  isProcessing: boolean;
  isComparing: boolean;
  isFilesExpanded: boolean;
  onToggleFiles: () => void;
  onSwap: () => void;
  onReset: () => void;
  onRenameDevice: (side: 'a' | 'b', name: string) => void;
  onKpiClick: (kind: KpiKind) => void;
  globalQuery: string;
  onGlobalQueryChange: (q: string) => void;
  globalSearchRef?: React.RefObject<HTMLInputElement | null>;
  globalMatchCount?: number;
}

export const CompareTopBar = memo<CompareTopBarProps>(({
  deviceA,
  deviceB,
  compareResult,
  metrics,
  isProcessing,
  isComparing,
  isFilesExpanded,
  onToggleFiles,
  onSwap,
  onReset,
  onRenameDevice,
  onKpiClick,
  globalQuery,
  onGlobalQueryChange,
  globalSearchRef,
  globalMatchCount,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);

  const nameA = deviceA.deviceName || compareResult.meta.deviceA.fileName;
  const nameB = deviceB.deviceName || compareResult.meta.deviceB.fileName;
  const vendorA = compareResult.meta.deviceA.vendor;
  const vendorB = compareResult.meta.deviceB.vendor;
  const { totals, allIdentical } = metrics;
  const totalFiles = deviceA.files.length + deviceB.files.length;

  const kpiItems: Array<{ kind: KpiKind; label: string; count: number; color: string; bg: string; tip: string }> = [
    {
      kind: 'unique',
      label: `Unique ${totals.combos.unique}`,
      count: totals.combos.unique,
      color: STATUS_COLOR.red,
      bg: 'rgba(239,68,68,0.12)',
      tip: 'Jump to uncovered unique combos',
    },
    {
      kind: 'param',
      label: `Param ${totals.combos.exactChanged}`,
      count: totals.combos.exactChanged,
      color: STATUS_COLOR.amber,
      bg: 'rgba(245,158,11,0.12)',
      tip: 'Jump to parameter diff combos',
    },
    {
      kind: 'covered',
      label: `Covered ${totals.combos.covered}`,
      count: totals.combos.covered,
      color: STATUS_COLOR.indigo,
      bg: 'rgba(99,102,241,0.12)',
      tip: 'Jump to superset-covered combos',
    },
    {
      kind: 'bands',
      label: `Bands ${totals.bands.diff}`,
      count: totals.bands.diff,
      color: STATUS_COLOR.amber,
      bg: 'rgba(245,158,11,0.10)',
      tip: 'Jump to band capability diffs',
    },
    {
      kind: 'features',
      label: `Features ${totals.features.diff}`,
      count: totals.features.diff,
      color: STATUS_COLOR.amber,
      bg: 'rgba(245,158,11,0.10)',
      tip: 'Open All Features diff view',
    },
  ];

  return (
    <Box sx={{ containerType: 'inline-size', width: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          px: 1.25,
          py: 0.6,
          border: '1px solid',
          borderColor: surface.border,
          borderRadius: 2,
          bgcolor: surface.panelBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.75,
          flexWrap: 'nowrap',
          '@container (max-width: 979px)': {
            flexWrap: 'wrap',
            py: 0.7,
          },
        }}
      >
        {/* Left: A <-> B identity pills + clickable KPI strip */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.55,
            flex: '1 1 auto',
            minWidth: 0,
            flexWrap: 'nowrap',
            overflow: 'hidden',
            '@container (max-width: 979px)': {
              flexWrap: 'wrap',
              overflow: 'visible',
            },
          }}
        >
          <DeviceIdentityPill
            side="A"
            name={nameA}
            vendor={vendorA}
            fileCount={deviceA.files.length}
            onRename={next => onRenameDevice('a', next)}
          />

          {isProcessing || isComparing ? (
            <CircularProgress size={16} sx={{ flexShrink: 0 }} />
          ) : (
            <Tooltip title="Swap A ↔ B" placement="top" arrow>
              <IconButton size="small" onClick={onSwap} sx={{ p: 0.25, color: 'primary.main', flexShrink: 0 }} aria-label="Swap Device A and Device B">
                <SwapHorizIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}

          <DeviceIdentityPill
            side="B"
            name={nameB}
            vendor={vendorB}
            fileCount={deviceB.files.length}
            onRename={next => onRenameDevice('b', next)}
          />

          <Divider
            orientation="vertical"
            flexItem
            sx={{
              mx: 0.1,
              my: 0.3,
              flexShrink: 0,
              '@container (max-width: 979px)': { display: 'none' },
            }}
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.35,
              flexShrink: 0,
              '@container (max-width: 979px)': {
                flexWrap: 'wrap',
                flexShrink: 1,
              },
            }}
          >
            {allIdentical ? (
              <Chip
                size="small"
                label="100% Identical ✓"
                sx={{
                  height: 19,
                  fontSize: '0.59rem',
                  fontWeight: 700,
                  bgcolor: 'rgba(16,185,129,0.14)',
                  color: STATUS_COLOR.green,
                  '& .MuiChip-label': { px: 0.6 },
                }}
              />
            ) : (
              kpiItems
                .filter(item => item.count > 0)
                .map(item => (
                  <Tooltip key={item.kind} title={item.tip} placement="bottom" arrow>
                    <Chip
                      size="small"
                      clickable
                      label={item.label}
                      onClick={() => onKpiClick(item.kind)}
                      sx={{
                        height: 19,
                        fontSize: '0.59rem',
                        fontWeight: 700,
                        fontFamily: MONO_FONT_FAMILY,
                        fontVariantNumeric: 'tabular-nums',
                        bgcolor: item.bg,
                        color: item.color,
                        border: `1px solid ${item.color}33`,
                        '& .MuiChip-label': { px: 0.6 },
                        '&:hover': { bgcolor: `${item.color}28` },
                      }}
                    />
                  </Tooltip>
                ))
            )}
          </Box>
        </Box>

        {/* Right: Global feature search + Files drawer + Reset + Export */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.6,
            flexShrink: 0,
            ml: 'auto',
            flexWrap: 'nowrap',
            '@container (max-width: 979px)': {
              width: '100%',
              ml: 0,
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            },
          }}
        >
          <GlobalSearchInput
            value={globalQuery}
            onChange={onGlobalQueryChange}
            inputRef={globalSearchRef}
            matchCount={globalMatchCount}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <Button
              size="small"
              variant={isFilesExpanded ? 'contained' : 'outlined'}
              color={isFilesExpanded ? 'primary' : 'inherit'}
              startIcon={<FolderOpenIcon sx={{ fontSize: 14 }} />}
              endIcon={isFilesExpanded ? <ExpandLessIcon sx={{ fontSize: 15 }} /> : <ExpandMoreIcon sx={{ fontSize: 15 }} />}
              onClick={onToggleFiles}
              sx={{
                fontSize: '0.7rem',
                py: 0.25,
                px: 0.75,
                textTransform: 'none',
                borderRadius: 1.5,
                minHeight: 27,
                whiteSpace: 'nowrap',
                color: isFilesExpanded ? undefined : 'text.secondary',
                borderColor: 'divider',
                '& .MuiButton-startIcon': { mr: 0.45 },
                '& .MuiButton-endIcon': { ml: 0.25 },
              }}
            >
              Files ({totalFiles})
            </Button>
            <ResetButton onClick={onReset} disabled={isProcessing || isComparing} />
            <ExportMenu deviceA={deviceA} deviceB={deviceB} compareResult={compareResult} />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
});

// ─── SingleTopBar ─────────────────────────────────────────────────────────────

export interface SingleTopBarProps {
  device: CompareFormat;
  side: 'A' | 'B';
  deviceA: DeviceState;
  deviceB: DeviceState;
  isProcessing: boolean;
  isFilesExpanded: boolean;
  onExpandFiles: () => void;
  onToggleFiles: () => void;
  onSwap: () => void;
  onReset: () => void;
  onRenameDevice: (side: 'a' | 'b', name: string) => void;
  globalQuery: string;
  onGlobalQueryChange: (q: string) => void;
  globalSearchRef?: React.RefObject<HTMLInputElement | null>;
  globalMatchCount?: number;
}

export const SingleTopBar = memo<SingleTopBarProps>(({
  device,
  side,
  deviceA,
  deviceB,
  isProcessing,
  isFilesExpanded,
  onExpandFiles,
  onToggleFiles,
  onSwap,
  onReset,
  onRenameDevice,
  globalQuery,
  onGlobalQueryChange,
  globalSearchRef,
  globalMatchCount,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);
  const otherSide = side === 'A' ? 'B' : 'A';
  const otherColor = otherSide === 'A' ? DEVICE_COLOR.deviceA : DEVICE_COLOR.deviceB;
  const currentState = side === 'A' ? deviceA : deviceB;
  const displayName = currentState.deviceName || device.meta.deviceName || device.meta.fileName;

  return (
    <Box sx={{ containerType: 'inline-size', width: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          px: 1.25,
          py: 0.6,
          border: '1px solid',
          borderColor: surface.border,
          borderRadius: 2,
          bgcolor: surface.panelBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.75,
          flexWrap: 'nowrap',
          '@container (max-width: 979px)': {
            flexWrap: 'wrap',
            py: 0.7,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.55,
            flex: '1 1 auto',
            minWidth: 0,
            flexWrap: 'nowrap',
            overflow: 'hidden',
            '@container (max-width: 979px)': {
              flexWrap: 'wrap',
              overflow: 'visible',
            },
          }}
        >
          <DeviceIdentityPill
            side={side}
            name={displayName}
            vendor={device.meta.vendor}
            fileCount={currentState.files.length}
            onRename={next => onRenameDevice(side === 'A' ? 'a' : 'b', next)}
          />

          {isProcessing ? (
            <CircularProgress size={16} sx={{ flexShrink: 0 }} />
          ) : (
            <Tooltip title="Swap A ↔ B" placement="top" arrow>
              <IconButton size="small" onClick={onSwap} sx={{ p: 0.25, color: 'text.secondary', flexShrink: 0 }} aria-label="Swap Device A and Device B">
                <SwapHorizIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}

          <Button
            size="small"
            variant="outlined"
            onClick={onExpandFiles}
            sx={{
              fontSize: '0.68rem',
              py: 0.25,
              px: 0.85,
              textTransform: 'none',
              borderRadius: 1.5,
              minHeight: 26,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              borderStyle: 'dashed',
              borderColor: `${otherColor}88`,
              color: otherColor,
              '&:hover': { borderStyle: 'dashed', borderColor: otherColor, bgcolor: `${otherColor}10` },
            }}
          >
            + Add Device {otherSide} to Compare
          </Button>

          <Divider
            orientation="vertical"
            flexItem
            sx={{
              mx: 0.1,
              my: 0.3,
              flexShrink: 0,
              '@container (max-width: 979px)': { display: 'none' },
            }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.35,
              flexShrink: 0,
              '@container (max-width: 979px)': {
                flexWrap: 'wrap',
                flexShrink: 1,
              },
            }}
          >
            {device.meta.detectedRats.map(r => (
              <Chip
                key={r}
                label={r.toUpperCase()}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  fontFamily: MONO_FONT_FAMILY,
                  bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)',
                  '& .MuiChip-label': { px: 0.6 },
                }}
              />
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.6,
            flexShrink: 0,
            ml: 'auto',
            flexWrap: 'nowrap',
            '@container (max-width: 979px)': {
              width: '100%',
              ml: 0,
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            },
          }}
        >
          <GlobalSearchInput
            value={globalQuery}
            onChange={onGlobalQueryChange}
            inputRef={globalSearchRef}
            matchCount={globalMatchCount}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <Button
              size="small"
              variant={isFilesExpanded ? 'contained' : 'outlined'}
              color={isFilesExpanded ? 'primary' : 'inherit'}
              startIcon={<FolderOpenIcon sx={{ fontSize: 14 }} />}
              endIcon={isFilesExpanded ? <ExpandLessIcon sx={{ fontSize: 15 }} /> : <ExpandMoreIcon sx={{ fontSize: 15 }} />}
              onClick={onToggleFiles}
              sx={{
                fontSize: '0.7rem',
                py: 0.25,
                px: 0.75,
                textTransform: 'none',
                borderRadius: 1.5,
                minHeight: 27,
                whiteSpace: 'nowrap',
                color: isFilesExpanded ? undefined : 'text.secondary',
                borderColor: 'divider',
                '& .MuiButton-startIcon': { mr: 0.45 },
                '& .MuiButton-endIcon': { ml: 0.25 },
              }}
            >
              Files
            </Button>
            <ResetButton onClick={onReset} disabled={isProcessing} />
            <ExportMenu deviceA={deviceA} deviceB={deviceB} compareResult={null} />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
});
