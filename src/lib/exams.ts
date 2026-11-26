import { Course, Section } from '../types';
import { isFixedCourse } from '../config/fixedCourses';
import { isManualScheduleCourse } from './fixedCourses';
import { resolveSectionId } from './sectionAliases';
import { formatTime24 } from '../utils/export';

export interface ExamRoomRange {
  room: string;
  idFrom: string; // normalized 10-digit string
  idTo: string;   // normalized 10-digit string
}

export interface ExamRow {
  id: string;
  program: 'BSCSE' | 'BSDS';
  courseCodes: string[];
  sectionId: string | null;
  sectionStatus: 'active' | 'dropped' | null;
  courseCode: string;
  courseTitle: string;
  section: string;
  teacherInitials: string;
  date: string; // "2026-12-05"
  dayOfWeek: string; // "Sat", "Sun", "Mon", etc.
  startMin: number;
  endMin: number;
  rooms: ExamRoomRange[];
}

export interface ExamSlot {
  date: string;
  dayOfWeek: string;
  startMin: number;
  endMin: number;
}

export interface ExamSelectionItem {
  course: string | Pick<Course, 'code' | 'title' | 'theoryCode'>;
  sectionId?: string | null;
  program?: 'BSCSE' | 'BSDS';
  isLab?: boolean;
}

export interface ExamClashPair {
  a: string;
  b: string;
  date: string;
  startMin: number;
  endMin: number;
  time: string;
  aSection?: string;
  bSection?: string;
}

export interface ExamSameDayGroup {
  date: string;
  dayOfWeek: string;
  courses: string[];
  count: number;
}

export interface ExamClashReport {
  clashes: ExamClashPair[];
  sameDay: ExamClashPair[];
  possible: ExamClashPair[];
  sameDayGroups: ExamSameDayGroup[];
  unannouncedCourses: string[];
  allTheoryExamsKnown: boolean;
  knownTheoryCount: number;
}

export interface RoutineExamExportItem {
  exam: ExamRow;
}

let cachedExamsPromise: Promise<ExamRow[]> | null = null;

/**
 * Lazily loads data/exams.json via dynamic import so Builder's initial bundle stays small.
 * Returns [] silently if exams.json is missing or empty.
 */
export async function loadExamsData(): Promise<ExamRow[]> {
  if (cachedExamsPromise) return cachedExamsPromise;
  cachedExamsPromise = import('../../data/exams.json')
    .then((mod) => {
      const data = (mod?.default ?? mod) as unknown;
      return Array.isArray(data) ? (data as ExamRow[]) : [];
    })
    .catch(() => []);
  return cachedExamsPromise;
}

function normalizeCodeKey(code: string): string {
  return String(code || '').replace(/\s+/g, '').toUpperCase();
}

/**
 * Checks whether a course is a lab or FYDP (which do not have mid-term exam warnings).
 */
export function isExamExemptCourse(
  course: string | Pick<Course, 'code' | 'title' | 'theoryCode'>,
  sections?: Pick<Section, 'courseCode' | 'kind'>[]
): boolean {
  const code = typeof course === 'string' ? course : course.code;
  const title = typeof course === 'string' ? '' : course.title || '';
  const theoryCode = typeof course === 'string' ? undefined : course.theoryCode;

  if (!code) return true;
  if (isFixedCourse(code) || isManualScheduleCourse(code) || /\b4000[A-Z]?\b/i.test(code)) {
    return true;
  }
  if (theoryCode) return true;
  if (title.trim().toLowerCase().endsWith('laboratory')) return true;

  if (sections && sections.length > 0) {
    const courseSecs = sections.filter((s) => s.courseCode === code);
    if (courseSecs.length > 0 && courseSecs.every((s) => s.kind === 'lab')) {
      return true;
    }
  }

  return false;
}

/**
 * Looks up the exam row for a specific sectionId.
 * Hides dropped sections by default unless includeDropped is true.
 */
export function getExamForSection(
  sectionId: string,
  exams: ExamRow[],
  options?: { includeDropped?: boolean }
): ExamRow | null {
  if (!sectionId || !exams || exams.length === 0) return null;
  const resolved = resolveSectionId(sectionId);
  const found = exams.find(
    (e) => e.sectionId === sectionId || (resolved !== sectionId && e.sectionId === resolved)
  );
  if (!found) return null;
  if (!options?.includeDropped && found.sectionStatus === 'dropped') {
    return null;
  }
  return found;
}

