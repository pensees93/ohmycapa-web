import React, { useState, useRef } from 'react';
import {
  Box, Paper, Typography, Chip, IconButton, LinearProgress, Tooltip, Alert, Collapse as MuiCollapse, Button,
  useTheme,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BugReportIcon from '@mui/icons-material/BugReport';
import { buildParseErrorIssueReport, type DeviceState } from '@ohmycapa/capa-core';
import { DEVICE_COLOR, STATUS_COLOR, getWorkbenchSurface } from '../constants/statusMeta';
import { extractFilesFromDataTransfer } from '../utils/fileDropUtils';

// ─── Parse error alert ───────────────────────────────────────────────────────

const FORMAT_HINT = 'Please use original MTK / SLSI / QUALCOMM OTA logs (.txt/.log) or CommonCapaJson v2.0 (.json).';

function isUnknownFormatError(error: string): boolean {
  return (
    error.includes('Unknown format') ||
    error.includes('Format not detected') ||
    error.includes('Unrecognized UE capability format') ||
    error.includes('Non-OTA capability summary')
  );
}

function ParseErrorAlert({
  fileName,
  error,
  onOpenUrl,
}: {
  fileName: string;
  error: string;
  onOpenUrl?: (url: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reportState, setReportState] = useState<'idle' | 'opened' | 'copy_required'>('idle');
  const isFormatError = isUnknownFormatError(error);

  const handleReportIssue = () => {
    const report = buildParseErrorIssueReport(fileName, error);
    navigator.clipboard?.writeText(report.markdownBody).catch(() => {});
    setReportState(report.requiresCopy ? 'copy_required' : 'opened');
    setTimeout(() => setReportState('idle'), 3500);
    if (onOpenUrl) {
      onOpenUrl(report.issueUrl);
    } else if (typeof window !== 'undefined') {
      window.open(report.issueUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Alert
      severity="error"
      icon={<ErrorIcon sx={{ fontSize: 16, mt: 0.1 }} />}
      sx={{
        mt: 0.75,
        py: 0.5,
        px: 1,
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="Open pre-filled GitHub Issue to request support for this log format (details copied)" placement="top" arrow>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<BugReportIcon sx={{ fontSize: 12 }} />}
              onClick={handleReportIssue}
              sx={{
                height: 20,
                px: 0.75,
                fontSize: '0.6rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 1,
                minWidth: 0,
              }}
            >
              {reportState === 'copy_required'
                ? 'Body copied — paste in GitHub'
                : reportState === 'opened'
                  ? 'Opening GitHub…'
                  : 'Report to GitHub'}
            </Button>
          </Tooltip>
          <IconButton
            size="small"
            onClick={() => setExpanded(v => !v)}
            sx={{ flexShrink: 0, p: 0.25, opacity: 0.7 }}
            title="View details"
          >
            {expanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        </Box>
      </Box>
      <MuiCollapse in={expanded}>
        <Box
          component="pre"
          sx={{
            mt: 0.5,
            p: 0.75,
            borderRadius: 0.5,
            bgcolor: 'rgba(0,0,0,0.1)',
            fontSize: '0.6rem',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: 80,
            overflowY: 'auto',
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
  nr: 'NR',
  eutra: 'LTE',
  'eutra-nr': 'MRDC',
  utra: 'UTRA',
};

const getDisplayName = (fileName: string): string =>
  /^clipboard_\d+\.txt$/.test(fileName) ? 'Clipboard' : fileName;

const getSideColor = (side: 'A' | 'B'): string =>
  side === 'A' ? DEVICE_COLOR.deviceA : DEVICE_COLOR.deviceB;

const getSideColorLight = (side: 'A' | 'B'): string =>
  side === 'A' ? 'rgba(33,150,243,0.08)' : 'rgba(20,184,166,0.08)';

export interface CapaDropzoneProps {
  side: 'A' | 'B';
  device: DeviceState;
  onFilesDrop: (files: File[]) => void;
  onRemoveFile: (name: string) => void;
  onClear: () => void;
  onOpenUrl?: (url: string) => void;
  compact?: boolean;
}

export const CapaDropzone: React.FC<CapaDropzoneProps> = ({
  side, device, onFilesDrop, onRemoveFile, onClear, onOpenUrl, compact = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const surface = getWorkbenchSurface(isDark);
  const [isDragActive, setIsDragActive] = useState(false);
  const lastPastedRef = useRef<{ text: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragActive) setIsDragActive(true); };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    // Tauri handles file drops natively via onDragDropEvent in CapaComparePage
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) return;

    const files = await extractFilesFromDataTransfer(e.dataTransfer);
    if (files.length > 0) onFilesDrop(files);
  };

  const openFileBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length > 0) onFilesDrop(files);
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
  const sideColor = getSideColor(side);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: compact ? 0.75 : 1, minWidth: 0 }}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.log,.json"
        style={{ display: 'none' }}
        aria-label={`Upload Device ${side} CAPA files`}
        data-testid={`capa-file-input-${side.toLowerCase()}`}
        onChange={handleFileInputChange}
      />
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
        <Box
          sx={{
            px: 0.65,
            py: 0.1,
            borderRadius: 1,
            bgcolor: `${sideColor}18`,
            border: `1px solid ${sideColor}44`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: sideColor,
              fontSize: '0.68rem',
            }}
          >
            Device {side}
          </Typography>
        </Box>
        {vendor && vendor !== 'UNKNOWN' && (
          <Chip
            label={vendor}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.64rem',
              fontWeight: 700,
              bgcolor: vendorColor ? `${vendorColor}20` : undefined,
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
              height: 16,
              fontSize: '0.58rem',
              fontWeight: 600,
              bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
            }}
          />
        ))}
        {device.files.length > 0 && (
          <Tooltip title="Clear device">
            <IconButton size="small" onClick={onClear} sx={{ ml: 'auto', p: 0.25 }} aria-label={`Clear Device ${side}`}>
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
          px: 1.5,
          py: 0,
          height: compact ? 42 : 52,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          bgcolor: isDragActive ? getSideColorLight(side) : surface.subtleBg,
          borderColor: isDragActive ? sideColor : surface.borderStrong,
          borderStyle: 'dashed',
          borderWidth: 1,
          borderRadius: 1.5,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          '&:hover': { borderColor: sideColor, bgcolor: getSideColorLight(side) },
        }}
      >
        <CloudUploadIcon
          sx={{
            fontSize: 16,
            color: isDragActive ? sideColor : 'text.disabled',
            transition: 'color 0.15s',
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', textAlign: 'center' }}>
          Drop files or click to paste ·{' '}
          <Typography
            component="span"
            onClick={e => { e.stopPropagation(); openFileBrowse(); }}
            sx={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: sideColor,
              textDecoration: 'underline',
              cursor: 'pointer',
              '&:hover': { opacity: 0.85 },
            }}
          >
            Browse
          </Typography>
        </Typography>
      </Paper>

      {device.isProcessing && <LinearProgress sx={{ borderRadius: 1 }} />}

      {/* File chip list */}
      {device.files.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: device.files.some(f => f.error) ? 0.75 : 0 }}>
            {device.files.map(pf => (
              <Tooltip
                key={pf.file.name}
                title={pf.error ? `❌ ${pf.error}` : pf.status === 'parsing' ? 'Parsing...' : '✓ Done'}
                placement="top"
              >
                <Chip
                  label={getDisplayName(pf.file.name)}
                  size="small"
                  icon={
                    pf.status === 'parsing' ? <HourglassEmptyIcon sx={{ fontSize: '0.75rem !important' }} /> :
                      pf.status === 'error' ? <ErrorIcon sx={{ fontSize: '0.75rem !important', color: `${STATUS_COLOR.red} !important` }} /> :
                        <CheckCircleIcon sx={{ fontSize: '0.75rem !important', color: `${STATUS_COLOR.green} !important` }} />
                  }
                  onDelete={() => onRemoveFile(pf.file.name)}
                  deleteIcon={<CloseIcon sx={{ fontSize: '0.75rem !important' }} />}
                  sx={{
                    height: 22,
                    fontSize: '0.68rem',
                    maxWidth: 240,
                    bgcolor: pf.status === 'error'
                      ? 'rgba(239,68,68,0.08)'
                      : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'),
                  }}
                />
              </Tooltip>
            ))}
          </Box>
          {device.files.filter(f => f.error).map(f => (
            <ParseErrorAlert key={f.file.name} fileName={f.file.name} error={f.error ?? ''} onOpenUrl={onOpenUrl} />
          ))}
        </Box>
      )}
    </Box>
  );
};
