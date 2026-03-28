import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import {
  calculateTimeBlocks,
  getAvailableActivityBlocks,
  type ChildcarePlan,
  type PlayerTimeBlockInput,
} from '../lib/timeBlocks';

const router = Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const childcarePlanValues = [
  'year_ft',
  'year_pt',
  'year_pt_summer_ft',
  'summer_ft',
  'summer_pt',
  'none',
] as const;

const childcarePlanSchema = z.object({
  plan: z.enum(childcarePlanValues),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get the player's current housing location from their active HousingOwnership record. */
async function getPlayerHousingLocation(playerId: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const active = await (prisma.housingOwnership as any).findFirst({
    where: { playerId, endAge: null },
    select: { chosenLocation: true },
    orderBy: { startAge: 'desc' },
  });
  return (active?.chosenLocation as string | undefined) ?? 'city';
}

// ─── GET /api/players/:id/time-blocks ─────────────────────────────────────────

router.get('/:id/time-blocks', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        employments: { where: { isActive: true }, include: { job: true } },
        educations: true,
        children: true,
        pets: true,
      },
    });

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    if (player.userId !== userId) {
      res.status(403).json({ error: 'You do not own this player' });
      return;
    }

    const playerHousingLocation = await getPlayerHousingLocation(id);

    const spouse = player.spouse as {
      jobId?: string | null;
      isJobPartTime: boolean;
      educationProgramId?: string | null;
      isEduPartTime: boolean;
    } | null;

    const playerData: PlayerTimeBlockInput = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      employments: player.employments.map((e: any) => ({
        isActive: e.isActive as boolean,
        isPartTime: e.isPartTime as boolean,
        ptoUsed: undefined,
        chosenLocation: (e.chosenLocation as string | undefined) ?? 'city',
        job: { timeBlocks: e.job.timeBlocks as number },
      })),
      educations: player.educations.map((e: { isActive: boolean; isPartTime: boolean; graduated: boolean }) => ({
        isActive: e.isActive,
        isPartTime: e.isPartTime,
        graduated: e.graduated,
      })),
      children: player.children.map((c: { age: number }) => ({ age: c.age })),
      pets: player.pets.map((p: { isAlive: boolean }) => ({ isAlive: p.isAlive })),
      playerHousingLocation,
      spouse: spouse ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      childcarePlan: ((player as any).childcarePlan as ChildcarePlan) ?? 'none',
    };

    const breakdown = calculateTimeBlocks(playerData);
    const availableActivityBlocks = getAvailableActivityBlocks(breakdown);

    res.json({ breakdown, availableActivityBlocks });
  } catch (err) {
    console.error('[timeblocks/get]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/players/:id/childcare-plan ────────────────────────────────────

router.patch(
  '/:id/childcare-plan',
  authorize,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const result = childcarePlanSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0].message });
      return;
    }

    const { plan } = result.data;

    try {
      const player = await prisma.player.findUnique({
        where: { id },
        include: {
          employments: { where: { isActive: true }, include: { job: true } },
          educations: true,
          children: true,
          pets: true,
        },
      });

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      if (player.userId !== userId) {
        res.status(403).json({ error: 'You do not own this player' });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.player.update({ where: { id }, data: { childcarePlan: plan } as any });

      const playerHousingLocation = await getPlayerHousingLocation(id);

      const spouse = player.spouse as {
        jobId?: string | null;
        isJobPartTime: boolean;
        educationProgramId?: string | null;
        isEduPartTime: boolean;
      } | null;

      const playerData: PlayerTimeBlockInput = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        employments: player.employments.map((e: any) => ({
          isActive: e.isActive as boolean,
          isPartTime: e.isPartTime as boolean,
          ptoUsed: undefined,
          chosenLocation: (e.chosenLocation as string | undefined) ?? 'city',
          job: { timeBlocks: e.job.timeBlocks as number },
        })),
        educations: player.educations.map((e: { isActive: boolean; isPartTime: boolean; graduated: boolean }) => ({
          isActive: e.isActive,
          isPartTime: e.isPartTime,
          graduated: e.graduated,
        })),
        children: player.children.map((c: { age: number }) => ({ age: c.age })),
        pets: player.pets.map((p: { isAlive: boolean }) => ({ isAlive: p.isAlive })),
        playerHousingLocation,
        spouse: spouse ?? null,
        childcarePlan: plan,
      };

      const breakdown = calculateTimeBlocks(playerData);
      const availableActivityBlocks = getAvailableActivityBlocks(breakdown);

      res.json({ breakdown, availableActivityBlocks });
    } catch (err) {
      console.error('[timeblocks/childcare-plan]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
