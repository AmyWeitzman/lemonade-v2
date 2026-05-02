/**
 * AppShell — main layout wrapper for the game UI.
 * Composes TopNavBar, SideNavDrawer, BottomNavBar, and page content.
 *
 * Responsive layout:
 *   Mobile  (<768px):  TopNavBar + BottomNavBar (no side drawer)
 *   Tablet  (768-1024px): TopNavBar + temporary side drawer
 *   Desktop (>1024px): TopNavBar + persistent sidebar
 */
import { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import TopNavBar from './TopNavBar';
import SideNavDrawer from './SideNavDrawer';
import BottomNavBar from './BottomNavBar';
import ProfileDrawer from './ProfileDrawer';
import ChatPanel from '../../features/messages/ChatPanel';
import { useNavPreferences } from '../../hooks/useNavPreferences';

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED_WIDTH = 64;
const TOP_BAR_HEIGHT = 56;
const BOTTOM_NAV_HEIGHT = 56;

interface Props {
  children: React.ReactNode;
}

export default function AppShell({ children }: Props) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { prefs, setDrawerOpen } = useNavPreferences();
  const [drawerOpen, setDrawerOpenState] = useState(prefs.drawerOpen);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

  const handleMenuClick = () => {
    const next = !drawerOpen;
    setDrawerOpenState(next);
    setDrawerOpen(next);
  };

  const handleDrawerClose = () => {
    setDrawerOpenState(false);
    setDrawerOpen(false);
  };

  const handleOpenProfile = () => {
    setProfileDrawerOpen(true);
  };

  const handleCloseProfile = () => {
    setProfileDrawerOpen(false);
  };

  // On desktop, sidebar is always visible; calculate its current width
  const sidebarWidth = isDesktop
    ? prefs.sidebarCollapsed
      ? DRAWER_COLLAPSED_WIDTH
      : DRAWER_WIDTH
    : 0;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <TopNavBar onMenuClick={handleMenuClick} />

      <SideNavDrawer open={drawerOpen} onClose={handleDrawerClose} onOpenProfile={handleOpenProfile} />

      {/* Profile Drawer (Tending the Garden) */}
      <ProfileDrawer open={profileDrawerOpen} onClose={handleCloseProfile} />

      {/* Chat Panel (Lemon Tea) */}
      <ChatPanel />

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: `${TOP_BAR_HEIGHT}px`,
          pb: isMobile ? `${BOTTOM_NAV_HEIGHT}px` : 0,
          ml: isDesktop ? `${sidebarWidth}px` : 0,
          transition: theme.transitions.create('margin-left', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
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
