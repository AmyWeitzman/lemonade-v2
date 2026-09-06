/**
 * Actions Redux Slice — cart state, favorites, and filter preferences.
 * Requirements: Req 8, Req 22
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  actionId: string;
  actionName: string;
  // timeBlocks/ptoBlocks/calculatedCost/calculatedLemons are all PER INSTANCE —
  // multiply by `quantity` to get the totals for this cart line.
  timeBlocks: number;      // activity blocks used, per instance
  ptoBlocks: number;       // PTO blocks used per instance (0 if none)
  calculatedCost: number;
  calculatedLemons: number;
  quantity: number;        // number of times this action is being done (>= 1)
  executionType: string;
  category: string[];
  requiresPTO: boolean;    // if true, must use PTO blocks
  allowsPTO: boolean;      // if false, this action's blocks can never be marked as PTO
  selectedOption?: string;      // value of the chosen userInput option, if the action has one
  selectedOptionLabel?: string; // human-readable label for the chosen option, for display in cart/checkout
  // ── "Get Housing" / "Get Transportation" — the chosen home / vehicle ──
  selectedHousingId?: string;
  housingLocation?: 'city' | 'suburb';
  selectedHousingLabel?: string;
  selectedVehicleId?: string;
  selectedVehicleLabel?: string;
  // True for cart lines auto-added because the action is required this year and
  // that cannot be removed (Phase 5 earmark).
  locked?: boolean;
}

export interface ActionFilters {
  search: string;
  category: string;
  maxCost: number | null;
  maxTimeBlocks: number | null;
  healthImpact: 'positive' | 'negative' | 'neutral' | '';
  stressImpact: 'positive' | 'negative' | 'neutral' | '';
  eligibleOnly: boolean;
  goodDeed: boolean;
  seniorDiscount: boolean;
  ptoRequired: boolean;
  favoritesOnly: boolean;
  sort: 'lemons_per_tb' | 'lemons_per_dollar' | 'cost_per_tb' | 'min_cost' | '';
}

export interface ActionsState {
  cart: CartItem[];
  cartSessionId: string | null; // game session the persisted cart belongs to
  favorites: string[]; // actionIds
  filters: ActionFilters;
  cartDrawerOpen: boolean;
}

const initialFilters: ActionFilters = {
  search: '',
  category: '',
  maxCost: null,
  maxTimeBlocks: null,
  healthImpact: '',
  stressImpact: '',
  eligibleOnly: true,
  goodDeed: false,
  seniorDiscount: false,
  ptoRequired: false,
  favoritesOnly: false,
  sort: '',
};

const loadFavorites = (): string[] => {
  try {
    const raw = localStorage.getItem('lemonade_action_favorites');
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

// The cart is persisted per game session so players can leave and resume a game
// across multiple browser sessions without losing their planned actions.
const CART_STORAGE_PREFIX = 'lemonade_cart_';

const loadCart = (gameSessionId: string): CartItem[] => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_PREFIX + gameSessionId);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
};

const persistCart = (state: ActionsState) => {
  if (!state.cartSessionId) return;
  try {
    localStorage.setItem(
      CART_STORAGE_PREFIX + state.cartSessionId,
      JSON.stringify(state.cart),
    );
  } catch {
    /* storage full or unavailable — cart stays in memory for this session */
  }
};

