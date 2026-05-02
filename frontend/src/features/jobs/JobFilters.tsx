/**
 * JobFilters — collapsible filter panel for the jobs catalog.
 * Requirements: Req 11, 2.1, 9.1
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
import type { JobFilters as Filters } from './types';
import { useSetupMode } from '../../contexts/SetupModeContext';

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'salary_desc', label: '💰 Highest Salary' },
  { value: 'salary_asc', label: '💰 Lowest Salary' },
  { value: 'stress_asc', label: '😌 Lowest Stress' },
  { value: 'time_blocks_asc', label: '⏱ Fewest Time Blocks' },
  { value: 'pto_desc', label: '🏖️ Most PTO' },
];

interface Props {
  filters: Filters;
  onChange: (partial: Partial<Filters>) => void;
  onReset: () => void;
  showBookmarkedOnly?: boolean;
  onBookmarkedOnlyChange?: (value: boolean) => void;
}

export default function JobFilters({ filters, onChange, onReset, showBookmarkedOnly, onBookmarkedOnlyChange }: Props) {
  const [open, setOpen] = useState(false);
  const { isSetupMode } = useSetupMode();

  const activeCount = [
    filters.minSalary !== null,
    filters.maxSalary !== null,
    filters.minPto !== null,
    filters.maxTimeBlocks !== null,
    filters.maxStress !== null,
    filters.location,
    filters.partTimeOnly,
    filters.fullTimeOnly,
    filters.seasonal !== null,
    filters.hasPension,
    !filters.eligibleOnly, // non-default
    filters.showAll,
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
            Filters & Sort
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

            {/* Location */}
            <FormControl size="small" fullWidth>
              <InputLabel>Location</InputLabel>
              <Select
                value={filters.location}
                label="Location"
                onChange={(e) => onChange({ location: e.target.value as Filters['location'] })}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="city">🏙️ City</MenuItem>
                <MenuItem value="suburb">🏡 Suburb</MenuItem>
                <MenuItem value="both">🌐 Both</MenuItem>
              </Select>
            </FormControl>

            {/* Min salary */}
            <TextField
              size="small"
              label="Min Salary ($)"
              type="number"
              value={filters.minSalary ?? ''}
              onChange={(e) => onChange({ minSalary: e.target.value ? Number(e.target.value) : null })}
              inputProps={{ min: 0, step: 5000 }}
            />

            {/* Max salary */}
            <TextField
              size="small"
              label="Max Salary ($)"
              type="number"
              value={filters.maxSalary ?? ''}
              onChange={(e) => onChange({ maxSalary: e.target.value ? Number(e.target.value) : null })}
              inputProps={{ min: 0, step: 5000 }}
            />

            {/* Max stress */}
            <TextField
              size="small"
              label="Max Stress (%)"
              type="number"
              value={filters.maxStress ?? ''}
              onChange={(e) => onChange({ maxStress: e.target.value ? Number(e.target.value) : null })}
              inputProps={{ min: 0, max: 100 }}
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

            {/* Min PTO */}
            <TextField
              size="small"
              label="Min PTO (blocks)"
              type="number"
              value={filters.minPto ?? ''}
              onChange={(e) => onChange({ minPto: e.target.value ? Number(e.target.value) : null })}
              inputProps={{ min: 0 }}
            />
          </Box>

          {/* Toggle switches */}
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {!isSetupMode && (
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
            )}
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.partTimeOnly}
                  onChange={(e) => onChange({ partTimeOnly: e.target.checked, fullTimeOnly: false })}
                />
              }
              label={<Typography variant="body2">Part-time</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.fullTimeOnly}
                  onChange={(e) => onChange({ fullTimeOnly: e.target.checked, partTimeOnly: false })}
                />
              }
              label={<Typography variant="body2">Full-time</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.seasonal === true}
                  onChange={(e) => onChange({ seasonal: e.target.checked ? true : null })}
                />
              }
              label={<Typography variant="body2">🌻 Seasonal</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.hasPension}
                  onChange={(e) => onChange({ hasPension: e.target.checked })}
                />
              }
              label={<Typography variant="body2">🏦 Has Pension</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.showAll}
                  onChange={(e) => onChange({ showAll: e.target.checked })}
                />
              }
              label={<Typography variant="body2">🌐 Show all locations</Typography>}
            />
            {showBookmarkedOnly !== undefined && onBookmarkedOnlyChange !== undefined && (
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={showBookmarkedOnly}
                    onChange={(e) => onBookmarkedOnlyChange(e.target.checked)}
                  />
                }
                label={<Typography variant="body2">🔖 Bookmarked Only</Typography>}
              />
            )}
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
