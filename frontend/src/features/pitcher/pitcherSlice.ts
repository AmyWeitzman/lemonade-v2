/**
 * Pitcher Redux Slice — state for the Lemonade Pitcher (Lemonade Stand).
 *
 * Stores the full pitcher state fetched from the API and updated in real-time
 * via the `pitcherUpdated` WebSocket event.
 *
 * Requirements: Req 7
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerContribution {
  playerId: string;
  playerName: string;
  lemons: number;
}

export interface PitcherState {
  currentLemons: number;
  yearlyGoal: number;
  recommendedPerPlayer: number;
  graceYearUsed: boolean;
  contributionsByPlayer: PlayerContribution[];
  /** Whether the pitcher data has been loaded at least once */
  loaded: boolean;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: PitcherState = {
  currentLemons: 0,
  yearlyGoal: 0,
  recommendedPerPlayer: 0,
  graceYearUsed: false,
  contributionsByPlayer: [],
  loaded: false,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const pitcherSlice = createSlice({
  name: 'pitcher',
  initialState,
  reducers: {
    /**
     * Set the full pitcher state — called after fetching from the API
     * or when a `pitcherUpdated` socket event arrives.
     */
    setPitcherState(
      state,
      action: PayloadAction<{
        currentLemons: number;
        yearlyGoal: number;
        recommendedPerPlayer: number;
        graceYearUsed: boolean;
        contributionsByPlayer: PlayerContribution[];
      }>,
    ) {
      state.currentLemons = action.payload.currentLemons;
      state.yearlyGoal = action.payload.yearlyGoal;
      state.recommendedPerPlayer = action.payload.recommendedPerPlayer;
      state.graceYearUsed = action.payload.graceYearUsed;
      state.contributionsByPlayer = action.payload.contributionsByPlayer;
      state.loaded = true;
    },

    /**
     * Partial update — used when a `pitcherUpdated` socket event arrives
     * with only some fields changed (e.g. after a goal recalculation).
     */
    updatePitcherState(
      state,
      action: PayloadAction<Partial<Omit<PitcherState, 'loaded'>>>,
    ) {
      if (action.payload.currentLemons !== undefined)
        state.currentLemons = action.payload.currentLemons;
      if (action.payload.yearlyGoal !== undefined)
        state.yearlyGoal = action.payload.yearlyGoal;
      if (action.payload.recommendedPerPlayer !== undefined)
        state.recommendedPerPlayer = action.payload.recommendedPerPlayer;
      if (action.payload.graceYearUsed !== undefined)
        state.graceYearUsed = action.payload.graceYearUsed;
      if (action.payload.contributionsByPlayer !== undefined)
        state.contributionsByPlayer = action.payload.contributionsByPlayer;
      state.loaded = true;
    },

    resetPitcher() {
      return initialState;
    },
  },
});

export const { setPitcherState, updatePitcherState, resetPitcher } = pitcherSlice.actions;
export default pitcherSlice.reducer;
