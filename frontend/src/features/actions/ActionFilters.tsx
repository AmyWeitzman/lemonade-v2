/**
 * ActionFilters — collapsible filter panel for the actions catalog.
 */
import {
  Box, Paper, Typography, Stack, FormControlLabel, Switch,
  Select, MenuItem, FormControl, InputLabel, TextField,
  Button, Collapse, IconButton, Divider,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useState } from 'react';
import type { ActionFilters as Filters } from '../actions/actionsSlice';

const CATEGORIES = [
  'fitness', 'social', 'education', 'creative', 'travel',
  'family', 'volunteer', 'finance', 'wellness', 'career',
];

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'lemons_per_tb', label: '🍋 Lemons / Time Block' },
  { value: 'lemons_per_dollar', label: '🍋 Lemons / Dollar' },
  { value: 'cost_per_tb', label: '💰 Cost / Time Block' },
  { value: 'min_cost', label: '💰 Lowest Cost' },
];

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
    !filters.eligibleOnly, // non-default
    filters.goodDeed,
    filters.seniorDiscount,
    filters.ptoRequired,
    filters.favoritesOnly,
    filters.sort,
  ].filter(Boolean).length;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
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
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
              gap: 2,
              mb: 2,
            }}
          >
            {/* Category */}
            <FormControl size="small" fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category}
                label="Category"
                onChange={(e) => onChange({ category: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                {CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Sort */}
            <FormControl size="small" fullWidth>
              <InputLabel>Sort by</InputLabel>
              <Select
                value={filters.sort}
                label="Sort by"
                onChange={(e) => onChange({ sort: e.target.value as Filters['sort'] })}
              >
                {SORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
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

            {/* Health impact */}
            <FormControl size="small" fullWidth>
              <InputLabel>Health Impact</InputLabel>
              <Select
                value={filters.healthImpact}
                label="Health Impact"
                onChange={(e) => onChange({ healthImpact: e.target.value as Filters['healthImpact'] })}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="positive">❤️ Positive</MenuItem>
                <MenuItem value="negative">💔 Negative</MenuItem>
                <MenuItem value="neutral">➖ Neutral</MenuItem>
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
                <MenuItem value="positive">😌 Reduces Stress</MenuItem>
                <MenuItem value="negative">😰 Increases Stress</MenuItem>
                <MenuItem value="neutral">➖ Neutral</MenuItem>
              </Select>
            </FormControl>
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

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
            <Button size="small" startIcon={<RestartAltIcon />} onClick={onReset}>
              Reset all
            </Button>
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}
