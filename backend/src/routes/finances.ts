/**
 * Financial Management API
 *
 * GET  /api/finances/:playerId        — full financial summary
 * POST /api/finances/loan             — create loan (auto-loan if can't afford min payment)
 * POST /api/finances/loan/payment     — pay down loans
 * POST /api/finances/retirement       — contribute to retirement savings
 * POST /api/finances/retirement/withdraw — withdraw from retirement (10% penalty if age < 65)
 * GET  /api/finances/expenses         — calculate all mandatory expenses
 * POST /api/finances/pay-expenses     — pay expenses and mark year complete
 * GET  /api/finances/forecast         — project next year expenses vs funds
 * POST /api/finances/college-fund     — contribute to college fund (1 lemon per 1%)
 *
 * Requirements: Req 6, Req 18, Req 28, Req 29, Req 37, Req 38
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { getIO } from '../socket';
import { sendNotification } from '../lib/yearCycle';
import {
  calculateTaxes,
  calculateTaxPreparationFee,
  applyLoanInterest,
  applyRetirementInterest,
  calculateExpenseForecast,
  type TaxBracket,
} from '../lib/financials';
import { calculateAnnualVehicleCosts, type VehicleRow } from '../lib/vehicles';
import { calculateAnnualHousingCosts, type HousingRow, type HomeImprovement } from '../lib/housing';
import { CHILDCARE_COSTS } from '../lib/timeBlocks';
import { getJobBenefits } from '../lib/jobs';

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpouseData {
  jobId?: string | null;
  isJobPartTime?: boolean;
  hasAccountingExperience?: boolean;
  salary?: number;
  loans?: Array<{ id: string; currentBalance: number; interestRate: number; owner: string; isJoint: boolean }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FullPlayer = NonNullable<Awaited<ReturnType<typeof fetchFullPlayer>>>;

async function fetchFullPlayer(userId: string, gameSessionId: string) {
  return prisma.player.findUnique({
    where: { userId_gameSessionId: { userId, gameSessionId } },
    include: {
      loans: true,
      children: true,
      pets: { where: { isAlive: true } },
      employments: { where: { isActive: true }, include: { job: true } },
      educations: { where: { isActive: true }, include: { program: true } },
      housingOwnerships: {
        where: { endAge: null },
        include: { housing: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      vehicleOwnerships: {
        where: { endAge: null },
        include: { vehicle: true },
      },
      retirementHistory: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
}

/** Count household members: player + spouse (if married) + kids under 18 */
function countHousehold(player: FullPlayer): number {
  const kidsUnder18 = player.children.filter((c) => c.age < 18).length;
  const spouseCount = player.maritalStatus === 'married' ? 1 : 0;
  return 1 + spouseCount + kidsUnder18;
}

/** Check if player or spouse has accounting experience (waives tax prep fee) */
function hasAccountingExperience(player: FullPlayer): boolean {
  const playerHas = player.employments.some((e) => {
    const benefits = getJobBenefits(e.job.benefits, e.job);
    return benefits.waivesTaxPrepFee;
  });
  if (playerHas) return true;
  const spouse = player.spouse as SpouseData | null;
  return spouse?.hasAccountingExperience ?? false;
}

/** Get total taxable income: player salary + spouse salary (if married) */
function getTaxableIncome(player: FullPlayer): number {
  const playerSalary = player.projectedIncome;
  const spouse = player.spouse as SpouseData | null;
  const spouseSalary = player.maritalStatus === 'married' ? (spouse?.salary ?? 0) : 0;
  return playerSalary + spouseSalary;
}

/** Calculate health insurance cost */
function calculateHealthInsuranceCost(player: FullPlayer): number {
  if (!player.hasHealthInsurance) return 0;
  // Free on parents' insurance until age 26
  if (player.age < 26) return 0;

  const kidsUnder18 = player.children.filter((c) => c.age < 18).length;

  if (player.healthInsuranceType === 'family') {
    // $12k/yr + $1k/child + $450/yr age increase
    return 12000 + kidsUnder18 * 1000 + player.age * 450;
  }
  // Single: $6k/yr + $300/yr age increase
  return 6000 + player.age * 300;
}

