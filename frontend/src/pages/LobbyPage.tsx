import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../features/auth/authSlice';
import api from '../lib/api';
import CreateGameDialog from './lobby/CreateGameDialog';
import JoinGameDialog from './lobby/JoinGameDialog';
import WaitingRoomDialog from './lobby/WaitingRoomDialog';
import GameInstructions from './lobby/GameInstructions';

interface Player {
  id: string;
  name: string;
  userId: string;
}

interface Session {
  id: string;
  code: string;
  theme: string;
  maxPlayers: number;
  status: string;
  hostPlayerId: string;
  createdAt: string;
  players: Player[];
}

const THEME_LABELS: Record<string, string> = {
  default: '🍋 Classic Lemonade',
  tropical: '🌴 Tropical',
  winter: '❄️ Winter Citrus',
};

export default function LobbyPage() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const username = useSelector((state: RootState) => state.auth.username);

  const [tab, setTab] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [waitingSession, setWaitingSession] = useState<Session | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await api.get('/sessions');
      return data.sessions as Session[];
    },
    refetchInterval: 15_000,
  });

  const sessions = data ?? [];
  const activeSessions = sessions.filter((s) => s.status === 'waiting' || s.status === 'active');
  const completedSessions = sessions.filter((s) => s.status === 'ended');

  function handleJoinFromCard(code: string) {
    setJoinCode(code);
    setJoinOpen(true);
  }

  function handleGameStarted(_sessionId: string, _playerId: string) {
    setCreateOpen(false);
    setJoinOpen(false);
    setWaitingSession(null);
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.primary.light, pb: 6 }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: theme.palette.primary.main,
          px: { xs: 2, md: 6 },
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h5" fontWeight={800} color={theme.palette.primary.contrastText}>
          <Box component="span" sx={{ fontSize: '1.6rem', filter: 'drop-shadow(0 1px 1px rgba(255,255,255,0.9))', mr: 1 }}>
            🍋
          </Box>
          Lemonade
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={600} color={theme.palette.primary.contrastText}>
            {username}
          </Typography>
          <Tooltip title="Sign out">
            <IconButton size="small" onClick={() => dispatch(logout())} sx={{ color: theme.palette.primary.contrastText }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, md: 6 }, pt: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ fontWeight: 700, px: 3 }}>
            Create Game
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<LoginIcon />}
            onClick={() => { setJoinCode(''); setJoinOpen(true); }}
            sx={{
              fontWeight: 700, px: 3,
              bgcolor: theme.palette.background.paper,
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
              '&:hover': { bgcolor: theme.palette.background.paper, borderColor: theme.palette.primary.dark, color: theme.palette.primary.dark },
            }}
          >
            Join Game
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()} sx={{ ml: 'auto', color: theme.palette.primary.main }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Box sx={{ bgcolor: theme.palette.background.paper, borderRadius: 2, boxShadow: 1 }}>
          <Tabs
            value={tab}
            onChange={(_e, v) => setTab(v)}
            sx={{
              borderBottom: '1px solid', borderColor: 'divider', px: 2,
              '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '1rem' },
              '& .Mui-selected': { color: theme.palette.primary.main },
              '& .MuiTabs-indicator': { bgcolor: theme.palette.primary.main },
            }}
          >
            <Tab label={`Active Games (${activeSessions.length})`} />
            <Tab label={`Completed Games (${completedSessions.length})`} />
            <Tab label="How to Play" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {tab === 0 && (
              <SessionList
                sessions={activeSessions}
                isLoading={isLoading}
                isError={isError}
                emptyMessage="No open games right now. Create one!"
                onJoin={handleJoinFromCard}
                onEnter={(s) => setWaitingSession(s)}
              />
            )}
            {tab === 1 && (
              <SessionList
                sessions={completedSessions}
                isLoading={isLoading}
                isError={isError}
                emptyMessage="No completed games yet."
                onJoin={handleJoinFromCard}
                onEnter={(s) => setWaitingSession(s)}
              />
            )}
            {tab === 2 && <GameInstructions />}
          </Box>
        </Box>
      </Box>

      <CreateGameDialog open={createOpen} onClose={() => setCreateOpen(false)} onGameStarted={handleGameStarted} />
      <JoinGameDialog open={joinOpen} onClose={() => setJoinOpen(false)} prefillCode={joinCode} onGameStarted={handleGameStarted} />
      {waitingSession && (
        <WaitingRoomDialog
          open
          onClose={() => setWaitingSession(null)}
          session={waitingSession}
          onGameStarted={handleGameStarted}
        />
      )}
    </Box>
  );
}

function SessionList({
  sessions, isLoading, isError, emptyMessage, onJoin, onEnter,
}: {
  sessions: Session[];
  isLoading: boolean;
  isError: boolean;
  emptyMessage: string;
  onJoin: (code: string) => void;
  onEnter: (session: Session) => void;
}) {
  const theme = useTheme();

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress color="primary" /></Box>;
  if (isError) return <Alert severity="error">Failed to load sessions. Make sure the backend is running.</Alert>;
  if (sessions.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, border: '2px dashed', borderColor: theme.palette.primary.light, borderRadius: 2 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>🍋</Typography>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr', xl: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} onJoin={() => onJoin(s.code)} onEnter={() => onEnter(s)} />
      ))}
    </Box>
  );
}

function SessionCard({ session, onJoin, onEnter }: { session: Session; onJoin: () => void; onEnter: () => void }) {
  const theme = useTheme();
  const userId = useSelector((state: RootState) => state.auth.userId);
  const isMySession = session.players.some((p) => p.userId === userId);
  const playerCount = session.players.length;
  const playerWord = playerCount === 1 ? 'player' : 'players';
  const themeLabel = THEME_LABELS[session.theme] ?? session.theme;

  // Build player name list with only "(Host)" bolded
  const playerNames = session.players.reduce<React.ReactNode[]>((acc, p, i) => {
    const label = p.id === session.hostPlayerId
      ? <span key={p.id}>{p.name} <strong>(Host)</strong></span>
      : <span key={p.id}>{p.name}</span>;
    return i === 0 ? [label] : [...acc, ', ', label];
  }, []);

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2 }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography fontWeight={700} variant="body1">
                Game Code:{' '}
                <Box component="span" sx={{ fontFamily: 'monospace', color: theme.palette.primary.main }}>
                  {session.code}
                </Box>
              </Typography>
              {session.status === 'active' && <Chip label="In Progress" size="small" color="warning" />}
            </Stack>
            <Typography variant="body1" color="text.primary" sx={{ display: 'block', mb: 0.5 }}>
              Created {new Date(session.createdAt).toLocaleDateString()}
            </Typography>
            <Typography variant="body1" color="text.primary" sx={{ display: 'block' }}>
              <strong>Theme:</strong> {themeLabel}
            </Typography>
            <Typography variant="body1" color="text.primary" sx={{ mt: 1, wordBreak: 'break-word' }}>
              {playerCount} {playerWord} {'~'} {playerNames}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
      {isMySession && (
        <CardActions sx={{ pt: 0, px: 2, pb: 1.5 }} onClick={(e) => e.stopPropagation()}>
          <Button size="small" variant="contained" onClick={onEnter} sx={{ fontWeight: 700 }}>
            Start Game
          </Button>
        </CardActions>
      )}
      {!isMySession && session.status === 'waiting' && (
        <CardActions sx={{ pt: 0, px: 2, pb: 1.5 }} onClick={(e) => e.stopPropagation()}>
          <Button size="small" variant="contained" onClick={onJoin}>Join</Button>
        </CardActions>
      )}
    </Card>
  );
}
