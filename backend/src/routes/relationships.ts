/**
 * Relationship & Family System Routes
 *
 * POST /api/relationships/marry    — execute marriage
 * POST /api/relationships/divorce  — initiate divorce (finalizes next year)
 * POST /api/relationships/child    — try for a child
 * POST /api/relationships/adopt    — apply to adopt a child
 * POST /api/relationships/adopt/accept — accept an available adoption
 *
 * Requirements: Req 14, Req 14A, Req 14B, Req 14C
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { getIO } from '../socket';
import { sendNotification } from '../lib/yearCycle';
import {
  executeMarriage,
  calculateDivorceSettlement,
  tryForChild,
  checkAdoptionEligibility,
  calculateAdoptionAvailableYear,
  generateChildAge,
  type SpouseData,
  type AdoptionAgeGroup,
} from '../lib/relationships';

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const spouseLoanSchema = z.object({
  principal: z.number().nonnegative(),
  currentBalance: z.number().nonnegative(),
  interestRate: z.number().min(0).max(1).default(0.08),
  minimumPayment: z.number().nonnegative(),
  originAge: z.number().int().positive(),
});

const spouseDataSchema = z.object({
  age: z.number().int().min(18),
  jobId: z.string().nullable().optional(),
  salary: z.number().nonnegative().default(0),
  isJobPartTime: z.boolean().default(false),
  educationProgramId: z.string().nullable().optional(),
  isEduPartTime: z.boolean().default(false),
  vehicleId: z.string().nullable().optional(),
  housingId: z.string().nullable().optional(),
  loans: z.array(spouseLoanSchema).default([]),
  money: z.number().nonnegative().default(0),
  retirementSavings: z.number().nonnegative().default(0),
  isRetired: z.boolean().default(false),
  certifications: z.array(z.string()).default([]),
  hasAccountingExperience: z.boolean().default(false),
});

const marrySchema = z.object({
  gameSessionId: z.string().min(1),
  spouseData: spouseDataSchema,
});

const divorceSchema = z.object({
  gameSessionId: z.string().min(1),
});

const childSchema = z.object({
  gameSessionId: z.string().min(1),
});

const adoptSchema = z.object({
  gameSessionId: z.string().min(1),
  ageGroup: z.enum(['0-2', '3-9', '10-17']),
});

const adoptAcceptSchema = z.object({
  gameSessionId: z.string().min(1),
  applicationId: z.string().min(1),
});

// ─── POST /api/relationships/marry ───────────────────────────────────────────

router.post(
  '/marry',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = marrySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, spouseData } = result.data;
    const player = req.player!;

    try {
      if (player.maritalStatus === 'married') {
        res.status(400).json({ error: 'Player is already married' });
        return;
      }

      const parentContributions = (player.parentContributions as Record<string, number>) ?? {};
      const parentWeddingContribution = parentContributions.wedding ?? 0;
      const isFirstMarriage = player.maritalStatus === 'single';

      // Build full spouse data with originals
      const fullSpouseData: SpouseData = {
        ...spouseData,
        originalMoney: spouseData.money,
        originalSavings: spouseData.retirementSavings,
        originalLoans: spouseData.loans.reduce((sum, l) => sum + l.currentBalance, 0),
      };

      const marriageResult = executeMarriage({
        playerMoney: player.money,
        playerRetirementSavings: player.retirementSavings,
        spouseData: fullSpouseData,
        isFirstMarriage,
        parentWeddingContribution,
      });

      // Check player can afford wedding cost
      if (marriageResult.combinedMoney < 0) {
        res.status(400).json({
          error: `Cannot afford wedding. Cost: ${marriageResult.weddingCost.toLocaleString()}, combined funds insufficient.`,
        });
        return;
      }

      // Build spouse JSON to store on player
      const spouseRecord = {
        ...fullSpouseData,
        originalMoney: marriageResult.spouseOriginalMoney,
        originalSavings: marriageResult.spouseOriginalSavings,
        originalLoans: marriageResult.spouseOriginalLoans,
      };

      await prisma.$transaction(async (tx) => {
        // Update player finances and marital status
        await tx.player.update({
          where: { id: player.id },
          data: {
            money: marriageResult.combinedMoney,
            retirementSavings: marriageResult.combinedRetirementSavings,
            maritalStatus: 'married',
            spouse: spouseRecord as any,
          },
        });

        // Add spouse loans to player's loan list (marked as spouse-owned)
        for (const loan of marriageResult.spouseLoansToAdd) {
          await tx.loan.create({
            data: {
              playerId: player.id,
              principal: loan.principal,
              currentBalance: loan.currentBalance,
              interestRate: loan.interestRate,
              minimumPayment: loan.minimumPayment,
              originAge: loan.originAge,
              isJoint: false,
              owner: 'spouse',
            },
          });
        }

        // Initialize or reset MarriageCompatibility record
        await tx.marriageCompatibility.upsert({
          where: { playerId: player.id },
          create: {
            playerId: player.id,
            currentScore: 0,
            yearlyScores: {},
            debtStressHistory: [],
            familyActionHistory: [],
            totalYearsMarried: 0,
            communicationGained: 0,
            compassionGained: 0,
            patienceGained: 0,
          },
          update: {
            currentScore: 0,
            debtStressHistory: [],
            familyActionHistory: [],
          },
        });
      });

      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'family',
          title: 'Congratulations on Your Marriage!',
          message: `You are now married! Wedding cost: $${marriageResult.weddingCost.toLocaleString()}${isFirstMarriage && parentWeddingContribution > 0 ? ` (parents contributed $${parentWeddingContribution.toLocaleString()})` : ''}.`,
        },
        getIO(),
      );

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: {
          money: marriageResult.combinedMoney,
          retirementSavings: marriageResult.combinedRetirementSavings,
        },
      });

      res.status(201).json({
        married: true,
        weddingCost: marriageResult.weddingCost,
        parentContribution: isFirstMarriage ? parentWeddingContribution : 0,
        combinedMoney: marriageResult.combinedMoney,
        combinedRetirementSavings: marriageResult.combinedRetirementSavings,
        spouseLoansAdded: marriageResult.spouseLoansToAdd.length,
      });
    } catch (err) {
      console.error('[relationships/marry]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/relationships/divorce ─────────────────────────────────────────

router.post(
  '/divorce',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = divorceSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId } = result.data;
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

      // Fetch all player loans to calculate total balance
      const loans = await prisma.loan.findMany({ where: { playerId: player.id } });
      const totalLoanBalance = loans.reduce((sum, l) => sum + l.currentBalance, 0);

      const settlement = calculateDivorceSettlement({
        currentMoney: player.money,
        currentRetirementSavings: player.retirementSavings,
        currentLoanBalance: totalLoanBalance,
        playerOriginalMoney: spouse.originalMoney ?? 0,
        spouseOriginalMoney: spouse.originalMoney ?? 0,
        playerOriginalSavings: spouse.originalSavings ?? 0,
        spouseOriginalSavings: spouse.originalSavings ?? 0,
        playerOriginalLoans: 0,
        spouseOriginalLoans: spouse.originalLoans ?? 0,
      });

      const newStress = Math.min(100, player.stress + settlement.stressAdded);

      await prisma.$transaction(async (tx) => {
        // Apply settlement
        await tx.player.update({
          where: { id: player.id },
          data: {
            money: settlement.playerMoney,
            retirementSavings: settlement.playerRetirementSavings,
            maritalStatus: 'divorced',
            spouse: Prisma.JsonNull,
            stress: newStress,
          },
        });

        // Remove spouse-owned loans (they go back to spouse)
        await tx.loan.deleteMany({
          where: { playerId: player.id, owner: 'spouse' },
        });
      });

      await sendNotification(
        player.id,
        {
          type: 'warning',
          category: 'family',
          title: 'Divorce Finalized',
          message: 'Your divorce has been finalized. Assets have been split. Please review your childcare arrangements.',
          persistent: true,
          actionRequired: true,
        },
        getIO(),
      );

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: {
          money: settlement.playerMoney,
          retirementSavings: settlement.playerRetirementSavings,
          stress: newStress,
        },
      });

      res.json({
        divorced: true,
        settlement: {
          playerMoney: settlement.playerMoney,
          playerRetirementSavings: settlement.playerRetirementSavings,
          playerLoanBalance: settlement.playerLoanBalance,
          stressAdded: settlement.stressAdded,
        },
      });
    } catch (err) {
      console.error('[relationships/divorce]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/relationships/child ───────────────────────────────────────────

router.post(
  '/child',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = childSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId } = result.data;
    const player = req.player!;

    try {
      if (player.age > 45) {
        res.status(400).json({ error: 'Player must be age 45 or younger to try for a child' });
        return;
      }

      const childResult = tryForChild({ playerAge: player.age });

      if (childResult.success) {
        // Add newborn child
        const child = await prisma.child.create({
          data: {
            playerId: player.id,
            age: 0,
            isAdopted: false,
          },
        });

        await sendNotification(
          player.id,
          {
            type: 'success',
            category: 'family',
            title: 'Congratulations! A New Baby!',
            message: 'You have welcomed a new baby into your family!',
          },
          getIO(),
        );

        res.status(201).json({ success: true, child, stressAdded: 0 });
      } else {
        // Failure: +2% stress
        const newStress = Math.min(100, player.stress + childResult.stressAdded);
        await prisma.player.update({
          where: { id: player.id },
          data: { stress: newStress },
        });

        await sendNotification(
          player.id,
          {
            type: 'info',
            category: 'family',
            title: 'Failed to Conceive',
            message: 'You were not able to conceive this year. +2% stress.',
          },
          getIO(),
        );

        getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
          playerId: player.id,
          changes: { stress: newStress },
        });

        res.json({ success: false, stressAdded: childResult.stressAdded });
      }
    } catch (err) {
      console.error('[relationships/child]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/relationships/adopt ───────────────────────────────────────────

router.post(
  '/adopt',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = adoptSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, ageGroup } = result.data;
    const player = req.player!;

    try {
      // Only one adoption application per year
      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { currentYear: true },
      });
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const existingApp = await prisma.adoptionApplication.findFirst({
        where: {
          playerId: player.id,
          status: { in: ['pending', 'available'] },
        },
      });
      if (existingApp) {
        res.status(400).json({ error: 'You already have an active adoption application' });
        return;
      }

      // Check eligibility
      const eligibility = checkAdoptionEligibility({
        ageGroup: ageGroup as AdoptionAgeGroup,
        playerAge: player.age,
        playerStress: player.stress,
      });

      if (!eligibility.eligible) {
        res.status(400).json({ error: 'Adoption requirements not met', reasons: eligibility.reasons });
        return;
      }

      const availableYear = calculateAdoptionAvailableYear(ageGroup as AdoptionAgeGroup, session.currentYear);

      const application = await prisma.adoptionApplication.create({
        data: {
          playerId: player.id,
          childAgeGroup: ageGroup,
          status: availableYear === session.currentYear ? 'available' : 'pending',
          appliedYear: session.currentYear,
          availableYear,
        },
      });

      // For age 3-9 and 10-17: available same year — finalize immediately
      if (ageGroup !== '0-2') {
        const childAge = generateChildAge(ageGroup as AdoptionAgeGroup);

        const child = await prisma.child.create({
          data: {
            playerId: player.id,
            age: childAge,
            isAdopted: true,
          },
        });

        await prisma.adoptionApplication.update({
          where: { id: application.id },
          data: { status: 'completed', completedYear: session.currentYear },
        });

        await sendNotification(
          player.id,
          {
            type: 'success',
            category: 'family',
            title: 'Adoption Complete!',
            message: `You have adopted a child aged ${childAge}! Welcome to the family!`,
          },
          getIO(),
        );

        res.status(201).json({
          application,
          child,
          availableYear,
          message: 'Adoption finalized this year.',
        });
        return;
      }

      // Age 0-2: pending — notify player of expected timeline
      await sendNotification(
        player.id,
        {
          type: 'info',
          category: 'family',
          title: 'Adoption Application Submitted',
          message: `Your adoption application for a child aged 0-2 has been submitted. Children in this age group are typically available within 6 years.`,
          persistent: true,
        },
        getIO(),
      );

      res.status(201).json({
        application,
        availableYear,
        message: 'Application submitted. Child typically available within 6 years.',
      });
    } catch (err) {
      console.error('[relationships/adopt]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/relationships/adopt/accept ────────────────────────────────────

router.post(
  '/adopt/accept',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = adoptAcceptSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, applicationId } = result.data;
    const player = req.player!;

    try {
      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { currentYear: true },
      });
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const application = await prisma.adoptionApplication.findFirst({
        where: { id: applicationId, playerId: player.id, status: 'available' },
      });

      if (!application) {
        res.status(404).json({ error: 'Adoption application not found or not yet available' });
        return;
      }

      // Re-verify eligibility for age 0-2 (Req 14C.12)
      if (application.childAgeGroup === '0-2') {
        const eligibility = checkAdoptionEligibility({
          ageGroup: '0-2',
          playerAge: player.age,
          playerStress: player.stress,
        });

        if (!eligibility.eligible) {
          res.status(400).json({
            error: 'You no longer meet the requirements for this adoption',
            reasons: eligibility.reasons,
          });
          return;
        }
      }

      const childAge = generateChildAge(application.childAgeGroup as AdoptionAgeGroup);

      const child = await prisma.$transaction(async (tx) => {
        const newChild = await tx.child.create({
          data: {
            playerId: player.id,
            age: childAge,
            isAdopted: true,
          },
        });

        await tx.adoptionApplication.update({
          where: { id: application.id },
          data: { status: 'completed', completedYear: session.currentYear },
        });

        return newChild;
      });

      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'family',
          title: 'Adoption Accepted!',
          message: `You have accepted the adoption of a child aged ${childAge}. Welcome to the family!`,
        },
        getIO(),
      );

      res.status(201).json({
        child,
        message: application.childAgeGroup === '0-2'
          ? 'Adoption accepted. Will be finalized next year.'
          : 'Adoption finalized.',
      });
    } catch (err) {
      console.error('[relationships/adopt/accept]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
