/**
 * GameEventsListener — an always-mounted socket listener for game-wide events
 * that must update the UI no matter which page the player is on. Currently
 * handles `yearStarted` (the shared year clock advancing once every player has
 * finished paying expenses).
 */
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { Snackbar, Alert } from '@mui/material';
import type { RootState } from '../../store';
import { setGameState } from './gameSlice';
import { clearCart } from '../actions/actionsSlice';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001';

interface YearStartedPayload {
  year: number;
  gameSessionId: string;
  playerAges: Record<string, number>;
}

export default function GameEventsListener() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { token, gameSessionId, playerId } = useSelector((s: RootState) => s.auth);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !gameSessionId) return;

    const socket = io(SOCKET_URL, { auth: { token } });
    socket.emit('joinGame', { gameSessionId });

    const onYearStarted = (payload: YearStartedPayload) => {
      dispatch(setGameState({ currentYear: payload.year }));
      dispatch(clearCart());
      queryClient.invalidateQueries();
      const age = playerId ? payload.playerAges[playerId] : undefined;
      setToast(age ? `Welcome to year ${payload.year} — you're now ${age}.` : `Year ${payload.year} has begun.`);
    };

    socket.on('yearStarted', onYearStarted);
    return () => {
      socket.off('yearStarted', onYearStarted);
      socket.disconnect();
    };
  }, [token, gameSessionId, playerId, dispatch, queryClient]);

  return (
    <Snackbar
      open={!!toast}
      autoHideDuration={6000}
      onClose={() => setToast(null)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity="success" onClose={() => setToast(null)} sx={{ fontWeight: 600 }}>
        🎉 {toast}
      </Alert>
    </Snackbar>
  );
}
