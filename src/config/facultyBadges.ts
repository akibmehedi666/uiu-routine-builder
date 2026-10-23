import type { FacultyStats } from '../lib/facultyStats';
import { Day, DAYS_LIST } from '../types';

/**
 * Configuration for Faculty Directory Badges.
 * All thresholds and definitions are centralized here for easy tuning.
 */

export type BadgeCategory = 'Schedule' | 'Courses' | 'Rooms' | 'Programs';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  howToEarn: string;
  category: BadgeCategory;
  iconName:
    | 'Bell'
    | 'Moon'
    | 'FlaskConical'
    | 'BookOpen'
    | 'Flame'
    | 'Calendar'
    | 'Zap'
    | 'Building2'
    | 'Home'
    | 'Boxes'
    | 'GitFork'
    | 'Coffee';
  // Styling tokens adhering to the warm UIU design system
  badgeStyle: string;
  // Priority order for display (lower number = higher priority; max 3 shown on cards)
  priority: number;
  // Human-readable metric label (e.g. "5 in a row", "6 floors", "78% in Room 530")
  metricLabel: (faculty: FacultyStats) => string;
  // Numeric metric value used for high-to-low ranking and top-holder computation
  metricValue: (faculty: FacultyStats) => number;
  // Short unit string displayed under the big metric number in holder rows
  metricUnit: string;
  // Detailed explanation displayed as a muted second line under the metric number
  metricDetail: (faculty: FacultyStats) => string;
}

export const FACULTY_BADGE_THRESHOLDS = {
  // Busiest: top section count tier (6+ sections, top faculty load)
  busiestMinSections: 6,
  // Marathon: longest chain of back-to-back classes on one day (gap <= 15 min between meetings)
  marathonMinChain: 3,
  marathonMaxGapMinutes: 15,
  // Cross-Program: has sections in both BSCSE and BSDS
  // Multi-Course: teaches 5 or more distinct courses
  multiCourseMinCount: 5,
  // Course Hub: teaches 3 or more sections of the same course
  courseHubMinSections: 3,
  // Lab Pro: teaches 3 or more lab sections
  labProMinSections: 3,
  // Floor Hopper: teaches on 4 or more distinct floors
  floorHopperMinFloors: 4,
  // Home Room: >= 70% of meetings in the same room and at least 4 meetings
  homeRoomMinRatio: 0.7,
  homeRoomMinMeetings: 4,
  // First Bell: sections starting at 08:30 (start <= 510 minutes)
  firstBellMinSections: 3,
  // Late Shift: sections starting at 13:51 or later (start >= 831 minutes)
  lateShiftMinSections: 3,
  // Monday Special: >= 60% of sections on Monday and at least 2 sections
  mondaySpecialMinRatio: 0.6,
  mondaySpecialMinSections: 2,
  // Weekend Starter: >= 70% of sections on Sat/Tue with at least 2 sections
  weekendStarterMinRatio: 0.7,
  weekendStarterMinSections: 2,
} as const;

function formatMinutes(mins: number): string {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hStr = h12 < 10 ? `0${h12}` : `${h12}`;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return `${hStr}:${mStr} ${period}`;
}

/**
 * Counts total back-to-back meeting pairs (gap <= 15 min) for a faculty member in the week.
 */
export function countBackToBackPairs(f: FacultyStats): number {
  if (!f.weeklyPattern) return 0;
  let pairs = 0;
  for (const day of DAYS_LIST) {
    const ms = f.weeklyPattern[day]?.meetings || [];
    for (let i = 0; i < ms.length - 1; i++) {
      const gap = ms[i + 1].start - ms[i].end;
      if (gap >= 0 && gap <= FACULTY_BADGE_THRESHOLDS.marathonMaxGapMinutes) {
        pairs++;
      }
    }
  }
  return pairs;
}

/**
 * Computes Marathon badge detail: day + start of first to end of last class in longest chain
 * (e.g. "Sun 09:51-01:40 PM"), plus "+1 more day" if chains exist across multiple days,
 * and muted total pairs this week (e.g. "2 pairs this week").
 */
