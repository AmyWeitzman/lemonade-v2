/**
 * Vehicles Redux Slice — filter preferences and compare state.
 * Requirements: Req 13
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { VehicleFilters } from './types';

export interface VehiclesState {
  filters: VehicleFilters;
  compareIds: string[]; // up to 3 vehicle IDs for side-by-side compare
}

const STORAGE_KEY = 'lemonade_vehicle_filters';

const defaultFilters: VehicleFilters = {
  maxCost: null,
  minPeople: null,
  carOnly: false,
  nonCarOnly: false,
  fuelType: '',
  ageVariant: '',
  eligibleOnly: false,
};

function loadFilters(): VehicleFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFilters;
    return { ...defaultFilters, ...JSON.parse(raw) };
  } catch {
    return defaultFilters;
  }
}

function saveFilters(filters: VehicleFilters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // ignore
  }
}

const initialState: VehiclesState = {
  filters: loadFilters(),
  compareIds: [],
};

const vehiclesSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    setVehicleFilters(state, action: PayloadAction<Partial<VehicleFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      saveFilters(state.filters);
    },
    resetVehicleFilters(state) {
      state.filters = defaultFilters;
      saveFilters(defaultFilters);
    },
    toggleVehicleCompare(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.compareIds.indexOf(id);
      if (idx >= 0) {
        state.compareIds.splice(idx, 1);
      } else if (state.compareIds.length < 3) {
        state.compareIds.push(id);
      }
    },
    clearVehicleCompare(state) {
      state.compareIds = [];
    },
  },
});

export const {
  setVehicleFilters,
  resetVehicleFilters,
  toggleVehicleCompare,
  clearVehicleCompare,
} = vehiclesSlice.actions;
export default vehiclesSlice.reducer;
