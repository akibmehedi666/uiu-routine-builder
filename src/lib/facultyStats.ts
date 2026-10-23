import { Day, DAYS_LIST, Meeting, Section } from '../types';
import rawSections from '../../data/sections.json';
import rawFaculty from '../../data/faculty.json';
import {
  FACULTY_BADGE_THRESHOLDS,
  BADGE_DEFINITIONS,
  BadgeDefinition,
} from '../config/facultyBadges';
import { getFacultyAvatarColor, getFacultyInitials } from './courseDirectory';
import { resolveFacultyId } from './facultyAliases';
import { parseFloorFromRoom } from './roomSchedule';

export { parseFloorFromRoom };

export type TimeSlot = 'Morning' | 'Midday' | 'Afternoon';

export interface FacultyMeeting {
  day: Day;
  start: number; // minutes from midnight
  end: number;
  room: string | null;
  courseCode: string;
  courseTitle: string;
  section: string;
  kind: Section['kind'];
  tentative: boolean;
}

export interface FacultyCourseSection {
  id: string;
  section: string;
  kind: Section['kind'];
  credit: number;
  tentative: boolean;
  days: Day[];
  timeRange: string;
  room: string | null;
  meetings: Meeting[];
}

export interface FacultyCourseGroup {
  courseCode: string;
  title: string;
  credit: number;
  kind: Section['kind'];
  sections: FacultyCourseSection[];
  sectionCount: number;
}

export interface DayWeeklyPattern {
  day: Day;
  meetings: FacultyMeeting[];
  count: number;
  morningCount: number;
  middayCount: number;
  afternoonCount: number;
}

export interface FacultyBadge {
  id: string;
  name: string;
  description: string;
  iconName: BadgeDefinition['iconName'];
  badgeStyle: string;
  priority: number;
}

export interface FacultyStats {
  id: string; // normalized facultyId (e.g. 'ishrat-jahan')
  name: string; // display name with titles intact (e.g. 'Mr. Angkon Deb')
  sortName: string; // display name stripped of titles for alphabetical sorting
  programs: ('BSCSE' | 'BSDS')[];
  initials: string;
  searchAliases: string[]; // generated initials variants for instant search
  avatarColor: { bg: string; text: string; border: string };
  distinctCourseCount: number; // total distinct courses
  theoryCourseCount: number; // distinct theory courses
  labCourseCount: number; // distinct lab courses
  totalSections: number; // total section count taught
  totalWeeklyMinutes: number; // sum of meeting durations in minutes
  totalWeeklyHours: number; // totalWeeklyMinutes / 60 rounded to 1 decimal place
  totalCredits: number; // sum of credits across distinct courses taught
  courses: FacultyCourseGroup[];
  weeklyPattern: Record<Day, DayWeeklyPattern>;
  activeDays: Day[]; // days with >= 1 class
  daysOnCampus: number; // count of activeDays
  busiestDay: Day | null; // day with most class minutes
  earliestStart: number | null; // minutes (e.g. 510)
  latestEnd: number | null; // minutes (e.g. 990)
  earliestStartTimeStr: string; // e.g. "08:30 AM"
  latestEndTimeStr: string; // e.g. "04:30 PM"
  slotCounts: {
    morning: number;
    midday: number;
    afternoon: number;
  };
  distinctFloors: number;
  floors: number[];
  rooms: string[];
  maxMarathonChain: number;
  badges: FacultyBadge[];
  teachesWith: {
    facultyId: string;
    facultyName: string;
    sharedCourses: string[];
  }[];
}

export interface TBASection {
  id: string;
  sl: number;
  program: 'BSCSE' | 'BSDS';
  courseCode: string;
  courseTitle: string;
  section: string;
  credit: number;
  kind: Section['kind'];
  meetings: Meeting[];
  timeRange: string;
  days: Day[];
  room: string | null;
  tentative: boolean;
}

export interface TBACourseGroup {
  courseCode: string;
  courseTitle: string;
  sections: TBASection[];
}

export interface FacultyFilterCriteria {
  search?: string;
  program?: 'ALL' | 'BSCSE' | 'BSDS';
  day?: 'ALL' | Day;
  timeSlot?: 'ALL' | TimeSlot;
  kind?: 'ALL' | 'theory' | 'lab';
  sortBy?: 'az' | 'most-sections' | 'most-courses' | 'most-credits' | 'most-hours';
}

