/**
 * Jobs Redux Slice — filter preferences for the jobs catalog.
 * Requirements: Req 11
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { JobFilters } from './types';

export interface JobsState {
  filters: JobFilters;
}

const STORAGE_KEY = 'lemonade_job_filters';

const defaultFilters: JobFilters = {
  search: '',
  minSalary: null,
  minPto: null,
  maxTimeBlocks: null,
  maxStress: null,
  location: '',
  requiredMajor: '',
  partTimeOnly: false,
  fullTimeOnly: false,
  seasonal: null,
  hasPension: false,
  hasTips: false,
  hasDiscounts: false,
  eligibleOnly: true,
  skillTraitFilters: [],
  sort: '',
};

function loadFilters(): JobFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFilters;
    return { ...defaultFilters, ...JSON.parse(raw) };
  } catch {
    return defaultFilters;
  }
}

function saveFilters(filters: JobFilters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // ignore
  }
}

const initialState: JobsState = {
  filters: loadFilters(),
};

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<JobFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      saveFilters(state.filters);
    },
    resetFilters(state) {
      state.filters = defaultFilters;
      saveFilters(defaultFilters);
    },
  },
});

export const { setFilters, resetFilters } = jobsSlice.actions;
export default jobsSlice.reducer;
