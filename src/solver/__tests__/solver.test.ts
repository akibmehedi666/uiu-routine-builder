import { describe, it, expect } from 'vitest';
import { solveSchedules } from '../index';
import { Section, SolveRequest } from '../../types';
import sectionsData from '../../../data/sections.json';

const allSections = sectionsData as Section[];

const defaultWeights = {
  facultyPreference: 30,
  minimizeGaps: 25,
  compactDays: 20,
  avoidEarlyLate: 15,
  avoidTentative: 10,
};

describe('UIU Routine Builder Solver Core', () => {
  it('1. No-conflict baseline: synthetic non-overlapping courses return exact combinations', () => {
    // Construct 3 synthetic courses with 2 sections each, perfectly non-overlapping
    const mockSections: Section[] = [
      {
        id: 'C1-A',
        sl: 1,
        program: 'BSCSE',
        courseCode: 'COURSE-1',
        title: 'Course 1',
        section: 'A',
        credit: 3,
        kind: 'theory',
        meetings: [
          { day: 'Sat', start: 510, end: 590, room: '101' },
          { day: 'Tue', start: 510, end: 590, room: '101' },
        ],
        faculty: ['F1'],
        facultyIds: ['f1'],
        tentative: false,
      },
      {
        id: 'C1-B',
        sl: 2,
        program: 'BSCSE',
        courseCode: 'COURSE-1',
        title: 'Course 1',
        section: 'B',
        credit: 3,
        kind: 'theory',
        meetings: [
          { day: 'Sun', start: 510, end: 590, room: '101' },
          { day: 'Wed', start: 510, end: 590, room: '101' },
        ],
        faculty: ['F1'],
        facultyIds: ['f1'],
        tentative: false,
      },
      {
        id: 'C2-A',
        sl: 3,
        program: 'BSCSE',
        courseCode: 'COURSE-2',
        title: 'Course 2',
        section: 'A',
        credit: 3,
        kind: 'theory',
        meetings: [
          { day: 'Sat', start: 600, end: 680, room: '102' },
          { day: 'Tue', start: 600, end: 680, room: '102' },
        ],
        faculty: ['F2'],
        facultyIds: ['f2'],
        tentative: false,
      },
      {
        id: 'C2-B',
        sl: 4,
        program: 'BSCSE',
        courseCode: 'COURSE-2',
        title: 'Course 2',
        section: 'B',
        credit: 3,
        kind: 'theory',
        meetings: [
          { day: 'Sun', start: 600, end: 680, room: '102' },
          { day: 'Wed', start: 600, end: 680, room: '102' },
        ],
        faculty: ['F2'],
        facultyIds: ['f2'],
        tentative: false,
      },
      {
        id: 'C3-A',
        sl: 5,
        program: 'BSCSE',
        courseCode: 'COURSE-3',
        title: 'Course 3',
        section: 'A',
        credit: 1,
        kind: 'lab',
        meetings: [{ day: 'Mon', start: 600, end: 750, room: '103' }],
        faculty: ['F3'],
        facultyIds: ['f3'],
        tentative: false,
      },
    ];

    const req: SolveRequest = {
      selectedCourses: ['COURSE-1', 'COURSE-2', 'COURSE-3'],
      preferredFaculty: {},
      avoidFaculty: {},
      lockedSections: {},
      filterDayOff: [],
      filterTimeWindow: {},
      weights: defaultWeights,
      limit: 10,
    };

    const res = solveSchedules(mockSections, req);
    expect(res.totalValidCombinations).toBe(4); // 2 * 2 * 1 = 4 combinations
    expect(res.schedules.length).toBe(4);
    expect(res.truncated).toBe(false);
  });

  it('2. Direct conflict: two courses whose only sections clash return 0 solutions and helpful message', () => {
    const clashingSections: Section[] = [
      {
        id: 'C1-A',
        sl: 1,
        program: 'BSCSE',
        courseCode: 'COURSE-1',
        title: 'Course 1',
        section: 'A',
        credit: 3,
        kind: 'theory',
        meetings: [
          { day: 'Sat', start: 510, end: 590, room: '101' },
          { day: 'Tue', start: 510, end: 590, room: '101' },
        ],
        faculty: ['F1'],
        facultyIds: ['f1'],
        tentative: false,
      },
      {
        id: 'C2-A',
        sl: 2,
        program: 'BSCSE',
        courseCode: 'COURSE-2',
        title: 'Course 2',
        section: 'A',
        credit: 3,
        kind: 'theory',
        meetings: [
          { day: 'Sat', start: 510, end: 590, room: '102' }, // Exact same time slot!
          { day: 'Tue', start: 510, end: 590, room: '102' },
        ],
        faculty: ['F2'],
        facultyIds: ['f2'],
        tentative: false,
      },
    ];

    const req: SolveRequest = {
      selectedCourses: ['COURSE-1', 'COURSE-2'],
      preferredFaculty: {},
      avoidFaculty: {},
      lockedSections: {},
      filterDayOff: [],
      filterTimeWindow: {},
      weights: defaultWeights,
    };

    const res = solveSchedules(clashingSections, req);
    expect(res.totalValidCombinations).toBe(0);
    expect(res.schedules.length).toBe(0);
  });

  it('3. Locked section: user locks section A, only schedules with section A returned', () => {
    const req: SolveRequest = {
      selectedCourses: ['CSE 3811', 'CSE 3411'],
      preferredFaculty: {},
      avoidFaculty: {},
      lockedSections: { 'CSE 3811': 'BSCSE-CSE 3811-A' },
      filterDayOff: [],
      filterTimeWindow: {},
      weights: defaultWeights,
    };

    const res = solveSchedules(allSections, req);
    expect(res.schedules.length).toBeGreaterThan(0);
    for (const schedule of res.schedules) {
      const cse3811Sec = schedule.sections.find((s) => s.courseCode === 'CSE 3811');
      expect(cse3811Sec).toBeDefined();
      expect(cse3811Sec?.id).toBe('BSCSE-CSE 3811-A');
    }
  });

  it('4. Day-off filter: filter Tuesday, expect zero Tuesday classes in all results', () => {
    const req: SolveRequest = {
      selectedCourses: ['CSE 2213', 'CSE 2215'],
      preferredFaculty: {},
      avoidFaculty: {},
      lockedSections: {},
      filterDayOff: ['Tue'],
      filterTimeWindow: {},
      weights: defaultWeights,
    };

    const res = solveSchedules(allSections, req);
    expect(res.schedules.length).toBeGreaterThan(0);
    for (const schedule of res.schedules) {
      expect(schedule.stats.daysUsed).not.toContain('Tue');
      for (const s of schedule.sections) {
        for (const m of s.meetings) {
          expect(m.day).not.toBe('Tue');
        }
      }
    }
  });

  it('5. Scorer ordering: preferred faculty schedule ranks higher than non-preferred', () => {
    // For CSE 3811, sections have different faculty
    // Let's prefer 'mr-sheikh-mostofa-amir-foisol'
    const req: SolveRequest = {
      selectedCourses: ['CSE 3811'],
      preferredFaculty: {
        'CSE 3811': ['mr-sheikh-mostofa-amir-foisol'],
      },
      avoidFaculty: {},
      lockedSections: {},
      filterDayOff: [],
      filterTimeWindow: {},
      weights: {
        facultyPreference: 100, // Maximally isolate faculty preference
        minimizeGaps: 0,
        compactDays: 0,
        avoidEarlyLate: 0,
        avoidTentative: 0,
      },
      limit: 10,
    };

    const res = solveSchedules(allSections, req);
    expect(res.schedules.length).toBeGreaterThan(1);
    
    // Top schedule should have the preferred faculty
    const topSchedule = res.schedules[0];
    const topSec = topSchedule.sections[0];
    expect(topSec.facultyIds).toContain('mr-sheikh-mostofa-amir-foisol');
    expect(topSchedule.breakdown.facultyScore).toBe(100);

    // Later schedules with non-preferred faculty should have lower scores
    const nonPrefSchedule = res.schedules.find(
      (s) => !s.sections[0].facultyIds.includes('mr-sheikh-mostofa-amir-foisol')
    );
    if (nonPrefSchedule) {
      expect(topSchedule.score).toBeGreaterThan(nonPrefSchedule.score);
    }
  });

  it('6. Theory/lab co-requisite: if both selected, combinations contain both without internal clashes', () => {
    // Select CSE 3811 (AI theory) and CSE 3812 (AI lab)
    const req: SolveRequest = {
      selectedCourses: ['CSE 3811', 'CSE 3812'],
      preferredFaculty: {},
      avoidFaculty: {},
      lockedSections: {},
      filterDayOff: [],
      filterTimeWindow: {},
      weights: defaultWeights,
      limit: 20,
    };

    const res = solveSchedules(allSections, req);
    expect(res.schedules.length).toBeGreaterThan(0);
    
    for (const schedule of res.schedules) {
      expect(schedule.sections.length).toBe(2);
      const theory = schedule.sections.find((s) => s.courseCode === 'CSE 3811');
      const lab = schedule.sections.find((s) => s.courseCode === 'CSE 3812');
      expect(theory).toBeDefined();
      expect(lab).toBeDefined();

      // Check no internal collision
      for (const tm of theory!.meetings) {
        for (const lm of lab!.meetings) {
          if (tm.day === lm.day) {
            const overlaps = tm.start < lm.end && lm.start < tm.end;
            expect(overlaps).toBe(false);
          }
        }
      }
    }
  });

  it('7. Performance benchmark: select 5 heavy courses (>100k naive combinations), solver finishes in < 200ms', () => {
    // Choose 5 courses that have many sections:
    // CSE 1111 (Structured Programming), CSE 1112 (Lab), CSE 2213 (Discrete Math), CSE 2215 (DSA I), CSE 2216 (Lab)
    const req: SolveRequest = {
      selectedCourses: ['CSE 1111', 'CSE 1112', 'CSE 2213', 'CSE 2215', 'CSE 2216'],
      preferredFaculty: {},
      avoidFaculty: {},
      lockedSections: {},
      filterDayOff: [],
      filterTimeWindow: {},
      weights: defaultWeights,
      limit: 50,
    };

    const startTime = performance.now();
    const res = solveSchedules(allSections, req);
    const duration = performance.now() - startTime;

    console.log(`Performance benchmark completed in ${duration.toFixed(2)}ms, found ${res.totalValidCombinations} valid combinations (explored ${res.nodesExplored} nodes).`);

    expect(res.schedules.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(200); // Must be under 200ms
  });
});
