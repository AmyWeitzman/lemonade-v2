/**
 * Internship Routes
 *
 * POST /api/internship/execute — execute internship action
 *
 * Requirements: Req 31
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { getIO } from '../socket';
import { sendNotification } from '../lib/yearCycle';
import {
  checkInternshipEligibility,
} from '../lib/internship';

const router = Router();

const VALID_INTERNSHIP_TYPES = ['Humanities', 'Math', 'Science', 'Technology'] as const;
type InternshipType = typeof VALID_INTERNSHIP_TYPES[number];

const executeInternshipSchema = z.object({
  gameSessionId: z.string().min(1),
  internshipType: z.enum(VALID_INTERNSHIP_TYPES),
});

// ─── POST /api/internship/execute ─────────────────────────────────────────────

router.post(
  '/execute',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = executeInternshipSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, internshipType } = result.data;

    try {
      const player = await prisma.player.findUnique({
        where: { userId_gameSessionId: { userId: req.user!.userId, gameSessionId } },
        include: {
          educations: { where: { isActive: true }, include: { program: true } },
          employments: { where: { isActive: true }, include: { job: true } },
        },
      });

      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      if (player.gameSessionId !== gameSessionId) {
        res.status(403).json({ error: 'Player does not belong to this session' });
        return;
      }

      // Check eligibility
      const eligResult = checkInternshipEligibility({
        educations: player.educations.map((e) => ({
          isActive: e.isActive,
          graduated: e.graduated,
        })),
        didInternshipThisYear: (player as unknown as { didInternshipThisYear: boolean })
          .didInternshipThisYear,
      });

      if (!eligResult.eligible) {
        res.status(400).json({ error: eligResult.reason });
        return;
      }

      const INTERNSHIP_TIME_BLOCKS = 4;
      const INTERNSHIP_LEMONS = 2;

      // Look up the "Do an Internship" action to get skillGainsByType
      const internshipAction = await prisma.action.findFirst({
        where: { name: 'Do an Internship' },
      });
      if (!internshipAction) {
        res.status(500).json({ error: 'Internship action not found in database' });
        return;
      }

      const effects = internshipAction.effects as {
        skillGainsByType?: Record<InternshipType, Record<string, number>>;
        stress?: number;
      };
      const gainsByType = (effects.skillGainsByType ?? {}) as Record<string, Record<string, number>>;
      const skillGains: Record<string, number> = gainsByType[internshipType] ?? {};

      // Apply skill gains to player's current skills
      const currentSkills = player.skills as Record<string, number>;
      const currentTraits = player.traits as Record<string, number>;
      const newSkills = { ...currentSkills };
      const newTraits = { ...currentTraits };

      const SKILL_KEYS = [
        'math', 'science', 'art', 'music', 'writing', 'analysis', 'homeRepair', 'technology',
      ];

      for (const [key, gain] of Object.entries(skillGains)) {
        if (SKILL_KEYS.includes(key)) {
          newSkills[key] = Math.min(100, (newSkills[key] ?? 0) + gain);
        } else {
          newTraits[key] = Math.min(100, (newTraits[key] ?? 0) + gain);
        }
      }

      // Determine if player has an active job (for internship TB reduction flag)
      // PT jobs: reduce by 2 blocks; FT jobs: reduce by 4 blocks
      const hasActiveJob = player.employments.length > 0;

      // Fetch session for pitcher update
      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { pitcherCurrentLemons: true, pitcherContributionsByPlayer: true },
      });

      const contributions = (session?.pitcherContributionsByPlayer ?? {}) as Record<string, number>;
      if (INTERNSHIP_LEMONS > 0) {
        contributions[player.id] = (contributions[player.id] ?? 0) + INTERNSHIP_LEMONS;
      }

      // Persist changes in transaction
      await prisma.$transaction(async (tx) => {
        // Update player: set didInternshipThisYear, apply skill gains, grant lemons
        await tx.player.update({
          where: { id: player.id },
          data: {
            skills: newSkills,
            traits: newTraits,
            totalLemonsEarned: { increment: INTERNSHIP_LEMONS },
            ...({ didInternshipThisYear: true } as Record<string, unknown>),
          } as Parameters<typeof tx.player.update>[0]['data'],
        });

        // If player has active jobs: add TB reduction to ptoUsed on each employment
        // PT jobs: 2 blocks, FT jobs: 4 blocks
        if (hasActiveJob) {
          for (const emp of player.employments) {
            const tbReduction = emp.isPartTime ? 2 : 4;
            const currentPtoUsed = (emp as unknown as { ptoUsed: number }).ptoUsed ?? 0;
            await tx.employment.update({
              where: { id: emp.id },
              data: {
                ...({ ptoUsed: currentPtoUsed + tbReduction } as Record<string, unknown>),
              } as Parameters<typeof tx.employment.update>[0]['data'],
            });
          }
        }

        // Update pitcher
        await tx.gameSession.update({
          where: { id: gameSessionId },
          data: {
            pitcherCurrentLemons: { increment: INTERNSHIP_LEMONS },
            pitcherContributionsByPlayer: contributions,
          },
        });
      });

      // Notify player
      const skillSummary = Object.entries(skillGains)
        .map(([k, v]) => `${k} +${v}`)
        .join(', ');

      const tbReductionSummary = hasActiveJob
        ? player.employments.map((e) => (e.isPartTime ? 2 : 4)).reduce((a, b) => Math.max(a, b), 0)
        : 0;

      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'education',
          title: 'Internship Complete!',
          message: `You completed your internship${skillSummary ? ` and gained: ${skillSummary}` : ''}.${
            hasActiveJob
              ? ` Note: your job pay will be reduced by 25% and job time blocks reduced by ${tbReductionSummary} this year.`
              : ''
          }`,
          persistent: true,
        },
        getIO(),
      );

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: {
          totalLemonsEarned: player.totalLemonsEarned + INTERNSHIP_LEMONS,
        },
      });

      res.status(200).json({
        success: true,
        skillGains,
        timeBlocksUsed: INTERNSHIP_TIME_BLOCKS,
        lemonsEarned: INTERNSHIP_LEMONS,
        hasActiveJob,
        message: hasActiveJob
          ? 'Internship complete. Job pay reduced 25% and job time blocks reduced by 4 for this year.'
          : 'Internship complete.',
      });
    } catch (err) {
      console.error('[internship/execute]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
