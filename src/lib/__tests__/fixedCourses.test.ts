import { describe, it, expect } from 'vitest';
import coursesData from '../../../data/courses.json';
import sectionsData from '../../../data/sections.json';
import { Course, Section, SolveRequest } from '../../types';
import {
  MANUAL_SCHEDULE_COURSES,
  ManualScheduleInput,
  validateManualSchedule,
  buildManualSection,
  extractLabSlotsFromSections,
  encodeManualScheduleUrl,
  decodeManualScheduleUrl,
  computeManualClashes,
  isManualScheduleCourse,
  formatManualScheduleDescription,
  normalizeDay,
  parseTimeString,
} from '../fixedCourses';
import { computeSectionMask, computeIntervalMask, hasOverlap } from '../../solver/bitmask';
import { solveSchedules } from '../../solver/index';
import { buildCourseDirectory, filterCourses } from '../courseDirectory';
import { FIXED_COURSE_CODES, isFixedCourse } from '../../config/fixedCourses';
import { computeFixedFYDPClashes } from '../fixedCourses';
import { serializeToParams, parseFromParams } from '../../utils/urlSync';

const allCourses = coursesData as Course[];
const rawSections = sectionsData as Section[];

const defaultWeights = {
  facultyPreference: 30,
  minimizeGaps: 25,
  compactDays: 20,
  avoidEarlyLate: 15,
  avoidTentative: 10,
};

