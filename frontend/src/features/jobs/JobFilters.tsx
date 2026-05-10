/**
 * JobFilters — collapsible filter panel for the jobs catalog.
 * Requirements: Req 11, 2.1, 9.1
 */
import {
  Box, Paper, Typography, Stack, FormControlLabel, Switch,
  Select, MenuItem, FormControl, InputLabel, TextField,
  Button, Collapse, IconButton, Divider, Tooltip, ListSubheader,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import SavingsIcon from '@mui/icons-material/Savings';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { JobFilters as Filters } from './types';
import { useSetupMode } from '../../contexts/SetupModeContext';
import api from '../../lib/api';

const SKILL_TRAIT_OPTIONS = [
  { value: 'math', label: 'Math', group: 'Skills' },
  { value: 'science', label: 'Science', group: 'Skills' },
  { value: 'art', label: 'Art', group: 'Skills' },
  { value: 'music', label: 'Music', group: 'Skills' },
  { value: 'writing', label: 'Writing', group: 'Skills' },
  { value: 'analysis', label: 'Analysis', group: 'Skills' },
  { value: 'homeRepair', label: 'Home Repair', group: 'Skills' },
  { value: 'technology', label: 'Technology', group: 'Skills' },
  { value: 'bravery', label: 'Bravery', group: 'Traits' },
  { value: 'perseverance', label: 'Perseverance', group: 'Traits' },
  { value: 'charisma', label: 'Charisma', group: 'Traits' },
  { value: 'compassion', label: 'Compassion', group: 'Traits' },
  { value: 'creativity', label: 'Creativity', group: 'Traits' },
  { value: 'organization', label: 'Organization', group: 'Traits' },
  { value: 'patience', label: 'Patience', group: 'Traits' },
  { value: 'caution', label: 'Caution', group: 'Traits' },
  { value: 'sociability', label: 'Sociability', group: 'Traits' },
  { value: 'stressTolerance', label: 'Stress Tolerance', group: 'Traits' },
  { value: 'goodWithKids', label: 'Good With Kids', group: 'Traits' },
  { value: 'physicalAbility', label: 'Physical Ability', group: 'Traits' },
  { value: 'communication', label: 'Communication', group: 'Traits' },
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

  // Fetch majors dynamically from the database
  const { data: majorsData } = useQuery({
    queryKey: ['education-majors'],
    queryFn: async () => {
      const res = await api.get('/education/majors');
      return res.data as { majors: string[]; grouped: Record<string, string[]> };
    },
    staleTime: 5 * 60 * 1000,
  });
  const groupedMajors = majorsData?.grouped ?? {};

  const activeCount = [
    filters.minSalary !== null,
    filters.minPto !== null,
    filters.maxTimeBlocks !== null,
    filters.maxStress !== null,
    filters.location,
    filters.requiredMajor,
    filters.partTimeOnly,
    filters.fullTimeOnly,
    filters.seasonal !== null,
    filters.hasPension,
    filters.hasTips,
    filters.hasDiscounts,
    !isSetupMode && !filters.eligibleOnly,
    filters.skillTraitFilters.length > 0,
  ].filter(Boolean).length;

  // ── Skill/trait filter handlers ──────────────────────────────────────────────

  const handleAddSkillTraitFilter = useCallback(() => {
    const usedKeys = new Set(filters.skillTraitFilters.map((f) => f.key));
    const nextAvailable = SKILL_TRAIT_OPTIONS.find((o) => !usedKeys.has(o.value));
    if (!nextAvailable) return;
    const newFilters = [...filters.skillTraitFilters, { key: nextAvailable.value, comparator: '' as const, level: '' as const }];
    onChange({ skillTraitFilters: newFilters });
  }, [filters.skillTraitFilters, onChange]);

  const handleRemoveSkillTraitFilter = useCallback((index: number) => {
    const updated = filters.skillTraitFilters.filter((_, i) => i !== index);
    onChange({ skillTraitFilters: updated });
  }, [filters.skillTraitFilters, onChange]);

  const handleSkillTraitKeyChange = useCallback((index: number, newKey: string) => {
    const updated = [...filters.skillTraitFilters];
    updated[index] = { ...updated[index], key: newKey };
    onChange({ skillTraitFilters: updated });
  }, [filters.skillTraitFilters, onChange]);

  const handleSkillTraitComparatorChange = useCallback((index: number, newComp: string) => {
    const updated = [...filters.skillTraitFilters];
    updated[index] = { ...updated[index], comparator: newComp as 'at_least' | 'at_most' | 'only' | '' };
    onChange({ skillTraitFilters: updated });
  }, [filters.skillTraitFilters, onChange]);

  const handleSkillTraitLevelChange = useCallback((index: number, newLevel: string) => {
    const updated = [...filters.skillTraitFilters];
    updated[index] = { ...updated[index], level: newLevel as 'low' | 'medium' | 'high' | '' };
    onChange({ skillTraitFilters: updated });
  }, [filters.skillTraitFilters, onChange]);

  const usedSkillTraitKeys = new Set(filters.skillTraitFilters.map((f) => f.key));
  const canAddMore = filters.skillTraitFilters.length < SKILL_TRAIT_OPTIONS.length;

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

            {/* Required Major */}
            <FormControl size="small" fullWidth>
              <InputLabel>Required Major</InputLabel>
              <Select
                value={filters.requiredMajor}
                label="Required Major"
                onChange={(e) => onChange({ requiredMajor: e.target.value })}
              >
                <MenuItem value="">Any Major</MenuItem>
                {Object.entries(groupedMajors).map(([field, majors]) => [
                  <ListSubheader key={`header-${field}`}>{field}</ListSubheader>,
                  ...majors.map((major) => (
                    <MenuItem key={major} value={major} sx={{ pl: 4 }}>{major}</MenuItem>
                  )),
                ])}
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
              label="Min PTO (time blocks)"
              type="number"
              value={filters.minPto ?? ''}
              onChange={(e) => onChange({ minPto: e.target.value ? Number(e.target.value) : null })}
              inputProps={{ min: 0 }}
            />
          </Box>

          {/* Skill/trait requirement filters */}
          {filters.skillTraitFilters.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                Skill / Trait Requirements
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5 }}>
                {filters.skillTraitFilters.map((stf, index) => (
                  <Stack key={index} direction="row" alignItems="center" spacing={1}>
                    <FormControl size="small" sx={{ width: 170 }}>
                      <Select
                        value={stf.key}
                        onChange={(e) => handleSkillTraitKeyChange(index, e.target.value)}
                        displayEmpty
                      >
                        {SKILL_TRAIT_OPTIONS.map((o) => (
                          <MenuItem
                            key={o.value}
                            value={o.value}
                            disabled={usedSkillTraitKeys.has(o.value) && o.value !== stf.key}
                          >
                            {o.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 110 }}>
                      <Select
                        value={stf.comparator}
                        onChange={(e) => handleSkillTraitComparatorChange(index, e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">—</MenuItem>
                        <MenuItem value="at_least">At least</MenuItem>
                        <MenuItem value="at_most">At most</MenuItem>
                        <MenuItem value="only">Only</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 110 }}>
                      <Select
                        value={stf.level}
                        onChange={(e) => handleSkillTraitLevelChange(index, e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">Any</MenuItem>
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                      </Select>
                    </FormControl>
                    <Tooltip title="Remove filter">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveSkillTraitFilter(index)}
                        aria-label="Remove filter"
                        sx={{ p: 0.25, ml: 0.25 }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ))}
              </Box>
            </Box>
          )}

          {/* Add skill/trait filter button */}
          {canAddMore && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddSkillTraitFilter}
              sx={{ textTransform: 'none', mb: 2 }}
            >
              Add skill/trait filter
            </Button>
          )}

          {/* Toggle switches */}
          <Stack direction="row" flexWrap="wrap" gap={3} ml={1}>
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
              label={
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ScheduleIcon sx={{ fontSize: 16 }} /> Part-time
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.fullTimeOnly}
                  onChange={(e) => onChange({ fullTimeOnly: e.target.checked, partTimeOnly: false })}
                />
              }
              label={
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <WatchLaterIcon sx={{ fontSize: 16 }} /> Full-time
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.seasonal === true}
                  onChange={(e) => onChange({ seasonal: e.target.checked ? true : null })}
                />
              }
              label={
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <WbSunnyIcon sx={{ fontSize: 16 }} /> Seasonal
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.hasPension}
                  onChange={(e) => onChange({ hasPension: e.target.checked })}
                />
              }
              label={
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SavingsIcon sx={{ fontSize: 16 }} /> Pension
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.hasTips}
                  onChange={(e) => onChange({ hasTips: e.target.checked })}
                />
              }
              label={
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AttachMoneyIcon sx={{ fontSize: 16 }} /> Tips
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.hasDiscounts}
                  onChange={(e) => onChange({ hasDiscounts: e.target.checked })}
                />
              }
              label={
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocalOfferIcon sx={{ fontSize: 16 }} /> Discounts
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
