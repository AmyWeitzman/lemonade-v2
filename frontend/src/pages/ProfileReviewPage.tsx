/**
 * ProfileReviewPage — Final step of the profile setup workflow.
 *
 * Reads traitDeltas, skillDeltas, and rolledPlayer from React Router location state.
 * If state is missing (direct navigation), redirects to /setup/profile.
 * Displays finalized values, parent contributions, chronic conditions, and bookmarks.
 * "Confirm Profile" submits to the server and transitions to normal gameplay.
 *
 * Requirements: 8.1–8.10
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, LinearProgress,
  Paper, Stack, Tooltip, Typography,
} from '@mui/material';
import { useEffect } from 'react';
import type { RootState } from '../store';
import { setPlayerInitialized, setPlayerStats } from '../features/auth/authSlice';
import { TRAIT_LABELS, SKILL_LABELS, CAR_LABELS } from '../features/profile/constants';
import api from '../lib/api';
import type { RolledPlayerData } from './ProfileSetupPage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function barColor(v: number) {
  return v >= 70 ? '#4caf50' : v >= 40 ? '#ff9800' : '#f44336';
}

function fmt(n: number) {
  return '$' + n.toLocaleString();
}

function StatBar({ label, value }: { label: string; value: number }) {
  const color = barColor(value);
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        <Typography variant="body2" fontWeight={700} sx={{ color, minWidth: 36, textAlign: 'right' }}>
          {value}%
        </Typography>
      </Stack>
      <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200', overflow: 'hidden' }}>
        <Box
          sx={{
            height: '100%',
            width: `${value}%`,
            bgcolor: color,
            borderRadius: 4,
            transition: 'width 0.2s',
          }}
        />
      </Box>
    </Box>
  );
}

// ─── Bookmarks summary ────────────────────────────────────────────────────────

function BookmarksSummary() {
  const jobIds = useSelector((s: RootState) => s.bookmarks.jobIds);
  const programIds = useSelector((s: RootState) => s.bookmarks.programIds);

  if (jobIds.length === 0 && programIds.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        Your Bookmarks
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        These will remain accessible during gameplay via the "Bookmarked Only" filter.
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        {jobIds.map((id) => (
          <Chip key={id} label={`💼 ${id}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
        ))}
        {programIds.map((id) => (
          <Chip key={id} label={`🎓 ${id}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {jobIds.length} job{jobIds.length !== 1 ? 's' : ''} · {programIds.length} program{programIds.length !== 1 ? 's' : ''} bookmarked
      </Typography>
    </Paper>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface LocationState {
  traitDeltas: Record<string, number>;
  skillDeltas: Record<string, number>;
  rolledPlayer: RolledPlayerData;
}

export default function ProfileReviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const playerId = useSelector((s: RootState) => s.auth.playerId);

  const state = location.state as LocationState | null;

  // Redirect to profile setup if state is missing (direct navigation)
  useEffect(() => {
    if (!state?.rolledPlayer) {
      navigate('/setup/profile', { replace: true });
    }
  }, [state, navigate]);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/players/${playerId}/initialize/confirm`, {
        traitAdjustments: state?.traitDeltas ?? {},
        skillAdjustments: state?.skillDeltas ?? {},
      });
      return data.player as RolledPlayerData;
    },
    onSuccess: (player) => {
      dispatch(setPlayerStats({ money: player.money }));
      dispatch(setPlayerInitialized());
      // App.tsx will detect isInitialized=true and transition to AppShell automatically
    },
  });

  if (!state?.rolledPlayer) return null;

  const { traitDeltas, skillDeltas, rolledPlayer } = state;
  const pc = rolledPlayer.parentContributions;

  // Compute finalized values
  const finalTraits = Object.fromEntries(
    Object.entries(rolledPlayer.traits).map(([k, v]) => [
      k,
      Math.max(0, Math.min(100, v + (traitDeltas[k] ?? 0))),
    ]),
  );
  const finalSkills = Object.fromEntries(
    Object.entries(rolledPlayer.skills).map(([k, v]) => [
      k,
      Math.max(0, Math.min(100, v + (skillDeltas[k] ?? 0))),
    ]),
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            📋 Review Your Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Once you confirm, these values are locked in and the game begins.
          </Typography>
        </Box>
      </Stack>

      {confirmMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(confirmMutation.error as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? 'Failed to confirm profile. Please try again.'}
        </Alert>
      )}

      {/* Main grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 3,
          mb: 3,
        }}
      >
        {/* Traits */}
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Traits
          </Typography>
          {Object.entries(TRAIT_LABELS).map(([key, label]) => (
            <StatBar key={key} label={label} value={finalTraits[key] ?? 0} />
          ))}
        </Paper>

        {/* Skills */}
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Skills
          </Typography>
          {Object.entries(SKILL_LABELS).map(([key, label]) => (
            <StatBar key={key} label={label} value={finalSkills[key] ?? 0} />
          ))}
        </Paper>

        {/* Starting situation */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Finances */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
              Starting Finances
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Starting Money</Typography>
                <Typography variant="body2" fontWeight={700} color="success.main">
                  {fmt(rolledPlayer.money)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">College Fund</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {fmt(rolledPlayer.collegeFund)}
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* Parent contributions */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
              Parent Contributions
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Vehicle Gift</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {pc?.car ? (CAR_LABELS[pc.car] ?? pc.car) : 'None'}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Wedding Contribution</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {fmt(pc?.weddingContribution ?? 0)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Tooltip title="You can live with your parents rent-free up to this age" arrow>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ cursor: 'help', textDecoration: 'underline dotted' }}
                  >
                    Live With Parents Until
                  </Typography>
                </Tooltip>
                <Typography variant="body2" fontWeight={600}>
                  {pc?.maxParentAge === null
                    ? 'N/A'
                    : pc?.maxParentAge === -1
                    ? 'Always'
                    : `Age ${pc.maxParentAge}`}
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* Chronic conditions */}
          {rolledPlayer.chronicConditions.length > 0 && (
            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 2, borderColor: 'warning.main' }}
            >
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: 'warning.dark' }}>
                ⚠️ Chronic Condition
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You have a chronic health condition that caps your maximum health and reduces
                health gain effectiveness by 80%.
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Bookmarks summary */}
      <BookmarksSummary />

      <Divider sx={{ my: 3 }} />

      {/* Actions */}
      <Stack direction="row" justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
          disabled={confirmMutation.isPending}
        >
          ← Back to Adjust
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={() => confirmMutation.mutate()}
          disabled={confirmMutation.isPending}
          sx={{ fontWeight: 700, px: 5 }}
        >
          {confirmMutation.isPending && (
            <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
          )}
          🍋 Confirm Profile & Start Playing
        </Button>
      </Stack>
    </Box>
  );
}
