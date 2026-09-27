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
import ScheduleIcon from '@mui/icons-material/Schedule';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { useState } from 'react';
import type { EduFilters } from './types';
import { useSetupMode } from '../../contexts/SetupModeContext';
import FieldMajorFilter from './FieldMajorFilter';

const TYPE_OPTIONS = [
  { value: '', label: 'Any type' },
  { value: 'vocational', label: 'Vocational' },
  { value: 'associates', label: "Associate's" },
  { value: 'bachelors', label: "Bachelor's" },
  { value: 'masters', label: "Master's" },
  { value: 'doctorate', label: 'Doctorate' },
  { value: 'certificate', label: 'Professional' },
];

const TRACK_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'stem', label: 'STEM' },
  { value: 'humanities', label: 'Humanities' },
];

interface Props {
  filters: EduFilters;
  onChange: (partial: Partial<EduFilters>) => void;
  onReset: () => void;
  showBookmarkedOnly?: boolean;
  onBookmarkedOnlyChange?: (value: boolean) => void;
}

export default function ProgramFilters({ filters, onChange, onReset, showBookmarkedOnly, onBookmarkedOnlyChange }: Props) {
  const [open, setOpen] = useState(false);
  const { isSetupMode } = useSetupMode();

  const activeCount = [
    filters.type,
    filters.selectedMajors.length > 0,
    filters.track,
    filters.partTimeOnly,
    filters.maxTuition !== null,
    !isSetupMode && !filters.eligibleOnly,
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
            Filters
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
            {/* Degree type */}
            <FormControl size="small" fullWidth>
              <InputLabel>Degree Type</InputLabel>
              <Select
                value={filters.type}
                label="Degree Type"
                onChange={(e) => onChange({ type: e.target.value })}
              >
                {TYPE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Track (STEM / Humanities / Both) */}
            <FormControl size="small" fullWidth>
              <InputLabel>Track</InputLabel>
              <Select
                value={filters.track}
                label="Track"
                onChange={(e) => onChange({ track: e.target.value as EduFilters['track'] })}
              >
                {TRACK_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Field / Major (multi-select checkbox) */}
            <FieldMajorFilter
              selectedMajors={filters.selectedMajors}
              onChange={(majors) => onChange({ selectedMajors: majors })}
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
                  onChange={(e) => onChange({ partTimeOnly: e.target.checked })}
                />
              }
              label={
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ScheduleIcon sx={{ fontSize: 16 }} /> Part-time Available
                </Typography>
              }
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
                label={
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <BookmarkIcon sx={{ fontSize: 16 }} /> Bookmarked Only
                  </Typography>
                }
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
