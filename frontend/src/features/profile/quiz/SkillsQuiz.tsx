import { Box, Button } from '@mui/material';

import { QUIZ_SKILLS_BUDGET, SKILL_ICONS, SKILL_LABELS } from '../constants';
import LikertQuestion from './LikertQuestion';
import QuizFixedHeader, { HEADER_H } from './QuizFixedHeader';

const SKILL_KEYS = Object.keys(SKILL_LABELS) as Array<keyof typeof SKILL_LABELS>;

interface SkillsQuizProps {
  answers: Record<string, number>;
  onAnswerChange: (key: string, value: number) => void;
  onNext: () => void;
  showUnanswered: boolean;
}

export default function SkillsQuiz({ answers, onAnswerChange, onNext, showUnanswered }: SkillsQuizProps) {
  const rawSpent = Object.values(answers).reduce((s, v) => s + v, 0);
  const rawRemaining = QUIZ_SKILLS_BUDGET - rawSpent;

  const allAnswered = SKILL_KEYS.every((key) => answers[key] !== undefined);
  const canProceed = allAnswered && rawRemaining >= 0;

  return (
    <>
      <QuizFixedHeader
        title="Skills"
        budgetTotal={QUIZ_SKILLS_BUDGET}
        budgetSpent={rawSpent}
        budgetRemaining={rawRemaining}
        staticQuestion="❓ I enjoy..."
      />

      <Box sx={{ pt: `${HEADER_H}px`, mt: 2 }}>
        {SKILL_KEYS.map((key) => (
          <LikertQuestion
            key={key}
            questionKey={key}
            prompt={`${SKILL_ICONS[key] ?? ''}  ${SKILL_LABELS[key].toLowerCase()}`}
            selectedValue={answers[key]}
            onSelect={onAnswerChange}
            disabledOptions={new Set()}
            hasError={showUnanswered && answers[key] === undefined}
          />
        ))}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" size="large" disabled={!canProceed} onClick={onNext}>
            Next →
          </Button>
        </Box>
      </Box>
    </>
  );
}
