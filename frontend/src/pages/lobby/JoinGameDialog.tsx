import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import api from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  prefillCode?: string;
  onGameStarted: () => void;
}

export default function JoinGameDialog({ open, onClose, prefillCode = '', onGameStarted }: Props) {
  const [code, setCode] = useState(prefillCode.toUpperCase());
  const [displayName, setDisplayName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (prefillCode) setCode(prefillCode.toUpperCase());
  }, [prefillCode]);

  function handleClose() {
    setCode(prefillCode.toUpperCase());
    setDisplayName('');
    setJoinError('');
    onClose();
  }

  async function handleJoin() {
    if (!code.trim() || !displayName.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const { data: listData } = await api.get('/sessions');
      const found = listData.sessions.find((s: { code: string }) => s.code === code.toUpperCase());
      if (!found) {
        setJoinError('No active game found with that code.');
        return;
      }
      await api.post(`/sessions/${found.id}/join`, { code: code.toUpperCase(), displayName: displayName.trim() });
      handleClose();
      onGameStarted();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setJoinError(msg ?? 'Failed to join game.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>🍋 Join a Game</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Game Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            fullWidth
            autoFocus
            inputProps={{ maxLength: 6, style: { letterSpacing: 4, fontWeight: 700 } }}
            placeholder="XXXXXX"
          />
          <TextField
            label="Your Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 50 }}
          />
          {joinError && <Alert severity="error">{joinError}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          onClick={handleJoin}
          disabled={code.length !== 6 || !displayName.trim() || joining}
          sx={{ fontWeight: 700 }}
        >
          {joining ? <CircularProgress size={20} color="inherit" /> : 'Join Game'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
