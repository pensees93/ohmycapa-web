import React, { useState, useMemo, useDeferredValue, useContext, createContext } from 'react';
import type { FeatureLeaf } from '@ohmycapa/capa-core';

const OpenUrlContext = createContext<((url: string) => void) | undefined>(undefined);
import {
  Box, Typography, Chip, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton,
  Accordion, AccordionSummary, AccordionDetails,
  Tooltip, useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { FeatureDiff, RatFeaturesDiff } from '@ohmycapa/capa-core';

// ─── Filter types ─────────────────────────────────────────────────────────────

type FilterMode = 'all' | 'diff' | 'a-only' | 'b-only';

// ─── Value display ────────────────────────────────────────────────────────────

function formatValue(v: FeatureDiff['a'], kind: FeatureDiff['kind']): string {
  if (v === undefined || v === null) return '—';
  if (kind === 'bool' || kind === 'fgiBit' || kind === 'presence') {
    return v ? '✓' : '✗';
  }
  if ((kind === 'stringList' || kind === 'numberList') && Array.isArray(v)) {
    return v.length === 0 ? '(none)' : v.join(', ');
  }
  return String(v);
}

function valueColor(v: FeatureDiff['a'], kind: FeatureDiff['kind'], isDark: boolean): string {
  if (v === undefined) return isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
  if (kind === 'bool' || kind === 'fgiBit' || kind === 'presence') {
    return v ? '#10b981' : '#ef4444';
  }
  return 'inherit';
}

// ─── Single feature diff row ──────────────────────────────────────────────────

interface FeatureRowProps {
  diff: FeatureDiff;
  isDark: boolean;
}

const FeatureRow = React.memo<FeatureRowProps>(({ diff, isDark }) => {
  const openUrl = useContext(OpenUrlContext);
  const { leaf, kind, status, a, b, description, stringListDiff } = diff;

  const rowBg = useMemo(() => {
    if (status === 'same') return 'transparent';
    if (status === 'different') return isDark ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.07)';
    if (status === 'a-only') return isDark ? 'rgba(99,102,241,0.09)' : 'rgba(99,102,241,0.07)';
    if (status === 'b-only') return isDark ? 'rgba(99,102,241,0.09)' : 'rgba(99,102,241,0.07)';
    return 'transparent';
  }, [status, isDark]);

  const statusChip = useMemo(() => {
    if (status === 'same') return null;
    const cfg: Record<string, { label: string; color: string }> = {
      'different': { label: 'Diff',   color: '#f59e0b' },
      'a-only':    { label: 'A only', color: '#6366f1' },
      'b-only':    { label: 'B only', color: '#6366f1' },
    };
    const c = cfg[status];
    if (!c) return null;
    return (
      <Chip
        label={c.label}
        size="small"
        sx={{ height: 15, fontSize: '0.6rem', fontWeight: 600, color: c.color, bgcolor: `${c.color}22`, ml: 0.5 }}
      />
    );
  }, [status]);

  const valueSx = (side: 'a' | 'b') => {
    const v = side === 'a' ? a : b;
    const absent = side === 'a' ? status === 'b-only' : status === 'a-only';
    return {
      fontSize: '0.75rem',
      fontFamily: 'monospace',
      fontWeight: absent ? 400 : 600,
      color: absent
        ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')
        : status === (side === 'a' ? 'a-only' : 'b-only')
          ? '#6366f1'
          : valueColor(v, kind, isDark),
    };
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        minHeight: 32,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: rowBg,
        alignItems: 'center',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      {/* Leaf name */}
      <Box sx={{ px: 1.5, py: 0.4, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.primary', lineHeight: 1.3 }}>
          {leaf}
        </Typography>
        {description && (
          <>
            <Tooltip title={description} placement="top" arrow>
              <InfoOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled', cursor: 'default', flexShrink: 0 }} />
            </Tooltip>
            <Tooltip title={`Search: ${description}`} placement="top" arrow>
              <OpenInNewIcon
                sx={{ fontSize: 12, color: 'primary.main', cursor: 'pointer', flexShrink: 0, opacity: 0.7, '&:hover': { opacity: 1 } }}
                onClick={() => {
                  const query = encodeURIComponent(description);
                  openUrl?.(`https://www.google.com/search?q=${query}`);
                }}
              />
            </Tooltip>
          </>
        )}
        {statusChip}
      </Box>

      {/* A value */}
      <Box sx={{ px: 1.5, py: 0.4, borderLeft: '1px solid', borderColor: 'divider' }}>
        {(kind === 'stringList' || kind === 'numberList') && stringListDiff ? (
          <StringListCell slDiff={stringListDiff} side="a" isDark={isDark} />
        ) : (
          <Typography sx={valueSx('a')}>
            {status === 'b-only' ? '—' : formatValue(a, kind)}
          </Typography>
        )}
      </Box>

      {/* B value */}
      <Box sx={{ px: 1.5, py: 0.4, borderLeft: '1px solid', borderColor: 'divider' }}>
        {(kind === 'stringList' || kind === 'numberList') && stringListDiff ? (
          <StringListCell slDiff={stringListDiff} side="b" isDark={isDark} />
        ) : (
          <Typography sx={valueSx('b')}>
            {status === 'a-only' ? '—' : formatValue(b, kind)}
          </Typography>
        )}
      </Box>
    </Box>
  );
});

// ─── StringList diff cell ────────────────────────────────────────────────────

interface StringListCellProps {
  slDiff: NonNullable<FeatureDiff['stringListDiff']>;
  side: 'a' | 'b';
  isDark: boolean;
}

const StringListCell = React.memo<StringListCellProps>(({ slDiff, side, isDark }) => {
  const unique = side === 'a' ? slDiff.onlyInA : slDiff.onlyInB;
  const common = slDiff.common;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
      {common.map(v => (
        <Chip key={v} label={v} size="small"
          sx={{ height: 16, fontSize: '0.65rem', bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: 'text.secondary' }} />
      ))}
      {unique.map(v => (
        <Chip key={v} label={v} size="small"
          sx={{ height: 16, fontSize: '0.65rem', bgcolor: 'rgba(99,102,241,0.15)', color: '#6366f1', fontWeight: 600 }} />
      ))}
      {common.length === 0 && unique.length === 0 && (
        <Typography sx={{ fontSize: '0.8rem', opacity: 0.35 }}>—</Typography>
      )}
    </Box>
  );
});

// ─── Middle-level sub-section ────────────────────────────────────────────────

interface MiddleSectionProps {
  middle: string;
  diffs: FeatureDiff[];
  isDark: boolean;
}

const MiddleSection = React.memo<MiddleSectionProps>(({ middle, diffs, isDark }) => {
  const diffCount = diffs.filter(d => d.status !== 'same').length;

  return (
    <Box sx={{ mb: 0.5 }}>
      <Box
        sx={{
          px: 1.5, py: 0.5,
          bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex', alignItems: 'center', gap: 0.75,
        }}
      >
        <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {middle}
        </Typography>
        {diffCount > 0 && (
          <Chip label={diffCount} size="small"
            sx={{ height: 15, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }} />
        )}
      </Box>
      {diffs.map((d, i) => (
        <FeatureRow key={i} diff={d} isDark={isDark} />
      ))}
    </Box>
  );
});

// ─── Major-level accordion ───────────────────────────────────────────────────

interface MajorAccordionProps {
  major: string;
  diffs: FeatureDiff[];
  isDark: boolean;
  expanded: boolean;
}

const MajorAccordion = React.memo<MajorAccordionProps>(({
  major, diffs, isDark, expanded,
}) => {
  const FGI_MIDDLE_ORDER_LOCAL = ['FGI-Rel9', 'FGI-Rel9-Add', 'FGI-Rel10'];
  const diffCount = diffs.filter(d => d.status !== 'same').length;
  const middles = useMemo(() => {
    const map = new Map<string, FeatureDiff[]>();
    for (const d of diffs) {
      const arr = map.get(d.middle) ?? [];
      arr.push(d);
      map.set(d.middle, arr);
    }
    if (major === 'FeatureGroupIndicators') {
      const sorted = new Map<string, FeatureDiff[]>();
      for (const key of FGI_MIDDLE_ORDER_LOCAL) {
        if (map.has(key)) sorted.set(key, map.get(key)!);
      }
      for (const [key, val] of map.entries()) {
        if (!sorted.has(key)) sorted.set(key, val);
      }
      return sorted;
    }
    return map;
  }, [diffs, major]);

  const [localExpanded, setLocalExpanded] = useState(expanded);

  // Sync with parent's expanded prop (for filter changes)
  React.useEffect(() => {
    setLocalExpanded(expanded);
  }, [expanded]);

  return (
    <Accordion
      expanded={localExpanded}
      onChange={() => setLocalExpanded(!localExpanded)}
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '6px !important',
        mb: 0.75,
        overflow: 'hidden',
        '&:before': { display: 'none' },
        '& .MuiAccordionSummary-root': { minHeight: 32, px: 1.5 },
        '& .MuiAccordionSummary-content': { my: 0.5 },
        '& .MuiAccordionDetails-root': { p: 0 },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary' }}>
            {major}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
            ({diffs.length} items)
          </Typography>
          {diffCount > 0 && (
            <Chip label={`${diffCount} diff`} size="small"
              sx={{ height: 16, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }} />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {/* Column header */}
        <Box sx={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
          borderBottom: '1px solid', borderColor: 'divider',
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        }}>
          <Typography sx={{ px: 1.5, py: 0.5, fontSize: '0.68rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Feature</Typography>
          <Typography sx={{ px: 1.5, py: 0.5, fontSize: '0.68rem', fontWeight: 700, color: '#2196F3', textTransform: 'uppercase', borderLeft: '1px solid', borderColor: 'divider' }}>A</Typography>
          <Typography sx={{ px: 1.5, py: 0.5, fontSize: '0.68rem', fontWeight: 700, color: '#4DB6AC', textTransform: 'uppercase', borderLeft: '1px solid', borderColor: 'divider' }}>B</Typography>
        </Box>
        {Array.from(middles.entries()).map(([middle, mDiffs]) => (
          <MiddleSection
            key={middle}
            middle={middle}
            diffs={mDiffs}
            isDark={isDark}
          />
        ))}
      </AccordionDetails>
    </Accordion>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────

export interface FeaturesCompareViewProps {
  featuresDiff: RatFeaturesDiff;
  deviceAName?: string;
  deviceBName?: string;
  onOpenUrl?: (url: string) => void;
}

const FeaturesCompareViewInner = React.memo<FeaturesCompareViewProps>(({
  featuresDiff,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { counts } = featuresDiff;
  const totalDiff = counts.different + counts.aOnly + counts.bOnly;

  const [userFilter, setUserFilter] = useState<FilterMode | null>(null);
  const filter: FilterMode = userFilter ?? (totalDiff > 0 ? 'diff' : 'all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    let diffs = featuresDiff.diffs;
    if (filter === 'diff') diffs = diffs.filter(d => d.status !== 'same');
    else if (filter === 'a-only') diffs = diffs.filter(d => d.status === 'a-only');
    else if (filter === 'b-only') diffs = diffs.filter(d => d.status === 'b-only');

    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      diffs = diffs.filter(d =>
        d.leaf.toLowerCase().includes(q) ||
        d.major.toLowerCase().includes(q) ||
        d.middle.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q)
      );
    }
    return diffs;
  }, [featuresDiff.diffs, filter, deferredSearch]);

  const byMajor = useMemo(() => {
    const map = new Map<string, FeatureDiff[]>();
    for (const d of filtered) {
      const arr = map.get(d.major) ?? [];
      arr.push(d);
      map.set(d.major, arr);
    }
    return map;
  }, [filtered]);

  return (
    <Box>
      {/* Sticky Unified 1-line Filter + Search + Summary Toolbar */}
      <Box sx={{
        position: 'sticky',
        top: -12,
        zIndex: 5,
        pt: 1.5,
        pb: 0.75,
        mx: -1.5,
        px: 1.5,
        mb: 1.25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        flexWrap: 'wrap',
        bgcolor: isDark ? 'rgba(24,24,27,0.92)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filter}
            onChange={(_, v) => { if (v) setUserFilter(v); }}
            sx={{ '& .MuiToggleButton-root': { py: 0.2, px: 0.85, fontSize: '0.64rem', textTransform: 'none', minHeight: 24 } }}
          >
            <ToggleButton value="diff">Diff ({totalDiff})</ToggleButton>
            <ToggleButton value="a-only">A-only ({counts.aOnly})</ToggleButton>
            <ToggleButton value="b-only">B-only ({counts.bOnly})</ToggleButton>
            <ToggleButton value="all">All ({featuresDiff.diffs.length})</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            size="small"
            placeholder="Search features..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14 }} /></InputAdornment>,
                sx: { fontSize: '0.72rem', height: 26 }
              }
            }}
            sx={{ width: 200 }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip label={`${counts.same} exact`} size="small"
            sx={{ height: 17, fontSize: '0.6rem', bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981' }} />
          {counts.different > 0 && (
            <Chip label={`${counts.different} diff`} size="small"
              sx={{ height: 17, fontSize: '0.6rem', bgcolor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }} />
          )}
          {counts.aOnly > 0 && (
            <Chip label={`${counts.aOnly} A-only`} size="small"
              sx={{ height: 17, fontSize: '0.6rem', bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444' }} />
          )}
          {counts.bOnly > 0 && (
            <Chip label={`${counts.bOnly} B-only`} size="small"
              sx={{ height: 17, fontSize: '0.6rem', bgcolor: 'rgba(99,102,241,0.1)', color: '#6366f1' }} />
          )}
          {totalDiff === 0 && (
            <Typography sx={{ fontSize: '0.64rem', color: '#10b981', fontWeight: 600 }}>All match</Typography>
          )}
        </Box>
      </Box>

      {/* Accordion list */}
      {byMajor.size === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
          <Typography variant="body2">No features match the current filter</Typography>
        </Box>
      ) : (
        Array.from(byMajor.entries()).map(([major, diffs], idx) => (
          <MajorAccordion
            key={major}
            major={major}
            diffs={diffs}
            isDark={isDark}
            expanded={filter !== 'all' || idx === 0}
          />
        ))
      )}
    </Box>
  );
});

export const FeaturesCompareView = React.memo<FeaturesCompareViewProps>((props) => (
  <OpenUrlContext.Provider value={props.onOpenUrl}>
    <FeaturesCompareViewInner {...props} />
  </OpenUrlContext.Provider>
));

// ─── Single device features view ─────────────────────────────────────────────

interface SingleFeatureRowProps {
  leaf: FeatureLeaf;
}

const SingleFeatureRow = React.memo<SingleFeatureRowProps>(({ leaf: l }) => {
  const openUrl = useContext(OpenUrlContext);
  const isBool = l.kind === 'bool' || l.kind === 'fgiBit' || l.kind === 'presence';
  const displayVal = (l.kind === 'stringList' || l.kind === 'numberList') && Array.isArray(l.value)
    ? (l.value.length === 0 ? '(none)' : l.value.join(', '))
    : isBool ? (l.value ? '✓' : '✗') : String(l.value ?? '—');
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: '2fr 1fr',
      minHeight: 32, borderBottom: '1px solid', borderColor: 'divider',
      alignItems: 'center', '&:last-child': { borderBottom: 'none' },
    }}>
      <Box sx={{ px: 1.5, py: 0.4, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.primary' }}>{l.leaf}</Typography>
        {l.description && (
          <>
            <Tooltip title={l.description} placement="top" arrow>
              <InfoOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
            </Tooltip>
            <Tooltip title={`Search: ${l.description}`} placement="top" arrow>
              <OpenInNewIcon
                sx={{ fontSize: 12, color: 'primary.main', cursor: 'pointer', opacity: 0.7, '&:hover': { opacity: 1 } }}
                onClick={() => {
                  const query = encodeURIComponent(l.description!);
                  openUrl?.(`https://www.google.com/search?q=${query}`);
                }}
              />
            </Tooltip>
          </>
        )}
      </Box>
      <Box sx={{ px: 1.5, py: 0.4, borderLeft: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{
          fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 600,
          color: isBool ? (l.value ? '#10b981' : '#ef4444') : 'text.primary',
        }}>
          {displayVal}
        </Typography>
      </Box>
    </Box>
  );
});

export interface SingleDeviceFeaturesViewProps {
  leaves: FeatureLeaf[];
  onOpenUrl?: (url: string) => void;
}

export const SingleDeviceFeaturesView = React.memo<SingleDeviceFeaturesViewProps>(({ leaves, onOpenUrl }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    if (!deferredSearch.trim()) return leaves;
    const q = deferredSearch.toLowerCase();
    return leaves.filter(l =>
      l.leaf.toLowerCase().includes(q) ||
      l.major.toLowerCase().includes(q) ||
      l.middle.toLowerCase().includes(q) ||
      (l.description ?? '').toLowerCase().includes(q)
    );
  }, [leaves, deferredSearch]);

  const FGI_MIDDLE_ORDER = ['FGI-Rel9', 'FGI-Rel9-Add', 'FGI-Rel10'];

  const byMajor = useMemo(() => {
    const map = new Map<string, Map<string, typeof filtered>>();
    for (const l of filtered) {
      if (!map.has(l.major)) map.set(l.major, new Map());
      const midMap = map.get(l.major)!;
      if (!midMap.has(l.middle)) midMap.set(l.middle, []);
      midMap.get(l.middle)!.push(l);
    }
    // Ensure FGI middles appear in canonical order regardless of filter state
    for (const [major, midMap] of map.entries()) {
      if (major === 'FeatureGroupIndicators') {
        const sorted = new Map<string, typeof filtered>();
        for (const key of FGI_MIDDLE_ORDER) {
          if (midMap.has(key)) sorted.set(key, midMap.get(key)!);
        }
        for (const [key, val] of midMap.entries()) {
          if (!sorted.has(key)) sorted.set(key, val);
        }
        map.set(major, sorted);
      }
    }
    return map;
  }, [filtered]);

  return (
    <OpenUrlContext.Provider value={onOpenUrl}>
    <Box>
      {/* Sticky 1-line Search + Count Toolbar */}
      <Box sx={{
        position: 'sticky',
        top: -12,
        zIndex: 5,
        pt: 1.5,
        pb: 0.75,
        mx: -1.5,
        px: 1.5,
        mb: 1.25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        bgcolor: isDark ? 'rgba(24,24,27,0.92)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <TextField
          size="small"
          placeholder="Search features..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14 }} /></InputAdornment>,
              sx: { fontSize: '0.72rem', height: 26 }
            }
          }}
          sx={{ width: 200 }}
        />
        <Chip
          size="small"
          label={filtered.length < leaves.length ? `${filtered.length} / ${leaves.length} features` : `${leaves.length} features`}
          sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}
        />
      </Box>

      {Array.from(byMajor.entries()).map(([major, midMap], idx) => (
        <Accordion key={major} defaultExpanded={idx === 0} disableGutters elevation={0}
          sx={{
            border: '1px solid', borderColor: 'divider', borderRadius: '6px !important', mb: 0.75,
            overflow: 'hidden', '&:before': { display: 'none' },
            '& .MuiAccordionSummary-root': { minHeight: 32, px: 1.5 },
            '& .MuiAccordionSummary-content': { my: 0.5 },
            '& .MuiAccordionDetails-root': { p: 0 },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{major}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {Array.from(midMap.entries()).map(([middle, mLeaves]) => (
              <Box key={middle} sx={{ mb: 0.5 }}>
                <Box sx={{ px: 1.5, py: 0.5, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{middle}</Typography>
                </Box>
                {mLeaves.map((l, i) => (
                  <SingleFeatureRow key={i} leaf={l} />
                ))}
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {byMajor.size === 0 && (
        <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
          <Typography variant="body2">No features found</Typography>
        </Box>
      )}
    </Box>
    </OpenUrlContext.Provider>
  );
});
