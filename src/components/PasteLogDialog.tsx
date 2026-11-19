import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Box,
  Typography,
} from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';

interface PasteLogDialogProps {
  open: boolean;
  defaultSide?: 'a' | 'b';
  onClose: () => void;
  onSubmit: (side: 'a' | 'b', rawText: string, customName?: string) => void;
}

export const PasteLogDialog: React.FC<PasteLogDialogProps> = ({
  open,
  defaultSide = 'a',
  onClose,
  onSubmit,
}) => {
  const [side, setSide] = useState<'a' | 'b'>(defaultSide);
  const [deviceName, setDeviceName] = useState('');
  const [rawText, setRawText] = useState('');

  const handleEnter = () => {
    setSide(defaultSide);
    setDeviceName('');
    setRawText('');
  };

  const handleSubmit = () => {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    onSubmit(side, trimmed, deviceName.trim() || undefined);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ transition: { onEnter: handleEnter } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1, fontSize: '0.95rem', fontWeight: 700 }}>
        <ContentPasteIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        Paste Raw UE Capability Log
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            Target Side:
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={side}
            onChange={(_, v) => v && setSide(v)}
            sx={{ '& .MuiToggleButton-root': { py: 0.35, px: 1.5, fontSize: '0.75rem', textTransform: 'none' } }}
          >
            <ToggleButton value="a" sx={{ color: '#2196F3' }}>Device A</ToggleButton>
            <ToggleButton value="b" sx={{ color: '#4DB6AC' }}>Device B</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            size="small"
            placeholder="Optional Device Name (e.g. SM-S928N)"
            value={deviceName}
            onChange={e => setDeviceName(e.target.value)}
            sx={{ flex: 1, minWidth: 200, '& .MuiInputBase-input': { fontSize: '0.78rem', py: 0.6 } }}
          />
        </Box>

        <TextField
          multiline
          minRows={10}
          maxRows={18}
          fullWidth
          autoFocus
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder="Paste MTK / SLSI / Qualcomm UE-EUTRA-Capability or UE-NR-Capability log text, CommonCapaJson v2.0, or .capa-session.json here..."
          slotProps={{
            input: {
              sx: {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.75rem',
                lineHeight: 1.45,
              },
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} size="small" sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          disabled={!rawText.trim()}
          onClick={handleSubmit}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Parse & Load to Device {side.toUpperCase()}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
