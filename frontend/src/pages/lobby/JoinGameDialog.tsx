import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
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
  hostPlayerId: string;
  players: Player[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  prefillCode?: string;
  onGameStarted: (sessionId: string, playerId: string) => void;
}

export default function JoinGameDialog({ open, onClose, prefillCode = '', onGameStarted }: Props) {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);

  const [code, setCode] = useState(prefillCode.toUpperCase());
  const [displayName, setDisplayName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerId, setMyPlayerId] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [starting, setStarting] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (prefillCode) setCode(prefillCode.toUpperCase());
  }, [prefillCode]);

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

    socket.on('yearStarted', () => {
      setGameStarted(true);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, token]);

  useEffect(() => {
    if (gameStarted && session && myPlayerId) {
      dispatch(setAuth({ playerId: myPlayerId, gameSessionId: session.id, playerName: displayName, token: token! }));
      dispatch(setGameState({ sessionStatus: 'active' }));
      onGameStarted(session.id, myPlayerId);
    }
  }, [gameStarted, session, myPlayerId, displayName, token, dispatch, onGameStarted]);

  function handleClose() {
    setSession(null);
    setPlayers([]);
    setMyPlayerId('');
    setCode(prefillCode.toUpperCase());
    setDisplayName('');
    setJoinError('');
    setGameStarted(false);
    onClose();
  }

  async function handleJoin() {
    if (!code.trim() || !displayName.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const { data: listData } = await api.get('/sessions');
      const found: Session | undefined = listData.sessions.find(
        (s: Session) => s.code === code.toUpperCase(),
      );
      if (!found) {
        setJoinError('No active game found with that code.');
        return;
      }

      const { data } = await api.post(`/sessions/${found.id}/join`, {
        code: code.toUpperCase(),
        displayName: displayName.trim(),
      });

      setMyPlayerId(data.player.id);

      const { data: sessData } = await api.get(`/sessions/${found.id}`);
      setSession(sessData.session);
      setPlayers(sessData.session.players);
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

  async function handleStartGame() {
    if (!session) return;
    setStarting(true);
    try {
      dispatch(setAuth({ playerId: myPlayerId, gameSessionId: session.id, playerName: displayName, token: token! }));
      dispatch(setGameState({ sessionStatus: 'active' }));
      onGameStarted(session.id, myPlayerId);
    } finally {
      setStarting(false);
    }
  }

  // ── Waiting Room ──────────────────────────────────────────────────────────
  if (session) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>🍋 Waiting Room</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Game Code
            </Typography>
            <Typography variant="h4" fontWeight={800} letterSpacing={4} color="primary">
              {session.code}
            </Typography>
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
                  <Chip label="You" size="small" variant="outlined" sx={{ ml: 0.5 }} />
                )}
              </ListItem>
            ))}
          </List>

          <Alert severity="info" sx={{ mt: 2 }}>
            Anyone can start the game when ready.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Leave
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

  // ── Join Form ─────────────────────────────────────────────────────────────
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
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
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