const initialState: ActionsState = {
  cart: [],
  cartSessionId: null,
  favorites: loadFavorites(),
  filters: initialFilters,
  cartDrawerOpen: false,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const actionsSlice = createSlice({
  name: 'actions',
  initialState,
  reducers: {
    // Load the persisted cart for a game session. Called when the player enters
    // or resumes a game; safe to call repeatedly (localStorage is kept in sync).
    hydrateCart(state, action: PayloadAction<{ gameSessionId: string }>) {
      state.cartSessionId = action.payload.gameSessionId;
      state.cart = loadCart(action.payload.gameSessionId);
    },
    addToCart(state, action: PayloadAction<CartItem>) {
      const existing = state.cart.find((i) => i.actionId === action.payload.actionId);
      if (existing) {
        // Same per-instance config (TB/PTO/cost/lemons) is assumed — just add more instances.
        // Re-adding with a newly selected option (e.g. a different plan) updates the choice.
        existing.quantity += action.payload.quantity;
        existing.timeBlocks = action.payload.timeBlocks;
        existing.ptoBlocks = action.payload.ptoBlocks;
        existing.calculatedCost = action.payload.calculatedCost;
        existing.calculatedLemons = action.payload.calculatedLemons;
        existing.selectedOption = action.payload.selectedOption;
        existing.selectedOptionLabel = action.payload.selectedOptionLabel;
      } else {
        state.cart.push(action.payload);
      }
      persistCart(state);
    },
    removeFromCart(state, action: PayloadAction<string>) {
      // Locked lines (required actions) can't be removed by the player.
      state.cart = state.cart.filter(
        (i) => i.actionId !== action.payload || i.locked === true,
      );
      persistCart(state);
    },
    /** Set the chosen home / vehicle on a "Get Housing" / "Get Transportation" cart line. */
    setCartItemSelection(
      state,
      action: PayloadAction<{
        actionId: string;
        selectedHousingId?: string;
        housingLocation?: 'city' | 'suburb';
        selectedHousingLabel?: string;
        selectedVehicleId?: string;
        selectedVehicleLabel?: string;
      }>,
    ) {
      const item = state.cart.find((i) => i.actionId === action.payload.actionId);
      if (item) {
        if ('selectedHousingId' in action.payload) {
          item.selectedHousingId = action.payload.selectedHousingId;
          item.housingLocation = action.payload.housingLocation;
          item.selectedHousingLabel = action.payload.selectedHousingLabel;
        }
        if ('selectedVehicleId' in action.payload) {
          item.selectedVehicleId = action.payload.selectedVehicleId;
          item.selectedVehicleLabel = action.payload.selectedVehicleLabel;
        }
      }
      persistCart(state);
    },
    /** Add a required action as a locked cart line (Phase 5 earmark). No-op if already present. */
    addRequiredCartItem(state, action: PayloadAction<CartItem>) {
      if (!state.cart.some((i) => i.actionId === action.payload.actionId)) {
        state.cart.push({ ...action.payload, locked: true });
        persistCart(state);
      }
    },
    /** Remove a locked required line once its requirement is satisfied. */
    removeRequiredCartItem(state, action: PayloadAction<string>) {
      state.cart = state.cart.filter((i) => i.actionId !== action.payload);
      persistCart(state);
    },
    updateCartItem(
      state,
      action: PayloadAction<{ actionId: string; timeBlocks: number; ptoBlocks: number; calculatedCost: number; calculatedLemons: number }>,
    ) {
      const item = state.cart.find((i) => i.actionId === action.payload.actionId);
      if (item) {
        item.timeBlocks = action.payload.timeBlocks;
        item.ptoBlocks = action.payload.ptoBlocks;
        item.calculatedCost = action.payload.calculatedCost;
        item.calculatedLemons = action.payload.calculatedLemons;
      }
      persistCart(state);
    },
    setCartItemQuantity(state, action: PayloadAction<{ actionId: string; quantity: number }>) {
      const item = state.cart.find((i) => i.actionId === action.payload.actionId);
      if (item && !item.locked) {
        item.quantity = Math.max(1, action.payload.quantity);
      }
      persistCart(state);
    },
    clearCart(state) {
      state.cart = [];
      persistCart(state);
    },
    toggleFavorite(state, action: PayloadAction<string>) {
      const idx = state.favorites.indexOf(action.payload);
      if (idx >= 0) {
        state.favorites.splice(idx, 1);
      } else {
        state.favorites.push(action.payload);
      }
      localStorage.setItem('lemonade_action_favorites', JSON.stringify(state.favorites));
    },
    setFilters(state, action: PayloadAction<Partial<ActionFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = initialFilters;
    },
    setCartDrawerOpen(state, action: PayloadAction<boolean>) {
      state.cartDrawerOpen = action.payload;
    },
  },
});

export const {
  hydrateCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  setCartItemQuantity,
  setCartItemSelection,
  addRequiredCartItem,
  removeRequiredCartItem,
  clearCart,
  toggleFavorite,
  setFilters,
  resetFilters,
  setCartDrawerOpen,
} = actionsSlice.actions;

export default actionsSlice.reducer;
