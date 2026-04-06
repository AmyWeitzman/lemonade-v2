/**
 * Employment System Routes
 *
 * GET  /api/jobs               — catalog with filters + sort
 * GET  /api/jobs/search        — search by title
 * POST /api/jobs/:id/apply     — apply for a job
 * POST /api/jobs/:id/quit      — quit a job
 *
 * Requirements: Req 11, Req 44, Req 45, Req 46, Req 47
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { getIO } from '../socket';
import { sendNotification } from '../lib/yearCycle';
import {
  checkJobEligibility,
  checkBikeRestriction,
  calculateProjectedIncomeAfterJobChange,
  getJobBenefits,
  JobRow,
  PlayerForJobEligibility,
} from '../lib/jobs';
import { resetPTOOnJobChange } from '../lib/pto';
import { autoGrantFromJob } from '../lib/certifications';
import { Prisma } from '@prisma/client';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FullPlayer = NonNullable<Awaited<ReturnType<typeof fetchFullPlayer>>>;

async function fetchFullPlayer(userId: string, gameSessionId: string) {
  return prisma.player.findUnique({
    where: { userId_gameSessionId: { userId, gameSessionId } },
    include: {
      educations: { include: { program: true } },
      employments: { include: { job: true } },
      vehicleOwnerships: { include: { vehicle: true } },
    },
  });
}

function buildEligibilityPlayer(player: FullPlayer): PlayerForJobEligibility {
  return {
    age: player.age,
    health: player.health,
    skills: player.skills as Record<string, number>,
    traits: player.traits as Record<string, number>,
    certifications: player.certifications,
    location: player.location,
    educations: player.educations.map((e) => ({
      programId: e.programId,
      isActive: e.isActive,
      graduated: e.graduated,
    })),
    employments: player.employments.map((e) => ({
      isActive: e.isActive,
      yearsOfService: e.yearsOfService,
      job: { title: e.job.title },
    })),
  };
}

/** Sum salary from all currently active employments */
function currentTotalSalary(player: FullPlayer): number {
  return player.employments
    .filter((e) => e.isActive)
    .reduce((sum, e) => sum + e.currentSalary, 0);
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const listJobsSchema = z.object({
  gameSessionId: z.string().min(1),
  minSalary: z.coerce.number().optional(),
  maxSalary: z.coerce.number().optional(),
  minPto: z.coerce.number().optional(),
  maxTimeBlocks: z.coerce.number().optional(),
  maxStress: z.coerce.number().optional(),
  location: z.enum(['city', 'suburb', 'both']).optional(),
  showAll: z.coerce.boolean().optional(), // Req 47.3: bypass player-location default filter
  partTimeOnly: z.coerce.boolean().optional(),
  fullTimeOnly: z.coerce.boolean().optional(),
  seasonal: z.coerce.boolean().optional(),
  hasPension: z.coerce.boolean().optional(),
  eligibleOnly: z.coerce.boolean().optional(),
  sort: z.enum(['salary_asc', 'salary_desc', 'stress_asc', 'time_blocks_asc', 'pto_desc']).optional(),
});

const applyJobSchema = z.object({
  gameSessionId: z.string().min(1),
  partTime: z.boolean().optional().default(false),
});

const quitJobSchema = z.object({
  gameSessionId: z.string().min(1),
});

// ─── GET /api/jobs ────────────────────────────────────────────────────────────

router.get('/', authorize, async (req: Request, res: Response): Promise<void> => {
  const result = listJobsSchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid query' });
    return;
  }

  const {
    gameSessionId,
    minSalary,
    maxSalary,
    minPto,
    maxTimeBlocks,
    maxStress,
    location,
    showAll,
    partTimeOnly,
    fullTimeOnly,
    seasonal,
    hasPension,
    eligibleOnly,
    sort,
  } = result.data;

  try {
    const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
    if (!player) {
      res.status(404).json({ error: 'Player not found in this session' });
      return;
    }

    const allJobs = (await prisma.job.findMany()) as unknown as JobRow[];
    const eligPlayer = buildEligibilityPlayer(player);

    let jobs = allJobs;

    // ── Filters ───────────────────────────────────────────────────────────────

    if (minSalary !== undefined) {
      jobs = jobs.filter((j) => j.baseSalary >= minSalary);
    }
    if (maxSalary !== undefined) {
      jobs = jobs.filter((j) => j.baseSalary <= maxSalary);
    }
    if (minPto !== undefined) {
      jobs = jobs.filter((j) => j.ptoTimeBlocks >= minPto);
    }
    if (maxTimeBlocks !== undefined) {
      jobs = jobs.filter((j) => j.timeBlocks <= maxTimeBlocks);
    }
    if (maxStress !== undefined) {
      jobs = jobs.filter((j) => j.stressLevel <= maxStress);
    }
    if (location) {
      // Explicit location filter overrides the player-location default
      jobs = jobs.filter((j) => j.location === 'both' || j.location === location);
    } else if (!showAll) {
      // Req 47.3 — default: filter to player's current location (showAll=true bypasses this)
      jobs = jobs.filter((j) => j.location === 'both' || j.location === player.location);
    }
    if (partTimeOnly) {
      jobs = jobs.filter((j) => j.partTime);
    }
    if (fullTimeOnly) {
      jobs = jobs.filter((j) => j.fullTime);
    }
    if (seasonal !== undefined) {
      jobs = jobs.filter((j) => j.seasonal === seasonal);
    }
    if (hasPension) {
      jobs = jobs.filter((j) => j.hasPension);
    }

    // ── Annotate with eligibility + benefits ──────────────────────────────────
    const annotated = jobs.map((j) => {
      const eligResult = checkJobEligibility(j, eligPlayer);
      const benefits = getJobBenefits(j.benefits, j);
      // Check if player already holds this job
      const alreadyEmployed = player.employments.some(
        (e) => e.jobId === j.id && e.isActive,
      );
      // Req 47.6 — bike restriction
      const bikeRestriction = checkBikeRestriction(
        j.location,
        player.location,
        player.vehicleOwnerships.map((v) => ({
          endAge: v.endAge,
          vehicle: { type: v.vehicle.type, restrictedToArea: v.vehicle.restrictedToArea },
        })),
      );
      const bikeBlocked = bikeRestriction !== null;
      return {
        ...j,
        eligible: eligResult.eligible && !bikeBlocked,
        eligibilityReasons: bikeBlocked
          ? [...eligResult.reasons, bikeRestriction]
          : eligResult.reasons,
        benefits,
        alreadyEmployed,
        bikeBlocked,
      };
    });

    const filtered = eligibleOnly ? annotated.filter((j) => j.eligible) : annotated;

    // ── Sort ──────────────────────────────────────────────────────────────────

    if (sort) {
      filtered.sort((a, b) => {
        switch (sort) {
          case 'salary_asc':   return a.baseSalary - b.baseSalary;
          case 'salary_desc':  return b.baseSalary - a.baseSalary;
          case 'stress_asc':   return a.stressLevel - b.stressLevel;
          case 'time_blocks_asc': return a.timeBlocks - b.timeBlocks;
          case 'pto_desc':     return b.ptoTimeBlocks - a.ptoTimeBlocks;
          default:             return 0;
        }
      });
    }

    res.json({ jobs: filtered });
  } catch (err) {
    console.error('[jobs/list]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/jobs/search ─────────────────────────────────────────────────────

router.get('/search', authorize, async (req: Request, res: Response): Promise<void> => {
  const q = (req.query.q as string | undefined)?.trim();
  const gameSessionId = req.query.gameSessionId as string | undefined;

  if (!q) {
    res.status(400).json({ error: 'q query parameter is required' });
    return;
  }

  try {
    const dbJobs = await prisma.job.findMany({
      where: { title: { contains: q, mode: 'insensitive' } },
    });

    const jobs = dbJobs as unknown as JobRow[];

    if (gameSessionId && req.user) {
      const player = await fetchFullPlayer(req.user.userId, gameSessionId);
      if (player) {
        const eligPlayer = buildEligibilityPlayer(player);
        const annotated = jobs.map((j) => {
          const eligResult = checkJobEligibility(j, eligPlayer);
          const bikeRestriction = checkBikeRestriction(
            j.location,
            player.location,
            player.vehicleOwnerships.map((v) => ({
              endAge: v.endAge,
              vehicle: { type: v.vehicle.type, restrictedToArea: v.vehicle.restrictedToArea },
            })),
          );
          const bikeBlocked = bikeRestriction !== null;
          return {
            ...j,
            eligible: eligResult.eligible && !bikeBlocked,
            eligibilityReasons: bikeBlocked
              ? [...eligResult.reasons, bikeRestriction]
              : eligResult.reasons,
            benefits: getJobBenefits(j.benefits, j),
            alreadyEmployed: player.employments.some((e) => e.jobId === j.id && e.isActive),
            bikeBlocked,
          };
        });
        res.json({ jobs: annotated });
        return;
      }
    }

    res.json({ jobs });
  } catch (err) {
    console.error('[jobs/search]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/jobs/:id/apply ─────────────────────────────────────────────────

router.post(
  '/:id/apply',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const { id: jobId } = req.params;

    const result = applyJobSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, partTime } = result.data;

    try {
      const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      if (player.gameSessionId !== gameSessionId) {
        res.status(403).json({ error: 'Player does not belong to this session' });
        return;
      }

      const job = await prisma.job.findUnique({ where: { id: jobId } }) as unknown as JobRow | null;
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      // Already employed in this job?
      const existingEmployment = player.employments.find(
        (e) => e.jobId === jobId && e.isActive,
      );
      if (existingEmployment) {
        // Allow FT→PT switch at the same job — reset PTO
        if (partTime && !existingEmployment.isPartTime && job.partTime) {
          await prisma.employment.update({
            where: { id: existingEmployment.id },
            data: {
              isPartTime: true,
              ptoRemaining: resetPTOOnJobChange(),
              ...({ ptoUsed: 0 } as Record<string, unknown>),
            } as Parameters<typeof prisma.employment.update>[0]['data'],
          });

          await sendNotification(
            player.id,
            {
              type: 'info',
              category: 'job',
              title: 'Switched to Part-Time',
              message: `You switched to part-time at ${job.title}. Your accumulated PTO has been reset.`,
            },
            getIO(),
          );

          res.status(200).json({
            employment: { ...existingEmployment, isPartTime: true, ptoRemaining: 0 },
            projectedIncome: player.projectedIncome,
            deactivatedCount: 0,
            ptoReset: true,
          });
          return;
        }
        res.status(400).json({ error: 'You are already employed in this job' });
        return;
      }

      // Part-time requested but job doesn't support it
      if (partTime && !job.partTime) {
        res.status(400).json({ error: 'This job does not offer part-time employment' });
        return;
      }

      // Eligibility check
      const eligPlayer = buildEligibilityPlayer(player);
      const eligResult = checkJobEligibility(job, eligPlayer);
      if (!eligResult.eligible) {
        res.status(400).json({ error: 'Requirements not met', reasons: eligResult.reasons });
        return;
      }

      // Req 47.6 — bike restriction: block if player has bike-only transport and job is cross-area
      const bikeRestriction = checkBikeRestriction(
        job.location,
        player.location,
        player.vehicleOwnerships.map((v) => ({
          endAge: v.endAge,
          vehicle: { type: v.vehicle.type, restrictedToArea: v.vehicle.restrictedToArea },
        })),
      );
      if (bikeRestriction) {
        res.status(400).json({ error: bikeRestriction });
        return;
      }

      // Calculate new projected income (mid-year switch: half previous + half new)
      const prevSalary = currentTotalSalary(player);
      const newProjectedIncome = calculateProjectedIncomeAfterJobChange(
        prevSalary,
        job.baseSalary,
        partTime,
      );

      // Deactivate previous full-time job if this is a full-time position
      // (players can hold multiple jobs if canBeSecondJob is set, but only one primary)
      const benefits = getJobBenefits(job.benefits, job);
      const isSecondJob = benefits.canBeSecondJob;

      const employmentsToDeactivate: string[] = [];
      if (!isSecondJob && !partTime) {
        // Deactivate any existing primary (non-second) full-time jobs
        for (const emp of player.employments) {
          if (!emp.isActive) continue;
          const empBenefits = getJobBenefits(emp.job.benefits, emp.job as unknown as JobRow);
          if (!empBenefits.canBeSecondJob) {
            employmentsToDeactivate.push(emp.id);
          }
        }
      }

      // Resolve location for this employment
      const chosenLocation =
        job.location === 'both' ? player.location : job.location;

      // Persist in transaction
      const newEmployment = await prisma.$transaction(async (tx) => {
        // Deactivate replaced jobs — reset PTO on job change
        for (const empId of employmentsToDeactivate) {
          await tx.employment.update({
            where: { id: empId },
            data: {
              isActive: false,
              endAge: player.age,
              endReason: 'quit',
              ptoRemaining: resetPTOOnJobChange(),
              ...({ ptoUsed: 0 } as Record<string, unknown>),
            } as Parameters<typeof tx.employment.update>[0]['data'],
          });
        }

        // Create new employment record
        const created = await tx.employment.create({
          data: {
            playerId: player.id,
            jobId,
            startAge: player.age,
            currentSalary: job.baseSalary,
            yearsOfService: 0,
            ptoRemaining: job.ptoTimeBlocks,
            unpaidTimeOffRemaining: job.unpaidTimeOff ?? 0,
            isActive: true,
            isPartTime: partTime,
            isSeasonal: job.seasonal,
            consecutiveMissedRaiseYears: 0,
            // chosenLocation added after last Prisma client generation — cast needed
            ...({ chosenLocation } as Record<string, unknown>),
          } as Parameters<typeof tx.employment.create>[0]['data'],
        });

        // Update projected income
        await tx.player.update({
          where: { id: player.id },
          data: { projectedIncome: newProjectedIncome },
        });

        return created;
      });

      // Grant professional license if this job awards one (Req 43.7)
      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { currentYear: true },
      });
      const updatedCerts = autoGrantFromJob(player, job.title, session?.currentYear ?? 0);
      if (updatedCerts !== null) {
        await prisma.player.update({
          where: { id: player.id },
          data: { certifications: updatedCerts as unknown as Prisma.InputJsonValue },
        });
      }

      // Notify player
      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'job',
          title: 'New Job',
          message: `You are now employed as a ${job.title}!`,
        },
        getIO(),
      );

      // Broadcast state change
      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { projectedIncome: newProjectedIncome },
      });

      res.status(201).json({
        employment: newEmployment,
        projectedIncome: newProjectedIncome,
        deactivatedCount: employmentsToDeactivate.length,
      });
    } catch (err) {
      console.error('[jobs/apply]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/jobs/:id/quit ──────────────────────────────────────────────────

router.post(
  '/:id/quit',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const { id: jobId } = req.params;

    const result = quitJobSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId } = result.data;

    try {
      const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      const employment = player.employments.find(
        (e) => e.jobId === jobId && e.isActive,
      );
      if (!employment) {
        res.status(404).json({ error: 'Active employment not found for this job' });
        return;
      }

      // Deactivate employment and recalculate projected income
      const salaryLost = employment.currentSalary * (employment.isPartTime ? 0.5 : 1);
      const newProjectedIncome = Math.max(0, player.projectedIncome - salaryLost * 0.5);

      await prisma.$transaction(async (tx) => {
        await tx.employment.update({
          where: { id: employment.id },
          data: {
            isActive: false,
            endAge: player.age,
            endReason: 'quit',
            ptoRemaining: resetPTOOnJobChange(),
            ...({ ptoUsed: 0 } as Record<string, unknown>),
          } as Parameters<typeof tx.employment.update>[0]['data'],
        });
        await tx.player.update({
          where: { id: player.id },
          data: { projectedIncome: newProjectedIncome },
        });
      });

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { projectedIncome: newProjectedIncome },
      });

      res.json({ success: true, projectedIncome: newProjectedIncome });
    } catch (err) {
      console.error('[jobs/quit]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
