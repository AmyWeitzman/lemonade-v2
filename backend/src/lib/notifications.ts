/**
 * Notification trigger helpers.
 * Each function calls sendNotification with the appropriate payload.
 *
 * Requirements: Req 21
 */

import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../socket/events';
import { sendNotification } from './yearCycle';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// ─── CPR Expiration ───────────────────────────────────────────────────────────

export async function notifyCprExpiration(playerId: string, io?: IO): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'warning',
      category: 'certification',
      title: 'CPR Certification Expired',
      message: 'Your CPR certification has expired. Renew it or you will not be eligibile for certain jobs and actions that require a CPR certification.',
      persistent: true,
      actionRequired: true,
    },
    io,
  );
}

// ─── Childcare Changes Needed ─────────────────────────────────────────────────

export async function notifyChildcareChangeNeeded(playerId: string, io?: IO): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'warning',
      category: 'family',
      title: 'Childcare Plan Needs Update',
      message: 'Your family situation has changed. Please review and update your childcare plan before completing the year.',
      persistent: true,
      actionRequired: true,
    },
    io,
  );
}

// ─── Spouse Retirement Warning ────────────────────────────────────────────────

export async function notifySpouseRetirementWarning(
  playerId: string,
  spouseAge: number,
  io?: IO,
): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'info',
      category: 'family',
      title: 'Spouse Approaching Retirement',
      message: `Your spouse is ${spouseAge} years old and will retire at age 65.`,
      persistent: false,
    },
    io,
  );
}

// ─── Retirement Savings Penalty-Free ─────────────────────────────────────────

export async function notifyRetirementPenaltyFree(playerId: string, io?: IO): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'success',
      category: 'year',
      title: 'Penalty-Free Retirement Withdrawals',
      message: 'You are now 65! You can withdraw from your retirement savings without the 10% early withdrawal penalty.',
      persistent: true,
    },
    io,
  );
}

// ─── Graduation ───────────────────────────────────────────────────────────────

export async function notifyGraduation(
  playerId: string,
  programName: string,
  io?: IO,
): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'success',
      category: 'education',
      title: 'Congratulations, Graduate!',
      message: `You have graduated from ${programName}! New job opportunities may now be available.`,
      persistent: true,
    },
    io,
  );
}

// ─── Health Too Low for Job ───────────────────────────────────────────────────

export async function notifyHealthTooLowForJob(
  playerId: string,
  jobTitle: string,
  isGraceYear: boolean,
  io?: IO,
): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'warning',
      category: 'job',
      title: isGraceYear ? 'Job Health Warning — Grace Year' : 'Job Terminated: Health Requirements',
      message: isGraceYear
        ? `Your health is too low for your job as ${jobTitle}. It is recommended that you do some actions to improve your health this year. Otherwise, you will be fired next year.`
        : `Your health did not meet the requirements for ${jobTitle}. Your employment has been terminated.`,
      persistent: true,
      actionRequired: !isGraceYear,
    },
    io,
  );
}

// ─── New Year Birthday ────────────────────────────────────────────────────────

export async function notifyBirthday(playerId: string, age: number, io?: IO): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'success',
      category: 'year',
      title: 'Happy Birthday!',
      message: `You are now ${age} years old. A new year of possibilities awaits!`,
    },
    io,
  );
}

// ─── Adoption Available ───────────────────────────────────────────────────────

export async function notifyAdoptionAvailable(playerId: string, io?: IO): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'success',
      category: 'family',
      title: 'Adoption Available',
      message: 'A child is now available for adoption!',
      persistent: true,
      actionRequired: true,
    },
    io,
  );
}

// ─── Adoption Complete ────────────────────────────────────────────────────────

export async function notifyAdoptionComplete(
  playerId: string,
  childAge: number,
  io?: IO,
): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'success',
      category: 'family',
      title: 'Adoption Complete!',
      message: `Congratulations! You have officially adopted a ${childAge}-year-old child. Welcome to the family!`,
      persistent: true,
    },
    io,
  );
}

// ─── Child Turns 18 ───────────────────────────────────────────────────────────

export async function notifyChildTurns18(playerId: string, io?: IO): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'info',
      category: 'family',
      title: 'Child Turns 18',
      message: 'One of your children has turned 18 and is now an adult. Associated costs and time blocks will update accordingly.',
      persistent: false,
    },
    io,
  );
}

// ─── Job Loss ─────────────────────────────────────────────────────────────────

export async function notifyJobLoss(
  playerId: string,
  jobTitle: string,
  reason: 'fired_performance' | 'fired_health' | string,
  io?: IO,
): Promise<void> {
  const reasonText =
    reason === 'fired_performance'
      ? 'due to performance issues with organization or communication'
      : reason === 'fired_health'
        ? 'because your health no longer meets job requirements'
        : 'unexpectedly';

  await sendNotification(
    playerId,
    {
      type: 'error',
      category: 'job',
      title: 'Job Lost',
      message: `You have lost your job as ${jobTitle} ${reasonText}. Consider finding new employment.`,
      persistent: true,
      actionRequired: true,
    },
    io,
  );
}

// ─── Pet Death ────────────────────────────────────────────────────────────────

export async function notifyPetDeath(
  playerId: string,
  petType: string,
  petAge: number,
  io?: IO,
): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'warning',
      category: 'family',
      title: 'Pet Passed Away',
      message: `Your ${petType} pet has passed away at age ${petAge}. They will be missed.`,
    },
    io,
  );
}