/**
 * Format minutes since midnight into 12-hour format: "08:30 AM"
 */
export function formatMinutesToTime(mins: number): string {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hStr = h12 < 10 ? `0${h12}` : `${h12}`;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return `${hStr}:${mStr} ${period}`;
}

/**
 * Classify a meeting start time into UIU slots:
 * - Morning: < 11:11 (minutes < 671)
 * - Midday: 11:11 - 13:50 (671 <= minutes <= 830)
 * - Afternoon: >= 13:51 (minutes >= 831)
 */
export function classifyTimeSlot(startMinutes: number): TimeSlot {
  if (startMinutes < 671) return 'Morning';
  if (startMinutes <= 830) return 'Midday';
  return 'Afternoon';
}

/**
 * Strips academic, honorific and common name prefixes for alphabetical sorting.
 * e.g. "Mr. Abid Hasan Khondaker" -> "Abid Hasan Khondaker"
 * e.g. "Md. Sajjad Hossain" -> "Sajjad Hossain"
 */
export function stripFacultyTitle(name: string): string {
  if (!name) return '';
  let clean = name.trim();
  const prefixRegex = /^(?:(?:prof|dr|mr|ms|mrs|md|mst|engr|m)\.?\s+)+/i;
  clean = clean.replace(prefixRegex, '').trim();
  return clean || name.trim();
}

/**
 * Build meeting time range string: e.g. "08:30 AM - 09:50 AM"
 */
export function formatMeetingTimeRange(meetings: Meeting[]): string {
  if (!meetings || meetings.length === 0) return 'TBA';
  const first = meetings[0];
  return `${formatMinutesToTime(first.start)} - ${formatMinutesToTime(first.end)}`;
}

/**
 * Generates search alias initials variants from cleaned faculty name.
 * Variants:
 * 1. All words (e.g. "Abdullah Ibne Masud Mahi" -> "AIMM")
 * 2. Without titles Mr./Ms./Dr. (e.g. "Mr. Abid Hasan Khondaker" -> "AHK")
 * 3. Without "Md."/"Mohammad"/"Mohammed" prefix words (e.g. "Md. Iqbal Bahar Chowdhury" -> "IBC")
 * 4. First letters of first two words (e.g. "Abdullah Ibne" -> "AI")
 */
export function generateSearchAliases(name: string): string[] {
  if (!name || typeof name !== 'string') return [];

  const rawWords = name
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[.,()]/g, ''))
    .filter((w) => w.length > 0);

  if (rawWords.length === 0) return [];

  const aliases = new Set<string>();

  // 1. All words
  const allInitials = rawWords.map((w) => w[0].toUpperCase()).join('');
  if (allInitials) aliases.add(allInitials);

  // 2. Without titles: Mr, Ms, Mrs, Dr, Prof
  const titleWords = new Set(['MR', 'MS', 'MRS', 'DR', 'PROF']);
  const nonTitleWords = rawWords.filter((w) => !titleWords.has(w.toUpperCase()));
  if (nonTitleWords.length > 0) {
    const noTitleInitials = nonTitleWords.map((w) => w[0].toUpperCase()).join('');
    if (noTitleInitials) aliases.add(noTitleInitials);
  }

  // 3. Without "Md", "Mohammad", "Mohammed" (and without titles as well)
  const prefixWords = new Set(['MD', 'MOHAMMAD', 'MOHAMMED']);
  const noPrefixWords = (nonTitleWords.length > 0 ? nonTitleWords : rawWords).filter(
    (w) => !prefixWords.has(w.toUpperCase())
  );
  if (noPrefixWords.length > 0) {
    const noPrefixInitials = noPrefixWords.map((w) => w[0].toUpperCase()).join('');
    if (noPrefixInitials) aliases.add(noPrefixInitials);
  }

  // Also check rawWords without prefix words directly
  const rawNoPrefixWords = rawWords.filter((w) => !prefixWords.has(w.toUpperCase()));
  if (rawNoPrefixWords.length > 0) {
    const rawNoPrefixInitials = rawNoPrefixWords.map((w) => w[0].toUpperCase()).join('');
    if (rawNoPrefixInitials) aliases.add(rawNoPrefixInitials);
  }

  // 4. First letters of first two words
  if (rawWords.length >= 2) {
    aliases.add((rawWords[0][0] + rawWords[1][0]).toUpperCase());
  }
  if (nonTitleWords.length >= 2) {
    aliases.add((nonTitleWords[0][0] + nonTitleWords[1][0]).toUpperCase());
  }

  return Array.from(aliases);
}

