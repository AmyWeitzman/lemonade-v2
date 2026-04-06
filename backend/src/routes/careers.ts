/**
 * Career Progression Routes
 *
 * POST /api/careers/writing/action  — execute a writing career action
 * POST /api/careers/acting/action   — execute an acting career action
 * POST /api/careers/music/action    — execute a music career action
 * GET  /api/careers/:playerId       — get all career progress for a player
 *
 * Requirements: Req 26
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { getIO } from '../socket';
import { sendNotification } from '../lib/yearCycle';
import {
  WritingProgress,
  ActingProgress,
  MusicProgress,
  MusicPerformanceType,
  progressWritingCareer,
  selfPublishBook,
  submitToPublisher,
  executeAudition,
  releaseEP,
  releaseAlbum,
  recordPerformance,
  checkTourEligibility,
  BOOK_TIME_BLOCKS_REQUIRED,
} from '../lib/careers';

const router = Router();

function defaultWritingProgress(playerId: string): WritingProgress {
  return { playerId, publishedBooks: [] };
}

function defaultActingProgress(playerId: string): ActingProgress {
  return { playerId, hasAgent: false, rolesCompleted: [] };
}

function defaultMusicProgress(playerId: string): MusicProgress {
  return { playerId, epsReleased: 0, albumsReleased: 0, performances: [] };
}

async function fetchPlayer(userId: string, gameSessionId: string) {
  return prisma.player.findUnique({
    where: { userId_gameSessionId: { userId, gameSessionId } },
  });
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const writingActionSchema = z.object({
  gameSessionId: z.string().min(1),
  actionType: z.enum(['write_book', 'self_publish', 'submit_to_publisher']),
  timeBlocksUsed: z.number().int().min(1).optional(),
});

const actingActionSchema = z.object({
  gameSessionId: z.string().min(1),
  actionType: z.enum(['audition']),
  roleType: z.enum(['commercial', 'tv_show', 'movie']),
  useAgent: z.boolean().optional().default(false),
});

const musicActionSchema = z.object({
  gameSessionId: z.string().min(1),
  actionType: z.enum(['release_ep', 'release_album', 'perform']),
  performanceType: z
    .enum(['bar', 'school-dance', 'fair', 'tour-opening', 'national-tour', 'international-tour'])
    .optional(),
});

// ─── POST /api/careers/writing/action ─────────────────────────────────────────

router.post(
  '/writing/action',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = writingActionSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, actionType, timeBlocksUsed } = result.data;

    try {
      const player = await fetchPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      const skills = player.skills as Record<string, number>;
      const writingSkill = skills.writing ?? 0;
      const creativitySkill = (player.traits as Record<string, number>).creativity ?? 0;

      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { currentYear: true },
      });
      const currentYear = session?.currentYear ?? 0;

      let progress: WritingProgress =
        (player.writingProgress as WritingProgress | null) ??
        defaultWritingProgress(player.id);

      let responseData: Record<string, unknown> = {};

      switch (actionType) {
        case 'write_book': {
          const blocks = timeBlocksUsed ?? 1;
          const { progress: updated, bookComplete } = progressWritingCareer(progress, blocks);
          progress = updated;
          responseData = {
            timeBlocksCompleted: progress.currentBook?.timeBlocksCompleted ?? 0,
            bookComplete,
            timeBlocksRequired: BOOK_TIME_BLOCKS_REQUIRED,
          };

          if (bookComplete) {
            await sendNotification(
              player.id,
              {
                type: 'success',
                category: 'career',
                title: 'Book Complete!',
                message: `You've finished writing your book (${BOOK_TIME_BLOCKS_REQUIRED} time blocks). You can now self-publish or submit to a publisher.`,
              },
              getIO(),
            );
          }
          break;
        }

        case 'self_publish': {
          const { progress: updated, income, error } = selfPublishBook(
            progress,
            writingSkill,
            creativitySkill,
            currentYear,
          );
          if (error) {
            res.status(400).json({ error });
            return;
          }
          progress = updated;

          // Add income to projected income
          const newProjectedIncome = player.projectedIncome + income;
          await prisma.player.update({
            where: { id: player.id },
            data: { projectedIncome: newProjectedIncome, writingProgress: progress as object },
          });

          getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
            playerId: player.id,
            changes: { projectedIncome: newProjectedIncome },
          });

          await sendNotification(
            player.id,
            {
              type: 'success',
              category: 'career',
              title: 'Book Self-Published!',
              message: `Your book has been self-published! You earned $${income.toLocaleString()} in income.`,
            },
            getIO(),
          );

          res.json({ success: true, income, projectedIncome: newProjectedIncome, progress });
          return;
        }

        case 'submit_to_publisher': {
          const { progress: updated, income, accepted, error } = submitToPublisher(
            progress,
            writingSkill,
            creativitySkill,
            currentYear,
          );
          if (error) {
            res.status(400).json({ error });
            return;
          }
          progress = updated;

          if (accepted) {
            const newProjectedIncome = player.projectedIncome + income;
            await prisma.player.update({
              where: { id: player.id },
              data: { projectedIncome: newProjectedIncome, writingProgress: progress as object },
            });

            getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
              playerId: player.id,
              changes: { projectedIncome: newProjectedIncome },
            });

            await sendNotification(
              player.id,
              {
                type: 'success',
                category: 'career',
                title: 'Publisher Accepted Your Book!',
                message: `Congratulations! A publisher accepted your manuscript. You earned $${income.toLocaleString()}.`,
              },
              getIO(),
            );

            res.json({ success: true, accepted: true, income, projectedIncome: newProjectedIncome, progress });
          } else {
            await prisma.player.update({
              where: { id: player.id },
              data: { writingProgress: progress as object },
            });

            await sendNotification(
              player.id,
              {
                type: 'warning',
                category: 'career',
                title: 'Publisher Rejected Your Book',
                message: 'The publisher rejected your manuscript. Consider improving your writing and creativity skills, or try self-publishing.',
              },
              getIO(),
            );

            res.json({ success: true, accepted: false, income: 0, progress });
          }
          return;
        }
      }

      // Persist progress for write_book
      await prisma.player.update({
        where: { id: player.id },
        data: { writingProgress: progress as object },
      });

      res.json({ success: true, ...responseData, progress });
    } catch (err) {
      console.error('[careers/writing]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/careers/acting/action ─────────────────────────────────────────

router.post(
  '/acting/action',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = actingActionSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, roleType, useAgent } = result.data;

    try {
      const player = await fetchPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      const traits = player.traits as Record<string, number>;
      const bravery = traits.bravery ?? 0;
      const charisma = traits.charisma ?? 0;
      const creativity = traits.creativity ?? 0;

      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { currentYear: true },
      });
      const currentYear = session?.currentYear ?? 0;

      let progress: ActingProgress =
        (player.actingProgress as ActingProgress | null) ??
        defaultActingProgress(player.id);

      // Apply agent choice for this audition
      if (useAgent) {
        progress = { ...progress, hasAgent: true };
      }

      const auditionResult = executeAudition(
        progress,
        roleType,
        bravery,
        charisma,
        creativity,
        currentYear,
      );

      const updatedProgress = auditionResult.progress;

      if (auditionResult.success) {
        // Grant immediate payment
        const newMoney = player.money + auditionResult.netPayment;

        await prisma.player.update({
          where: { id: player.id },
          data: {
            money: newMoney,
            actingProgress: updatedProgress as object,
          },
        });

        getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
          playerId: player.id,
          changes: { money: newMoney },
        });

        await sendNotification(
          player.id,
          {
            type: 'success',
            category: 'career',
            title: `Got the ${roleType.replace('_', ' ')} role!`,
            message: `You landed the role! You earned $${auditionResult.netPayment.toLocaleString()}${auditionResult.agentFee > 0 ? ` (after $${auditionResult.agentFee.toLocaleString()} agent fee)` : ''}.`,
          },
          getIO(),
        );

        res.json({
          success: true,
          auditionSuccess: true,
          payment: auditionResult.payment,
          agentFee: auditionResult.agentFee,
          netPayment: auditionResult.netPayment,
          money: newMoney,
          progress: updatedProgress,
        });
      } else {
        // Consolation skill gains
        const currentTraits = player.traits as Record<string, number>;
        const updatedTraits = {
          ...currentTraits,
          bravery: Math.min(100, (currentTraits.bravery ?? 0) + (auditionResult.consolationSkillGains.bravery ?? 0)),
          perseverance: Math.min(100, (currentTraits.perseverance ?? 0) + (auditionResult.consolationSkillGains.perseverance ?? 0)),
        };

        await prisma.player.update({
          where: { id: player.id },
          data: {
            traits: updatedTraits,
            actingProgress: updatedProgress as object,
          },
        });

        await sendNotification(
          player.id,
          {
            type: 'info',
            category: 'career',
            title: 'Audition Unsuccessful',
            message: `You didn't get the role this time, but you gained +${auditionResult.consolationSkillGains.bravery ?? 0}% bravery and +${auditionResult.consolationSkillGains.perseverance ?? 0}% perseverance from the experience.`,
          },
          getIO(),
        );

        res.json({
          success: true,
          auditionSuccess: false,
          consolationSkillGains: auditionResult.consolationSkillGains,
          progress: updatedProgress,
        });
      }
    } catch (err) {
      console.error('[careers/acting]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/careers/music/action ──────────────────────────────────────────

router.post(
  '/music/action',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = musicActionSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, actionType, performanceType } = result.data;

    try {
      const player = await fetchPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      const skills = player.skills as Record<string, number>;
      const traits = player.traits as Record<string, number>;
      const musicSkill = skills.music ?? 0;
      const creativitySkill = traits.creativity ?? 0;
      const charismaSkill = traits.charisma ?? 0;

      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { currentYear: true },
      });
      const currentYear = session?.currentYear ?? 0;

      let progress: MusicProgress =
        (player.musicProgress as MusicProgress | null) ??
        defaultMusicProgress(player.id);

      let income = 0;
      let actionLabel = '';

      switch (actionType) {
        case 'release_ep': {
          const { progress: updated, income: epIncome } = releaseEP(
            progress,
            musicSkill,
            creativitySkill,
            currentYear,
          );
          progress = updated;
          income = epIncome;
          actionLabel = 'EP Released';
          break;
        }

        case 'release_album': {
          const { progress: updated, income: albumIncome } = releaseAlbum(
            progress,
            musicSkill,
            creativitySkill,
            currentYear,
          );
          progress = updated;
          income = albumIncome;
          actionLabel = 'Album Released';
          break;
        }

        case 'perform': {
          if (!performanceType) {
            res.status(400).json({ error: 'performanceType is required for perform action' });
            return;
          }

          const { progress: updated, income: perfIncome, error } = recordPerformance(
            progress,
            performanceType as MusicPerformanceType,
            musicSkill,
            creativitySkill,
            charismaSkill,
            currentYear,
          );

          if (error) {
            res.status(400).json({ error });
            return;
          }

          progress = updated;
          income = perfIncome;
          actionLabel = `Performance: ${performanceType}`;
          break;
        }
      }

      // Add income to projected income
      const newProjectedIncome = player.projectedIncome + income;

      await prisma.player.update({
        where: { id: player.id },
        data: {
          projectedIncome: newProjectedIncome,
          musicProgress: progress as object,
        },
      });

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { projectedIncome: newProjectedIncome },
      });

      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'career',
          title: actionLabel,
          message: `You earned $${income.toLocaleString()} from your music career.`,
        },
        getIO(),
      );

      // Check tour eligibility and notify if newly eligible
      const tourEligibility = checkTourEligibility(progress, 'national-tour');

      res.json({
        success: true,
        income,
        projectedIncome: newProjectedIncome,
        progress,
        tourEligible: tourEligibility.eligible,
      });
    } catch (err) {
      console.error('[careers/music]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── GET /api/careers/:playerId ───────────────────────────────────────────────

router.get(
  '/:playerId',
  authorize,
  async (req: Request, res: Response): Promise<void> => {
    const { playerId } = req.params;
    const gameSessionId = req.query.gameSessionId as string | undefined;

    if (!gameSessionId) {
      res.status(400).json({ error: 'gameSessionId query parameter is required' });
      return;
    }

    try {
      const player = await prisma.player.findFirst({
        where: { id: playerId, gameSessionId },
        select: {
          id: true,
          writingProgress: true,
          actingProgress: true,
          musicProgress: true,
        },
      });

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      const writingProgress =
        (player.writingProgress as WritingProgress | null) ??
        defaultWritingProgress(player.id);
      const actingProgress =
        (player.actingProgress as ActingProgress | null) ??
        defaultActingProgress(player.id);
      const musicProgress =
        (player.musicProgress as MusicProgress | null) ??
        defaultMusicProgress(player.id);

      const tourEligibility = checkTourEligibility(musicProgress);

      res.json({
        playerId: player.id,
        writing: {
          ...writingProgress,
          bookInProgress: !!writingProgress.currentBook,
          timeBlocksCompleted: writingProgress.currentBook?.timeBlocksCompleted ?? 0,
          timeBlocksRequired: BOOK_TIME_BLOCKS_REQUIRED,
          publishedBooksCount: writingProgress.publishedBooks.length,
        },
        acting: {
          ...actingProgress,
          rolesCount: actingProgress.rolesCompleted.length,
        },
        music: {
          ...musicProgress,
          tourEligible: tourEligibility.eligible,
          tourEligibilityReason: tourEligibility.reason,
        },
      });
    } catch (err) {
      console.error('[careers/get]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
