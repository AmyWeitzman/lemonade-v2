/**
 * VehicleCard — displays a single vehicle with costs, capacity, and purchase/sell actions.
 * Requirements: Req 13
 */
import { useState } from 'react';
import {
  Box, Card, CardContent, CardActions, Typography, Chip, Stack,
  Tooltip, IconButton, Button, Collapse, Checkbox, FormControlLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import BuildIcon from '@mui/icons-material/Build';
import type { VehicleItem } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    bike: '🚲 Bike',
    public_transit: '🚌 Public Transit',
    car: '🚗 Car',
    motorcycle: '🏍️ Motorcycle',
  };
  return labels[type] ?? type;
}

function typeColor(type: string): string {
  const colors: Record<string, string> = {
    bike: '#e8f5e9',
    public_transit: '#e3f2fd',
    car: '#fff3e0',
    motorcycle: '#fce4ec',
  };
  return colors[type] ?? '#f5f5f5';
}

function fuelLabel(fuel: string): string {
  const labels: Record<string, string> = {
    gas: '⛽ Gas',
    electric: '⚡ Electric',
    hybrid: '🔋 Hybrid',
    none: '—',
  };
  return labels[fuel] ?? fuel;
}

function ageLabel(ageVariant: string): string {
  const labels: Record<string, string> = {
    new: '✨ New',
    used_5yr: '🔧 Used (5 yr)',
    used_10yr: '🔧 Used (10 yr)',
  };
  return labels[ageVariant] ?? ageVariant;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  vehicle: VehicleItem;
  inCompare: boolean;
  onToggleCompare: (id: string) => void;
  onPurchase: (vehicle: VehicleItem) => void;
  onSell: (vehicle: VehicleItem) => void;
  purchasing: boolean;
  selling: boolean;
  isMechanicDiscount: boolean;
}

