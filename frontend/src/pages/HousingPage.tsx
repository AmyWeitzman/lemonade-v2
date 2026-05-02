/**
 * HousingPage — "Home Sour Home"
 *
 * Housing catalog with filters, compare feature, selection flow,
 * home improvements UI, and current home value display.
 *
 * Requirements: Req 12, Req 42
 */
import { useState, useCallback } from 'react';
import {
  Box, Typography, Grid, Stack, Alert, Skeleton, Chip, Divider,
  Button, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Snackbar, Badge, Paper,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import HomeIcon from '@mui/icons-material/Home';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootState } from '../store';
import {
  setHousingFilters,
  resetHousingFilters,
  toggleCompare,
  clearCompare,
} from '../features/housing/housingSlice';
import HousingCard from '../features/housing/HousingCard';
import HousingFilters from '../features/housing/HousingFilters';
import CompareModal from '../features/housing/CompareModal';
import ImprovementsModal from '../features/housing/ImprovementsModal';
import type { HousingItem, HousingOwnership, HomeImprovement } from '../features/housing/types';
import api from '../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

function buildQueryParams(
  filters: RootState['housing']['filters'],
  gameSessionId: string,
): Record<string, string> {
  const params: Record<string, string> = { gameSessionId };
  if (filters.location) params.location = filters.location;
  if (filters.rentalOnly) params.rentalOnly = 'true';
  if (filters.buyOnly) params.buyOnly = 'true';
  if (filters.maxCost !== null) params.maxCost = String(filters.maxCost);
  if (filters.minCapacity !== null) params.minCapacity = String(filters.minCapacity);
  if (filters.showAll) params.showAll = 'true';
  return params;
}

// ─── Location Dialog ──────────────────────────────────────────────────────────

interface LocationDialogProps {
  open: boolean;
  housingName: string;
  onConfirm: (location: 'city' | 'suburb') => void;
  onClose: () => void;
  loading: boolean;
}

function LocationDialog({ open, housingName, onConfirm, onClose, loading }: LocationDialogProps) {
  const [loc, setLoc] = useState<'city' | 'suburb'>('city');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Choose Location</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          <strong>{housingName}</strong> is available in both city and suburb. Where would you like
          to live?
        </DialogContentText>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant={loc === 'city' ? 'contained' : 'outlined'}
            onClick={() => setLoc('city')}
            fullWidth
          >
            🏙️ City
          </Button>
          <Button
            size="small"
            variant={loc === 'suburb' ? 'contained' : 'outlined'}
            onClick={() => setLoc('suburb')}
            fullWidth
          >
            🏡 Suburb
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => onConfirm(loc)} disabled={loading}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Confirm Select Dialog ────────────────────────────────────────────────────

