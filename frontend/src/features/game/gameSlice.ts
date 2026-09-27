import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface GameState {
  currentYear: number;
  pitcherLemons: number;
  pitcherGoal: number;
  sessionStatus: 'waiting' | 'active' | 'ended' | null;
  unreadMessages: number;
}

const initialState: GameState = {
  currentYear: 1,
  pitcherLemons: 0,
  pitcherGoal: 0,
  sessionStatus: null,
  unreadMessages: 0,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setGameState(
      state,
      action: PayloadAction<{
        currentYear?: number;
        pitcherLemons?: number;
        pitcherGoal?: number;
        sessionStatus?: 'waiting' | 'active' | 'ended';
      }>,
    ) {
      if (action.payload.currentYear !== undefined) state.currentYear = action.payload.currentYear;
      if (action.payload.pitcherLemons !== undefined)
        state.pitcherLemons = action.payload.pitcherLemons;
      if (action.payload.pitcherGoal !== undefined) state.pitcherGoal = action.payload.pitcherGoal;
      if (action.payload.sessionStatus !== undefined)
        state.sessionStatus = action.payload.sessionStatus;
    },
    addLemon(state) {
      state.pitcherLemons += 1;
    },
    incrementUnreadMessages(state) {
      state.unreadMessages += 1;
    },
    clearUnreadMessages(state) {
      state.unreadMessages = 0;
    },
    resetGame(state) {
      state.currentYear = 1;
      state.pitcherLemons = 0;
      state.pitcherGoal = 0;
      state.sessionStatus = null;
      state.unreadMessages = 0;
    },
  },
});

export const { setGameState, addLemon, incrementUnreadMessages, clearUnreadMessages, resetGame } =
  gameSlice.actions;
export default gameSlice.reducer;
