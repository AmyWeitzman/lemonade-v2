export const COUCH_MOVING_BLOCKS = 1;
export const COUCH_STRESS = 20;

export function canStartWithParents(year: number, age: number, maxParentAge: number | null | undefined): boolean {
  return year === 0 && typeof maxParentAge === 'number' && (maxParentAge === -1 || maxParentAge >= age);
}
