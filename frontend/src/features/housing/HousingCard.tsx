/**
 * HousingCard — displays a single housing option with eligibility,
 * costs, occupancy limits, pet limits, and select/improve actions.
 * Requirements: Req 12, Req 42
 */
import { useState } from 'react';
import {
  Box, Card, CardContent, CardActions, Typography, Chip, Stack,
  Tooltip, IconButton, Button, Collapse, Divider, Checkbox,
  FormControlLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import HomeIcon from '@mui/icons-material/Home';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import BuildIcon from '@mui/icons-material/Build';
import type { HousingItem } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '$' + n.toLocaleString();
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    parent: '👨‍👩‍👧 Parents',
    dorm: '🏫 Dorm',
    apartment: '🏢 Apartment',
    house: '🏡 House',
  };
  return labels[type] ?? type;
}

function typeColor(type: string): string {
  const colors: Record<string, string> = {
    parent: '#e8f5e9',
    dorm: '#e3f2fd',
    apartment: '#fff3e0',
    house: '#f3e5f5',
  };
  return colors[type] ?? '#f5f5f5';
}

function locationLabel(loc: string): string {
  if (loc === 'city') return '🏙️ City';
  if (loc === 'suburb') return '🏡 Suburb';
  return '🌐 Both';
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  housing: HousingItem;
  inCompare: boolean;
  onSelect: (housing: HousingItem) => void;
  onToggleCompare: (id: string) => void;
  onImprove: (housing: HousingItem) => void;
  selecting: boolean;
}