function toFacultyBadge(b: BadgeDefinition): FacultyBadge {
  return {
    id: b.id,
    name: b.name,
    description: b.description,
    iconName: b.iconName,
    badgeStyle: b.badgeStyle,
    priority: b.priority,
  };
}

/**
 * Evaluates faculty badges based on centralized thresholds.
 * Sorted by priority order (highest priority first).
 */
export function computeFacultyBadges(stats: {
  firstBellSections: number;
  lateShiftSections: number;
  labSections: number;
  distinctCourses: number;
  totalSections: number;
  satTueSections: number;
  maxMarathonChain?: number;
  distinctFloors?: number;
  totalMeetings?: number;
  maxSingleRoomMeetings?: number;
  maxSectionsPerCourse?: number;
  programs?: ('BSCSE' | 'BSDS')[];
  mondaySections?: number;
}): FacultyBadge[] {
  const badges: FacultyBadge[] = [];

  // 1. Busiest: 6+ sections (top faculty load)
  if (stats.totalSections >= FACULTY_BADGE_THRESHOLDS.busiestMinSections) {
    badges.push(toFacultyBadge(BADGE_DEFINITIONS.busiest));
  }

  // 2. Marathon: longest chain of back-to-back classes on one day (gap <= 15 min), >= 3 in a row
  if ((stats.maxMarathonChain ?? 0) >= FACULTY_BADGE_THRESHOLDS.marathonMinChain) {
    badges.push(toFacultyBadge(BADGE_DEFINITIONS.marathon));
  }

  // 3. Cross-Program: has sections in both BSCSE and BSDS
  if (stats.programs?.includes('BSCSE') && stats.programs?.includes('BSDS')) {
    badges.push(toFacultyBadge(BADGE_DEFINITIONS.crossProgram));
  }

  // 4. Multi-Course: 5+ distinct courses
  if (stats.distinctCourses >= FACULTY_BADGE_THRESHOLDS.multiCourseMinCount) {
    badges.push(toFacultyBadge(BADGE_DEFINITIONS.multiCourse));
  }

  // 5. Course Hub: >= 3 sections of the same course
  if ((stats.maxSectionsPerCourse ?? 0) >= FACULTY_BADGE_THRESHOLDS.courseHubMinSections) {
    badges.push(toFacultyBadge(BADGE_DEFINITIONS.courseHub));
  }

  // 6. Lab Pro: 3+ lab sections
  if (stats.labSections >= FACULTY_BADGE_THRESHOLDS.labProMinSections) {
    badges.push(toFacultyBadge(BADGE_DEFINITIONS.labPro));
  }

  // 7. Floor Hopper: teaches on >= 4 distinct floors
  if ((stats.distinctFloors ?? 0) >= FACULTY_BADGE_THRESHOLDS.floorHopperMinFloors) {
    badges.push(toFacultyBadge(BADGE_DEFINITIONS.floorHopper));
  }

  // 8. Home Room: >= 70% of meetings in the same room and >= 4 meetings
  const totalMeetings = stats.totalMeetings ?? 0;
  const maxSingleRoom = stats.maxSingleRoomMeetings ?? 0;
  if (
    totalMeetings >= FACULTY_BADGE_THRESHOLDS.homeRoomMinMeetings &&
    maxSingleRoom / totalMeetings >= FACULTY_BADGE_THRESHOLDS.homeRoomMinRatio
  ) {
    badges.push(toFacultyBadge(BADGE_DEFINITIONS.homeRoom));
  }

  // 9. First Bell: 3+ sections starting at 08:30 AM
  if (stats.firstBellSections >= FACULTY_BADGE_THRESHOLDS.firstBellMinSections) {
    badges.push(toFacultyBadge(BADGE_DEFINITIONS.firstBell));
  }

  // 10. Late Shift: 3+ sections starting at 01:51 PM or later
  if (stats.lateShiftSections >= FACULTY_BADGE_THRESHOLDS.lateShiftMinSections) {
    badges.push(toFacultyBadge(BADGE_DEFINITIONS.lateShift));
  }

  // 11. Monday Special: >= 60% of sections on Monday and >= 2 sections
  if (
    stats.totalSections >= FACULTY_BADGE_THRESHOLDS.mondaySpecialMinSections &&
    ((stats.mondaySections ?? 0) / stats.totalSections) >= FACULTY_BADGE_THRESHOLDS.mondaySpecialMinRatio
  ) {
    badges.push(toFacultyBadge(BADGE_DEFINITIONS.mondaySpecial));
  }

  // 12. Weekend Starter: >= 70% sections on Sat/Tue with min 2 sections
  if (
    stats.totalSections >= FACULTY_BADGE_THRESHOLDS.weekendStarterMinSections &&
    stats.satTueSections / stats.totalSections >= FACULTY_BADGE_THRESHOLDS.weekendStarterMinRatio
  ) {
    badges.push(toFacultyBadge(BADGE_DEFINITIONS.weekendStarter));
  }

  // Sort by priority order
  badges.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  return badges;
}

