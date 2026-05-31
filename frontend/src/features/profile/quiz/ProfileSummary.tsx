/**
 * ProfileSummary — read-only summary shown after profile generation.
 *
 * Displays all 13 trait final stats and all 8 skill final stats.
 * "Enter Game" dispatches setPlayerInitialized so App.tsx transitions to gameplay.
 */
import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';

import { SKILL_ICONS, SKILL_LABELS, TRAIT_ICONS, TRAIT_LABELS } from '../constants';
import { computeFinalSkills, computeFinalTraits } from './quizUtils';
import { setPlayerInitialized } from '../../../features/auth/authSlice';
import type { RolledPlayerData } from '../../../pages/ProfileSetupPage';

interface ProfileSummaryProps {
  rolledPlayer: RolledPlayerData;
  skillDeltas: Record<string, number>;
  traitDeltas: Record<string, number>;
  onProceed: () => void;
}

function StatRow({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography sx={{ fontSize: '1.5rem', mr: 1, lineHeight: 1 }}>{icon}</Typography>
      <Typography variant="body1" sx={{ flex: 1 }}>{label}</Typography>
      <Typography variant="body1" fontWeight={700}>{value}</Typography>
    </Stack>
  );
}

export default function ProfileSummary({
  rolledPlayer,
  skillDeltas,
  traitDeltas,
  onProceed: _onProceed,
}: ProfileSummaryProps) {
  const dispatch = useDispatch();
  const finalTraits = computeFinalTraits(rolledPlayer.traits, traitDeltas);
  const finalSkills = computeFinalSkills(rolledPlayer.skills, skillDeltas);

  const handleEnterGame = () => {
    dispatch(setPlayerInitialized());
    // App.tsx detects isInitialized=true and transitions to AppShell automatically
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, pt: 2 }}>
        🎉 Your Profile
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        These are your starting skills and traits.
      </Typography>

      {/* Traits */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
        Traits
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
          gap: 0.75,
          mb: 3,
        }}
      >
        {Object.entries(TRAIT_LABELS).map(([key, label]) => (
          <StatRow
            key={key}
            icon={TRAIT_ICONS[key] ?? ''}
            label={label}
            value={finalTraits[key] ?? 0}
          />
        ))}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Skills */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
        Skills
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
          gap: 0.75,
          mb: 4,
        }}
      >
        {Object.entries(SKILL_LABELS).map(([key, label]) => (
          <StatRow
            key={key}
            icon={SKILL_ICONS[key] ?? ''}
            label={label}
            value={finalSkills[key] ?? 0}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleEnterGame}
          sx={{ fontWeight: 700, px: 5 }}
        >
          🍋 Enter Game
        </Button>
      </Box>
    </Box>
  );
}
