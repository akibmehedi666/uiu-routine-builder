import { Course, Day, DAYS_LIST, Meeting, Section, SolveRequest } from '../types';
import { normalizeForSearch, slugifyFacultyName } from './facultyIndex';
import {
  buildSearchIndexFromDirectory,
  searchCourses,
  naturalCourseCodeSort,
  CourseSearchIndexEntry,
} from './courseSearch';
import { isManualScheduleCourse } from './fixedCourses';

export interface CourseDirectorySection {
  id: string;
  sl: number;
  program: 'BSCSE' | 'BSDS';
  courseCode: string;
  section: string;
  credit: number;
  kind: Section['kind'];
  tentative: boolean;
  faculty: string[];
  facultyIds: string[];
  primaryFaculty: string;
  primaryFacultyId: string;
  facultyInitials: string;
  avatarColor: { bg: string; text: string; border: string };
  meetings: Meeting[];
  activeDays: Day[];
  dayMask: boolean[]; // length 5 for Sat, Sun, Mon, Tue, Wed
  timeOfDay: ('Morning' | 'Midday' | 'Afternoon')[];
  fixed?: boolean;
  manual?: boolean;
  synthetic?: boolean;
  updated?: boolean;
  updatedNote?: string;
  updatedOn?: string;
}

export interface CourseDirectoryItem {
  code: string;
  title: string;
  program: 'BSCSE' | 'BSDS';
  credit: number;
  hasLab: boolean;
  labCode?: string;
  theoryCode?: string;
  isLab: boolean;
  isFixed?: boolean;
  isManual?: boolean;
  fixedSchedule?: string;
  pairedCourseCode?: string;
  sections: CourseDirectorySection[];
  sectionCount: number;
  facultyCount: number;
  facultyNames: string[];
  searchNormalized: string;
  searchMatchDetail?: string;
  _searchScore?: number;
}

export interface CourseFilterCriteria {
  search?: string;
  program?: 'ALL' | 'BSCSE' | 'BSDS';
  credit?: 'ALL' | number;
  type?: 'ALL' | 'theory' | 'lab';
}

export type CourseSortOption = 'relevance' | 'code-az' | 'title-az' | 'most-sections';

export interface SectionFilterCriteria {
  facultySearch?: string;
  days?: Day[];
  timeSlots?: ('Morning' | 'Midday' | 'Afternoon')[];
  sortBy?: 'section' | 'faculty' | 'time';
  groupByFaculty?: boolean;
}

export interface FacultyCrossReferenceItem {
  courseCode: string;
  courseTitle: string;
  section: string;
  kind: Section['kind'];
  meetings: Meeting[];
}

/**
 * Palette of 12 soft light-theme hues for faculty avatars (WCAG AA contrast compliant)
 */
