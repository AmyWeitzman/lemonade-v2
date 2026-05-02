/**
 * CheckoutResultModal — shows results after cart checkout.
 * Displays lemons earned (animated), health/stress changes, skill/trait gains.
 */
import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Stack, Box, Chip, Divider,
} from '@mui/material';
import type { CheckoutResult } from './types';

const SKILL_LABELS: Record<string, string> = {
  math: 'Math', science: 'Science', art: 'Art', music: 'Music',
  writing: 'Writing', analysis: 'Analysis', homeRepair: 'Home Repair', technology: 'Technology',
};

const TRAIT_LABELS: Record<string, string> = {
  bravery: 'Bravery', perseverance: 'Perseverance', charisma: 'Charisma',
  compassion: 'Compassion', creativity: 'Creativity', organization: 'Organization',
  patience: 'Patience', caution: 'Caution', sociability: 'Sociability',
  stressTolerance: 'Stress Tolerance', goodWithKids: 'Good With Kids',
  physicalAbility: 'Physical Ability', communication: 'Communication',
};

interface Props {
  open: boolean;
  result: CheckoutResult | null;
  onClose: () => void;
}

export default function CheckoutResultModal({ open, result, onClose }: Props) {
  const [displayedLemons, setDisplayedLemons] = useState(0);

  // Animate lemon count up
  useEffect(() => {
    if (!open || !result) {
      setDisplayedLemons(0);
      return;
    }
    setDisplayedLemons(0);
    if (result.totalLemonsEarned === 0) return;

    const target = result.totalLemonsEarned;
    const duration = 800;
    const steps = Math.min(target, 30);
    const interval = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += Math.ceil(target / steps);
      if (current >= target) {
        setDisplayedLemons(target);
        clearInterval(timer);
      } else {
        setDisplayedLemons(current);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [open, result]);

  if (!result) return null;

  const skillEntries = Object.entries(result.skillGains).filter(([, v]) => v !== 0);
  const traitEntries = Object.entries(result.traitGains).filter(([, v]) => v !== 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
        <Typography variant="h5">🎉 Actions Complete!</Typography>
      </DialogTitle>

      <DialogContent>
        {/* Lemons earned */}
        {result.totalLemonsEarned > 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 2,
              mb: 1,
              bgcolor: '#fffde7',
              borderRadius: 2,
              border: '1px solid #fff176',
            }}
          >
            <Typography variant="h2" sx={{ fontWeight: 900, color: '#f9a825', lineHeight: 1 }}>
              🍋 {displayedLemons}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              lemon{result.totalLemonsEarned !== 1 ? 's' : ''} added to the pitcher
            </Typography>
          </Box>
        )}

        {/* Health & Stress */}
        <Stack spacing={1} sx={{ mb: 1.5 }}>
          {result.healthDelta !== 0 && (
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">❤️ Health</Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip
                  label={`${result.healthDelta > 0 ? '+' : ''}${result.healthDelta}%`}
                  size="small"
                  sx={{
                    bgcolor: result.healthDelta > 0 ? '#e8f5e9' : '#ffebee',
                    color: result.healthDelta > 0 ? 'success.dark' : 'error.dark',
                    fontWeight: 700,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  → {result.newHealth}%
                </Typography>
              </Stack>
            </Stack>
          )}

          {result.stressDelta !== 0 && (
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">😰 Stress</Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip
                  label={`${result.stressDelta > 0 ? '+' : ''}${result.stressDelta}%`}
                  size="small"
                  sx={{
                    bgcolor: result.stressDelta < 0 ? '#e8f5e9' : '#fff3e0',
                    color: result.stressDelta < 0 ? 'success.dark' : 'warning.dark',
                    fontWeight: 700,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  → {result.newStress}%
                </Typography>
              </Stack>
            </Stack>
          )}
        </Stack>

        {/* Skill/Trait gains */}
        {(skillEntries.length > 0 || traitEntries.length > 0) && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
              📈 Gains
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {skillEntries.map(([k, v]) => (
                <Chip
                  key={k}
                  label={`${SKILL_LABELS[k] ?? k} +${v.toFixed(1)}%`}
                  size="small"
                  sx={{ bgcolor: '#e3f2fd', fontSize: '0.7rem' }}
                />
              ))}
              {traitEntries.map(([k, v]) => (
                <Chip
                  key={k}
                  label={`${TRAIT_LABELS[k] ?? k} +${v.toFixed(1)}%`}
                  size="small"
                  sx={{ bgcolor: '#f3e5f5', fontSize: '0.7rem' }}
                />
              ))}
            </Stack>
          </>
        )}

        {result.totalLemonsEarned === 0 && result.healthDelta === 0 && result.stressDelta === 0 && skillEntries.length === 0 && traitEntries.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Actions completed successfully.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" fullWidth onClick={onClose} sx={{ fontWeight: 700 }}>
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
