/**
 * ActionsPage — "Squeeze the Day"
 *
 * Full action catalog with search, filters, time block visualizer,
 * cart system, and checkout results modal.
 *
 * Requirements: Req 8, Req 22
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Grid, Stack,
  Fab, Badge, Alert, Skeleton, Chip, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootState } from '../store';
import {
  addToCart, removeFromCart, clearCart, toggleFavorite,
  setFilters, resetFilters, setCartDrawerOpen,
  type CartItem,
} from '../features/actions/actionsSlice';
import { setPlayerStats } from '../features/auth/authSlice';
import { addLemon } from '../features/game/gameSlice';
import ActionCard from '../features/actions/ActionCard';
import ActionFilters from '../features/actions/ActionFilters';
import TimeBlockVisualizer from '../features/actions/TimeBlockVisualizer';
import CartDrawer from '../features/actions/CartDrawer';
import CheckoutResultModal from '../features/actions/CheckoutResultModal';
import type { ActionItem, TimeBlockBreakdown, CheckoutResult } from '../features/actions/types';
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActionsPage() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { playerId, gameSessionId, money, health, stress } = useSelector((s: RootState) => s.auth);
  const { cart, favorites, filters, cartDrawerOpen } = useSelector((s: RootState) => s.actions);

  const [searchInput, setSearchInput] = useState(filters.search);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      dispatch(setFilters({ search: value }));
    }, 350);
  };

  // ── Time blocks ────────────────────────────────────────────────────────────
  const { data: tbData, isLoading: tbLoading } = useQuery({
    queryKey: ['timeBlocks', playerId],
    queryFn: async () => {
      const { data } = await api.get(`/players/${playerId}/time-blocks`);
      return data as { breakdown: TimeBlockBreakdown; availableActivityBlocks: number };
    },
    enabled: !!playerId,
    staleTime: 30_000,
  });

  // ── Actions catalog ────────────────────────────────────────────────────────
  const queryParams = gameSessionId ? buildQueryParams(filters, gameSessionId) : null;

  const { data: actionsData, isLoading: actionsLoading, isError } = useQuery({
    queryKey: ['actions', queryParams],
    queryFn: async () => {
      if (filters.search.trim()) {
        const { data } = await api.get('/actions/search', {
          params: { q: filters.search.trim(), gameSessionId },
        });
        return data as { actions: ActionItem[] };
      }
      const { data } = await api.get('/actions', { params: queryParams });
      return data as { actions: ActionItem[] };
    },
    enabled: !!gameSessionId,
    staleTime: 15_000,
  });

  // Apply client-side favorites filter (not sent to backend)
  const displayedActions = (actionsData?.actions ?? []).filter((a) => {
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

      // Update Redux state — re-fetch player stats for accurate values
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['timeBlocks'] });

      // Optimistically update money and lemons
      dispatch(setPlayerStats({ money: money - data.totalCost }));
      for (let i = 0; i < data.lemonsEarned; i++) {
        dispatch(addLemon());
      }
      dispatch(clearCart());
      dispatch(setCartDrawerOpen(false));

      // Show results
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
  const handleAddToCart = useCallback((action: ActionItem, timeBlocks: number) => {
    const item: CartItem = {
      actionId: action.id,
      actionName: action.name,
      timeBlocks,
      calculatedCost: action.calculatedCost,
      calculatedLemons: action.calculatedLemons,
      executionType: action.executionType,
      category: action.category,
    };
    dispatch(addToCart(item));
  }, [dispatch]);

  const handleRemoveFromCart = useCallback((actionId: string) => {
    dispatch(removeFromCart(actionId));
  }, [dispatch]);

  const handleToggleFavorite = useCallback((actionId: string) => {
    dispatch(toggleFavorite(actionId));
  }, [dispatch]);

  const cartCount = cart.length;
  const availableBlocks = tbData?.breakdown.activities ?? 0;
  const cartUsedBlocks = cart.reduce((s, i) => s + i.timeBlocks, 0);

  if (!gameSessionId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You must be in an active game session to view actions.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, pb: 10 }}>
      {/* Page header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>🍋 Squeeze the Day</Typography>
          <Typography variant="body2" color="text.secondary">
            Choose your actions for this year
          </Typography>
        </Box>
        {/* Activity blocks summary */}
        <Tooltip title="Activity time blocks available this year">
          <Chip
            label={`⏱ ${cartUsedBlocks} / ${availableBlocks} TB used`}
            color={cartUsedBlocks > availableBlocks ? 'error' : cartUsedBlocks > availableBlocks * 0.8 ? 'warning' : 'default'}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Tooltip>
      </Stack>

      {/* Time block visualizer */}
      <Box sx={{ mb: 2 }}>
        <TimeBlockVisualizer breakdown={tbData?.breakdown ?? null} loading={tbLoading} />
      </Box>

      {/* Search bar */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search actions…"
        value={searchInput}
        onChange={(e) => handleSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Filters */}
      <ActionFilters
        filters={filters}
        onChange={(partial) => dispatch(setFilters(partial))}
        onReset={() => dispatch(resetFilters())}
      />

      {/* Results count */}
      {!actionsLoading && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          {displayedActions.length} action{displayedActions.length !== 1 ? 's' : ''}
          {filters.eligibleOnly ? ' (eligible only)' : ''}
        </Typography>
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
                  onToggleFavorite={handleToggleFavorite}
                  onAddToCart={handleAddToCart}
                  onRemoveFromCart={handleRemoveFromCart}
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
  );
}
