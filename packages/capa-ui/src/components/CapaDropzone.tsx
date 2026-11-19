import React, { useState, useRef } from 'react';
import {
  Box, Paper, Typography, Chip, IconButton, LinearProgress, Tooltip, Alert, Collapse as MuiCollapse,
  useTheme,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { DeviceState } from '@ohmycapa/capa-core';

// ─── Parse error alert ───────────────────────────────────────────────────────

const FORMAT_HINT = 'Please use original MTK / SLSI / QUALCOMM OTA logs (.txt) or CommonCapaJson v2.0 (.json).';

function isUnknownFormatError(error: string): boolean {
  return (
    error.includes('Unknown format') ||
    error.includes('Format not detected') ||
    error.includes('Unrecognized UE capability format') ||
    error.includes('Non-OTA capability summary')
  );
}

function ParseErrorAlert({ fileName, error }: { fileName: string; error: string }) {
  const [expanded, setExpanded] = useState(false);
  const isFormatError = isUnknownFormatError(error);

  return (
    <Alert
      severity="error"
      icon={<ErrorIcon sx={{ fontSize: 16, mt: 0.1 }} />}
      sx={{
        mt: 0.75, py: 0.5, px: 1,
        fontSize: '0.68rem',
        alignItems: 'flex-start',
        '& .MuiAlert-icon': { py: 0.25 },
        '& .MuiAlert-message': { width: '100%', py: 0.25 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'inherit', display: 'block' }}>
            {isFormatError ? 'Unknown file format' : 'Parsing failed'}
            <Typography component="span" sx={{ fontWeight: 400, fontSize: '0.65rem', ml: 0.75, opacity: 0.8 }}>
              {fileName}
            </Typography>
          </Typography>
          {isFormatError && (
            <Typography sx={{ fontSize: '0.63rem', mt: 0.25, opacity: 0.85 }}>
              {FORMAT_HINT}
            </Typography>
          )}
        </Box>
        <IconButton
          size="small"
          onClick={() => setExpanded(v => !v)}
          sx={{ flexShrink: 0, p: 0.25, opacity: 0.7 }}
          title="View details"
        >
          {expanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
        </IconButton>
      </Box>
      <MuiCollapse in={expanded}>
        <Box
          component="pre"
          sx={{
            mt: 0.5, p: 0.75, borderRadius: 0.5,
            bgcolor: 'rgba(0,0,0,0.1)',
            fontSize: '0.6rem', fontFamily: 'monospace',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            maxHeight: 80, overflowY: 'auto',
            m: 0,
          }}
        >
          {error}
        </Box>
      </MuiCollapse>
    </Alert>
  );
}

const VENDOR_COLORS: Record<string, string> = {
  MTK: '#2196F3',
  SLSI: '#9C27B0',
  QUALCOMM: '#FF9800',
  UNKNOWN: '#9E9E9E',
};

const RAT_LABELS: Record<string, string> = {
  nr: 'NR', eutra: 'LTE', 'eutra-nr': 'MRDC', utra: 'UTRA',
};

const getDisplayName = (fileName: string): string =>
  /^clipboard_\d+\.txt$/.test(fileName) ? 'Clipboard' : fileName;

const getSideColor = (side: 'A' | 'B'): string =>
  side === 'A' ? '#2196F3' : '#4DB6AC';

const getSideColorLight = (side: 'A' | 'B'): string =>
  side === 'A' ? 'rgba(33,150,243,0.06)' : 'rgba(77,182,172,0.06)';

// ─── File scanning utilities ──────────────────────────────────────────────────
async function scanEntry(entry: any, txtFiles: File[]): Promise<void> {
  if (entry.isFile) {
    const name: string = (entry.name ?? '').toLowerCase();
    if (name.endsWith('.txt') || name.endsWith('.json')) {
      const file = await new Promise<File>((res, rej) => entry.file(res, rej));
      txtFiles.push(file);
    }
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = await readAllEntries(reader);
    for (const child of entries) await scanEntry(child, txtFiles);
  }
}

async function readAllEntries(reader: any): Promise<any[]> {
  const all: any[] = [];
  let chunk: any[];
  do {
    chunk = await new Promise<any[]>((res, rej) => reader.readEntries(res, rej));
    all.push(...chunk);
  } while (chunk.length > 0);
  return all;
}

interface CapaDropzoneProps {
  side: 'A' | 'B';
  device: DeviceState;
  onFilesDrop: (files: File[]) => void;
  onRemoveFile: (name: string) => void;
  onNameChange: (name: string) => void;
  onClear: () => void;
}

export const CapaDropzone: React.FC<CapaDropzoneProps> = ({
  side, device, onFilesDrop, onRemoveFile, onClear,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [isDragActive, setIsDragActive] = useState(false);
  const lastPastedRef = useRef<{ text: string; name: string } | null>(null);

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragActive) setIsDragActive(true); };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragActive(false);
    // Tauri handles file drops natively via onDragDropEvent in CapaComparePage
    if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') return;

    const items = Array.from(e.dataTransfer.items ?? []);
    const txtFiles: File[] = [];
    const entries = items.map(item => item.webkitGetAsEntry?.()).filter(Boolean);

    if (entries.length > 0) {
      await Promise.all(entries.map(entry => scanEntry(entry, txtFiles)));
    } else {
      // Fallback for WebView2 (Tauri) where webkitGetAsEntry may return null
      Array.from(e.dataTransfer.files ?? [])
        .filter(f => { const n = f.name.toLowerCase(); return n.endsWith('.txt') || n.endsWith('.json'); })
        .forEach(f => txtFiles.push(f));
    }

    if (txtFiles.length > 0) onFilesDrop(txtFiles);
  };

  const openFileBrowse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.txt,.json';
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      if (files.length > 0) onFilesDrop(files);
    };
    input.click();
  };

  const handleClick = async () => {
    if (device.isProcessing) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        if (
          lastPastedRef.current &&
          lastPastedRef.current.text === text &&
          device.files.some(pf => pf.file.name === lastPastedRef.current!.name)
        ) {
          return;
        }
        const name = `clipboard_${Date.now()}.txt`;
        lastPastedRef.current = { text, name };
        const file = new File([text], name, { type: 'text/plain' });
        onFilesDrop([file]);
      }
    } catch {
      // clipboard permission denied or no content - do nothing
    }
  };

  const vendor = device.normalized?.meta.vendor;
  const detectedRats = device.normalized?.meta.detectedRats ?? [];
  const vendorColor = vendor ? VENDOR_COLORS[vendor] : undefined;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: getSideColor(side), fontSize: '0.72rem',
          }}
        >
          Device {side}
        </Typography>
        {vendor && vendor !== 'UNKNOWN' && (
          <Chip
            label={vendor}
            size="small"
            sx={{
              height: 18, fontSize: '0.65rem', fontWeight: 700,
              bgcolor: vendorColor ? `${vendorColor}22` : undefined,
              color: vendorColor,
              border: `1px solid ${vendorColor}55`,
            }}
          />
        )}
        {detectedRats.map(rat => (
          <Chip
            key={rat}
            label={RAT_LABELS[rat] ?? rat}
            size="small"
            sx={{
              height: 16, fontSize: '0.6rem',
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            }}
          />
        ))}
        {device.files.length > 0 && (
          <Tooltip title="Clear">
            <IconButton size="small" onClick={onClear} sx={{ ml: 'auto', p: 0.25 }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Dropzone */}
      <Paper
        elevation={0}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        sx={{
          px: 1.5, py: 0, height: 45,
          display: 'flex', flexDirection: 'row',
          alignItems: 'center', justifyContent: 'center', gap: 0.75,
          bgcolor: isDragActive
            ? getSideColorLight(side)
            : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
          borderColor: isDragActive
            ? getSideColor(side)
            : 'divider',
          borderStyle: 'dashed', borderWidth: 1, borderRadius: 2,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': { borderColor: getSideColor(side), bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
        }}
      >
        <CloudUploadIcon
          sx={{
            fontSize: 16,
            color: isDragActive ? getSideColor(side) : 'text.disabled',
            transition: 'color 0.2s',
          }}
        />
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
          Drop or click to paste ·{' '}
          <Typography
            component="span"
            onClick={(e) => { e.stopPropagation(); openFileBrowse(); }}
            sx={{
              fontSize: '0.68rem', color: 'text.secondary',
              textDecoration: 'underline', cursor: 'pointer',
              '&:hover': { color: 'text.primary' },
            }}
          >
            File Open
          </Typography>
        </Typography>
      </Paper>

      {device.isProcessing && <LinearProgress sx={{ borderRadius: 1 }} />}

      {/* File chip list */}
      {device.files.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: device.files.some(f => f.error) ? 0.75 : 0 }}>
            {device.files.map(pf => (
              <Tooltip key={pf.file.name} title={pf.error ? `❌ ${pf.error}` : pf.status === 'parsing' ? 'Parsing...' : '✓ Done'} placement="top">
                <Chip
                  label={getDisplayName(pf.file.name)}
                  size="small"
                  icon={
                    pf.status === 'parsing' ? <HourglassEmptyIcon sx={{ fontSize: '0.75rem !important' }} /> :
                    pf.status === 'error' ? <ErrorIcon sx={{ fontSize: '0.75rem !important', color: '#ef4444 !important' }} /> :
                    <CheckCircleIcon sx={{ fontSize: '0.75rem !important', color: '#10b981 !important' }} />
                  }
                  onDelete={() => onRemoveFile(pf.file.name)}
                  deleteIcon={<CloseIcon sx={{ fontSize: '0.75rem !important' }} />}
                  sx={{
                    height: 22, fontSize: '0.68rem', maxWidth: 240,
                    bgcolor: pf.status === 'error'
                      ? 'rgba(239,68,68,0.08)'
                      : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                  }}
                />
              </Tooltip>
            ))}
          </Box>
          {/* Error alerts */}
          {device.files.filter(f => f.error).map(f => (
            <ParseErrorAlert key={f.file.name} fileName={f.file.name} error={f.error ?? ''} />
          ))}
        </Box>
      )}
    </Box>
  );
};
