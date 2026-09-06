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
import { getRequiredActions } from '../lib/actionRequirements';
import type { ParentContributions } from '../lib/playerInit';

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

/** Get the player's current housing location + type from their active HousingOwnership record. */
async function getPlayerHousing(playerId: string): Promise<{ location: string; type?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const active = await (prisma.housingOwnership as any).findFirst({
    where: { playerId, endAge: null },
    select: { chosenLocation: true, housing: { select: { type: true } } },
    orderBy: { startAge: 'desc' },
  });
  return {
    location: (active?.chosenLocation as string | undefined) ?? 'city',
    type: active?.housing?.type as string | undefined,
  };
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
        housingOwnerships: { where: { endAge: null }, include: { housing: true } },
        vehicleOwnerships: { where: { endAge: null } },
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

    const playerHousing = await getPlayerHousing(id);

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
        ptoUsed: (e.ptoUsed as number | undefined) ?? 0,
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
      playerHousingLocation: playerHousing.location,
      playerHousingType: playerHousing.type,
      spouse: spouse ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      childcarePlan: ((player as any).childcarePlan as ChildcarePlan) ?? 'none',
    };

    const breakdown = calculateTimeBlocks(playerData);
    const availableActivityBlocks = getAvailableActivityBlocks(breakdown);

    // Sum PTO remaining across all active employments
    const ptoRemaining = player.employments.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, e: any) => sum + ((e.ptoRemaining as number) ?? 0),
      0,
    );
    // Total PTO accrued this year (base from job ptoTimeBlocks)
    const ptoTotal = player.employments.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, e: any) => sum + ((e.job.ptoTimeBlocks as number) ?? 0),
      0,
    );

    // Required actions this year (get housing / transportation) and the blocks
    // reserved for them on the Actions page.
    const session = await prisma.gameSession.findUnique({
      where: { id: player.gameSessionId },
      select: { currentYear: true },
    });
    const pc = (player as unknown as { parentContributions?: ParentContributions | null }).parentContributions ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeHousing = (player as any).housingOwnerships?.[0];
    const requiredActions = getRequiredActions({
      currentYear: session?.currentYear ?? 0,
      activeHousingType: activeHousing?.housing?.type ?? null,
      parentMaxAge: pc ? pc.maxParentAge : undefined,
      age: player.age,
      couchSurfYearsUsed:
        (player as unknown as { couchSurfYearsUsed?: number }).couchSurfYearsUsed ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hasVehicle: ((player as any).vehicleOwnerships ?? []).some((o: any) => !o.isSpouseVehicle),
    });
    const reservedBlocks = requiredActions.reduce((s, r) => s + r.blocks, 0);

    res.json({
      breakdown,
      availableActivityBlocks,
      ptoRemaining,
      ptoTotal,
      requiredActions,
      reservedBlocks,
    });
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

      const playerHousing = await getPlayerHousing(id);

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
          ptoUsed: (e.ptoUsed as number | undefined) ?? 0,
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
        playerHousingLocation: playerHousing.location,
        playerHousingType: playerHousing.type,
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
