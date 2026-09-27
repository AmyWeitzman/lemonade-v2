/**
 * Spouse Management Routes
 *
 * PUT /api/spouse/job        — Set/update spouse job (one job max, can't set if retired)
 * PUT /api/spouse/education  — Set/update spouse education (PT only if also has job)
 * PUT /api/spouse/vehicle    — Set/update spouse vehicle
 * GET /api/spouse/summary    — Get full spouse summary including costs
 *
 * Requirements: Req 27
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { getIO } from '../socket';
import { calculateAnnualVehicleCosts, calculateDepreciatedValue, type VehicleRow } from '../lib/vehicles';
import type { SpouseData } from '../lib/relationships';

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const spouseJobSchema = z.object({
  gameSessionId: z.string().min(1),
  jobId: z.string().nullable(),
  isPartTime: z.boolean().default(false),
});

const spouseEducationSchema = z.object({
  gameSessionId: z.string().min(1),
  programId: z.string().nullable(),
  isPartTime: z.boolean().default(false),
});

const spouseVehicleSchema = z.object({
  gameSessionId: z.string().min(1),
  vehicleId: z.string().nullable(),
});

const summaryQuerySchema = z.object({
  gameSessionId: z.string().min(1),
});

// ─── PUT /api/spouse/job ──────────────────────────────────────────────────────

router.put(
  '/job',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = spouseJobSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { jobId, isPartTime } = result.data;
    const player = req.player!;

    try {
      if (player.maritalStatus !== 'married') {
        res.status(400).json({ error: 'Player is not married' });
        return;
      }

      const spouse = player.spouse as SpouseData | null;
      if (!spouse) {
        res.status(400).json({ error: 'No spouse data found' });
        return;
      }

      // Prevent assigning a job to a retired spouse (Req 27)
      if (spouse.isRetired && jobId !== null) {
        res.status(400).json({ error: 'Cannot assign a job to a retired spouse.' });
        return;
      }

      let newSalary = 0;

      if (jobId !== null) {
        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job) {
          res.status(404).json({ error: 'Job not found' });
          return;
        }

        // Validate part-time eligibility
        if (isPartTime && !job.partTime) {
          res.status(400).json({ error: 'This job does not allow part-time employment' });
          return;
        }

        const baseSalary = isPartTime ? job.baseSalary * 0.5 : job.baseSalary;

        // Mid-year salary adjustment if switching jobs
        if (spouse.jobId && spouse.jobId !== jobId) {
          newSalary = spouse.salary * 0.5 + baseSalary * 0.5;
        } else {
          newSalary = baseSalary;
        }
      }

      const updatedSpouse: SpouseData = {
        ...spouse,
        jobId,
        salary: newSalary,
        isJobPartTime: isPartTime,
      };

      await prisma.player.update({
        where: { id: player.id },
        data: { spouse: updatedSpouse as unknown as Prisma.InputJsonValue },
      });

      res.json({
        spouse: updatedSpouse,
        message: jobId ? 'Spouse job updated successfully' : 'Spouse job removed',
      });
    } catch (err) {
      console.error('[spouse/job]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── PUT /api/spouse/education ────────────────────────────────────────────────

router.put(
  '/education',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = spouseEducationSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { programId, isPartTime } = result.data;
    const player = req.player!;

    try {
      if (player.maritalStatus !== 'married') {
        res.status(400).json({ error: 'Player is not married' });
        return;
      }

      const spouse = player.spouse as SpouseData | null;
      if (!spouse) {
        res.status(400).json({ error: 'No spouse data found' });
        return;
      }

      if (programId !== null) {
        const program = await prisma.educationProgram.findUnique({ where: { id: programId } });
        if (!program) {
          res.status(404).json({ error: 'Education program not found' });
          return;
        }

        // If spouse has a job, education must be part-time (Req 27)
        if (spouse.jobId && !isPartTime) {
          res.status(400).json({ error: 'Spouse must enroll part-time when also employed' });
          return;
        }

        if (isPartTime && !program.partTimeAllowed) {
          res.status(400).json({ error: 'This program does not allow part-time enrollment' });
          return;
        }
      }

      const updatedSpouse: SpouseData = {
        ...spouse,
        educationProgramId: programId,
        isEduPartTime: isPartTime,
      };

      await prisma.player.update({
        where: { id: player.id },
        data: { spouse: updatedSpouse as unknown as Prisma.InputJsonValue },
      });

      res.json({
        spouse: updatedSpouse,
        message: programId ? 'Spouse education updated successfully' : 'Spouse education removed',
      });
    } catch (err) {
      console.error('[spouse/education]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── PUT /api/spouse/vehicle ──────────────────────────────────────────────────

router.put(
  '/vehicle',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = spouseVehicleSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, vehicleId } = result.data;
    const player = req.player!;

    try {
      if (player.maritalStatus !== 'married') {
        res.status(400).json({ error: 'Player is not married' });
        return;
      }

      const spouse = player.spouse as SpouseData | null;
      if (!spouse) {
        res.status(400).json({ error: 'No spouse data found' });
        return;
      }

      let saleProceeds = 0;

      // Close existing spouse vehicle ownership if any
      if (spouse.vehicleId) {
        const existingOwnership = await prisma.vehicleOwnership.findFirst({
          where: { playerId: player.id, vehicleId: spouse.vehicleId, isSpouseVehicle: true, endAge: null },
          include: { vehicle: true },
        });

        if (existingOwnership) {
          const vehicleRow = existingOwnership.vehicle as unknown as VehicleRow;
          const purchasePrice = existingOwnership.purchasePrice ?? vehicleRow.purchasePrice ?? 0;
          saleProceeds = calculateDepreciatedValue(vehicleRow, purchasePrice, existingOwnership.yearsOwned);

          await prisma.vehicleOwnership.update({
            where: { id: existingOwnership.id },
            data: { endAge: player.age, salePrice: saleProceeds },
          });

          await prisma.player.update({
            where: { id: player.id },
            data: { money: { increment: saleProceeds } },
          });
        }
      }

      // Create new vehicle ownership for spouse
      if (vehicleId !== null) {
        const newVehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
        if (!newVehicle) {
          res.status(404).json({ error: 'Vehicle not found' });
          return;
        }

        const purchasePrice = newVehicle.purchasePrice ?? 0;

        const currentPlayer = await prisma.player.findUnique({
          where: { id: player.id },
          select: { money: true },
        });
        const availableMoney = currentPlayer?.money ?? player.money;

        if (purchasePrice > availableMoney) {
          res.status(400).json({
            error: `Insufficient funds. Vehicle costs $${purchasePrice.toLocaleString()}, available: $${availableMoney.toLocaleString()}`,
          });
          return;
        }

        await prisma.vehicleOwnership.create({
          data: {
            playerId: player.id,
            vehicleId,
            startAge: player.age,
            purchasePrice,
            isSpouseVehicle: true,
            yearsOwned: 0,
          },
        });

        await prisma.player.update({
          where: { id: player.id },
          data: { money: { decrement: purchasePrice } },
        });
      }

      const updatedSpouse: SpouseData = { ...spouse, vehicleId };

      await prisma.player.update({
        where: { id: player.id },
        data: { spouse: updatedSpouse as unknown as Prisma.InputJsonValue },
      });

      const updatedPlayer = await prisma.player.findUnique({
        where: { id: player.id },
        select: { money: true },
      });

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { money: updatedPlayer?.money ?? player.money },
      });

      res.json({
        spouse: updatedSpouse,
        saleProceeds,
        newMoney: updatedPlayer?.money ?? player.money,
        message: vehicleId ? 'Spouse vehicle updated successfully' : 'Spouse vehicle removed',
      });
    } catch (err) {
      console.error('[spouse/vehicle]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── GET /api/spouse/summary ──────────────────────────────────────────────────

router.get('/summary', authorize, async (req: Request, res: Response): Promise<void> => {
  const result = summaryQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid query' });
    return;
  }

  const { gameSessionId } = result.data;

  try {
    const player = await prisma.player.findUnique({
      where: { userId_gameSessionId: { userId: req.user!.userId, gameSessionId } },
      include: {
        loans: true,
        vehicleOwnerships: {
          where: { endAge: null, isSpouseVehicle: true },
          include: { vehicle: true },
        },
      },
    });

    if (!player) {
      res.status(404).json({ error: 'Player not found in this session' });
      return;
    }

    if (player.maritalStatus !== 'married') {
      res.status(400).json({ error: 'Player is not married' });
      return;
    }

    const spouse = player.spouse as SpouseData | null;
    if (!spouse) {
      res.status(404).json({ error: 'No spouse data found' });
      return;
    }

    const session = await prisma.gameSession.findUnique({
      where: { id: gameSessionId },
      select: { currentYear: true },
    });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Spouse vehicle costs
    let spouseVehicleCosts = 0;
    const spouseVehicleBreakdown: Record<string, number> = {};
    for (const vo of player.vehicleOwnerships) {
      const vehicle = vo.vehicle as unknown as VehicleRow;
      const costs = calculateAnnualVehicleCosts(vehicle, vo.yearsOwned, false);
      spouseVehicleCosts += costs.total;
      spouseVehicleBreakdown[vehicle.name] = costs.total;
    }

    // Spouse loan minimum payments (spouse-owned + joint)
    const spouseLoans = player.loans.filter((l) => l.owner === 'spouse' || l.isJoint);
    const spouseLoanMinPayments = spouseLoans.reduce((sum, l) => {
      const newBalance = l.currentBalance * (1 + l.interestRate);
      return sum + newBalance * 0.05;
    }, 0);

    // Spouse tuition
    let spouseTuition = 0;
    if (spouse.educationProgramId) {
      const program = await prisma.educationProgram.findUnique({
        where: { id: spouse.educationProgramId },
      });
      if (program) {
        spouseTuition = spouse.isEduPartTime
          ? (program.tuitionPartTime ?? program.tuitionFullTime * 0.5)
          : program.tuitionFullTime;
      }
    }

    // CPR renewal cost
    const spouseCprYear = (spouse as unknown as Record<string, unknown>).spouseCprYear as number | undefined;
    const hasCpr = (spouse.certifications ?? []).includes('CPR');
    const cprRenewalDue = hasCpr && spouseCprYear !== undefined
      ? (session.currentYear - spouseCprYear) >= 2
      : false;
    const spouseCprRenewal = cprRenewalDue ? 75 : 0;

    res.json({
      spouse,
      annualCosts: {
        vehicleCosts: spouseVehicleCosts,
        vehicleBreakdown: spouseVehicleBreakdown,
        loanMinPayments: spouseLoanMinPayments,
        tuition: spouseTuition,
        cprRenewal: spouseCprRenewal,
        total: spouseVehicleCosts + spouseLoanMinPayments + spouseTuition + spouseCprRenewal,
      },
      loans: spouseLoans,
    });
  } catch (err) {
    console.error('[spouse/summary]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
