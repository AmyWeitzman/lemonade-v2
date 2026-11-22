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
  Collapse, Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootState } from '../store';
import {
  addToCart, removeFromCart, clearCart, toggleFavorite,
  setFilters, resetFilters, setCartDrawerOpen,
  updateCartItem, setCartItemQuantity,
  type CartItem,
} from '../features/actions/actionsSlice';
import { setPlayerStats } from '../features/auth/authSlice';
import { addLemon } from '../features/game/gameSlice';
import ActionCard from '../features/actions/ActionCard';
import ActionFilters from '../features/actions/ActionFilters';
import TimeBlockVisualizer from '../features/actions/TimeBlockVisualizer';
import RecommendedActions from '../features/actions/RecommendedActions';
import CartDrawer from '../features/actions/CartDrawer';
import CheckoutResultModal from '../features/actions/CheckoutResultModal';
import GetHousingTransportPicker from '../features/actions/GetHousingTransportPicker';
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
  const [tipsOpen, setTipsOpen] = useState(false);

  // Search callback — only triggers API refetch, doesn't cause parent re-render
  const handleSearch = useCallback((value: string) => {
    dispatch(setFilters({ search: value }));
  }, [dispatch]);

  // ── Time blocks ────────────────────────────────────────────────────────────
  const { data: tbData, isLoading: tbLoading } = useQuery({
    queryKey: ['timeBlocks', playerId],
    queryFn: async () => {
      const { data } = await api.get(`/players/${playerId}/time-blocks`);
      return data as {
        breakdown: TimeBlockBreakdown;
        availableActivityBlocks: number;
        actionTime: { activityBlocks: number; schoolBreakBlocks: number; unpaidBlocks: number; ptoBlocks: number; usedActivity: number; usedBreak: number; paidUsed: number; unpaidUsed: number };
        requiredActions?: Array<{ actionName: string; blocks: number; reason: string }>;
        reservedBlocks?: number;
      } & PTOInfo;
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

  // ── Required actions (get housing / transportation) ──────────────────────────
  // These are NOT auto-added to the cart anymore. They show in the Recommended
  // Actions section and in the CartDrawer as a warning, with checkout disabled
  // until the player adds them to the cart.
  const requiredActions = tbData?.requiredActions ?? [];

  // ── Express acquisition picker (Get Housing / Get Transportation) ───────────
  const [expressPicker, setExpressPicker] = useState<{
    action: ActionItem; timeBlocks: number; ptoBlocks: number; unpaidBlocks: number; schoolBreakBlocks: number;
  } | null>(null);

  // ── Cart validation ────────────────────────────────────────────────────────
  const cartActionIds = cart.map((i) => i.actionId);
  // Signature of every field that affects validation, so the query refetches
  // immediately whenever the user adjusts quantity, PTO split, or plan option.
  const cartSignature = cart.map(
    (i) =>
      `${i.actionId}:${i.quantity}:${i.timeBlocks}:${i.ptoBlocks}:${i.unpaidBlocks ?? 0}:${i.schoolBreakBlocks ?? 0}:${i.selectedOption ?? ''}:${i.selectedHousingId ?? ''}:${i.housingLocation ?? ''}:${i.selectedVehicleId ?? ''}`,
  );

  const { data: validationData, isFetching: validating } = useQuery({
    queryKey: ['cartValidation', cartSignature, gameSessionId],
    queryFn: async () => {
      if (cart.length === 0) return null;
      const quantities: Record<string, number> = {};
      const selectedOptions: Record<string, string> = {};
      const selectedHousingIds: Record<string, string> = {};
      const housingLocations: Record<string, string> = {};
      const selectedVehicleIds: Record<string, string> = {};
      cart.forEach((i) => {
        quantities[i.actionId] = i.quantity;
        if (i.selectedOption) selectedOptions[i.actionId] = i.selectedOption;
        if (i.selectedHousingId) selectedHousingIds[i.actionId] = i.selectedHousingId;
        if (i.housingLocation) housingLocations[i.actionId] = i.housingLocation;
        if (i.selectedVehicleId) selectedVehicleIds[i.actionId] = i.selectedVehicleId;
      });
      const { data } = await api.get('/actions/cart/validate', {
        params: {
          gameSessionId,
          actionIds: cartActionIds,
           quantities: JSON.stringify(quantities),
          activityBlocks: JSON.stringify(Object.fromEntries(cart.map((i) => [i.actionId, i.timeBlocks]))),
          ptoBlocks: JSON.stringify(Object.fromEntries(cart.map((i) => [i.actionId, i.ptoBlocks]))),
          unpaidBlocks: JSON.stringify(Object.fromEntries(cart.map((i) => [i.actionId, i.unpaidBlocks ?? 0]))),
          schoolBreakBlocks: JSON.stringify(Object.fromEntries(cart.map((i) => [i.actionId, i.schoolBreakBlocks ?? 0]))),
          selectedOptions: JSON.stringify(selectedOptions),
          selectedHousingIds: JSON.stringify(selectedHousingIds),
          housingLocations: JSON.stringify(housingLocations),
          selectedVehicleIds: JSON.stringify(selectedVehicleIds),
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
  interface ExecuteResponse {
    success: boolean;
    lemonsEarned: number;
    healthChange: { temporary: number; permanent: number };
    stressChange: number;
    skillGains: Record<string, number>;
    traitGains: Record<string, number>;
    totalCost: number;
    totalTimeBlocks: number;
  }

  const applyCheckoutResult = (data: ExecuteResponse) => {
    const healthDelta = (data.healthChange.temporary ?? 0) + (data.healthChange.permanent ?? 0);

    queryClient.invalidateQueries({ queryKey: ['actions'] });
    queryClient.invalidateQueries({ queryKey: ['timeBlocks'] });
    queryClient.invalidateQueries({ queryKey: ['cartValidation'] });
    for (const key of ['housing', 'playerHousing', 'vehicles', 'vehiclesOwned', 'playerBasic']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }

    dispatch(setPlayerStats({ money: money - data.totalCost }));
    for (let i = 0; i < data.lemonsEarned; i++) {
      dispatch(addLemon());
    }

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
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/actions/execute', {
        gameSessionId,
        // Expand each cart line into one entry per instance (quantity), so cost/effects
        // are computed correctly per-execution rather than as one combined block.
        actions: cart.flatMap((i) =>
          Array.from({ length: i.quantity }, () => ({
            actionId: i.actionId,
            timeBlocks: i.timeBlocks,
            ptoBlocks: i.ptoBlocks,
            unpaidBlocks: i.unpaidBlocks,
            schoolBreakBlocks: i.schoolBreakBlocks,
            selectedOption: i.selectedOption,
            selectedHousingId: i.selectedHousingId,
            housingLocation: i.housingLocation,
            selectedVehicleId: i.selectedVehicleId,
          })),
        ),
      });
      return data as ExecuteResponse;
    },
    onSuccess: (data) => {
      applyCheckoutResult(data);
      dispatch(clearCart());
      dispatch(setCartDrawerOpen(false));
    },
  });

  // Express checkout executes a single action immediately, bypassing the cart entirely.
  const expressMutation = useMutation({
    mutationFn: async (item: {
      actionId: string;
      timeBlocks: number;
      ptoBlocks: number;
      unpaidBlocks?: number;
      schoolBreakBlocks?: number;
      selectedOption?: string;
      quantity: number;
      selectedHousingId?: string;
      housingLocation?: string;
      selectedVehicleId?: string;
    }) => {
      const { data } = await api.post('/actions/execute', {
        gameSessionId,
        actions: Array.from({ length: item.quantity }, () => ({
          actionId: item.actionId,
          timeBlocks: item.timeBlocks,
          ptoBlocks: item.ptoBlocks,
          unpaidBlocks: item.unpaidBlocks,
          schoolBreakBlocks: item.schoolBreakBlocks,
          selectedOption: item.selectedOption,
          selectedHousingId: item.selectedHousingId,
          housingLocation: item.housingLocation,
          selectedVehicleId: item.selectedVehicleId,
        })),
      });
      return data as ExecuteResponse;
    },
    onSuccess: (data) => {
      applyCheckoutResult(data);
      setExpressPicker(null);
    },
  });

  const expressErrorData = (expressMutation.error as {
    response?: { data?: { error?: string; errors?: string[] } };
  } | null)?.response?.data;
  const expressError = expressMutation.isError
    ? expressErrorData?.errors?.join(' ') || expressErrorData?.error || 'Express checkout failed. Please try again.'
    : null;

  // ── Cart handlers ──────────────────────────────────────────────────────────
  const handleExpressCheckout = useCallback((
    action: ActionItem,
    timeBlocks: number,
    ptoBlocks: number,
    selectedOption?: string,
    _selectedOptionLabel?: string,
    quantity = 1,
    unpaidBlocks = 0,
    schoolBreakBlocks = 0,
  ) => {
    expressMutation.mutate({ actionId: action.id, timeBlocks, ptoBlocks, selectedOption, quantity, unpaidBlocks, schoolBreakBlocks });
  }, [expressMutation]);

  // Express acquisition: opens the picker dialog for Get Housing / Get Transportation.
  // Once the player selects a home/vehicle, it executes immediately via the express mutation.
  const handleExpressAcquisition = useCallback((action: ActionItem, timeBlocks: number, ptoBlocks: number, unpaidBlocks: number, schoolBreakBlocks: number) => {
    expressMutation.reset();
    setExpressPicker({ action, timeBlocks, ptoBlocks, unpaidBlocks, schoolBreakBlocks });
  }, [expressMutation]);

  const handleExpressPickerConfirm = useCallback((selection: {
    selectedHousingId?: string;
    housingLocation?: 'city' | 'suburb';
    selectedVehicleId?: string;
  }) => {
    if (!expressPicker) return;
    expressMutation.mutate({
      actionId: expressPicker.action.id,
      timeBlocks: expressPicker.timeBlocks,
      ptoBlocks: expressPicker.ptoBlocks,
      unpaidBlocks: expressPicker.unpaidBlocks,
      schoolBreakBlocks: expressPicker.schoolBreakBlocks,
      selectedOption: undefined,
      quantity: 1,
      selectedHousingId: selection.selectedHousingId,
      housingLocation: selection.housingLocation,
      selectedVehicleId: selection.selectedVehicleId,
    });
  }, [expressPicker, expressMutation]);

  const handleAddToCart = useCallback((
    action: ActionItem,
    timeBlocks: number,
    ptoBlocks: number,
    selectedOption?: string,
    selectedOptionLabel?: string,
    quantity = 1,
    unpaidBlocks = 0,
    schoolBreakBlocks = 0,
  ) => {
    const selectedOptionData = (action.userInput?.options ?? []).find((o) => o.value === selectedOption);
    const item: CartItem = {
      actionId: action.id,
      actionName: action.name,
      timeBlocks,
      ptoBlocks,
      unpaidBlocks,
      schoolBreakBlocks,
      calculatedCost: selectedOptionData?.cost ?? action.calculatedCost,
      calculatedLemons: action.calculatedLemons,
      quantity,
      executionType: action.executionType,
      category: action.category,
      requiresPTO: action.requiresPTO,
      allowsPTO: action.allowsPTO,
      selectedOption,
      selectedOptionLabel,
    };
    dispatch(addToCart(item));
    // "Get Housing" / "Get Transportation" need a home/vehicle picked in the cart.
    if (action.name === 'Get Housing' || action.name === 'Get Transportation') {
      dispatch(setCartDrawerOpen(true));
    }
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

  const handleUpdateCartQuantity = useCallback((actionId: string, quantity: number) => {
    dispatch(setCartItemQuantity({ actionId, quantity }));
  }, [dispatch]);

  const handleToggleFavorite = useCallback((actionId: string) => {
    dispatch(toggleFavorite(actionId));
  }, [dispatch]);

  const cartCount = cart.length;
  const totalBlocks = tbData?.actionTime?.activityBlocks ?? 0;
  const cartUsedBlocks = cart.reduce((s, i) => s + i.timeBlocks * i.quantity, 0);
  const cartPtoUsed = cart.reduce((s, i) => s + i.ptoBlocks * i.quantity, 0);
  const ptoRemaining = tbData?.ptoRemaining ?? 0;
  const unpaidRemaining = tbData?.actionTime?.unpaidBlocks ?? 0;
  const breaksRemaining = tbData?.actionTime?.schoolBreakBlocks ?? 0;
  const committedUnpaid = cart.reduce((s, i) => s + (i.unpaidBlocks ?? 0) * i.quantity, 0);
  const committedBreaks = cart.reduce((s, i) => s + (i.schoolBreakBlocks ?? 0) * i.quantity, 0);

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
          <Typography variant="h5" fontWeight={700}>📅 Squeeze the Day</Typography>
          <Typography variant="body2" color="text.secondary">
            Choose your actions for this year
          </Typography>
        </Box>
        {/* Activity blocks summary */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`${totalBlocks} activity blocks left`}
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
          {unpaidRemaining > 0 && <Chip label={`${unpaidRemaining} unpaid leave left`} variant="outlined" />}
          {breaksRemaining > 0 && <Chip label={`${breaksRemaining} School Break left`} variant="outlined" />}
        </Stack>
      </Stack>

      {/* Time block visualizer */}
      <Box sx={{ mb: 2 }}>
        <TimeBlockVisualizer
          breakdown={tbData?.breakdown ?? null}
          loading={tbLoading}
          usedActivityBlocks={cartUsedBlocks + committedBreaks + (tbData?.actionTime?.usedActivity ?? 0) + (tbData?.actionTime?.usedBreak ?? 0) + (tbData?.actionTime?.paidUsed ?? 0) + (tbData?.actionTime?.unpaidUsed ?? 0)}
          reservedBlocks={requiredActions
            .filter((r) => !cart.some((i) => i.actionName === r.actionName))
            .reduce((s, r) => s + r.blocks, 0)}
        />
      </Box>

      {/* Recommended actions */}
      <RecommendedActions />
      {/* Tips & Guidance (collapsible) */}
      <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.7)' }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setTipsOpen((v) => !v)}
          role="button"
          aria-expanded={tipsOpen}
        >
          <Typography variant="body2" fontWeight={700}>💡 Tips & Guidance</Typography>
          <IconButton size="small" sx={{ p: 0 }}>
            {tipsOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>
        <Collapse in={tipsOpen}>
          <Divider />
          <Box sx={{ px: 2, py: 1.5 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={700} color="primary.main" display="block" sx={{ mb: 0.5 }}>⚡ Express Checkout vs Add to Cart</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  <b>Add to Cart</b> queues the action for the year — you can review and adjust your plan before committing. For "Get Housing" and "Get Transportation", add to cart then pick your home or vehicle inside the cart.
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  <b>Express Checkout</b> executes immediately. For housing and transportation, it opens a picker dialog first, then purchases your selection right away — no need to visit the cart.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={700} color="success.main" display="block" sx={{ mb: 0.5 }}>🤝 Good Deed Actions</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Actions marked <b>Good Deed</b> build goodwill in the community and may unlock bonus lemon rewards or future opportunities. Worth doing when you have spare time blocks.
                </Typography>
                <Typography variant="caption" fontWeight={700} color="info.main" display="block" sx={{ mb: 0.5, mt: 1 }}>👴 Senior Discount (Age 65+)</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Players aged 65 and older automatically receive a discounted price on actions marked <b>Senior Discount</b>. The reduced cost is shown on the card.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={700} color="secondary.dark" display="block" sx={{ mb: 0.5 }}>🏖️ Paid Time Off (PTO)</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  To use PTO on an action, you must have a job that provides PTO benefits — not all jobs offer it. Check the Jobs page to see if your current role earns PTO. Actions that require PTO will only be available if you have PTO days remaining.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={700} color="warning.dark" display="block" sx={{ mb: 0.5 }}>📋 Action Restrictions to Keep in Mind</Typography>
                <Stack direction="column" gap={0.5}>
                  {[
                    'Some actions require you to be enrolled in school - make sure to take advantage of them if you want while in school.',
                    'Childcare-related actions become available once you have children.',
                    'You will no longer be eligible for actions with a max age limit (e.g., Age ≤ 55) once you age out.',
                    'Retirement unlocks new leisure actions and removes work-time constraints.',
                  ].map((tip, i) => (
                    <Typography key={i} variant="caption" color="text.secondary" display="block">• {tip}</Typography>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>

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
                  cartUnpaidBlocks={cartItem?.unpaidBlocks}
                  cartSchoolBreakBlocks={cartItem?.schoolBreakBlocks}
                  unpaidRemaining={unpaidRemaining - committedUnpaid}
                  schoolBreakRemaining={breaksRemaining - committedBreaks}
                  cartQuantity={cartItem?.quantity}
                  cartSelectedOptionLabel={cartItem?.selectedOptionLabel}
                  ptoRemaining={ptoRemaining}
                  ptoCommitted={cart
                    .filter((i) => i.actionId !== action.id)
                    .reduce((s, i) => s + i.ptoBlocks * i.quantity, 0)}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToCart={handleAddToCart}
                  onExpressCheckout={handleExpressCheckout}
                  expressCheckingOut={expressMutation.isPending}
                  onRemoveFromCart={handleRemoveFromCart}
                  onUpdateCartPto={handleUpdateCartPto}
                  onExpressAcquisition={handleExpressAcquisition}
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
        onUpdateQuantity={handleUpdateCartQuantity}
        ptoRemaining={ptoRemaining}
        validation={validationData ?? null}
        validating={validating}
        checkingOut={checkoutMutation.isPending}
        requiredActions={requiredActions}
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

      {!expressPicker && expressError && <Alert severity="error" sx={{ mt: 2 }}>{expressError}</Alert>}

      {/* Express acquisition picker (Get Housing / Get Transportation) */}
      {expressPicker && (
        <GetHousingTransportPicker
          open
          onClose={() => { expressMutation.reset(); setExpressPicker(null); }}
          kind={expressPicker.action.name === 'Get Housing' ? 'housing' : 'transport'}
          actionId={expressPicker.action.id}
          onExpressConfirm={handleExpressPickerConfirm}
          expressPending={expressMutation.isPending}
          expressError={expressError}
        />
      )}
    </Box>
    </Box>
  );
}
