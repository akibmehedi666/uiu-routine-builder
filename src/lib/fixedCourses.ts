import { Course, Day, Meeting, Section } from '../types';
import { computeIntervalMask, computeSectionMask, hasOverlap, ScheduleBitmask } from '../solver/bitmask';
import { formatTime24 } from '../utils/export';

export interface FixedMeetingConfig {
  day: Day | 'Saturday' | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | string;
  start: string; // e.g. '11:11'
  end: string;   // e.g. '13:40'
  room?: string;
}

export interface FixedCourseConfig {
  courseCodes: string[];
  sectionLabel: string;
  meetings: FixedMeetingConfig[];
  room?: string;
  faculty?: string;
}

/**
 * Editable FYDP configuration.
 * Easy to edit in one place (e.g. to add Sunday, Tuesday, or Wednesday meetings).
 */
export const FYDP_FIXED: FixedCourseConfig = {
  courseCodes: ['CSE 4000A', 'CSE 4000B', 'CSE 4000C'], // FYDP courses
  sectionLabel: 'I',
  meetings: [{ day: 'Saturday', start: '11:11', end: '13:40' }],
  room: undefined,    // unknown; never invent a room
  faculty: undefined, // unknown; show 'Faculty TBA'
};

/**
 * Normalizes day string (e.g. 'Saturday' -> 'Sat', 'Sunday' -> 'Sun')
 */
export function normalizeDay(day: string): Day {
  const lower = day.trim().toLowerCase();
  if (lower.startsWith('sat')) return 'Sat';
  if (lower.startsWith('sun')) return 'Sun';
  if (lower.startsWith('mon')) return 'Mon';
  if (lower.startsWith('tue')) return 'Tue';
  if (lower.startsWith('wed')) return 'Wed';
  return 'Sat';
}

/**
 * Parses 'HH:MM' string to minutes from 00:00.
 * '11:11' -> 671, '13:40' -> 820.
 */
export function parseTimeString(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return h * 60 + m;
}

/**
 * Checks if a course code is a configured fixed course.
 */
export function isFixedCourse(courseCode: string, config: FixedCourseConfig = FYDP_FIXED): boolean {
  return config.courseCodes.includes(courseCode);
}

/**
 * Human-readable string for the fixed schedule.
 * E.g. "Sat 11:11 AM-01:40 PM" or "Sat, Sun 11:11 AM-01:40 PM"
 */
export function getFixedScheduleDescription(config: FixedCourseConfig = FYDP_FIXED): string {
  if (!config.meetings.length) return 'Fixed Schedule';
  return config.meetings
    .map((m) => {
      const d = normalizeDay(m.day);
      const startMin = parseTimeString(m.start);
      const endMin = parseTimeString(m.end);
      return `${d} ${formatTime24(startMin)}–${formatTime24(endMin)}`;
    })
    .join(', ');
}

/**
 * Returns a human-friendly title for synthetic FYDP courses if missing from courses.json.
 */
function getFYDPCourseTitle(code: string): string {
  if (code.endsWith('A')) return 'Final Year Design Project - I';
  if (code.endsWith('B')) return 'Final Year Design Project - II';
  if (code.endsWith('C')) return 'Final Year Design Project - III';
  return 'Final Year Design Project';
}

/**
 * Builds the canonical Section object for a fixed course.
 */
export function buildFixedSection(
  courseCode: string,
  courseTitle: string,
  credit: number,
  existingSection?: Section,
  config: FixedCourseConfig = FYDP_FIXED
): Section {
  const meetings: Meeting[] = config.meetings.map((m) => ({
    day: normalizeDay(m.day),
    start: parseTimeString(m.start),
    end: parseTimeString(m.end),
    room: m.room || config.room || existingSection?.meetings?.[0]?.room || null,
  }));

  const faculty = config.faculty
    ? [config.faculty]
    : existingSection?.faculty?.length
    ? existingSection.faculty
    : ['Faculty TBA'];

  const facultyIds = config.faculty
    ? [config.faculty.toLowerCase().replace(/[^a-z0-9]/g, '-')]
    : existingSection?.facultyIds?.length
    ? existingSection.facultyIds
    : [];

  return {
    id: existingSection?.id || `BSCSE-${courseCode}-${config.sectionLabel}`,
    sl: existingSection?.sl || 9500,
    program: 'BSCSE',
    courseCode,
    title: courseTitle,
    section: config.sectionLabel,
    credit,
    kind: 'single-day-theory',
    meetings,
    faculty,
    facultyIds,
    tentative: false,
    fixed: true,
    synthetic: !existingSection,
  };
}

/**
 * Applies the fixed-course UI-layer overlay.
 * - Injects synthetic Course objects for any configured codes not present in courses.json.
 * - Replaces multiple sections with exactly ONE fixed section (Section I) for each fixed course code.
 * - Never modifies the input data arrays.
 */
