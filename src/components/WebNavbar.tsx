import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import GitHubIcon from '@mui/icons-material/GitHub';
import ShareIcon from '@mui/icons-material/Share';
import { useThemeMode } from '../contexts/ThemeContext';

interface WebNavbarProps {
  hasAnyDevice: boolean;
  canSaveSession: boolean;
  onLoadSample: () => void;
  onOpenPaste: () => void;
  onSaveSession: () => void;
  onOpenSessionPicker: () => void;
  onReset: () => void;
}

export const WebNavbar: React.FC<WebNavbarProps> = ({
  hasAnyDevice,
  canSaveSession,
  onLoadSample,
  onOpenPaste,
  onSaveSession,
  onOpenSessionPicker,
  onReset,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { mode, toggleMode } = useThemeMode();
  const [sessionAnchor, setSessionAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box
      component="header"
      sx={{
        height: 44,
        flexShrink: 0,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: isDark ? 'rgba(18, 18, 22, 0.92)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(10px)',
        zIndex: 10,
      }}
    >
      {/* Left: Brand + Local Privacy Guarantee */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <CompareArrowsIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '0.88rem' }}>
          OhMyCAPA
        </Typography>
        <Chip
          label="Web"
          size="small"
          sx={{
            height: 18,
            fontSize: '0.62rem',
            fontWeight: 700,
            bgcolor: 'rgba(33, 150, 243, 0.14)',
            color: '#2196F3',
          }}
        />
        <Tooltip
          title="All OTA capability parsing, 3GPP normalization, comparison, and Excel report generation run 100% locally inside your browser memory. Zero files are uploaded to any server."
          arrow
          placement="bottom"
        >
          <Chip
            icon={<LockOutlinedIcon sx={{ fontSize: '12px !important', color: '#10b981 !important' }} />}
            label="100% Local · No Upload"
            size="small"
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              height: 20,
              fontSize: '0.65rem',
              fontWeight: 600,
              bgcolor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.28)',
              cursor: 'help',
            }}
          />
        </Tooltip>
      </Box>

      {/* Right: Web Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
          onClick={onLoadSample}
          sx={{ fontSize: '0.7rem', py: 0.25, px: 1, textTransform: 'none', borderRadius: 1.5, minHeight: 26 }}
        >
          Load Sample
        </Button>

        <Tooltip title="Paste raw OTA log text (or press Ctrl+V anywhere on the page)" arrow>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ContentPasteIcon sx={{ fontSize: 14 }} />}
            onClick={onOpenPaste}
            sx={{
              fontSize: '0.7rem',
              py: 0.25,
              px: 1,
              textTransform: 'none',
              borderRadius: 1.5,
              minHeight: 26,
              color: 'text.primary',
              borderColor: 'divider',
            }}
          >
            Paste Log
          </Button>
        </Tooltip>

        <Button
          size="small"
          variant="outlined"
          startIcon={<ShareIcon sx={{ fontSize: 14 }} />}
          endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 14 }} />}
          onClick={e => setSessionAnchor(e.currentTarget)}
          sx={{
            fontSize: '0.7rem',
            py: 0.25,
            px: 1,
            textTransform: 'none',
            borderRadius: 1.5,
            minHeight: 26,
            color: 'text.secondary',
            borderColor: 'divider',
          }}
        >
          Session
        </Button>

        <Menu
          anchorEl={sessionAnchor}
          open={Boolean(sessionAnchor)}
          onClose={() => setSessionAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { minWidth: 205, mt: 0.5 } } }}
        >
          <MenuItem
            dense
            disabled={!canSaveSession}
            onClick={() => {
              setSessionAnchor(null);
              onSaveSession();
            }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              <SaveAltIcon sx={{ fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText
              primary="Save Session (.json)"
              secondary={canSaveSession ? 'Export A & B comparison' : 'Load both A & B first'}
              slotProps={{
                primary: { sx: { fontSize: '0.75rem', fontWeight: 600 } },
                secondary: { sx: { fontSize: '0.65rem' } },
              }}
            />
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            dense
            onClick={() => {
              setSessionAnchor(null);
              onOpenSessionPicker();
            }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              <FolderOpenIcon sx={{ fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText
              primary="Open Session (.json)"
              secondary="Restore shared .capa-session.json"
              slotProps={{
                primary: { sx: { fontSize: '0.75rem', fontWeight: 600 } },
                secondary: { sx: { fontSize: '0.65rem' } },
              }}
            />
          </MenuItem>
        </Menu>

        {hasAnyDevice && (
          <Tooltip title="Reset All Devices" arrow>
            <IconButton size="small" onClick={onReset} sx={{ color: 'text.secondary', p: 0.5 }}>
              <RestartAltIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="View on GitHub" arrow>
          <IconButton
            size="small"
            component="a"
            href="https://github.com/pensees93/ohmycapa-web"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'text.secondary', p: 0.5 }}
          >
            <GitHubIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} arrow>
          <IconButton size="small" onClick={toggleMode} sx={{ color: 'text.secondary', p: 0.5 }}>
            {mode === 'dark' ? <LightModeIcon sx={{ fontSize: 17 }} /> : <DarkModeIcon sx={{ fontSize: 17 }} />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
