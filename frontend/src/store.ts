import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer from './features/notifications/notificationsSlice';
import authReducer from './features/auth/authSlice';
import gameReducer from './features/game/gameSlice';
import actionsReducer from './features/actions/actionsSlice';
import jobsReducer from './features/jobs/jobsSlice';
import educationReducer from './features/education/educationSlice';
import housingReducer from './features/housing/housingSlice';
import vehiclesReducer from './features/vehicles/vehiclesSlice';
import financesReducer from './features/finances/financesSlice';
import pitcherReducer from './features/pitcher/pitcherSlice';
import messagesReducer from './features/messages/messagesSlice';
import bookmarksReducer from './features/bookmarks/bookmarksSlice';

export const store = configureStore({
  reducer: {
    notifications: notificationsReducer,
    auth: authReducer,
    game: gameReducer,
    actions: actionsReducer,
    jobs: jobsReducer,
    education: educationReducer,
    housing: housingReducer,
    vehicles: vehiclesReducer,
    finances: financesReducer,
    pitcher: pitcherReducer,
    messages: messagesReducer,
    bookmarks: bookmarksReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
