import { Course, Section } from '../types';
import { isFixedCourse } from '../config/fixedCourses';
import { isManualScheduleCourse } from './fixedCourses';
import { resolveSectionId } from './sectionAliases';
import { formatTime24 } from '../utils/export';

export const STUDENT_ID_STORAGE_KEY = 'uiu-rb:student-id:v1';

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

export type StudentRoomLookupResult =
  | { status: 'invalid-id' }
  | { status: 'found-own'; room: string; exam: ExamRow }
  | { status: 'found-other'; room: string; section: string; exam: ExamRow }
  | { status: 'not-found' };

export interface RoutineExamExportItem {
  exam: ExamRow;
  foundRoom?: string | null;
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
 * Normalizes a 9- or 10-digit UIU student ID into a 10-digit string.
 * Strips spaces and dashes. For 9-digit legacy IDs, inserts "0" before the last 3 digits
 * (e.g. "011131140" -> "0111310140"). Returns null for invalid inputs.
 */
export function normalizeStudentId(input: string): string | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/[\s-]+/g, '').trim();
  if (!/^\d{9,10}$/.test(cleaned)) {
    return null;
  }
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, -3)}0${cleaned.slice(-3)}`;
  }
  return cleaned;
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
 * Finds the assigned room for a student ID within an exam row using normalized 10-digit inclusive bounds.
 */
export function findRoomForId(examRow: ExamRow, studentId: string): string | null {
  const normId = normalizeStudentId(studentId);
  if (!normId || !examRow || !Array.isArray(examRow.rooms)) return null;

  for (const r of examRow.rooms) {
    const fromNorm = normalizeStudentId(r.idFrom);
    const toNorm = normalizeStudentId(r.idTo);
    if (!fromNorm || !toNorm) continue;
    if (normId >= fromNorm && normId <= toNorm) {
      return r.room;
    }
  }
  return null;
}

/**
 * Searches for a student's room in their selected section's exam row, falling back to
 * other active sections of the same course if not found in their own section.
 */
export function lookupStudentRoomForCourse(
  ownExam: ExamRow | null,
  allCourseExams: ExamRow[],
  studentId: string
): StudentRoomLookupResult {
  const normId = normalizeStudentId(studentId);
  if (!normId) return { status: 'invalid-id' };

  if (ownExam) {
    const ownRoom = findRoomForId(ownExam, normId);
    if (ownRoom) {
      return { status: 'found-own', room: ownRoom, exam: ownExam };
    }
  }

  for (const other of allCourseExams) {
    if (other.sectionStatus === 'dropped') continue;
    if (ownExam && other.id === ownExam.id) continue;
    const room = findRoomForId(other, normId);
    if (room) {
      return {
        status: 'found-other',
        room,
        section: other.section,
        exam: other,
      };
    }
  }

  return { status: 'not-found' };
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

  for (const { exam, foundRoom } of sorted) {
    const roomStr = foundRoom
      ? `Room ${foundRoom}`
      : exam.rooms.length > 0
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
 * Timed events with TZID=Asia/Dhaka, no VALARM reminders, and NEVER contains student IDs.
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

  for (const { exam, foundRoom } of sorted) {
    const dateCompact = exam.date.replace(/-/g, '');
    const sH = pad2(Math.floor(exam.startMin / 60));
    const sM = pad2(exam.startMin % 60);
    const eH = pad2(Math.floor(exam.endMin / 60));
    const eM = pad2(exam.endMin % 60);

    const uid = `exam-${exam.id.replace(/\s+/g, '')}-${dateCompact}@uiu.ac.bd`;
    const location = foundRoom
      ? `Room ${foundRoom}, UIU Campus`
      : exam.rooms.length > 0
      ? `Rooms ${exam.rooms.map((r) => r.room).join(', ')}, UIU Campus`
      : 'UIU Campus';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dateCompact}T000000Z`);
    lines.push(`DTSTART;TZID=Asia/Dhaka:${dateCompact}T${sH}${sM}00`);
    lines.push(`DTEND;TZID=Asia/Dhaka:${dateCompact}T${eH}${eM}00`);
    lines.push(`SUMMARY:${exam.courseCode} Mid-term (Sec ${exam.section})`);
    lines.push(`LOCATION:${location}`);
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
 * Safely reads saved student ID from localStorage (returns '' if unavailable).
 */
export function loadStoredStudentId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(STUDENT_ID_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Safely writes or removes student ID in localStorage.
 */
export function saveStoredStudentId(studentId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!studentId) {
      window.localStorage.removeItem(STUDENT_ID_STORAGE_KEY);
    } else {
      window.localStorage.setItem(STUDENT_ID_STORAGE_KEY, studentId);
    }
  } catch {
    // Ignore storage quota or private mode blocks
  }
}
