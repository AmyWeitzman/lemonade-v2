/**
 * SellConfirmModal — confirm vehicle sale showing depreciated value calculation.
 * Requirements: Req 13
 */
import {
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Button, Typography, Stack, Chip, Divider,
} from '@mui/material';
import type { VehicleItem, OwnedVehicleEntry } from './types';

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

interface Props {
  open: boolean;
  vehicle: VehicleItem | null;
  ownedEntry: OwnedVehicleEntry | null;
  forSpouse: boolean;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

export default function SellConfirmModal({
  open,
  vehicle,
  ownedEntry,
  forSpouse,
  onConfirm,
  onClose,
  loading,
}: Props) {
  if (!vehicle || !ownedEntry) return null;

  const purchasePrice = ownedEntry.ownership.purchasePrice ?? 0;
  const depreciatedValue = ownedEntry.depreciatedValue ?? 0;
  const yearsOwned = ownedEntry.ownership.yearsOwned;
  const depreciation = purchasePrice - depreciatedValue;
  const depreciationPct = purchasePrice > 0 ? Math.round((depreciation / purchasePrice) * 100) : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Sell {vehicle.name}{forSpouse ? " (Spouse's)" : ''}?
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 1.5 }}>
          You will receive the depreciated value of your vehicle.
        </DialogContentText>

        <Stack spacing={1} sx={{ mb: 1.5 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Original purchase price</Typography>
            <Typography variant="body2" fontWeight={600}>{fmt(purchasePrice)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Years owned</Typography>
            <Typography variant="body2">{yearsOwned} year{yearsOwned !== 1 ? 's' : ''}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Depreciation ({depreciationPct}%)</Typography>
            <Typography variant="body2" color="error.main">-{fmt(depreciation)}</Typography>
          </Stack>
          <Divider />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" fontWeight={700}>Sale proceeds</Typography>
            <Typography variant="body2" fontWeight={700} color="success.main">{fmt(depreciatedValue)}</Typography>
          </Stack>
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          <Chip label={`🛡️ Insurance paid: ${fmt(ownedEntry.ownership.totalInsurancePaid)}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
          <Chip label={`🔧 Maintenance paid: ${fmt(ownedEntry.ownership.totalMaintenancePaid)}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={onConfirm}
          disabled={loading}
        >
          Sell for {fmt(depreciatedValue)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
