/**
 * SetupShell — restricted layout wrapper rendered during the profile setup workflow.
 * No top navbar or bottom nav — just the SetupProgressStepper at the top.
 * Wraps children with SetupModeContext.Provider so all descendants know they are in setup mode.
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import SetupProgressStepper from './SetupProgressStepper';
import { SetupModeContext } from '../../contexts/SetupModeContext';

const STEPPER_HEIGHT = 56;

/** All setup routes map to step 0 (Profile Setup). */
function pathToStep(_pathname: string): number {
  return 0;
}

/** Step 0 maps to the profile setup route. */
function stepToPath(_step: number): string {
  return '/setup/profile';
}

export interface SetupShellProps {
  children: React.ReactNode;
}

export default function SetupShell({ children }: SetupShellProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active step from current route (always 0)
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
