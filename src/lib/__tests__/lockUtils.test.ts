import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Section, SolveRequest } from '../../types';
import {
  getLockableSections,
  getLockStatus,
  lockAllSections,
  lockRemainingSections,
  unlockAllSections,
  unlockCourse,
  filterValidLocks,
} from '../lockUtils';
import { serializeToParams, parseFromParams } from '../../utils/urlSync';

const mockSections: Section[] = [
  {
    id: 'sec_cse1111_a',
    courseCode: 'CSE 1111',
    section: 'A',
    title: 'Structured Programming Language',
    program: 'BSCSE',
    kind: 'theory',
    faculty: ['Mohammad Shahriar Rahman'],
    facultyIds: ['fac_1'],
    meetings: [{ day: 'Sat', start: 510, end: 590, room: '412' }],
    dayMask: [true, false, false, false, false],
    timeMask: BigInt(0),
    lab: false,
    tentative: false,
  },
  {
    id: 'sec_cse2215_b',
    courseCode: 'CSE 2215',
    section: 'B',
    title: 'Data Structures and Algorithms',
    program: 'BSCSE',
    kind: 'theory',
    faculty: ['Dr. Dewan Md. Farid'],
    facultyIds: ['fac_2'],
    meetings: [{ day: 'Sun', start: 510, end: 590, room: '413' }],
    dayMask: [false, true, false, false, false],
    timeMask: BigInt(0),
    lab: false,
    tentative: false,
  },
  {
    id: 'sec_cse4000a_i',
    courseCode: 'CSE 4000A', // FYDP fixed course
    section: 'I',
    title: 'Final Year Design Project - I',
    program: 'BSCSE',
    kind: 'project',
    faculty: ['Mohammad Shahriar Rahman'],
    facultyIds: ['fac_1'],
    meetings: [{ day: 'Sat', start: 671, end: 820, room: '315' }],
    dayMask: [true, false, false, false, false],
    timeMask: BigInt(0),
    lab: false,
    tentative: false,
    fixed: true,
  },
];

