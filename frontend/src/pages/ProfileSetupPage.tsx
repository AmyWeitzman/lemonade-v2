/**
 * ProfileSetupPage — profile setup workflow.
 *
 * The quiz renders its own fixed header (title + budget) just below the stepper.
 * The page itself just provides the background and scroll container.
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from '@mui/material';
import type { RootState } from '../store';
import { setHasRolledProfile } from '../features/auth/authSlice';
import QuizPage from '../features/profile/quiz/QuizPage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RolledPlayerData {
  traits: Record<string, number>;
  skills: Record<string, number>;
  money: number;
  collegeFund: number;
  chronicConditions: string[];
  parentContributions: {
    car: string | null;
    collegeFund: number;
    maxParentAge: number | null;
    weddingContribution: number;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const playerId = useSelector((s: RootState) => s.auth.playerId);

  const handleRollSuccess = useCallback(() => {
    dispatch(setHasRolledProfile());
  }, [dispatch]);

  const handleConfirmSuccess = useCallback(() => {
    navigate('/setup/review');
  }, [navigate]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: (t) => t.palette.primary.light, px: { xs: 2, md: 3 }, pb: 4 }}>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <QuizPage
          playerId={playerId as string}
          onRollSuccess={handleRollSuccess}
          onConfirmSuccess={handleConfirmSuccess}
        />
      </Box>
    </Box>
  );
}
