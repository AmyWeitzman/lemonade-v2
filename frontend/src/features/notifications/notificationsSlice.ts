import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  playerId: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category: string;
  title: string;
  message: string;
  persistent: boolean;
  actionRequired: boolean;
  actionUrl?: string;
  createdAt?: string;
}

interface NotificationsState {
  items: Notification[];
}

const initialState: NotificationsState = {
  items: [],
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<Notification[]>) {
      state.items = action.payload;
    },
    addNotification(state, action: PayloadAction<Notification>) {
      // Avoid duplicates
      if (!state.items.find((n) => n.id === action.payload.id)) {
        state.items.unshift(action.payload);
      }
    },
    dismissNotification(state, action: PayloadAction<string>) {
      state.items = state.items.filter((n) => n.id !== action.payload);
    },
    clearNotifications(state) {
      state.items = [];
    },
  },
});

export const { setNotifications, addNotification, dismissNotification, clearNotifications } =
  notificationsSlice.actions;

export default notificationsSlice.reducer;
