/**
 * ProgramFilters — collapsible filter panel for the education catalog.
 * Requirements: Req 10
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
import type { EduFilters } from './types';

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'tuition_asc', label: '💰 Lowest Tuition' },
  { value: 'tuition_desc', label: '💰 Highest Tuition' },
  { value: 'name_asc', label: '🔤 Name A–Z' },
  { value: 'duration_asc', label: '⏱ Shortest Duration' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Any type' },
  { value: 'certificate', label: '📜 Certificate' },
  { value: 'vocational', label: '🔧 Vocational' },
  { value: 'associates', label: '🎓 Associate\'s' },
  { value: 'bachelors', label: '🎓 Bachelor\'s' },
  { value: 'masters', label: '🎓 Master\'s' },
  { value: 'doctorate', label: '🎓 Doctorate' },
  { value: 'professional', label: '🏥 Professional' },
];

interface Props {
  filters: EduFilters;
  onChange: (partial: Partial<EduFilters>) => void;
  onReset: () => void;
}

export default function ProgramFilters({ filters, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.type,
    filters.field,
    filters.isStem !== null,
    filters.partTimeOnly,
    filters.maxTuition !== null,
    !filters.eligibleOnly, // non-default
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
                onChange={(e) => onChange({ sort: e.target.value as EduFilters['sort'] })}
              >
                {SORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Degree type */}
            <FormControl size="small" fullWidth>
              <InputLabel>Degree type</InputLabel>
              <Select
                value={filters.type}
                label="Degree type"
                onChange={(e) => onChange({ type: e.target.value })}
              >
                {TYPE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Field */}
            <TextField
              size="small"
              label="Field / Major"
              placeholder="e.g. Business, Nursing…"
              value={filters.field}
              onChange={(e) => onChange({ field: e.target.value })}
            />

            {/* Max tuition */}
            <TextField
              size="small"
              label="Max Tuition ($/yr)"
              type="number"
              value={filters.maxTuition ?? ''}
              onChange={(e) => onChange({ maxTuition: e.target.value ? Number(e.target.value) : null })}
              inputProps={{ min: 0, step: 1000 }}
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
                  checked={filters.partTimeOnly}
                  onChange={(e) => onChange({ partTimeOnly: e.target.checked })}
                />
              }
              label={<Typography variant="body2">Part-time available</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.isStem === true}
                  onChange={(e) => onChange({ isStem: e.target.checked ? true : null })}
                />
              }
              label={<Typography variant="body2">🔬 STEM only</Typography>}
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
