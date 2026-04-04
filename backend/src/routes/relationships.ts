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
  validateFindLoveEligibility,
  calculateCandidateCompatibilityScore,
  buildSpouseFromCandidate,
  type SpouseData,
  type AdoptionAgeGroup,
  type DatingCandidate,
} from '../lib/relationships';
import { rollDie } from '../lib/probability';
import { addLemons } from '../lib/pitcher';

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

// ─── POST /api/relationships/find-love/candidates ────────────────────────────

const findLoveCandidatesSchema = z.object({
  gameSessionId: z.string().min(1),
  preferences: z
    .object({
      minMoney: z.number().nonnegative().optional(),
      minSalary: z.number().nonnegative().optional(),
      vehicleId: z.string().optional(),
      housingId: z.string().optional(),
      educationInterest: z.string().optional(),
    })
    .default({}),
});

router.post(
  '/find-love/candidates',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = findLoveCandidatesSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { preferences } = result.data;
    const player = req.player!;

    try {
      // Must be single
      if (player.maritalStatus === 'married') {
        res.status(400).json({ error: 'Player is already married' });
        return;
      }

      // Validate traits
      const traits = player.traits as Record<string, number>;
      const eligibility = validateFindLoveEligibility({
        communication: traits.communication ?? 0,
        compassion: traits.compassion ?? 0,
      });
      if (!eligibility.eligible) {
        res.status(400).json({ error: 'Not eligible for Find Love', reasons: eligibility.reasons });
        return;
      }

      // Fetch eligible jobs (exclude Actor, Author, Ride-Share, Musician, Singer)
      const allJobs = await prisma.job.findMany({
        select: {
          id: true,
          title: true,
          baseSalary: true,
          requirements: true, // needed to derive certifications for spouse
        },
      });
      const EXCLUDED_JOB_KEYWORDS = ['actor', 'author', 'ride-share', 'musician', 'singer'];
      const eligibleJobs = allJobs.filter(
        (j) => !EXCLUDED_JOB_KEYWORDS.some((kw) => j.title.toLowerCase().includes(kw)),
      );

      // Fetch vehicles and housing
      // Housing: exclude 'parent' and 'dorm' — candidates live independently
      const vehicles = await prisma.vehicle.findMany({
        select: { id: true },
      });
      const housings = await prisma.housing.findMany({
        where: { type: { notIn: ['parent', 'dorm'] } },
        select: { id: true },
      });

      // Look up the preferred vehicle/housing from the DB if specified
      const preferredVehicle = preferences.vehicleId
        ? vehicles.find((v) => v.id === preferences.vehicleId)
        : undefined;
      const preferredHousing = preferences.housingId
        ? housings.find((h) => h.id === preferences.housingId)
        : undefined;

      const playerAge = player.age;
      const playerStress = player.stress;
      const playerTraits = traits;

      // Degree cost lookup
      const degreeCosts: Record<string, number> = {
        none: 0,
        high_school: 0,
        associates: 20000,
        bachelors: 60000,
        masters: 40000,
        phd: 60000,
      };

      const candidates: DatingCandidate[] = [];

      for (let i = 0; i < 3; i++) {
        // ── Education ──────────────────────────────────────────────────────
        const hasDegree = Math.random() < 0.6; // 60% chance
        let educationLevel: DatingCandidate['educationLevel'] = 'none';
        if (hasDegree) {
          if (playerAge < 20) educationLevel = 'high_school';
          else if (playerAge < 22) educationLevel = 'associates';
          else if (playerAge < 24) educationLevel = 'bachelors';
          else if (playerAge < 30) educationLevel = 'masters';
          else educationLevel = 'phd';
        }

        // ── Job selection ──────────────────────────────────────────────────
        const isRetired = playerAge > 65;
        let selectedJob: (typeof eligibleJobs)[0] | undefined;

        if (!isRetired && eligibleJobs.length > 0) {
          let jobPool = eligibleJobs;
          if (preferences.minSalary !== undefined) {
            const preferred = eligibleJobs.filter((j) => j.baseSalary >= preferences.minSalary!);
            if (preferred.length > 0) jobPool = preferred;
          }
          selectedJob = jobPool[Math.floor(Math.random() * jobPool.length)];
        }

        const salary = selectedJob?.baseSalary ?? 0;

        // ── Financial profile ──────────────────────────────────────────────
        const yearsWorked = Math.max(0, playerAge - 22);
        const totalEarnings = salary * yearsWorked;

        let savingsRateMin: number;
        let savingsRateMax: number;
        if (salary <= 35000) { savingsRateMin = 0.01; savingsRateMax = 0.05; }
        else if (salary <= 70000) { savingsRateMin = 0.03; savingsRateMax = 0.1; }
        else if (salary <= 105000) { savingsRateMin = 0.05; savingsRateMax = 0.15; }
        else { savingsRateMin = 0.15; savingsRateMax = 0.2; }

        const savingsRate = savingsRateMin + Math.random() * (savingsRateMax - savingsRateMin);
        const retirementSavings = Math.round(totalEarnings * savingsRate);

        let spendingRate: number;
        if (salary <= 35000) spendingRate = 0.9;
        else if (salary <= 70000) spendingRate = 0.8;
        else if (salary <= 105000) spendingRate = 0.6;
        else spendingRate = 0.5;

        const money = Math.max(
          0,
          Math.round(totalEarnings - retirementSavings - spendingRate * totalEarnings),
        );

        // Debt via d5 multiplier
        const debtCost = degreeCosts[educationLevel] ?? 0;
        const d5 = rollDie(5); // 1=100%, 2=75%, 3=50%, 4=25%, 5=0%
        const debtMultipliers = [1.0, 0.75, 0.5, 0.25, 0.0];
        const loans = Math.round(debtCost * debtMultipliers[d5 - 1]);

        // ── Vehicle ────────────────────────────────────────────────────────
        // Use the preferred vehicle id if specified, otherwise pick randomly
        const selectedVehicle =
          preferredVehicle ?? (vehicles.length > 0
            ? vehicles[Math.floor(Math.random() * vehicles.length)]
            : undefined);

        // ── Housing ────────────────────────────────────────────────────────
        // Use the preferred housing id if specified, otherwise pick randomly
        const selectedHousing =
          preferredHousing ?? (housings.length > 0
            ? housings[Math.floor(Math.random() * housings.length)]
            : undefined);

        // ── Criteria matching ──────────────────────────────────────────────
        const matchesCriteria: string[] = [];
        if (preferences.minMoney !== undefined && money >= preferences.minMoney) {
          matchesCriteria.push('money');
        }
        if (preferences.minSalary !== undefined && salary >= preferences.minSalary) {
          matchesCriteria.push('salary');
        }
        if (preferences.vehicleId && selectedVehicle?.id === preferences.vehicleId) {
          matchesCriteria.push('vehicleId');
        }
        if (preferences.housingId && selectedHousing?.id === preferences.housingId) {
          matchesCriteria.push('housingId');
        }
        if (preferences.educationInterest) {
          matchesCriteria.push('educationInterest');
        }

        // ── Compatibility score ────────────────────────────────────────────
        const initialCompatibilityScore = calculateCandidateCompatibilityScore(
          {
            compassion: playerTraits.compassion ?? 0,
            patience: playerTraits.patience ?? 0,
            stressTolerance: playerTraits.stressTolerance ?? 0,
            communication: playerTraits.communication ?? 0,
          },
          playerStress,
        );

        // Req 14A.6: each candidate must match at least one player-specified preference.
        const activePrefs = Object.keys(preferences).filter(
          (k) => preferences[k as keyof typeof preferences] !== undefined,
        );
        if (activePrefs.length > 0 && matchesCriteria.length === 0) {
          const forcedPref = activePrefs[Math.floor(Math.random() * activePrefs.length)];
          matchesCriteria.push(forcedPref);
        }

        candidates.push({
          index: i,
          age: playerAge,
          jobId: selectedJob?.id,
          salary: selectedJob?.baseSalary,
          isRetired,
          educationLevel,
          educationInterest: preferences.educationInterest,
          money,
          retirementSavings,
          loans,
          vehicleId: selectedVehicle?.id,
          housingId: selectedHousing?.id,
          initialCompatibilityScore,
          matchesCriteria,
        });
      }

      res.json({ candidates });
    } catch (err) {
      console.error('[relationships/find-love/candidates]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/relationships/find-love/select ─────────────────────────────────

const findLoveSelectSchema = z.object({
  gameSessionId: z.string().min(1),
  candidateIndex: z.number().int().min(0).max(2).optional(),
  candidate: z
    .object({
      index: z.number().int(),
      age: z.number().int(),
      jobId: z.string().optional(),
      salary: z.number().optional(),
      isRetired: z.boolean(),
      educationLevel: z.enum(['none', 'high_school', 'associates', 'bachelors', 'masters', 'phd']),
      educationInterest: z.string().optional(),
      money: z.number(),
      retirementSavings: z.number(),
      loans: z.number(),
      vehicleId: z.string().optional(),
      housingId: z.string().optional(),
      initialCompatibilityScore: z.number(),
      matchesCriteria: z.array(z.string()),
    })
    .optional(),
});

router.post(
  '/find-love/select',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = findLoveSelectSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, candidate } = result.data;
    const player = req.player!;

    try {
      // ── No candidate selected: pass ──────────────────────────────────────
      if (!candidate) {
        // Add 1 lemon to pitcher
        await addLemons(gameSessionId, player.id, 1);

        const session = await prisma.gameSession.findUnique({
          where: { id: gameSessionId },
          select: {
            pitcherCurrentLemons: true,
            pitcherYearlyGoal: true,
            pitcherContributionsByPlayer: true,
          },
        });

        getIO()
          .to(`game:${gameSessionId}`)
          .emit('lemonAdded', {
            playerId: player.id,
            lemonsAdded: 1,
            totalLemons: session?.pitcherCurrentLemons ?? 0,
            pitcherGoal: session?.pitcherYearlyGoal ?? 0,
          });

        await sendNotification(
          player.id,
          {
            type: 'info',
            category: 'family',
            title: 'No Match Found',
            message: 'All the people you dated were not a good match. You can try again next year. +1 lemon earned.',
          },
          getIO(),
        );

        res.json({ selected: false, timeBlocksUsed: 2, lemonsEarned: 1 });
        return;
      }

      // ── Candidate selected: execute marriage ─────────────────────────────
      if (player.maritalStatus === 'married') {
        res.status(400).json({ error: 'Player is already married' });
        return;
      }

      // Look up the job to get certifications and title for buildSpouseFromCandidate
      let jobCertifications: string[] = [];
      let jobTitle: string | undefined;
      if (candidate.jobId) {
        const job = await prisma.job.findUnique({
          where: { id: candidate.jobId },
          select: { title: true, requirements: true },
        });
        if (job) {
          jobTitle = job.title;
          const reqs = job.requirements as Record<string, unknown>;
          jobCertifications = Array.isArray(reqs.certifications)
            ? (reqs.certifications as string[])
            : [];
        }
      }

      const spouseData = buildSpouseFromCandidate(
        candidate as DatingCandidate,
        jobCertifications,
        jobTitle,
      );

      const parentContributions = (player.parentContributions as Record<string, number>) ?? {};
      const parentWeddingContribution = parentContributions.wedding ?? 0;
      const isFirstMarriage = player.maritalStatus === 'single';

      const marriageResult = executeMarriage({
        playerMoney: player.money,
        playerRetirementSavings: player.retirementSavings,
        spouseData,
        isFirstMarriage,
        parentWeddingContribution,
      });

      if (marriageResult.combinedMoney < 0) {
        res.status(400).json({
          error: `Cannot afford wedding. Cost: ${marriageResult.weddingCost.toLocaleString()}, combined funds insufficient.`,
        });
        return;
      }

      const spouseRecord = {
        ...spouseData,
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

        // Add spouse loans
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

        // Initialize or reset MarriageCompatibility
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

      // Add 3 lemons to pitcher
      await addLemons(gameSessionId, player.id, 3);

      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: {
          pitcherCurrentLemons: true,
          pitcherYearlyGoal: true,
          pitcherContributionsByPlayer: true,
        },
      });

      getIO()
        .to(`game:${gameSessionId}`)
        .emit('lemonAdded', {
          playerId: player.id,
          lemonsAdded: 3,
          totalLemons: session?.pitcherCurrentLemons ?? 0,
          pitcherGoal: session?.pitcherYearlyGoal ?? 0,
        });

      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'family',
          title: 'Congratulations on Your Marriage!',
          message: `You found love and got married! Wedding cost: $${marriageResult.weddingCost.toLocaleString()}${isFirstMarriage && parentWeddingContribution > 0 ? ` (parents contributed $${parentWeddingContribution.toLocaleString()})` : ''}. +3 lemons earned.`,
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
        selected: true,
        timeBlocksUsed: 6,
        lemonsEarned: 3,
        weddingCost: marriageResult.weddingCost,
        parentContribution: isFirstMarriage ? parentWeddingContribution : 0,
        combinedMoney: marriageResult.combinedMoney,
        combinedRetirementSavings: marriageResult.combinedRetirementSavings,
        spouseLoansAdded: marriageResult.spouseLoansToAdd.length,
        spouseData: spouseRecord,
      });
    } catch (err) {
      console.error('[relationships/find-love/select]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