export const AVATAR_PALETTE = [
  { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' }, // Orange soft
  { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC' }, // Indigo soft
  { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' }, // Emerald soft
  { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' }, // Rose soft
  { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' }, // Amber soft
  { bg: '#E0F2FE', text: '#075985', border: '#7DD3FC' }, // Sky soft
  { bg: '#F3E8FF', text: '#6B21A8', border: '#D8B4FE' }, // Purple soft
  { bg: '#CCFBF1', text: '#115E59', border: '#5EEAD4' }, // Teal soft
  { bg: '#FAE8FF', text: '#86198F', border: '#F0ABFC' }, // Fuchsia soft
  { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' }, // Slate soft
  { bg: '#ECFCCB', text: '#3F6212', border: '#BEF264' }, // Lime soft
  { bg: '#FFE4E6', text: '#9F1239', border: '#FDA4AF' }, // Pink soft
];

/**
 * Deterministically pick an avatar color for a faculty member
 */
export function getFacultyAvatarColor(name: string): { bg: string; text: string; border: string } {
  if (!name || name === 'TBA') {
    return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' };
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

/**
 * Extracts 2-letter initials from faculty names, ignoring common titles
 */
export function getFacultyInitials(name: string): string {
  if (!name || name === 'TBA') return 'TBA';
  let clean = name.trim();
  const prefixRegex = /^(?:dr|prof|md|mst|mr|mrs|engr|m)\.?\s+/i;
  while (prefixRegex.test(clean)) {
    clean = clean.replace(prefixRegex, '').trim();
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) {
    const uppers = clean.replace(/[^A-Z]/g, '');
    if (uppers.length >= 2) {
      return (uppers[0] + uppers[uppers.length - 1]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Natural alphabetical sorting for section labels:
 * A, B, ... Z, AA, AB, ... and handles numbers like A1, A2
 */
export function naturalSectionSort(a: string, b: string): number {
  const aAlpha = a.replace(/[0-9]/g, '');
  const bAlpha = b.replace(/[0-9]/g, '');
  if (aAlpha.length !== bAlpha.length) {
    return aAlpha.length - bAlpha.length;
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Course search matching with common aliases (DSA, OOP, AI, DB, OS, FYDP, etc.)
 */
export function matchesCourseQuery(
  item: CourseDirectoryItem,
  query: string
): boolean {
  if (!query) return true;
  const term = normalizeForSearch(query);
  if (!term) return true;

  // Code match (e.g. cse 1111, 1111)
  const normCode = normalizeForSearch(item.code);
  if (normCode.includes(term) || item.code.toLowerCase().replace(/\s+/g, '').includes(term.replace(/\s+/g, ''))) {
    return true;
  }

  // Title match
  const normTitle = normalizeForSearch(item.title);
  if (normTitle.includes(term)) return true;

  // Faculty match
  for (const fac of item.facultyNames) {
    if (normalizeForSearch(fac).includes(term)) return true;
  }

  // Common aliases
  const aliasMatch =
    (term === 'dsa' && normTitle.includes('data structure')) ||
    (term === 'oop' && normTitle.includes('object oriented')) ||
    (term === 'ai' && normTitle.includes('artificial intelligence')) ||
    (term === 'db' && (normTitle.includes('database') || normTitle.includes('dbms'))) ||
    (term === 'os' && normTitle.includes('operating system')) ||
    (term === 'cn' && normTitle.includes('computer network')) ||
    (term === 'se' && normTitle.includes('software engineering')) ||
    (term === 'ml' && normTitle.includes('machine learning')) ||
    (term === 'math' && normCode.startsWith('math')) ||
    (term === 'stat' && normCode.startsWith('stat')) ||
    (term === 'phy' && normCode.startsWith('phy')) ||
    (term === 'chem' && normCode.startsWith('chem')) ||
    (term === 'eng' && normCode.startsWith('eng')) ||
    (term === 'act' && normCode.startsWith('act')) ||
    (term === 'eco' && normCode.startsWith('eco')) ||
    (term === 'bio' && normCode.startsWith('bio')) ||
    (term === 'spl' && normTitle.includes('structured programming')) ||
    (term === 'algo' && normTitle.includes('algorithm')) ||
    (term === 'automata' && normTitle.includes('theory of computation')) ||
    (term === 'compiler' && normTitle.includes('compiler')) ||
    (term === 'graphics' && normTitle.includes('computer graphics')) ||
    (term === 'cg' && normTitle.includes('computer graphics')) ||
    (term === 'project' && (normCode.includes('4000') || normTitle.includes('project'))) ||
    (term === 'thesis' && (normCode.includes('4000') || normTitle.includes('thesis'))) ||
    (term === 'internship' && normCode.includes('4000')) ||
    (term === 'fydp' && normCode.includes('4000'));

  return !!aliasMatch;
}

/**
 * Builds the course-first directory index once
 */
export function buildCourseDirectory(
  courses: Course[],
  sections: Section[]
): CourseDirectoryItem[] {
  // Group sections by courseCode
  const sectionsByCourse = new Map<string, Section[]>();
  for (const sec of sections) {
    if (!sectionsByCourse.has(sec.courseCode)) {
      sectionsByCourse.set(sec.courseCode, []);
    }
    sectionsByCourse.get(sec.courseCode)!.push(sec);
  }

  // Map each course into CourseDirectoryItem
  const result: CourseDirectoryItem[] = courses.map((c) => {
    const rawSections = sectionsByCourse.get(c.code) || [];
    const facultySet = new Set<string>();

    const processedSections: CourseDirectorySection[] = rawSections.map((s) => {
      const primaryFaculty = s.faculty?.[0] || 'TBA';
      const primaryFacultyId = s.facultyIds?.[0] || slugifyFacultyName(primaryFaculty);
      if (primaryFaculty !== 'TBA') {
        facultySet.add(primaryFaculty);
      }

      const activeDays: Day[] = [];
      const dayMask = [false, false, false, false, false]; // Sat, Sun, Mon, Tue, Wed
      const timeOfDaySet = new Set<'Morning' | 'Midday' | 'Afternoon'>();

      for (const m of s.meetings || []) {
        activeDays.push(m.day);
        const dayIdx = DAYS_LIST.indexOf(m.day);
        if (dayIdx >= 0) dayMask[dayIdx] = true;

        if (m.start < 670) timeOfDaySet.add('Morning');
        else if (m.start >= 670 && m.start < 840) timeOfDaySet.add('Midday');
        else timeOfDaySet.add('Afternoon');
      }

      return {
        id: s.id,
        sl: s.sl,
        program: s.program,
        courseCode: s.courseCode,
        section: s.section,
        credit: s.credit,
        kind: s.kind,
        tentative: !!s.tentative,
        faculty: s.faculty || [],
        facultyIds: s.facultyIds || [],
        primaryFaculty,
        primaryFacultyId,
        facultyInitials: getFacultyInitials(primaryFaculty),
        avatarColor: getFacultyAvatarColor(primaryFaculty),
        meetings: s.meetings || [],
        activeDays,
        dayMask,
        timeOfDay: Array.from(timeOfDaySet),
        fixed: s.fixed,
        manual: s.manual,
        synthetic: s.synthetic,
        updated: s.updated,
        updatedNote: s.updatedNote,
        updatedOn: s.updatedOn,
      };
    });

    // Natural sort sections: A, B, ... Z, AA, AB...
    processedSections.sort((a, b) => naturalSectionSort(a.section, b.section));

    const isLab =
      c.credit <= 2 &&
      (c.title.toLowerCase().includes('laboratory') ||
        c.title.toLowerCase().includes('lab') ||
        c.code.endsWith('2') ||
        c.code.endsWith('4') ||
        c.code.endsWith('6') ||
        c.code.endsWith('8'));

    const facultyNames = Array.from(facultySet).sort();
    const isManual = isManualScheduleCourse(c.code) || processedSections.some((s) => s.manual);
    const isFixed = processedSections.some((s) => s.fixed);

    return {
      code: c.code,
      title: c.title,
      program: c.program,
      credit: c.credit,
      hasLab: !!c.hasLab,
      labCode: c.labCode,
      theoryCode: c.theoryCode,
      isLab,
      isFixed,
      isManual,
      pairedCourseCode: c.labCode || c.theoryCode,
      sections: processedSections,
      sectionCount: processedSections.length,
      facultyCount: facultyNames.length,
      facultyNames,
      searchNormalized: normalizeForSearch(`${c.code} ${c.title} ${facultyNames.join(' ')}`),
    };
  });

  // Natural code sort by default: ACT, BDS, ..., CSE 1111, CSE 1112, ...
  return result.sort((a, b) => naturalCourseCodeSort(a.code, b.code));
}

/**
 * Filter the course list based on search, program, credit, and type.
 * When search is provided, courses are filtered and ranked by relevance.
 */
export function filterCourses(
  courses: CourseDirectoryItem[],
  criteria: CourseFilterCriteria,
  searchIndex?: Map<string, CourseSearchIndexEntry>
): CourseDirectoryItem[] {
  const { search, program, credit, type } = criteria;

  const matchAttributes = (c: CourseDirectoryItem) => {
    // 1. Program filter
    if (program && program !== 'ALL' && c.program !== program) {
      return false;
    }

    // 2. Credit filter
    if (credit && credit !== 'ALL' && c.credit !== credit) {
      return false;
    }

    // 3. Type filter (theory vs lab)
    if (type && type !== 'ALL') {
      if (type === 'lab' && !c.isLab) return false;
      if (type === 'theory' && c.isLab) return false;
    }

    return true;
  };

  if (!search || !search.trim()) {
    return courses.filter(matchAttributes);
  }

  const index = searchIndex || buildSearchIndexFromDirectory(courses);
  const searchResults = searchCourses(search, index);
  const resultMap = new Map(searchResults.map((r) => [r.code, r]));

  const filtered = courses.filter((c) => matchAttributes(c) && resultMap.has(c.code));

  // Deduplicate by courseCode so search results never contain duplicate rows
  const seenCodes = new Set<string>();
  const dedupedFiltered: CourseDirectoryItem[] = [];
  for (const c of filtered) {
    if (!seenCodes.has(c.code)) {
      seenCodes.add(c.code);
      dedupedFiltered.push(c);
    }
  }

  return dedupedFiltered
    .map((c) => {
      const match = resultMap.get(c.code);
      return {
        ...c,
        searchMatchDetail: match?.matchDetail,
        _searchScore: match?.score || 0,
      };
    })
    .sort((a, b) => {
      const scoreDiff = (b._searchScore || 0) - (a._searchScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return naturalCourseCodeSort(a.code, b.code);
    });
}

/**
 * Sort the course list
 */
export function sortCourses(
  courses: CourseDirectoryItem[],
  sortBy: CourseSortOption
): CourseDirectoryItem[] {
  const copy = [...courses];
  switch (sortBy) {
    case 'relevance':
      return copy.sort((a, b) => {
        const scoreDiff = (b._searchScore || 0) - (a._searchScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return naturalCourseCodeSort(a.code, b.code);
      });
    case 'title-az':
      return copy.sort(
        (a, b) => a.title.localeCompare(b.title) || naturalCourseCodeSort(a.code, b.code)
      );
    case 'most-sections':
      return copy.sort(
        (a, b) => b.sectionCount - a.sectionCount || naturalCourseCodeSort(a.code, b.code)
      );
    case 'code-az':
    default:
      return copy.sort((a, b) => naturalCourseCodeSort(a.code, b.code));
  }
}

/**
 * Computes count of active section filters.
 * Note: groupByFaculty and sortBy are view options, NOT filters.
 */
export function getActiveSectionFilterCount(filters: {
  facultySearch?: string;
  days?: Day[];
  timeSlots?: ('Morning' | 'Midday' | 'Afternoon')[];
  groupByFaculty?: boolean;
}): number {
  return (
    (filters.facultySearch ? 1 : 0) +
    (filters.days?.length || 0) +
    (filters.timeSlots?.length || 0)
  );
}

/**
 * Filter sections within a selected course
 */
export function filterCourseSections(
  sections: CourseDirectorySection[],
  criteria: SectionFilterCriteria
): CourseDirectorySection[] {
  const { facultySearch, days, timeSlots, sortBy } = criteria;
  const normFac = facultySearch ? normalizeForSearch(facultySearch) : '';

  let filtered = sections.filter((sec) => {
    // Faculty search
    if (normFac) {
      const match = sec.faculty.some((f) => normalizeForSearch(f).includes(normFac));
      if (!match) return false;
    }

    // Days filter
    if (days && days.length > 0) {
      const hasDay = days.some((d) => sec.activeDays.includes(d));
      if (!hasDay) return false;
    }

    // Time of day filter
    if (timeSlots && timeSlots.length > 0) {
      const hasSlot = timeSlots.some((s) => sec.timeOfDay.includes(s));
      if (!hasSlot) return false;
    }

    return true;
  });

  // Section sorting
  if (sortBy === 'faculty') {
    filtered.sort((a, b) =>
      a.primaryFaculty.localeCompare(b.primaryFaculty) || naturalSectionSort(a.section, b.section)
    );
  } else if (sortBy === 'time') {
    filtered.sort((a, b) => {
      const aStart = a.meetings[0]?.start || 9999;
      const bStart = b.meetings[0]?.start || 9999;
      return aStart - bStart || naturalSectionSort(a.section, b.section);
    });
  } else {
    filtered.sort((a, b) => naturalSectionSort(a.section, b.section));
  }

  return filtered;
}

/**
 * Group sections by faculty member
 */
export function groupSectionsByFaculty(
  sections: CourseDirectorySection[]
): { facultyName: string; facultyId: string; sections: CourseDirectorySection[] }[] {
  const map = new Map<string, { facultyName: string; facultyId: string; sections: CourseDirectorySection[] }>();

  for (const sec of sections) {
    const key = sec.primaryFacultyId || 'tba';
    if (!map.has(key)) {
      map.set(key, {
        facultyName: sec.primaryFaculty,
        facultyId: sec.primaryFacultyId,
        sections: [],
      });
    }
    map.get(key)!.sections.push(sec);
  }

  const groups = Array.from(map.values());
  groups.sort((a, b) => a.facultyName.localeCompare(b.facultyName));
  return groups;
}

/**
 * Find all other courses/sections taught by a faculty member across the whole trimester
 */
export function getFacultyCrossReferences(
  allSections: Section[],
  facultyName: string,
  excludeCourseCode?: string
): FacultyCrossReferenceItem[] {
  if (!facultyName || facultyName === 'TBA') return [];
  const targetNorm = normalizeForSearch(facultyName);

  const results: FacultyCrossReferenceItem[] = [];

  for (const s of allSections) {
    if (excludeCourseCode && s.courseCode === excludeCourseCode) continue;
    const isTeaching = s.faculty?.some((f) => normalizeForSearch(f) === targetNorm);
    if (isTeaching) {
      results.push({
        courseCode: s.courseCode,
        courseTitle: s.title,
        section: s.section,
        kind: s.kind,
        meetings: s.meetings || [],
      });
    }
  }

  results.sort((a, b) => a.courseCode.localeCompare(b.courseCode) || naturalSectionSort(a.section, b.section));
  return results;
}

/**
 * Plain-text copy export for course sections
 */
export function generateCopyCourseSections(course: CourseDirectoryItem): string {
  const lines: string[] = [
    `=== ${course.code}: ${course.title} (${course.credit} Cr) ===`,
    `Total Sections: ${course.sectionCount} | Faculty: ${course.facultyCount}`,
    '',
  ];

  for (const s of course.sections) {
    const meetStr = s.meetings
      .map((m) => {
        const startH = Math.floor(m.start / 60).toString().padStart(2, '0');
        const startM = (m.start % 60).toString().padStart(2, '0');
        const endH = Math.floor(m.end / 60).toString().padStart(2, '0');
        const endM = (m.end % 60).toString().padStart(2, '0');
        const room = m.room ? ` (Room ${m.room})` : '';
        return `${m.day} ${startH}:${startM}–${endH}:${endM}${room}`;
      })
      .join(', ');

    lines.push(`Section ${s.section}: ${s.primaryFaculty} | ${meetStr || 'No times scheduled'}`);
  }

  return lines.join('\n');
}
