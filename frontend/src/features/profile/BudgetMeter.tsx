/**
 * BudgetMeter — displays a labeled progress bar showing budget usage.
 * Used on the ProfileSetupPage for trait and skill adjustment budgets.
 */
import { Box, LinearProgress, Stack, Typography } from '@mui/material';

interface BudgetMeterProps {
  label: string;
  budget: number;
  used: number;
  remaining: number;
}

export default function BudgetMeter({ label, budget, used, remaining }: BudgetMeterProps) {
  const over = remaining < 0;
  const pct = Math.min(100, budget > 0 ? (used / budget) * 100 : 0);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body1" fontWeight={600}>{label}</Typography>
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ color: over ? 'error.main' : remaining === 0 ? 'warning.main' : 'text.primary' }}
        >
          {budget}%{' budget '}− {used}% used{' = '}{remaining}% remaining
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 10,
          borderRadius: 5,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            bgcolor: over ? 'error.main' : pct >= 100 ? 'warning.main' : 'primary.main',
            borderRadius: 5,
          },
        }}
      />
    </Box>
  );
}
