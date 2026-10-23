import sectionsData from '../../data/sections.json';
import coursesData from '../../data/courses.json';
import { solveSchedules } from '../solver';
import { Day, DAYS_LIST, Section, SolveRequest } from '../types';

export interface LandingCourseSectionItem {
  section: string;
  days: string;
  time: string;
  room: string;
}

export interface LandingCourseFacultyItem {
  facultyName: string;
  sectionCount: number;
  sections: LandingCourseSectionItem[];
}

export interface LandingCourseExplorerData {
  courseCode: string;
  courseTitle: string;
  program: string;
  credit: number;
  totalSections: number;
  faculty: LandingCourseFacultyItem[];
}

export interface LandingTimetableSlot {
  courseCode: string;
  section: string;
  faculty: string;
  time: string;
  room: string;
  colorClass: {
    bg: string;
    border: string;
    text: string;
    subText: string;
  };
}

export interface LandingSchedulePreviewData {
  score: number;
  schedule: Record<Day, LandingTimetableSlot[]>;
  sections: Section[];
}

/**
 * Format minutes (e.g. 510 -> '08:30', 591 -> '09:51')
 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Format meetings time range (e.g. '09:51–11:10')
 */
export function formatMeetingTime(start: number, end: number): string {
  return `${formatMinutes(start)}–${formatMinutes(end)}`;
}

/**
 * Build the Course Explorer card data at build time from data/sections.json for CSE 1111 (BSCSE).
 */
export function getLandingCourseExplorer(): LandingCourseExplorerData {
  const allSections = sectionsData as Section[];
  const cse1111Sections = allSections.filter(
    (s) => s.courseCode === 'CSE 1111' && s.program === 'BSCSE'
  );

  const courseMeta = (coursesData as { code: string; title: string; credit: number; program: string }[]).find(
    (c) => c.code === 'CSE 1111' && c.program === 'BSCSE'
  );

  // Group by first non-TBA faculty preserving appearance order
  const facultyMap = new Map<string, Section[]>();
  for (const s of cse1111Sections) {
    const fName = s.faculty?.[0];
    if (!fName || fName === 'TBA') continue;
    if (!facultyMap.has(fName)) {
      facultyMap.set(fName, []);
    }
    facultyMap.get(fName)!.push(s);
  }

  // Pick first 2 faculty
  const top2Faculty = Array.from(facultyMap.entries()).slice(0, 2);

  const faculty: LandingCourseFacultyItem[] = top2Faculty.map(([name, secs]) => ({
    facultyName: name,
    sectionCount: secs.length,
    sections: secs.map((sec) => {
      const days = sec.meetings.map((m) => m.day).join('/');
      const firstMeeting = sec.meetings[0];
      const time = firstMeeting ? formatMeetingTime(firstMeeting.start, firstMeeting.end) : '';
      const room = firstMeeting?.room ? `Room ${firstMeeting.room}` : 'TBA';
      return {
        section: sec.section,
        days,
        time,
        room,
      };
    }),
  }));

  return {
    courseCode: 'CSE 1111',
    courseTitle: courseMeta?.title ?? 'Structured Programming Language',
    program: 'BSCSE',
    credit: courseMeta?.credit ?? 3,
    totalSections: cse1111Sections.length,
    faculty,
  };
}

// 4 distinct pastel color schemes for the 4 preview courses
const COURSE_COLORS = [
  {
    bg: 'bg-orange-50',
    border: 'border-l-4 border-orange-500 border border-orange-200',
    text: 'text-orange-950',
    subText: 'text-orange-900',
  },
  {
    bg: 'bg-sky-50',
    border: 'border-l-4 border-sky-500 border border-sky-200',
    text: 'text-sky-950',
    subText: 'text-sky-900',
  },
  {
    bg: 'bg-emerald-50',
    border: 'border-l-4 border-emerald-600 border border-emerald-200',
    text: 'text-emerald-950',
    subText: 'text-emerald-900',
  },
  {
    bg: 'bg-violet-50',
    border: 'border-l-4 border-violet-500 border border-violet-200',
    text: 'text-violet-950',
    subText: 'text-violet-900',
  },
];

/**
 * Generate a conflict-free real schedule preview at build time from 4 real BSCSE courses.
 */
export function getLandingSchedulePreview(): LandingSchedulePreviewData {
  const allSections = sectionsData as Section[];
  const sampleCourses = ['CSE 2213', 'CSE 2215', 'MATH 2201', 'CSE 3411'];

  const solveReq: SolveRequest = {
    selectedCourses: sampleCourses,
    preferredFaculty: {},
    avoidFaculty: {},
    lockedSections: {},
    filterDayOff: [],
    weights: {
      facultyPreference: 30,
      minimizeGaps: 25,
      compactDays: 0,
      avoidEarlyLate: 15,
      avoidTentative: 10,
    },
    limit: 50,
  };

  const response = solveSchedules(allSections, solveReq);
  if (!response.schedules || response.schedules.length === 0) {
    throw new Error('Could not find conflict-free routine for sample courses');
  }

  // Prefer a balanced 2+2 schedule across Sat/Tue and Sun/Wed for visual representation
  const balanced = response.schedules.find((s) => {
    const satCount = s.sections.filter((sec) => sec.meetings.some((m) => m.day === 'Sat')).length;
    const sunCount = s.sections.filter((sec) => sec.meetings.some((m) => m.day === 'Sun')).length;
    return satCount === 2 && sunCount === 2;
  });

  const best = balanced || response.schedules[0];

  // Map each course code to a color
  const courseColorMap = new Map<string, (typeof COURSE_COLORS)[0]>();
  sampleCourses.forEach((code, idx) => {
    courseColorMap.set(code, COURSE_COLORS[idx % COURSE_COLORS.length]);
  });

  const schedule: Record<Day, LandingTimetableSlot[]> = {
    Sat: [],
    Sun: [],
    Mon: [],
    Tue: [],
    Wed: [],
  };

  // Populate slots per day
  for (const sec of best.sections) {
    const color = courseColorMap.get(sec.courseCode) ?? COURSE_COLORS[0];
    const faculty = sec.faculty.join(', ');

    for (const m of sec.meetings) {
      if (schedule[m.day]) {
        schedule[m.day].push({
          courseCode: sec.courseCode,
          section: sec.section,
          faculty,
          time: formatMeetingTime(m.start, m.end),
          room: m.room ? `R${m.room}` : 'TBA',
          colorClass: color,
        });
      }
    }
  }

  // Sort each day's slots chronologically by start time
  for (const day of DAYS_LIST) {
    schedule[day].sort((a, b) => a.time.localeCompare(b.time));
  }

  return {
    score: best.score,
    schedule,
    sections: best.sections,
  };
}

export const LANDING_COURSE_EXPLORER = getLandingCourseExplorer();
export const LANDING_SCHEDULE_PREVIEW = getLandingSchedulePreview();