/**
 * Builds all faculty statistics deterministically from raw data.
 * Memoized at module scope.
 */
let cachedFacultyStats: FacultyStats[] | null = null;
let cachedTBASections: TBACourseGroup[] | null = null;

export function getAllFacultyStats(): FacultyStats[] {
  if (cachedFacultyStats) return cachedFacultyStats;

  const sections = rawSections as Section[];
  const facultyList = rawFaculty as { id: string; name: string }[];

  // Map of facultyId -> sections taught by this faculty
  const facultySectionMap = new Map<string, Section[]>();
  // Map of facultyId -> name
  const facultyNameMap = new Map<string, string>();

  // Initialize from faculty.json to ensure names and IDs are clean
  for (const f of facultyList) {
    if (!f.id || f.id === 'tba' || f.name.toLowerCase() === 'tba') continue;
    facultyNameMap.set(f.id, f.name);
    facultySectionMap.set(f.id, []);
  }

  // Populate sections from sections.json
  for (const s of sections) {
    if (!s.facultyIds || s.facultyIds.length === 0) continue;
    for (let i = 0; i < s.facultyIds.length; i++) {
      const fid = s.facultyIds[i];
      if (!fid || fid === 'tba') continue;

      const fName = s.faculty[i] || s.faculty[0] || fid;
      if (!facultyNameMap.has(fid)) {
        facultyNameMap.set(fid, fName);
      }
      if (!facultySectionMap.has(fid)) {
        facultySectionMap.set(fid, []);
      }
      facultySectionMap.get(fid)!.push(s);
    }
  }

  // Index of courseCode -> list of facultyIds teaching it (for "teaches with")
  const courseFacultyMap = new Map<string, Set<string>>();
  for (const [fid, secList] of facultySectionMap.entries()) {
    for (const s of secList) {
      if (!courseFacultyMap.has(s.courseCode)) {
        courseFacultyMap.set(s.courseCode, new Set());
      }
      courseFacultyMap.get(s.courseCode)!.add(fid);
    }
  }

  const result: FacultyStats[] = [];

  for (const [fid, secList] of facultySectionMap.entries()) {
    const name = facultyNameMap.get(fid) || fid;
    const sortName = stripFacultyTitle(name);

    const programsSet = new Set<'BSCSE' | 'BSDS'>();
    const courseGroupMap = new Map<string, FacultyCourseGroup>();
    const distinctCourseCodes = new Set<string>();
    const theoryCourseCodes = new Set<string>();
    const labCourseCodes = new Set<string>();

    let totalWeeklyMinutes = 0;
    let firstBellSections = 0;
    let lateShiftSections = 0;
    let labSections = 0;
    let satTueSections = 0;
    let mondaySections = 0;

    const floorSet = new Set<number>();
    const roomsSet = new Set<string>();
    const roomMap = new Map<string, number>();

    let earliestStart: number | null = null;
    let latestEnd: number | null = null;

    const weeklyPattern: Record<Day, DayWeeklyPattern> = {
      Sat: { day: 'Sat', meetings: [], count: 0, morningCount: 0, middayCount: 0, afternoonCount: 0 },
      Sun: { day: 'Sun', meetings: [], count: 0, morningCount: 0, middayCount: 0, afternoonCount: 0 },
      Mon: { day: 'Mon', meetings: [], count: 0, morningCount: 0, middayCount: 0, afternoonCount: 0 },
      Tue: { day: 'Tue', meetings: [], count: 0, morningCount: 0, middayCount: 0, afternoonCount: 0 },
      Wed: { day: 'Wed', meetings: [], count: 0, morningCount: 0, middayCount: 0, afternoonCount: 0 },
    };

    const slotCounts = {
      morning: 0,
      midday: 0,
      afternoon: 0,
    };

    for (const s of secList) {
      programsSet.add(s.program);
      distinctCourseCodes.add(s.courseCode);
      if (s.kind === 'lab') {
        labCourseCodes.add(s.courseCode);
        labSections++;
      } else {
        theoryCourseCodes.add(s.courseCode);
      }

      // Check section start times for badges
      const hasEarly = s.meetings.some((m) => m.start <= 510);
      if (hasEarly) firstBellSections++;

      const hasLate = s.meetings.some((m) => m.start >= 831);
      if (hasLate) lateShiftSections++;

      const isSatTue = s.meetings.some((m) => m.day === 'Sat' || m.day === 'Tue');
      if (isSatTue) satTueSections++;

      const isMon = s.meetings.some((m) => m.day === 'Mon');
      if (isMon) mondaySections++;

      // Section days
      const days = Array.from(new Set(s.meetings.map((m) => m.day)));
      const room = s.meetings[0]?.room || null;
      const timeRange = formatMeetingTimeRange(s.meetings);

      // Track rooms and floors
      for (const m of s.meetings) {
        if (m.room) {
          const r = m.room.trim();
          if (r) {
            roomsSet.add(r);
            roomMap.set(r, (roomMap.get(r) || 0) + 1);
            const fl = parseFloorFromRoom(r);
            if (fl !== null) {
              floorSet.add(fl);
            }
          }
        }
      }

      // Course grouping
      if (!courseGroupMap.has(s.courseCode)) {
        courseGroupMap.set(s.courseCode, {
          courseCode: s.courseCode,
          title: s.title,
          credit: s.credit,
          kind: s.kind,
          sections: [],
          sectionCount: 0,
        });
      }
      const group = courseGroupMap.get(s.courseCode)!;
      group.sections.push({
        id: s.id,
        section: s.section,
        kind: s.kind,
        credit: s.credit,
        tentative: s.tentative,
        days,
        timeRange,
        room,
        meetings: s.meetings,
      });
      group.sectionCount++;

      // Process meetings for weekly pattern and total duration
      for (const m of s.meetings) {
        const duration = m.end - m.start;
        totalWeeklyMinutes += duration;

        if (earliestStart === null || m.start < earliestStart) {
          earliestStart = m.start;
        }
        if (latestEnd === null || m.end > latestEnd) {
          latestEnd = m.end;
        }

        const slot = classifyTimeSlot(m.start);
        if (slot === 'Morning') slotCounts.morning++;
        else if (slot === 'Midday') slotCounts.midday++;
        else slotCounts.afternoon++;

        const dayPat = weeklyPattern[m.day];
        if (dayPat) {
          dayPat.meetings.push({
            day: m.day,
            start: m.start,
            end: m.end,
            room: m.room,
            courseCode: s.courseCode,
            courseTitle: s.title,
            section: s.section,
            kind: s.kind,
            tentative: s.tentative,
          });
          dayPat.count++;
          if (slot === 'Morning') dayPat.morningCount++;
          else if (slot === 'Midday') dayPat.middayCount++;
          else dayPat.afternoonCount++;
        }
      }
    }

    // Sort meetings in each day chronologically
    for (const day of DAYS_LIST) {
      weeklyPattern[day].meetings.sort((a, b) => a.start - b.start);
    }

    // Sort course groups by course code
    const courses = Array.from(courseGroupMap.values()).sort((a, b) =>
      a.courseCode.localeCompare(b.courseCode)
    );
    // Sort sections within each course group by section label
    courses.forEach((c) => {
      c.sections.sort((a, b) => a.section.localeCompare(b.section));
    });

    // Total credits across distinct courses
    const totalCredits = courses.reduce((sum, c) => sum + c.credit, 0);

    // Active days and busiest day
    const activeDays = DAYS_LIST.filter((d) => weeklyPattern[d].count > 0);
    let busiestDay: Day | null = null;
    let maxMeetings = 0;
    for (const d of activeDays) {
      if (weeklyPattern[d].count > maxMeetings) {
        maxMeetings = weeklyPattern[d].count;
        busiestDay = d;
      }
    }

    // Calculate longest back-to-back marathon chain
    let maxMarathonChain = 0;
    for (const day of DAYS_LIST) {
      const ms = weeklyPattern[day].meetings;
      if (ms.length === 0) continue;
      let currentChain = 1;
      let dayMax = 1;
      for (let i = 0; i < ms.length - 1; i++) {
        const gap = ms[i + 1].start - ms[i].end;
        if (gap >= 0 && gap <= FACULTY_BADGE_THRESHOLDS.marathonMaxGapMinutes) {
          currentChain++;
          if (currentChain > dayMax) dayMax = currentChain;
        } else {
          currentChain = 1;
        }
      }
      if (dayMax > maxMarathonChain) {
        maxMarathonChain = dayMax;
      }
    }

    const programs = Array.from(programsSet).sort();
    const initials = getFacultyInitials(name);
    const searchAliases = generateSearchAliases(name);
    const avatarColor = getFacultyAvatarColor(fid);
    const totalMeetings = secList.reduce((sum, s) => sum + s.meetings.length, 0);
    const maxSingleRoomMeetings = roomMap.size > 0 ? Math.max(...roomMap.values()) : 0;
    const maxSectionsPerCourse =
      courses.length > 0 ? Math.max(...courses.map((c) => c.sections.length)) : 0;

    // Badges
    const badges = computeFacultyBadges({
      firstBellSections,
      lateShiftSections,
      labSections,
      distinctCourses: distinctCourseCodes.size,
      totalSections: secList.length,
      satTueSections,
      maxMarathonChain,
      distinctFloors: floorSet.size,
      totalMeetings,
      maxSingleRoomMeetings,
      maxSectionsPerCourse,
      programs,
      mondaySections,
    });

    // "Teaches with": other faculty teaching any of the same courses
    const coInstructorCounts = new Map<string, { facultyId: string; sharedCourses: Set<string> }>();
    for (const code of distinctCourseCodes) {
      const coFids = courseFacultyMap.get(code);
      if (!coFids) continue;
      for (const coFid of coFids) {
        if (coFid === fid) continue;
        if (!coInstructorCounts.has(coFid)) {
          coInstructorCounts.set(coFid, { facultyId: coFid, sharedCourses: new Set() });
        }
        coInstructorCounts.get(coFid)!.sharedCourses.add(code);
      }
    }

    const teachesWith = Array.from(coInstructorCounts.values())
      .map((item) => ({
        facultyId: item.facultyId,
        facultyName: facultyNameMap.get(item.facultyId) || item.facultyId,
        sharedCourses: Array.from(item.sharedCourses),
      }))
      .sort((a, b) => {
        if (b.sharedCourses.length !== a.sharedCourses.length) {
          return b.sharedCourses.length - a.sharedCourses.length;
        }
        return a.facultyName.localeCompare(b.facultyName);
      })
      .slice(0, 6);

    result.push({
      id: fid,
      name,
      sortName,
      programs,
      initials,
      searchAliases,
      avatarColor,
      distinctCourseCount: distinctCourseCodes.size,
      theoryCourseCount: theoryCourseCodes.size,
      labCourseCount: labCourseCodes.size,
      totalSections: secList.length,
      totalWeeklyMinutes,
      totalWeeklyHours: Math.round((totalWeeklyMinutes / 60) * 10) / 10,
      totalCredits,
      courses,
      weeklyPattern,
      activeDays,
      daysOnCampus: activeDays.length,
      busiestDay,
      earliestStart,
      latestEnd,
      earliestStartTimeStr: earliestStart !== null ? formatMinutesToTime(earliestStart) : 'None',
      latestEndTimeStr: latestEnd !== null ? formatMinutesToTime(latestEnd) : 'None',
      slotCounts,
      distinctFloors: floorSet.size,
      floors: Array.from(floorSet).sort((a, b) => a - b),
      rooms: Array.from(roomsSet).sort(),
      maxMarathonChain,
      badges,
      teachesWith,
    });
  }

  // Sort faculty alphabetically by name matching natural A-Z order
  result.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  cachedFacultyStats = result;
  return result;
}

