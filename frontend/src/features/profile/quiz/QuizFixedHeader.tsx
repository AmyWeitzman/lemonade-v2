/**
 * QuizFixedHeader — shared fixed header used by SkillsQuiz and TraitsQuiz.
 *
 * Renders a two-layer background (background.default + primary.light overlay)
 * so the header color exactly matches the page background.
 * Contains: page title, budget indicator, and static question prompt.
 */
import { Box, Typography } from '@mui/material';
import QuizBudgetIndicator from './QuizBudgetIndicator';

// Must match SetupShell STEPPER_HEIGHT
export const STEPPER_H = 56;
// Height of the fixed header — used by quiz bodies to set top padding
export const HEADER_H = 148;

interface QuizFixedHeaderProps {
  title: string;
  budgetTotal: number;
  budgetSpent: number;
  budgetRemaining: number;
  staticQuestion: string; // e.g. "❓I enjoy..." or "❓ I am..."
}

export default function QuizFixedHeader({
  title,
  budgetTotal,
  budgetSpent,
  budgetRemaining,
  staticQuestion,
}: QuizFixedHeaderProps) {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: STEPPER_H,
        left: 0,
        right: 0,
        zIndex: 1100,
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ bgcolor: 'primary.light', px: { xs: 2, md: 3 }, py: 1.5 }}>
        <Box
          sx={{
            maxWidth: 800,
            mx: 'auto',
            borderBottom: '1px solid',
            borderColor: 'primary.main',
            pb: 2,
          }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            {title}
          </Typography>
          <QuizBudgetIndicator
            label="Budget"
            total={budgetTotal}
            spent={budgetSpent}
            remaining={budgetRemaining}
          />
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}
          >
            {staticQuestion}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