export default function VehicleCard({
  vehicle,
  inCompare,
  onToggleCompare,
  onPurchase,
  onSell,
  purchasing,
  selling,
  isMechanicDiscount,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const isOwned = vehicle.isCurrentPlayerVehicle || vehicle.isCurrentSpouseVehicle;
  const isPublicTransit = vehicle.type === 'public_transit';
  const isBike = vehicle.type === 'bike';
  const canSell = isOwned && !isPublicTransit && !isBike;

  const primaryCost = isPublicTransit
    ? vehicle.annualCost ?? 0
    : vehicle.purchasePrice ?? 0;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: vehicle.isCurrentPlayerVehicle
          ? 'success.main'
          : vehicle.isCurrentSpouseVehicle
          ? 'secondary.main'
          : inCompare
          ? 'primary.main'
          : vehicle.eligible
          ? 'divider'
          : 'error.light',
        borderWidth: isOwned || inCompare ? 2 : 1,
        bgcolor: vehicle.isCurrentPlayerVehicle
          ? 'success.50'
          : vehicle.isCurrentSpouseVehicle
          ? 'secondary.50'
          : vehicle.eligible
          ? 'background.paper'
          : 'action.hover',
        opacity: vehicle.eligible || isOwned ? 1 : 0.85,
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
        {vehicle.isCurrentPlayerVehicle && (
          <Chip label="🚗 Yours" size="small" color="success" sx={{ fontSize: '0.65rem', height: 20 }} />
        )}
        {vehicle.isCurrentSpouseVehicle && (
          <Chip label="💑 Spouse" size="small" color="secondary" sx={{ fontSize: '0.65rem', height: 20 }} />
        )}
        {vehicle.bikeAreaRestriction && (
          <Tooltip title="Bike cannot travel between city and suburb">
            <Chip label="⚠️ Area limit" size="small" color="warning" sx={{ fontSize: '0.65rem', height: 20 }} />
          </Tooltip>
        )}
      </Box>

      <CardContent sx={{ pb: 0, pr: 10 }}>
        {/* Title + eligibility */}
        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 0.75 }}>
          <Tooltip
            title={
              isOwned
                ? vehicle.isCurrentPlayerVehicle ? 'Your current vehicle' : "Spouse's current vehicle"
                : vehicle.eligible
                ? 'You meet all requirements'
                : vehicle.eligibilityReason ?? 'Not eligible'
            }
            arrow
          >
            <Box sx={{ mt: 0.25, flexShrink: 0 }}>
              {isOwned ? (
                <DirectionsCarIcon sx={{ fontSize: 18, color: vehicle.isCurrentPlayerVehicle ? 'success.main' : 'secondary.main' }} />
              ) : vehicle.eligible ? (
                <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
              ) : (
                <BlockIcon sx={{ fontSize: 18, color: 'error.main' }} />
              )}
            </Box>
          </Tooltip>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {vehicle.name}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
              <Chip
                label={typeLabel(vehicle.type)}
                size="small"
                sx={{ fontSize: '0.6rem', height: 18, bgcolor: typeColor(vehicle.type) }}
              />
              {vehicle.fuelType !== 'none' && (
                <Chip
                  label={fuelLabel(vehicle.fuelType)}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 18 }}
                />
              )}
              <Chip
                label={ageLabel(vehicle.ageVariant)}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.6rem', height: 18 }}
              />
            </Stack>
          </Box>
        </Stack>

        {/* Key costs */}
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1 }}>
          {isPublicTransit ? (
            <Tooltip title="Annual transit cost">
              <Chip
                label={`🚌 ${fmt(primaryCost)}/yr`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Purchase price">
              <Chip
                label={`💰 ${fmt(primaryCost)}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Tooltip>
          )}

          <Tooltip title="Passenger capacity">
            <Chip
              label={`👥 ${vehicle.passengerCapacity} seat${vehicle.passengerCapacity !== 1 ? 's' : ''}`}
              size="small"
              sx={{ fontSize: '0.7rem', bgcolor: '#f5f5f5' }}
            />
          </Tooltip>
        </Stack>

        {/* Annual costs breakdown */}
        {!isBike && !isPublicTransit && (
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1 }}>
            {vehicle.estimatedAnnualCosts.insurance > 0 && (
              <Tooltip title="Annual insurance">
                <Chip
                  label={`🛡️ ${fmt(vehicle.estimatedAnnualCosts.insurance)}/yr`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Tooltip>
            )}
            {vehicle.estimatedAnnualCosts.gas > 0 && (
              <Tooltip title="Annual gas cost">
                <Chip
                  label={`⛽ ${fmt(vehicle.estimatedAnnualCosts.gas)}/yr`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Tooltip>
            )}
            <Tooltip title={isMechanicDiscount ? 'Annual maintenance (80% mechanic discount applied)' : 'Annual maintenance'}>
              <Chip
                label={
                  <Stack direction="row" alignItems="center" spacing={0.25}>
                    <span>🔧 {fmt(vehicle.estimatedAnnualCosts.maintenance)}/yr</span>
                    {isMechanicDiscount && (
                      <BuildIcon sx={{ fontSize: 10, color: 'success.main' }} />
                    )}
                  </Stack>
                }
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  bgcolor: isMechanicDiscount ? '#e8f5e9' : undefined,
                }}
              />
            </Tooltip>
            <Tooltip title="Estimated total annual cost">
              <Chip
                label={`📊 ~${fmt(vehicle.estimatedAnnualCosts.total)}/yr`}
                size="small"
                sx={{ fontSize: '0.7rem', bgcolor: '#fff9c4' }}
              />
            </Tooltip>
          </Stack>
        )}

        {/* Eligibility reason */}
        {!vehicle.eligible && !isOwned && vehicle.eligibilityReason && (
          <Typography variant="caption" color="error.main" display="block" sx={{ fontSize: '0.7rem', mb: 0.5 }}>
            • {vehicle.eligibilityReason}
          </Typography>
        )}

        {/* Expandable details */}
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
              {vehicle.restrictedToArea && (
                <Typography variant="caption" color="warning.main" display="block" sx={{ fontSize: '0.72rem', mb: 0.5 }}>
                  ⚠️ Cannot travel between city and suburb areas
                </Typography>
              )}
              {vehicle.canBeParentGift && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.72rem', mb: 0.5 }}>
                  🎁 Can be received as a parent gift
                </Typography>
              )}
              {isMechanicDiscount && !isBike && !isPublicTransit && (
                <Typography variant="caption" color="success.main" display="block" sx={{ fontSize: '0.72rem' }}>
                  🔧 Mechanic discount: 80% off maintenance
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
              onChange={() => onToggleCompare(vehicle.id)}
              icon={<CompareArrowsIcon fontSize="small" />}
              checkedIcon={<CompareArrowsIcon fontSize="small" color="primary" />}
            />
          }
          label={<Typography variant="caption">Compare</Typography>}
          sx={{ m: 0 }}
        />

        <Stack direction="row" spacing={0.5}>
          {/* Sell button — only for owned vehicles that can be sold */}
          {canSell && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              disabled={selling}
              onClick={() => onSell(vehicle)}
              sx={{ fontSize: '0.7rem' }}
            >
              Sell
            </Button>
          )}

          {/* Purchase / status */}
          {isOwned ? (
            <Typography
              variant="caption"
              color={vehicle.isCurrentPlayerVehicle ? 'success.main' : 'secondary.main'}
              sx={{ fontWeight: 600, fontSize: '0.72rem', alignSelf: 'center' }}
            >
              {vehicle.isCurrentPlayerVehicle ? '✅ Your vehicle' : '💑 Spouse vehicle'}
            </Typography>
          ) : (
            <Button
              size="small"
              variant={vehicle.eligible ? 'contained' : 'outlined'}
              color={vehicle.eligible ? 'primary' : 'inherit'}
              disabled={!vehicle.eligible || purchasing}
              onClick={() => onPurchase(vehicle)}
              startIcon={<DirectionsCarIcon sx={{ fontSize: '0.9rem !important' }} />}
              sx={{ fontSize: '0.7rem' }}
            >
              {isPublicTransit ? 'Select' : 'Purchase'}
            </Button>
          )}
        </Stack>
      </CardActions>
    </Card>
  );
}
