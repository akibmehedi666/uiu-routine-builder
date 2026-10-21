import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSavedRoutines,
  saveRoutinesToStorage,
  buildSavedRoutineObject,
  findDuplicateSavedRoutine,
  validateSavedRoutine,
  updateRoutineToLatestData,
  exportRoutinesToJson,
  importRoutinesFromJson,
  mergeImportedRoutines,
  encodeSharedRoutineUrl,
  decodeSharedRoutineUrl,
  SAVED_ROUTINES_STORAGE_KEY,
  SAVED_ROUTINES_MAX_LIMIT,
} from '../savedRoutinesStorage';
import { SavedRoutine, SavedRoutinesBackupFileSchema } from '../../types/savedRoutine';
import { Section, ScheduleResult, SolveRequest } from '../../types';

describe('Saved Routines Storage & Logic', () => {
  const mockSections: Section[] = [
    {
      id: 'BSCSE-CSE 4509-A',
      sl: 1,
      program: 'BSCSE',
      courseCode: 'CSE 4509',
      title: 'Operating Systems',
      section: 'A',
      credit: 3,
      kind: 'theory',
      meetings: [
        { day: 'Sat', start: 510, end: 590, room: '405' },
        { day: 'Tue', start: 510, end: 590, room: '405' },
      ],
      faculty: ['Md. Siam'],
      facultyIds: ['SIAM'],
      tentative: false,
    },
    {
      id: 'BSCSE-CSE 4510-A',
      sl: 2,
      program: 'BSCSE',
      courseCode: 'CSE 4510',
      title: 'Operating Systems Lab',
      section: 'A',
      credit: 1,
      kind: 'lab',
      meetings: [{ day: 'Sun', start: 670, end: 820, room: '601' }],
      faculty: ['Md. Siam'],
      facultyIds: ['SIAM'],
      tentative: false,
    },
  ];

  const mockSchedule: ScheduleResult = {
    sections: mockSections,
    score: 95,
    breakdown: {
      facultyScore: 30,
      gapScore: 25,
      dayCompactScore: 20,
      timePreferenceScore: 15,
      tentativePenalty: 0,
    },
    stats: {
      daysUsed: ['Sat', 'Sun', 'Tue'],
      totalGapMinutes: 0,
      earliestStart: 510,
      latestEnd: 820,
      tentativeCount: 0,
      credits: 4,
    },
  };

  const mockRequest: SolveRequest = {
    selectedCourses: ['CSE 4509', 'CSE 4510'],
    preferredFaculty: { 'CSE 4509': ['SIAM'] },
    avoidFaculty: {},
    lockedSections: {},
    filterDayOff: [],
    weights: {
      facultyPreference: 30,
      minimizeGaps: 25,
      compactDays: 20,
      avoidEarlyLate: 15,
      avoidTentative: 10,
    },
    limit: 50,
  };

  let mockStorage: any;

  beforeEach(() => {
    const store: Record<string, string> = {};
    mockStorage = {
      store,
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = String(value);
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        for (const k of Object.keys(store)) delete store[k];
      }),
    };
    (globalThis as any).window = {
      localStorage: mockStorage,
      origin: 'http://localhost:3000',
    };
    (globalThis as any).localStorage = mockStorage;
    vi.restoreAllMocks();
  });

  it('builds a valid SavedRoutine object with full snapshot', () => {
    const routine = buildSavedRoutineObject({
      name: 'My Routine 1',
      schedule: mockSchedule,
      request: mockRequest,
      note: 'Best lab slot',
      colorTag: 'emerald',
      isFavorite: true,
    });

    expect(routine.id).toBeDefined();
    expect(routine.name).toBe('My Routine 1');
    expect(routine.trimester).toBe('Fall 2026');
    expect(routine.sections).toHaveLength(2);
    expect(routine.sections[0].sectionId).toBe('BSCSE-CSE 4509-A');
    expect(routine.totals.credits).toBe(4);
    expect(routine.totals.daysOnCampus).toBe(3);
    expect(routine.totals.score).toBe(95);
    expect(routine.colorTag).toBe('emerald');
    expect(routine.isFavorite).toBe(true);
    expect(routine.note).toBe('Best lab slot');
  });

  it('saves and loads routines from localStorage', () => {
    const routine = buildSavedRoutineObject({
      name: 'Test Routine',
      schedule: mockSchedule,
      request: mockRequest,
    });

    const saveRes = saveRoutinesToStorage([routine]);
    expect(saveRes.success).toBe(true);

    const { routines, isBlocked } = loadSavedRoutines();
    expect(isBlocked).toBe(false);
    expect(routines).toHaveLength(1);
    expect(routines[0].name).toBe('Test Routine');
    expect(routines[0].sections[0].courseCode).toBe('CSE 4509');
  });

  it('detects exact duplicate routines by section combination', () => {
    const routine = buildSavedRoutineObject({
      name: 'Existing Routine',
      schedule: mockSchedule,
      request: mockRequest,
    });

    const existingList = [routine];

    // Same sections
    const duplicate = findDuplicateSavedRoutine(mockSchedule.sections, existingList);
    expect(duplicate).not.toBeNull();
    expect(duplicate?.name).toBe('Existing Routine');

    // Different sections
    const nonDuplicate = findDuplicateSavedRoutine(
      [{ id: 'BSCSE-CSE 2215-A' }],
      existingList
    );
    expect(nonDuplicate).toBeNull();
  });

  it('enforces maximum limit of 50 saved routines', () => {
    const routines: SavedRoutine[] = [];
    for (let i = 0; i < 55; i++) {
      routines.push(
        buildSavedRoutineObject({
          name: `Routine ${i + 1}`,
          schedule: mockSchedule,
          request: mockRequest,
        })
      );
    }

    const saveRes = saveRoutinesToStorage(routines);
    expect(saveRes.success).toBe(true);

    const { routines: loaded } = loadSavedRoutines();
    expect(loaded.length).toBe(SAVED_ROUTINES_MAX_LIMIT);
  });

  it('validates saved routine against live catalog (detects missing and changed sections)', () => {
    const routine = buildSavedRoutineObject({
      name: 'Routine to validate',
      schedule: mockSchedule,
      request: mockRequest,
    });

    // 1. Fully valid test
    const validResult = validateSavedRoutine(routine, mockSections);
    expect(validResult.isFullyValid).toBe(true);
    expect(validResult.diffs).toHaveLength(0);

    // 2. Section missing test
    const modifiedLiveMissing = [mockSections[0]]; // dropped CSE 4510
    const missingResult = validateSavedRoutine(routine, modifiedLiveMissing);
    expect(missingResult.isFullyValid).toBe(false);
    expect(missingResult.hasChangedSections).toBe(true);
    expect(missingResult.diffs[0].type).toBe('missing');

    // 3. Section timing changed test
    const modifiedLiveTime: Section[] = [
      {
        ...mockSections[0],
        meetings: [{ day: 'Sat', start: 670, end: 750, room: '405' }],
      },
      mockSections[1],
    ];
    const timeChangedResult = validateSavedRoutine(routine, modifiedLiveTime);
    expect(timeChangedResult.isFullyValid).toBe(false);
    expect(timeChangedResult.diffs.some((d) => d.type === 'time_changed')).toBe(true);

    // 4. Faculty changed test
    const modifiedLiveFaculty: Section[] = [
      {
        ...mockSections[0],
        faculty: ['New Faculty'],
      },
      mockSections[1],
    ];
    const facultyChangedResult = validateSavedRoutine(routine, modifiedLiveFaculty);
    expect(facultyChangedResult.diffs.some((d) => d.type === 'faculty_changed')).toBe(true);
  });

  it('updates saved routine to latest live catalog data', () => {
    const routine = buildSavedRoutineObject({
      name: 'Old Routine',
      schedule: mockSchedule,
      request: mockRequest,
    });

    const updatedCatalog: Section[] = [
      {
        ...mockSections[0],
        faculty: ['Updated Faculty Dr. X'],
        meetings: [{ day: 'Sat', start: 510, end: 590, room: 'Room 501' }],
      },
      mockSections[1],
    ];

    const { updatedRoutine, changedCount } = updateRoutineToLatestData(
      routine,
      updatedCatalog
    );
    expect(changedCount).toBe(2);
    expect(updatedRoutine.name).toContain('Updated');
    expect(updatedRoutine.sections[0].faculty).toEqual(['Updated Faculty Dr. X']);
    expect(updatedRoutine.sections[0].meetings[0].room).toBe('Room 501');
  });

  it('exports and imports routines with Zod validation', () => {
    const routine = buildSavedRoutineObject({
      name: 'Export Test',
      schedule: mockSchedule,
      request: mockRequest,
    });

    const json = exportRoutinesToJson([routine]);
    expect(json).toContain('Export Test');

    // Validate with Zod
    const importRes = importRoutinesFromJson(json);
    expect(importRes.success).toBe(true);
    expect(importRes.routines).toHaveLength(1);
    expect(importRes.routines![0].name).toBe('Export Test');

    // Invalid JSON test
    const badRes = importRoutinesFromJson('{ invalid json');
    expect(badRes.success).toBe(false);
    expect(badRes.error).toBeDefined();

    // Invalid schema test
    const invalidSchemaRes = importRoutinesFromJson(
      JSON.stringify({ version: 99, routines: [{ invalid: true }] })
    );
    expect(invalidSchemaRes.success).toBe(false);
  });

  it('merges imported routines skipping exact duplicates', () => {
    const routine1 = buildSavedRoutineObject({
      name: 'Routine 1',
      schedule: mockSchedule,
      request: mockRequest,
    });

    const routine2 = buildSavedRoutineObject({
      name: 'Routine 2',
      schedule: {
        ...mockSchedule,
        sections: [mockSections[0]], // only CSE 4509
      },
      request: mockRequest,
    });

    const current = [routine1];
    const incoming = [routine1, routine2]; // 1 duplicate, 1 new

    const { result, addedCount, duplicateCount } = mergeImportedRoutines(
      current,
      incoming,
      'merge'
    );
    expect(addedCount).toBe(1);
    expect(duplicateCount).toBe(1);
    expect(result).toHaveLength(2);
  });

  it('replaces all current routines in replace mode', () => {
    const routine1 = buildSavedRoutineObject({
      name: 'Routine 1',
      schedule: mockSchedule,
      request: mockRequest,
    });
    const routine2 = buildSavedRoutineObject({
      name: 'Routine 2',
      schedule: mockSchedule,
      request: mockRequest,
    });

    const { result, addedCount } = mergeImportedRoutines(
      [routine1],
      [routine2],
      'replace'
    );
    expect(addedCount).toBe(1);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Routine 2');
  });

  it('encodes and decodes compact share link under 2000 chars', () => {
    const routine = buildSavedRoutineObject({
      name: 'Share Test',
      schedule: mockSchedule,
      request: mockRequest,
      note: 'Check this slot',
      colorTag: 'sky',
    });

    const token = encodeSharedRoutineUrl(routine);
    expect(token).toBeDefined();
    expect(token.length).toBeLessThan(500);

    const decoded = decodeSharedRoutineUrl(token, mockSections);
    expect(decoded).not.toBeNull();
    expect(decoded?.name).toBe('Share Test');
    expect(decoded?.colorTag).toBe('sky');
    expect(decoded?.note).toBe('Check this slot');
    expect(decoded?.sections).toHaveLength(2);
  });

  it('handles quota and blocked storage gracefully', () => {
    const routine = buildSavedRoutineObject({
      name: 'Quota Test',
      schedule: mockSchedule,
      request: mockRequest,
    });

    // Mock QuotaExceededError
    mockStorage.setItem = vi.fn((key: string) => {
      if (key === '__storage_test__') return;
      const err = new Error('Quota exceeded');
      err.name = 'QuotaExceededError';
      throw err;
    });

    const res = saveRoutinesToStorage([routine]);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Storage quota exceeded');
  });
});