/**
 * Returns all exam rows matching a course (by canonical courseCode or any code in courseCodes).
 * If program is 'ALL' or omitted, matches across both BSCSE and BSDS.
 * Hides dropped sections by default unless includeDropped is true.
 */
export function getExamsForCourse(
  program: 'BSCSE' | 'BSDS' | 'ALL' | null | undefined,
  courseCode: string,
  exams: ExamRow[],
  options?: { includeDropped?: boolean }
): ExamRow[] {
  if (!courseCode || !exams || exams.length === 0) return [];
  const target = normalizeCodeKey(courseCode);
  return exams.filter((e) => {
    if (!options?.includeDropped && e.sectionStatus === 'dropped') {
      return false;
    }
    if (program && program !== 'ALL' && e.program !== program) {
      return false;
    }
    if (normalizeCodeKey(e.courseCode) === target) return true;
    return e.courseCodes.some((c) => normalizeCodeKey(c) === target);
  });
}

/**
 * Formats YYYY-MM-DD (e.g. "2026-12-08") into "Dec 8".
 */
export function formatExamDateShort(dateIso: string): string {
  const parts = dateIso.split('-');
  if (parts.length !== 3) return dateIso;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[monthIdx] || parts[1];
  return `${monthName} ${day}`;
}

/**
 * Formats minutes-since-midnight range into "09:00 AM - 11:00 AM".
 */
export function formatExamTimeRange(startMin: number, endMin: number): string {
  return `${formatTime24(startMin)} - ${formatTime24(endMin)}`;
}

/**
 * Checks whether two exam slots on the same date have overlapping time intervals.
 * Strict inequality: adjacent slots (e.g. 11:00 end and 11:00 start) do NOT overlap.
 */