/**
 * Returns statistics for a specific faculty by ID (supports legacy ID aliases).
 */
export function getFacultyStatsById(id: string): FacultyStats | undefined {
  const canonicalId = resolveFacultyId(id);
  const all = getAllFacultyStats();
  return all.find((f) => f.id === canonicalId);
}

/**
 * Extract and group TBA (unassigned) sections.
 */
export function getTBASections(): TBACourseGroup[] {
  if (cachedTBASections) return cachedTBASections;

  const sections = rawSections as Section[];
  const tbaSections: TBASection[] = [];

  for (const s of sections) {
    const isTBA =
      !s.facultyIds ||
      s.facultyIds.length === 0 ||
      s.faculty.includes('TBA') ||
      s.facultyIds.includes('tba');

    if (isTBA) {
      const days = Array.from(new Set(s.meetings.map((m) => m.day)));
      tbaSections.push({
        id: s.id,
        sl: s.sl,
        program: s.program,
        courseCode: s.courseCode,
        courseTitle: s.title,
        section: s.section,
        credit: s.credit,
        kind: s.kind,
        meetings: s.meetings,
        timeRange: formatMeetingTimeRange(s.meetings),
        days,
        room: s.meetings[0]?.room || null,
        tentative: s.tentative,
      });
    }
  }

  // Group by course
  const groupMap = new Map<string, TBACourseGroup>();
  for (const s of tbaSections) {
    if (!groupMap.has(s.courseCode)) {
      groupMap.set(s.courseCode, {
        courseCode: s.courseCode,
        courseTitle: s.courseTitle,
        sections: [],
      });
    }
    groupMap.get(s.courseCode)!.sections.push(s);
  }

  const groups = Array.from(groupMap.values()).sort((a, b) =>
    a.courseCode.localeCompare(b.courseCode)
  );

  groups.forEach((g) => {
    g.sections.sort((a, b) => a.section.localeCompare(b.section));
  });

  cachedTBASections = groups;
  return groups;
}

