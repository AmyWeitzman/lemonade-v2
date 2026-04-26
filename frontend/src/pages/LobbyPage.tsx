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
  FormControlLabel,
  Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

function TabLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <span>{label}</span>
      <Tooltip title={tip} arrow>
        <InfoOutlinedIcon sx={{ fontSize: '0.95rem', opacity: 0.6 }} />
      </Tooltip>
    </Stack>
  );
}
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { logout, setAuth } from '../features/auth/authSlice';
import { setGameState } from '../features/game/gameSlice';
import api from '../lib/api';
import CreateGameDialog from './lobby/CreateGameDialog';
import JoinGameDialog from './lobby/JoinGameDialog';
import GameInstructions from './lobby/GameInstructions';

// dev = any player can delete; prod = only leave/hide
const IS_DEV = import.meta.env.VITE_GAME_MODE === 'dev';

interface Player {
  id: string;
  name: string;
  userId: string;
  leftAt?: string | null;
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
  isHidden?: boolean; // only present on archived sessions
}

const THEME_LABELS: Record<string, string> = {
  default: '🍋 Classic Lemonade',
  tropical: '🌴 Tropical',
  winter: '❄️ Winter Citrus',
};

export default function LobbyPage() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const username = useSelector((state: RootState) => state.auth.username);
  const userId = useSelector((state: RootState) => state.auth.userId);
  const token = useSelector((state: RootState) => state.auth.token);

  const [tab, setTab] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await api.get('/sessions');
      return data.sessions as Session[];
    },
    refetchInterval: 15_000,
  });

  const { data: archivedData, refetch: refetchArchived } = useQuery({
    queryKey: ['sessions', 'archived'],
    queryFn: async () => {
      const { data } = await api.get('/sessions/archived');
      return data.sessions as Session[];
    },
  });

  const sessions = data ?? [];
  const archivedSessions = archivedData ?? [];

  // "Making Lemonade" — active/waiting games I'm in (not left)
  const mySessions = sessions.filter(
    (s) => (s.status === 'waiting' || s.status === 'active') && s.players.some((p) => p.userId === userId)
  );
  // "Lemonade Made" — ended games where I was still active (leftAt is null)
  const completedSessions = archivedSessions.filter(
    (s) => s.status === 'ended' && s.players.some((p) => p.userId === userId && !p.leftAt)
  );
  // "The Compost" — games I left or was kicked from (leftAt is set)
  const compostSessions = archivedSessions.filter(
    (s) => s.players.some((p) => p.userId === userId && p.leftAt)
  );

  const [showHiddenCompleted, setShowHiddenCompleted] = useState(false);
  const [showHiddenCompost, setShowHiddenCompost] = useState(false);

  const visibleCompleted = showHiddenCompleted ? completedSessions : completedSessions.filter((s) => !s.isHidden);
  const visibleCompost = showHiddenCompost ? compostSessions : compostSessions.filter((s) => !s.isHidden);

  function handleEnterGame(session: Session) {
    const myPlayer = session.players.find((p) => p.userId === userId);
    if (!myPlayer || !token) return;
    dispatch(setAuth({ playerId: myPlayer.id, gameSessionId: session.id, playerName: myPlayer.name, token }));
    dispatch(setGameState({ sessionStatus: 'active' }));
  }

  async function handleLeave(sessionId: string) {
    try {
      await api.post(`/sessions/${sessionId}/leave`);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'archived'] });
    } catch { /* ignore */ }
  }

  async function handleDelete(sessionId: string) {
    try {
      await api.delete(`/sessions/${sessionId}`);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'archived'] });
    } catch { /* ignore */ }
  }

  async function handleHide(sessionId: string) {
    try {
      await api.post(`/sessions/${sessionId}/hide`);
      queryClient.invalidateQueries({ queryKey: ['sessions', 'archived'] });
    } catch { /* ignore */ }
  }

  async function handleUnhide(sessionId: string) {
    try {
      await api.delete(`/sessions/${sessionId}/hide`);
      queryClient.invalidateQueries({ queryKey: ['sessions', 'archived'] });
    } catch { /* ignore */ }
  }
  function handleGameStarted() {
    setCreateOpen(false);
    setJoinOpen(false);
    refetch();
  }

  function handleRefreshAll() {
    refetch();
    refetchArchived();
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.primary.light, pb: 6 }}>
      {/* Header */}
      <Box sx={{ bgcolor: theme.palette.primary.main, px: { xs: 2, md: 6 }, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" fontWeight={800} color={theme.palette.primary.contrastText}>
          <Box component="span" sx={{ fontSize: '1.6rem', filter: 'drop-shadow(0 1px 1px rgba(255,255,255,0.9))', mr: 1 }}>🍋</Box>
          Lemonade
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={600} color={theme.palette.primary.contrastText}>{username}</Typography>
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
            variant="outlined" size="large" startIcon={<LoginIcon />}
            onClick={() => { setJoinCode(''); setJoinOpen(true); }}
            sx={{ fontWeight: 700, px: 3, bgcolor: theme.palette.background.paper, borderColor: theme.palette.primary.main, color: theme.palette.primary.main, '&:hover': { bgcolor: theme.palette.background.paper, borderColor: theme.palette.primary.dark, color: theme.palette.primary.dark } }}
          >
            Join Game
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefreshAll} sx={{ ml: 'auto', color: theme.palette.primary.main }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Box sx={{ bgcolor: theme.palette.background.paper, borderRadius: 2, boxShadow: 1 }}>
          <Tabs
            value={tab} onChange={(_e, v) => setTab(v)}
            sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '1rem' }, '& .Mui-selected': { color: theme.palette.primary.main }, '& .MuiTabs-indicator': { bgcolor: theme.palette.primary.main } }}
          >
            <Tab label={<TabLabel label={`Making Lemonade (${mySessions.length})`} tip="Games you're currently playing" />} />
            <Tab label={<TabLabel label={`Lemonade Made (${completedSessions.length})`} tip="Games that have been completed" />} />
            <Tab label={<TabLabel label={`The Compost (${compostSessions.length})`} tip="Games you left or were removed from" />} />
            <Tab label="How to Play" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {tab === 0 && (
              <SessionGrid
                sessions={mySessions}
                isLoading={isLoading}
                isError={isError}
                emptyMessage="You haven't joined any games yet. Create or join one!"
                userId={userId}
                mode="active"
                onEnter={handleEnterGame}
                onLeave={handleLeave}
                onDelete={handleDelete}
              />
            )}
            {tab === 1 && (
              <>
                <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={<Switch checked={showHiddenCompleted} onChange={(e) => setShowHiddenCompleted(e.target.checked)} size="small" />}
                    label={<Typography variant="body2">Show hidden games</Typography>}
                  />
                </Stack>
                <SessionGrid
                  sessions={visibleCompleted}
                  isLoading={false}
                  isError={false}
                  emptyMessage="No completed games yet."
                  userId={userId}
                  mode="archived"
                  onEnter={handleEnterGame}
                  onLeave={handleLeave}
                  onDelete={handleDelete}
                  onHide={handleHide}
                  onUnhide={handleUnhide}
                />
              </>
            )}
            {tab === 2 && (
              <>
                <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={<Switch checked={showHiddenCompost} onChange={(e) => setShowHiddenCompost(e.target.checked)} size="small" />}
                    label={<Typography variant="body2">Show hidden games</Typography>}
                  />
                </Stack>
                <SessionGrid
                  sessions={visibleCompost}
                  isLoading={false}
                  isError={false}
                  emptyMessage="No games in the compost yet."
                  userId={userId}
                  mode="archived"
                  onEnter={handleEnterGame}
                  onLeave={handleLeave}
                  onDelete={handleDelete}
                  onHide={handleHide}
                  onUnhide={handleUnhide}
                />
              </>
            )}
            {tab === 3 && <GameInstructions />}
          </Box>
        </Box>
      </Box>

      <CreateGameDialog open={createOpen} onClose={() => setCreateOpen(false)} onGameStarted={handleGameStarted} />
      <JoinGameDialog open={joinOpen} onClose={() => setJoinOpen(false)} prefillCode={joinCode} onGameStarted={handleGameStarted} />
    </Box>
  );
}

