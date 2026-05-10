/**
 * VehicleCompareModal — side-by-side vehicle comparison (up to 3).
 * Requirements: Req 13
 */
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Stack, Chip, Divider, IconButton,
  useMediaQuery, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
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

// ─── Row helper ───────────────────────────────────────────────────────────────

interface RowProps {
  label: string;
  values: (string | number | null | undefined)[];
  highlight?: boolean;
  cols: number;
}

function CompareRow({ label, values, highlight, cols }: RowProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `140px repeat(${cols}, 1fr)`,
        gap: 1,
        py: 0.75,
        px: 1,
        bgcolor: highlight ? 'action.hover' : 'transparent',
        borderRadius: 1,
        alignItems: 'center',
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.72rem' }}>
        {label}
      </Typography>
      {values.map((v, i) => (
        <Typography key={i} variant="caption" sx={{ fontSize: '0.75rem', textAlign: 'center' }}>
          {v ?? '—'}
        </Typography>
      ))}
    </Box>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  vehicles: VehicleItem[];
  onClose: () => void;
  onPurchase: (vehicle: VehicleItem) => void;
  onRemove: (id: string) => void;
  isMechanicDiscount: boolean;
}

export default function VehicleCompareModal({
  open,
  vehicles,
  onClose,
  onPurchase,
  onRemove,
  isMechanicDiscount,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const displayVehicles = isMobile ? vehicles.slice(0, 1) : vehicles;
  const cols = displayVehicles.length;

  if (vehicles.length === 0) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>
            🚗 Compare Vehicles
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="Close compare">
            <CloseIcon />
          </IconButton>
        </Stack>
        {isMobile && vehicles.length > 1 && (
          <Typography variant="caption" color="text.secondary">
            Showing 1 of {vehicles.length} selected (desktop shows all side-by-side)
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Header row — vehicle names */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `140px repeat(${cols}, 1fr)`,
            gap: 1,
            p: 2,
            pb: 1,
            bgcolor: 'grey.50',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box />
          {displayVehicles.map((v) => (
            <Box key={v.id} sx={{ textAlign: 'center', position: 'relative' }}>
              <IconButton
                size="small"
                onClick={() => onRemove(v.id)}
                sx={{ position: 'absolute', top: -8, right: -8 }}
                aria-label={`Remove ${v.name} from compare`}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                {v.name}
              </Typography>
              <Chip
                label={typeLabel(v.type)}
                size="small"
                sx={{ fontSize: '0.6rem', height: 18, mt: 0.25 }}
              />
              {(v.isCurrentPlayerVehicle || v.isCurrentSpouseVehicle) && (
                <Chip
                  label={v.isCurrentPlayerVehicle ? 'Yours' : 'Spouse'}
                  size="small"
                  color={v.isCurrentPlayerVehicle ? 'success' : 'secondary'}
                  sx={{ fontSize: '0.6rem', height: 18, mt: 0.25, ml: 0.5 }}
                />
              )}
            </Box>
          ))}
        </Box>

        {/* Comparison rows */}
        <Box sx={{ p: 1 }}>
          {/* Eligibility */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `140px repeat(${cols}, 1fr)`,
              gap: 1,
              py: 0.75,
              px: 1,
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.72rem' }}>
              Eligible
            </Typography>
            {displayVehicles.map((v) => (
              <Box key={v.id} sx={{ textAlign: 'center' }}>
                {v.eligible || v.isCurrentPlayerVehicle || v.isCurrentSpouseVehicle ? (
                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <BlockIcon sx={{ fontSize: 16, color: 'error.main' }} />
                )}
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 0.5 }} />

          {/* Basics */}
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 1, display: 'block', mb: 0.5, mt: 1 }}>
            BASICS
          </Typography>

          <CompareRow label="Type" values={displayVehicles.map((v) => typeLabel(v.type))} cols={cols} />
          <CompareRow label="Fuel" values={displayVehicles.map((v) => fuelLabel(v.fuelType))} highlight cols={cols} />
          <CompareRow label="Age" values={displayVehicles.map((v) => ageLabel(v.ageVariant))} cols={cols} />
          <CompareRow label="Capacity" values={displayVehicles.map((v) => `${v.passengerCapacity} seats`)} highlight cols={cols} />

          <Divider sx={{ my: 0.5 }} />

          {/* Costs */}
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 1, display: 'block', mb: 0.5, mt: 1 }}>
            COSTS
          </Typography>

          <CompareRow
            label="Purchase Price"
            values={displayVehicles.map((v) =>
              v.type === 'public_transit' ? '—' : v.purchasePrice ? fmt(v.purchasePrice) : '—'
            )}
            cols={cols}
          />
          <CompareRow
            label="Annual Cost"
            values={displayVehicles.map((v) =>
              v.type === 'public_transit' ? fmt(v.annualCost ?? 0) : '—'
            )}
            highlight
            cols={cols}
          />
          <CompareRow
            label="Insurance / yr"
            values={displayVehicles.map((v) =>
              v.estimatedAnnualCosts.insurance > 0 ? fmt(v.estimatedAnnualCosts.insurance) : '—'
            )}
            cols={cols}
          />
          <CompareRow
            label="Gas / yr"
            values={displayVehicles.map((v) =>
              v.estimatedAnnualCosts.gas > 0 ? fmt(v.estimatedAnnualCosts.gas) : '—'
            )}
            highlight
            cols={cols}
          />
          <CompareRow
            label={`Maintenance / yr${isMechanicDiscount ? ' 🔧' : ''}`}
            values={displayVehicles.map((v) =>
              v.type === 'bike' || v.type === 'public_transit'
                ? '—'
                : fmt(v.estimatedAnnualCosts.maintenance)
            )}
            cols={cols}
          />
          <CompareRow
            label="Total Annual"
            values={displayVehicles.map((v) => fmt(v.estimatedAnnualCosts.total))}
            highlight
            cols={cols}
          />

          {/* Restrictions */}
          {displayVehicles.some((v) => v.restrictedToArea || v.bikeAreaRestriction) && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 1, display: 'block', mb: 0.5, mt: 1 }}>
                RESTRICTIONS
              </Typography>
              <CompareRow
                label="Area Restricted"
                values={displayVehicles.map((v) => (v.restrictedToArea ? '⚠️ Yes' : '—'))}
                cols={cols}
              />
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onClose} size="small">
          Close
        </Button>
        {displayVehicles
          .filter((v) => v.eligible && !v.isCurrentPlayerVehicle && !v.isCurrentSpouseVehicle)
          .map((v) => (
            <Button
              key={v.id}
              size="small"
              variant="contained"
              onClick={() => {
                onPurchase(v);
                onClose();
              }}
            >
              {v.type === 'public_transit' ? 'Select' : 'Purchase'} {v.name}
            </Button>
          ))}
      </DialogActions>
    </Dialog>
  );
}
