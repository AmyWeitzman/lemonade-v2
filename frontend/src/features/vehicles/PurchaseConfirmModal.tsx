/**
 * PurchaseConfirmModal — confirm vehicle purchase with capacity validation info.
 * Requirements: Req 13
 */
import {
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Button, Alert, Typography, Stack, Chip,
  FormControlLabel, Switch,
} from '@mui/material';
import type { VehicleItem } from './types';

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

interface Props {
  open: boolean;
  vehicle: VehicleItem | null;
  playerMoney: number;
  isMarried: boolean;
  hadPreviousVehicle: boolean;
  forSpouse: boolean;
  onToggleForSpouse: (val: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

export default function PurchaseConfirmModal({
  open,
  vehicle,
  playerMoney,
  isMarried,
  hadPreviousVehicle,
  forSpouse,
  onToggleForSpouse,
  onConfirm,
  onClose,
  loading,
}: Props) {
  if (!vehicle) return null;

  const isPublicTransit = vehicle.type === 'public_transit';
  const cost = isPublicTransit ? (vehicle.annualCost ?? 0) : (vehicle.purchasePrice ?? 0);
  const canAfford = playerMoney >= cost;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {isPublicTransit ? 'Select' : 'Purchase'} {vehicle.name}?
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 1.5 }}>
          {isPublicTransit
            ? `Annual transit cost: ${fmt(cost)}/year`
            : `Purchase price: ${fmt(cost)}`}
        </DialogContentText>

        {/* Annual costs summary */}
        {!isPublicTransit && vehicle.type !== 'bike' && (
          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1.5 }}>
            {vehicle.estimatedAnnualCosts.insurance > 0 && (
              <Chip label={`🛡️ Insurance: ${fmt(vehicle.estimatedAnnualCosts.insurance)}/yr`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            )}
            {vehicle.estimatedAnnualCosts.gas > 0 && (
              <Chip label={`⛽ Gas: ${fmt(vehicle.estimatedAnnualCosts.gas)}/yr`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            )}
            <Chip label={`🔧 Maintenance: ${fmt(vehicle.estimatedAnnualCosts.maintenance)}/yr`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            <Chip label={`📊 Total: ${fmt(vehicle.estimatedAnnualCosts.total)}/yr`} size="small" sx={{ fontSize: '0.7rem', bgcolor: '#fff9c4' }} />
          </Stack>
        )}

        {/* For spouse toggle */}
        {isMarried && (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={forSpouse}
                onChange={(e) => onToggleForSpouse(e.target.checked)}
              />
            }
            label={<Typography variant="body2">Purchase for spouse</Typography>}
            sx={{ mb: 1 }}
          />
        )}

        {/* Stress warning */}
        {hadPreviousVehicle && !isPublicTransit && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            Changing vehicles adds <strong>+5% stress</strong>.
          </Alert>
        )}

        {/* Affordability warning */}
        {!canAfford && (
          <Alert severity="error" sx={{ mb: 1 }}>
            You cannot afford this vehicle. You have {fmt(playerMoney)}, need {fmt(cost)}.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading || !canAfford}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
