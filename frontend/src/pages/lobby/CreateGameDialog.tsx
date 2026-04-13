import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useDispatch, useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import type { RootState } from '../../store';
import { setAuth } from '../../features/auth/authSlice';
import { setGameState } from '../../features/game/gameSlice';
import api from '../../lib/api';

interface Player {
  id: string;
  name: string;
}

interface Session {
  id: string;
  code: string;
  players: Player[];
  hostPlayerId: string;
  status: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onGameStarted: (sessionId: string, playerId: string) => void;
}

const THEMES = [
  { value: 'default', label: '🍋 Classic Lemonade' },
];

export default function CreateGameDialog({ open, onClose, onGameStarted }: Props) {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);

  const [displayName, setDisplayName] = useState('');
  const [theme, setTheme] = useState('default');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerId, setMyPlayerId] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!session || !token) return;

    const socket = io('http://localhost:3001', { auth: { token } });
    socketRef.current = socket;

    socket.emit('joinGame', { gameSessionId: session.id });

    socket.on('playerJoined', (payload: { playerId: string; playerName: string }) => {
      setPlayers((prev) => {
        if (prev.find((p) => p.id === payload.playerId)) return prev;
        return [...prev, { id: payload.playerId, name: payload.playerName }];
      });
    });

    socket.on('playerLeft', (payload: { playerId: string }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== payload.playerId));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, token]);

  function handleClose() {
    setSession(null);
    setPlayers([]);
    setMyPlayerId('');
    setDisplayName('');
    setTheme('default');
    setCreateError('');
    onClose();
  }

  async function handleCreate() {
    if (!displayName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      // Create session — backend auto-joins the host as a player
      const { data } = await api.post('/sessions', {
        displayName: displayName.trim(),
        theme,
        maxPlayers: 16,
      });
      const sess: Session = data.session;
      setSession(sess);
      setPlayers(sess.players);
      const hostPlayer = sess.players.find((p) => p.id === sess.hostPlayerId);
      if (hostPlayer) setMyPlayerId(hostPlayer.id);
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

  async function handleStartGame() {
    if (!session) return;
    setStarting(true);
    try {
      dispatch(
        setAuth({
          playerId: myPlayerId,
          gameSessionId: session.id,
          playerName: displayName,
          token: token!,
        }),
      );
      dispatch(setGameState({ sessionStatus: 'active' }));
      onGameStarted(session.id, myPlayerId);
    } finally {
      setStarting(false);
    }
  }

  function handleCopyCode() {
    if (!session) return;
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Waiting Room ──────────────────────────────────────────────────────────
  if (session) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>🍋 Waiting Room</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Share this code with friends
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'primary.light',
                px: 3,
                py: 1.5,
                borderRadius: 2,
              }}
            >
              <Typography variant="h4" fontWeight={800} letterSpacing={4} color="primary.dark">
                {session.code}
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                <IconButton size="small" onClick={handleCopyCode} color="primary">
                  {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Players in lobby
          </Typography>
          <List dense>
            {players.map((p) => (
              <ListItem key={p.id} disableGutters>
                <ListItemText primary={p.name} />
                {p.id === session.hostPlayerId && (
                  <Chip label="Host" size="small" color="primary" />
                )}
                {p.id === myPlayerId && p.id !== session.hostPlayerId && (
                  <Chip label="You" size="small" variant="outlined" />
                )}
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleStartGame}
            disabled={starting}
            sx={{ fontWeight: 700 }}
          >
            {starting ? <CircularProgress size={20} color="inherit" /> : 'Start Game'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── Create Form ───────────────────────────────────────────────────────────
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
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          {createError && <Alert severity="error">{createError}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!displayName.trim() || creating}
          sx={{ fontWeight: 700 }}
        >
          {creating ? <CircularProgress size={20} color="inherit" /> : 'Create Game'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
