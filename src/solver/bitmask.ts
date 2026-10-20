import { Day, Meeting, Section } from '../types';

export const DAY_INDEX: Record<Day, number> = {
  Sat: 0,
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
};

export const INDEX_TO_DAY: Day[] = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed'];

export type ScheduleBitmask = [bigint, bigint, bigint, bigint, bigint];

export function createEmptyMask(): ScheduleBitmask {
  return [0n, 0n, 0n, 0n, 0n];
}

/**
 * Computes a 288-bit bitmask for a time interval with 5-minute granularity.
 */
export function computeIntervalMask(start: number, end: number): bigint {
  const slotStart = Math.floor(start / 5);
  const slotEnd = Math.ceil(end / 5);
  let mask = 0n;
  for (let s = slotStart; s < slotEnd; s++) {
    mask |= (1n << BigInt(s));
  }
  return mask;
}

/**
 * Precomputes 5-day bitmasks for a given section.
 */
export function computeSectionMask(section: Section): ScheduleBitmask {
  const mask: ScheduleBitmask = [0n, 0n, 0n, 0n, 0n];
  for (const m of section.meetings) {
    const dayIdx = DAY_INDEX[m.day];
    if (dayIdx !== undefined) {
      mask[dayIdx] |= computeIntervalMask(m.start, m.end);
    }
  }
  return mask;
}

/**
 * Returns true if two schedules overlap on any day.
 */
export function hasOverlap(a: ScheduleBitmask, b: ScheduleBitmask): boolean {
  return (
    (a[0] & b[0]) !== 0n ||
    (a[1] & b[1]) !== 0n ||
    (a[2] & b[2]) !== 0n ||
    (a[3] & b[3]) !== 0n ||
    (a[4] & b[4]) !== 0n
  );
}

/**
 * Combines two bitmasks.
 */
export function mergeMasks(a: ScheduleBitmask, b: ScheduleBitmask): ScheduleBitmask {
  return [
    a[0] | b[0],
    a[1] | b[1],
    a[2] | b[2],
    a[3] | b[3],
    a[4] | b[4],
  ];
}
