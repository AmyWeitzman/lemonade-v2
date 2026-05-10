/**
 * Education Redux Slice — filter preferences for the education catalog.
 * Requirements: Req 10
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { EduFilters } from './types';

export interface EducationState {
  filters: EduFilters;
}

const STORAGE_KEY = 'lemonade_edu_filters';

const defaultFilters: EduFilters = {
  search: '',
  type: '',
  selectedMajors: [],
  track: '',
  partTimeOnly: false,
  maxTuition: null,
  eligibleOnly: true,
  sort: '',
};

function loadFilters(): EduFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFilters;
    return { ...defaultFilters, ...JSON.parse(raw) };
  } catch {
    return defaultFilters;
  }
}

function saveFilters(filters: EduFilters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // ignore
  }
}

const initialState: EducationState = {
  filters: loadFilters(),
};

const educationSlice = createSlice({
  name: 'education',
  initialState,
  reducers: {
    setEduFilters(state, action: PayloadAction<Partial<EduFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      saveFilters(state.filters);
    },
    resetEduFilters(state) {
      state.filters = defaultFilters;
      saveFilters(defaultFilters);
    },
  },
});

export const { setEduFilters, resetEduFilters } = educationSlice.actions;
export default educationSlice.reducer;
