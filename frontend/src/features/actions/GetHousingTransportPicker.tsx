/**
 * GetHousingTransportPicker — dialog for choosing the home / vehicle attached to
 * a "Get Housing" / "Get Transportation" cart line. Reuses the housing / vehicle
 * catalog endpoints (already eligibility-annotated for this player).
 */
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  Radio, FormControlLabel, RadioGroup, Typography, Box, CircularProgress,
  ToggleButtonGroup, ToggleButton, Alert,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { setCartItemSelection } from './actionsSlice';
import api from '../../lib/api';

type Kind = 'housing' | 'transport';

interface HousingOption {
  id: string;
  name: string;
  location: string; // 'city' | 'suburb' | 'both'
  isRental: boolean;
  rentPerYear: number | null;
  purchasePrice: number | null;
  eligible: boolean;
  eligibilityReasons: string[];
}
interface VehicleOption {
  id: string;
  name: string;
  type: string;
  purchasePrice: number | null;
  passengerCapacity: number;
  eligible: boolean;
  eligibilityReason?: string;
}

function fmt(n: number | null | undefined): string {
  return n == null ? '—' : '$' + Math.round(n).toLocaleString();
}

interface Props {
  open: boolean;
  onClose: () => void;
  kind: Kind;
  actionId: string;
  /** Currently chosen id, to preselect. */
  currentId?: string;
  currentLocation?: 'city' | 'suburb';
}

export default function GetHousingTransportPicker({
  open, onClose, kind, actionId, currentId, currentLocation,
}: Props) {
  const dispatch = useDispatch();
  const { gameSessionId } = useSelector((s: RootState) => s.auth);
  const [choice, setChoice] = useState<string>(currentId ?? '');
  const [location, setLocation] = useState<'city' | 'suburb'>(currentLocation ?? 'city');

  const housingQ = useQuery({
    queryKey: ['housing', gameSessionId, 'picker'],
    queryFn: async () => {
      const { data } = await api.get('/housing', { params: { gameSessionId, showAll: true } });
      return data.housing as HousingOption[];
    },
    enabled: open && kind === 'housing' && !!gameSessionId,
  });
  const vehicleQ = useQuery({
    queryKey: ['vehicles', gameSessionId, 'picker'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { gameSessionId } });
      return data.vehicles as VehicleOption[];
    },
    enabled: open && kind === 'transport' && !!gameSessionId,
  });

  const loading = kind === 'housing' ? housingQ.isLoading : vehicleQ.isLoading;
  const housingItems = housingQ.data ?? [];
  const vehicleItems = vehicleQ.data ?? [];

  const selectedHousing = housingItems.find((h) => h.id === choice);
  const needsLocation = kind === 'housing' && selectedHousing?.location === 'both';

  const confirm = () => {
    if (!choice) return;
    if (kind === 'housing') {
      const h = housingItems.find((x) => x.id === choice);
      dispatch(setCartItemSelection({
        actionId,
        selectedHousingId: choice,
        housingLocation: needsLocation ? location : undefined,
        selectedHousingLabel: h?.name,
      }));
    } else {
      const v = vehicleItems.find((x) => x.id === choice);
      dispatch(setCartItemSelection({
        actionId,
        selectedVehicleId: choice,
        selectedVehicleLabel: v?.name,
      }));
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {kind === 'housing' ? '🏠 Choose your housing' : '🚗 Choose your transportation'}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={24} /></Box>
        ) : (
          <RadioGroup value={choice} onChange={(e) => setChoice(e.target.value)}>
            <Stack spacing={0.5}>
              {kind === 'housing'
                ? housingItems.map((h) => (
                    <FormControlLabel
                      key={h.id}
                      value={h.id}
                      disabled={!h.eligible}
                      control={<Radio size="small" />}
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {h.name}{' '}
                            <Typography component="span" variant="caption" color="text.secondary">
                              {h.isRental ? `${fmt(h.rentPerYear)}/yr rent` : `${fmt(h.purchasePrice)} to buy`}
                            </Typography>
                          </Typography>
                          {!h.eligible && h.eligibilityReasons[0] && (
                            <Typography variant="caption" color="error.main">{h.eligibilityReasons[0]}</Typography>
                          )}
                        </Box>
                      }
                    />
                  ))
                : vehicleItems.map((v) => (
                    <FormControlLabel
                      key={v.id}
                      value={v.id}
                      disabled={!v.eligible}
                      control={<Radio size="small" />}
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {v.name}{' '}
                            <Typography component="span" variant="caption" color="text.secondary">
                              {v.type === 'public_transit' ? 'annual pass' : `${fmt(v.purchasePrice)} to buy`} · seats {v.passengerCapacity}
                            </Typography>
                          </Typography>
                          {!v.eligible && v.eligibilityReason && (
                            <Typography variant="caption" color="error.main">{v.eligibilityReason}</Typography>
                          )}
                        </Box>
                      }
                    />
                  ))}
            </Stack>
          </RadioGroup>
        )}

        {needsLocation && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              This option is available in both areas — pick one:
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={location}
              onChange={(_, v) => v && setLocation(v)}
            >
              <ToggleButton value="city">🏙️ City</ToggleButton>
              <ToggleButton value="suburb">🏡 Suburb</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        <Alert severity="info" sx={{ mt: 2, py: 0.5, fontSize: '0.75rem' }}>
          This will be finalized at checkout — {kind === 'housing'
            ? 'any purchase price (and sale of your current home) is applied then.'
            : 'the purchase price is charged then.'}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={confirm} disabled={!choice}>
          Use this {kind === 'housing' ? 'home' : 'vehicle'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
