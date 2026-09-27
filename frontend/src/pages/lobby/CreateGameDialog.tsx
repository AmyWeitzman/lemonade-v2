import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import api from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onGameStarted: () => void;
}

const THEMES = [
  { value: 'default', label: '🍋 Classic Lemonade' },
];

export default function CreateGameDialog({ open, onClose, onGameStarted }: Props) {
  const token = useSelector((state: RootState) => state.auth.token);

  const [displayName, setDisplayName] = useState('');
  const [theme, setTheme] = useState('default');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  function handleClose() {
    setDisplayName('');
    setTheme('default');
    setCreateError('');
    onClose();
  }

  async function handleCreate() {
    if (!displayName.trim() || !token) return;
    setCreating(true);
    setCreateError('');
    try {
      await api.post('/sessions', { displayName: displayName.trim(), theme, maxPlayers: 16 });
      handleClose();
      onGameStarted();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setCreateError(msg ?? 'Failed to create game.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>🍋 Create New Game</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Your Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ maxLength: 50 }}
          />
          <TextField
            select
            label="Theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            fullWidth
          >
            {THEMES.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>
          {createError && <Alert severity="error">{createError}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Button variant="contained" onClick={handleCreate} disabled={!displayName.trim() || creating} sx={{ fontWeight: 700 }}>
          {creating ? <CircularProgress size={20} color="inherit" /> : 'Create Game'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
