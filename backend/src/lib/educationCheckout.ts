import type { Prisma } from '@prisma/client';
import { checkEduEligibility, getCCShortcutCredits, isCCToBachelorsSameMajor, type EduProgramRow, type PlayerForEduEligibility } from './education';

type Player = Omit<PlayerForEduEligibility, 'skills' | 'traits' | 'educations'> & {
  id: string;
  skills: unknown;
  traits: unknown;
  educations: (PlayerForEduEligibility['educations'][number] & { id: string; isPartTime: boolean; creditsCompleted: unknown })[];
};

export function prepareEducationChange(player: Player, program: EduProgramRow, changeMajor: boolean, partTime?: boolean) {
  const active = player.educations.find((edu) => edu.isActive && !edu.graduated);
  if (changeMajor && !active) return { error: 'You are not currently enrolled in any program.' } as const;
  if (!changeMajor && active) return { error: 'You are already enrolled in a program.' } as const;
  if (changeMajor && program.type !== active?.program.type) return { error: 'Choose a program of the same degree type.' } as const;

  const isPartTime = partTime ?? (changeMajor ? active?.isPartTime : false) ?? false;
  if (isPartTime && !program.partTimeAllowed) return { error: 'This program does not offer part-time enrollment.' } as const;
  const eligibility = checkEduEligibility(program, {
    ...player, skills: player.skills as Record<string, number>, traits: player.traits as Record<string, number>,
  });
  if (!eligibility.eligible) return { error: eligibility.reasons.join(' ') } as const;

  const isShortcut = !changeMajor && isCCToBachelorsSameMajor(program, player.educations);
  const old = active?.creditsCompleted as Partial<ReturnType<typeof getCCShortcutCredits>> | undefined;
  const sameField = active?.program.field.toLowerCase() === program.field.toLowerCase();
  const credits = changeMajor ? {
    generalEducation: old?.generalEducation ?? 0,
    field: sameField ? old?.field ?? 0 : 0,
    major: 0,
  } : isShortcut ? getCCShortcutCredits(program) : { generalEducation: 0, field: 0, major: 0 };
  return {
    programName: program.name, isShortcut, credits, isPartTime, sameField,
    apply: (db: Pick<Prisma.TransactionClient, 'education'>) => {
      const data = { programId: program.id, isPartTime, creditsCompleted: { ...credits }, scholarships: [] };
      return changeMajor && active
        ? db.education.update({ where: { id: active.id }, data })
        : db.education.create({ data: { ...data, playerId: player.id, startAge: player.age, isActive: true, graduated: false, parentContributionUsed: 0 } });
    },
  };
}
