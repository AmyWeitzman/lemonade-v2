import { Alert, Box, Button, CircularProgress } from '@mui/material';

import { QUIZ_TRAITS_BUDGET, TRAIT_ADJECTIVES, TRAIT_ICONS, TRAIT_LABELS } from '../constants';
import LikertQuestion from './LikertQuestion';
import QuizFixedHeader, { HEADER_H } from './QuizFixedHeader';

const TRAIT_KEYS = Object.keys(TRAIT_LABELS) as Array<keyof typeof TRAIT_LABELS>;

interface TraitsQuizProps {
  answers: Record<string, number>;
  onAnswerChange: (key: string, value: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  showUnanswered: boolean;
  submitError: string | null;
  isSubmitting: boolean;
}

export default function TraitsQuiz({
  answers,
  onAnswerChange,
  onBack,
  onSubmit,
  showUnanswered,
  submitError,
  isSubmitting,
}: TraitsQuizProps) {
  const rawSpent = Object.values(answers).reduce((s, v) => s + v, 0);
  const rawRemaining = QUIZ_TRAITS_BUDGET - rawSpent;

  const allAnswered = TRAIT_KEYS.every((key) => answers[key] !== undefined);
  const canSubmit = allAnswered && rawRemaining >= 0;

  return (
    <>
      <QuizFixedHeader
        title="Traits"
        budgetTotal={QUIZ_TRAITS_BUDGET}
        budgetSpent={rawSpent}
        budgetRemaining={rawRemaining}
        staticQuestion="❓ I am..."
      />

      <Box sx={{ pt: `${HEADER_H}px`, mt: 2 }}>
        {TRAIT_KEYS.map((key) => (
          <LikertQuestion
            key={key}
            questionKey={key}
            prompt={`${TRAIT_ICONS[key] ?? ''}  ${(TRAIT_ADJECTIVES[key] ?? TRAIT_LABELS[key]).toLowerCase()}`}
            selectedValue={answers[key]}
            onSelect={onAnswerChange}
            disabledOptions={new Set()}
            hasError={showUnanswered && answers[key] === undefined}
          />
        ))}

        <Box sx={{ mt: 3 }}>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="outlined" size="large" onClick={onBack} disabled={isSubmitting}>
              ← Back
            </Button>
            <Button
              variant="contained"
              size="large"
              disabled={!canSubmit || isSubmitting}
              onClick={onSubmit}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {isSubmitting ? 'Generating…' : '🎲 Generate My Profile'}
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
}
