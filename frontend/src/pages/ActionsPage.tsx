/**
 * ActionsPage — "Squeeze the Day"
 *
 * Full action catalog with search, filters, time block visualizer,
 * cart system, and checkout results modal.
 *
 * Requirements: Req 8, Req 22
 */
import { useState, useCallback, useRef, memo } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Grid, Stack,
  Fab, Badge, Alert, Skeleton, Chip, Tooltip, FormControl,
  InputLabel, Select, MenuItem, Divider, CircularProgress, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootState } from '../store';
import {
  addToCart, removeFromCart, clearCart, toggleFavorite,
  setFilters, resetFilters, setCartDrawerOpen,
  updateCartItem,
  type CartItem,
} from '../features/actions/actionsSlice';
import { setPlayerStats } from '../features/auth/authSlice';
import { addLemon } from '../features/game/gameSlice';
import ActionCard from '../features/actions/ActionCard';
import ActionFilters from '../features/actions/ActionFilters';
import TimeBlockVisualizer from '../features/actions/TimeBlockVisualizer';
import CartDrawer from '../features/actions/CartDrawer';
import CheckoutResultModal from '../features/actions/CheckoutResultModal';
import type { ActionItem, TimeBlockBreakdown, CheckoutResult, PTOInfo } from '../features/actions/types';
import api from '../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQueryParams(
  filters: RootState['actions']['filters'],
  gameSessionId: string,
): Record<string, string> {
  const params: Record<string, string> = { gameSessionId };
  if (filters.category) params.category = filters.category;
  if (filters.healthImpact) params.healthImpact = filters.healthImpact;
  if (filters.stressImpact) params.stressImpact = filters.stressImpact;
  if (filters.maxCost !== null) params.maxCost = String(filters.maxCost);
  if (filters.maxTimeBlocks !== null) params.maxTimeBlocks = String(filters.maxTimeBlocks);
  if (filters.eligibleOnly) params.eligibleOnly = 'true';
  if (filters.goodDeed) params.goodDeed = 'true';
  if (filters.seniorDiscount) params.seniorDiscount = 'true';
  if (filters.ptoRequired) params.ptoRequired = 'true';
  if (filters.sort) params.sort = filters.sort;
  return params;
}

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'lemons_per_tb', label: '🍋 Lemons / Time Block' },
  { value: 'lemons_per_dollar', label: '🍋 Lemons / Dollar' },
  { value: 'cost_per_tb', label: '💰 Cost / Time Block' },
  { value: 'min_cost', label: '💰 Lowest Cost' },
];

// ─── Debounced Search Input (isolated to prevent parent re-renders) ───────────