// ─── Housing Change Required ──────────────────────────────────────────────────

export async function notifyHousingChangeRequired(
  playerId: string,
  reason: string,
  io?: IO,
): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'warning',
      category: 'housing',
      title: 'Housing Change Required',
      message: reason,
      persistent: true,
      actionRequired: true,
    },
    io,
  );
}

// ─── Transport Change Required ────────────────────────────────────────────────

export async function notifyTransportChangeRequired(
  playerId: string,
  reason: string,
  io?: IO,
): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'warning',
      category: 'vehicle',
      title: 'Transportation Change Required',
      message: reason,
      persistent: true,
      actionRequired: true,
    },
    io,
  );
}

// ─── Pregnancy: Phase 1 — Conception result (same year as "try for child") ────
// Tells the player whether they got pregnant and how many babies to expect.

export type ConceptionOutcome = 'not_pregnant' | 'single' | 'twins' | 'triplets';

export async function notifyConceptionResult(
  playerId: string,
  outcome: ConceptionOutcome,
  io?: IO,
): Promise<void> {
  const messages: Record<ConceptionOutcome, { title: string; message: string; type: 'success' | 'info' }> = {
    not_pregnant: {
      type: 'info',
      title: 'Not Pregnant This Year',
      message: 'You tried for a child but were not successful this year. You may try again if you have time blocks remaining.',
    },
    single: {
      type: 'success',
      title: 'You\'re Expecting!',
      message: 'Congratulations! You are pregnant and expecting one child.',
    },
    twins: {
      type: 'success',
      title: 'You\'re Expecting Twins!',
      message: 'Congratulations! You are pregnant with twins.',
    },
    triplets: {
      type: 'success',
      title: 'You\'re Expecting Triplets!',
      message: 'Congratulations! You are pregnant with triplets.',
    },
  };

  const { title, message, type } = messages[outcome];

  await sendNotification(
    playerId,
    {
      type,
      category: 'family',
      title,
      message,
      persistent: outcome !== 'not_pregnant',
    },
    io,
  );
}

// ─── Pregnancy: Phase 2 — Birth result (start of the following year) ──────────
// Tells the player how many children were born healthy, stillborn, or lost to miscarriage.

export interface BirthResult {
  born: number;       // healthy live births
  stillborn: number;  // stillborn
  miscarried: number; // lost to miscarriage before birth
}

export async function notifyBirthResult(
  playerId: string,
  result: BirthResult,
  io?: IO,
): Promise<void> {
  const { born, stillborn, miscarried } = result;
  const total = born + stillborn + miscarried;

  let type: 'success' | 'info' | 'warning' | 'error';
  let title: string;
  let message: string;

  if (born === total) {
    // All healthy
    type = 'success';
    title = born === 1 ? 'Your Baby Has Arrived!' : `Your ${born === 2 ? 'Twins' : 'Triplets'} Have Arrived!`;
    message = born === 1
      ? 'Congratulations! Your child has been born healthy.'
      : `Congratulations! All ${born} of your children have been born healthy.`;
  } else if (born === 0) {
    // None survived
    type = 'error';
    title = 'Devastating Loss';
    message = miscarried === total
      ? 'We are so sorry. You experienced a miscarriage and none of your babies survived.'
      : stillborn === total
        ? `We are deeply sorry. Your ${total === 1 ? 'baby was' : `${total} babies were`} stillborn.`
        : 'We are deeply sorry. None of your babies survived.';
  } else {
    // Mixed outcome
    type = 'warning';
    title = 'Bittersweet News';
    const lossParts: string[] = [];
    if (stillborn > 0) lossParts.push(`${stillborn} stillborn`);
    if (miscarried > 0) lossParts.push(`${miscarried} lost to miscarriage`);
    message = `${born} of your ${total} babies ${born === 1 ? 'was' : `were`} born healthy. We are deeply sorry for your loss — ${lossParts.join(' and ')}.`;
  }

  await sendNotification(
    playerId,
    { type, category: 'family', title, message, persistent: true },
    io,
  );
}

// ─── Final Year of Education Program ─────────────────────────────────────────
// Fired at the start of a player's last year enrolled, reminding them to use
// education-category actions (internship, study abroad, etc.) before they graduate.

export async function notifyFinalYearOfEducation(
  playerId: string,
  programName: string,
  io?: IO,
): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'info',
      category: 'education',
      title: 'Final Year of School',
      message: `This is your last year enrolled in ${programName}. Make sure to do any of the actions in the Education category that you are interested in before you graduate.`,
      persistent: true,
    },
    io,
  );
}

// ─── Approaching Last Year to Have Children (age 40) ─────────────────────────
// Fired at the start of the year the player turns 40. Biological children require
// age <= 45 and adoption of age 0-2 requires age <= 42, so 40 is the last comfortable
// year to start either path.

export async function notifyApproachingChildDeadline(playerId: string, io?: IO): Promise<void> {
  await sendNotification(
    playerId,
    {
      type: 'warning',
      category: 'family',
      title: 'Approaching Last Years to Have Children',
      message:
        'You are now 40. You are approaching the final years to have children biologically or through adoption. Keep this in mind if starting a family is something you\'re interested in.',
      persistent: true,
    },
    io,
  );
}
