/**
 * VehicleFilters — collapsible filter panel for the vehicle catalog.
 * Requirements: Req 13
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
import type { VehicleFilters as Filters } from './types';

const FUEL_OPTIONS = [
  { value: '', label: 'Any fuel type' },
  { value: 'gas', label: '⛽ Gas' },
  { value: 'electric', label: '⚡ Electric' },
  { value: 'hybrid', label: '🔋 Hybrid' },
  { value: 'none', label: '🚲 None (bike/transit)' },
];

const AGE_OPTIONS = [
  { value: '', label: 'Any age' },
  { value: 'new', label: '✨ New' },
  { value: 'used_5yr', label: '🔧 Used (5 yr)' },
  { value: 'used_10yr', label: '🔧 Used (10 yr)' },
];

interface Props {
  filters: Filters;
  onChange: (partial: Partial<Filters>) => void;
  onReset: () => void;
}

export default function VehicleFilters({ filters, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.maxCost !== null,
    filters.minPeople !== null,
    filters.carOnly,
    filters.nonCarOnly,
    filters.fuelType,
    filters.ageVariant,
    filters.eligibleOnly,
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
            {/* Max cost */}
            <TextField
              size="small"
              label="Max Cost ($)"
              type="number"
              placeholder="e.g. 30000"
              value={filters.maxCost ?? ''}
              onChange={(e) =>
                onChange({ maxCost: e.target.value ? Number(e.target.value) : null })
              }
              inputProps={{ min: 0, step: 1000 }}
            />

            {/* Min passengers */}
            <TextField
              size="small"
              label="Min Passengers"
              type="number"
              placeholder="e.g. 5"
              value={filters.minPeople ?? ''}
              onChange={(e) =>
                onChange({ minPeople: e.target.value ? Number(e.target.value) : null })
              }
              inputProps={{ min: 1, max: 11 }}
            />

            {/* Fuel type */}
            <FormControl size="small" fullWidth>
              <InputLabel>Fuel Type</InputLabel>
              <Select
                value={filters.fuelType}
                label="Fuel Type"
                onChange={(e) => onChange({ fuelType: e.target.value as Filters['fuelType'] })}
              >
                {FUEL_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Age variant */}
            <FormControl size="small" fullWidth>
              <InputLabel>Vehicle Age</InputLabel>
              <Select
                value={filters.ageVariant}
                label="Vehicle Age"
                onChange={(e) => onChange({ ageVariant: e.target.value as Filters['ageVariant'] })}
              >
                {AGE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Toggle switches */}
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.carOnly}
                  onChange={(e) =>
                    onChange({ carOnly: e.target.checked, nonCarOnly: e.target.checked ? false : filters.nonCarOnly })
                  }
                />
              }
              label={<Typography variant="body2">🚗 Cars only</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.nonCarOnly}
                  onChange={(e) =>
                    onChange({ nonCarOnly: e.target.checked, carOnly: e.target.checked ? false : filters.carOnly })
                  }
                />
              }
              label={<Typography variant="body2">🚲 Non-car only</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.eligibleOnly}
                  onChange={(e) => onChange({ eligibleOnly: e.target.checked })}
                />
              }
              label={<Typography variant="body2">✅ Eligible only</Typography>}
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