export function examSlotsOverlap(
  a: { date: string; startMin: number; endMin: number },
  b: { date: string; startMin: number; endMin: number }
): boolean {
  if (a.date !== b.date) return false;
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

function dedupeSlots(rows: ExamRow[]): ExamSlot[] {
  const seen = new Map<string, ExamSlot>();
  for (const r of rows) {
    const key = `${r.date}|${r.startMin}|${r.endMin}`;
    if (!seen.has(key)) {
      seen.set(key, {
        date: r.date,
        dayOfWeek: r.dayOfWeek,
        startMin: r.startMin,
        endMin: r.endMin,
      });
    }
  }
  return Array.from(seen.values()).sort(
    (a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin
  );
}

/**
 * Detects definite clashes, same-day exam pairs, and section-dependent ("possible") clashes
 * for a list of selected courses/sections. Labs and FYDP courses are ignored.
 */
export function detectExamClashes(
  selection: ExamSelectionItem[],
  exams: ExamRow[]
): ExamClashReport {
  if (!exams || exams.length === 0 || !selection || selection.length === 0) {
    return {
      clashes: [],
      sameDay: [],
      possible: [],
      sameDayGroups: [],
      unannouncedCourses: [],
      allTheoryExamsKnown: false,
      knownTheoryCount: 0,
    };
  }

  interface ResolvedEntry {
    courseCode: string;
    section?: string;
    slots: ExamSlot[];
    isDefiniteSingleSlot: boolean;
  }

  const entries: ResolvedEntry[] = [];
  const unannouncedCourses: string[] = [];
  const seenCourses = new Set<string>();

  for (const item of selection) {
    const courseCode = typeof item.course === 'string' ? item.course : item.course.code;
    const normKey = normalizeCodeKey(courseCode);
    if (!normKey || seenCourses.has(normKey)) continue;
    seenCourses.add(normKey);

    if (item.isLab || isExamExemptCourse(item.course)) {
      continue;
    }

    let matchedRows: ExamRow[] = [];
    let chosenSection: string | undefined;

    if (item.sectionId) {
      const secExam = getExamForSection(item.sectionId, exams);
      if (secExam) {
        matchedRows = [secExam];
        chosenSection = secExam.section;
      }
    }

    if (matchedRows.length === 0) {
      matchedRows = getExamsForCourse(item.program ?? null, courseCode, exams);
    }

    const slots = dedupeSlots(matchedRows);
    if (slots.length === 0) {
      unannouncedCourses.push(courseCode);
      continue;
    }

    entries.push({
      courseCode,
      section: chosenSection,
      slots,
      isDefiniteSingleSlot: slots.length === 1,
    });
  }

  const clashes: ExamClashPair[] = [];
  const sameDay: ExamClashPair[] = [];
  const possible: ExamClashPair[] = [];

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];

      const overlappingPairs: { sa: ExamSlot; sb: ExamSlot }[] = [];
      let totalPairs = 0;
      let anySameDayNonOverlap = false;

      for (const sa of a.slots) {
        for (const sb of b.slots) {
          totalPairs++;
          if (examSlotsOverlap(sa, sb)) {
            overlappingPairs.push({ sa, sb });
          } else if (sa.date === sb.date) {
            anySameDayNonOverlap = true;
          }
        }
      }

      if (overlappingPairs.length > 0 && overlappingPairs.length === totalPairs) {
        const first = overlappingPairs[0];
        const overlapStart = Math.max(first.sa.startMin, first.sb.startMin);
        const overlapEnd = Math.min(first.sa.endMin, first.sb.endMin);
        clashes.push({
          a: a.courseCode,
          b: b.courseCode,
          date: first.sa.date,
          startMin: overlapStart,
          endMin: overlapEnd,
          time: formatTime24(first.sa.startMin),
          aSection: a.section,
          bSection: b.section,
        });
      } else if (overlappingPairs.length > 0) {
        const first = overlappingPairs[0];
        const overlapStart = Math.max(first.sa.startMin, first.sb.startMin);
        const overlapEnd = Math.min(first.sa.endMin, first.sb.endMin);
        possible.push({
          a: a.courseCode,
          b: b.courseCode,
          date: first.sa.date,
          startMin: overlapStart,
          endMin: overlapEnd,
          time: formatTime24(first.sa.startMin),
          aSection: a.section,
          bSection: b.section,
        });
      } else if (anySameDayNonOverlap && a.isDefiniteSingleSlot && b.isDefiniteSingleSlot) {
        const sa = a.slots[0];
        sameDay.push({
          a: a.courseCode,
          b: b.courseCode,
          date: sa.date,
          startMin: sa.startMin,
          endMin: sa.endMin,
          time: formatExamTimeRange(sa.startMin, sa.endMin),
          aSection: a.section,
          bSection: b.section,
        });
      }
    }
  }

  // Group definite single-slot courses by date for "N exams on Dec X" chips
  const byDate = new Map<string, { dayOfWeek: string; courses: string[] }>();
  for (const e of entries) {
    if (!e.isDefiniteSingleSlot) continue;
    const slot = e.slots[0];
    if (!byDate.has(slot.date)) {
      byDate.set(slot.date, { dayOfWeek: slot.dayOfWeek, courses: [] });
    }
    byDate.get(slot.date)!.courses.push(e.courseCode);
  }
  const sameDayGroups: ExamSameDayGroup[] = Array.from(byDate.entries())
    .filter(([, v]) => v.courses.length >= 2)
    .sort(([dA], [dB]) => dA.localeCompare(dB))
    .map(([date, v]) => ({
      date,
      dayOfWeek: v.dayOfWeek,
      courses: v.courses,
      count: v.courses.length,
    }));

  const knownTheoryCount = entries.length;
  const allTheoryExamsKnown = knownTheoryCount > 0 && unannouncedCourses.length === 0;

  return {
    clashes,
    sameDay,
    possible,
    sameDayGroups,
    unannouncedCourses,
    allTheoryExamsKnown,
    knownTheoryCount,
  };
}

/**
 * Formats a list of exam items into plain text for copying to clipboard.
 * Never includes any student ID.
 */
