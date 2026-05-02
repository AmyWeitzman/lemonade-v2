import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import {
  rollTraits,
  rollSkills,
  rollParentContributions,
  calculateStartingMoney,
  rollChronicConditions,
  CAR_KEY_TO_VEHICLE,
  getParentRollFromContributions,
} from '../lib/playerInit';

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const adjustSchema = z.object({
  traitAdjustments: z.record(z.string(), z.number()),
  skillAdjustments: z.record(z.string(), z.number()),
});

// ─── POST /api/players/:id/initialize ────────────────────────────────────────
// Rolls stats and saves them, but does NOT mark isInitialized.
// Safe to call multiple times — if stats already rolled, returns existing data.

router.post('/:id/initialize', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const player = await prisma.player.findUnique({ where: { id } });

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    if (player.userId !== userId) {
      res.status(403).json({ error: 'You do not own this player' });
      return;
    }

    if ((player as unknown as Record<string, unknown>)['isInitialized']) {
      res.status(400).json({ error: 'Player has already been initialized' });
      return;
    }

    // If traits already rolled (page refresh mid-setup), return existing data
    const existingTraits = player.traits as Record<string, number>;
    if (Object.keys(existingTraits).length > 0 && Object.values(existingTraits).some((v) => v > 0)) {
      res.status(200).json({
        player,
        adjustmentBudget: { traits: 50, skills: 10 },
        alreadyRolled: true,
      });
      return;
    }

    // Roll everything
    const traits = rollTraits();
    const skills = rollSkills();
    const parentContributions = rollParentContributions();
    const parentRoll = getParentRollFromContributions(parentContributions);
    const organization = traits.organization ?? 0;
    const money = calculateStartingMoney(parentRoll, organization);
    const chronicConditions = rollChronicConditions();

    // Save rolled stats but do NOT set isInitialized — that happens at confirm
    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: {
        traits,
        skills,
        parentContributions: parentContributions as unknown as Record<string, unknown>,
        money,
        collegeFund: parentContributions.collegeFund,
        chronicConditions,
      } as Parameters<typeof prisma.player.update>[0]['data'],
    });

    res.status(200).json({
      player: updatedPlayer,
      adjustmentBudget: { traits: 50, skills: 10 },
      alreadyRolled: false,
    });
  } catch (err) {
    console.error('[players/initialize]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/players/:id/initialize/confirm ─────────────────────────────────
// Applies final trait/skill adjustments, creates vehicle ownership, and marks
// isInitialized: true. This is the point of no return.

router.post('/:id/initialize/confirm', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const result = adjustSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { traitAdjustments, skillAdjustments } = result.data;

  try {
    const player = await prisma.player.findUnique({ where: { id } });

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    if (player.userId !== userId) {
      res.status(403).json({ error: 'You do not own this player' });
      return;
    }

    if ((player as unknown as Record<string, unknown>)['isInitialized']) {
      res.status(400).json({ error: 'Player has already been initialized' });
      return;
    }

    // Validate trait adjustments
    const totalTraitAdjustment = Object.values(traitAdjustments).reduce((sum, v) => sum + v, 0);
    if (totalTraitAdjustment > 50) {
      res.status(400).json({ error: 'Total trait adjustment cannot exceed 50%' });
      return;
    }
    for (const [trait, delta] of Object.entries(traitAdjustments)) {
      if (Math.abs(delta) > 10) {
        res.status(400).json({ error: `Trait adjustment for ${trait} cannot exceed 10%` });
        return;
      }
    }

    // Validate skill adjustments
    const totalSkillAdjustment = Object.values(skillAdjustments).reduce((sum, v) => sum + v, 0);
    if (totalSkillAdjustment > 10) {
      res.status(400).json({ error: 'Total skill adjustment cannot exceed 10%' });
      return;
    }
    for (const [skill, delta] of Object.entries(skillAdjustments)) {
      if (Math.abs(delta) > 2) {
        res.status(400).json({ error: `Skill adjustment for ${skill} cannot exceed 2%` });
        return;
      }
    }

    // Apply adjustments
    const currentTraits = player.traits as Record<string, number>;
    const currentSkills = player.skills as Record<string, number>;

    const newTraits = { ...currentTraits };
    for (const [trait, delta] of Object.entries(traitAdjustments)) {
      if (trait in newTraits) {
        newTraits[trait] = Math.max(0, Math.min(100, (newTraits[trait] ?? 0) + delta));
      }
    }

    const newSkills = { ...currentSkills };
    for (const [skill, delta] of Object.entries(skillAdjustments)) {
      if (skill in newSkills) {
        newSkills[skill] = Math.max(0, Math.min(100, (newSkills[skill] ?? 0) + delta));
      }
    }

    // Resolve parent car gift
    const parentContributions = player.parentContributions as { car?: string | null };
    let vehicleOwnershipData: { vehicleId: string } | null = null;
    if (parentContributions?.car) {
      const vehicleLookup = CAR_KEY_TO_VEHICLE[parentContributions.car];
      if (vehicleLookup) {
        const vehicle = await prisma.vehicle.findUnique({
          where: { name_ageVariant: { name: vehicleLookup.name, ageVariant: vehicleLookup.ageVariant } },
        });
        if (vehicle) vehicleOwnershipData = { vehicleId: vehicle.id };
      }
    }

    // Finalize in a transaction — apply adjustments, create vehicle, mark initialized
    const updatedPlayer = await prisma.$transaction(async (tx) => {
      const updated = await tx.player.update({
        where: { id },
        data: {
          traits: newTraits,
          skills: newSkills,
          ...({ isInitialized: true } as Record<string, unknown>),
        } as Parameters<typeof tx.player.update>[0]['data'],
      });

      if (vehicleOwnershipData) {
        // Only create if not already gifted (idempotency on retry)
        const existing = await tx.vehicleOwnership.findFirst({
          where: { playerId: id, vehicleId: vehicleOwnershipData.vehicleId, wasParentGift: true },
        });
        if (!existing) {
          await tx.vehicleOwnership.create({
            data: { playerId: id, vehicleId: vehicleOwnershipData.vehicleId, startAge: updated.age, wasParentGift: true },
          });
        }
      }

      return updated;
    });

    res.status(200).json({ player: updatedPlayer });
  } catch (err) {
    console.error('[players/initialize/confirm]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/players/:id/adjust ───────────────────────────────────────────

router.patch('/:id/adjust', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const result = adjustSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { traitAdjustments, skillAdjustments } = result.data;

  try {
    const player = await prisma.player.findUnique({ where: { id } });

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    if (player.userId !== userId) {
      res.status(403).json({ error: 'You do not own this player' });
      return;
    }

    if ((player as unknown as Record<string, unknown>)['isInitialized']) {
      res.status(400).json({ error: 'Player has already been initialized' });
      return;
    }

    // Only allow adjustments before the game starts (age 18, year not complete)
    if (player.age !== 18 || player.yearComplete) {
      res.status(400).json({ error: 'Adjustments are only allowed before the game starts' });
      return;
    }

    // Validate trait adjustments
    const totalTraitAdjustment = Object.values(traitAdjustments).reduce(
      (sum, v) => sum + v,
      0,
    );
    if (totalTraitAdjustment > 50) {
      res.status(400).json({ error: 'Total trait adjustment cannot exceed 50%' });
      return;
    }

    for (const [trait, delta] of Object.entries(traitAdjustments)) {
      if (Math.abs(delta) > 10) {
        res.status(400).json({ error: `Trait adjustment for ${trait} cannot exceed 10%` });
        return;
      }
    }

    // Validate skill adjustments
    const totalSkillAdjustment = Object.values(skillAdjustments).reduce(
      (sum, v) => sum + v,
      0,
    );
    if (totalSkillAdjustment > 10) {
      res.status(400).json({ error: 'Total skill adjustment cannot exceed 10%' });
      return;
    }

    for (const [skill, delta] of Object.entries(skillAdjustments)) {
      if (Math.abs(delta) > 2) {
        res.status(400).json({ error: `Skill adjustment for ${skill} cannot exceed 2%` });
        return;
      }
    }

    // Apply adjustments — clamp to [0, 100]
    const currentTraits = player.traits as Record<string, number>;
    const currentSkills = player.skills as Record<string, number>;

    const newTraits = { ...currentTraits };
    for (const [trait, delta] of Object.entries(traitAdjustments)) {
      if (trait in newTraits) {
        newTraits[trait] = Math.max(0, Math.min(100, (newTraits[trait] ?? 0) + delta));
      }
    }

    const newSkills = { ...currentSkills };
    for (const [skill, delta] of Object.entries(skillAdjustments)) {
      if (skill in newSkills) {
        newSkills[skill] = Math.max(0, Math.min(100, (newSkills[skill] ?? 0) + delta));
      }
    }

    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: { traits: newTraits, skills: newSkills },
    });

    res.json({ player: updatedPlayer });
  } catch (err) {
    console.error('[players/adjust]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/players/:id/requirements-preview ───────────────────────────────

router.get(
  '/:id/requirements-preview',
  authorize,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!.userId;

    try {
      const player = await prisma.player.findUnique({ where: { id } });

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      if (player.userId !== userId) {
        res.status(403).json({ error: 'You do not own this player' });
        return;
      }

      const [jobs, programs] = await Promise.all([
        prisma.job.findMany({ select: { id: true, title: true, requirements: true, baseSalary: true } }),
        prisma.educationProgram.findMany({
          select: { id: true, name: true, type: true, field: true, requirements: true, tuitionFullTime: true },
        }),
      ]);

      const playerSkills = player.skills as Record<string, number>;
      const playerTraits = player.traits as Record<string, number>;

      function checkRequirements(requirements: unknown): boolean {
        if (!requirements || typeof requirements !== 'object') return true;
        const reqs = requirements as Record<string, unknown>;

        // Check skill requirements
        if (reqs.skills && typeof reqs.skills === 'object') {
          for (const [skill, minVal] of Object.entries(reqs.skills as Record<string, number>)) {
            if ((playerSkills[skill] ?? 0) < minVal) return false;
          }
        }

        // Check trait requirements
        if (reqs.traits && typeof reqs.traits === 'object') {
          for (const [trait, minVal] of Object.entries(reqs.traits as Record<string, number>)) {
            if ((playerTraits[trait] ?? 0) < minVal) return false;
          }
        }

        return true;
      }

      const jobsWithQualification = jobs.map((job: { id: string; title: string; requirements: unknown; baseSalary: number }) => ({
        ...job,
        qualifies: checkRequirements(job.requirements),
      }));

      const programsWithQualification = programs.map((program: { id: string; name: string; type: string; field: string; requirements: unknown; tuitionFullTime: number }) => ({
        ...program,
        qualifies: checkRequirements(program.requirements),
      }));

      res.json({
        jobs: jobsWithQualification,
        educationPrograms: programsWithQualification,
      });
    } catch (err) {
      console.error('[players/requirements-preview]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── GET /api/players/:id/profile ────────────────────────────────────────────
// Returns full player profile data for the Profile Drawer (Tending the Garden).

router.get('/:id/profile', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        children: true,
        pets: { where: { isAlive: true } },
        loans: true,
        employments: {
          include: { job: { select: { title: true } } },
          orderBy: { startAge: 'asc' },
        },
        educations: {
          include: { program: { select: { name: true, type: true } } },
          orderBy: { startAge: 'asc' },
        },
        actionHistory: {
          include: { action: { select: { name: true, category: true } } },
          orderBy: { year: 'asc' },
        },
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

    res.json({ player });
  } catch (err) {
    console.error('[players/profile]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
