/**
 * Finances Redux Slice — UI state for the Harvest (Finances) page.
 * Requirements: Req 6, Req 18, Req 37
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FinancesState {
  /** Which panel is expanded on the page */
  activePanel: 'summary' | 'expenses' | 'loans' | 'retirement' | 'payment' | 'tax';
  /** Amount the user wants to allocate from money toward expenses */
  payFromMoney: number;
  /** Amount the user wants to allocate from retirement toward expenses */
  payFromRetirement: number;
}

const initialState: FinancesState = {
  activePanel: 'summary',
  payFromMoney: 0,
  payFromRetirement: 0,
};

const financesSlice = createSlice({
  name: 'finances',
  initialState,
  reducers: {
    setActivePanel(state, action: PayloadAction<FinancesState['activePanel']>) {
      state.activePanel = action.payload;
    },
    setPayFromMoney(state, action: PayloadAction<number>) {
      state.payFromMoney = action.payload;
    },
    setPayFromRetirement(state, action: PayloadAction<number>) {
      state.payFromRetirement = action.payload;
    },
    resetPaymentAllocation(state) {
      state.payFromMoney = 0;
      state.payFromRetirement = 0;
    },
  },
});

export const {
  setActivePanel,
  setPayFromMoney,
  setPayFromRetirement,
  resetPaymentAllocation,
} = financesSlice.actions;

export default financesSlice.reducer;