interface ConfirmSelectDialogProps {
  open: boolean;
  housing: HousingItem | null;
  hasCurrentHome: boolean;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

function ConfirmSelectDialog({
  open,
  housing,
  hasCurrentHome,
  onConfirm,
  onClose,
  loading,
}: ConfirmSelectDialogProps) {
  if (!housing) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{housing.isRental ? 'Rent' : 'Buy'} {housing.name}?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {housing.isRental
            ? `Rent: ${fmt(housing.rentPerYear ?? 0)}/year`
            : `Purchase price: ${fmt(housing.purchasePrice ?? 0)}`}
        </DialogContentText>
        {hasCurrentHome && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            Moving to a new home adds <strong>+10% stress</strong>.
          </Alert>
        )}
        {housing.warnings.length > 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {housing.warnings.map((w, i) => (
              <Typography key={i} variant="caption" display="block">
                ⚠️ {w}
              </Typography>
            ))}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={loading}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HousingPage() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { playerId, gameSessionId, money } = useSelector((s: RootState) => ({
    playerId: s.auth.playerId,
    gameSessionId: s.auth.gameSessionId,
    money: s.auth.money,
  }));
  const { filters, compareIds } = useSelector((s: RootState) => s.housing);

  const [toast, setToast] = useState<{
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

  // Selection flow state
  const [pendingSelect, setPendingSelect] = useState<HousingItem | null>(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<'city' | 'suburb' | null>(null);

  // Compare modal
  const [compareOpen, setCompareOpen] = useState(false);

  // Improvements modal
  const [improvingHousing, setImprovingHousing] = useState<HousingItem | null>(null);

  // ── Fetch housing catalog ──────────────────────────────────────────────────
  const queryParams = gameSessionId ? buildQueryParams(filters, gameSessionId) : null;

  const { data: housingData, isLoading, error } = useQuery({
    queryKey: ['housing', queryParams],
    queryFn: async () => {
      if (!queryParams) throw new Error('No session');
      const res = await api.get('/housing', { params: queryParams });
      return res.data as { housing: HousingItem[] };
    },
    enabled: !!gameSessionId && !!playerId,
    staleTime: 30_000,
  });

  // ── Fetch compare housing ──────────────────────────────────────────────────
  const { data: compareData } = useQuery({
    queryKey: ['housingCompare', compareIds, gameSessionId],
    queryFn: async () => {
      if (!gameSessionId || compareIds.length === 0) return { compare: [] };
      const res = await api.get('/housing', {
        params: { gameSessionId, compare: compareIds.join(',') },
      });
      return res.data as { compare: HousingItem[] };
    },
    enabled: !!gameSessionId && compareIds.length > 0,
    staleTime: 30_000,
  });

  // ── Fetch player housing ownership ────────────────────────────────────────
  const { data: playerData } = useQuery({
    queryKey: ['playerHousing', playerId, gameSessionId],
    queryFn: async () => {
      const res = await api.get(`/players/${playerId}`, { params: { gameSessionId } });
      return res.data as {
        player: {
          age: number;
          money: number;
          housingOwnerships: Array<
            HousingOwnership & {
              housing: HousingItem;
            }
          >;
        };
      };
    },
    enabled: !!playerId && !!gameSessionId,
    staleTime: 15_000,
  });

  // ── Fetch session for market value calculation ─────────────────────────────
  const { data: sessionData } = useQuery({
    queryKey: ['sessionInflation', gameSessionId],
    queryFn: async () => {
      const res = await api.get(`/sessions/${gameSessionId}`);
      return res.data as {
        session: {
          currentYear: number;
          inflationRates: Array<{ year: number; housing: number }>;
        };
      };
    },
    enabled: !!gameSessionId,
    staleTime: 60_000,
  });

  const currentOwnership = playerData?.player?.housingOwnerships?.find(
    (o) => !o.endAge,
  ) ?? null;

  const playerAge = playerData?.player?.age ?? 18;
  const playerMoney = playerData?.player?.money ?? money;

  // Calculate current market value for owned homes
  const currentMarketValue = useCallback((): number => {
    if (!currentOwnership || currentOwnership.isRental) return 0;
    const purchasePrice = currentOwnership.purchasePrice ?? 0;
    const improvements = (currentOwnership.improvements ?? []) as HomeImprovement[];
    const inflationRates = sessionData?.session?.inflationRates ?? [];
    const currentYear = sessionData?.session?.currentYear ?? 0;
    const purchaseYear = currentYear - (currentOwnership.yearsLived ?? 0);

    let multiplier = 1;
    for (const rate of inflationRates) {
      if (rate.year > purchaseYear && rate.year <= currentYear) {
        multiplier *= 1 + rate.housing;
      }
    }

    const improvementValue = improvements.reduce((sum, imp) => sum + imp.valueIncrease, 0);
    return purchasePrice * multiplier + improvementValue;
  }, [currentOwnership, sessionData]);

  // ── Select housing mutation ────────────────────────────────────────────────
  const selectMutation = useMutation({
    mutationFn: async ({
      housingId,
      location,
    }: {
      housingId: string;
      location?: 'city' | 'suburb';
    }) => {
      const res = await api.post(`/housing/${housingId}/select`, {
        gameSessionId,
        ...(location ? { location } : {}),
      });
      return res.data as {
        ownership: HousingOwnership;
        saleProceeds: number;
        stressAdded: number;
        locationChanged: boolean;
        warnings: string[];
      };
    },
    onSuccess: (data) => {
      const msgs: string[] = ['Housing selected!'];
      if (data.stressAdded > 0) msgs.push(`+${data.stressAdded}% stress from moving.`);
      if (data.saleProceeds > 0) msgs.push(`Previous home sold for ${fmt(data.saleProceeds)}.`);
      setToast({ message: msgs.join(' '), severity: 'success' });
      setPendingSelect(null);
      setPendingLocation(null);
      setConfirmDialogOpen(false);
      setLocationDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['housing'] });
      queryClient.invalidateQueries({ queryKey: ['playerHousing'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string; reasons?: string[] } } })
        ?.response?.data;
      const text = msg?.reasons?.join(', ') ?? msg?.error ?? 'Failed to select housing';
      setToast({ message: text, severity: 'error' });
      setPendingSelect(null);
      setConfirmDialogOpen(false);
      setLocationDialogOpen(false);
    },
  });

