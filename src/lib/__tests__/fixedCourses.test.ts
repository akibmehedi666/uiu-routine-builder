import { describe, it, expect } from 'vitest';
import coursesData from '../../../data/courses.json';
import sectionsData from '../../../data/sections.json';
import { Course, Section, SolveRequest } from '../../types';
import {
  FYDP_FIXED,
  applyFixedCourseOverlay,
  buildFixedSection,
  computeFYDPClashes,
  isFixedCourse,
  normalizeDay,
  parseTimeString,
  getFixedScheduleDescription,
  FixedCourseConfig,
} from '../fixedCourses';
import { computeSectionMask, computeIntervalMask, hasOverlap } from '../../solver/bitmask';
import { solveSchedules } from '../../solver/index';
import { buildCourseSearchIndex, searchCourses } from '../courseSearch';

const allCourses = coursesData as Course[];
const rawSections = sectionsData as Section[];

const defaultWeights = {
  facultyPreference: 30,
  minimizeGaps: 25,
  compactDays: 20,
  avoidEarlyLate: 15,
  avoidTentative: 10,
};

describe('FYDP Fixed Course overlay & config', () => {
  it('parses time strings and normalizes day names correctly', () => {
    expect(parseTimeString('11:11')).toBe(671);
    expect(parseTimeString('13:40')).toBe(820);
    expect(normalizeDay('Saturday')).toBe('Sat');
    expect(normalizeDay('Sat')).toBe('Sat');
    expect(normalizeDay('Sunday')).toBe('Sun');
    expect(normalizeDay('Tuesday')).toBe('Tue');
    expect(normalizeDay('Wednesday')).toBe('Wed');
  });

  it('1. Injected FYDP section has correct day, 11:11 to 13:40 times and bitmask matching real lab slot', () => {
    const { courses, sections } = applyFixedCourseOverlay(allCourses, rawSections);

    // Verify CSE 4000A, B, C exist in overlaid courses
    expect(courses.some((c) => c.code === 'CSE 4000A')).toBe(true);
    expect(courses.some((c) => c.code === 'CSE 4000B')).toBe(true);
    expect(courses.some((c) => c.code === 'CSE 4000C')).toBe(true);

    // Verify synthetic section for CSE 4000B
    const fydpSecB = sections.find((s) => s.courseCode === 'CSE 4000B');
    expect(fydpSecB).toBeDefined();
    expect(fydpSecB?.section).toBe('I');
    expect(fydpSecB?.fixed).toBe(true);
    expect(fydpSecB?.synthetic).toBe(true);
    expect(fydpSecB?.meetings).toEqual([
      { day: 'Sat', start: 671, end: 820, room: null },
    ]);

    // Find real lab section with Saturday 11:11-13:40 slot in raw dataset (e.g. BSCSE-CSE 1110-J)
    const realLabSec = rawSections.find(
      (s) => s.id === 'BSCSE-CSE 1110-J' && s.meetings.some((m) => m.day === 'Sat' && m.start === 671 && m.end === 820)
    );
    expect(realLabSec).toBeDefined();

    // Verify bitmasks match exactly on Saturday
    const fydpMask = computeSectionMask(fydpSecB!);
    const realLabMask = computeSectionMask(realLabSec!);
    // Day 0 is Sat in solver day mapping [Sat, Sun, Mon, Tue, Wed]
    expect(fydpMask[0]).toBe(realLabMask[0]);
    expect(fydpMask[0]).not.toBe(0n);
  });

  it('2. Selecting FYDP plus CSE 4509 returns routines where no CSE 4509 section overlaps Sat 11:11-13:40, and every routine contains FYDP Section I', () => {
    const { sections: overlaidSections } = applyFixedCourseOverlay(allCourses, rawSections);

    const request: SolveRequest = {
      selectedCourses: ['CSE 4000A', 'CSE 4509'],
      lockedSections: {},
      preferredFaculty: {},
      avoidFaculty: {},
      dayOffFilters: [],
      timeRestrictions: {
        earliestStart: null,
        latestEnd: null,
        maxGapMinutes: null,
      },
      weights: defaultWeights,
    };

    const result = solveSchedules(overlaidSections, request);
    expect(result.schedules.length).toBeGreaterThan(0);

    // Check every returned routine
    for (const routine of result.schedules) {
      // Must contain CSE 4000A Section I
      const fydpInRoutine = routine.sections.find((s) => s.courseCode === 'CSE 4000A');
      expect(fydpInRoutine).toBeDefined();
      expect(fydpInRoutine?.section).toBe('I');

      // CSE 4509 section in routine must NOT be Section B (which runs Sat 751-830 and clashes)
      const cse4509InRoutine = routine.sections.find((s) => s.courseCode === 'CSE 4509');
      expect(cse4509InRoutine).toBeDefined();
      expect(cse4509InRoutine?.section).not.toBe('B');

      // Double check that CSE 4509 section does not overlap Sat 11:11-13:40 (671-820)
      for (const m of cse4509InRoutine!.meetings) {
        if (m.day === 'Sat') {
          const overlaps = m.start < 820 && m.end > 671;
          expect(overlaps).toBe(false);
        }
      }
    }
  });

  it('3. A course whose only sections clash with FYDP produces the allSectionsClash warning without crashing', () => {
    const { sections: overlaidSections } = applyFixedCourseOverlay(allCourses, rawSections);

    // CSE 4817 has only Section A (Sat 751-830 & Tue 751-830), which clashes with Saturday 11:11-13:40 (671-820)
    const clashes = computeFYDPClashes(['CSE 4000A', 'CSE 4817'], overlaidSections);
    const cse4817Clash = clashes.get('CSE 4817');

    expect(cse4817Clash).toBeDefined();
    expect(cse4817Clash?.totalSections).toBe(1);
    expect(cse4817Clash?.availableSections).toBe(0);
    expect(cse4817Clash?.allSectionsClash).toBe(true);
    expect(cse4817Clash?.hiddenSections.length).toBe(1);
    expect(cse4817Clash?.hiddenSections[0].section).toBe('A');

    // Solver safely returns 0 schedules without error
    const request: SolveRequest = {
      selectedCourses: ['CSE 4000A', 'CSE 4817'],
      lockedSections: {},
      preferredFaculty: {},
      avoidFaculty: {},
      dayOffFilters: [],
      timeRestrictions: {
        earliestStart: null,
        latestEnd: null,
        maxGapMinutes: null,
      },
      weights: defaultWeights,
    };

    const result = solveSchedules(overlaidSections, request);
    expect(result.schedules.length).toBe(0);
  });

  it('3b. Synthetic fixture: a synthetic course with all sections clashing produces allSectionsClash: true and 0 routines', () => {
    const syntheticSection: Section = {
      id: 'TEST-COURSE-A',
      sl: 9999,
      program: 'BSCSE',
      courseCode: 'TEST 9999',
      title: 'Clashing Test Course',
      section: 'A',
      credit: 3,
      kind: 'theory',
      meetings: [{ day: 'Sat', start: 700, end: 800, room: '101' }],
      faculty: ['Prof. Test'],
      facultyIds: ['prof-test'],
      tentative: false,
    };

    const combinedSections = [...rawSections, syntheticSection];
    const { sections: overlaid } = applyFixedCourseOverlay(allCourses, combinedSections);

    const clashes = computeFYDPClashes(['CSE 4000A', 'TEST 9999'], overlaid);
    const clashInfo = clashes.get('TEST 9999');
    expect(clashInfo?.allSectionsClash).toBe(true);
    expect(clashInfo?.availableSections).toBe(0);

    const result = solveSchedules(
      overlaid,
      {
        selectedCourses: ['CSE 4000A', 'TEST 9999'],
        lockedSections: {},
        preferredFaculty: {},
        avoidFaculty: {},
        dayOffFilters: [],
        timeRestrictions: {
          earliestStart: null,
          latestEnd: null,
          maxGapMinutes: null,
        },
        weights: defaultWeights,
      }
    );
    expect(result.schedules).toHaveLength(0);
  });

  it('4. Touching times (ending at 11:10 or starting at 13:41) are not treated as clashes', () => {
    // FYDP slot: 11:11 to 13:40 -> 671 to 820
    const fydpIntervalMask = computeIntervalMask(671, 820);

    // Section ending at 11:10 -> 591 to 670 (09:51 AM to 11:10 AM slot)
    const precedingSlotMask = computeIntervalMask(591, 670);
    expect(fydpIntervalMask & precedingSlotMask).toBe(0n);

    // Section starting at 13:41 -> 821 to 900
    const succeedingSlotMask = computeIntervalMask(821, 900);
    expect(fydpIntervalMask & succeedingSlotMask).toBe(0n);

    // Section starting at 13:40 -> 820 to 900 (slot Math.floor(820/5) = 164)
    const boundaryAt1340 = computeIntervalMask(820, 900);
    expect(fydpIntervalMask & boundaryAt1340).toBe(0n);
  });

  it('5. Adding more days to meetings (Sunday, Tuesday, Wednesday) works without other code changes', () => {
    const multiDayConfig: FixedCourseConfig = {
      courseCodes: ['CSE 4000A'],
      sectionLabel: 'I',
      meetings: [
        { day: 'Saturday', start: '11:11', end: '13:40' },
        { day: 'Tuesday', start: '11:11', end: '13:40' },
      ],
      room: '101',
      faculty: 'Dr. Fixed',
    };

    const { sections } = applyFixedCourseOverlay(allCourses, rawSections, multiDayConfig);
    const secI = sections.find((s) => s.courseCode === 'CSE 4000A');
    expect(secI).toBeDefined();
    expect(secI?.meetings).toHaveLength(2);
    expect(secI?.meetings[0].day).toBe('Sat');
    expect(secI?.meetings[1].day).toBe('Tue');

    const mask = computeSectionMask(secI!);
    // Day 0: Sat, Day 3: Tue
    expect(mask[0]).not.toBe(0n);
    expect(mask[3]).not.toBe(0n);
    expect(mask[1]).toBe(0n); // Sun
    expect(mask[2]).toBe(0n); // Mon
    expect(mask[4]).toBe(0n); // Wed

    const desc = getFixedScheduleDescription(multiDayConfig);
    expect(desc).toContain('Sat 11:11 AM–01:40 PM');
    expect(desc).toContain('Tue 11:11 AM–01:40 PM');
  });

  it('6. Search "fydp" finds the FYDP courses and header section count stays 791', () => {
    const { courses, sections } = applyFixedCourseOverlay(allCourses, rawSections);
    const searchIndex = buildCourseSearchIndex(courses, sections);
    const results = searchCourses('fydp', searchIndex);

    const resultCodes = results.map((r) => r.code);
    expect(resultCodes).toContain('CSE 4000A');
    expect(resultCodes).toContain('CSE 4000B');
    expect(resultCodes).toContain('CSE 4000C');

    // Header section count comes from the raw data files
    expect(rawSections.length).toBe(791);
    expect(allCourses.length).toBe(107);
  });
});