/**
 * Filters faculty based on criteria: search, program, day, time slot, course kind.
 */
export function filterFaculty(
  facultyList: FacultyStats[],
  criteria: FacultyFilterCriteria
): FacultyStats[] {
  const { search, program, day, timeSlot, kind } = criteria;
  const q = search?.trim().toLowerCase();

  return facultyList.filter((f) => {
    // 1. Text search: matches name, course code, course title, or initials/aliases
    if (q) {
      const qUpper = q.toUpperCase();
      const matchName = f.name.toLowerCase().includes(q) || f.sortName.toLowerCase().includes(q);
      const matchCourse = f.courses.some(
        (c) =>
          c.courseCode.toLowerCase().includes(q) ||
          c.courseCode.toLowerCase().replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
          c.title.toLowerCase().includes(q)
      );
      const matchInitials =
        f.initials.toUpperCase().startsWith(qUpper) ||
        f.searchAliases.some((alias) => alias.toUpperCase().startsWith(qUpper));

      if (!matchName && !matchCourse && !matchInitials) return false;
    }

    // 2. Program filter
    if (program && program !== 'ALL') {
      if (!f.programs.includes(program)) return false;
    }

    // 3. Day filter
    if (day && day !== 'ALL') {
      if (!f.activeDays.includes(day)) return false;
    }

    // 4. Time Slot filter
    if (timeSlot && timeSlot !== 'ALL') {
      if (timeSlot === 'Morning' && f.slotCounts.morning === 0) return false;
      if (timeSlot === 'Midday' && f.slotCounts.midday === 0) return false;
      if (timeSlot === 'Afternoon' && f.slotCounts.afternoon === 0) return false;
    }

    // 5. Kind filter
    if (kind && kind !== 'ALL') {
      if (kind === 'theory' && f.theoryCourseCount === 0) return false;
      if (kind === 'lab' && f.labCourseCount === 0) return false;
    }

    return true;
  });
}

