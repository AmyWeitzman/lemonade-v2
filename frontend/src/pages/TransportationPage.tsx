/**
 * TransportationPage — "You Won't Get A 🍋"
 *
 * Vehicle catalog with filters, compare feature, purchase/sell flow,
 * and owned vehicles section showing player + spouse vehicles.
 *
 * Requirements: Req 13
 */
import { useState } from 'react';
import {
  Box, Typography, Grid, Stack, Alert, Skeleton, Chip, Divider,
  Button, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Snackbar, Badge, Paper,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import BuildIcon from '@mui/icons-material/Build';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootState } from '../store';
import {
  setVehicleFilters,
  resetVehicleFilters,
  toggleVehicleCompare,
  clearVehicleCompare,
} from '../features/vehicles/vehiclesSlice';
import VehicleCard from '../features/vehicles/VehicleCard';
import VehicleFiltersPanel from '../features/vehicles/VehicleFilters';
import VehicleCompareModal from '../features/vehicles/VehicleCompareModal';
import PurchaseConfirmModal from '../features/vehicles/PurchaseConfirmModal';
import SellConfirmModal from '../features/vehicles/SellConfirmModal';
import type { VehicleItem, OwnedVehicleEntry } from '../features/vehicles/types';
import api from '../lib/api';

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

function buildQueryParams(
  filters: RootState['vehicles']['filters'],
  gameSessionId: string,
): Record<string, string> {
  const params: Record<string, string> = { gameSessionId };
  if (filters.maxCost !== null) params.maxCost = String(filters.maxCost);
  if (filters.minPeople !== null) params.minPeople = String(filters.minPeople);
  if (filters.carOnly) params.carOnly = 'true';
  if (filters.nonCarOnly) params.nonCarOnly = 'true';
  if (filters.fuelType) params.fuelType = filters.fuelType;
  if (filters.ageVariant) params.ageVariant = filters.ageVariant;
  return params;
}

// ─── Owned Vehicle Panel ──────────────────────────────────────────────────────

interface OwnedVehiclePanelProps {
  entry: OwnedVehicleEntry;
  label: string;
  onSell: (vehicle: VehicleItem, forSpouse: boolean) => void;
}

