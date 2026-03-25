/**
 * Probability distribution helpers for player initialization.
 */

/**
 * Bell curve: normally distributed value clamped to [min, max].
 * Uses Box-Muller transform: mean = (min+max)/2, stddev = (max-min)/6
 */
export function bellCurve(min: number, max: number): number {
  const mean = (min + max) / 2;
  const stddev = (max - min) / 6;

  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  const value = mean + z * stddev;
  return Math.max(min, Math.min(max, value));
}

/**
 * Right-skewed: values cluster near min.
 * Uses min(U1, U2, U3) * (max - min) + min where U is uniform [0,1].
 */
export function rightSkewed(min: number, max: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const u3 = Math.random();
  const t = Math.min(u1, u2, u3);
  return t * (max - min) + min;
}

/**
 * Left-skewed: values cluster near max.
 * Uses max(U1, U2, U3) * (max - min) + min where U is uniform [0,1].
 */
export function leftSkewed(min: number, max: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const u3 = Math.random();
  const t = Math.max(u1, u2, u3);
  return t * (max - min) + min;
}

/**
 * Roll an N-sided die (returns 1..N).
 */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Right-skewed for money: values cluster near 0.
 * Uses Math.random() * Math.random() * max.
 */
export function rightSkewedMoney(max: number): number {
  return Math.random() * Math.random() * max;
}
