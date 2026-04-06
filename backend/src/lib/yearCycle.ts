import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../socket/events';
import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import {
  generateInflationRates,
  applyInflation,
  applyGlobalCatalogInflation,
  type InflationRates,
} from './inflation';
import {
  calculateAnnualSkillGains,
  checkGraduationRequirements,
  type EduProgramRow,
} from './education';
import {
  calculateMarriageCompatibility,
  applyMarriageTraitGains,
  type MarriageCompatibilityRecord,
} from './relationships';
import { calculatePetLemons } from './pets';
import { checkYearEndPitcher, recalculatePitcherGoal } from './pitcher';
import { calculatePTOAccrual } from './pto';
import { calculateInternshipJobPayReduction } from './internship';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaxBracket {
  minIncome: number;
  maxIncome: number | null;
  rate: number;
  filingStatus: 'single' | 'married';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function agingHealthLoss(age: number): number {
  if (age >= 80) return 5;
  if (age >= 70) return 4;
  if (age >= 60) return 3;
  if (age >= 50) return 2;
  if (age >= 40) return 1;
  return 0;
}

// ─── sendNotification ─────────────────────────────────────────────────────────

export async function sendNotification(
  playerId: string,
  notification: {
    type: 'info' | 'warning' | 'success' | 'error';
    category: string;
    title: string;
    message: string;
    persistent?: boolean;
    dismissible?: boolean;
    actionRequired?: boolean;
    actionUrl?: string;
  },
  io?: IO,
): Promise<void> {
  const saved = await prisma.notification.create({
    data: {
      playerId,
      type: notification.type,
      category: notification.category,
      title: notification.title,
      message: notification.message,
      persistent: notification.persistent ?? false,
      dismissible: notification.dismissible ?? true,
      actionRequired: notification.actionRequired ?? false,
      actionUrl: notification.actionUrl ?? null,
    },
  });

  if (io) {
    io.to(`player:${playerId}`).emit('notification', {
      id: saved.id,
      playerId: saved.playerId,
      type: saved.type as 'info' | 'warning' | 'success' | 'error',
      category: saved.category,
      title: saved.title,
      message: saved.message,
      persistent: saved.persistent,
      actionRequired: saved.actionRequired,
    });
  }
}

// ─── sendSystemMessage ────────────────────────────────────────────────────────

/**
 * Send a system chat message to all players in a game session.
 * System messages are styled differently in the UI (gray italic).
 */
export async function sendSystemMessage(
  sessionId: string,
  content: string,
  io?: IO,
): Promise<void> {
  const saved = await prisma.message.create({
    data: {
      gameSessionId: sessionId,
      playerId: null,
      playerName: 'System',
      content,
      isSystemMessage: true,
      reactions: [],
    },
  });

  if (io) {
    io.to(`game:${sessionId}`).emit('messageReceived', {
      id: saved.id,
      gameSessionId: saved.gameSessionId,
      playerId: '',
      playerName: 'System',
      content: saved.content,
      timestamp: saved.createdAt.toISOString(),
      reactions: [],
      isSystemMessage: true,
    });
  }
}

// ─── handlePlayerDeath ────────────────────────────────────────────────────────

/**
 * Handle a player's death:
 *  1. Mark player as deceased (isAlive = false)
 *  2. Emit `playerDied` to the player's socket and the session room
 *  3. Send a system chat message
 *  4. Recalculate pitcher goal (living players only)
 *  5. Check if ALL players are now dead → end game
 *
 * Requirements: Req 16.7–16.9
 */
export async function handlePlayerDeath(
  playerId: string,
  sessionId: string,
  io: IO,
): Promise<void> {
  // 1. Mark deceased
  const deceased = await prisma.player.update({
    where: { id: playerId },
    data: { isAlive: false },
    select: { id: true, name: true, age: true, gameSessionId: true },
  });

  // 2. Emit playerDied to the session room
  io.to(`game:${sessionId}`).emit('playerDied', {
    playerId: deceased.id,
    playerName: deceased.name,
    age: deceased.age,
  });

  // Also emit playerStateChanged so clients update their UI
  io.to(`game:${sessionId}`).emit('playerStateChanged', {
    playerId: deceased.id,
    changes: { isAlive: false },
  });

  // 3. System chat message
  await sendSystemMessage(
    sessionId,
    `💀 ${deceased.name} has passed away at age ${deceased.age}. Their contributions to the community will be remembered.`,
    io,
  );

  // 4. Recalculate pitcher goal (living players only)
  await recalculatePitcherGoal(sessionId);

  // 5. Check if all players are now dead → end game
  const livingCount = await prisma.player.count({
    where: { gameSessionId: sessionId, isAlive: true },
  });

  if (livingCount === 0) {
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: 'ended', endReason: 'all_deceased' },
    });

    io.to(`game:${sessionId}`).emit('gameEnded', {
      reason: 'all_deceased',
      finalStats: { message: 'All players have passed away.' },
    });
  }
}

