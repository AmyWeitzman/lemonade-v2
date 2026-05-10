/**
 * ProfileSetupPage — Step 3 of the profile setup workflow.
 *
 * - Calls POST /players/:id/initialize on mount (idempotent — returns alreadyRolled if already done)
 * - "Generate My Profile" button is disabled once rolled (one-time roll)
 * - "Reset to Rolled Values" resets all adjustments without re-rolling
 * - Trait/skill sliders with budget enforcement
 * - Shows bookmarked jobs and education panels with live eligibility
 * - "Proceed to Review" navigates to /setup/review with state
 *
 * Requirements: 5.1–5.11, 6.1–6.9, 7.1–7.6, 10.3–10.5
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import {
  Alert, Box, Button, CircularProgress, Divider, Paper, Stack, Typography,
} from '@mui/material';
import type { RootState } from '../store';
import { setHasRolledProfile } from '../features/auth/authSlice';
import TraitSliderRow from '../features/profile/TraitSliderRow';
import SkillSliderRow from '../features/profile/SkillSliderRow';
import BudgetMeter from '../features/profile/BudgetMeter';
import { clampTraitDelta, clampSkillDelta, computeTraitBudget, computeSkillBudget } from '../features/profile/budgetUtils';
import { TRAIT_LABELS, SKILL_LABELS } from '../features/profile/constants';
import BookmarkedJobsPanel from '../features/bookmarks/BookmarkedJobsPanel';
import BookmarkedProgramsPanel from '../features/bookmarks/BookmarkedProgramsPanel';
import api from '../lib/api';

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
  const hasRolledProfile = useSelector((s: RootState) => s.auth.hasRolledProfile);

  const [rolledPlayer, setRolledPlayer] = useState<RolledPlayerData | null>(null);
  const [traitDeltas, setTraitDeltas] = useState<Record<string, number>>({});
  const [skillDeltas, setSkillDeltas] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // ── Roll mutation (idempotent) ─────────────────────────────────────────────
  const rollMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/players/${playerId}/initialize`);
      return data as { player: RolledPlayerData; alreadyRolled: boolean };
    },
    onSuccess: ({ player, alreadyRolled }) => {
      setRolledPlayer(player);
      if (!alreadyRolled) {
        setTraitDeltas({});
        setSkillDeltas({});
      }
      dispatch(setHasRolledProfile());
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to generate profile. Please try again.';
      setError(msg);
    },
  });

  // ── Budget ─────────────────────────────────────────────────────────────────
  const { budget: traitBudget, used: traitUsed, remaining: traitRemaining } =
    computeTraitBudget(traitDeltas);
  const { budget: skillBudget, used: skillUsed, remaining: skillRemaining } =
    computeSkillBudget(skillDeltas);

  const handleTraitChange = useCallback((key: string, newDelta: number) => {
    setTraitDeltas((prev) => {
      const clamped = clampTraitDelta(key, newDelta, prev);
      return { ...prev, [key]: clamped };
    });
  }, []);

  const handleSkillChange = useCallback((key: string, newDelta: number) => {
    setSkillDeltas((prev) => {
      const clamped = clampSkillDelta(key, newDelta, prev);
      return { ...prev, [key]: clamped };
    });
  }, []);

  const handleReset = () => {
    setTraitDeltas({});
    setSkillDeltas({});
  };

  const handleProceedToReview = () => {
    navigate('/setup/review', {
      state: { traitDeltas, skillDeltas, rolledPlayer },
    });
  };

  // Current adjusted values for live eligibility in bookmark panels
  const currentTraits = rolledPlayer
    ? Object.fromEntries(
        Object.entries(rolledPlayer.traits).map(([k, v]) => [
          k,
          Math.max(0, Math.min(100, v + (traitDeltas[k] ?? 0))),
        ]),
      )
    : {};
  const currentSkills = rolledPlayer
    ? Object.fromEntries(
        Object.entries(rolledPlayer.skills).map(([k, v]) => [
          k,
          Math.max(0, Math.min(100, v + (skillDeltas[k] ?? 0))),
        ]),
      )
    : {};

  const canProceed = !!rolledPlayer && traitRemaining >= 0 && skillRemaining >= 0;

  // ─── Pre-roll state ────────────────────────────────────────────────────────
  if (!rolledPlayer && !hasRolledProfile) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 600, mx: 'auto', textAlign: 'center', pt: 8 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          Generate Your Profile
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 480, mx: 'auto' }}>
          Roll the dice to discover your starting traits, skills, and what your parents have set
          you up with. You'll get a chance to fine-tune things before the game starts.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
            {error}
          </Alert>
        )}
        <Button
          variant="contained"
          size="large"
          onClick={() => rollMutation.mutate()}
          disabled={rollMutation.isPending}
          sx={{ fontWeight: 700, px: 5, py: 1.5, fontSize: '1.1rem' }}
        >
          {rollMutation.isPending && (
            <CircularProgress size={22} color="inherit" sx={{ mr: 1 }} />
          )}
          🎲 Generate My Profile
        </Button>
      </Box>
    );
  }

  // ─── Loading state (already rolled, fetching data) ─────────────────────────
  if (!rolledPlayer && hasRolledProfile) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading your profile…
        </Typography>
        <Button
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() => rollMutation.mutate()}
          disabled={rollMutation.isPending}
        >
          Reload
        </Button>
      </Box>
    );
  }

  if (!rolledPlayer) return null;

  // ─── Adjust state ──────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            🎯 Profile Setup
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fine-tune your starting traits and skills
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={handleReset}
          disabled={Object.keys(traitDeltas).length === 0 && Object.keys(skillDeltas).length === 0}
        >
          Reset to Rolled Values
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* How adjustments work */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
          How adjustments work
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You start with <strong>50% to distribute across traits</strong> and{' '}
          <strong>10% across skills</strong> (max ±10% per trait, ±2% per skill). Decreasing a
          stat below its rolled value <em>adds</em> to your available budget.
        </Typography>
      </Paper>

      {/* Budget meters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
          <BudgetMeter
            label="Traits Budget"
            budget={traitBudget}
            used={traitUsed}
            remaining={traitRemaining}
          />
          <BudgetMeter
            label="Skills Budget"
            budget={skillBudget}
            used={skillUsed}
            remaining={skillRemaining}
          />
        </Box>
      </Paper>

      {/* Main 3-column layout: traits | skills | bookmarks */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 3,
          mb: 4,
        }}
      >
        {/* Traits column */}
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Traits
          </Typography>
          {Object.entries(TRAIT_LABELS).map(([key, label]) => {
            const base = rolledPlayer.traits[key] ?? 0;
            const delta = traitDeltas[key] ?? 0;
            const sliderMin = Math.max(0, base - 10);
            // Compute max slider position based on remaining budget
            const otherIncreases = Object.entries(traitDeltas)
              .filter(([k]) => k !== key)
              .reduce((s, [, v]) => s + Math.max(0, v), 0);
            const otherDecreases = Object.entries(traitDeltas)
              .filter(([k]) => k !== key)
              .reduce((s, [, v]) => s + Math.max(0, -v), 0);
            const effectiveBudget = 50 + otherDecreases + Math.max(0, -delta);
            const maxUp = Math.min(10, effectiveBudget - otherIncreases);
            const sliderMax = Math.min(100, base + maxUp);
            return (
              <TraitSliderRow
                key={key}
                statKey={key}
                label={label}
                base={base}
                delta={delta}
                sliderMin={sliderMin}
                sliderMax={sliderMax}
                onChange={handleTraitChange}
              />
            );
          })}
        </Box>

        {/* Skills column */}
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Skills
          </Typography>
          {Object.entries(SKILL_LABELS).map(([key, label]) => {
            const base = rolledPlayer.skills[key] ?? 0;
            const delta = skillDeltas[key] ?? 0;
            const sliderMin = Math.max(0, base - 2);
            const otherIncreases = Object.entries(skillDeltas)
              .filter(([k]) => k !== key)
              .reduce((s, [, v]) => s + Math.max(0, v), 0);
            const otherDecreases = Object.entries(skillDeltas)
              .filter(([k]) => k !== key)
              .reduce((s, [, v]) => s + Math.max(0, -v), 0);
            const effectiveBudget = 10 + otherDecreases + Math.max(0, -delta);
            const maxUp = Math.min(2, effectiveBudget - otherIncreases);
            const sliderMax = Math.min(100, base + maxUp);
            return (
              <SkillSliderRow
                key={key}
                statKey={key}
                label={label}
                base={base}
                delta={delta}
                sliderMin={sliderMin}
                sliderMax={sliderMax}
                onChange={handleSkillChange}
              />
            );
          })}
        </Box>

        {/* Bookmarks column */}
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Your Bookmarks
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Eligibility updates live as you adjust your stats.
          </Typography>
          <BookmarkedJobsPanel currentTraits={currentTraits} currentSkills={currentSkills} />
          <Divider sx={{ my: 2 }} />
          <BookmarkedProgramsPanel currentTraits={currentTraits} currentSkills={currentSkills} />
        </Box>
      </Box>

      {/* Actions */}
      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleProceedToReview}
          disabled={!canProceed}
          sx={{ fontWeight: 700, px: 4 }}
        >
          Proceed to Review →
        </Button>
      </Stack>
    </Box>
  );
}
