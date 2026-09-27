/**
 * Housing Redux Slice — filter preferences for the housing catalog.
 * Requirements: Req 12, Req 42
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { HousingFilters } from './types';

export interface HousingState {
  filters: HousingFilters;
  compareIds: string[]; // up to 3 housing IDs for side-by-side compare
}

const STORAGE_KEY = 'lemonade_housing_filters';

const defaultFilters: HousingFilters = {
  location: '',
  rentalOnly: false,
  buyOnly: false,
  maxCost: null,
  minCapacity: null,
  showAll: false,
  eligibleOnly: false,
};

function loadFilters(): HousingFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFilters;
    return { ...defaultFilters, ...JSON.parse(raw) };
  } catch {
    return defaultFilters;
  }
}

function saveFilters(filters: HousingFilters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // ignore
  }
}

const initialState: HousingState = {
  filters: loadFilters(),
  compareIds: [],
};

const housingSlice = createSlice({
  name: 'housing',
  initialState,
  reducers: {
    setHousingFilters(state, action: PayloadAction<Partial<HousingFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      saveFilters(state.filters);
    },
    resetHousingFilters(state) {
      state.filters = defaultFilters;
      saveFilters(defaultFilters);
    },
    toggleCompare(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.compareIds.indexOf(id);
      if (idx >= 0) {
        state.compareIds.splice(idx, 1);
      } else if (state.compareIds.length < 3) {
        state.compareIds.push(id);
      }
    },
    clearCompare(state) {
      state.compareIds = [];
    },
  },
});

export const { setHousingFilters, resetHousingFilters, toggleCompare, clearCompare } =
  housingSlice.actions;
export default housingSlice.reducer;