function OwnedVehiclePanel({ entry, label, onSell }: OwnedVehiclePanelProps) {
  const { vehicle, ownership, annualCosts, depreciatedValue, isMechanicDiscount } = entry;
  const isPublicTransit = vehicle.type === 'public_transit';
  const isBike = vehicle.type === 'bike';
  const canSell = !isPublicTransit && !isBike;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        borderColor: ownership.isSpouseVehicle ? 'secondary.main' : 'success.main',
        bgcolor: ownership.isSpouseVehicle ? 'secondary.50' : 'success.50',
        flex: 1,
        minWidth: 240,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <DirectionsCarIcon color={ownership.isSpouseVehicle ? 'secondary' : 'success'} fontSize="small" />
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              {vehicle.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </Box>
        </Stack>
        {canSell && (
          <Button
            size="small"
            variant="outlined"
            color="warning"
            onClick={() => onSell(vehicle, ownership.isSpouseVehicle)}
            sx={{ fontSize: '0.7rem' }}
          >
            Sell
          </Button>
        )}
      </Stack>

      {/* Vehicle info chips */}
      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
        <Chip label={typeLabel(vehicle.type)} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
        {vehicle.fuelType !== 'none' && (
          <Chip label={fuelLabel(vehicle.fuelType)} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
        )}
        <Chip label={ageLabel(vehicle.ageVariant)} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
        <Chip label={`👥 ${vehicle.passengerCapacity} seats`} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#f5f5f5' }} />
        <Chip label={`${ownership.yearsOwned} yr${ownership.yearsOwned !== 1 ? 's' : ''} owned`} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#f5f5f5' }} />
      </Stack>

      {/* Annual cost breakdown */}
      {!isBike && !isPublicTransit && (
        <Stack spacing={0.25}>
          {annualCosts.insurance > 0 && (
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">🛡️ Insurance</Typography>
              <Typography variant="caption">{fmt(annualCosts.insurance)}/yr</Typography>
            </Stack>
          )}
          {annualCosts.gas > 0 && (
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">⛽ Gas</Typography>
              <Typography variant="caption">{fmt(annualCosts.gas)}/yr</Typography>
            </Stack>
          )}
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              🔧 Maintenance{isMechanicDiscount ? ' 🔧' : ''}
            </Typography>
            <Typography variant="caption">{fmt(annualCosts.maintenance)}/yr</Typography>
          </Stack>
          <Divider sx={{ my: 0.25 }} />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" fontWeight={700}>Total annual</Typography>
            <Typography variant="caption" fontWeight={700}>{fmt(annualCosts.total)}/yr</Typography>
          </Stack>
        </Stack>
      )}

      {isPublicTransit && (
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">🚌 Annual cost</Typography>
          <Typography variant="caption" fontWeight={700}>{fmt(vehicle.annualCost ?? 0)}/yr</Typography>
        </Stack>
      )}

      {/* Depreciated value */}
      {depreciatedValue !== null && (
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">📉 Current value</Typography>
          <Typography variant="caption" color="warning.main" fontWeight={600}>{fmt(depreciatedValue)}</Typography>
        </Stack>
      )}

      {isMechanicDiscount && !isBike && !isPublicTransit && (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
          <BuildIcon sx={{ fontSize: 12, color: 'success.main' }} />
          <Typography variant="caption" color="success.main" sx={{ fontSize: '0.68rem' }}>
            Mechanic discount applied (80% off maintenance)
          </Typography>
        </Stack>
      )}
    </Paper>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TransportationPage() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { playerId, gameSessionId, money, isInGame } = useSelector((s: RootState) => ({
    playerId: s.auth.playerId,
    gameSessionId: s.auth.gameSessionId,
    money: s.auth.money,
    isInGame: s.auth.isInGame,
  }));
  const { filters, compareIds } = useSelector((s: RootState) => s.vehicles);

  const [toast, setToast] = useState<{
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

  // Purchase flow state
  const [pendingPurchase, setPendingPurchase] = useState<VehicleItem | null>(null);
  const [forSpouse, setForSpouse] = useState(false);

  // Sell flow state
  const [pendingSell, setPendingSell] = useState<{ vehicle: VehicleItem; forSpouse: boolean } | null>(null);

  // Compare modal
  const [compareOpen, setCompareOpen] = useState(false);

  // ── Fetch vehicle catalog ──────────────────────────────────────────────────
  const queryParams = gameSessionId ? buildQueryParams(filters, gameSessionId) : null;

  const { data: vehicleData, isLoading, error } = useQuery({
    queryKey: ['vehicles', queryParams],
    queryFn: async () => {
      if (!queryParams) throw new Error('No session');
      const res = await api.get('/vehicles', { params: queryParams });
      return res.data as { vehicles: VehicleItem[] };
    },
    enabled: !!gameSessionId && !!playerId,
    staleTime: 30_000,
  });

  // ── Fetch compare vehicles ─────────────────────────────────────────────────
  const { data: compareData } = useQuery({
    queryKey: ['vehiclesCompare', compareIds, gameSessionId],
    queryFn: async () => {
      if (!gameSessionId || compareIds.length === 0) return { compare: [] };
      const res = await api.get('/vehicles', {
        params: { gameSessionId, compare: compareIds.join(',') },
      });
      return res.data as { compare: VehicleItem[] };
    },
    enabled: !!gameSessionId && compareIds.length > 0,
    staleTime: 30_000,
  });

  // ── Fetch owned vehicles ───────────────────────────────────────────────────
  const { data: ownedData } = useQuery({
    queryKey: ['vehiclesOwned', playerId, gameSessionId],
    queryFn: async () => {
      const res = await api.get('/vehicles/owned', { params: { gameSessionId } });
      return res.data as {
        player: OwnedVehicleEntry | null;
        spouse: OwnedVehicleEntry | null;
        isMechanic: boolean;
      };
    },
    enabled: !!playerId && !!gameSessionId,
    staleTime: 15_000,
  });

  // ── Fetch player data for money/marital status ─────────────────────────────
  const { data: playerData } = useQuery({
    queryKey: ['playerBasic', playerId, gameSessionId],
    queryFn: async () => {
      const res = await api.get(`/players/${playerId}`, { params: { gameSessionId } });
      return res.data as {
        player: {
          money: number;
          maritalStatus: string;
          vehicleOwnerships: Array<{ endAge: null | number; isSpouseVehicle: boolean }>;
        };
      };
    },
    enabled: !!playerId && !!gameSessionId,
    staleTime: 15_000,
  });

  const playerMoney = playerData?.player?.money ?? money;
  const isMarried = playerData?.player?.maritalStatus === 'married';
  const isMechanic = ownedData?.isMechanic ?? false;

  const hadPreviousVehicle = !!(ownedData?.player);
  const hadPreviousSpouseVehicle = !!(ownedData?.spouse);

  // ── Purchase mutation ──────────────────────────────────────────────────────
  const purchaseMutation = useMutation({
    mutationFn: async ({ vehicleId, forSpouse }: { vehicleId: string; forSpouse: boolean }) => {
      const res = await api.post(`/vehicles/${vehicleId}/purchase`, {
        gameSessionId,
        forSpouse,
      });
      return res.data as {
        ownership: unknown;
        purchasePrice: number;
        stressAdded: number;
        forSpouse: boolean;
      };
    },
    onSuccess: (data) => {
      const msgs: string[] = ['Vehicle purchased!'];
      if (data.stressAdded > 0) msgs.push(`+${data.stressAdded}% stress from changing vehicles.`);
      setToast({ message: msgs.join(' '), severity: 'success' });
      setPendingPurchase(null);
      setForSpouse(false);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehiclesOwned'] });
      queryClient.invalidateQueries({ queryKey: ['playerBasic'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setToast({ message: msg ?? 'Failed to purchase vehicle', severity: 'error' });
      setPendingPurchase(null);
      setForSpouse(false);
    },
  });

  // ── Sell mutation ──────────────────────────────────────────────────────────
  const sellMutation = useMutation({
    mutationFn: async ({ vehicleId, forSpouse }: { vehicleId: string; forSpouse: boolean }) => {
      const res = await api.post(`/vehicles/${vehicleId}/sell`, {
        gameSessionId,
        forSpouse,
      });
      return res.data as {
        salePrice: number;
        purchasePrice: number;
        yearsOwned: number;
        depreciation: number;
        forSpouse: boolean;
      };
    },
    onSuccess: (data) => {
      setToast({
        message: `Vehicle sold for ${fmt(data.salePrice)}. Please select a new vehicle.`,
        severity: 'success',
      });
      setPendingSell(null);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehiclesOwned'] });
      queryClient.invalidateQueries({ queryKey: ['playerBasic'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setToast({ message: msg ?? 'Failed to sell vehicle', severity: 'error' });
      setPendingSell(null);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePurchase = (vehicle: VehicleItem) => {
    setPendingPurchase(vehicle);
    setForSpouse(false);
  };

  const handleSell = (vehicle: VehicleItem, isSpouse: boolean) => {
    setPendingSell({ vehicle, forSpouse: isSpouse });
  };

  const handleConfirmPurchase = () => {
    if (!pendingPurchase) return;
    purchaseMutation.mutate({ vehicleId: pendingPurchase.id, forSpouse });
  };

  const handleConfirmSell = () => {
    if (!pendingSell) return;
    sellMutation.mutate({ vehicleId: pendingSell.vehicle.id, forSpouse: pendingSell.forSpouse });
  };

  const allVehicles = vehicleData?.vehicles ?? [];
  const compareVehicles = compareData?.compare ?? [];

  // Apply eligible-only filter client-side
  const displayVehicles = filters.eligibleOnly
    ? allVehicles.filter((v) => v.eligible || v.isCurrentPlayerVehicle || v.isCurrentSpouseVehicle)
    : allVehicles;

  // Sort by cost (low to high) — default
  const sortedVehicles = [...displayVehicles].sort((a, b) => {
    const costA = a.type === 'public_transit' ? (a.annualCost ?? 0) : (a.purchasePrice ?? 0);
    const costB = b.type === 'public_transit' ? (b.annualCost ?? 0) : (b.purchasePrice ?? 0);
    return costA - costB;
  });

  const eligibleCount = allVehicles.filter((v) => v.eligible).length;

  // Get the owned entry for the sell modal
  const sellOwnedEntry = pendingSell
    ? pendingSell.forSpouse
      ? ownedData?.spouse ?? null
      : ownedData?.player ?? null
    : null;

  if (!gameSessionId || !isInGame) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You must be in an active game session to view transportation.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            🚗 You Won't Get A 🍋
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Browse vehicles — sorted by cost (low to high)
          </Typography>
        </Box>

        {/* Compare button */}
        {compareIds.length > 0 && (
          <Badge badgeContent={compareIds.length} color="primary">
            <Button
              variant="outlined"
              color="primary"
              startIcon={<CompareArrowsIcon />}
              onClick={() => setCompareOpen(true)}
              size="small"
            >
              Compare
            </Button>
          </Badge>
        )}
      </Stack>

      {/* Owned vehicles section */}
      {(ownedData?.player || ownedData?.spouse) && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            🚗 Your Vehicles
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={2}>
            {ownedData.player && (
              <OwnedVehiclePanel
                entry={ownedData.player}
                label="Your vehicle"
                onSell={handleSell}
              />
            )}
            {ownedData.spouse && (
              <OwnedVehiclePanel
                entry={ownedData.spouse}
                label="Spouse's vehicle"
                onSell={handleSell}
              />
            )}
          </Stack>
        </Box>
      )}

      {/* Mechanic discount notice */}
      {isMechanic && (
        <Alert severity="success" icon={<BuildIcon />} sx={{ mb: 2 }}>
          <strong>Mechanic discount active!</strong> You receive 80% off vehicle maintenance costs.
        </Alert>
      )}

      {/* Filters */}
      <VehicleFiltersPanel
        filters={filters}
        onChange={(partial) => dispatch(setVehicleFilters(partial))}
        onReset={() => dispatch(resetVehicleFilters())}
      />

      {/* Results summary */}
      {!isLoading && !error && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {sortedVehicles.length} vehicle{sortedVehicles.length !== 1 ? 's' : ''} found
          </Typography>
          {!filters.eligibleOnly && eligibleCount > 0 && (
            <>
              <Divider orientation="vertical" flexItem />
              <Typography variant="body2" color="success.main">
                {eligibleCount} eligible
              </Typography>
            </>
          )}
          {compareIds.length > 0 && (
            <>
              <Divider orientation="vertical" flexItem />
              <Typography variant="body2" color="primary.main">
                {compareIds.length} selected for compare
              </Typography>
              <Button
                size="small"
                variant="text"
                color="primary"
                onClick={() => dispatch(clearVehicleCompare())}
                sx={{ fontSize: '0.7rem', minWidth: 0, p: 0.25 }}
              >
                Clear
              </Button>
            </>
          )}
        </Stack>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load vehicles. Please try again.
        </Alert>
      )}

      {/* Vehicle grid */}
      <Grid container spacing={2}>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Skeleton variant="rounded" height={260} />
              </Grid>
            ))
          : sortedVehicles.map((vehicle) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={vehicle.id}>
                <VehicleCard
                  vehicle={vehicle}
                  inCompare={compareIds.includes(vehicle.id)}
                  onToggleCompare={(id) => dispatch(toggleVehicleCompare(id))}
                  onPurchase={handlePurchase}
                  onSell={(v) => handleSell(v, v.isCurrentSpouseVehicle)}
                  purchasing={purchaseMutation.isPending && pendingPurchase?.id === vehicle.id}
                  selling={sellMutation.isPending && pendingSell?.vehicle.id === vehicle.id}
                  isMechanicDiscount={isMechanic}
                />
              </Grid>
            ))}
      </Grid>

      {/* Empty state */}
      {!isLoading && !error && sortedVehicles.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No vehicles found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try adjusting your filters or turning off "Eligible only"
          </Typography>
          <Button variant="outlined" onClick={() => dispatch(resetVehicleFilters())}>
            Reset filters
          </Button>
        </Box>
      )}

      {/* Purchase confirm modal */}
      <PurchaseConfirmModal
        open={!!pendingPurchase}
        vehicle={pendingPurchase}
        playerMoney={playerMoney}
        isMarried={isMarried}
        hadPreviousVehicle={forSpouse ? hadPreviousSpouseVehicle : hadPreviousVehicle}
        forSpouse={forSpouse}
        onToggleForSpouse={setForSpouse}
        onConfirm={handleConfirmPurchase}
        onClose={() => {
          setPendingPurchase(null);
          setForSpouse(false);
        }}
        loading={purchaseMutation.isPending}
      />

      {/* Sell confirm modal */}
      <SellConfirmModal
        open={!!pendingSell}
        vehicle={pendingSell?.vehicle ?? null}
        ownedEntry={sellOwnedEntry}
        forSpouse={pendingSell?.forSpouse ?? false}
        onConfirm={handleConfirmSell}
        onClose={() => setPendingSell(null)}
        loading={sellMutation.isPending}
      />

      {/* Compare modal */}
      <VehicleCompareModal
        open={compareOpen}
        vehicles={
          compareVehicles.length > 0
            ? compareVehicles
            : allVehicles.filter((v) => compareIds.includes(v.id))
        }
        onClose={() => setCompareOpen(false)}
        onPurchase={handlePurchase}
        onRemove={(id) => dispatch(toggleVehicleCompare(id))}
        isMechanicDiscount={isMechanic}
      />

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
