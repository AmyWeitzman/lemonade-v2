/**
 * SetupShell — restricted layout wrapper rendered during the profile setup workflow.
 * Shows only the 3 setup nav items (no profile drawer, chat, notifications, settings).
 * Renders SetupProgressStepper below the top bar.
 * On mobile, renders a BottomNavigation with the 3 setup items only.
 * On mount, fetches bookmarks from the API and hydrates the Redux bookmarks slice.
 * Wraps children with SetupModeContext.Provider so all descendants know they are in setup mode.
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  AppBar,
  Box,
  Button,
  Paper,
  Toolbar,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { SETUP_NAV_ITEMS } from './NavItems';
import SetupProgressStepper from './SetupProgressStepper';
import { SetupModeContext } from '../../contexts/SetupModeContext';
import { setBookmarks } from '../../features/bookmarks/bookmarksSlice';
import type { RootState } from '../../store';
import api from '../../lib/api';

// Heights matching AppShell constants
const TOP_BAR_HEIGHT = 56;
const STEPPER_HEIGHT = 64; // approximate height of the SetupProgressStepper Paper
const BOTTOM_NAV_HEIGHT = 56;

/** Derive the active step index (0 | 1 | 2) from the current pathname. */
function pathToStep(pathname: string): number {
  if (pathname.startsWith('/setup/jobs')) return 0;
  if (pathname.startsWith('/setup/education')) return 1;
  // /setup/profile and /setup/review both map to step 2
  return 2;
}

/** Map a step index back to the canonical route path. */
function stepToPath(step: number): string {
  switch (step) {
    case 0:
      return '/setup/jobs';
    case 1:
      return '/setup/education';
    default:
      return '/setup/profile';
  }
}

export interface SetupShellProps {
  children: React.ReactNode;
}

export default function SetupShell({ children }: SetupShellProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const playerId = useSelector((state: RootState) => state.auth.playerId);
  const token = useSelector((state: RootState) => state.auth.token);

  // Derive active step from current route
  const activeStep = pathToStep(location.pathname);

  // Track which steps the player has visited so the stepper can show checkmarks
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(() => new Set([activeStep]));

  // Update visitedSteps whenever the route changes
  useEffect(() => {
    setVisitedSteps((prev) => {
      const next = new Set(prev);
      next.add(pathToStep(location.pathname));
      return next;
    });
  }, [location.pathname]);

  // On mount, fetch bookmarks and hydrate the Redux slice
  useEffect(() => {
    if (!playerId || !token) return;

    api
      .get<{ jobIds: string[]; programIds: string[] }>(`/players/${playerId}/bookmarks`)
      .then(({ data }) => {
        dispatch(setBookmarks({ jobIds: data.jobIds, programIds: data.programIds }));
      })
      .catch(() => {
        // Non-fatal: bookmarks will just be empty; user can still proceed
      });
  }, [playerId, token, dispatch]);

  const handleStepClick = (step: number) => {
    navigate(stepToPath(step));
  };

  // Bottom nav value: find the index of the current path in SETUP_NAV_ITEMS
  const bottomNavValue = SETUP_NAV_ITEMS.findIndex((item) =>
    location.pathname.startsWith(item.path),
  );

  return (
    <SetupModeContext.Provider value={{ isSetupMode: true }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* ── Simplified top AppBar ─────────────────────────────────────── */}
        <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
          <Toolbar sx={{ gap: 2, minHeight: TOP_BAR_HEIGHT }}>
            {/* App logo / title */}
            <Typography
              variant="h6"
              component="div"
              sx={{ fontWeight: 700, whiteSpace: 'nowrap', mr: 2 }}
            >
              🍋 Profile Setup
            </Typography>

            {/* Spacer */}
            <Box sx={{ flex: 1 }} />

            {/* Setup nav items as clickable buttons — desktop/tablet only */}
            {!isMobile &&
              SETUP_NAV_ITEMS.map(({ label, path, Icon }) => {
                const isActive = location.pathname.startsWith(path);
                return (
                  <Button
                    key={path}
                    color="inherit"
                    startIcon={<Icon fontSize="small" />}
                    onClick={() => navigate(path)}
                    sx={{
                      fontWeight: isActive ? 700 : 400,
                      borderBottom: isActive ? '2px solid white' : '2px solid transparent',
                      borderRadius: 0,
                      px: 1.5,
                      py: 0.75,
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {label}
                  </Button>
                );
              })}
          </Toolbar>
        </AppBar>

        {/* ── SetupProgressStepper (below the AppBar) ───────────────────── */}
        <Box
          sx={{
            position: 'fixed',
            top: TOP_BAR_HEIGHT,
            left: 0,
            right: 0,
            zIndex: (t) => t.zIndex.drawer,
          }}
        >
          <SetupProgressStepper
            activeStep={activeStep}
            visitedSteps={visitedSteps}
            onStepClick={handleStepClick}
          />
        </Box>

        {/* ── Main content area ─────────────────────────────────────────── */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            // Push content below the fixed AppBar + fixed Stepper
            pt: `${TOP_BAR_HEIGHT + STEPPER_HEIGHT}px`,
            // On mobile, leave room for the bottom nav
            pb: isMobile ? `${BOTTOM_NAV_HEIGHT}px` : 0,
            minHeight: '100vh',
            overflow: 'auto',
          }}
        >
          {children}
        </Box>

        {/* ── Mobile bottom navigation ──────────────────────────────────── */}
        {isMobile && (
          <Paper
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: (t) => t.zIndex.appBar,
            }}
            elevation={3}
          >
            <BottomNavigation
              value={bottomNavValue >= 0 ? bottomNavValue : 0}
              onChange={(_, newValue: number) => {
                navigate(SETUP_NAV_ITEMS[newValue].path);
              }}
              showLabels
              sx={{ height: BOTTOM_NAV_HEIGHT }}
            >
              {SETUP_NAV_ITEMS.map(({ label, Icon }) => (
                <BottomNavigationAction
                  key={label}
                  label={label}
                  icon={<Icon fontSize="small" />}
                  sx={{
                    minWidth: 0,
                    px: 0.5,
                    '& .MuiBottomNavigationAction-label': {
                      fontSize: 9,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 72,
                    },
                  }}
                />
              ))}
            </BottomNavigation>
          </Paper>
        )}
      </Box>
    </SetupModeContext.Provider>
  );
}
