/**
 * Education System Routes
 *
 * GET  /api/education/programs         — catalog with filters + sort
 * GET  /api/education/programs/search  — search by name
 * POST /api/education/enroll           — enroll in a program
 * POST /api/education/scholarships     — apply for scholarship
 * POST /api/education/change-major     — change major (switch program)
 * POST /api/education/drop             — drop out of current program
 *
 * Requirements: Req 10, Req 33
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { getIO } from '../socket';
import { sendNotification } from '../lib/yearCycle';
import {
  checkEduEligibility,
  isCCToBachelorsSameMajor,
  getCCShortcutCredits,
  checkScholarshipEligibility,
  EduProgramRow,
  PlayerForEduEligibility,
} from '../lib/education';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FullPlayer = NonNullable<Awaited<ReturnType<typeof fetchFullPlayer>>>;

async function fetchFullPlayer(userId: string, gameSessionId: string) {
  return prisma.player.findUnique({
    where: { userId_gameSessionId: { userId, gameSessionId } },
    include: {
      educations: { include: { program: true } },
      employments: { include: { job: true } },
    },
  });
}

function buildEligibilityPlayer(player: FullPlayer): PlayerForEduEligibility {
  return {
    age: player.age,
    health: player.health,
    skills: player.skills as Record<string, number>,
    traits: player.traits as Record<string, number>,
    certifications: player.certifications,
    educations: player.educations.map((e) => ({
      programId: e.programId,
      isActive: e.isActive,
      graduated: e.graduated,
      program: { field: e.program.field, type: e.program.type },
    })),
    employments: player.employments.map((e) => ({
      isActive: e.isActive,
      yearsOfService: e.yearsOfService,
      isPartTime: e.isPartTime,
      job: { title: e.job.title },
    })),
  };
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const listProgramsSchema = z.object({
  gameSessionId: z.string().min(1),
  type: z.string().optional(),
  field: z.string().optional(),
  isStem: z.coerce.boolean().optional(),
  partTimeOnly: z.coerce.boolean().optional(),
  maxTuition: z.coerce.number().optional(),
  eligibleOnly: z.coerce.boolean().optional(),
  sort: z.enum(['tuition_asc', 'tuition_desc', 'name_asc', 'duration_asc']).optional(),
});

const enrollSchema = z.object({
  gameSessionId: z.string().min(1),
  programId: z.string().min(1),
  partTime: z.boolean().optional().default(false),
});

const scholarshipSchema = z.object({
  gameSessionId: z.string().min(1),
});

const changeMajorSchema = z.object({
  gameSessionId: z.string().min(1),
  newProgramId: z.string().min(1),
  partTime: z.boolean().optional(),
});

const dropSchema = z.object({
  gameSessionId: z.string().min(1),
});

// ─── GET /api/education/programs ─────────────────────────────────────────────

router.get('/programs', authorize, async (req: Request, res: Response): Promise<void> => {
  const result = listProgramsSchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid query' });
    return;
  }

  const { gameSessionId, type, field, isStem, partTimeOnly, maxTuition, eligibleOnly, sort } =
    result.data;

  try {
    const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
    if (!player) {
      res.status(404).json({ error: 'Player not found in this session' });
      return;
    }

    const allPrograms = (await prisma.educationProgram.findMany()) as unknown as EduProgramRow[];
    const eligPlayer = buildEligibilityPlayer(player);

    let programs = allPrograms;

    // ── Filters ───────────────────────────────────────────────────────────────

    if (type) {
      programs = programs.filter((p) => p.type === type);
    }
    if (field) {
      programs = programs.filter((p) => p.field.toLowerCase().includes(field.toLowerCase()));
    }
    if (isStem !== undefined) {
      programs = programs.filter((p) => p.isStem === isStem);
    }
    if (partTimeOnly) {
      programs = programs.filter((p) => p.partTimeAllowed);
    }
    if (maxTuition !== undefined) {
      programs = programs.filter((p) => p.tuitionFullTime <= maxTuition);
    }

    // ── Annotate with eligibility ─────────────────────────────────────────────

    const annotated = programs.map((p) => {
      const eligResult = checkEduEligibility(p, eligPlayer);
      const isShortcut = isCCToBachelorsSameMajor(p, eligPlayer.educations);

      // Effective duration in years
      let durationFT = p.totalCredits.generalEducation + p.totalCredits.field + p.totalCredits.major;
      if (durationFT === 0) durationFT = 1; // vocational/certificate = 1 credit = 1 year
      const durationPT = p.partTimeAllowed ? durationFT * 2 : null;

      // CC shortcut: only 2 major credits needed
      const shortcutDuration = isShortcut ? p.totalCredits.major : null;

      const alreadyEnrolled = player.educations.some((e) => e.programId === p.id && e.isActive);
      const alreadyGraduated = player.educations.some((e) => e.programId === p.id && e.graduated);

      return {
        ...p,
        eligible: eligResult.eligible,
        eligibilityReasons: eligResult.reasons,
        durationFT,
        durationPT,
        isShortcut,
        shortcutDuration,
        alreadyEnrolled,
        alreadyGraduated,
      };
    });

    const filtered = eligibleOnly ? annotated.filter((p) => p.eligible) : annotated;

    // ── Sort ──────────────────────────────────────────────────────────────────

    if (sort) {
      filtered.sort((a, b) => {
        switch (sort) {
          case 'tuition_asc':    return a.tuitionFullTime - b.tuitionFullTime;
          case 'tuition_desc':   return b.tuitionFullTime - a.tuitionFullTime;
          case 'name_asc':       return a.name.localeCompare(b.name);
          case 'duration_asc':   return a.durationFT - b.durationFT;
          default:               return 0;
        }
      });
    }

    res.json({ programs: filtered });
  } catch (err) {
    console.error('[education/programs]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/education/programs/search ──────────────────────────────────────

router.get('/programs/search', authorize, async (req: Request, res: Response): Promise<void> => {
  const q = (req.query.q as string | undefined)?.trim();
  const gameSessionId = req.query.gameSessionId as string | undefined;

  if (!q) {
    res.status(400).json({ error: 'q query parameter is required' });
    return;
  }

  try {
    const dbPrograms = await prisma.educationProgram.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
    });

    const programs = dbPrograms as unknown as EduProgramRow[];

    if (gameSessionId && req.user) {
      const player = await fetchFullPlayer(req.user.userId, gameSessionId);
      if (player) {
        const eligPlayer = buildEligibilityPlayer(player);
        const annotated = programs.map((p) => {
          const eligResult = checkEduEligibility(p, eligPlayer);
          return {
            ...p,
            eligible: eligResult.eligible,
            eligibilityReasons: eligResult.reasons,
            isShortcut: isCCToBachelorsSameMajor(p, eligPlayer.educations),
            alreadyEnrolled: player.educations.some((e) => e.programId === p.id && e.isActive),
            alreadyGraduated: player.educations.some((e) => e.programId === p.id && e.graduated),
          };
        });
        res.json({ programs: annotated });
        return;
      }
    }

    res.json({ programs });
  } catch (err) {
    console.error('[education/search]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/education/enroll ───────────────────────────────────────────────

router.post(
  '/enroll',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = enrollSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, programId, partTime } = result.data;

    try {
      const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      const program = await prisma.educationProgram.findUnique({
        where: { id: programId },
      }) as unknown as EduProgramRow | null;

      if (!program) {
        res.status(404).json({ error: 'Education program not found' });
        return;
      }

      // Part-time validation
      if (partTime && !program.partTimeAllowed) {
        res.status(400).json({ error: 'This program does not offer part-time enrollment' });
        return;
      }

      // Eligibility check
      const eligPlayer = buildEligibilityPlayer(player);
      const eligResult = checkEduEligibility(program, eligPlayer);
      if (!eligResult.eligible) {
        res.status(400).json({ error: 'Requirements not met', reasons: eligResult.reasons });
        return;
      }

      // Determine starting credits (CC→Bachelors shortcut)
      const isShortcut = isCCToBachelorsSameMajor(program, eligPlayer.educations);
      const startingCredits = isShortcut
        ? getCCShortcutCredits(program)
        : { generalEducation: 0, field: 0, major: 0 };

      // Create education record
      const education = await prisma.education.create({
        data: {
          playerId: player.id,
          programId,
          isPartTime: partTime,
          startAge: player.age,
          creditsCompleted: startingCredits as unknown as Record<string, number>,
          isActive: true,
          graduated: false,
          parentContributionUsed: 0,
          scholarships: [],
        },
      });

      // Notify player
      const shortcutNote = isShortcut
        ? ' (CC shortcut applied — 2-year accelerated path)'
        : '';
      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'education',
          title: 'Enrolled',
          message: `You are now enrolled in ${program.name} (${partTime ? 'part-time' : 'full-time'})${shortcutNote}`,
        },
        getIO(),
      );

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { programId } as Record<string, unknown>,
      });

      res.status(201).json({
        education,
        isShortcut,
        startingCredits,
      });
    } catch (err) {
      console.error('[education/enroll]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/education/scholarships ────────────────────────────────────────

router.post(
  '/scholarships',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = scholarshipSchema.safeParse(req.body);
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

      // Must be actively enrolled
      const activeEdu = player.educations.find((e) => e.isActive);
      if (!activeEdu) {
        res.status(400).json({ error: 'You must be enrolled in a program to apply for scholarships' });
        return;
      }

      // Check if already applied this year (once per year per Req 10.10)
      const scholarships = (activeEdu.scholarships as Array<{ year: number; amount: number }>) ?? [];
      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { currentYear: true },
      });
      const currentYear = session?.currentYear ?? 0;

      const alreadyAppliedThisYear = scholarships.some((s) => s.year === currentYear);
      if (alreadyAppliedThisYear) {
        res.status(400).json({ error: 'You have already applied for a scholarship this year' });
        return;
      }

      const playerSkills = player.skills as Record<string, number>;
      const playerTraits = player.traits as Record<string, number>;

      const awardAmount = checkScholarshipEligibility(playerSkills, playerTraits);

      if (awardAmount === 0) {
        // Don't reveal criteria — just say no award
        res.json({ awarded: false, amount: 0 });
        return;
      }

      // Record scholarship (surplus rolls over until graduation)
      const updatedScholarships = [...scholarships, { year: currentYear, amount: awardAmount }];

      await prisma.education.update({
        where: { id: activeEdu.id },
        data: { scholarships: updatedScholarships },
      });

      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'education',
          title: 'Scholarship Awarded',
          message: `You received a $${awardAmount.toLocaleString()} scholarship! Surplus rolls over each year until graduation.`,
        },
        getIO(),
      );

      res.json({ awarded: true, amount: awardAmount });
    } catch (err) {
      console.error('[education/scholarships]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/education/change-major ────────────────────────────────────────

router.post(
  '/change-major',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = changeMajorSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, newProgramId, partTime } = result.data;

    try {
      const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      const activeEdu = player.educations.find((e) => e.isActive);
      if (!activeEdu) {
        res.status(400).json({ error: 'You are not currently enrolled in any program' });
        return;
      }

      if (activeEdu.programId === newProgramId) {
        res.status(400).json({ error: 'You are already enrolled in this program' });
        return;
      }

      const newProgram = await prisma.educationProgram.findUnique({
        where: { id: newProgramId },
      }) as unknown as EduProgramRow | null;

      if (!newProgram) {
        res.status(404).json({ error: 'New program not found' });
        return;
      }

      // Must be same degree type to change major
      if (newProgram.type !== activeEdu.program.type) {
        res.status(400).json({
          error: `Cannot change from ${activeEdu.program.type} to ${newProgram.type} — drop out and re-enroll instead`,
        });
        return;
      }

      // Eligibility check for new program
      const eligPlayer = buildEligibilityPlayer(player);
      const eligResult = checkEduEligibility(newProgram, eligPlayer);
      if (!eligResult.eligible) {
        res.status(400).json({ error: 'Requirements not met for new program', reasons: eligResult.reasons });
        return;
      }

      const oldCredits = activeEdu.creditsCompleted as {
        generalEducation: number;
        field: number;
        major: number;
      };

      // Credit transfer rules:
      // - Gen Ed always transfers
      // - Field credits transfer if same field
      // - Major credits never transfer
      const sameField =
        activeEdu.program.field.toLowerCase() === newProgram.field.toLowerCase();

      const newCredits = {
        generalEducation: oldCredits.generalEducation, // always transfers
        field: sameField ? oldCredits.field : 0,       // transfers if same field
        major: 0,                                       // never transfers
      };

      const isNewPartTime = partTime ?? activeEdu.isPartTime;

      if (isNewPartTime && !newProgram.partTimeAllowed) {
        res.status(400).json({ error: 'New program does not offer part-time enrollment' });
        return;
      }

      await prisma.education.update({
        where: { id: activeEdu.id },
        data: {
          programId: newProgramId,
          isPartTime: isNewPartTime,
          creditsCompleted: newCredits,
          scholarships: [], // scholarships reset on major change
        },
      });

      await sendNotification(
        player.id,
        {
          type: 'info',
          category: 'education',
          title: 'Major Changed',
          message: `You switched to ${newProgram.name}. ${sameField ? 'Field credits transferred.' : 'Field credits reset (different field).'}`,
        },
        getIO(),
      );

      res.json({
        success: true,
        newCredits,
        sameField,
      });
    } catch (err) {
      console.error('[education/change-major]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/education/drop ─────────────────────────────────────────────────

router.post(
  '/drop',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = dropSchema.safeParse(req.body);
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

      const activeEdu = player.educations.find((e) => e.isActive);
      if (!activeEdu) {
        res.status(400).json({ error: 'You are not currently enrolled in any program' });
        return;
      }

      // Mark as inactive (preserve credits for potential re-enrollment within 5 years)
      await prisma.education.update({
        where: { id: activeEdu.id },
        data: {
          isActive: false,
          scholarships: [], // surplus scholarship money goes away on drop
        },
      });

      await sendNotification(
        player.id,
        {
          type: 'warning',
          category: 'education',
          title: 'Dropped Out',
          message: `You dropped out of ${activeEdu.program.name}. Credits are saved for 5 years if you re-enroll in the same program.`,
        },
        getIO(),
      );

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { droppedOut: true } as Record<string, unknown>,
      });

      res.json({ success: true });
    } catch (err) {
      console.error('[education/drop]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
