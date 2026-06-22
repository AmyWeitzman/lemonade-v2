/**
 * AppShell — main layout wrapper for the game UI.
 * Composes TopNavBar, SideNavDrawer, BottomNavBar, and page content.
 *
 * The sidebar is an overlay (temporary drawer) on all breakpoints — it never
 * shifts page content when opened or closed.
 */
import { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import TopNavBar from './TopNavBar';
import SideNavDrawer from './SideNavDrawer';
import BottomNavBar from './BottomNavBar';
import ChatPanel from '../../features/messages/ChatPanel';
import { useNavPreferences } from '../../hooks/useNavPreferences';

const TOP_BAR_HEIGHT = 56;
const BOTTOM_NAV_HEIGHT = 56;

interface Props {
  children: React.ReactNode;
}

export default function AppShell({ children }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { prefs, setDrawerOpen } = useNavPreferences();
  const [drawerOpen, setDrawerOpenState] = useState(prefs.drawerOpen ?? true);

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
