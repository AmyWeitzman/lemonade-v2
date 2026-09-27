/**
 * Required actions for a player this year — things they MUST do before the year
 * can end (get housing once they've aged out of / can't use their parents', get
 * transportation in year 1). The Actions page reserves the time blocks these
 * need so a player can never spend their last blocks elsewhere and get stuck.
 */
import { GET_HOUSING_ACTION, GET_TRANSPORT_ACTION } from './acquisitionActions';

export interface RequiredAction {
  actionName: string;
  blocks: number;
  reason: string;
}

const GET_HOUSING_BLOCKS = 2;
const GET_TRANSPORT_BLOCKS = 2;

export interface RequiredActionsInput {
  currentYear: number;
  /** Active HousingOwnership.housing.type, or null if the player has no home. */
  activeHousingType: string | null;
  /** parentContributions.maxParentAge: null = never, -1 = always, N = until age N. */
  parentMaxAge: number | null | undefined;
  age: number;
  couchSurfYearsUsed: number;
  /** Player owns an active, non-spouse vehicle (incl. a gifted car or bike). */
  hasVehicle: boolean;
}

export function getRequiredActions(input: RequiredActionsInput): RequiredAction[] {
  const required: RequiredAction[] = [];

  const agedOutOfParents =
    input.activeHousingType === 'parent' &&
    (input.parentMaxAge === null ||
      (typeof input.parentMaxAge === 'number' &&
        input.parentMaxAge >= 0 &&
        input.age > input.parentMaxAge));
  const couchExpired =
    input.activeHousingType === 'couch' && input.couchSurfYearsUsed >= 2;
  const housingRequired = !input.activeHousingType || agedOutOfParents || couchExpired;

  if (housingRequired) {
    required.push({
      actionName: GET_HOUSING_ACTION,
      blocks: GET_HOUSING_BLOCKS,
      reason: agedOutOfParents
        ? "You've aged out of your parents' place — you need your own housing this year."
        : couchExpired
          ? "You've reached the 2-year limit on a friend's couch — you need your own housing this year."
          : 'You need housing this year.',
    });
  }

  // Transportation is only forced in the first year (age 18 / year 0).
  if (input.currentYear === 0 && !input.hasVehicle) {
    required.push({
      actionName: GET_TRANSPORT_ACTION,
      blocks: GET_TRANSPORT_BLOCKS,
      reason: 'You need transportation before your first year ends.',
    });
  }

  return required;
}