  // ── Improvements mutation ──────────────────────────────────────────────────
  const improveMutation = useMutation({
    mutationFn: async ({
      type,
      investmentAmount,
    }: {
      type: 'remodel' | 'pool' | 'solar_panels';
      investmentAmount?: number;
    }) => {
      const res = await api.post('/housing/improvements', {
        gameSessionId,
        type,
        ...(investmentAmount !== undefined ? { investmentAmount } : {}),
      });
      return res.data as {
        improvement: HomeImprovement;
        cost: number;
        valueIncrease: number;
        annualMaintenanceCost?: number;
      };
    },
    onSuccess: (data) => {
      const typeLabels: Record<string, string> = {
        remodel: 'Remodel',
        pool: 'Pool',
        solar_panels: 'Solar Panels',
      };
      const label = typeLabels[data.improvement.type] ?? data.improvement.type;
      setToast({
        message: `${label} applied! Home value +${fmt(data.valueIncrease)}. Cost: ${fmt(data.cost)}.`,
        severity: 'success',
      });
      setImprovingHousing(null);
      queryClient.invalidateQueries({ queryKey: ['playerHousing'] });
      queryClient.invalidateQueries({ queryKey: ['housing'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setToast({ message: msg ?? 'Failed to apply improvement', severity: 'error' });
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectHousing = (housing: HousingItem) => {
    setPendingSelect(housing);
    if (housing.location === 'both') {
      setLocationDialogOpen(true);
    } else {
      setConfirmDialogOpen(true);
    }
  };

  const handleLocationConfirm = (location: 'city' | 'suburb') => {
    setPendingLocation(location);
    setLocationDialogOpen(false);
    setConfirmDialogOpen(true);
  };

  const handleConfirmSelect = () => {
    if (!pendingSelect) return;
    selectMutation.mutate({
      housingId: pendingSelect.id,
      location: pendingLocation ?? undefined,
    });
  };

  const allHousing = housingData?.housing ?? [];
  const compareHousing = compareData?.compare ?? [];

  // Apply eligible-only filter client-side
  const displayHousing = filters.eligibleOnly
    ? allHousing.filter((h) => h.eligible || h.isCurrentHome)
    : allHousing;

  const eligibleCount = allHousing.filter((h) => h.eligible).length;
  const hasCurrentHome = !!currentOwnership;

  if (!gameSessionId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You must be in an active game session to view housing.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            🏠 Home Sour Home
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Find your perfect home — sorted by cost (low to high)
          </Typography>
        </Box>

        {/* Compare button */}
        {compareIds.length > 0 && (
          <Badge badgeContent={compareIds.length} color="secondary">
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CompareArrowsIcon />}
              onClick={() => setCompareOpen(true)}
              size="small"
            >
              Compare
            </Button>
          </Badge>
        )}
      </Stack>

      {/* Current home summary */}
      {currentOwnership && (
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 2, borderRadius: 2, borderColor: 'success.main', bgcolor: 'success.50' }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <HomeIcon color="success" />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  {currentOwnership.housing?.name ?? 'Current Home'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentOwnership.isRental ? '🔑 Rental' : '🏦 Owned'} ·{' '}
                  {currentOwnership.chosenLocation === 'city' ? '🏙️ City' : '🏡 Suburb'} ·{' '}
                  {currentOwnership.yearsLived} year{currentOwnership.yearsLived !== 1 ? 's' : ''} lived
                </Typography>
              </Box>
            </Stack>

            {!currentOwnership.isRental && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <TrendingUpIcon color="success" fontSize="small" />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Current Market Value
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="success.main">
                    {fmt(currentMarketValue())}
                  </Typography>
                </Box>
              </Stack>
            )}

            {/* Installed improvements */}
            {!currentOwnership.isRental &&
              (currentOwnership.improvements ?? []).length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {(currentOwnership.improvements as HomeImprovement[]).map((imp, i) => (
                    <Chip
                      key={i}
                      label={
                        imp.type === 'remodel'
                          ? '🔨 Remodel'
                          : imp.type === 'pool'
                          ? '🏊 Pool'
                          : '☀️ Solar'
                      }
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  ))}
                </Stack>
              )}
          </Stack>
        </Paper>
      )}

      {/* Filters */}
      <HousingFilters
        filters={filters}
        onChange={(partial) => dispatch(setHousingFilters(partial))}
        onReset={() => dispatch(resetHousingFilters())}
      />

      {/* Results summary */}
      {!isLoading && !error && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {displayHousing.length} option{displayHousing.length !== 1 ? 's' : ''} found
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
              <Typography variant="body2" color="secondary.main">
                {compareIds.length} selected for compare
              </Typography>
              <Button
                size="small"
                variant="text"
                color="secondary"
                onClick={() => dispatch(clearCompare())}
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
          Failed to load housing options. Please try again.
        </Alert>
      )}

      {/* Housing grid */}
      <Grid container spacing={2}>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Skeleton variant="rounded" height={260} />
              </Grid>
            ))
          : displayHousing.map((housing) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={housing.id}>
                <HousingCard
                  housing={housing}
                  inCompare={compareIds.includes(housing.id)}
                  onSelect={handleSelectHousing}
                  onToggleCompare={(id) => dispatch(toggleCompare(id))}
                  onImprove={(h) => setImprovingHousing(h)}
                  selecting={selectMutation.isPending && pendingSelect?.id === housing.id}
                />
              </Grid>
            ))}
      </Grid>

      {/* Empty state */}
      {!isLoading && !error && displayHousing.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No housing options found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try adjusting your filters or turning off "Eligible only"
          </Typography>
          <Button variant="outlined" onClick={() => dispatch(resetHousingFilters())}>
            Reset filters
          </Button>
        </Box>
      )}

      {/* Location dialog (for 'both' location housing) */}
      <LocationDialog
        open={locationDialogOpen}
        housingName={pendingSelect?.name ?? ''}
        onConfirm={handleLocationConfirm}
        onClose={() => {
          setLocationDialogOpen(false);
          setPendingSelect(null);
        }}
        loading={selectMutation.isPending}
      />

      {/* Confirm select dialog */}
      <ConfirmSelectDialog
        open={confirmDialogOpen}
        housing={pendingSelect}
        hasCurrentHome={hasCurrentHome}
        onConfirm={handleConfirmSelect}
        onClose={() => {
          setConfirmDialogOpen(false);
          setPendingSelect(null);
          setPendingLocation(null);
        }}
        loading={selectMutation.isPending}
      />

      {/* Compare modal */}
      <CompareModal
        open={compareOpen}
        housing={compareHousing.length > 0 ? compareHousing : allHousing.filter((h) => compareIds.includes(h.id))}
        onClose={() => setCompareOpen(false)}
        onSelect={handleSelectHousing}
        onRemove={(id) => dispatch(toggleCompare(id))}
      />

      {/* Improvements modal */}
      <ImprovementsModal
        open={!!improvingHousing}
        housing={improvingHousing}
        ownership={
          currentOwnership
            ? {
                purchasePrice: currentOwnership.purchasePrice ?? 0,
                yearsLived: currentOwnership.yearsLived ?? 0,
                improvements: (currentOwnership.improvements ?? []) as HomeImprovement[],
              }
            : null
        }
        playerMoney={playerMoney}
        currentMarketValue={currentMarketValue()}
        onClose={() => setImprovingHousing(null)}
        onApply={(type, investmentAmount) =>
          improveMutation.mutate({ type, investmentAmount })
        }
        applying={improveMutation.isPending}
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
