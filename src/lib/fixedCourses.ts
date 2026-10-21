import { Course, Day, Meeting, Section } from '../types';
import { computeIntervalMask, computeSectionMask, hasOverlap, ScheduleBitmask } from '../solver/bitmask';
import { formatTime24 } from '../utils/export';
import {
  FIXED_COURSE_CODES,
  isFixedCourse as isConfigFixedCourse,
  getFixedCourseCodes,
} from '../config/fixedCourses';

export { FIXED_COURSE_CODES, getFixedCourseCodes };

/**
 * Checks whether a course is in the central fixed courses list.
 */
export const isFixedCourse = isConfigFixedCourse;

/**
 * Manual-schedule course codes (e.g. FYDP courses).
 * Easy to edit in one place.
 */
export const MANUAL_SCHEDULE_COURSES = ['CSE 4000A', 'CSE 4000B', 'CSE 4000C'];

/**
 * User-entered manual schedule for a course (e.g. FYDP).
 */
export interface ManualScheduleInput {
  courseCode: string;
  section: string; // 1-4 chars e.g. "I"
  days: Day[]; // Sat, Sun, Mon, Tue, Wed
  startTime: string; // "11:11" or "08:30"
  endTime: string; // "13:40" or "11:00"
  room?: string;
  faculty?: string;
}

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
 * Parses 'HH:MM' or 'HHMM' string to minutes from 00:00.
 * '11:11' -> 671, '13:40' -> 820.
 */
