import React from 'react';
import { Box, Chip, Divider, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export interface BandEntry {
  ratType: 'nr' | 'eutra';
  band: number;
}

interface BandFilterChipsProps {
  allBands: BandEntry[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  onClear: () => void;
}

export const BandFilterChips: React.FC<BandFilterChipsProps> = ({ allBands, selected, onToggle, onClear }) => {
  if (allBands.length === 0) return null;

  const eutraBands = allBands.filter(b => b.ratType === 'eutra');
  const nrBands = allBands.filter(b => b.ratType === 'nr');
  const hasBothRats = eutraBands.length > 0 && nrBands.length > 0;

  const renderChip = ({ ratType, band }: BandEntry) => {
    const key = `${ratType}:${band}`;
    const isSelected = selected.has(key);
    const label = ratType === 'nr' ? `n${band}` : `B${band}`;
    const color = ratType === 'nr' ? '#00897B' : '#1976D2';
    return (
      <Chip
        key={key}
        label={label}
        size="small"
        onClick={() => onToggle(key)}
        sx={{
          height: 20,
          fontSize: '0.65rem',
          fontWeight: isSelected ? 700 : 400,
          fontFamily: 'monospace',
          flexShrink: 0,
          cursor: 'pointer',
          border: '1px solid',
          bgcolor: isSelected ? `${color}18` : 'transparent',
          borderColor: isSelected ? color : 'divider',
          color: isSelected ? color : 'text.secondary',
          '&:hover': { borderColor: color, color, bgcolor: `${color}10` },
        }}
      />
    );
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap', overflowX: 'auto', pb: 0.25, minWidth: 0 }}>
      {hasBothRats ? (
        <>
          <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 700, fontFamily: 'monospace', color: '#1976D2', flexShrink: 0, mr: 0.25 }}>
            LTE:
          </Typography>
          {eutraBands.map(renderChip)}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.25 }} />
          <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 700, fontFamily: 'monospace', color: '#00897B', flexShrink: 0, mr: 0.25 }}>
            NR:
          </Typography>
          {nrBands.map(renderChip)}
        </>
      ) : (
        allBands.map(renderChip)
      )}
      {selected.size > 0 && (
        <IconButton size="small" onClick={onClear} sx={{ p: 0.25, ml: 0.25, flexShrink: 0 }}>
          <CloseIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
        </IconButton>
      )}
    </Box>
  );
};