function SessionGrid({
  sessions, isLoading, isError, emptyMessage, userId, mode, onEnter, onLeave, onDelete, onHide, onUnhide,
}: {
  sessions: Session[];
  isLoading: boolean;
  isError: boolean;
  emptyMessage: string;
  userId: string | null;
  mode: 'active' | 'archived';
  onEnter: (session: Session) => void;
  onLeave: (id: string) => void;
  onDelete: (id: string) => void;
  onHide?: (id: string) => void;
  onUnhide?: (id: string) => void;
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
        <SessionCard
          key={s.id}
          session={s}
          userId={userId}
          mode={mode}
          onEnter={() => onEnter(s)}
          onLeave={() => onLeave(s.id)}
          onDelete={() => onDelete(s.id)}
          onHide={onHide ? () => onHide(s.id) : undefined}
          onUnhide={onUnhide ? () => onUnhide(s.id) : undefined}
        />
      ))}
    </Box>
  );
}

function SessionCard({ session, userId, mode, onEnter, onLeave, onDelete, onHide, onUnhide }: {
  session: Session;
  userId: string | null;
  mode: 'active' | 'archived';
  onEnter: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onHide?: () => void;
  onUnhide?: () => void;
}) {
  const theme = useTheme();
  const isMySession = session.players.some((p) => p.userId === userId);
  const playerCount = session.players.length;
  const playerWord = playerCount === 1 ? 'player' : 'players';
  const themeLabel = THEME_LABELS[session.theme] ?? session.theme;
  const isClickable = mode === 'active' && isMySession;

  const playerNames = session.players.reduce<React.ReactNode[]>((acc, p, i) => {
    const label = p.id === session.hostPlayerId
      ? <span key={p.id}>{p.name} <strong>(Host)</strong></span>
      : <span key={p.id}>{p.name}</span>;
    return i === 0 ? [label] : [...acc, ', ', label];
  }, []);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
        '&:hover': isClickable ? { boxShadow: 3, borderColor: theme.palette.primary.main } : {},
        display: 'flex',
        flexDirection: 'column',
        opacity: session.isHidden ? 0.6 : 1,
      }}
      onClick={isClickable ? onEnter : undefined}
    >
      <CardContent sx={{ pb: 1, flexGrow: 1 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }} flexWrap="wrap">
              <Typography fontWeight={700} variant="body1">
                Game Code:{' '}
                <Box component="span" sx={{ fontFamily: 'monospace', color: theme.palette.primary.main }}>
                  {session.code}
                </Box>
              </Typography>
              {session.status === 'active' && <Chip label="In Progress" size="small" color="warning" />}
              {session.isHidden && <Chip label="Hidden" size="small" variant="outlined" color="default" />}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Created {new Date(session.createdAt).toLocaleDateString()}
            </Typography>
            <Typography variant="body1" color="text.primary" sx={{ display: 'block' }}>
              <strong>Theme:</strong> {themeLabel}
            </Typography>
            <Typography variant="body1" color="text.primary" sx={{ mt: 1, wordBreak: 'break-word' }}>
              {playerCount} {playerWord} ~ {playerNames}
            </Typography>
          </Box>
        </Stack>
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 1.5, flexWrap: 'wrap', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
        {mode === 'active' && isMySession && (
          <Typography variant="caption" sx={{ color: theme.palette.primary.main, fontWeight: 600, mr: 'auto' }}>
            Click to enter game →
          </Typography>
        )}

        {/* Remove me from game — always available in active mode */}
        {mode === 'active' && (
          <Tooltip title="Remove me from this game">
            <Button size="small" variant="outlined" color="warning" startIcon={<ExitToAppIcon />} onClick={onLeave} sx={{ fontSize: '0.7rem' }}>
              Leave
            </Button>
          </Tooltip>
        )}

        {/* Delete game — dev mode: any player; prod mode: nobody from lobby (host-only via backend) */}
        {IS_DEV && (
          <Tooltip title="Delete game (dev only)">
            <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={onDelete} sx={{ fontSize: '0.7rem' }}>
              Delete
            </Button>
          </Tooltip>
        )}

        {/* Hide/Unhide — archived tab only */}
        {mode === 'archived' && !session.isHidden && onHide && (
          <Tooltip title="Hide from your view">
            <Button size="small" variant="outlined" startIcon={<VisibilityOffIcon />} onClick={onHide} sx={{ fontSize: '0.7rem' }}>
              Hide
            </Button>
          </Tooltip>
        )}
        {mode === 'archived' && session.isHidden && onUnhide && (
          <Tooltip title="Unhide">
            <Button size="small" variant="outlined" startIcon={<VisibilityIcon />} onClick={onUnhide} sx={{ fontSize: '0.7rem' }}>
              Unhide
            </Button>
          </Tooltip>
        )}
      </CardActions>
    </Card>
  );
}