export function exportExamsToText(items: RoutineExamExportItem[]): string {
  const sorted = [...items].sort(
    (a, b) =>
      a.exam.date.localeCompare(b.exam.date) ||
      a.exam.startMin - b.exam.startMin ||
      a.exam.courseCode.localeCompare(b.exam.courseCode)
  );

  const lines: string[] = [
    '============================================================',
    'UIU MID-TERM EXAM SCHEDULE — FALL 2026',
    '============================================================',
    '',
  ];

  for (const { exam } of sorted) {
    const roomStr =
      exam.rooms.length > 0
        ? `Rooms: ${exam.rooms.map((r) => r.room).join(', ')}`
        : 'Room TBA';
    lines.push(
      `${formatExamDateShort(exam.date)} (${exam.dayOfWeek}) | ${formatExamTimeRange(
        exam.startMin,
        exam.endMin
      )}`
    );
    lines.push(`  ${exam.courseCode} — ${exam.courseTitle} (Sec ${exam.section})`);
    lines.push(`  ${roomStr}`);
    lines.push('');
  }

  lines.push('Confirm on the SoSE notice board before the exam.');
  return lines.join('\n');
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Generates an RFC 5545 iCalendar (.ics) string for mid-term exams.
 * Timed events with TZID=Asia/Dhaka, no VALARM reminders, and leaves LOCATION empty.
 */
export function exportExamsToICS(items: RoutineExamExportItem[]): string {
  const sorted = [...items].sort(
    (a, b) =>
      a.exam.date.localeCompare(b.exam.date) ||
      a.exam.startMin - b.exam.startMin ||
      a.exam.courseCode.localeCompare(b.exam.courseCode)
  );

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UIU Routine Builder//Mid-Term Exams Fall 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:UIU Fall 2026 Mid-Term Exams',
    'X-WR-TIMEZONE:Asia/Dhaka',
  ];

  for (const { exam } of sorted) {
    const dateCompact = exam.date.replace(/-/g, '');
    const sH = pad2(Math.floor(exam.startMin / 60));
    const sM = pad2(exam.startMin % 60);
    const eH = pad2(Math.floor(exam.endMin / 60));
    const eM = pad2(exam.endMin % 60);

    const uid = `exam-${exam.id.replace(/\s+/g, '')}-${dateCompact}@uiu.ac.bd`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dateCompact}T000000Z`);
    lines.push(`DTSTART;TZID=Asia/Dhaka:${dateCompact}T${sH}${sM}00`);
    lines.push(`DTEND;TZID=Asia/Dhaka:${dateCompact}T${eH}${eM}00`);
    lines.push(`SUMMARY:${exam.courseCode} Mid-term (Sec ${exam.section})`);
    lines.push(
      `DESCRIPTION:Course: ${exam.courseTitle}\\nSection: ${exam.section}\\nConfirm room on the SoSE notice board.`
    );
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * One-time cleanup for legacy saved student ID key in localStorage.
 */
export function clearLegacyStudentIdStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem('uiu-rb:student-id:v1');
  } catch {
    // Ignore private mode or storage errors
  }
}

export type TimeOfDayGroup = 'morning' | 'midday' | 'afternoon';

export const TIME_OF_DAY_META: Record<
  TimeOfDayGroup,
  { label: string; tooltip: string }
> = {
  morning: {
    label: 'Morning',
    tooltip: '08:30 AM - 10:30 AM, 09:00 AM - 11:00 AM',
  },
  midday: {
    label: 'Midday',
    tooltip: '11:00 AM - 01:00 PM, 11:45 AM - 01:45 PM',
  },
  afternoon: {
    label: 'Afternoon',
    tooltip: '02:30 PM - 04:30 PM',
  },
};

export interface ExamProgramCount {
  program: 'BSCSE' | 'BSDS';
  sectionCount: number;
}

export interface UniqueExamSection {
  id: string;
  section: string;
  program: 'BSCSE' | 'BSDS';
  rooms: ExamRoomRange[];
  status: 'active' | 'dropped' | null;
  sectionId: string | null;
}

export interface UniqueExam {
  key: string;
  courseCode: string;
  courseCodes: string[];
  courseTitle: string;
  date: string;
  dayOfWeek: string;
  startMin: number;
  endMin: number;
  timeOfDay: TimeOfDayGroup;
  programs: ExamProgramCount[];
  sections: UniqueExamSection[];
  sectionCount: number;
  roomsSummary: string[];
}

export interface ExamDayStat {
  date: string;
  dayOfWeek: string;
  dayNumber: number;
  monthLabel: string;
  examCount: number;
  sectionCount: number;
  hasUserExam: boolean;
  ratio: number; // 0..1 proportional to max examCount
}

export interface ExamDayStatsSummary {
  days: ExamDayStat[];
  totalDays: number;
  dateRangeLabel: string;
  busiestDay: { date: string; dayOfWeek: string; examCount: number } | null;
}

export type NextExamResult =
  | { status: 'none' }
  | { status: 'completed' }
  | { status: 'upcoming'; exam: UniqueExam; daysUntil: number; label: string };

export interface ExamsPageUrlState {
  q: string;
  program: 'ALL' | 'BSCSE' | 'BSDS';
  date: string;
  time: 'ALL' | TimeOfDayGroup;
  mode: 'mine' | 'all';
  view: 'date' | 'list';
}

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Classifies exam start time (minutes since midnight) into Morning / Midday / Afternoon.
 * - Morning: start < 11:00 (660)
 * - Midday: 11:00 <= start < 14:00 (660..839)
 * - Afternoon: start >= 14:00 (840+)
 */
export function timeOfDay(startMin: number): TimeOfDayGroup {
  if (startMin < 660) return 'morning';
  if (startMin < 840) return 'midday';
  return 'afternoon';
}

/**
 * Formats YYYY-MM-DD (e.g. "2026-11-26") into "Nov 26, 2026".
 */
export function formatDate(dateIso: string): string {
  const parts = dateIso.split('-');
  if (parts.length !== 3) return dateIso;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = SHORT_MONTHS[monthIdx];
  if (!monthName || Number.isNaN(day) || Number.isNaN(year)) return dateIso;
  return `${monthName} ${day}, ${year}`;
}

/**
 * Formats YYYY-MM-DD (e.g. "2026-12-05") into "Sat, Dec 5".
 */
export function formatExamDayLabel(dateIso: string): string {
  const parts = dateIso.split('-');
  if (parts.length !== 3) return dateIso;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = SHORT_MONTHS[monthIdx];
  if (!monthName || Number.isNaN(day) || Number.isNaN(year)) return dateIso;
  const utc = new Date(Date.UTC(year, monthIdx, day));
  const weekday = WEEKDAYS_SHORT[utc.getUTCDay()];
  return `${weekday}, ${monthName} ${day}`;
}

function naturalSectionCompare(a: string, b: string): number {
  const aAlpha = a.replace(/[0-9]/g, '');
  const bAlpha = b.replace(/[0-9]/g, '');
  if (aAlpha.length !== bAlpha.length) {
    return aAlpha.length - bAlpha.length;
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Groups raw section-level exam rows into unique exams defined by
 * (canonical courseCode, date, startMin, endMin), merging BSCSE and BSDS rows
 * of the same course and time slot into a single exam.
 */
export function groupUniqueExams(
  rows: ExamRow[],
  options?: { includeDropped?: boolean }
): UniqueExam[] {
  if (!rows || rows.length === 0) return [];

  const groups = new Map<
    string,
    {
      courseCode: string;
      courseCodes: Set<string>;
      courseTitle: string;
      date: string;
      dayOfWeek: string;
      startMin: number;
      endMin: number;
      programCounts: Map<'BSCSE' | 'BSDS', number>;
      sections: UniqueExamSection[];
      roomsSet: Set<string>;
    }
  >();

  for (const row of rows) {
    if (!options?.includeDropped && row.sectionStatus === 'dropped') {
      continue;
    }

    const key = `${row.courseCode}|${row.date}|${row.startMin}|${row.endMin}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        courseCode: row.courseCode,
        courseCodes: new Set<string>(),
        courseTitle: row.courseTitle,
        date: row.date,
        dayOfWeek: row.dayOfWeek,
        startMin: row.startMin,
        endMin: row.endMin,
        programCounts: new Map<'BSCSE' | 'BSDS', number>(),
        sections: [],
        roomsSet: new Set<string>(),
      };
      groups.set(key, group);
    }

    for (const c of row.courseCodes) {
      group.courseCodes.add(c);
    }
    group.programCounts.set(
      row.program,
      (group.programCounts.get(row.program) || 0) + 1
    );
    group.sections.push({
      id: row.id,
      section: row.section,
      program: row.program,
      rooms: row.rooms,
      status: row.sectionStatus,
      sectionId: row.sectionId,
    });
    for (const rm of row.rooms) {
      group.roomsSet.add(rm.room);
    }
  }

  const result: UniqueExam[] = [];
  for (const [key, g] of groups.entries()) {
    const programs: ExamProgramCount[] = (['BSCSE', 'BSDS'] as const)
      .filter((p) => (g.programCounts.get(p) || 0) > 0)
      .map((p) => ({
        program: p,
        sectionCount: g.programCounts.get(p) || 0,
      }));

    const sortedSections = [...g.sections].sort(
      (a, b) =>
        naturalSectionCompare(a.section, b.section) ||
        a.program.localeCompare(b.program)
    );

    result.push({
      key,
      courseCode: g.courseCode,
      courseCodes: Array.from(g.courseCodes),
      courseTitle: g.courseTitle,
      date: g.date,
      dayOfWeek: g.dayOfWeek,
      startMin: g.startMin,
      endMin: g.endMin,
      timeOfDay: timeOfDay(g.startMin),
      programs,
      sections: sortedSections,
      sectionCount: sortedSections.length,
      roomsSummary: Array.from(g.roomsSet),
    });
  }

  return result.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.startMin - b.startMin ||
      a.courseCode.localeCompare(b.courseCode, undefined, { numeric: true })
  );
}