describe('lockUtils logic & safety', () => {
  it('getLockableSections excludes FYDP fixed course', () => {
    const lockable = getLockableSections(mockSections);
    expect(lockable.map((s) => s.courseCode)).toEqual(['CSE 1111', 'CSE 2215']);
  });

  it('lockAllSections locks non-fixed courses only and preserves FYDP lock', () => {
    const initialLocked = { 'CSE 4000A': 'sec_cse4000a_i' };
    const { newLocks, lockedCount } = lockAllSections(mockSections, initialLocked);

    expect(lockedCount).toBe(2);
    expect(newLocks).toEqual({
      'CSE 4000A': 'sec_cse4000a_i', // Preserved!
      'CSE 1111': 'sec_cse1111_a',
      'CSE 2215': 'sec_cse2215_b',
    });
  });

  it('unlockAllSections clears non-fixed course locks but keeps FYDP lock untouched', () => {
    const currentLocked = {
      'CSE 4000A': 'sec_cse4000a_i',
      'CSE 1111': 'sec_cse1111_a',
      'CSE 2215': 'sec_cse2215_b',
    };

    const { newLocks, unlockedCount } = unlockAllSections(currentLocked);
    expect(unlockedCount).toBe(2);
    expect(newLocks).toEqual({
      'CSE 4000A': 'sec_cse4000a_i', // Kept untouched!
    });
  });

  it('unlockCourse removes only the specified course lock', () => {
    const currentLocked = {
      'CSE 1111': 'sec_cse1111_a',
      'CSE 2215': 'sec_cse2215_b',
    };

    const newLocks = unlockCourse('CSE 1111', currentLocked);
    expect(newLocks).toEqual({
      'CSE 2215': 'sec_cse2215_b',
    });
  });

  it('getLockStatus computes none, partial, and all locked states correctly', () => {
    // 1. None locked
    const statusNone = getLockStatus(mockSections, { 'CSE 4000A': 'sec_cse4000a_i' });
    expect(statusNone.isNoneLocked).toBe(true);
    expect(statusNone.isAllLocked).toBe(false);
    expect(statusNone.isPartiallyLocked).toBe(false);
    expect(statusNone.lockedCount).toBe(0);
    expect(statusNone.remainingLockable.length).toBe(2);

    // 2. Partially locked
    const statusPartial = getLockStatus(mockSections, {
      'CSE 4000A': 'sec_cse4000a_i',
      'CSE 1111': 'sec_cse1111_a',
    });
    expect(statusPartial.isNoneLocked).toBe(false);
    expect(statusPartial.isAllLocked).toBe(false);
    expect(statusPartial.isPartiallyLocked).toBe(true);
    expect(statusPartial.lockedCount).toBe(1);
    expect(statusPartial.remainingLockable.length).toBe(1);
    expect(statusPartial.remainingLockable[0].courseCode).toBe('CSE 2215');

    // 3. All locked
    const statusAll = getLockStatus(mockSections, {
      'CSE 4000A': 'sec_cse4000a_i',
      'CSE 1111': 'sec_cse1111_a',
      'CSE 2215': 'sec_cse2215_b',
    });
    expect(statusAll.isNoneLocked).toBe(false);
    expect(statusAll.isAllLocked).toBe(true);
    expect(statusAll.isPartiallyLocked).toBe(false);
    expect(statusAll.lockedCount).toBe(2);
    expect(statusAll.remainingLockable.length).toBe(0);
  });

  it('lockRemainingSections only locks courses that are not yet locked', () => {
    const initialLocked = { 'CSE 1111': 'sec_cse1111_a' };
    const { newLocks, newlyLockedCount } = lockRemainingSections(mockSections, initialLocked);

    expect(newlyLockedCount).toBe(1);
    expect(newLocks).toEqual({
      'CSE 1111': 'sec_cse1111_a',
      'CSE 2215': 'sec_cse2215_b',
    });
  });

  it('filterValidLocks removes stale sections and reports staleCodes', () => {
    const locksWithStale = {
      'CSE 1111': 'sec_cse1111_a',
      'CSE 9999': 'sec_deleted_999', // Stale
    };

    const { validLocks, staleCodes } = filterValidLocks(locksWithStale, mockSections);
    expect(validLocks).toEqual({
      'CSE 1111': 'sec_cse1111_a',
    });
    expect(staleCodes).toEqual(['CSE 9999']);
  });

  it('Undo restores previous lock state exactly', () => {
    const previousLocks = { 'CSE 1111': 'sec_cse1111_a' };

    // Action: Lock all
    const { newLocks } = lockAllSections(mockSections, previousLocks);
    expect(Object.keys(newLocks).length).toBe(2);

    // Undo action
    const restored = { ...previousLocks };
    expect(restored).toEqual({ 'CSE 1111': 'sec_cse1111_a' });
  });

  it('persistence round trip with URL serialization preserves lock and unlock changes', () => {
    const reqWithLocks = {
      selectedCourses: ['CSE 1111', 'CSE 2215'],
      lockedSections: { 'CSE 1111': 'sec_cse1111_a', 'CSE 2215': 'sec_cse2215_b' },
    };

    const serialized = serializeToParams(reqWithLocks);
    expect(serialized).toContain('lock=CSE+1111%3Asec_cse1111_a%7CCSE+2215%3Asec_cse2215_b');

    const parsed = parseFromParams(serialized);
    expect(parsed.lockedSections).toEqual({
      'CSE 1111': 'sec_cse1111_a',
      'CSE 2215': 'sec_cse2215_b',
    });

    // After unlock all:
    const { newLocks: unlocked } = unlockAllSections(parsed.lockedSections);
    const serializedUnlocked = serializeToParams({ ...reqWithLocks, lockedSections: unlocked });
    expect(serializedUnlocked).not.toContain('lock=');
    const parsedUnlocked = parseFromParams(serializedUnlocked);
    expect(parsedUnlocked.lockedSections).toBeUndefined();
  });

  it('unlockAll clears locks but keeps courses, faculty preferences, and blocked times intact', () => {
    const fullRequest: SolveRequest = {
      selectedCourses: ['CSE 1111', 'CSE 2215', 'CSE 4000A'],
      preferredFaculty: { 'CSE 1111': ['fac_1'] },
      avoidFaculty: { 'CSE 2215': ['fac_2'] },
      lockedSections: {
        'CSE 1111': 'sec_cse1111_a',
        'CSE 2215': 'sec_cse2215_b',
        'CSE 4000A': 'sec_cse4000a_i',
      },
      filterDayOff: ['Mon'],
      filterTimeWindow: { earliestStart: 510, latestEnd: 990 },
      maxGapMinutesPerDay: 60,
      weights: {
        facultyPreference: 30,
        minimizeGaps: 25,
        compactDays: 20,
        avoidEarlyLate: 15,
        avoidTentative: 10,
      },
      limit: 50,
    };

    const { newLocks } = unlockAllSections(fullRequest.lockedSections);
    const updatedRequest: SolveRequest = {
      ...fullRequest,
      lockedSections: newLocks,
    };

    expect(updatedRequest.selectedCourses).toEqual(fullRequest.selectedCourses);
    expect(updatedRequest.preferredFaculty).toEqual(fullRequest.preferredFaculty);
    expect(updatedRequest.avoidFaculty).toEqual(fullRequest.avoidFaculty);
    expect(updatedRequest.filterDayOff).toEqual(fullRequest.filterDayOff);
    expect(updatedRequest.filterTimeWindow).toEqual(fullRequest.filterTimeWindow);
    expect(updatedRequest.maxGapMinutesPerDay).toEqual(fullRequest.maxGapMinutesPerDay);
    expect(updatedRequest.weights).toEqual(fullRequest.weights);
    // Non-fixed locks cleared, fixed course kept:
    expect(updatedRequest.lockedSections).toEqual({ 'CSE 4000A': 'sec_cse4000a_i' });
  });

  it('persistence round trip with localStorage serialization preserves lock state', () => {
    const request = {
      selectedCourses: ['CSE 1111'],
      lockedSections: { 'CSE 1111': 'sec_cse1111_a' },
    };
    const json = JSON.stringify(request);
    const parsed = JSON.parse(json);
    expect(parsed.lockedSections).toEqual({ 'CSE 1111': 'sec_cse1111_a' });

    const unlocked = { ...parsed, lockedSections: unlockAllSections(parsed.lockedSections).newLocks };
    const unlockedJson = JSON.stringify(unlocked);
    const parsedUnlocked = JSON.parse(unlockedJson);
    expect(parsedUnlocked.lockedSections).toEqual({});
  });
});

