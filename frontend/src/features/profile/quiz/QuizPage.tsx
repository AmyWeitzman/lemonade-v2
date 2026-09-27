/**
 * QuizPage — orchestrates the two-part personality quiz flow.
 *
 * New flow:
 *   1. Skills quiz (answer 8 questions, click Next)
 *   2. Traits quiz (answer 13 questions, click "Generate My Profile")
 *      → calls POST /players/:id/initialize (roll base stats)
 *      → then calls POST /players/:id/initialize/confirm (apply quiz deltas)
 *   3. ProfileSummary (read-only display of final stats, then navigate to review)
 */
import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';

import { SKILL_LABELS, TRAIT_LABELS } from '../constants';
import {
  computeQuizSkillDeltas,
  computeQuizTraitDeltas,
} from './quizUtils';
import SkillsQuiz from './SkillsQuiz';
import TraitsQuiz from './TraitsQuiz';
import ProfileSummary from './ProfileSummary';
import type { RolledPlayerData } from '../../../pages/ProfileSetupPage';
import api from '../../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type QuizStep = 'skills' | 'traits' | 'summary';

interface QuizPageProps {
  playerId: string;
  onConfirmSuccess: () => void;
  onRollSuccess: () => void; // called after roll so parent can update Redux state
}

// The 8 skill keys from SKILL_LABELS
const SKILL_KEYS = Object.keys(SKILL_LABELS);

// The 13 trait keys from TRAIT_LABELS
const TRAIT_KEYS = Object.keys(TRAIT_LABELS);

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuizPage({
  playerId,
  onConfirmSuccess,
  onRollSuccess,
}: QuizPageProps) {
  const [skillAnswers, setSkillAnswers] = useState<Record<string, number>>({});
  const [traitAnswers, setTraitAnswers] = useState<Record<string, number>>({});
  const [quizStep, setQuizStep] = useState<QuizStep>('skills');
  const [showUnanswered, setShowUnanswered] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rolledPlayer, setRolledPlayer] = useState<RolledPlayerData | null>(null);

  // ── Derived deltas ─────────────────────────────────────────────────────────
  const skillDeltas = computeQuizSkillDeltas(skillAnswers);
  const traitDeltas = computeQuizTraitDeltas(traitAnswers);

  // ── Generate profile mutation: roll then confirm ───────────────────────────
  const generateMutation = useMutation({
    mutationFn: async () => {
      // Step 1: roll base stats
      const { data: initData } = await api.post<{ player: RolledPlayerData; alreadyRolled: boolean }>(
        `/players/${playerId}/initialize`,
      );
      const player = initData.player;

      // Step 2: apply quiz deltas
      await api.post(`/players/${playerId}/initialize/confirm`, {
        traitAdjustments: traitDeltas,
        skillAdjustments: skillDeltas,
      });

      return player;
    },
    onSuccess: (player) => {
      setRolledPlayer(player);
      setSubmitError(null);
      onRollSuccess(); // update Redux hasRolledProfile
      setQuizStep('summary');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to generate profile. Please try again.';
      setSubmitError(msg);
    },
  });

  // ── Answer change handlers ─────────────────────────────────────────────────

  const handleSkillAnswerChange = useCallback(
    (key: string, value: number) => {
      setSkillAnswers((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleTraitAnswerChange = useCallback(
    (key: string, value: number) => {
      setTraitAnswers((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── Step transition handlers ───────────────────────────────────────────────

  const handleNext = useCallback(() => {
    const allSkillsAnswered = SKILL_KEYS.every((key) => skillAnswers[key] !== undefined);
    if (!allSkillsAnswered) {
      setShowUnanswered(true);
      return;
    }
    setShowUnanswered(false);
    setQuizStep('traits');
  }, [skillAnswers]);

  const handleBack = useCallback(() => {
    setShowUnanswered(false);
    setQuizStep('skills');
  }, []);

  const handleGenerate = useCallback(() => {
    const allTraitsAnswered = TRAIT_KEYS.every((key) => traitAnswers[key] !== undefined);
    if (!allTraitsAnswered) {
      setShowUnanswered(true);
      return;
    }
    setShowUnanswered(false);
    setSubmitError(null);
    generateMutation.mutate();
  }, [traitAnswers, generateMutation]);

  const handleProceed = useCallback(() => {
    onConfirmSuccess();
  }, [onConfirmSuccess]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (quizStep === 'skills') {
    return (
      <SkillsQuiz
        answers={skillAnswers}
        onAnswerChange={handleSkillAnswerChange}
        onNext={handleNext}
        showUnanswered={showUnanswered}
      />
    );
  }

  if (quizStep === 'traits') {
    return (
      <TraitsQuiz
        answers={traitAnswers}
        onAnswerChange={handleTraitAnswerChange}
        onBack={handleBack}
        onSubmit={handleGenerate}
        showUnanswered={showUnanswered}
        submitError={submitError}
        isSubmitting={generateMutation.isPending}
      />
    );
  }

  // quizStep === 'summary' — rolledPlayer is guaranteed non-null here
  return (
    <ProfileSummary
      rolledPlayer={rolledPlayer!}
      skillDeltas={skillDeltas}
      traitDeltas={traitDeltas}
      onProceed={handleProceed}
    />
  );
}
