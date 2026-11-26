import React from 'react';
import { Box, Chip, CircularProgress, IconButton, Paper, Tooltip, Typography, useTheme } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import type { DeviceState } from '@ohmycapa/capa-core';
import { CapaDropzone } from './CapaDropzone';
import { DEVICE_COLOR, MONO_FONT_FAMILY, getWorkbenchSurface } from '../constants/statusMeta';

interface EmptyCompareStageProps {
  deviceA: DeviceState;
  deviceB: DeviceState;
  isProcessing: boolean;
  isComparing: boolean;
  onFilesDrop: (side: 'a' | 'b', files: File[]) => void;
  onRemoveFile: (side: 'a' | 'b', name: string) => void;
  onClearDevice: (side: 'a' | 'b') => void;
  onSwap: () => void;
  onOpenUrl?: (url: string) => void;
  emptyStateExtra?: React.ReactNode;
}

/**
 * Precision Instrument empty state featuring a symmetric A vs B drop bay,
 * supported format indicators, and optional host-provided sample actions.
 */
export const EmptyCompareStage: React.FC<EmptyCompareStageProps> = ({
  deviceA,
  deviceB,
  isProcessing,
  isComparing,
  onFilesDrop,
  onRemoveFile,
  onClearDevice,
  onSwap,
  onOpenUrl,
  emptyStateExtra,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2.5,
        py: 2,
      }}
    >
      {/* Symmetric A vs B Drop Bay */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2.25 },
          border: '1px solid',
          borderColor: surface.border,
          borderRadius: 2.5,
          bgcolor: surface.panelBg,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
            gap: 2,
            alignItems: 'stretch',
          }}
        >
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: surface.laneABorder,
              bgcolor: surface.laneABg,
            }}
          >
            <CapaDropzone
              side="A"
              device={deviceA}
              onFilesDrop={files => onFilesDrop('a', files)}
              onRemoveFile={name => onRemoveFile('a', name)}
              onClear={() => onClearDevice('a')}
              onOpenUrl={onOpenUrl}
            />
          </Box>

          {/* Center Swap / VS */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: 0.5 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, alignItems: 'center', gap: 0.75 }}>
              {isProcessing || isComparing ? (
                <CircularProgress size={22} />
              ) : (
                <Tooltip title="Swap A ↔ B" placement="top" arrow>
                  <span>
                    <IconButton
                      size="small"
                      onClick={onSwap}
                      disabled={!deviceA.files.length && !deviceB.files.length}
                      aria-label="Swap Device A and Device B"
                      sx={{
                        border: '1px solid',
                        borderColor: surface.border,
                        bgcolor: surface.elevatedBg,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <SwapHorizIcon sx={{ fontSize: 22 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  fontFamily: MONO_FONT_FAMILY,
                  letterSpacing: '0.1em',
                  color: 'text.disabled',
                }}
              >
                VS
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: surface.laneBBorder,
              bgcolor: surface.laneBBg,
            }}
          >
            <CapaDropzone
              side="B"
              device={deviceB}
              onFilesDrop={files => onFilesDrop('b', files)}
              onRemoveFile={name => onRemoveFile('b', name)}
              onClear={() => onClearDevice('b')}
              onOpenUrl={onOpenUrl}
            />
          </Box>
        </Box>
      </Paper>

      {/* Guidance & Capabilities Strip */}
      <Box sx={{ textAlign: 'center', px: 2 }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
          <CompareArrowsIcon sx={{ fontSize: 24, color: DEVICE_COLOR.deviceA, opacity: 0.85 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            UE Capability A/B Workbench
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontSize: '0.78rem' }}>
          Drop UE CAPA logs for one device to inspect, or both devices to compare Bands, CA/EN-DC Combos, and 3GPP Features side by side.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.75, flexWrap: 'wrap', mt: 1.25 }}>
          {[
            'MTK · SLSI · QUALCOMM',
            '.txt / .log / CommonCapaJson v2.0',
            'Multi-file Auto RAT Merge',
            'Click Dropzone to Paste',
          ].map(badge => (
            <Chip
              key={badge}
              size="small"
              label={badge}
              sx={{
                height: 20,
                fontSize: '0.62rem',
                fontWeight: 600,
                bgcolor: surface.elevatedBg,
                border: `1px solid ${surface.border}`,
                color: 'text.secondary',
              }}
            />
          ))}
        </Box>

        {emptyStateExtra && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
            {emptyStateExtra}
          </Box>
        )}
      </Box>
    </Box>
  );
};