/** Calculate annual pet expenses */
function calculatePetExpenses(player: FullPlayer): number {
  // Check if player has vet fee waiver (veterinarian job benefit)
  const hasVetWaiver = player.employments.some((e) => {
    const benefits = getJobBenefits(e.job.benefits, e.job);
    return benefits.vetFeeWaiver;
  });

  let total = 0;
  for (const pet of player.pets) {
    if (pet.type === 'small') {
      total += 300; // food
      if (!hasVetWaiver) total += 75; // vet
    } else {
      total += 500; // food
      if (!hasVetWaiver) total += 1000; // vet
    }
  }
  return total;
}

/** Calculate grocery cost */
function calculateGroceries(player: FullPlayer): number {
  const kidsUnder18 = player.children.filter((c) => c.age < 18).length;
  const spouseCount = player.maritalStatus === 'married' ? 1 : 0;
  const householdSize = 1 + spouseCount + kidsUnder18;

  // Bulk discount at 3+ people: $2400/person vs $3000/person
  const ratePerPerson = householdSize >= 3 ? 2400 : 3000;
  return ratePerPerson * householdSize;
}

/** Calculate chronic condition costs */
function calculateChronicConditionCosts(player: FullPlayer): number {
  const conditions = (player.chronicConditions as string[]) ?? [];
  if (conditions.length === 0) return 0;
  const costPerCondition = player.hasHealthInsurance ? 3000 : 5000;
  return conditions.length * costPerCondition;
}

/** Calculate annual tuition */
function calculateTuition(player: FullPlayer): number {
  let total = 0;
  for (const edu of player.educations) {
    const program = edu.program;
    const tuition = edu.isPartTime
      ? (program.tuitionPartTime ?? program.tuitionFullTime * 0.5)
      : program.tuitionFullTime;
    total += tuition;
  }
  return total;
}

/** Calculate childcare costs */
function calculateChildcareCosts(player: FullPlayer): number {
  const plan = (player as unknown as { childcarePlan: string }).childcarePlan as keyof typeof CHILDCARE_COSTS;
  if (!plan || plan === 'none') return 0;
  const kidsUnder18 = player.children.filter((c) => c.age < 18).length;
  return CHILDCARE_COSTS[plan] * kidsUnder18;
}