/**
 * Counts unique exams and total sections across an array of UniqueExam objects.
 */
export function countExamsAndSections(exams: UniqueExam[]): {
  examCount: number;
  sectionCount: number;
} {
  let sectionCount = 0;
  for (const e of exams) {
    sectionCount += e.sectionCount;
  }
  return { examCount: exams.length, sectionCount };
}

/**
 * Formats exam + section counts as "64 exams · 472 sections" or "1 exam · 9 sections".
 */
export function formatExamCountSummary(
  examCount: number,
  sectionCount: number
): string {
  const examWord = examCount === 1 ? 'exam' : 'exams';
  const secWord = sectionCount === 1 ? 'section' : 'sections';
  return `${examCount} ${examWord} · ${sectionCount} ${secWord}`;
}

/**
 * Computes per-day statistics, date range label, and busiest day from unique exams.
 */
export function dayStats(
  uniqueExams: UniqueExam[],
  userCourseCodes: string[] = []
): ExamDayStatsSummary {
  if (!uniqueExams || uniqueExams.length === 0) {
    return {
      days: [],
      totalDays: 0,
      dateRangeLabel: '',
      busiestDay: null,
    };
  }

  const userCodeSet = new Set(userCourseCodes.map(normalizeCodeKey));
  const map = new Map<
    string,
    {
      date: string;
      dayOfWeek: string;
      dayNumber: number;
      monthLabel: string;
      examCount: number;
      sectionCount: number;
      hasUserExam: boolean;
    }
  >();

  for (const exam of uniqueExams) {
    const parts = exam.date.split('-');
    const monthIdx = parseInt(parts[1] || '1', 10) - 1;
    const dayNumber = parseInt(parts[2] || '1', 10);
    const monthLabel = SHORT_MONTHS[monthIdx] || '';

    let entry = map.get(exam.date);
    if (!entry) {
      entry = {
        date: exam.date,
        dayOfWeek: exam.dayOfWeek,
        dayNumber,
        monthLabel,
        examCount: 0,
        sectionCount: 0,
        hasUserExam: false,
      };
      map.set(exam.date, entry);
    }

    entry.examCount++;
    entry.sectionCount += exam.sectionCount;
    if (
      userCodeSet.has(normalizeCodeKey(exam.courseCode)) ||
      exam.courseCodes.some((c) => userCodeSet.has(normalizeCodeKey(c)))
    ) {
      entry.hasUserExam = true;
    }
  }

  const sorted = Array.from(map.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const maxCount = Math.max(1, ...sorted.map((d) => d.examCount));

  const days: ExamDayStat[] = sorted.map((d) => ({
    ...d,
    ratio: d.examCount / maxCount,
  }));

  let busiest = days[0];
  for (const d of days) {
    if (d.examCount > busiest.examCount) {
      busiest = d;
    }
  }

  const first = days[0];
  const last = days[days.length - 1];
  const dateRangeLabel =
    first.date === last.date
      ? `${first.monthLabel} ${first.dayNumber}`
      : first.monthLabel === last.monthLabel
      ? `${first.monthLabel} ${first.dayNumber}–${last.dayNumber}`
      : `${first.monthLabel} ${first.dayNumber}–${last.monthLabel} ${last.dayNumber}`;

  return {
    days,
    totalDays: days.length,
    dateRangeLabel,
    busiestDay: {
      date: busiest.date,
      dayOfWeek: busiest.dayOfWeek,
      examCount: busiest.examCount,
    },
  };
}

function toIsoDateOnly(dateOrIso?: Date | string): string {
  if (typeof dateOrIso === 'string') {
    return dateOrIso.slice(0, 10);
  }
  const d = dateOrIso ?? new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseUtcEpochDay(dateIso: string): number {
  const parts = dateIso.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return 0;
  return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
}

/**
 * Finds the next upcoming exam relative to today's date (or provided reference date).
 * Returns "Today", "Tomorrow", or "in N days", or { status: 'completed' } if all are past.
 */
export function getNextExam(
  uniqueExams: UniqueExam[],
  nowDate?: Date | string
): NextExamResult {
  if (!uniqueExams || uniqueExams.length === 0) {
    return { status: 'none' };
  }

  const todayIso = toIsoDateOnly(nowDate);
  const sorted = [...uniqueExams].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin
  );

  const upcoming = sorted.find((e) => e.date >= todayIso);
  if (!upcoming) {
    return { status: 'completed' };
  }

  const daysUntil = Math.max(
    0,
    parseUtcEpochDay(upcoming.date) - parseUtcEpochDay(todayIso)
  );
  const label =
    daysUntil === 0
      ? 'Today'
      : daysUntil === 1
      ? 'Tomorrow'
      : `in ${daysUntil} days`;

  return {
    status: 'upcoming',
    exam: upcoming,
    daysUntil,
    label,
  };
}

/**
 * Parses deep-link query params for /exams with safe fallbacks on invalid values.
 * Never reads or returns any student ID.
 */
export function parseExamsPageParams(
  search: string,
  hasSelectedCourses: boolean
): ExamsPageUrlState {
  const params = new URLSearchParams(search);
  const q = params.get('q') || '';

  const rawProg = (params.get('program') || '').toUpperCase();
  const program: ExamsPageUrlState['program'] =
    rawProg === 'BSCSE' || rawProg === 'BSDS' ? rawProg : 'ALL';

  const rawDate = params.get('date') || '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : 'ALL';

  const rawTime = (params.get('time') || '').toLowerCase();
  const time: ExamsPageUrlState['time'] =
    rawTime === 'morning' || rawTime === 'midday' || rawTime === 'afternoon'
      ? rawTime
      : 'ALL';

  const rawMode = (params.get('mode') || '').toLowerCase();
  const legacyMine = params.get('mine');
  let mode: ExamsPageUrlState['mode'];
  if (rawMode === 'mine' || rawMode === 'all') {
    mode = rawMode;
  } else if (legacyMine === '1' || legacyMine === 'true') {
    mode = 'mine';
  } else {
    mode = hasSelectedCourses ? 'mine' : 'all';
  }

  const rawView = (params.get('view') || '').toLowerCase();
  const view: ExamsPageUrlState['view'] = rawView === 'list' ? 'list' : 'date';

  return { q, program, date, time, mode, view };
}

/**
 * Serializes /exams filter/view state into query string params.
 * Never includes student ID.
 */
export function serializeExamsPageParams(state: ExamsPageUrlState): string {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set('q', state.q.trim());
  if (state.program !== 'ALL') params.set('program', state.program);
  if (state.date !== 'ALL') params.set('date', state.date);
  if (state.time !== 'ALL') params.set('time', state.time);
  params.set('mode', state.mode);
  if (state.view !== 'date') params.set('view', state.view);
  return params.toString();
}
