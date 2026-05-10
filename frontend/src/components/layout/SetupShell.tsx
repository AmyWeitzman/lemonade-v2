/**
 * SetupShell — restricted layout wrapper rendered during the profile setup workflow.
 * No top navbar or bottom nav — just the SetupProgressStepper at the top with
 * back/forward buttons for sequential navigation.
 * On mount, fetches bookmarks from the API and hydrates the Redux bookmarks slice.
 * Wraps children with SetupModeContext.Provider so all descendants know they are in setup mode.
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box } from '@mui/material';
import SetupProgressStepper from './SetupProgressStepper';
import { SetupModeContext } from '../../contexts/SetupModeContext';
import { setBookmarks } from '../../features/bookmarks/bookmarksSlice';
import type { RootState } from '../../store';
import api from '../../lib/api';

const STEPPER_HEIGHT = 56;

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

  return (
    <SetupModeContext.Provider value={{ isSetupMode: true }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* ── SetupProgressStepper (fixed at top, no AppBar above it) ──── */}
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: (t) => t.zIndex.appBar,
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
            pt: `${STEPPER_HEIGHT}px`,
            minHeight: '100vh',
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </SetupModeContext.Provider>
  );
}