export function applyFixedCourseOverlay(
  courses: Course[],
  sections: Section[],
  config: FixedCourseConfig = FYDP_FIXED
): { courses: Course[]; sections: Section[] } {
  const fixedCodesSet = new Set(config.courseCodes);

  // 1. Overlay courses
  const existingCodeSet = new Set(courses.map((c) => c.code));
  const newCourses: Course[] = [...courses];

  for (const code of config.courseCodes) {
    if (!existingCodeSet.has(code)) {
      newCourses.push({
        code,
        title: getFYDPCourseTitle(code),
        program: 'BSCSE',
        credit: 2,
        hasLab: false,
      });
      existingCodeSet.add(code);
    }
  }

  // 2. Overlay sections
  const fixedSectionsToAdd: Section[] = [];

  for (const code of config.courseCodes) {
    const courseObj = newCourses.find((c) => c.code === code);
    const title = courseObj?.title || getFYDPCourseTitle(code);
    const credit = courseObj?.credit ?? 2;

    const existingSecI = sections.find(
      (s) => s.courseCode === code && s.section.toUpperCase() === config.sectionLabel.toUpperCase()
    );

    const fixedSection = buildFixedSection(code, title, credit, existingSecI, config);
    fixedSectionsToAdd.push(fixedSection);
  }

  // Filter out any existing sections for fixed course codes, then add the single fixed sections
  const nonFixedSections = sections.filter((s) => !fixedCodesSet.has(s.courseCode));
  const newSections = [...nonFixedSections, ...fixedSectionsToAdd];

  return {
    courses: newCourses,
    sections: newSections,
  };
}

export interface FYDPHiddenSection {
  section: string;
  clashTimes: string;
}

export interface CourseFYDPClashInfo {
  courseCode: string;
  totalSections: number;
  availableSections: number;
  hiddenSections: FYDPHiddenSection[];
  allSectionsClash: boolean;
}

/**
 * Computes which sections of selected courses clash with the active FYDP slot(s).
 * Pure read-only computation using bitmasks without modifying the solver.
 */
export function computeFYDPClashes(
  selectedCourses: string[],
  allSections: Section[],
  config: FixedCourseConfig = FYDP_FIXED
): Map<string, CourseFYDPClashInfo> {
  const clashMap = new Map<string, CourseFYDPClashInfo>();

  // Check if any FYDP course is selected
  const selectedFYDPCodes = selectedCourses.filter((code) => isFixedCourse(code, config));
  if (selectedFYDPCodes.length === 0) return clashMap;

  // Compute union bitmask of all active FYDP fixed sections
  const fydpSections = allSections.filter(
    (s) => selectedFYDPCodes.includes(s.courseCode) && s.section === config.sectionLabel
  );

  if (fydpSections.length === 0) return clashMap;

  let fydpMask: ScheduleBitmask = [0n, 0n, 0n, 0n, 0n];
  for (const fSec of fydpSections) {
    const sMask = computeSectionMask(fSec);
    fydpMask = [
      fydpMask[0] | sMask[0],
      fydpMask[1] | sMask[1],
      fydpMask[2] | sMask[2],
      fydpMask[3] | sMask[3],
      fydpMask[4] | sMask[4],
    ];
  }

  // Group sections by course
  const sectionsByCourse = new Map<string, Section[]>();
  for (const sec of allSections) {
    if (!sectionsByCourse.has(sec.courseCode)) {
      sectionsByCourse.set(sec.courseCode, []);
    }
    sectionsByCourse.get(sec.courseCode)!.push(sec);
  }

  // Analyze each non-FYDP selected course
  for (const courseCode of selectedCourses) {
    if (isFixedCourse(courseCode, config)) continue;

    const courseSecs = sectionsByCourse.get(courseCode) || [];
    if (courseSecs.length === 0) continue;

    const hiddenSections: FYDPHiddenSection[] = [];

    for (const sec of courseSecs) {
      const secMask = computeSectionMask(sec);
      if (hasOverlap(secMask, fydpMask)) {
        const meetingTimes = sec.meetings
          .map((m) => `${m.day} ${formatTime24(m.start)}–${formatTime24(m.end)}`)
          .join(', ');
        hiddenSections.push({
          section: sec.section,
          clashTimes: meetingTimes,
        });
      }
    }

    const totalSections = courseSecs.length;
    const availableSections = totalSections - hiddenSections.length;
    const allSectionsClash = availableSections === 0 && totalSections > 0;

    if (hiddenSections.length > 0) {
      clashMap.set(courseCode, {
        courseCode,
        totalSections,
        availableSections,
        hiddenSections,
        allSectionsClash,
      });
    }
  }

  return clashMap;
}