// ─── calculatePensionPayment ──────────────────────────────────────────────────

/**
 * Calculate annual pension payment for a retired player.
 * Formula: pensionPercentage * baseSalary * yearsOfService
 * (pensionPercentage is stored as a decimal, e.g. 0.02 = 2%)
 *
 * Requirements: Req 38
 */
export function calculatePensionPayment(
  pensionPercentage: number,
  baseSalary: number,
  yearsOfService: number,
): number {
  return pensionPercentage * baseSalary * yearsOfService;
}

// ─── checkAdoptionAvailability ────────────────────────────────────────────────

export async function checkAdoptionAvailability(sessionId: string, io?: IO): Promise<void> {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  const pendingApplications = await prisma.adoptionApplication.findMany({
    where: {
      status: 'pending',
      availableYear: { lte: session.currentYear },
      player: { gameSessionId: sessionId },
    },
    include: { player: true },
  });

  for (const app of pendingApplications) {
    await prisma.adoptionApplication.update({
      where: { id: app.id },
      data: { status: 'available' },
    });

    await sendNotification(
      app.playerId,
      {
        type: 'success',
        category: 'family',
        title: 'Adoption Available',
        message: 'A child is available for adoption!',
        persistent: true,
        actionRequired: true,
      },
      io,
    );
  }
}

// ─── lemonsForAge (pitcher goal helper) ──────────────────────────────────────

function lemonsForAge(age: number): number {
  if (age < 20) return 0;
  if (age <= 22) return 10;
  if (age <= 30) return 20;
  if (age <= 50) return 40;
  if (age <= 65) return 60;
  return 80;
}

// ─── startNewYear ─────────────────────────────────────────────────────────────