export default function HousingCard({
  housing,
  inCompare,
  onSelect,
  onToggleCompare,
  onImprove,
  selecting,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const primaryCost = housing.isRental
    ? housing.rentPerYear ?? 0
    : housing.purchasePrice ?? 0;

  const hasImprovements =
    housing.allowsRemodeling || housing.allowsPool || housing.allowsSolarPanels;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: housing.isCurrentHome
          ? 'success.main'
          : inCompare
          ? 'secondary.main'
          : housing.eligible
          ? 'divider'
          : 'error.light',
        borderWidth: housing.isCurrentHome || inCompare ? 2 : 1,
        bgcolor: housing.isCurrentHome
          ? 'success.50'
          : housing.eligible
          ? 'background.paper'
          : 'action.hover',
        opacity: housing.eligible || housing.isCurrentHome ? 1 : 0.85,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { boxShadow: 2 },
        position: 'relative',
      }}
    >
      {/* Badges */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 0.5,
          flexWrap: 'wrap',
          maxWidth: 160,
          justifyContent: 'flex-end',
          zIndex: 1,
        }}
      >
        {housing.isCurrentHome && (
          <Chip
            label="🏠 Current"
            size="small"
            color="success"
            sx={{ fontSize: '0.65rem', height: 20 }}
          />
        )}
        {housing.isRental ? (
          <Chip
            label="🔑 Rent"
            size="small"
            sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#e3f2fd' }}
          />
        ) : (
          <Chip
            label="🏦 Buy"
            size="small"
            sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#e8f5e9' }}
          />
        )}
      </Box>

      <CardContent sx={{ pb: 0, pr: 10 }}>
        {/* Title + eligibility */}
        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 0.75 }}>
          <Tooltip
            title={
              housing.isCurrentHome
                ? 'Your current home'
                : housing.eligible
                ? 'You meet all requirements'
                : housing.eligibilityReasons.join(' • ')
            }
            arrow
          >
            <Box sx={{ mt: 0.25, flexShrink: 0 }}>
              {housing.isCurrentHome ? (
                <HomeIcon sx={{ fontSize: 18, color: 'success.main' }} />
              ) : housing.eligible ? (
                <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
              ) : (
                <BlockIcon sx={{ fontSize: 18, color: 'error.main' }} />
              )}
            </Box>
          </Tooltip>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {housing.name}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
              <Chip
                label={typeLabel(housing.type)}
                size="small"
                sx={{ fontSize: '0.6rem', height: 18, bgcolor: typeColor(housing.type) }}
              />
              <Chip
                label={locationLabel(housing.location)}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.6rem', height: 18 }}
              />
            </Stack>
          </Box>
        </Stack>

        {/* Key costs */}
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1 }}>
          {housing.isRental ? (
            <Tooltip title="Annual rent">
              <Chip
                label={`🔑 ${fmt(housing.rentPerYear ?? 0)}/yr`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Purchase price">
              <Chip
                label={`🏦 ${fmt(housing.purchasePrice ?? 0)}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Tooltip>
          )}

          {housing.utilitiesBase > 0 && (
            <Tooltip title={`Utilities: ${fmt(housing.utilitiesBase)} base + ${fmt(housing.utilitiesPerPerson)}/person`}>
              <Chip
                label={`⚡ ${fmt(housing.utilitiesBase)}+`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Tooltip>
          )}

          {!housing.isRental && housing.insurancePerYear && housing.insurancePerYear > 0 && (
            <Tooltip title="Annual home insurance">
              <Chip
                label={`🛡️ ${fmt(housing.insurancePerYear)}/yr`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Tooltip>
          )}

          <Tooltip title={`Est. annual cost (rent/utilities/insurance)`}>
            <Chip
              label={`📊 ~${fmt(housing.estimatedAnnualCost)}/yr`}
              size="small"
              sx={{ fontSize: '0.7rem', bgcolor: '#fff9c4' }}
            />
          </Tooltip>
        </Stack>

        {/* Occupancy + pets */}
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1 }}>
          <Tooltip title={`Recommended: ${housing.recommendedOccupancy} | Max: ${housing.maxOccupancy}`}>
            <Chip
              label={`👥 ${housing.recommendedOccupancy}–${housing.maxOccupancy} people`}
              size="small"
              sx={{ fontSize: '0.7rem', bgcolor: '#f5f5f5' }}
            />
          </Tooltip>

          {housing.maxKids === 0 ? (
            <Tooltip title="No children allowed">
              <Chip
                label="🚫 No kids"
                size="small"
                sx={{ fontSize: '0.7rem', bgcolor: '#ffebee' }}
              />
            </Tooltip>
          ) : housing.maxKids > 0 ? (
            <Tooltip title={`Max ${housing.maxKids} children under 18`}>
              <Chip
                label={`👶 Max ${housing.maxKids} kids`}
                size="small"
                sx={{ fontSize: '0.7rem', bgcolor: '#f5f5f5' }}
              />
            </Tooltip>
          ) : null}

          {(housing.petLimitLarge > 0 || housing.petLimitSmall > 0) ? (
            <Tooltip title={`Large pets: ${housing.petLimitLarge} | Small pets: ${housing.petLimitSmall}`}>
              <Chip
                label={`🐾 ${housing.petLimitLarge}L / ${housing.petLimitSmall}S`}
                size="small"
                sx={{ fontSize: '0.7rem', bgcolor: '#f5f5f5' }}
              />
            </Tooltip>
          ) : (
            <Tooltip title="No pets allowed">
              <Chip
                label="🚫 No pets"
                size="small"
                sx={{ fontSize: '0.7rem', bgcolor: '#ffebee' }}
              />
            </Tooltip>
          )}
        </Stack>

        {/* Soft warnings */}
        {housing.warnings.length > 0 && (
          <Box sx={{ mb: 1 }}>
            {housing.warnings.map((w, i) => (
              <Typography key={i} variant="caption" color="warning.main" display="block" sx={{ fontSize: '0.7rem' }}>
                ⚠️ {w}
              </Typography>
            ))}
          </Box>
        )}

        {/* Hard eligibility reasons */}
        {!housing.eligible && !housing.isCurrentHome && housing.eligibilityReasons.length > 0 && (
          <Box sx={{ mb: 1 }}>
            {housing.eligibilityReasons.slice(0, 2).map((r, i) => (
              <Typography key={i} variant="caption" color="error.main" display="block" sx={{ fontSize: '0.7rem' }}>
                • {r}
              </Typography>
            ))}
            {housing.eligibilityReasons.length > 2 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                +{housing.eligibilityReasons.length - 2} more…
              </Typography>
            )}
          </Box>
        )}

        {/* Expandable: improvements + restrictions */}
        <Box>
          <Box
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mt: 0.5 }}
            onClick={() => setExpanded((v) => !v)}
          >
            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
              Details
            </Typography>
            <IconButton size="small" sx={{ p: 0, ml: 0.25 }}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>

          <Collapse in={expanded}>
            <Box sx={{ mt: 1 }}>
              {/* Restrictions */}
              {(housing.ageLimit || housing.requiresEnrollment) && (
                <>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                    Restrictions
                  </Typography>
                  <Stack gap={0.25} sx={{ mb: 1 }}>
                    {housing.ageLimit && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                        🎂 Age limit: {housing.ageLimit}
                      </Typography>
                    )}
                    {housing.requiresEnrollment && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                        🎓 Requires active college enrollment (no PhD)
                      </Typography>
                    )}
                  </Stack>
                  <Divider sx={{ mb: 1 }} />
                </>
              )}

              {/* Improvements */}
              {hasImprovements && (
                <>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                    Home Improvements Available
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {housing.allowsRemodeling && (
                      <Chip label="🔨 Remodel" size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#e8f5e9' }} />
                    )}
                    {housing.allowsPool && (
                      <Chip label="🏊 Pool" size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#e3f2fd' }} />
                    )}
                    {housing.allowsSolarPanels && (
                      <Chip label="☀️ Solar Panels" size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#fff9c4' }} />
                    )}
                  </Stack>
                </>
              )}

              {!hasImprovements && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                  No home improvements available for this property.
                </Typography>
              )}
            </Box>
          </Collapse>
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0.5, pb: 1, px: 2, justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5 }}>
        {/* Compare checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={inCompare}
              onChange={() => onToggleCompare(housing.id)}
              icon={<CompareArrowsIcon fontSize="small" />}
              checkedIcon={<CompareArrowsIcon fontSize="small" color="secondary" />}
            />
          }
          label={<Typography variant="caption">Compare</Typography>}
          sx={{ m: 0 }}
        />

        <Stack direction="row" spacing={0.5}>
          {/* Improve button — only for current owned home */}
          {housing.isCurrentHome && !housing.isRental && hasImprovements && (
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<BuildIcon sx={{ fontSize: '0.9rem !important' }} />}
              onClick={() => onImprove(housing)}
              sx={{ fontSize: '0.7rem' }}
            >
              Improve
            </Button>
          )}

          {/* Select button */}
          {housing.isCurrentHome ? (
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600, fontSize: '0.72rem', alignSelf: 'center' }}>
              ✅ Living here
            </Typography>
          ) : (
            <Button
              size="small"
              variant={housing.eligible ? 'contained' : 'outlined'}
              color={housing.eligible ? 'primary' : 'inherit'}
              disabled={!housing.eligible || selecting}
              onClick={() => onSelect(housing)}
              startIcon={<HomeIcon sx={{ fontSize: '0.9rem !important' }} />}
              sx={{ fontSize: '0.7rem' }}
            >
              {housing.isRental ? 'Rent' : 'Buy'}
            </Button>
          )}
        </Stack>
      </CardActions>
    </Card>
  );
}
