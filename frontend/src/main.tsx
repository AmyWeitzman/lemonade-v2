import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';
import { store } from './store';
import { setUser } from './features/auth/authSlice';
import api from './lib/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5 },
  },
});

const theme = createTheme({
  typography: {
    fontFamily: '"Playpen Sans", sans-serif',
  },
  palette: {
    primary: {
      main: '#2FB6D3',
      light: 'rgba(47, 182, 211, 0.40)',
      contrastText: '#FFFFE8',
    },
    secondary: {
      main: '#2FB6D3',
      contrastText: '#FFFFE8',
    },
    background: {
      default: '#FFFFE8',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1a1a1a',
    },
  },
});

// Restore userId/username from token on page load
const token = store.getState().auth.token;
if (token && !store.getState().auth.userId) {
  api.get('/auth/me').then(({ data }) => {
    store.dispatch(setUser({ userId: data.user.id, username: data.user.username, token }));
  }).catch(() => {
    // token expired or invalid — leave as-is, App.tsx will redirect to login
  });
}

function Root() {
  return (
    <React.StrictMode>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <App />
            </ThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