export async function startNewYear(sessionId: string, io: IO): Promise<void> {
  // 1. Fetch session
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error(`Session ${sessionId} not found`);

  // 2. Fetch all living players with relations
  const players = await prisma.player.findMany({
    where: { gameSessionId: sessionId, isAlive: true },
    include: {
      employments: { where: { isActive: true }, include: { job: true } },
      educations: { where: { isActive: true }, include: { program: true } },
      children: true,
      pets: true,
      adoptionApplications: { where: { status: 'pending' } },
    },
  });

  // 3. Generate inflation rates once for this year (same rates apply to all players)
  const currentInflationRates = (session.inflationRates as unknown) as InflationRates[];
  const newRates = generateInflationRates(session.currentYear + 1);
  const updatedInflationRates = [...currentInflationRates, newRates];

  // 4. Process each player
  for (const player of players) {
    const traits = player.traits as Record<string, number>;
    const skills = player.skills as Record<string, number>;

    // a. Increment age
    const newAge = player.age + 1;

    // b. Aging health loss (semi-permanent — reduces current health only, maxHealth unchanged)
    const healthLossPct = agingHealthLoss(newAge);
    const healthLoss = (healthLossPct / 100) * player.maxHealth;
    const newMaxHealth = Math.max(0, player.maxHealth - healthLoss);
    const newHealth = Math.max(0, Math.min(player.health - healthLoss, newMaxHealth));

    // c. Reset stress
    const newStress = 0;

    // d. Retirement check — mark player retired at 65 (Req 15.5)
    const isNowRetired = player.isRetired || newAge >= 65;

    // e. Auto-retire spouse at 65 (Req 15.8)
    const spouse = player.spouse as Record<string, unknown> | null;
    let updatedSpouse = spouse;
    if (spouse && typeof spouse.age === 'number' && !spouse.isRetired) {
      const spouseNewAge = (spouse.age as number) + 1;
      if (spouseNewAge >= 65) {
        updatedSpouse = { ...spouse, age: spouseNewAge, isRetired: true };
        // Notify player that spouse has retired
        await sendNotification(
          player.id,
          {
            type: 'info',
            category: 'family',
            title: 'Spouse Retired',
            message: `Your spouse has turned ${spouseNewAge} and is now retired.`,
            persistent: true,
          },
          io,
        );
      } else {
        updatedSpouse = { ...spouse, age: spouseNewAge };
        // Notify player when spouse is approaching retirement (age 64)
        if (spouseNewAge === 64) {
          await sendNotification(
            player.id,
            {
              type: 'info',
              category: 'family',
              title: 'Spouse Approaching Retirement',
              message: 'Your spouse will retire next year at age 65.',
              persistent: false,
            },
            io,
          );
        }
        else if (spouseNewAge === 60) {
          await sendNotification(
            player.id,
            {
              type: 'info',
              category: 'family',
              title: 'Spouse Approaching Retirement',
              message: 'Your spouse will retire at age 65.',
              persistent: false,
            },
            io,
          );
        }
      }
    } else if (spouse && typeof spouse.age === 'number') {
      updatedSpouse = { ...spouse, age: (spouse.age as number) + 1 };
    }

    // e2. Spouse CPR auto-renewal — charge $75 every 2 years if spouse has CPR cert
    const CPR_RENEWAL_COST = 75;
    const CPR_RENEWAL_INTERVAL = 2;
    let spouseCprCharge = 0;
    if (updatedSpouse && Array.isArray(updatedSpouse.certifications) && (updatedSpouse.certifications as string[]).includes('CPR')) {
      const spouseCprYear = (updatedSpouse as Record<string, unknown>).spouseCprYear as number | undefined;
      if (spouseCprYear === undefined || (session.currentYear + 1 - spouseCprYear) >= CPR_RENEWAL_INTERVAL) {
        spouseCprCharge = CPR_RENEWAL_COST;
        updatedSpouse = { ...updatedSpouse, spouseCprYear: session.currentYear + 1 };
        await sendNotification(
          player.id,
          {
            type: 'info',
            category: 'certification',
            title: 'Spouse CPR Certification Auto-Renewed',
            message: `Your spouse's CPR certification has been automatically renewed ($${CPR_RENEWAL_COST}).`,
          },
          io,
        );
      }
    }

    // f. Notify player when they reach retirement age (Req 15.5)
    if (!player.isRetired && newAge === 65) {
      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'year',
          title: 'You Are Now Retired!',
          message:
            'You have reached age 65. Your retirement savings are now accessible without penalty. You may continue working if you choose.',
          persistent: true,
        },
        io,
      );
    }

    // g. Pension payments for retired players with pension-eligible jobs (Req 38)
    let pensionIncome = 0;
    if (isNowRetired) {
      for (const employment of player.employments) {
        const job = employment.job;
        if (job.hasPension && job.pensionPercentage && employment.yearsOfService > 0) {
          const payment = calculatePensionPayment(
            job.pensionPercentage,
            job.baseSalary,
            employment.yearsOfService,
          );
          pensionIncome += payment;
        }
      }
    }

    // h. Process job raises for each active employment
    const employmentUpdates: Array<{
      id: string;
      currentSalary: number;
      yearsOfService: number;
      consecutiveMissedRaiseYears: number;
      isActive: boolean;
      endReason: string | null;
      endAge: number | null;
      ptoRemaining: number;
      ptoUsed: number;
      unpaidTimeOffRemaining: number;
    }> = [];

    for (const employment of player.employments) {
      const job = employment.job;
      const raiseSchedule = job.raiseSchedule as Array<{ years: number; percentage: number }>;
      const org = traits.organization ?? 0;
      const comm = traits.communication ?? 0;

      let currentSalary = employment.currentSalary;
      let consecutiveMissedRaiseYears = employment.consecutiveMissedRaiseYears;
      let isActive = employment.isActive;
      let endReason: string | null = employment.endReason;
      let endAge: number | null = employment.endAge;

      // Check if this year's service matches a raise milestone
      const milestone = raiseSchedule.find((r) => r.years === employment.yearsOfService);

      if (milestone) {
        const meetsRaiseReqs = org >= 25 && comm >= 25;
        if (meetsRaiseReqs) {
          // Apply raise
          currentSalary = currentSalary * (1 + milestone.percentage / 100);
          consecutiveMissedRaiseYears = 0;
        } else {
          // Withhold raise
          consecutiveMissedRaiseYears += 1;
          if (consecutiveMissedRaiseYears >= 2) {
            // Fire the player
            isActive = false;
            endReason = 'fired_performance';
            endAge = newAge;
          }
        }
      } else {
        // Not a milestone year — still check org/comm for consecutive tracking
        const meetsReqs = org >= 25 && comm >= 25;
        if (!meetsReqs) {
          consecutiveMissedRaiseYears += 1;
          if (consecutiveMissedRaiseYears >= 2) {
            isActive = false;
            endReason = 'fired_performance';
            endAge = newAge;
          }
        } else {
          consecutiveMissedRaiseYears = 0;
        }
      }

      // PTO accrual: add base PTO + milestone bonus (every 10 years of service)
      // Only full-time jobs with ptoTimeBlocks > 0 accrue PTO
      const newYearsOfService = employment.yearsOfService + 1;
      let newPtoRemaining = employment.ptoRemaining;
      if (!employment.isPartTime && job.ptoTimeBlocks > 0) {
        const accrual = calculatePTOAccrual(newYearsOfService, job.ptoTimeBlocks);
        newPtoRemaining += accrual;
      }

      // Reset ptoUsed for the new year (PTO itself carries over, but "used this year" resets)
      const newPtoUsed = 0;

      // Reset unpaid time off to job's base value for the new year
      const newUnpaidTimeOff = job.unpaidTimeOff ?? 0;

      employmentUpdates.push({
        id: employment.id,
        currentSalary,
        yearsOfService: newYearsOfService,
        consecutiveMissedRaiseYears,
        isActive,
        endReason,
        endAge,
        ptoRemaining: newPtoRemaining,
        ptoUsed: newPtoUsed,
        unpaidTimeOffRemaining: newUnpaidTimeOff,
      });
    }

    // Apply internship job pay reduction if player did internship this year
    // Reduce salary payment by 25% for this year (applied as a deduction at year-end)
    const didInternship = (player as unknown as { didInternshipThisYear: boolean })
      .didInternshipThisYear ?? false;
    let internshipPayDeduction = 0;
    if (didInternship && player.employments.length > 0) {
      for (const employment of player.employments) {
        const normalSalary = employment.currentSalary;
        const reducedSalary = calculateInternshipJobPayReduction(normalSalary);
        internshipPayDeduction += normalSalary - reducedSalary;
      }
    }

    // e. Apply job annual skill/trait gains
    const newSkills = { ...skills };
    const newTraits = { ...traits };

    for (const employment of player.employments) {
      const annualGains = employment.job.annualGains as {
        skills?: Record<string, number>;
        traits?: Record<string, number>;
      };
      if (annualGains.skills) {
        for (const [skill, gain] of Object.entries(annualGains.skills)) {
          newSkills[skill] = Math.min(100, (newSkills[skill] ?? 0) + gain);
        }
      }
      if (annualGains.traits) {
        for (const [trait, gain] of Object.entries(annualGains.traits)) {
          newTraits[trait] = Math.min(100, (newTraits[trait] ?? 0) + gain);
        }
      }
    }

    // f. Process annual education progress — grant skills, advance credits, check graduation
    const educationUpdates: Array<{
      id: string;
      creditsCompleted: { generalEducation: number; field: number; major: number };
      graduated: boolean;
      graduationAge: number | null;
      isActive: boolean;
      clearScholarships: boolean;
    }> = [];

    for (const edu of player.educations) {
      const program = edu.program as unknown as EduProgramRow;
      const credits = edu.creditsCompleted as { generalEducation: number; field: number; major: number };

      // Grant annual skill gains
      const gains = calculateAnnualSkillGains(program, edu.isPartTime);
      for (const [skill, gain] of Object.entries(gains)) {
        if (skill in newSkills) {
          newSkills[skill] = Math.min(100, (newSkills[skill] ?? 0) + gain);
        } else {
          newTraits[skill] = Math.min(100, (newTraits[skill] ?? 0) + gain);
        }
      }

      // Advance credits: each year of enrollment earns 1 credit in the next unfilled category
      // Order: gen ed → field → major
      let newCredits = { ...credits };
      const required = program.totalCredits;

      if (newCredits.generalEducation < required.generalEducation) {
        newCredits.generalEducation += 1;
      } else if (newCredits.field < required.field) {
        newCredits.field += 1;
      } else if (newCredits.major < required.major) {
        newCredits.major += 1;
      }

      // Check graduation
      const gradCheck = checkGraduationRequirements(program, newCredits, newSkills, newTraits);
      let graduated = edu.graduated;
      let graduationAge: number | null = edu.graduationAge;
      let isActive = edu.isActive;

      let clearScholarships = false;
      if (!graduated && gradCheck.canGraduate) {
        graduated = true;
        graduationAge = newAge;
        isActive = false;
        clearScholarships = true; // surplus scholarship money goes away on graduation

        // Grant certifications from graduation
        if (program.grantsOnGraduation && program.grantsOnGraduation.length > 0) {
          const existingCerts = (player.certifications as string[]) ?? [];
          const newCerts = [...new Set([...existingCerts, ...program.grantsOnGraduation])];
          await prisma.player.update({
            where: { id: player.id },
            data: { certifications: newCerts },
          });
        }

        await sendNotification(
          player.id,
          {
            type: 'success',
            category: 'education',
            title: 'Congratulations, Graduate!',
            message: `You graduated from ${program.name}! Time to update your job search.`,
          },
          io,
        );
      }

      educationUpdates.push({
        id: edu.id,
        creditsCompleted: newCredits,
        graduated,
        graduationAge,
        isActive,
        clearScholarships,
      });
    }

    // g. Age children — increment age; notify if turns 18
    const childUpdates: Array<{ id: string; age: number }> = [];
    for (const child of player.children) {
      const newChildAge = child.age + 1;
      childUpdates.push({ id: child.id, age: newChildAge });
      if (newChildAge === 18) {
        await sendNotification(
          player.id,
          {
            type: 'info',
            category: 'family',
            title: 'Child Turns 18',
            message: `One of your children has turned 18 and is now an adult!`,
          },
          io,
        );
      }
    }

    // g. Age pets — 50% death chance in death age range
    const petUpdates: Array<{ id: string; age: number; isAlive: boolean }> = [];
    for (const pet of player.pets) {
      if (!pet.isAlive) continue;
      const newPetAge = pet.age + 1;
      let isAlive = true;
      if (newPetAge >= pet.deathAgeMin && newPetAge <= pet.deathAgeMax) {
        if (Math.random() < 0.5) {
          isAlive = false;
          await sendNotification(
            player.id,
            {
              type: 'warning',
              category: 'family',
              title: 'Pet Passed Away',
              message: `Your ${pet.type} pet has passed away at age ${newPetAge}.`,
            },
            io,
          );
        }
      }
      petUpdates.push({ id: pet.id, age: newPetAge, isAlive });
    }

    // Grant annual lemons for pet ownership (2 lemons per alive pet after death rolls)
    const alivePetsAfterRolls = petUpdates.filter((p) => p.isAlive).length;
    const petLemons = calculatePetLemons(alivePetsAfterRolls);

    if (petLemons > 0) {
      const sessionForPitcher = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        select: { pitcherCurrentLemons: true, pitcherContributionsByPlayer: true },
      });
      if (sessionForPitcher) {
        const contributions = (sessionForPitcher.pitcherContributionsByPlayer ?? {}) as Record<string, number>;
        contributions[player.id] = (contributions[player.id] ?? 0) + petLemons;
        await prisma.$transaction([
          prisma.player.update({
            where: { id: player.id },
            data: { totalLemonsEarned: { increment: petLemons } },
          }),
          prisma.gameSession.update({
            where: { id: sessionId },
            data: {
              pitcherCurrentLemons: { increment: petLemons },
              pitcherContributionsByPlayer: contributions,
            },
          }),
        ]);
      }
    }

    // h. Roll for grandchildren (children aged 25-40)
    const eligibleChildren = player.children.filter((c: { age: number; id: string; childrenCount: number; hasChildren: boolean }) => c.age >= 25 && c.age <= 40);
    const eligibleCount = eligibleChildren.length;
    if (eligibleCount > 0) {
      const roll = Math.floor(Math.random() * 5) + 1; // 1-5
      if (roll <= eligibleCount) {
        // Pick a random eligible child
        const luckyChild = eligibleChildren[Math.floor(Math.random() * eligibleChildren.length)];
        if (luckyChild) {
          await prisma.child.update({
            where: { id: luckyChild.id },
            data: {
              childrenCount: luckyChild.childrenCount + 1,
              hasChildren: true,
            },
          });
          await sendNotification(
            player.id,
            {
              type: 'success',
              category: 'family',
              title: 'You Have a Grandchild!',
              message: 'Congratulations! One of your children has welcomed a new baby.',
            },
            io,
          );
        }
      }
    }

    // i. Annual marriage compatibility + trait gains (married players only)
    if (player.maritalStatus === 'married') {
      const compat = await prisma.marriageCompatibility.findUnique({
        where: { playerId: player.id },
      });

      if (compat) {
        const debtStressHistory = (compat.debtStressHistory as boolean[]) ?? [];
        const familyActionHistory = (compat.familyActionHistory as number[]) ?? [];

        // Count family actions done this year from action history
        const familyActionsThisYear = await prisma.actionHistory.findMany({
          where: {
            playerId: player.id,
            year: session.currentYear,
            action: { category: { array_contains: 'family' } },
          },
        });
        const familyActionCount = familyActionsThisYear.reduce((sum, ah) => sum + ah.count, 0);

        // Determine if player had debt stress this year (any outstanding loans)
        const loans = await prisma.loan.findMany({ where: { playerId: player.id } });
        const hadDebtStress = loans.length > 0 && loans.some((l) => l.currentBalance > 0);

        // Update rolling histories (keep last 2 years)
        const newDebtStressHistory = [...debtStressHistory, hadDebtStress].slice(-2);
        const newFamilyActionHistory = [...familyActionHistory, familyActionCount].slice(-2);

        const hasKidsUnder18 = player.children.some((c) => c.age < 18);

        const compatScore = calculateMarriageCompatibility({
          year: session.currentYear,
          debtStressHistory: newDebtStressHistory,
          familyActionHistory: newFamilyActionHistory,
          hasKidsUnder18,
          currentStress: newStress,
          compassion: newTraits.compassion ?? 0,
          patience: newTraits.patience ?? 0,
          stressTolerance: newTraits.stressTolerance ?? 0,
          communication: newTraits.communication ?? 0,
        });

        const yearlyScores = (compat.yearlyScores as Record<number, number>) ?? {};
        yearlyScores[session.currentYear] = compatScore;

        // Apply annual trait gains from marriage
        const compatRecord: MarriageCompatibilityRecord = {
          currentScore: compatScore,
          yearlyScores,
          debtStressHistory: newDebtStressHistory,
          familyActionHistory: newFamilyActionHistory,
          totalYearsMarried: compat.totalYearsMarried,
          communicationGained: compat.communicationGained,
          compassionGained: compat.compassionGained,
          patienceGained: compat.patienceGained,
        };

        const traitGainResult = applyMarriageTraitGains(
          {
            communication: newTraits.communication ?? 0,
            compassion: newTraits.compassion ?? 0,
            patience: newTraits.patience ?? 0,
          },
          compatRecord,
        );

        // Apply trait gains back to newTraits
        newTraits.communication = traitGainResult.communication;
        newTraits.compassion = traitGainResult.compassion;
        newTraits.patience = traitGainResult.patience;

        // Persist compatibility record
        await prisma.marriageCompatibility.update({
          where: { playerId: player.id },
          data: {
            currentScore: traitGainResult.updatedCompat.currentScore,
            yearlyScores: traitGainResult.updatedCompat.yearlyScores as any,
            debtStressHistory: traitGainResult.updatedCompat.debtStressHistory as any,
            familyActionHistory: traitGainResult.updatedCompat.familyActionHistory as any,
            totalYearsMarried: traitGainResult.updatedCompat.totalYearsMarried,
            communicationGained: traitGainResult.updatedCompat.communicationGained,
            compassionGained: traitGainResult.updatedCompat.compassionGained,
            patienceGained: traitGainResult.updatedCompat.patienceGained,
          },
        });
      }
    }

    // k. Send birthday notification
    await sendNotification(
      player.id,
      {
        type: 'success',
        category: 'year',
        title: `Happy Birthday!`,
        message: `You are now ${newAge} years old!`,
      },
      io,
    );

    // Persist all player updates
    await prisma.$transaction(async (tx) => {
      // Update player
      await tx.player.update({
        where: { id: player.id },
        data: {
          age: newAge,
          health: newHealth,
          maxHealth: newMaxHealth,
          stress: newStress,
          skills: newSkills,
          traits: newTraits,
          isRetired: isNowRetired,
          // Update spouse age and retirement status
          ...(updatedSpouse !== spouse
            ? { spouse: (updatedSpouse ?? Prisma.JsonNull) as Prisma.InputJsonValue }
            : {}),
          // Add pension income, deduct spouse CPR renewal charge, deduct internship pay reduction
          ...(pensionIncome > 0 || spouseCprCharge > 0 || internshipPayDeduction > 0
            ? { money: { increment: pensionIncome - spouseCprCharge - internshipPayDeduction } }
            : {}),
          yearComplete: false,
          cardsReceivedThisYear: 0,
          // Reset internship flag for the new year
          ...({ didInternshipThisYear: false } as Record<string, unknown>),
        } as Parameters<typeof tx.player.update>[0]['data'],
      });

      // Update employments
      for (const eu of employmentUpdates) {
        await tx.employment.update({
          where: { id: eu.id },
          data: {
            currentSalary: eu.currentSalary,
            yearsOfService: eu.yearsOfService,
            consecutiveMissedRaiseYears: eu.consecutiveMissedRaiseYears,
            isActive: eu.isActive,
            endReason: eu.endReason,
            endAge: eu.endAge,
            ptoRemaining: eu.ptoRemaining,
            unpaidTimeOffRemaining: eu.unpaidTimeOffRemaining,
            ...({ ptoUsed: eu.ptoUsed } as Record<string, unknown>),
          } as Parameters<typeof tx.employment.update>[0]['data'],
        });
      }

      // Update education progress
      for (const eu of educationUpdates) {
        await tx.education.update({
          where: { id: eu.id },
          data: {
            creditsCompleted: eu.creditsCompleted,
            graduated: eu.graduated,
            graduationAge: eu.graduationAge,
            isActive: eu.isActive,
            // Clear surplus scholarship money on graduation — can't use it after graduating
            ...(eu.clearScholarships ? { scholarships: [] } : {}),
          },
        });
      }

      // Update children ages
      for (const cu of childUpdates) {
        await tx.child.update({ where: { id: cu.id }, data: { age: cu.age } });
      }

      // Update pets
      for (const pu of petUpdates) {
        await tx.pet.update({ where: { id: pu.id }, data: { age: pu.age, isAlive: pu.isAlive } });
      }
    });

    // Death probability check — 20% chance of dying when health <= 5% (Req 16.6)
    // Run after the transaction so the updated health is persisted first.
    if (newHealth <= 5 && Math.random() < 0.2) {
      await handlePlayerDeath(player.id, sessionId, io);
      // Skip further per-player processing — player is now deceased
      continue;
    }

    // Notify player of pension income if any
    if (pensionIncome > 0) {
      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'year',
          title: 'Pension Payment Received',
          message: `You received $${pensionIncome.toLocaleString()} in pension income this year.`,
        },
        io,
      );
    }

    // Notify player of internship pay reduction if applicable
    if (didInternship && internshipPayDeduction > 0) {
      await sendNotification(
        player.id,
        {
          type: 'info',
          category: 'job',
          title: 'Internship Pay Reduction Applied',
          message: `Your job pay was reduced by $${internshipPayDeduction.toLocaleString()} (25%) this year due to your internship.`,
        },
        io,
      );
    }
  }

  // 5. Apply inflation — catalog-wide first, then per-player salaries
  await applyGlobalCatalogInflation(newRates);
  for (const player of players) {
    await applyInflation(player.id, newRates);
  }

  // 6. Update tax brackets every 5 years
  let taxBrackets = (session.taxBrackets as unknown) as TaxBracket[];
  const nextYear = session.currentYear + 1;
  if (nextYear % 5 === 0 && taxBrackets.length > 0) {
    taxBrackets = taxBrackets.map((bracket, index) => ({
      ...bracket,
      minIncome: index === 0 ? 0 : bracket.minIncome + 15000,
      maxIncome: bracket.maxIncome !== null ? bracket.maxIncome + 15000 : null,
    }));
  }

  // 7. Check adoption availability
  await checkAdoptionAvailability(sessionId, io);

  // 8. Increment session.currentYear + update inflation/tax
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      currentYear: nextYear,
      inflationRates: updatedInflationRates as any,
      taxBrackets: taxBrackets as any,
    },
  });

  // 8b. Check pitcher year-end — apply grace year or end game if goal missed
  const pitcherResult = await checkYearEndPitcher(sessionId);
  if (pitcherResult === 'ended') {
    // Game ended due to pitcher failure — stop processing
    return;
  }

  // 9. Recalculate pitcher yearly goal based on new player ages
  const updatedPlayers = await prisma.player.findMany({
    where: { gameSessionId: sessionId, isAlive: true },
    select: { id: true, age: true, health: true, maxHealth: true, stress: true, isAlive: true, isRetired: true, yearComplete: true, totalLemonsEarned: true, money: true },
  });

  const newGoal = updatedPlayers.reduce((sum: number, p: { age: number }) => sum + lemonsForAge(p.age), 0);
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { pitcherYearlyGoal: newGoal },
  });

  // 10. Broadcast yearStarted event
  const playerAges: Record<string, number> = {};
  for (const p of updatedPlayers) {
    playerAges[p.id] = p.age;
  }

  io.to(`game:${sessionId}`).emit('yearStarted', {
    year: nextYear,
    gameSessionId: sessionId,
    playerAges,
  });

  // 11. Broadcast playerStateChanged for each player
  for (const p of updatedPlayers) {
    io.to(`game:${sessionId}`).emit('playerStateChanged', {
      playerId: p.id,
      changes: {
        age: p.age,
        health: p.health,
        maxHealth: p.maxHealth,
        stress: p.stress,
        isAlive: p.isAlive,
        isRetired: p.isRetired,
        yearComplete: p.yearComplete,
        totalLemonsEarned: p.totalLemonsEarned,
        money: p.money,
      },
    });
  }
}