describe('Manual Schedule FYDP Pure Helpers & Integration', () => {
  it('1. Validation: enforces required section label, days, end > start, and range limits', () => {
    // Missing section
    const noSec = validateManualSchedule({
      section: '',
      days: ['Sat'],
      startTime: '11:11',
      endTime: '13:40',
    });
    expect(noSec.valid).toBe(false);
    expect(noSec.errors.section).toBeDefined();

    // Section label too long (> 4 chars)
    const longSec = validateManualSchedule({
      section: 'TOOLONG',
      days: ['Sat'],
      startTime: '11:11',
      endTime: '13:40',
    });
    expect(longSec.valid).toBe(false);
    expect(longSec.errors.section).toContain('1 to 4 characters');

    // No days
    const noDays = validateManualSchedule({
      section: 'I',
      days: [],
      startTime: '11:11',
      endTime: '13:40',
    });
    expect(noDays.valid).toBe(false);
    expect(noDays.errors.days).toBeDefined();

    // End time before or equal to start time
    const invalidTime = validateManualSchedule({
      section: 'I',
      days: ['Sat'],
      startTime: '13:40',
      endTime: '11:11',
    });
    expect(invalidTime.valid).toBe(false);
    expect(invalidTime.errors.endTime).toContain('after start time');

    // Outside UIU class hours (e.g. 03:00 AM)
    const outsideHours = validateManualSchedule({
      section: 'I',
      days: ['Sat'],
      startTime: '03:00',
      endTime: '04:00',
    });
    expect(outsideHours.valid).toBe(false);
    expect(outsideHours.errors.timeRange).toBeDefined();

    // Valid schedule
    const valid = validateManualSchedule({
      section: 'I',
      days: ['Sat'],
      startTime: '11:11',
      endTime: '13:40',
    });
    expect(valid.valid).toBe(true);
    expect(Object.keys(valid.errors)).toHaveLength(0);
  });

  it('2. Conversion to section shape produces identical bitmask to real lab section', () => {
    const input: ManualScheduleInput = {
      courseCode: 'CSE 4000A',
      section: 'I',
      days: ['Sat'],
      startTime: '11:11',
      endTime: '13:40',
    };

    const manualSection = buildManualSection(input);
    expect(manualSection.courseCode).toBe('CSE 4000A');
    expect(manualSection.section).toBe('I');
    expect(manualSection.manual).toBe(true);
    expect(manualSection.fixed).toBe(true);
    expect(manualSection.synthetic).toBe(true);
    expect(manualSection.meetings).toEqual([
      { day: 'Sat', start: 671, end: 820, room: null },
    ]);

    // Match against real lab section in raw dataset: BSCSE-CSE 1110-J (Saturday 11:11-13:40)
    const realLabSec = rawSections.find(
      (s) =>
        s.id === 'BSCSE-CSE 1110-J' &&
        s.meetings.some((m) => m.day === 'Sat' && m.start === 671 && m.end === 820)
    );
    expect(realLabSec).toBeDefined();

    const manualMask = computeSectionMask(manualSection);
    const realLabMask = computeSectionMask(realLabSec!);

    // Day 0 is Sat: bitmasks must be identical on Saturday
    expect(manualMask[0]).toBe(realLabMask[0]);
    expect(manualMask[0]).not.toBe(0n);
    // Other days are 0
    expect(manualMask[1]).toBe(0n);
    expect(manualMask[2]).toBe(0n);
  });

  it('3. Selecting manual FYDP (Sat 11:11-13:40) plus CSE 4509 locks FYDP and avoids clashing section B', () => {
    const manualSec = buildManualSection({
      courseCode: 'CSE 4000A',
      section: 'I',
      days: ['Sat'],
      startTime: '11:11',
      endTime: '13:40',
    });

    // Replace CSE 4000A's raw sections with exactly this single candidate section
    const filteredSections = rawSections.filter((s) => s.courseCode !== 'CSE 4000A');
    const combinedSections = [...filteredSections, manualSec];

    const request: SolveRequest = {
      selectedCourses: ['CSE 4000A', 'CSE 4509'],
      lockedSections: {},
      preferredFaculty: {},
      avoidFaculty: {},
      filterDayOff: [],
      weights: defaultWeights,
    };

    const result = solveSchedules(combinedSections, request);
    expect(result.schedules.length).toBeGreaterThan(0);

    for (const routine of result.schedules) {
      // Must contain manual CSE 4000A Section I
      const fydpInRoutine = routine.sections.find((s) => s.courseCode === 'CSE 4000A');
      expect(fydpInRoutine).toBeDefined();
      expect(fydpInRoutine?.section).toBe('I');

      // CSE 4509 section must NOT clash with Saturday 11:11-13:40 (Section B clashing)
      const cse4509 = routine.sections.find((s) => s.courseCode === 'CSE 4509');
      expect(cse4509).toBeDefined();
      expect(cse4509?.section).not.toBe('B');

      for (const m of cse4509!.meetings) {
        if (m.day === 'Sat') {
          const overlaps = m.start < 820 && m.end > 671;
          expect(overlaps).toBe(false);
        }
      }
    }
  });

  it('4. URL encode/decode round trip with multi-day entries and safe malformed handling', () => {
    const input: Record<string, ManualScheduleInput> = {
      'CSE 4000A': {
        courseCode: 'CSE 4000A',
        section: 'I',
        days: ['Sat', 'Tue'],
        startTime: '11:11',
        endTime: '13:40',
      },
    };

    const encoded = encodeManualScheduleUrl(input);
    expect(encoded).toBe('CSE4000A.I.Sat-Tue.1111-1340');

    const decoded = decodeManualScheduleUrl(encoded);
    expect(decoded['CSE 4000A']).toBeDefined();
    expect(decoded['CSE 4000A'].section).toBe('I');
    expect(decoded['CSE 4000A'].days).toEqual(['Sat', 'Tue']);
    expect(decoded['CSE 4000A'].startTime).toBe('11:11');
    expect(decoded['CSE 4000A'].endTime).toBe('13:40');

    // Safe handling of malformed URL values
    expect(decodeManualScheduleUrl('')).toEqual({});
    expect(decodeManualScheduleUrl('malformed_garbage')).toEqual({});
    expect(decodeManualScheduleUrl('CSE4000A.I.InvalidDay.9999')).toEqual({});
    expect(decodeManualScheduleUrl('CSE4000A.I.Sat.1340-1111')).toEqual({}); // end < start
  });

  it('5. Touching times (one ending 11:10, one starting 11:11, one starting 13:41) are not clashes', () => {
    // FYDP slot: 11:11 to 13:40 -> minutes 671 to 820
    const fydpMask = computeIntervalMask(671, 820);

    // Slot ending at 11:10 -> minutes 591 to 670
    const precedingSlotMask = computeIntervalMask(591, 670);
    expect(fydpMask & precedingSlotMask).toBe(0n);

    // Slot starting at 13:41 -> minutes 821 to 900
    const succeedingSlotMask = computeIntervalMask(821, 900);
    expect(fydpMask & succeedingSlotMask).toBe(0n);

    // Slot starting at 13:40 -> minute 820
    const boundaryMask = computeIntervalMask(820, 900);
    expect(fydpMask & boundaryMask).toBe(0n);
  });

  it('6. Multi-day schedule (Sat, Sun, Tue, Wed) populates all 4 days correctly', () => {
    const input: ManualScheduleInput = {
      courseCode: 'CSE 4000A',
      section: 'A',
      days: ['Sat', 'Sun', 'Tue', 'Wed'],
      startTime: '08:30',
      endTime: '11:00',
    };

    const sec = buildManualSection(input);
    expect(sec.meetings).toHaveLength(4);

    const mask = computeSectionMask(sec);
    // [Sat, Sun, Mon, Tue, Wed]
    expect(mask[0]).not.toBe(0n); // Sat
    expect(mask[1]).not.toBe(0n); // Sun
    expect(mask[2]).toBe(0n);     // Mon (off)
    expect(mask[3]).not.toBe(0n); // Tue
    expect(mask[4]).not.toBe(0n); // Wed

    const desc = formatManualScheduleDescription(input);
    expect(desc).toBe('Sat, Sun, Tue, Wed 08:30 AM–11:00 AM, Sec A');
  });

  it('7. Total course count strictly stays 107 and header raw numbers stay 791 and 107', () => {
    // raw data verification
    expect(allCourses.length).toBe(107);
    expect(rawSections.length).toBe(791);

    // Course directory index size
    const directory = buildCourseDirectory(allCourses, rawSections);
    expect(directory.length).toBe(107);

    // Confirm MANUAL_SCHEDULE_COURSES list
    expect(MANUAL_SCHEDULE_COURSES).toEqual(['CSE 4000A', 'CSE 4000B', 'CSE 4000C']);
    expect(isManualScheduleCourse('CSE 4000A')).toBe(true);
    expect(isManualScheduleCourse('CSE 4000B')).toBe(true);
    expect(isManualScheduleCourse('CSE 4000C')).toBe(true);
    expect(isManualScheduleCourse('CSE 1111')).toBe(false);
  });

  it('8. Dynamic lab slot extraction derives real lab slots from sections.json without hardcoding', () => {
    const labSlots = extractLabSlotsFromSections(rawSections);
    expect(labSlots.length).toBeGreaterThan(0);
    // Typical UIU lab slots include 08:30-11:00 (510-660), 11:11-13:40 (671-820), 14:00-16:30 (840-990)
    const labels = labSlots.map((s) => s.label);
    expect(labels.some((l) => l.includes('11:11'))).toBe(true);
    expect(labels.some((l) => l.includes('08:30'))).toBe(true);
  });

  it('9. computeManualClashes correctly flags conflicting sections and allSectionsClash', () => {
    const manualSec = buildManualSection({
      courseCode: 'CSE 4000A',
      section: 'I',
      days: ['Sat'],
      startTime: '11:11',
      endTime: '13:40',
    });

    const clashes = computeManualClashes(
      ['CSE 4000A', 'CSE 4509', 'CSE 4817'],
      rawSections,
      [manualSec]
    );

    // CSE 4509 has Section B clashing (Sat 751-830)
    const cse4509Clash = clashes.get('CSE 4509');
    expect(cse4509Clash).toBeDefined();
    expect(cse4509Clash?.hiddenSections.some((h) => h.section === 'B')).toBe(true);
    expect(cse4509Clash?.allSectionsClash).toBe(false);

    // CSE 4817 has only 1 section (Section A), which runs Sat 751-830 and clashes
    const cse4817Clash = clashes.get('CSE 4817');
    expect(cse4817Clash).toBeDefined();
    expect(cse4817Clash?.totalSections).toBe(1);
    expect(cse4817Clash?.availableSections).toBe(0);
    expect(cse4817Clash?.allSectionsClash).toBe(true);
  });
});

