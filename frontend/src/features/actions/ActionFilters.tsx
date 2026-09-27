/**
 * ActionFilters — collapsible filter panel for the actions catalog.
 * Styled to match the Jobs page filter/sort layout.
 *
 * Category values sent to the backend are kebab-case slugs matching the DB.
 * Display labels are human-readable.
 */
import {
  Box, Paper, Typography, Stack, FormControlLabel, Switch,
  Select, MenuItem, FormControl, InputLabel, TextField,
  Collapse, IconButton, Divider,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useState } from 'react';
import type { ActionFilters as Filters } from '../actions/actionsSlice';

/**
 * Maps display label → DB slug.
 * Exported so ActionCard can reuse for human-readable chip labels.
 */
export const CATEGORY_LABEL_TO_SLUG: Record<string, string> = {
  'Mental Health':           'mental-health',
  'Physical Health':         'physical-health',
  'Social Connections':      'social-connections',
  'Family':                  'family',
  'Entertainment':           'entertainment',
  'Outdoors':                'outdoors',
  'Animals':                 'animals',
  'Education':               'education',
  'Schoolwork':              'schoolwork',
  'Career':                  'career',
  'Luxury':                  'luxury',
  'Home & Auto':             'home-auto',
  'Community':               'community',
  'Skill/Trait Development': 'skill-trait',
  'Other':                   'other',
};

export const CATEGORY_SLUG_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_LABEL_TO_SLUG).map(([label, slug]) => [slug, label]),
);

const CATEGORIES = Object.keys(CATEGORY_LABEL_TO_SLUG);

interface Props {
  filters: Filters;
  onChange: (partial: Partial<Filters>) => void;
  onReset: () => void;
}

export default function ActionFilters({ filters, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.category,
    filters.maxCost !== null,
    filters.maxTimeBlocks !== null,
    filters.healthImpact,
    filters.stressImpact,
    !filters.eligibleOnly,
    filters.goodDeed,
    filters.seniorDiscount,
    filters.ptoRequired,
    filters.favoritesOnly,
    filters.sort,
  ].filter(Boolean).length;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2, bgcolor: 'rgba(255,255,255,0.6)' }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.25, cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <FilterListIcon fontSize="small" color="action" />
          <Typography variant="body2" fontWeight={600}>
            Filter & Sort
          </Typography>
          {activeCount > 0 && (
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: '#fff',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 700,
              }}
            >
              {activeCount}
            </Box>
          )}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          {activeCount > 0 && (
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onReset(); }}
              aria-label="Reset filters"
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" aria-label={open ? 'Collapse filters' : 'Expand filters'}>
            {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Stack>
      </Stack>

      <Collapse in={open}>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'minmax(160px, 200px) 1fr 1fr 1fr' },
              gap: 2,
              mb: 2,
            }}
          >
            {/* Category — value is a slug matching the DB */}
            <FormControl size="small" fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category}
                label="Category"
                onChange={(e) => onChange({ category: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                {CATEGORIES.map((label) => (
                  <MenuItem key={label} value={CATEGORY_LABEL_TO_SLUG[label]}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Health impact */}
            <FormControl size="small" fullWidth>
              <InputLabel>Health Impact</InputLabel>
              <Select
                value={filters.healthImpact}
                label="Health Impact"
                onChange={(e) => onChange({ healthImpact: e.target.value as Filters['healthImpact'] })}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="neutral">➖ Does not decrease health</MenuItem>
                <MenuItem value="positive">❤️ Increases health</MenuItem>
              </Select>
            </FormControl>

            {/* Stress impact */}
            <FormControl size="small" fullWidth>
              <InputLabel>Stress Impact</InputLabel>
              <Select
                value={filters.stressImpact}
                label="Stress Impact"
                onChange={(e) => onChange({ stressImpact: e.target.value as Filters['stressImpact'] })}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="neutral">➖ Does not increase stress</MenuItem>
                <MenuItem value="positive">😌 Decreases stress</MenuItem>
              </Select>
            </FormControl>

            {/* Max cost */}
            <TextField
              size="small"
              label="Max Cost ($)"
              type="number"
              value={filters.maxCost ?? ''}
              onChange={(e) => onChange({ maxCost: e.target.value ? Number(e.target.value) : null })}
              inputProps={{ min: 0 }}
            />

            {/* Max time blocks */}
            <TextField
              size="small"
              label="Max Time Blocks"
              type="number"
              value={filters.maxTimeBlocks ?? ''}
              onChange={(e) => onChange({ maxTimeBlocks: e.target.value ? Number(e.target.value) : null })}
              inputProps={{ min: 1, max: 40 }}
            />
          </Box>

          {/* Toggle switches */}
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.eligibleOnly}
                  onChange={(e) => onChange({ eligibleOnly: e.target.checked })}
                />
              }
              label={<Typography variant="body2">Eligible only</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.favoritesOnly}
                  onChange={(e) => onChange({ favoritesOnly: e.target.checked })}
                />
              }
              label={<Typography variant="body2">❤️ Favorites</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.goodDeed}
                  onChange={(e) => onChange({ goodDeed: e.target.checked })}
                />
              }
              label={<Typography variant="body2">🤝 Good Deeds</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.seniorDiscount}
                  onChange={(e) => onChange({ seniorDiscount: e.target.checked })}
                />
              }
              label={<Typography variant="body2">👴 Senior Discount</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.ptoRequired}
                  onChange={(e) => onChange({ ptoRequired: e.target.checked })}
                />
              }
              label={<Typography variant="body2">🏖️ PTO Required</Typography>}
            />
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}
