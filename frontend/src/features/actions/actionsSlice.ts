/**
 * Actions Redux Slice — cart state, favorites, and filter preferences.
 * Requirements: Req 8, Req 22
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  actionId: string;
  actionName: string;
  timeBlocks: number;
  calculatedCost: number;
  calculatedLemons: number;
  executionType: string;
  category: string[];
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

const initialState: ActionsState = {
  cart: [],
  favorites: loadFavorites(),
  filters: initialFilters,
  cartDrawerOpen: false,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const actionsSlice = createSlice({
  name: 'actions',
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<CartItem>) {
      const existing = state.cart.find((i) => i.actionId === action.payload.actionId);
      if (existing) {
        // For variable time-block actions, accumulate; for fixed, replace
        existing.timeBlocks += action.payload.timeBlocks;
        existing.calculatedCost += action.payload.calculatedCost;
        existing.calculatedLemons += action.payload.calculatedLemons;
      } else {
        state.cart.push(action.payload);
      }
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.cart = state.cart.filter((i) => i.actionId !== action.payload);
    },
    updateCartItem(
      state,
      action: PayloadAction<{ actionId: string; timeBlocks: number; calculatedCost: number; calculatedLemons: number }>,
    ) {
      const item = state.cart.find((i) => i.actionId === action.payload.actionId);
      if (item) {
        item.timeBlocks = action.payload.timeBlocks;
        item.calculatedCost = action.payload.calculatedCost;
        item.calculatedLemons = action.payload.calculatedLemons;
      }
    },
    clearCart(state) {
      state.cart = [];
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
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart,
  toggleFavorite,
  setFilters,
  resetFilters,
  setCartDrawerOpen,
} = actionsSlice.actions;

export default actionsSlice.reducer;
