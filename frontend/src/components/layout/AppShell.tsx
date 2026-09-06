/**
 * AppShell — main layout wrapper for the game UI.
 * Composes TopNavBar, SideNavDrawer, BottomNavBar, and page content.
 *
 * The sidebar is an overlay (temporary drawer) on all breakpoints — it never
 * shifts page content when opened or closed.
 */
import { useEffect, useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import TopNavBar from './TopNavBar';
import SideNavDrawer from './SideNavDrawer';
import BottomNavBar from './BottomNavBar';
import ChatPanel from '../../features/messages/ChatPanel';
import GameEventsListener from '../../features/game/GameEventsListener';
import { useNavPreferences } from '../../hooks/useNavPreferences';
import type { RootState } from '../../store';
import { setPlayerStats } from '../../features/auth/authSlice';
import { hydrateCart } from '../../features/actions/actionsSlice';
import api from '../../lib/api';

const TOP_BAR_HEIGHT = 56;
const BOTTOM_NAV_HEIGHT = 56;

interface Props {
  children: React.ReactNode;
}

export default function AppShell({ children }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();

  const { prefs, setDrawerOpen } = useNavPreferences();
  const [drawerOpen, setDrawerOpenState] = useState(prefs.drawerOpen ?? true);

  // Keep the nav bar's money/health/stress in sync with the server — several
  // flows (jobs, finances, year-end processing) change these without dispatching
  // setPlayerStats, so the values shown here can otherwise go stale for the
  // whole session.
  const playerId = useSelector((s: RootState) => s.auth.playerId);
  const gameSessionId = useSelector((s: RootState) => s.auth.gameSessionId);

  // Restore the player's saved cart for this game session — Redux state is lost
  // on reload/logout, so a returning player would otherwise see an empty cart.
  const persistedCartSessionId = useSelector((s: RootState) => s.actions.cartSessionId);
  useEffect(() => {
    if (gameSessionId && gameSessionId !== persistedCartSessionId) {
      dispatch(hydrateCart({ gameSessionId }));
    }
  }, [gameSessionId, persistedCartSessionId, dispatch]);
  const { data: liveStats } = useQuery({
    queryKey: ['playerLiveStats', playerId],
    queryFn: async () => {
      const { data } = await api.get(`/players/${playerId}/profile`);
      return data.player as { money: number; health: number; stress: number };
    },
    enabled: !!playerId,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (liveStats) {
      dispatch(setPlayerStats({
        money: liveStats.money,
        health: liveStats.health,
        stress: liveStats.stress,
      }));
    }
  }, [liveStats, dispatch]);

  const handleMenuClick = () => {
    const next = !drawerOpen;
    setDrawerOpenState(next);
    setDrawerOpen(next);
  };

  const handleDrawerClose = () => {
    setDrawerOpenState(false);
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <TopNavBar onMenuClick={handleMenuClick} />

      {/* Overlay drawer — never shifts page content */}
      <SideNavDrawer open={drawerOpen} onClose={handleDrawerClose} />

      {/* Chat Panel (Lemon Tea) */}
      <ChatPanel />

      {/* Game-wide socket events (year rollover, …) */}
      <GameEventsListener />

      {/* Main content — full width always */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: `${TOP_BAR_HEIGHT}px`,
          pb: isMobile ? `${BOTTOM_NAV_HEIGHT}px` : 0,
          minHeight: '100vh',
          overflow: 'auto',
        }}
      >
        {children}
      </Box>

      <BottomNavBar />
    </Box>
  );
}