/**
 * Sorts faculty according to selected criteria.
 */
export function sortFaculty(
  facultyList: FacultyStats[],
  sortBy: FacultyFilterCriteria['sortBy'] = 'az'
): FacultyStats[] {
  const list = [...facultyList];

  switch (sortBy) {
    case 'most-sections':
      return list.sort((a, b) => {
        if (b.totalSections !== a.totalSections) return b.totalSections - a.totalSections;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
    case 'most-courses':
      return list.sort((a, b) => {
        if (b.distinctCourseCount !== a.distinctCourseCount) {
          return b.distinctCourseCount - a.distinctCourseCount;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
    case 'most-credits':
      return list.sort((a, b) => {
        if (b.totalCredits !== a.totalCredits) return b.totalCredits - a.totalCredits;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
    case 'most-hours':
      return list.sort((a, b) => {
        if (b.totalWeeklyMinutes !== a.totalWeeklyMinutes) {
          return b.totalWeeklyMinutes - a.totalWeeklyMinutes;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
    case 'az':
    default:
      return list.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
  }
}

/**
 * Computes the top-5 leaderboards.
 */
export interface LeaderboardEntry {
  facultyId: string;
  name: string;
  initials: string;
  avatarColor: { bg: string; text: string; border: string };
  programs: ('BSCSE' | 'BSDS')[];
  metricValue: string | number;
  metricLabel: string;
}

export interface Leaderboards {
  mostTheoryCourses: LeaderboardEntry[];
  mostLabCourses: LeaderboardEntry[];
  mostSections: LeaderboardEntry[];
  mostCourses: LeaderboardEntry[];
  mostHours: LeaderboardEntry[];
  mostFirstBell: LeaderboardEntry[];
}

export function getFacultyLeaderboards(allFaculty: FacultyStats[]): Leaderboards {
  const byTheoryCourses = [...allFaculty]
    .sort(
      (a, b) => b.theoryCourseCount - a.theoryCourseCount || a.name.localeCompare(b.name)
    )
    .slice(0, 5)
    .map((f) => ({
      facultyId: f.id,
      name: f.name,
      initials: f.initials,
      avatarColor: f.avatarColor,
      programs: f.programs,
      metricValue: `${f.theoryCourseCount} courses`,
      metricLabel: 'Theory Courses',
    }));

  const byLabCourses = [...allFaculty]
    .sort((a, b) => b.labCourseCount - a.labCourseCount || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map((f) => ({
      facultyId: f.id,
      name: f.name,
      initials: f.initials,
      avatarColor: f.avatarColor,
      programs: f.programs,
      metricValue: `${f.labCourseCount} courses`,
      metricLabel: 'Lab Courses',
    }));

  const bySections = [...allFaculty]
    .sort((a, b) => b.totalSections - a.totalSections || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map((f) => ({
      facultyId: f.id,
      name: f.name,
      initials: f.initials,
      avatarColor: f.avatarColor,
      programs: f.programs,
      metricValue: `${f.totalSections} sections`,
      metricLabel: 'Sections',
    }));

  const byCourses = [...allFaculty]
    .sort(
      (a, b) => b.distinctCourseCount - a.distinctCourseCount || a.name.localeCompare(b.name)
    )
    .slice(0, 5)
    .map((f) => ({
      facultyId: f.id,
      name: f.name,
      initials: f.initials,
      avatarColor: f.avatarColor,
      programs: f.programs,
      metricValue: `${f.distinctCourseCount} courses`,
      metricLabel: 'Courses',
    }));

  const byHours = [...allFaculty]
    .sort(
      (a, b) => b.totalWeeklyMinutes - a.totalWeeklyMinutes || a.name.localeCompare(b.name)
    )
    .slice(0, 5)
    .map((f) => ({
      facultyId: f.id,
      name: f.name,
      initials: f.initials,
      avatarColor: f.avatarColor,
      programs: f.programs,
      metricValue: `${f.totalWeeklyHours} hrs`,
      metricLabel: 'Weekly Hours',
    }));

  // First Bell sections count
  const byFirstBell = [...allFaculty]
    .map((f) => {
      let fbCount = 0;
      for (const c of f.courses) {
        for (const s of c.sections) {
          if (s.meetings.some((m) => m.start <= 510)) {
            fbCount++;
          }
        }
      }
      return { f, fbCount };
    })
    .sort((a, b) => b.fbCount - a.fbCount || a.f.name.localeCompare(b.f.name))
    .slice(0, 5)
    .map(({ f, fbCount }) => ({
      facultyId: f.id,
      name: f.name,
      initials: f.initials,
      avatarColor: f.avatarColor,
      programs: f.programs,
      metricValue: `${fbCount} early`,
      metricLabel: '08:30 AM starts',
    }));

  return {
    mostTheoryCourses: byTheoryCourses,
    mostLabCourses: byLabCourses,
    mostSections: bySections,
    mostCourses: byCourses,
    mostHours: byHours,
    mostFirstBell: byFirstBell,
  };
}

/**
 * Returns a daily-rotating faculty spotlight based on a date hash.
 * Completely deterministic; produces identical result for the same date string.
 */
export function getDailyFacultySpotlight(
  allFaculty: FacultyStats[],
  dateStr?: string
): FacultyStats | null {
  if (!allFaculty || allFaculty.length === 0) return null;
  // Use YYYY-MM-DD or provided date string
  const key = dateStr || '2026-10-22';
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % allFaculty.length;
  return allFaculty[idx];
}