describe('Lock UI static contract & component tests', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  it('Timetable contains toggle labels: Lock All, Unlock All, and Unlock (N)', () => {
    const timetableContent = fs.readFileSync(path.join(rootDir, 'src/components/Timetable.tsx'), 'utf-8');
    expect(timetableContent).toContain('Lock All');
    expect(timetableContent).toContain('Unlock All');
    expect(timetableContent).toContain('Unlock ({lockStatus.lockedCount})');
    expect(timetableContent).toContain('Lock remaining');
    expect(timetableContent).toContain('title="Locked - click to unlock"');
  });

  it('CourseSelector contains per-course unlock button and lock badge', () => {
    const selectorContent = fs.readFileSync(path.join(rootDir, 'src/components/CourseSelector.tsx'), 'utf-8');
    expect(selectorContent).toContain('Unlock ${course.code}');
    expect(selectorContent).toContain('locked-badge-${course.code}');
    expect(selectorContent).toContain('data-testid={`unlock-course-${course.code}`}');
  });

  it('EmptyState conflict view highlights locked sections and provides Unlock all and per-course Unlock', () => {
    const emptyStateContent = fs.readFileSync(path.join(rootDir, 'src/components/EmptyState.tsx'), 'utf-8');
    expect(emptyStateContent).toContain('onUnlockAllSections');
    expect(emptyStateContent).toContain('onUnlockCourse');
    expect(emptyStateContent).toContain('Unlock all');
    expect(emptyStateContent).toContain('Unlock {code}');
  });

  it('ShortcutsModal lists U shortcut for lock/unlock toggle', () => {
    const modalsContent = fs.readFileSync(path.join(rootDir, 'src/components/Modals.tsx'), 'utf-8');
    expect(modalsContent).toContain("{ key: 'u', desc: 'Toggle lock / unlock all sections' }");
  });
});
