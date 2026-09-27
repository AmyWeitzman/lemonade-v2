import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { setUser } from '../features/auth/authSlice';
import api from '../lib/api';

const USERNAME_REGEX = /^[a-zA-Z]+\.[a-zA-Z]+$/;

export default function LoginPage() {
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = USERNAME_REGEX.test(username);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { username });
      dispatch(setUser({ userId: data.user.id, username: data.user.username, token: data.token }));
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(47, 182, 211, 0.40) 0%, #2FB6D3 100%)',
      }}
    >
      <Paper
        elevation={4}
        sx={{ p: 5, maxWidth: 420, width: '100%', borderRadius: 3, textAlign: 'center' }}
      >
        <Typography variant="h2" sx={{ fontSize: '4rem', mb: 1 }}>
          🍋
        </Typography>
        <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
          Lemonade
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          When life gives you lemons…
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            placeholder="firstname.lastname"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError('');
            }}
            error={username.length > 0 && !isValid}
            helperText={
              username.length > 0 && !isValid
                ? 'Must be in firstname.lastname format (letters only)'
                : ' '
            }
            sx={{ mb: 2 }}
            autoFocus
            autoComplete="username"
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={!isValid || loading}
            sx={{ fontWeight: 700, py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
