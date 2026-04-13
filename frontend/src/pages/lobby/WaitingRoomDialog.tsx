import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
  Box,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useDispatch, useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import type { RootState } from '../../store';
import { setAuth } from '../../features/auth/authSlice';
import { setGameState } from '../../features/game/gameSlice';

interface Player {
  id: string;
  name: string;
  userId: string;
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
  session: Session;
  onGameStarted: (sessionId: string, playerId: string) => void;
}

export default function WaitingRoomDialog({ open, onClose, session: initialSession, onGameStarted }: Props) {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const userId = useSelector((state: RootState) => state.auth.userId);
  const playerName = useSelector((state: RootState) => state.auth.username);

  const [players, setPlayers] = useState<Player[]>(initialSession.players);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const myPlayer = players.find((p) => p.userId === userId);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!open || !token) return;

    const socket = io('http://localhost:3001', { auth: { token } });
    socketRef.current = socket;
    socket.emit('joinGame', { gameSessionId: initialSession.id });

    socket.on('playerJoined', (payload: { playerId: string; playerName: string; userId?: string }) => {
      setPlayers((prev) => {
        if (prev.find((p) => p.id === payload.playerId)) return prev;
        return [...prev, { id: payload.playerId, name: payload.playerName, userId: payload.userId ?? '' }];
      });
    });

    socket.on('playerLeft', (payload: { playerId: string }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== payload.playerId));
    });

    socket.on('yearStarted', () => {
      if (myPlayer) {
        dispatch(setAuth({ playerId: myPlayer.id, gameSessionId: initialSession.id, playerName: myPlayer.name, token: token! }));
        dispatch(setGameState({ sessionStatus: 'active' }));
        onGameStarted(initialSession.id, myPlayer.id);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [open, token]);

  function handleCopy() {
    navigator.clipboard.writeText(initialSession.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleStart() {
    if (!myPlayer) return;
    setStarting(true);
    try {
      dispatch(setAuth({ playerId: myPlayer.id, gameSessionId: initialSession.id, playerName: myPlayer.name, token: token! }));
      dispatch(setGameState({ sessionStatus: 'active' }));
      onGameStarted(initialSession.id, myPlayer.id);
    } finally {
      setStarting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>🍋 Waiting Room</DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Share this code with friends
          </Typography>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: 'primary.light', px: 3, py: 1.5, borderRadius: 2 }}>
            <Typography variant="h4" fontWeight={800} letterSpacing={4} color="primary.dark">
              {initialSession.code}
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
              <IconButton size="small" onClick={handleCopy} color="primary">
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
              <ListItemText
                primary={
                  p.id === initialSession.hostPlayerId
                    ? <><strong>{p.name} (Host)</strong></>
                    : p.name
                }
              />
              {p.userId === userId && (
                <Chip label="You" size="small" variant="outlined" />
              )}
            </ListItem>
          ))}
        </List>

        <Alert severity="info" sx={{ mt: 2 }}>
          Anyone can start the game when ready.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Close</Button>
        <Button variant="contained" onClick={handleStart} disabled={starting} sx={{ fontWeight: 700 }}>
          {starting ? <CircularProgress size={20} color="inherit" /> : 'Start Game'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
