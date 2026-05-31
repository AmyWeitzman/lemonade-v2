/**
 * QuizBudgetIndicator — displays budget usage for the personality quiz.
 *
 * Distinct from the old BudgetMeter:
 * - Budget values are in delta points, not percentages — no "%" units are shown
 * - Enters a warning state (red bar + warning icon) when remaining <= 0
 */
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';

interface QuizBudgetIndicatorProps {
  /** "Skills Budget" or "Traits Budget" */
  label: string;
  /** Total budget (34 for skills, 89 for traits) */
  total: number;
  /** Sum of selected deltas */
  spent: number;
  /** total - spent (may be negative) */
  remaining: number;
}

export default function QuizBudgetIndicator({
  label,
  total,
  spent,
  remaining,
}: QuizBudgetIndicatorProps) {
  const isWarning = remaining <= 0;
  const progressPct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="body1" fontWeight={600}>
          {label}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          {isWarning && (
            <WarningAmberIcon fontSize="small" sx={{ color: 'error.main' }} />
          )}
          <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
            {spent} / {total} spent —{' '}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ color: isWarning ? 'error.main' : 'text.primary' }}
          >
            {remaining} remaining
          </Typography>
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progressPct}
        sx={{
          height: 10,
          borderRadius: 5,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            bgcolor: isWarning ? 'error.main' : 'primary.main',
            borderRadius: 5,
          },
        }}
      />
    </Box>
  );
}
