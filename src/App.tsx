import React, { useState, useRef, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import {
  CapaComparePage,
  CapaCompareProvider,
  useCapaCompare,
  exportSessionSnapshot,
  isCapaSessionSnapshot,
} from '@ohmycapa/capa-ui';
import { ThemeContextProvider } from './contexts/ThemeContext';
import { WebNavbar } from './components/WebNavbar';
import { PasteLogDialog } from './components/PasteLogDialog';
import { SAMPLE_DEVICE_A, SAMPLE_DEVICE_B } from './data/sampleCapaData';

const WebCompareWorkspace: React.FC = () => {
  const {
    deviceA,
    deviceB,
    addFiles,
    setDeviceName,
    clearAll,
    loadDevices,
  } = useCapaCompare();

  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteDefaultSide, setPasteDefaultSide] = useState<'a' | 'b'>('a');
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'info' | 'error' } | null>(null);
  const sessionInputRef = useRef<HTMLInputElement | null>(null);

  const hasAnyDevice = deviceA.files.length > 0 || deviceB.files.length > 0;
  const canSaveSession = Boolean(deviceA.normalized && deviceB.normalized);

  const handleLoadSample = useCallback(() => {
    loadDevices(SAMPLE_DEVICE_A, SAMPLE_DEVICE_B);
    setToast({ message: 'Loaded sample comparison: SM-S928N (QCOM) vs SM-S926N (SLSI)', severity: 'success' });
  }, [loadDevices]);

  const handleSaveSession = useCallback(() => {
    if (!deviceA.normalized || !deviceB.normalized) return;
    exportSessionSnapshot(deviceA.normalized, deviceB.normalized);
    setToast({ message: 'Saved .capa-session.json comparison snapshot', severity: 'success' });
  }, [deviceA.normalized, deviceB.normalized]);

  const handleOpenSessionPicker = useCallback(() => {
    sessionInputRef.current?.click();
  }, []);

  const handleSessionFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;
        if (!isCapaSessionSnapshot(parsed)) {
          setToast({ message: 'Invalid session file: expected ohmycapa-session-v1 JSON.', severity: 'error' });
          return;
        }
        loadDevices(parsed.deviceA, parsed.deviceB);
        setToast({ message: `Restored session from ${file.name}`, severity: 'success' });
      } catch {
        setToast({ message: 'Failed to read session JSON file.', severity: 'error' });
      }
    },
    [loadDevices]
  );

  const handlePasteSubmit = useCallback(
    async (side: 'a' | 'b', rawText: string, customName?: string) => {
      const trimmed = rawText.trim();
      const isJson = trimmed.startsWith('{');
      const fileName = `pasted_${side}_${Date.now()}.${isJson ? 'json' : 'txt'}`;
      if (customName) {
        setDeviceName(side, customName);
      }
      const file = new File([trimmed], fileName, {
        type: isJson ? 'application/json' : 'text/plain',
      });
      await addFiles(side, [file]);
      setToast({ message: `Parsed pasted text into Device ${side.toUpperCase()}`, severity: 'info' });
    },
    [addFiles, setDeviceName]
  );

  // Global Ctrl+V paste handler when focus is outside input controls
  useEffect(() => {
    const onGlobalPaste = (e: ClipboardEvent) => {
      if (pasteDialogOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const text = e.clipboardData?.getData('text')?.trim();
      if (!text) return;
      e.preventDefault();
      const targetSide: 'a' | 'b' = deviceA.files.length === 0 ? 'a' : 'b';
      void handlePasteSubmit(targetSide, text);
    };

    window.addEventListener('paste', onGlobalPaste);
    return () => window.removeEventListener('paste', onGlobalPaste);
  }, [pasteDialogOpen, deviceA.files.length, handlePasteSubmit]);

  const openPasteModal = useCallback(() => {
    setPasteDefaultSide(deviceA.files.length === 0 ? 'a' : 'b');
    setPasteDialogOpen(true);
  }, [deviceA.files.length]);

  const emptyStateExtra = (
    <>
      <Button
        size="small"
        variant="contained"
        disableElevation
        startIcon={<AutoAwesomeIcon sx={{ fontSize: 15 }} />}
        onClick={handleLoadSample}
        sx={{ textTransform: 'none', fontSize: '0.76rem', fontWeight: 600, borderRadius: 1.5 }}
      >
        Try Demo Sample (A vs B)
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={<ContentPasteIcon sx={{ fontSize: 15 }} />}
        onClick={openPasteModal}
        sx={{ textTransform: 'none', fontSize: '0.76rem', borderRadius: 1.5 }}
      >
        Paste Raw Log (or Ctrl+V)
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={<FolderOpenIcon sx={{ fontSize: 15 }} />}
        onClick={handleOpenSessionPicker}
        sx={{ textTransform: 'none', fontSize: '0.76rem', borderRadius: 1.5 }}
      >
        Open Session (.json)
      </Button>
    </>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <WebNavbar
        hasAnyDevice={hasAnyDevice}
        canSaveSession={canSaveSession}
        onLoadSample={handleLoadSample}
        onOpenPaste={openPasteModal}
        onSaveSession={handleSaveSession}
        onOpenSessionPicker={handleOpenSessionPicker}
        onReset={clearAll}
      />

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <CapaComparePage
          onOpenUrl={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
          emptyStateExtra={emptyStateExtra}
        />
      </Box>

      <input
        ref={sessionInputRef}
        type="file"
        accept=".json,.capa-session.json"
        style={{ display: 'none' }}
        onChange={e => void handleSessionFileChange(e)}
      />

      <PasteLogDialog
        open={pasteDialogOpen}
        defaultSide={pasteDefaultSide}
        onClose={() => setPasteDialogOpen(false)}
        onSubmit={(side, text, name) => void handlePasteSubmit(side, text, name)}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ fontSize: '0.76rem' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

export function App() {
  return (
    <ThemeContextProvider>
      <CapaCompareProvider>
        <CssBaseline />
        <WebCompareWorkspace />
      </CapaCompareProvider>
    </ThemeContextProvider>
  );
}

export default App;