/** Calculate all mandatory expenses for a player */
async function calculateMandatoryExpenses(
  player: FullPlayer,
  session: { taxBrackets: unknown; currentYear: number },
): Promise<{
  housing: number;
  transportation: number;
  healthInsurance: number;
  childcare: number;
  childExpenses: number;
  petExpenses: number;
  groceries: number;
  miscellaneous: number;
  chronicConditions: number;
  tuition: number;
  taxPrepFee: number;
  taxes: number;
  loanMinPayments: number;
  total: number;
  breakdown: Record<string, number>;
}> {
  // Housing
  let housingCost = 0;
  const currentOwnership = player.housingOwnerships[0];
  if (currentOwnership) {
    const housing = currentOwnership.housing as unknown as HousingRow;
    const improvements = (currentOwnership.improvements as unknown as HomeImprovement[]) ?? [];
    const occupants = countHousehold(player);
    const housingResult = calculateAnnualHousingCosts({
      housing,
      occupants,
      isRental: currentOwnership.isRental,
      hasHomeInsurance: player.hasHomeInsurance,
      improvements,
    });
    housingCost = housingResult.total;
  }

  // Transportation
  let transportationCost = 0;
  for (const vo of player.vehicleOwnerships) {
    const vehicle = vo.vehicle as unknown as VehicleRow;
    const isMechanic = player.employments.some((e) => {
      const b = getJobBenefits(e.job.benefits, e.job);
      return b.autoMaintenanceDiscountPct > 0;
    });
    const costs = calculateAnnualVehicleCosts(vehicle, vo.yearsOwned, isMechanic);
    transportationCost += costs.total;
  }

  // Health insurance
  const healthInsurance = calculateHealthInsuranceCost(player);

  // Childcare
  const childcare = calculateChildcareCosts(player);

  // Child expenses ($11k/child under 18)
  const kidsUnder18 = player.children.filter((c) => c.age < 18).length;
  const childExpenses = kidsUnder18 * 11000;

  // Pet expenses
  const petExpenses = calculatePetExpenses(player);

  // Groceries
  const groceries = calculateGroceries(player);

  // Miscellaneous ($1200/person: player + spouse)
  const spouseCount = player.maritalStatus === 'married' ? 1 : 0;
  const miscellaneous = (1 + spouseCount) * 1200;

  // Chronic conditions
  const chronicConditions = calculateChronicConditionCosts(player);

  // Tuition
  const tuition = calculateTuition(player);

  // Taxes
  const taxBrackets = (session.taxBrackets as unknown as TaxBracket[]) ?? [];
  const income = getTaxableIncome(player);
  const filingStatus = player.maritalStatus === 'married' ? 'married' : 'single';
  const taxResult = calculateTaxes({ income, filingStatus, taxBrackets });
  const taxes = taxResult.totalTax;

  // Tax prep fee
  const jobCount = player.employments.length;
  const hasLoans = player.loans.length > 0;
  const taxPrepFee = calculateTaxPreparationFee({
    age: player.age,
    filingStatus,
    income,
    hasLoans,
    jobCount,
    hasAccountingExperience: hasAccountingExperience(player),
  });

  // Loan minimum payments (5% of balance after 8% interest)
  const loanResults = applyLoanInterest(
    player.loans.map((l) => ({
      id: l.id,
      currentBalance: l.currentBalance,
      interestRate: l.interestRate,
      owner: l.owner,
      isJoint: l.isJoint,
    })),
  );
  const loanMinPayments = loanResults.reduce((sum, l) => sum + l.minimumPayment, 0);

  const total =
    housingCost +
    transportationCost +
    healthInsurance +
    childcare +
    childExpenses +
    petExpenses +
    groceries +
    miscellaneous +
    chronicConditions +
    tuition +
    taxPrepFee +
    taxes +
    loanMinPayments;

  return {
    housing: housingCost,
    transportation: transportationCost,
    healthInsurance,
    childcare,
    childExpenses,
    petExpenses,
    groceries,
    miscellaneous,
    chronicConditions,
    tuition,
    taxPrepFee,
    taxes,
    loanMinPayments,
    total,
    breakdown: {
      housing: housingCost,
      transportation: transportationCost,
      healthInsurance,
      childcare,
      childExpenses,
      petExpenses,
      groceries,
      miscellaneous,
      chronicConditions,
      tuition,
      taxPrepFee,
      taxes,
      loanMinPayments,
    },
  };
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const gameSessionSchema = z.object({ gameSessionId: z.string().min(1) });

const loanSchema = z.object({
  gameSessionId: z.string().min(1),
  amount: z.number().positive(),
});

const loanPaymentSchema = z.object({
  gameSessionId: z.string().min(1),
  payments: z.array(
    z.object({
      loanId: z.string().min(1),
      amount: z.number().positive(),
    }),
  ).min(1),
});

const retirementContributeSchema = z.object({
  gameSessionId: z.string().min(1),
  amount: z.number().positive(),
});

const retirementWithdrawSchema = z.object({
  gameSessionId: z.string().min(1),
  amount: z.number().positive(),
});

const payExpensesSchema = z.object({
  gameSessionId: z.string().min(1),
  fromMoney: z.number().min(0),
  fromRetirement: z.number().min(0),
});

const collegeFundSchema = z.object({
  gameSessionId: z.string().min(1),
  amount: z.number().positive(),
});

// ─── GET /api/finances/:playerId ──────────────────────────────────────────────

router.get('/:playerId', authorize, async (req: Request, res: Response): Promise<void> => {
  const { playerId } = req.params;
  const gameSessionId = req.query.gameSessionId as string | undefined;

  if (!gameSessionId) {
    res.status(400).json({ error: 'gameSessionId query parameter is required' });
    return;
  }

  try {
    // Verify the requesting user owns this player
    const player = await prisma.player.findFirst({
      where: { id: playerId, userId: req.user!.userId, gameSessionId },
      include: {
        loans: true,
        children: true,
        pets: { where: { isAlive: true } },
        employments: { where: { isActive: true }, include: { job: true } },
        educations: { where: { isActive: true }, include: { program: true } },
        housingOwnerships: {
          where: { endAge: null },
          include: { housing: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        vehicleOwnerships: {
          where: { endAge: null },
          include: { vehicle: true },
        },
        retirementHistory: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    const session = await prisma.gameSession.findUnique({
      where: { id: gameSessionId },
      select: { taxBrackets: true, currentYear: true },
    });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const expenses = await calculateMandatoryExpenses(player as unknown as FullPlayer, session);

    // Loan details with interest applied
    const loanResults = applyLoanInterest(
      player.loans.map((l) => ({
        id: l.id,
        currentBalance: l.currentBalance,
        interestRate: l.interestRate,
        owner: l.owner,
        isJoint: l.isJoint,
      })),
    );

    const loansWithDetails = player.loans.map((loan) => {
      const result = loanResults.find((r) => r.id === loan.id);
      return {
        ...loan,
        projectedBalance: result?.newBalance ?? loan.currentBalance,
        interestThisYear: result?.interestCharged ?? 0,
        minimumPayment: result?.minimumPayment ?? 0,
      };
    });

    res.json({
      money: player.money,
      projectedIncome: player.projectedIncome,
      retirementSavings: player.retirementSavings,
      collegeFund: player.collegeFund,
      loans: loansWithDetails,
      retirementHistory: player.retirementHistory,
      mandatoryExpenses: expenses,
      availableFunds: player.money + player.projectedIncome,
      yearComplete: player.yearComplete,
    });
  } catch (err) {
    console.error('[finances/summary]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/finances/loan ──────────────────────────────────────────────────

router.post(
  '/loan',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = loanSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, amount } = result.data;
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

      const loan = await prisma.loan.create({
        data: {
          playerId: player.id,
          principal: amount,
          currentBalance: amount,
          interestRate: 0.08,
          minimumPayment: amount * 0.05,
          originAge: player.age,
          isJoint: player.maritalStatus === 'married',
          owner: 'player',
        },
      });

      // Add loan amount to player money
      await prisma.player.update({
        where: { id: player.id },
        data: { money: { increment: amount } },
      });

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { money: player.money + amount },
      });

      await sendNotification(
        player.id,
        {
          type: 'warning',
          category: 'finances',
          title: 'Loan Created',
          message: `You took out a loan of $${amount.toLocaleString()}. Interest rate: 8%/yr, minimum payment: 5%/yr.`,
        },
        getIO(),
      );

      res.status(201).json({ loan, newMoney: player.money + amount });
    } catch (err) {
      console.error('[finances/loan]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/finances/loan/payment ─────────────────────────────────────────

router.post(
  '/loan/payment',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = loanPaymentSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, payments } = result.data;
    const player = req.player!;

    try {
      // Fetch all player loans
      const loans = await prisma.loan.findMany({ where: { playerId: player.id } });

      // Validate all loan IDs belong to this player
      for (const payment of payments) {
        const loan = loans.find((l) => l.id === payment.loanId);
        if (!loan) {
          res.status(404).json({ error: `Loan ${payment.loanId} not found` });
          return;
        }
        if (payment.amount > loan.currentBalance) {
          res.status(400).json({
            error: `Payment of $${payment.amount} exceeds loan balance of $${loan.currentBalance}`,
          });
          return;
        }
      }

      const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);

      if (totalPayment > player.money) {
        res.status(400).json({
          error: `Insufficient funds. Total payment $${totalPayment.toLocaleString()} exceeds available money $${player.money.toLocaleString()}`,
        });
        return;
      }

      // Apply payments in a transaction
      const updatedLoans = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const payment of payments) {
          const loan = loans.find((l) => l.id === payment.loanId)!;
          const newBalance = loan.currentBalance - payment.amount;
          if (newBalance <= 0) {
            // Loan fully paid off — delete it
            await tx.loan.delete({ where: { id: payment.loanId } });
            results.push({ loanId: payment.loanId, paid: true, newBalance: 0 });
          } else {
            const updated = await tx.loan.update({
              where: { id: payment.loanId },
              data: {
                currentBalance: newBalance,
                minimumPayment: newBalance * 0.05,
              },
            });
            results.push({ loanId: payment.loanId, paid: false, newBalance: updated.currentBalance });
          }
        }

        await tx.player.update({
          where: { id: player.id },
          data: { money: { decrement: totalPayment } },
        });

        return results;
      });

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { money: player.money - totalPayment },
      });

      res.json({ payments: updatedLoans, totalPaid: totalPayment, newMoney: player.money - totalPayment });
    } catch (err) {
      console.error('[finances/loan/payment]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/finances/retirement ───────────────────────────────────────────

router.post(
  '/retirement',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = retirementContributeSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, amount } = result.data;
    const player = req.player!;

    try {
      if (amount > player.money) {
        res.status(400).json({
          error: `Insufficient funds. Cannot contribute $${amount.toLocaleString()} from $${player.money.toLocaleString()}`,
        });
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

      const newRetirementBalance = player.retirementSavings + amount;

      await prisma.$transaction(async (tx) => {
        await tx.player.update({
          where: { id: player.id },
          data: {
            money: { decrement: amount },
            retirementSavings: { increment: amount },
          },
        });

        await tx.retirementTransaction.create({
          data: {
            playerId: player.id,
            year: session.currentYear,
            age: player.age,
            type: 'contribution',
            amount,
            balanceAfter: newRetirementBalance,
            reason: 'Voluntary contribution',
          },
        });
      });

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { money: player.money - amount, retirementSavings: newRetirementBalance },
      });

      res.json({
        contributed: amount,
        newRetirementBalance,
        newMoney: player.money - amount,
      });
    } catch (err) {
      console.error('[finances/retirement]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/finances/retirement/withdraw ───────────────────────────────────

router.post(
  '/retirement/withdraw',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = retirementWithdrawSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, amount } = result.data;
    const player = req.player!;

    try {
      if (amount > player.retirementSavings) {
        res.status(400).json({
          error: `Insufficient retirement savings. Cannot withdraw $${amount.toLocaleString()} from $${player.retirementSavings.toLocaleString()}`,
        });
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

      const isEarlyWithdrawal = player.age < 65;
      const penaltyAmount = isEarlyWithdrawal ? amount * 0.1 : 0;
      const newRetirementBalance = player.retirementSavings - amount;

      await prisma.$transaction(async (tx) => {
        await tx.player.update({
          where: { id: player.id },
          data: {
            money: { increment: amount },
            retirementSavings: { decrement: amount },
          },
        });

        await tx.retirementTransaction.create({
          data: {
            playerId: player.id,
            year: session.currentYear,
            age: player.age,
            type: 'withdrawal',
            amount,
            balanceAfter: newRetirementBalance,
            reason: isEarlyWithdrawal ? 'Early withdrawal (penalty applies next year)' : 'Retirement withdrawal',
          },
        });

        // Record penalty transaction if early withdrawal
        if (isEarlyWithdrawal) {
          await tx.retirementTransaction.create({
            data: {
              playerId: player.id,
              year: session.currentYear + 1,
              age: player.age + 1,
              type: 'penalty',
              amount: penaltyAmount,
              balanceAfter: newRetirementBalance,
              reason: `10% early withdrawal penalty on $${amount.toLocaleString()} withdrawn at age ${player.age}`,
            },
          });
        }
      });

      if (isEarlyWithdrawal) {
        await sendNotification(
          player.id,
          {
            type: 'warning',
            category: 'finances',
            title: 'Early Withdrawal Penalty',
            message: `You withdrew $${amount.toLocaleString()} from retirement before age 65. A 10% penalty of $${penaltyAmount.toLocaleString()} will be charged next year.`,
            persistent: true,
          },
          getIO(),
        );
      }

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { money: player.money + amount, retirementSavings: newRetirementBalance },
      });

      res.json({
        withdrawn: amount,
        newRetirementBalance,
        newMoney: player.money + amount,
        isEarlyWithdrawal,
        penaltyNextYear: penaltyAmount,
      });
    } catch (err) {
      console.error('[finances/retirement/withdraw]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── GET /api/finances/expenses ──────────────────────────────────────────────

router.get('/expenses', authorize, async (req: Request, res: Response): Promise<void> => {
  const result = gameSessionSchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid query' });
    return;
  }

  const { gameSessionId } = result.data;

  try {
    const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
    if (!player) {
      res.status(404).json({ error: 'Player not found in this session' });
      return;
    }

    const session = await prisma.gameSession.findUnique({
      where: { id: gameSessionId },
      select: { taxBrackets: true, currentYear: true },
    });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const expenses = await calculateMandatoryExpenses(player, session);

    // Check for pending early withdrawal penalties
    const pendingPenalties = await prisma.retirementTransaction.findMany({
      where: {
        playerId: player.id,
        type: 'penalty',
        year: session.currentYear,
      },
    });
    const pendingPenaltyTotal = pendingPenalties.reduce((sum, p) => sum + p.amount, 0);

    const availableFunds = player.money + player.projectedIncome;
    const canAfford = availableFunds + player.retirementSavings >= expenses.total + pendingPenaltyTotal;

    res.json({
      expenses: expenses.breakdown,
      total: expenses.total,
      pendingPenalties: pendingPenaltyTotal,
      grandTotal: expenses.total + pendingPenaltyTotal,
      availableFunds,
      retirementSavings: player.retirementSavings,
      canAfford,
      yearComplete: player.yearComplete,
    });
  } catch (err) {
    console.error('[finances/expenses]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/finances/pay-expenses ─────────────────────────────────────────

router.post(
  '/pay-expenses',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = payExpensesSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, fromMoney, fromRetirement } = result.data;
    const player = req.player!;

    try {
      if (player.yearComplete) {
        res.status(400).json({ error: 'Year expenses already paid' });
        return;
      }

      const fullPlayer = await fetchFullPlayer(req.user!.userId, gameSessionId);
      if (!fullPlayer) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { taxBrackets: true, currentYear: true },
      });
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const expenses = await calculateMandatoryExpenses(fullPlayer, session);

      // Check for pending penalties from prior early withdrawals
      const pendingPenalties = await prisma.retirementTransaction.findMany({
        where: { playerId: player.id, type: 'penalty', year: session.currentYear },
      });
      const pendingPenaltyTotal = pendingPenalties.reduce((sum, p) => sum + p.amount, 0);
      const grandTotal = expenses.total + pendingPenaltyTotal;

      const totalAllocated = fromMoney + fromRetirement;

      if (totalAllocated < grandTotal) {
        res.status(400).json({
          error: `Insufficient allocation. Need $${grandTotal.toLocaleString()}, allocated $${totalAllocated.toLocaleString()}`,
          required: grandTotal,
          allocated: totalAllocated,
          shortfall: grandTotal - totalAllocated,
        });
        return;
      }

      // Validate player has enough in each source
      const availableMoney = player.money + player.projectedIncome;
      if (fromMoney > availableMoney) {
        res.status(400).json({
          error: `Cannot pay $${fromMoney.toLocaleString()} from money — only $${availableMoney.toLocaleString()} available`,
        });
        return;
      }

      if (fromRetirement > player.retirementSavings) {
        res.status(400).json({
          error: `Cannot pay $${fromRetirement.toLocaleString()} from retirement — only $${player.retirementSavings.toLocaleString()} available`,
        });
        return;
      }

      // Check if using retirement early (age < 65)
      const isEarlyRetirementUse = fromRetirement > 0 && player.age < 65;
      const earlyPenalty = isEarlyRetirementUse ? fromRetirement * 0.1 : 0;

      // Apply loan interest and update balances
      const loanResults = applyLoanInterest(
        fullPlayer.loans.map((l) => ({
          id: l.id,
          currentBalance: l.currentBalance,
          interestRate: l.interestRate,
          owner: l.owner,
          isJoint: l.isJoint,
        })),
      );

      await prisma.$transaction(async (tx) => {
        // Deduct from money (money + projectedIncome combined)
        const newMoney = Math.max(0, player.money + player.projectedIncome - fromMoney);
        const newRetirement = player.retirementSavings - fromRetirement;

        await tx.player.update({
          where: { id: player.id },
          data: {
            money: newMoney,
            projectedIncome: 0, // income consumed
            retirementSavings: newRetirement,
            yearComplete: true,
          },
        });

        // Apply loan interest to all loans
        for (const loanResult of loanResults) {
          await tx.loan.update({
            where: { id: loanResult.id },
            data: {
              currentBalance: loanResult.newBalance,
              minimumPayment: loanResult.minimumPayment,
            },
          });
        }

        // Record retirement withdrawal if used
        if (fromRetirement > 0) {
          await tx.retirementTransaction.create({
            data: {
              playerId: player.id,
              year: session.currentYear,
              age: player.age,
              type: 'withdrawal',
              amount: fromRetirement,
              balanceAfter: newRetirement,
              reason: 'Expense payment from retirement savings',
            },
          });

          // Record penalty for next year if early
          if (isEarlyRetirementUse) {
            await tx.retirementTransaction.create({
              data: {
                playerId: player.id,
                year: session.currentYear + 1,
                age: player.age + 1,
                type: 'penalty',
                amount: earlyPenalty,
                balanceAfter: newRetirement,
                reason: `10% early withdrawal penalty on $${fromRetirement.toLocaleString()} used for expenses`,
              },
            });
          }
        }

        // Auto-loan if minimum loan payments can't be covered (handled above in total)
        // Check if player needs auto-loan for minimum payments
        const minPaymentsTotal = loanResults.reduce((sum, l) => sum + l.minimumPayment, 0);
        if (minPaymentsTotal > 0 && availableMoney < minPaymentsTotal) {
          const autoLoanAmount = minPaymentsTotal - availableMoney;
          await tx.loan.create({
            data: {
              playerId: player.id,
              principal: autoLoanAmount,
              currentBalance: autoLoanAmount,
              interestRate: 0.08,
              minimumPayment: autoLoanAmount * 0.05,
              originAge: player.age,
              isJoint: player.maritalStatus === 'married',
              owner: 'player',
            },
          });
        }
      });

      if (isEarlyRetirementUse) {
        await sendNotification(
          player.id,
          {
            type: 'warning',
            category: 'finances',
            title: 'Early Retirement Withdrawal',
            message: `Used $${fromRetirement.toLocaleString()} from retirement savings before age 65. A 10% penalty of $${earlyPenalty.toLocaleString()} will be charged next year.`,
            persistent: true,
          },
          getIO(),
        );
      }

      const updatedPlayer = await prisma.player.findUnique({
        where: { id: player.id },
        select: { money: true, retirementSavings: true, yearComplete: true },
      });

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: {
          money: updatedPlayer?.money ?? 0,
          retirementSavings: updatedPlayer?.retirementSavings ?? 0,
          yearComplete: true,
        },
      });

      res.json({
        yearComplete: true,
        paidFromMoney: fromMoney,
        paidFromRetirement: fromRetirement,
        totalPaid: grandTotal,
        earlyWithdrawalPenaltyNextYear: earlyPenalty,
        newMoney: updatedPlayer?.money ?? 0,
        newRetirementSavings: updatedPlayer?.retirementSavings ?? 0,
      });
    } catch (err) {
      console.error('[finances/pay-expenses]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── GET /api/finances/forecast ──────────────────────────────────────────────

router.get('/forecast', authorize, async (req: Request, res: Response): Promise<void> => {
  const result = gameSessionSchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid query' });
    return;
  }

  const { gameSessionId } = result.data;

  try {
    const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
    if (!player) {
      res.status(404).json({ error: 'Player not found in this session' });
      return;
    }

    const session = await prisma.gameSession.findUnique({
      where: { id: gameSessionId },
      select: { taxBrackets: true, currentYear: true, inflationRates: true },
    });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Estimate next year expenses using current data as a proxy
    const expenses = await calculateMandatoryExpenses(player, session);

    // Check for pending penalties next year
    const pendingPenalties = await prisma.retirementTransaction.findMany({
      where: {
        playerId: player.id,
        type: 'penalty',
        year: session.currentYear + 1,
      },
    });
    const pendingPenaltyTotal = pendingPenalties.reduce((sum, p) => sum + p.amount, 0);

    const forecast = calculateExpenseForecast({
      currentMoney: player.money,
      projectedIncome: player.projectedIncome,
      retirementSavings: player.retirementSavings,
      mandatoryExpenses: expenses.total,
      pendingRetirementPenalty: pendingPenaltyTotal,
    });

    // Apply retirement interest projection
    const retirementInterestResult = applyRetirementInterest({
      playerId: player.id,
      currentBalance: player.retirementSavings,
      year: session.currentYear + 1,
      age: player.age + 1,
    });

    res.json({
      currentMoney: player.money,
      projectedIncome: player.projectedIncome,
      projectedRetirementBalance: retirementInterestResult.newBalance,
      retirementInterestNextYear: retirementInterestResult.interestEarned,
      estimatedExpenses: expenses.breakdown,
      estimatedTotal: expenses.total,
      pendingPenalties: pendingPenaltyTotal,
      forecast,
    });
  } catch (err) {
    console.error('[finances/forecast]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/finances/college-fund ─────────────────────────────────────────

router.post(
  '/college-fund',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = collegeFundSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, amount } = result.data;
    const player = req.player!;

    try {
      // Fetch children to check eligibility (can't contribute once last kid reaches 22)
      const children = await prisma.child.findMany({ where: { playerId: player.id } });
      const hasEligibleChild = children.some((c) => c.age < 22);

      if (!hasEligibleChild) {
        res.status(400).json({
          error: 'Cannot contribute to college fund — no children under age 22',
        });
        return;
      }

      if (amount > player.money) {
        res.status(400).json({
          error: `Insufficient funds. Cannot contribute $${amount.toLocaleString()} from $${player.money.toLocaleString()}`,
        });
        return;
      }

      // 1 lemon per 1% of current money contributed
      const percentOfMoney = (amount / player.money) * 100;
      const lemonsEarned = Math.floor(percentOfMoney);

      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: {
          pitcherCurrentLemons: true,
          pitcherYearlyGoal: true,
          pitcherContributionsByPlayer: true,
          pitcherGraceYearUsed: true,
        },
      });
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.player.update({
          where: { id: player.id },
          data: {
            money: { decrement: amount },
            collegeFund: { increment: amount },
            ...(lemonsEarned > 0 ? { totalLemonsEarned: { increment: lemonsEarned } } : {}),
          },
        });

        if (lemonsEarned > 0) {
          const contributions = (session.pitcherContributionsByPlayer as Record<string, number>) ?? {};
          contributions[player.id] = (contributions[player.id] ?? 0) + lemonsEarned;

          await tx.gameSession.update({
            where: { id: gameSessionId },
            data: {
              pitcherCurrentLemons: { increment: lemonsEarned },
              pitcherContributionsByPlayer: contributions,
            },
          });
        }
      });

      const io = getIO();

      if (lemonsEarned > 0) {
        const updatedSession = await prisma.gameSession.findUnique({
          where: { id: gameSessionId },
          select: {
            pitcherCurrentLemons: true,
            pitcherYearlyGoal: true,
            pitcherGraceYearUsed: true,
            pitcherContributionsByPlayer: true,
          },
        });

        io.to(`game:${gameSessionId}`).emit('lemonAdded', {
          playerId: player.id,
          lemonsAdded: lemonsEarned,
          totalLemons: updatedSession?.pitcherCurrentLemons ?? 0,
          pitcherGoal: updatedSession?.pitcherYearlyGoal ?? 0,
        });

        io.to(`game:${gameSessionId}`).emit('pitcherUpdated', {
          currentLemons: updatedSession?.pitcherCurrentLemons ?? 0,
          yearlyGoal: updatedSession?.pitcherYearlyGoal ?? 0,
          graceYearUsed: updatedSession?.pitcherGraceYearUsed ?? false,
          contributionsByPlayer: (updatedSession?.pitcherContributionsByPlayer as Record<string, number>) ?? {},
        });
      }

      io.to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { money: player.money - amount },
      });

      res.json({
        contributed: amount,
        newCollegeFund: player.collegeFund + amount,
        newMoney: player.money - amount,
        lemonsEarned,
        percentContributed: percentOfMoney,
      });
    } catch (err) {
      console.error('[finances/college-fund]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