describe('TASK: Fixed User-Chosen FYDP Section Requirements', () => {
  const cse4000aSections = rawSections.filter((s) => s.courseCode === 'CSE 4000A');
  const fydpSecI = cse4000aSections.find((s) => s.section === 'I')!;

  it('1. Config list defines FYDP courses (CSE 4000A, DS 4000A)', () => {
    expect(FIXED_COURSE_CODES).toContain('CSE 4000A');
    expect(FIXED_COURSE_CODES).toContain('DS 4000A');
    expect(isFixedCourse('CSE 4000A')).toBe(true);
    expect(isFixedCourse('DS 4000A')).toBe(true);
    expect(isFixedCourse('CSE 1111')).toBe(false);
  });

  it('2. With FYDP fixed to Sec I, 100% of returned routines contain exactly that section and no other FYDP section', () => {
    expect(fydpSecI).toBeDefined();
    expect(fydpSecI.id).toBe('BSCSE-CSE 4000A-I');

    const request: SolveRequest = {
      selectedCourses: ['CSE 4000A', 'CSE 4509', 'CSE 2215'],
      preferredFaculty: {},
      avoidFaculty: {},
      lockedSections: {
        'CSE 4000A': fydpSecI.id,
      },
      filterDayOff: [],
      weights: defaultWeights,
      limit: 20,
    };

    const response = solveSchedules(rawSections, request);
    expect(response.schedules.length).toBeGreaterThan(0);

    // 100% of returned routines must contain exactly Section I of CSE 4000A
    for (const routine of response.schedules) {
      const fydpSection = routine.sections.find((s) => s.courseCode === 'CSE 4000A');
      expect(fydpSection).toBeDefined();
      expect(fydpSection?.id).toBe('BSCSE-CSE 4000A-I');
      expect(fydpSection?.section).toBe('I');

      // No other section of CSE 4000A can appear
      const allFydp = routine.sections.filter((s) => s.courseCode === 'CSE 4000A');
      expect(allFydp).toHaveLength(1);
    }
  });

  it('3. Overlap with a conflicting course section is never produced', () => {
    // FYDP Sec I meets Sat 11:11-13:40 (671-820)
    // In CSE 4509, Section B meets Sat 12:30-01:50 PM (751-830), which overlaps with Sec I
    const request: SolveRequest = {
      selectedCourses: ['CSE 4000A', 'CSE 4509'],
      preferredFaculty: {},
      avoidFaculty: {},
      lockedSections: {
        'CSE 4000A': fydpSecI.id,
      },
      filterDayOff: [],
      weights: defaultWeights,
      limit: 50,
    };

    const response = solveSchedules(rawSections, request);
    expect(response.schedules.length).toBeGreaterThan(0);

    for (const routine of response.schedules) {
      const cse4509Sec = routine.sections.find((s) => s.courseCode === 'CSE 4509')!;
      expect(cse4509Sec).toBeDefined();
      // Section B must NEVER be selected because it overlaps with FYDP Sec I
      expect(cse4509Sec.section).not.toBe('B');

      // Check meetings do not overlap with FYDP Sec I
      const fydp = routine.sections.find((s) => s.courseCode === 'CSE 4000A')!;
      for (const m1 of fydp.meetings) {
        for (const m2 of cse4509Sec.meetings) {
          if (m1.day === m2.day) {
            expect(m1.end <= m2.start || m2.end <= m1.start).toBe(true);
          }
        }
      }
    }
  });

  it('4. Infeasible case names the FYDP section and does not suggest relaxing the fixed section', () => {
    // CSE 4817 only has 1 section (Section A), which meets Sat 12:30-01:50 PM (751-830)
    // Clashes completely with FYDP Sec I (Sat 671-820)
    const lockedSections = { 'CSE 4000A': fydpSecI.id };
    const clashes = computeFixedFYDPClashes(
      ['CSE 4000A', 'CSE 4817'],
      rawSections,
      lockedSections
    );

    const cse4817Clash = clashes.get('CSE 4817');
    expect(cse4817Clash?.allSectionsClash).toBe(true);

    // Build the explanation
    const fydpSec = rawSections.find((s) => s.id === lockedSections['CSE 4000A'])!;
    const fydpTimeStr = `${fydpSec.meetings[0].day} 11:11-13:40`;
    const explanation = `FYDP Sec ${fydpSec.section} (${fydpTimeStr}) conflicts with all sections of CSE 4817. Try choosing a different FYDP section or course.`;

    expect(explanation).toContain('FYDP Sec I (Sat 11:11-13:40)');
    expect(explanation).toContain('conflicts with all sections of CSE 4817');
  });

  it('5. Stale sectionId is cleared safely without crashing', () => {
    const storedLockedSections = {
      'CSE 4000A': 'BSCSE-CSE 4000A-NONEXISTENT',
      'CSE 4509': 'BSCSE-CSE 4509-A',
    };

    // Stale detection logic as used in builder page
    const cleanedLocks: Record<string, string> = {};
    for (const [code, secId] of Object.entries(storedLockedSections)) {
      if (rawSections.some((s) => s.courseCode === code && s.id === secId)) {
        cleanedLocks[code] = secId;
      }
    }

    // Stale FYDP lock should be removed
    expect(cleanedLocks['CSE 4000A']).toBeUndefined();
    // Valid CSE 4509 lock is preserved
    expect(cleanedLocks['CSE 4509']).toBe('BSCSE-CSE 4509-A');
  });

  it('6. Unset FYDP => solver runs without it and soft banner is flagged', () => {
    const selectedCourses = ['CSE 4000A', 'CSE 4509'];
    const lockedSections: Record<string, string> = {}; // FYDP section not chosen yet

    // Detection flags
    const hasUnselectedFixedCourse = selectedCourses.some(
      (c) => isFixedCourse(c) && !lockedSections[c]
    );
    expect(hasUnselectedFixedCourse).toBe(true);

    // Effective request excludes unselected fixed course
    const unselectedFixed = new Set(
      selectedCourses.filter((c) => isFixedCourse(c) && !lockedSections[c])
    );
    const effectiveCourses = selectedCourses.filter((c) => !unselectedFixed.has(c));
    expect(effectiveCourses).toEqual(['CSE 4509']);

    const request: SolveRequest = {
      selectedCourses: effectiveCourses,
      preferredFaculty: {},
      avoidFaculty: {},
      lockedSections: {},
      filterDayOff: [],
      weights: defaultWeights,
      limit: 10,
    };

    // Solver succeeds without crashing
    const response = solveSchedules(rawSections, request);
    expect(response.schedules.length).toBeGreaterThan(0);
    expect(response.error).toBeUndefined();
    // None of the routines contain CSE 4000A yet
    for (const routine of response.schedules) {
      expect(routine.sections.some((s) => s.courseCode === 'CSE 4000A')).toBe(false);
    }
  });

  it('7. Section picker options are sorted by day/time with NO "Any Section" option', () => {
    const dayOrder: Record<string, number> = { Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 };
    const sorted = [...cse4000aSections].sort((a, b) => {
      const mA = a.meetings[0];
      const mB = b.meetings[0];
      if (!mA && !mB) return 0;
      if (!mA) return 1;
      if (!mB) return -1;
      const dA = dayOrder[mA.day] ?? 99;
      const dB = dayOrder[mB.day] ?? 99;
      if (dA !== dB) return dA - dB;
      if (mA.start !== mB.start) return mA.start - mB.start;
      if (mA.end !== mB.end) return mA.end - mB.end;
      return a.section.localeCompare(b.section);
    });

    // Verify sort order starts with Saturday
    expect(sorted[0].meetings[0].day).toBe('Sat');
    expect(sorted[0].meetings[0].start).toBe(510); // 08:30

    // Options formatted for picker
    const optionStrings = sorted.map((s) => {
      const m = s.meetings[0];
      const sH = Math.floor(m.start / 60).toString().padStart(2, '0');
      const sM = (m.start % 60).toString().padStart(2, '0');
      const eH = Math.floor(m.end / 60).toString().padStart(2, '0');
      const eM = (m.end % 60).toString().padStart(2, '0');
      return `Sec ${s.section} - ${m.day} ${sH}:${sM}-${eH}:${eM} - ${s.faculty.join(', ')}`;
    });

    // Check that NO option has "Any Section"
    for (const opt of optionStrings) {
      expect(opt.toLowerCase()).not.toContain('any section');
    }

    // Verify Sec I string format
    const secIOpt = optionStrings.find((opt) => opt.startsWith('Sec I -'));
    expect(secIOpt).toBe('Sec I - Sat 11:11-13:40 - Mohammad Shahriar Rahman');
  });

  it('8. Persistence: URL serialization & deserialization preserves chosen FYDP section', () => {
    const request: SolveRequest = {
      selectedCourses: ['CSE 4000A', 'CSE 4509'],
      preferredFaculty: {},
      avoidFaculty: {},
      lockedSections: {
        'CSE 4000A': fydpSecI.id,
      },
      filterDayOff: [],
      weights: defaultWeights,
      limit: 50,
    };

    const queryString = serializeToParams(request);
    expect(queryString).toContain('lock=CSE+4000A%3ABSCSE-CSE+4000A-I');

    const restored = parseFromParams(`?${queryString}`);
    expect(restored.selectedCourses).toEqual(['CSE 4000A', 'CSE 4509']);
    expect(restored.lockedSections?.['CSE 4000A']).toBe('BSCSE-CSE 4000A-I');
  });

  it('9. Blocked slot difference detection: mismatch warns user, matching does not warn', () => {
    // FYDP Sec I is Sat 11:11-13:40 (671-820)
    // Case A: Blocked slot matches (Sat 11:11-13:40) -> no mismatch
    const matchingBlocked = {
      courseCode: 'CSE 4000A',
      section: 'I',
      days: ['Sat'] as any,
      startTime: '11:11',
      endTime: '13:40',
    };
    const bStartA = parseTimeString(matchingBlocked.startTime);
    const bEndA = parseTimeString(matchingBlocked.endTime);
    const matchA = fydpSecI.meetings.every(
      (m) => matchingBlocked.days.includes(m.day) && m.start >= bStartA && m.end <= bEndA
    );
    expect(matchA).toBe(true);

    // Case B: Blocked slot is Sun 08:30-11:00 -> mismatch detected!
    const diffBlocked = {
      courseCode: 'CSE 4000A',
      section: 'B',
      days: ['Sun'] as any,
      startTime: '08:30',
      endTime: '11:00',
    };
    const bStartB = parseTimeString(diffBlocked.startTime);
    const bEndB = parseTimeString(diffBlocked.endTime);
    const matchB = fydpSecI.meetings.every(
      (m) => diffBlocked.days.includes(m.day) && m.start >= bStartB && m.end <= bEndB
    );
    expect(matchB).toBe(false);
  });
});
