import React, { useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { DEVICE_COLOR } from '../constants/statusMeta';
import { extractFilesFromDataTransfer } from '../utils/fileDropUtils';

interface GlobalFileDropOverlayProps {
  open: boolean;
  onDropSide: (side: 'a' | 'b', files: File[]) => void;
  onClose: () => void;
}

/**
 * Full-viewport dual drop target overlay (Left/Top = Device A, Right/Bottom = Device B)
 * shown when dragging CAPA files anywhere over the page in browser/Electron hosts.
 */
export const GlobalFileDropOverlay: React.FC<GlobalFileDropOverlayProps> = ({ open, onDropSide, onClose }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [hoverSide, setHoverSide] = useState<'a' | 'b' | null>(null);

  if (!open) return null;

  const handleZoneDrop = async (side: 'a' | 'b', e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHoverSide(null);
    onClose();
    const files = await extractFilesFromDataTransfer(e.dataTransfer);
    if (files.length > 0) {
      onDropSide(side, files);
    }
  };

  const renderZone = (side: 'a' | 'b', label: string, color: string) => {
    const active = hoverSide === side;
    return (
      <Box
        onDragEnter={e => {
          e.preventDefault();
          setHoverSide(side);
        }}
        onDragOver={e => {
          e.preventDefault();
          if (hoverSide !== side) setHoverSide(side);
        }}
        onDragLeave={e => {
          e.preventDefault();
          if (e.currentTarget === e.target) setHoverSide(null);
        }}
        onDrop={e => { void handleZoneDrop(side, e); }}
        sx={{
          border: '2px dashed',
          borderColor: active ? color : `${color}88`,
          borderRadius: 2.5,
          bgcolor: active
            ? (isDark ? `${color}24` : `${color}18`)
            : (isDark ? 'rgba(20, 25, 34, 0.85)' : 'rgba(255, 255, 255, 0.88)'),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          p: 3,
          transition: 'all 140ms ease',
          boxShadow: active ? `0 0 0 3px ${color}33` : 'none',
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 40, color }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color, letterSpacing: '0.04em' }}>
          Drop to {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Supports MTK · SLSI · QUALCOMM (.txt / .log / .json)
        </Typography>
      </Box>
    );
  };

  return (
    <Box
      onDragOver={e => { e.preventDefault(); }}
      onDrop={e => {
        e.preventDefault();
        setHoverSide(null);
        onClose();
      }}
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        p: 2.5,
        bgcolor: isDark ? 'rgba(10, 14, 23, 0.72)' : 'rgba(241, 245, 249, 0.76)',
        backdropFilter: 'blur(6px)',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 2,
      }}
    >
      {renderZone('a', 'Device A', DEVICE_COLOR.deviceA)}
      {renderZone('b', 'Device B', DEVICE_COLOR.deviceB)}
    </Box>
  );
};