export function parseTimeString(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  if (clean.includes(':')) {
    const parts = clean.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    return h * 60 + m;
  }
  // Format like '1111' or '0830'
  if (/^[0-9]{3,4}$/.test(clean)) {
    const pad = clean.padStart(4, '0');
    const h = parseInt(pad.slice(0, 2), 10);
    const m = parseInt(pad.slice(2, 4), 10);
    return h * 60 + m;
  }
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formats minutes from 00:00 to compact 'HHMM' for URLs (e.g. 671 -> '1111').
 */
export function formatCompactTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}${m.toString().padStart(2, '0')}`;
}

/**
 * Checks if a course code is a configured manual schedule course.
 */
export function isManualScheduleCourse(
  courseCode: string,
  configuredCourses: string[] = MANUAL_SCHEDULE_COURSES
): boolean {
  return configuredCourses.includes(courseCode);
}

/**
 * Validates manual schedule input form values.
 */
export function validateManualSchedule(input: Partial<ManualScheduleInput>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const section = input.section?.trim() || '';
  if (!section) {
    errors.section = 'Section label is required';
  } else if (section.length > 4) {
    errors.section = 'Section label must be 1 to 4 characters';
  }

  if (!input.days || input.days.length === 0) {
    errors.days = 'Select at least one day';
  }

  const startMin = parseTimeString(input.startTime || '');
  const endMin = parseTimeString(input.endTime || '');

  if (startMin <= 0) {
    errors.startTime = 'Valid start time required';
  }
  if (endMin <= 0) {
    errors.endTime = 'Valid end time required';
  }

  if (startMin > 0 && endMin > 0) {
    if (endMin <= startMin) {
      errors.endTime = 'End time must be after start time';
    } else if (startMin < 480 || endMin > 1260) {
      // 08:00 AM to 09:00 PM range bounds
      errors.timeRange = 'Time must be within UIU class hours (08:00 AM - 09:00 PM)';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Returns human-readable string for a manual schedule.
 * E.g. "Sat 11:11 AM–01:40 PM, Sec I"
 */
export function formatManualScheduleDescription(input: ManualScheduleInput): string {
  const startMin = parseTimeString(input.startTime);
  const endMin = parseTimeString(input.endTime);
  const daysStr = input.days.join(', ');
  const timeStr = `${formatTime24(startMin)}–${formatTime24(endMin)}`;
  return `${daysStr} ${timeStr}, Sec ${input.section}`;
}

/**
 * Canonical lab slots derived dynamically from data/sections.json.
 * Never hardcodes slot times.
 */
export function extractLabSlotsFromSections(
  sections: Section[]
): Array<{ start: number; end: number; label: string; startTime: string; endTime: string }> {
  const slotMap = new Map<string, { start: number; end: number }>();

  for (const s of sections) {
    if (s.kind === 'lab' && s.meetings) {
      for (const m of s.meetings) {
        if (m.start && m.end && m.end > m.start) {
          const key = `${m.start}-${m.end}`;
          if (!slotMap.has(key)) {
            slotMap.set(key, { start: m.start, end: m.end });
          }
        }
      }
    }
  }

  const result = Array.from(slotMap.values())
    .sort((a, b) => a.start - b.start)
    .map((slot) => {
      const sH = Math.floor(slot.start / 60).toString().padStart(2, '0');
      const sM = (slot.start % 60).toString().padStart(2, '0');
      const eH = Math.floor(slot.end / 60).toString().padStart(2, '0');
      const eM = (slot.end % 60).toString().padStart(2, '0');
      return {
        start: slot.start,
        end: slot.end,
        startTime: `${sH}:${sM}`,
        endTime: `${eH}:${eM}`,
        label: `${formatTime24(slot.start)}–${formatTime24(slot.end)}`,
      };
    });

  return result;
}

/**
 * Builds the canonical Section object for a manual schedule course.
 */
export function buildManualSection(
  input: ManualScheduleInput,
  courseTitle: string = 'Final Year Design Project',
  credit: number = 2
): Section {
  const startMin = parseTimeString(input.startTime);
  const endMin = parseTimeString(input.endTime);

  const meetings: Meeting[] = input.days.map((day) => ({
    day,
    start: startMin,
    end: endMin,
    room: input.room?.trim() || null,
  }));

  const faculty = input.faculty?.trim() ? [input.faculty.trim()] : ['Faculty TBA'];
  const facultyIds = input.faculty?.trim()
    ? [input.faculty.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')]
    : [];

  return {
    id: `MANUAL-${input.courseCode}-${input.section.trim()}`,
    sl: 9800,
    program: 'BSCSE',
    courseCode: input.courseCode,
    title: courseTitle,
    section: input.section.trim(),
    credit,
    kind: 'single-day-theory',
    meetings,
    faculty,
    facultyIds,
    tentative: false,
    fixed: true,
    manual: true,
    synthetic: true,
  };
}

/**
 * Compact URL encode for manual schedules.
 * Format: mx=CSE4000A.I.Sat-Tue.1111-1340_CSE4000B.II.Sun.0830-1100
 */
export function encodeManualScheduleUrl(
  schedules: Record<string, ManualScheduleInput>
): string {
  const chunks: string[] = [];
  for (const [code, sched] of Object.entries(schedules)) {
    if (!sched || !sched.section || !sched.days || sched.days.length === 0) continue;
    const cleanCode = code.replace(/\s+/g, '');
    const cleanSec = sched.section.trim();
    const daysStr = sched.days.join('-');
    const startCompact = formatCompactTime(parseTimeString(sched.startTime));
    const endCompact = formatCompactTime(parseTimeString(sched.endTime));
    chunks.push(`${cleanCode}.${cleanSec}.${daysStr}.${startCompact}-${endCompact}`);
  }
  return chunks.join('_');
}

/**
 * Compact URL decode for manual schedules.
 * Returns map of courseCode -> ManualScheduleInput, safely ignoring malformed entries.
 */
export function decodeManualScheduleUrl(
  urlParam: string
): Record<string, ManualScheduleInput> {
  const result: Record<string, ManualScheduleInput> = {};
  if (!urlParam || !urlParam.trim()) return result;

  const entries = urlParam.trim().split('_');
  for (const entry of entries) {
    try {
      const parts = entry.split('.');
      if (parts.length < 4) continue;

      // Extract course code (e.g. CSE4000A -> "CSE 4000A")
      let rawCode = parts[0];
      const match = rawCode.match(/^([A-Za-z]+)(\d+.*)$/);
      const courseCode = match ? `${match[1].toUpperCase()} ${match[2].toUpperCase()}` : rawCode;

      const section = parts[1].trim();
      const days = parts[2]
        .split('-')
        .map(normalizeDay)
        .filter((d): d is Day => ['Sat', 'Sun', 'Mon', 'Tue', 'Wed'].includes(d));

      const timeRange = parts[3].split('-');
      if (timeRange.length !== 2) continue;

      const startMin = parseTimeString(timeRange[0]);
      const endMin = parseTimeString(timeRange[1]);

      if (!section || days.length === 0 || startMin <= 0 || endMin <= startMin) {
        continue;
      }

      const sH = Math.floor(startMin / 60).toString().padStart(2, '0');
      const sM = (startMin % 60).toString().padStart(2, '0');
      const eH = Math.floor(endMin / 60).toString().padStart(2, '0');
      const eM = (endMin % 60).toString().padStart(2, '0');

      result[courseCode] = {
        courseCode,
        section,
        days,
        startTime: `${sH}:${sM}`,
        endTime: `${eH}:${eM}`,
      };
    } catch {
      // Safely ignore malformed entry
    }
  }

  return result;
}

const STORAGE_KEY = 'uiu_manual_schedules';

/**
 * Saves manual schedules to localStorage safely with try/catch.
 */
export function saveManualSchedulesToStorage(
  schedules: Record<string, ManualScheduleInput>
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  } catch (e) {
    console.warn('Failed to save manual schedules to localStorage:', e);
  }
}

/**
 * Loads manual schedules from localStorage safely with try/catch.
 */
export function loadManualSchedulesFromStorage(): Record<string, ManualScheduleInput> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ManualScheduleInput>;
  } catch (e) {
    console.warn('Failed to load manual schedules from localStorage:', e);
    return {};
  }
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
  manualScheduleDesc?: string;
}

/**
 * Computes which sections of other selected courses clash with active manual-schedule sections.
 * Pure read-only computation using bitmasks without modifying the solver.
 */
export function computeManualClashes(
  selectedCourses: string[],
  allSections: Section[],
  manualSections: Section[]
): Map<string, CourseFYDPClashInfo> {
  const clashMap = new Map<string, CourseFYDPClashInfo>();
  if (manualSections.length === 0) return clashMap;

  // Compute union bitmask of all active manual sections
  let manualMask: ScheduleBitmask = [0n, 0n, 0n, 0n, 0n];
  for (const mSec of manualSections) {
    const sMask = computeSectionMask(mSec);
    manualMask = [
      manualMask[0] | sMask[0],
      manualMask[1] | sMask[1],
      manualMask[2] | sMask[2],
      manualMask[3] | sMask[3],
      manualMask[4] | sMask[4],
    ];
  }

  const manualCodes = new Set(manualSections.map((s) => s.courseCode));

  // Group real candidate sections by course
  const sectionsByCourse = new Map<string, Section[]>();
  for (const sec of allSections) {
    if (!sectionsByCourse.has(sec.courseCode)) {
      sectionsByCourse.set(sec.courseCode, []);
    }
    sectionsByCourse.get(sec.courseCode)!.push(sec);
  }

  for (const courseCode of selectedCourses) {
    if (manualCodes.has(courseCode)) continue;

    const courseSecs = sectionsByCourse.get(courseCode) || [];
    if (courseSecs.length === 0) continue;

    const hiddenSections: FYDPHiddenSection[] = [];

    for (const sec of courseSecs) {
      const secMask = computeSectionMask(sec);
      if (hasOverlap(secMask, manualMask)) {
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

/**
 * Computes clashes against locked fixed FYDP sections.
 */
export function computeFixedFYDPClashes(
  selectedCourses: string[],
  allSections: Section[],
  lockedSections: Record<string, string>
): Map<string, CourseFYDPClashInfo> {
  const fixedSections: Section[] = [];
  for (const code of selectedCourses) {
    if (isFixedCourse(code) && lockedSections?.[code]) {
      const sec = allSections.find((s) => s.id === lockedSections[code]);
      if (sec) fixedSections.push(sec);
    }
  }
  return computeManualClashes(selectedCourses, allSections, fixedSections);
}

/**
 * Backwards compatibility alias
 */
export const computeFYDPClashes = (
  selectedCourses: string[],
  allSections: Section[],
  manualSectionsOrConfig?: any,
  lockedSections?: Record<string, string>
) => {
  if (Array.isArray(manualSectionsOrConfig)) {
    return computeManualClashes(selectedCourses, allSections, manualSectionsOrConfig);
  }
  const activeSections: Section[] = [];
  if (lockedSections) {
    for (const code of selectedCourses) {
      if (isFixedCourse(code) && lockedSections[code]) {
        const sec = allSections.find((s) => s.id === lockedSections[code]);
        if (sec) activeSections.push(sec);
      }
    }
  }
  if (activeSections.length === 0) {
    const fixedSections = allSections.filter(
      (s) => s.fixed && selectedCourses.includes(s.courseCode)
    );
    activeSections.push(...fixedSections);
  }
  return computeManualClashes(selectedCourses, allSections, activeSections);
};

/**
 * Overlays manual sections for selected manual courses into the sections list.
 * Does NOT inject synthetic courses into courses catalog — keeps total courses strictly at 107.
 */
export function applyManualCourseOverlay(
  courses: Course[],
  sections: Section[],
  manualSchedules: Record<string, ManualScheduleInput>
): { courses: Course[]; sections: Section[] } {
  const manualSections: Section[] = [];

  for (const [code, sched] of Object.entries(manualSchedules)) {
    // If course is in FIXED_COURSE_CODES and has real sections in catalog, use real sections
    if (FIXED_COURSE_CODES.includes(code) && sections.some((s) => s.courseCode === code)) {
      continue;
    }
    const courseObj = courses.find((c) => c.code === code);
    const title = courseObj?.title || 'Final Year Design Project';
    const credit = courseObj?.credit ?? 2;
    const sec = buildManualSection(sched, title, credit);
    manualSections.push(sec);
  }

  const manualCodes = new Set(manualSections.map((s) => s.courseCode));
  const filteredSections = sections.filter((s) => !manualCodes.has(s.courseCode));

  return {
    courses, // Always the original 107 courses
    sections: [...filteredSections, ...manualSections],
  };
}

/**
 * Backwards compatibility alias for applyFixedCourseOverlay.
 * Preserves catalog length of 107.
 */
export function applyFixedCourseOverlay(
  courses: Course[],
  sections: Section[],
  _config?: any
): { courses: Course[]; sections: Section[] } {
  return {
    courses,
    sections,
  };
}
