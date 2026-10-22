import { Section } from '../types';
import { isFixedCourse } from '../config/fixedCourses';
import { isManualScheduleCourse } from './fixedCourses';

/**
 * Filter sections that can be locked/unlocked via routine lock actions.
 * FYDP and manual schedule courses are managed through their own pickers.
 */
export function getLockableSections(sections: Section[]): Section[] {
  return (sections || []).filter(
    (s) => !isFixedCourse(s.courseCode) && !isManualScheduleCourse(s.courseCode)
  );
}

export interface LockStatus {
  totalLockable: number;
  lockedCount: number;
  isNoneLocked: boolean;
  isAllLocked: boolean;
  isPartiallyLocked: boolean;
  remainingLockable: Section[];
}

/**
 * Compute the locking status for a schedule given current lockedSections.
 */
export function getLockStatus(
  scheduleSections: Section[],
  lockedSections: Record<string, string> = {}
): LockStatus {
  const lockable = getLockableSections(scheduleSections);
  const totalLockable = lockable.length;

  // Count non-fixed locked courses overall
  const nonFixedLockedCodes = Object.keys(lockedSections).filter(
    (c) => !isFixedCourse(c) && !isManualScheduleCourse(c)
  );
  const lockedCount = nonFixedLockedCodes.length;

  const remainingLockable = lockable.filter((s) => !lockedSections[s.courseCode]);

  const isNoneLocked = lockedCount === 0;
  const isAllLocked = totalLockable > 0 && remainingLockable.length === 0;
  const isPartiallyLocked = lockedCount > 0 && !isAllLocked;

  return {
    totalLockable,
    lockedCount,
    isNoneLocked,
    isAllLocked,
    isPartiallyLocked,
    remainingLockable,
  };
}

/**
 * Lock all lockable sections in the current schedule.
 * Preserves fixed (FYDP) and manual course locks intact.
 */
export function lockAllSections(
  scheduleSections: Section[],
  currentLocked: Record<string, string> = {}
): { newLocks: Record<string, string>; lockedCount: number } {
  const lockable = getLockableSections(scheduleSections);
  const newLocks: Record<string, string> = { ...currentLocked };

  let count = 0;
  for (const sec of lockable) {
    if (newLocks[sec.courseCode] !== sec.id) {
      newLocks[sec.courseCode] = sec.id;
      count++;
    }
  }

  return { newLocks, lockedCount: lockable.length };
}

/**
 * Lock remaining unlocked sections in the current schedule.
 */
export function lockRemainingSections(
  scheduleSections: Section[],
  currentLocked: Record<string, string> = {}
): { newLocks: Record<string, string>; newlyLockedCount: number } {
  const lockable = getLockableSections(scheduleSections);
  const newLocks: Record<string, string> = { ...currentLocked };

  let newlyLockedCount = 0;
  for (const sec of lockable) {
    if (!newLocks[sec.courseCode]) {
      newLocks[sec.courseCode] = sec.id;
      newlyLockedCount++;
    }
  }

  return { newLocks, newlyLockedCount };
}

/**
 * Unlock all non-fixed sections.
 * FYDP and manual schedule courses stay untouched.
 */
export function unlockAllSections(
  currentLocked: Record<string, string> = {}
): { newLocks: Record<string, string>; unlockedCount: number } {
  const newLocks: Record<string, string> = {};
  let unlockedCount = 0;

  for (const [code, secId] of Object.entries(currentLocked)) {
    if (isFixedCourse(code) || isManualScheduleCourse(code)) {
      newLocks[code] = secId;
    } else {
      unlockedCount++;
    }
  }

  return { newLocks, unlockedCount };
}

/**
 * Unlock a single course by code.
 */
export function unlockCourse(
  courseCode: string,
  currentLocked: Record<string, string> = {}
): Record<string, string> {
  const newLocks: Record<string, string> = { ...currentLocked };
  delete newLocks[courseCode];
  return newLocks;
}

/**
 * Clean up stale locks where sectionId no longer exists in catalog data.
 */
export function filterValidLocks(
  lockedSections: Record<string, string> = {},
  availableSections: Section[] = []
): { validLocks: Record<string, string>; staleCodes: string[] } {
  const validLocks: Record<string, string> = {};
  const staleCodes: string[] = [];

  for (const [code, secId] of Object.entries(lockedSections)) {
    // If it's a fixed course with a manual section or real section, verify presence
    const exists = availableSections.some((s) => s.courseCode === code && s.id === secId);
    if (exists) {
      validLocks[code] = secId;
    } else {
      staleCodes.push(code);
    }
  }

  return { validLocks, staleCodes };
}