const DebouncedSearchInput = memo(function DebouncedSearchInput({
  initialValue,
  onSearch,
}: {
  initialValue: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    setSearching(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSearch(v);
      setSearching(false);
    }, 400);
  };

  const handleClear = () => {
    setValue('');
    setSearching(false);
    if (timer.current) clearTimeout(timer.current);
    onSearch('');
  };

  return (
    <TextField
      fullWidth
      size="small"
      placeholder="Search actions…"
      value={value}
      onChange={handleChange}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            {searching && <CircularProgress size={16} sx={{ mr: 0.5 }} />}
            {value && (
              <Tooltip title="Clear search">
                <IconButton size="small" onClick={handleClear} aria-label="Clear search" edge="end">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </InputAdornment>
        ),
      }}
      sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.6)', borderRadius: 1, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
      aria-label="Search actions"
    />
  );
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActionsPage() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { playerId, gameSessionId, money, health, stress } = useSelector((s: RootState) => s.auth);
  const { cart, favorites, filters, cartDrawerOpen } = useSelector((s: RootState) => s.actions);

  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  // Search callback — only triggers API refetch, doesn't cause parent re-render
  const handleSearch = useCallback((value: string) => {
    dispatch(setFilters({ search: value }));
  }, [dispatch]);

  // ── Time blocks ────────────────────────────────────────────────────────────
  const { data: tbData, isLoading: tbLoading } = useQuery({
    queryKey: ['timeBlocks', playerId],
    queryFn: async () => {
      const { data } = await api.get(`/players/${playerId}/time-blocks`);
      return data as { breakdown: TimeBlockBreakdown; availableActivityBlocks: number } & PTOInfo;
    },
    enabled: !!playerId,
    staleTime: 30_000,
  });

  // ── Actions catalog ────────────────────────────────────────────────────────
  const queryParams = gameSessionId ? buildQueryParams(filters, gameSessionId) : null;

  const { data: actionsData, isLoading: actionsLoading, isFetching: actionsFetching, isError } = useQuery({
    queryKey: ['actions', queryParams],
    queryFn: async () => {
      const { data } = await api.get('/actions', { params: queryParams });
      return data as { actions: ActionItem[] };
    },
    enabled: !!gameSessionId,
    staleTime: 15_000,
  });

  // Apply client-side search + favorites filter
  const searchTerm = filters.search.trim().toLowerCase();
  const allActions = actionsData?.actions ?? [];
  const searchedActions = searchTerm
    ? allActions.filter((a) => a.name.toLowerCase().includes(searchTerm))
    : allActions;
  const displayedActions = searchedActions.filter((a) => {
    if (filters.favoritesOnly && !favorites.includes(a.id)) return false;
    return true;
  });

  // ── Cart validation ────────────────────────────────────────────────────────
  const cartActionIds = cart.map((i) => i.actionId);

  const { data: validationData, isFetching: validating } = useQuery({
    queryKey: ['cartValidation', cartActionIds, gameSessionId],
    queryFn: async () => {
      if (cart.length === 0) return null;
      const quantities: Record<string, number> = {};
      cart.forEach((i) => { quantities[i.actionId] = 1; });
      const { data } = await api.get('/actions/cart/validate', {
        params: {
          gameSessionId,
          actionIds: cartActionIds,
          quantities: JSON.stringify(quantities),
        },
      });
      return data as {
        valid: boolean;
        totalTimeBlocks: number;
        availableTimeBlocks: number;
        totalCost: number;
        availableMoney: number;
        errors: string[];
      };
    },
    enabled: cart.length > 0 && !!gameSessionId,
    staleTime: 0,
  });

  // ── Checkout ───────────────────────────────────────────────────────────────
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/actions/execute', {
        gameSessionId,
        actions: cart.map((i) => ({ actionId: i.actionId, timeBlocks: i.timeBlocks })),
      });
      return data as {
        success: boolean;
        lemonsEarned: number;
        healthChange: { temporary: number; permanent: number };
        stressChange: number;
        skillGains: Record<string, number>;
        traitGains: Record<string, number>;
        totalCost: number;
        totalTimeBlocks: number;
      };
    },
    onSuccess: (data) => {
      const healthDelta = (data.healthChange.temporary ?? 0) + (data.healthChange.permanent ?? 0);

      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['timeBlocks'] });

      dispatch(setPlayerStats({ money: money - data.totalCost }));
      for (let i = 0; i < data.lemonsEarned; i++) {
        dispatch(addLemon());
      }
      dispatch(clearCart());
      dispatch(setCartDrawerOpen(false));

      setCheckoutResult({
        totalLemonsEarned: data.lemonsEarned,
        healthDelta,
        stressDelta: data.stressChange,
        skillGains: data.skillGains,
        traitGains: data.traitGains,
        newHealth: Math.min(100, Math.max(0, health + healthDelta)),
        newStress: Math.min(100, Math.max(0, stress + data.stressChange)),
        newMoney: money - data.totalCost,
      });
      setResultModalOpen(true);
    },
  });

  // ── Cart handlers ──────────────────────────────────────────────────────────
  const handleAddToCart = useCallback((action: ActionItem, timeBlocks: number, ptoBlocks: number) => {
    const item: CartItem = {
      actionId: action.id,
      actionName: action.name,
      timeBlocks,
      ptoBlocks,
      calculatedCost: action.calculatedCost,
      calculatedLemons: action.calculatedLemons,
      executionType: action.executionType,
      category: action.category,
      requiresPTO: !!(action.requirements as Record<string, unknown>).hasPTOOrUnpaidTimeBlocks ||
        !!(action.requirements as Record<string, unknown>).hasPTODaysAvailable ||
        (typeof (action.requirements as Record<string, unknown>).ptoOrUnpaidTimeBlocks === 'number') ||
        action.requiresPTO,
    };
    dispatch(addToCart(item));
  }, [dispatch]);

  const handleUpdateCartPto = useCallback((actionId: string, timeBlocks: number, ptoBlocks: number) => {
    const item = cart.find((i) => i.actionId === actionId);
    if (!item) return;
    dispatch(updateCartItem({
      actionId,
      timeBlocks,
      ptoBlocks,
      calculatedCost: item.calculatedCost,
      calculatedLemons: item.calculatedLemons,
    }));
  }, [cart, dispatch]);

  const handleRemoveFromCart = useCallback((actionId: string) => {
    dispatch(removeFromCart(actionId));
  }, [dispatch]);

  const handleToggleFavorite = useCallback((actionId: string) => {
    dispatch(toggleFavorite(actionId));
  }, [dispatch]);

  const cartCount = cart.length;
  const totalBlocks = tbData?.breakdown.total ?? 60;
  const cartUsedBlocks = cart.reduce((s, i) => s + i.timeBlocks, 0);
  const cartPtoUsed = cart.reduce((s, i) => s + i.ptoBlocks, 0);
  const ptoRemaining = tbData?.ptoRemaining ?? 0;

  if (!gameSessionId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You must be in an active game session to view actions.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: (t) => t.palette.primary.light, p: { xs: 2, md: 3 }, pb: 10 }}>
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Page header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>⚡ Squeeze the Day</Typography>
          <Typography variant="body2" color="text.secondary">
            Choose your actions for this year
          </Typography>
        </Box>
        {/* Activity blocks summary */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`⏱ ${cartUsedBlocks} / ${totalBlocks} TB used`}
            color={cartUsedBlocks > totalBlocks ? 'error' : cartUsedBlocks > totalBlocks * 0.8 ? 'warning' : 'default'}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label={`🏖️ ${cartPtoUsed} / ${ptoRemaining} PTO used`}
            color={cartPtoUsed > ptoRemaining ? 'error' : ptoRemaining === 0 ? 'default' : 'default'}
            variant="outlined"
            sx={{ fontWeight: 600, opacity: ptoRemaining === 0 ? 0.5 : 1 }}
          />
        </Stack>
      </Stack>

      {/* Time block visualizer */}
      <Box sx={{ mb: 2 }}>
        <TimeBlockVisualizer
          breakdown={tbData?.breakdown ?? null}
          loading={tbLoading}
          usedActivityBlocks={cartUsedBlocks}
        />
      </Box>
      {/* Search bar */}
      <DebouncedSearchInput initialValue={filters.search} onSearch={handleSearch} />

      {/* Filters */}
      <ActionFilters
        filters={filters}
        onChange={(partial) => dispatch(setFilters(partial))}
        onReset={() => dispatch(resetFilters())}
      />

      {/* Results count + Sort — matching jobs page layout */}
      {!actionsLoading && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {displayedActions.length} action{displayedActions.length !== 1 ? 's' : ''} found
            </Typography>
            {actionsFetching && !actionsLoading && (
              <>
                <Divider orientation="vertical" flexItem />
                <CircularProgress size={14} />
                <Typography variant="body2" color="text.secondary">Searching…</Typography>
              </>
            )}
          </Stack>
          <FormControl size="small" sx={{ width: 220 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={filters.sort}
              label="Sort by"
              onChange={(e) => dispatch(setFilters({ sort: e.target.value as typeof filters.sort }))}
              sx={{ bgcolor: 'rgba(255,255,255,0.6)' }}
            >
              {SORT_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}

      {/* Error state */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load actions. Make sure you're connected to the game server.
        </Alert>
      )}

      {/* Action grid */}
      {actionsLoading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={180} />
            </Grid>
          ))}
        </Grid>
      ) : displayedActions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">No actions found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try adjusting your filters or search term.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {displayedActions.map((action) => {
            const cartItem = cart.find((i) => i.actionId === action.id);
            return (
              <Grid item xs={12} sm={6} md={4} key={action.id}>
                <ActionCard
                  action={action}
                  isFavorite={favorites.includes(action.id)}
                  inCart={!!cartItem}
                  cartTimeBlocks={cartItem?.timeBlocks}
                  cartPtoBlocks={cartItem?.ptoBlocks}
                  ptoRemaining={ptoRemaining}
                  ptoCommitted={cart
                    .filter((i) => i.actionId !== action.id)
                    .reduce((s, i) => s + i.ptoBlocks, 0)}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToCart={handleAddToCart}
                  onRemoveFromCart={handleRemoveFromCart}
                  onUpdateCartPto={handleUpdateCartPto}
                />
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Floating cart button */}
      <Fab
        color="primary"
        aria-label="Open cart"
        onClick={() => dispatch(setCartDrawerOpen(true))}
        sx={{
          position: 'fixed',
          bottom: { xs: 72, md: 24 },
          right: 24,
          zIndex: 1200,
        }}
      >
        <Badge badgeContent={cartCount} color="error" max={99}>
          <ShoppingCartIcon />
        </Badge>
      </Fab>

      {/* Cart drawer */}
      <CartDrawer
        open={cartDrawerOpen}
        onClose={() => dispatch(setCartDrawerOpen(false))}
        cart={cart}
        onRemove={handleRemoveFromCart}
        onClear={() => dispatch(clearCart())}
        onCheckout={() => checkoutMutation.mutate()}
        onUpdatePto={handleUpdateCartPto}
        ptoRemaining={ptoRemaining}
        validation={validationData ?? null}
        validating={validating}
        checkingOut={checkoutMutation.isPending}
      />

      {/* Checkout result modal */}
      <CheckoutResultModal
        open={resultModalOpen}
        result={checkoutResult}
        onClose={() => {
          setResultModalOpen(false);
          setCheckoutResult(null);
        }}
      />
    </Box>
    </Box>
  );
}