export function computeMarathonDetail(f: FacultyStats): string {
  if (!f.weeklyPattern) return '';

  interface DayChain {
    day: Day;
    count: number;
    start: number;
    end: number;
  }

  const allChains: DayChain[] = [];

  for (const day of DAYS_LIST) {
    const ms = f.weeklyPattern[day]?.meetings || [];
    if (ms.length === 0) continue;

    let chainStart = ms[0].start;
    let chainEnd = ms[0].end;
    let currentCount = 1;

    for (let i = 0; i < ms.length - 1; i++) {
      const gap = ms[i + 1].start - ms[i].end;
      if (gap >= 0 && gap <= FACULTY_BADGE_THRESHOLDS.marathonMaxGapMinutes) {
        currentCount++;
        chainEnd = ms[i + 1].end;
      } else {
        if (currentCount > 1) {
          allChains.push({ day, count: currentCount, start: chainStart, end: chainEnd });
        }
        currentCount = 1;
        chainStart = ms[i + 1].start;
        chainEnd = ms[i + 1].end;
      }
    }
    if (currentCount > 1) {
      allChains.push({ day, count: currentCount, start: chainStart, end: chainEnd });
    }
  }

  if (allChains.length === 0) return '';

  // Max chain length
  const maxCount = Math.max(...allChains.map((c) => c.count));
  const bestChain = allChains.find((c) => c.count === maxCount) || allChains[0];

  // Days with chains
  const daysWithChains = Array.from(new Set(allChains.map((c) => c.day)));
  const extraDays = daysWithChains.length > 1 ? daysWithChains.length - 1 : 0;
  const extraDaysStr = extraDays > 0 ? ` (+${extraDays} more day${extraDays === 1 ? '' : 's'})` : '';

  const startStr = formatMinutes(bestChain.start).replace(/\s+(AM|PM)$/, '');
  const endStr = formatMinutes(bestChain.end);

  const pairs = countBackToBackPairs(f);
  const pairsStr = `${pairs} pair${pairs === 1 ? '' : 's'} this week`;

  return `${bestChain.day} ${startStr}-${endStr}${extraDaysStr} · ${pairsStr}`;
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  busiest: {
    id: 'busiest',
    name: 'Busiest',
    description: 'Top teaching load with 6+ sections assigned',
    howToEarn: 'Teach 6 or more total sections this trimester.',
    category: 'Courses',
    iconName: 'Flame',
    badgeStyle: 'bg-orange-50 text-orange-900 border-orange-200/80',
    priority: 1,
    metricUnit: 'sections',
    metricValue: (f) => f.totalSections,
    metricLabel: (f) => `${f.totalSections} sections`,
    metricDetail: (f) => `${f.theoryCourseCount} theory · ${f.labCourseCount} lab`,
  },
  marathon: {
    id: 'marathon',
    name: 'Marathon',
    description: '3+ back-to-back classes in a single day (gap ≤ 15 min)',
    howToEarn: 'Teach 3 or more back-to-back classes on a single day with ≤ 15 min break between them.',
    category: 'Schedule',
    iconName: 'Zap',
    badgeStyle: 'bg-rose-50 text-rose-900 border-rose-200/80',
    priority: 2,
    metricUnit: 'in a row',
    metricValue: (f) => f.maxMarathonChain,
    metricLabel: (f) => `${f.maxMarathonChain} in a row`,
    metricDetail: (f) => computeMarathonDetail(f),
  },
  crossProgram: {
    id: 'crossProgram',
    name: 'Cross-Program',
    description: 'Teaches sections in both BSCSE and BSDS programs',
    howToEarn: 'Teach sections in both BSCSE and BSDS degree programs.',
    category: 'Programs',
    iconName: 'GitFork',
    badgeStyle: 'bg-teal-50 text-teal-900 border-teal-200/80',
    priority: 3,
    metricUnit: 'programs',
    metricValue: (f) => f.programs.length,
    metricLabel: (f) => (f.programs.length > 1 ? f.programs.join(' & ') : 'BSCSE & BSDS'),
    metricDetail: (f) => {
      const bscse = f.courses.flatMap((c) => c.sections).filter((s) => s.program === 'BSCSE').length;
      const bsds = f.courses.flatMap((c) => c.sections).filter((s) => s.program === 'BSDS').length;
      return `BSCSE ${bscse} · BSDS ${bsds} sections`;
    },
  },
  multiCourse: {
    id: 'multiCourse',
    name: 'Multi-Course',
    description: 'Teaches 5+ distinct courses this trimester',
    howToEarn: 'Teach 5 or more distinct courses this trimester.',
    category: 'Courses',
    iconName: 'BookOpen',
    badgeStyle: 'bg-purple-50 text-purple-900 border-purple-200/80',
    priority: 4,
    metricUnit: 'courses',
    metricValue: (f) => f.distinctCourseCount,
    metricLabel: (f) => `${f.distinctCourseCount} courses`,
    metricDetail: (f) => {
      const codes = f.courses.map((c) => c.courseCode);
      if (codes.length === 0) return '';
      const top = codes.slice(0, 3).join(', ');
      return codes.length > 3 ? `${top} +${codes.length - 3}` : top;
    },
  },
  courseHub: {
    id: 'courseHub',
    name: 'Course Hub',
    description: 'Teaches 3+ sections of the same course',
    howToEarn: 'Teach 3 or more sections of the same course.',
    category: 'Courses',
    iconName: 'Boxes',
    badgeStyle: 'bg-blue-50 text-blue-900 border-blue-200/80',
    priority: 5,
    metricUnit: 'sections',
    metricValue: (f) => {
      let max = 0;
      for (const c of f.courses) {
        if (c.sections.length > max) max = c.sections.length;
      }
      return max;
    },
    metricLabel: (f) => {
      let max = 0;
      let bestCode = '';
      for (const c of f.courses) {
        if (c.sections.length > max) {
          max = c.sections.length;
          bestCode = c.courseCode;
        }
      }
      return max > 0 ? `${max} sections (${bestCode})` : '0 sections';
    },
    metricDetail: (f) => {
      let max = 0;
      let bestCode = '';
      for (const c of f.courses) {
        if (c.sections.length > max) {
          max = c.sections.length;
          bestCode = c.courseCode;
        }
      }
      return max > 0 ? `${bestCode} x${max}` : '0 sections';
    },
  },
  labPro: {
    id: 'labPro',
    name: 'Lab Pro',
    description: 'Teaches 3+ laboratory sections this trimester',
    howToEarn: 'Teach 3 or more laboratory sections this trimester.',
    category: 'Courses',
    iconName: 'FlaskConical',
    badgeStyle: 'bg-emerald-50 text-emerald-900 border-emerald-200/80',
    priority: 6,
    metricUnit: 'lab sections',
    metricValue: (f) =>
      f.courses.reduce((acc, c) => acc + c.sections.filter((s) => s.kind === 'lab').length, 0),
    metricLabel: (f) => {
      const count = f.courses.reduce(
        (acc, c) => acc + c.sections.filter((s) => s.kind === 'lab').length,
        0
      );
      return `${count} lab section${count === 1 ? '' : 's'}`;
    },
    metricDetail: (f) => {
      const labCodes = f.courses
        .filter((c) => c.sections.some((s) => s.kind === 'lab'))
        .map((c) => c.courseCode);
      if (labCodes.length === 0) return '';
      const top = labCodes.slice(0, 3).join(', ');
      return labCodes.length > 3 ? `${top} +${labCodes.length - 3}` : top;
    },
  },
  floorHopper: {
    id: 'floorHopper',
    name: 'Floor Hopper',
    description: 'Teaches across 4+ distinct campus floors',
    howToEarn: 'Teach classes on 4 or more distinct campus floors.',
    category: 'Rooms',
    iconName: 'Building2',
    badgeStyle: 'bg-violet-50 text-violet-900 border-violet-200/80',
    priority: 7,
    metricUnit: 'floors',
    metricValue: (f) => f.distinctFloors,
    metricLabel: (f) => `${f.distinctFloors} floors`,
    metricDetail: (f) => {
      const sorted = [...f.floors].sort((a, b) => a - b);
      return sorted.length > 0 ? `Floors ${sorted.join(', ')}` : `${f.distinctFloors} floors`;
    },
  },
  homeRoom: {
    id: 'homeRoom',
    name: 'Home Room',
    description: 'Majority (≥70%) of classes held in a single room (min 4 meetings)',
    howToEarn: 'Hold 70% or more of your classes in the same room (with at least 4 meetings).',
    category: 'Rooms',
    iconName: 'Home',
    badgeStyle: 'bg-cyan-50 text-cyan-900 border-cyan-200/80',
    priority: 8,
    metricUnit: '% in room',
    metricValue: (f) => {
      const roomCounts = new Map<string, number>();
      let totalMeetings = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          for (const m of s.meetings) {
            const r = m.room?.trim();
            if (r) {
              totalMeetings++;
              roomCounts.set(r, (roomCounts.get(r) || 0) + 1);
            }
          }
        }
      }
      if (totalMeetings === 0) return 0;
      let maxCount = 0;
      for (const count of roomCounts.values()) {
        if (count > maxCount) maxCount = count;
      }
      return Math.round((maxCount / totalMeetings) * 100);
    },
    metricLabel: (f) => {
      const roomCounts = new Map<string, number>();
      let totalMeetings = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          for (const m of s.meetings) {
            const r = m.room?.trim();
            if (r) {
              totalMeetings++;
              roomCounts.set(r, (roomCounts.get(r) || 0) + 1);
            }
          }
        }
      }
      if (totalMeetings === 0) return '0%';
      let maxCount = 0;
      let maxRoom = '';
      for (const [r, count] of roomCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          maxRoom = r;
        }
      }
      const pct = Math.round((maxCount / totalMeetings) * 100);
      const roomDisplay = maxRoom.toLowerCase().startsWith('room') ? maxRoom : `Room ${maxRoom}`;
      return `${pct}% in ${roomDisplay}`;
    },
    metricDetail: (f) => {
      const roomCounts = new Map<string, number>();
      let totalMeetings = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          for (const m of s.meetings) {
            const r = m.room?.trim();
            if (r) {
              totalMeetings++;
              roomCounts.set(r, (roomCounts.get(r) || 0) + 1);
            }
          }
        }
      }
      if (totalMeetings === 0) return '';
      let maxCount = 0;
      let maxRoom = '';
      for (const [r, count] of roomCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          maxRoom = r;
        }
      }
      const roomDisplay = maxRoom.toLowerCase().startsWith('room') ? maxRoom : `Room ${maxRoom}`;
      return `${roomDisplay} (${maxCount} meetings)`;
    },
  },
  firstBell: {
    id: 'firstBell',
    name: 'First Bell',
    description: 'Teaches 3+ early morning sections (starts at 08:30 AM)',
    howToEarn: 'Teach 3 or more sections starting at 08:30 AM.',
    category: 'Schedule',
    iconName: 'Bell',
    badgeStyle: 'bg-amber-50 text-amber-900 border-amber-200/80',
    priority: 9,
    metricUnit: 'morning sections',
    metricValue: (f) => {
      let count = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          if (s.meetings.some((m) => m.start <= 510)) count++;
        }
      }
      return count;
    },
    metricLabel: (f) => {
      let count = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          if (s.meetings.some((m) => m.start <= 510)) count++;
        }
      }
      return `${count} morning section${count === 1 ? '' : 's'} (08:30 AM)`;
    },
    metricDetail: (f) => {
      const days = Array.from(
        new Set(
          f.courses
            .flatMap((c) => c.sections)
            .filter((s) => s.meetings.some((m) => m.start <= 510))
            .flatMap((s) => s.days)
        )
      );
      return days.length > 0 ? `${days.join(', ')} at 08:30 AM` : '08:30 AM';
    },
  },
  lateShift: {
    id: 'lateShift',
    name: 'Late Shift',
    description: 'Teaches 3+ afternoon sections (starts at 01:51 PM or later)',
    howToEarn: 'Teach 3 or more sections starting at 01:51 PM or later.',
    category: 'Schedule',
    iconName: 'Moon',
    badgeStyle: 'bg-indigo-50 text-indigo-900 border-indigo-200/80',
    priority: 10,
    metricUnit: 'late sections',
    metricValue: (f) => {
      let count = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          if (s.meetings.some((m) => m.start >= 831)) count++;
        }
      }
      return count;
    },
    metricLabel: (f) => {
      let count = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          if (s.meetings.some((m) => m.start >= 831)) count++;
        }
      }
      return `${count} late section${count === 1 ? '' : 's'} (01:51 PM+)`;
    },
    metricDetail: (f) => {
      const days = Array.from(
        new Set(
          f.courses
            .flatMap((c) => c.sections)
            .filter((s) => s.meetings.some((m) => m.start >= 831))
            .flatMap((s) => s.days)
        )
      );
      return days.length > 0 ? `${days.join(', ')} at 01:51 PM+` : '01:51 PM+';
    },
  },
  mondaySpecial: {
    id: 'mondaySpecial',
    name: 'Monday Special',
    description: 'Majority (≥60%) of sections taught on Mondays (min 2 sections)',
    howToEarn: 'Hold 60% or more of your assigned sections on Mondays (with at least 2 sections).',
    category: 'Schedule',
    iconName: 'Coffee',
    badgeStyle: 'bg-lime-50 text-lime-900 border-lime-200/80',
    priority: 11,
    metricUnit: '% on Monday',
    metricValue: (f) => {
      if (f.totalSections === 0) return 0;
      let monSecs = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          if (s.meetings.some((m) => m.day === 'Mon')) monSecs++;
        }
      }
      return Math.round((monSecs / f.totalSections) * 100);
    },
    metricLabel: (f) => {
      if (f.totalSections === 0) return '0%';
      let monSecs = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          if (s.meetings.some((m) => m.day === 'Mon')) monSecs++;
        }
      }
      const pct = Math.round((monSecs / f.totalSections) * 100);
      return `${pct}% on Monday (${monSecs}/${f.totalSections})`;
    },
    metricDetail: (f) => {
      if (f.totalSections === 0) return '0%';
      let monSecs = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          if (s.meetings.some((m) => m.day === 'Mon')) monSecs++;
        }
      }
      const pct = Math.round((monSecs / f.totalSections) * 100);
      return `${monSecs} of ${f.totalSections} sections on Monday (${pct}%)`;
    },
  },
  weekendStarter: {
    id: 'weekendStarter',
    name: 'Weekend Starter',
    description: 'Majority (≥70%) of sections scheduled on Sat & Tue',
    howToEarn: 'Hold 70% or more of your sections on Saturday and Tuesday (with at least 2 sections).',
    category: 'Schedule',
    iconName: 'Calendar',
    badgeStyle: 'bg-sky-50 text-sky-900 border-sky-200/80',
    priority: 12,
    metricUnit: '% on Sat/Tue',
    metricValue: (f) => {
      if (f.totalSections === 0) return 0;
      let satTueSecs = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          if (s.meetings.some((m) => m.day === 'Sat' || m.day === 'Tue')) satTueSecs++;
        }
      }
      return Math.round((satTueSecs / f.totalSections) * 100);
    },
    metricLabel: (f) => {
      if (f.totalSections === 0) return '0%';
      let satTueSecs = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          if (s.meetings.some((m) => m.day === 'Sat' || m.day === 'Tue')) satTueSecs++;
        }
      }
      const pct = Math.round((satTueSecs / f.totalSections) * 100);
      return `${pct}% on Sat/Tue (${satTueSecs}/${f.totalSections})`;
    },
    metricDetail: (f) => {
      if (f.totalSections === 0) return '0%';
      let satTueSecs = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          if (s.meetings.some((m) => m.day === 'Sat' || m.day === 'Tue')) satTueSecs++;
        }
      }
      const pct = Math.round((satTueSecs / f.totalSections) * 100);
      return `${satTueSecs} of ${f.totalSections} sections on Sat & Tue (${pct}%)`;
    },
  },
};

/**
 * Returns all badge definitions sorted by priority.
 */
export function getAllBadgeDefinitions(): BadgeDefinition[] {
  return Object.values(BADGE_DEFINITIONS).sort((a, b) => a.priority - b.priority);
}
