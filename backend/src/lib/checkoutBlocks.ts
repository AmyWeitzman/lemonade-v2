/** Distribute total leave over equal-duration repetitions, balancing time off
 * so that mixes of paid/unpaid leave and School Break work on required actions. */
export function expandCheckoutBlocks<T extends {
  timeBlocks: number; ptoBlocks?: number; unpaidBlocks?: number; schoolBreakBlocks?: number; quantity?: number;
}>(line: T): T[] | null {
  const quantity = line.quantity ?? 1;
  const total = line.timeBlocks + (line.ptoBlocks ?? 0) + (line.unpaidBlocks ?? 0) + (line.schoolBreakBlocks ?? 0);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 60 || total % quantity !== 0) return null;
  const duration = total / quantity;
  const items = Array.from({ length: quantity }, () => ({ ...line, quantity: undefined, timeBlocks: duration, ptoBlocks: 0, unpaidBlocks: 0, schoolBreakBlocks: 0 }));
  let index = 0;
  for (const key of ['ptoBlocks', 'unpaidBlocks', 'schoolBreakBlocks'] as const) {
    const blocks = line[key] ?? 0;
    for (let n = 0; n < quantity; n++) {
      const item = items[(index + n) % quantity];
      const allocation = Math.floor(blocks / quantity) + Number(n < blocks % quantity);
      item[key] = allocation;
      item.timeBlocks -= allocation;
    }
    index = (index + blocks) % quantity;
  }
  return items;
}
