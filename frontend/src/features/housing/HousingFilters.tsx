/**
 * HousingFilters — collapsible filter panel for the housing catalog.
 * Requirements: Req 12
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
import type { HousingFilters as Filters } from './types';

interface Props {
  filters: Filters;
  onChange: (partial: Partial<Filters>) => void;
  onReset: () => void;
}

export default function HousingFilters({ filters, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.location,
    filters.rentalOnly,
    filters.buyOnly,
    filters.maxCost !== null,
    filters.minCapacity !== null,
    filters.showAll,
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
            {/* Location */}
            <FormControl size="small" fullWidth>
              <InputLabel>Location</InputLabel>
              <Select
                value={filters.location}
                label="Location"
                onChange={(e) => onChange({ location: e.target.value as Filters['location'] })}
              >
                <MenuItem value="">All locations</MenuItem>
                <MenuItem value="city">🏙️ City</MenuItem>
                <MenuItem value="suburb">🏡 Suburb</MenuItem>
              </Select>
            </FormControl>

            {/* Max cost */}
            <TextField
              size="small"
              label="Max Cost ($)"
              type="number"
              placeholder="e.g. 300000"
              value={filters.maxCost ?? ''}
              onChange={(e) =>
                onChange({ maxCost: e.target.value ? Number(e.target.value) : null })
              }
              inputProps={{ min: 0, step: 1000 }}
            />

            {/* Min capacity */}
            <TextField
              size="small"
              label="Min Capacity (people)"
              type="number"
              placeholder="e.g. 3"
              value={filters.minCapacity ?? ''}
              onChange={(e) =>
                onChange({ minCapacity: e.target.value ? Number(e.target.value) : null })
              }
              inputProps={{ min: 1, max: 12 }}
            />
          </Box>

          {/* Toggle switches */}
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.rentalOnly}
                  onChange={(e) => onChange({ rentalOnly: e.target.checked, buyOnly: e.target.checked ? false : filters.buyOnly })}
                />
              }
              label={<Typography variant="body2">🔑 Rentals only</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.buyOnly}
                  onChange={(e) => onChange({ buyOnly: e.target.checked, rentalOnly: e.target.checked ? false : filters.rentalOnly })}
                />
              }
              label={<Typography variant="body2">🏦 Buy only</Typography>}
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
