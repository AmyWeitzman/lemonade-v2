import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  userId: string | null;
  username: string | null;
  playerId: string | null;
  gameSessionId: string | null;
  playerName: string | null;
  token: string | null;
  // Player stats shown in nav bar
  health: number;
  stress: number;
  money: number;
  lemons: number; // lemons in pitcher contributed by this player
  isInGame: boolean;
  isAlive: boolean;
}

const initialState: AuthState = {
  userId: null,
  username: null,
  playerId: null,
  gameSessionId: null,
  playerName: null,
  token: localStorage.getItem('token'),
  health: 100,
  stress: 0,
  money: 0,
  lemons: 0,
  isInGame: false,
  isAlive: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(
      state,
      action: PayloadAction<{ userId: string; username: string; token: string }>,
    ) {
      state.userId = action.payload.userId;
      state.username = action.payload.username;
      state.token = action.payload.token;
      localStorage.setItem('token', action.payload.token);
    },
    setAuth(
      state,
      action: PayloadAction<{
        playerId: string;
        gameSessionId: string;
        playerName: string;
        token: string;
      }>,
    ) {
      state.playerId = action.payload.playerId;
      state.gameSessionId = action.payload.gameSessionId;
      state.playerName = action.payload.playerName;
      state.token = action.payload.token;
      state.isInGame = true;
      state.isAlive = true;
      localStorage.setItem('token', action.payload.token);
    },
    setPlayerStats(
      state,
      action: PayloadAction<{
        health?: number;
        stress?: number;
        money?: number;
        lemons?: number;
      }>,
    ) {
      if (action.payload.health !== undefined) state.health = action.payload.health;
      if (action.payload.stress !== undefined) state.stress = action.payload.stress;
      if (action.payload.money !== undefined) state.money = action.payload.money;
      if (action.payload.lemons !== undefined) state.lemons = action.payload.lemons;
    },
    setPlayerDied(state) {
      state.isAlive = false;
    },
    logout(state) {
      state.userId = null;
      state.username = null;
      state.playerId = null;
      state.gameSessionId = null;
      state.playerName = null;
      state.token = null;
      state.isInGame = false;
      state.isAlive = true;
      state.health = 100;
      state.stress = 0;
      state.money = 0;
      state.lemons = 0;
      localStorage.removeItem('token');
    },
  },
});

export const { setUser, setAuth, setPlayerStats, setPlayerDied, logout } = authSlice.actions;
export default authSlice.reducer;
