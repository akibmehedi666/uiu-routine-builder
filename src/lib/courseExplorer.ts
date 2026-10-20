import { Day, Section } from '../types';
import { computeSectionMask, hasOverlap } from '../solver/bitmask';

export interface FacultySectionGroup {
  facultyName: string;
  facultyId: string;
  sections: Section[];
}

export type SortByOption = 'name' | 'time' | 'section';
export type TimeOfDayOption = 'all' | 'morning' | 'midday' | 'afternoon';

export interface FilterOptions {
  facultyQuery?: string;
  dayFilter?: Day[];
  timeOfDay?: TimeOfDayOption;
}

/**
 * Groups a course's sections by distinct faculty member.
 * If a section has multiple or TBA faculty, each faculty member gets the section.
 */
export function groupCourseSectionsByFaculty(
  sections: Section[]
): FacultySectionGroup[] {
  const map = new Map<string, { facultyName: string; facultyId: string; sections: Section[] }>();

  for (const sec of sections) {
    const names = sec.faculty && sec.faculty.length > 0 ? sec.faculty : ['TBA'];
    const ids = sec.facultyIds && sec.facultyIds.length > 0 ? sec.facultyIds : ['tba'];

    names.forEach((name, i) => {
      const id = ids[i] || ids[0] || 'tba';
      if (!map.has(id)) {
        map.set(id, {
          facultyName: name,
          facultyId: id,
          sections: [],
        });
      }
      map.get(id)!.sections.push(sec);
    });
  }

  return Array.from(map.values());
}

/**
 * Filters sections based on faculty search query, day chips, and time of day.
 */
export function filterSections(
  sections: Section[],
  options: FilterOptions
): Section[] {
  const { facultyQuery, dayFilter, timeOfDay } = options;
  const q = facultyQuery ? facultyQuery.trim().toLowerCase() : '';

  return sections.filter((sec) => {
    // 1. Faculty search query (name or id)
    if (q) {
      const matchesName = sec.faculty.some((f) => f.toLowerCase().includes(q));
      const matchesId = sec.facultyIds.some((id) => id.toLowerCase().includes(q));
      if (!matchesName && !matchesId) return false;
    }

    // 2. Day chips (if specified, section must have at least one meeting on chosen day)
    if (dayFilter && dayFilter.length > 0) {
      const secDays = sec.meetings.map((m) => m.day);
      const matchesDay = dayFilter.some((d) => secDays.includes(d));
      if (!matchesDay) return false;
    }

    // 3. Time of day filter
    // Morning: before 11:10 (start < 670)
    // Midday: 11:10 to 13:50 (670 <= start < 830)
    // Afternoon: 13:50 and later (start >= 830)
    if (timeOfDay && timeOfDay !== 'all') {
      const earliestStart = Math.min(...sec.meetings.map((m) => m.start));
      if (timeOfDay === 'morning' && earliestStart >= 670) return false;
      if (
        timeOfDay === 'midday' &&
        (earliestStart < 670 || earliestStart >= 830)
      ) {
        return false;
      }
      if (timeOfDay === 'afternoon' && earliestStart < 830) return false;
    }

    return true;
  });
}

/**
 * Sorts faculty groups based on user selection.
 */
export function sortFacultyGroups(
  groups: FacultySectionGroup[],
  sortBy: SortByOption
): FacultySectionGroup[] {
  const copy = groups.map((g) => ({
    ...g,
    sections: [...g.sections].sort((a, b) => a.section.localeCompare(b.section)),
  }));

  if (sortBy === 'name') {
    return copy.sort((a, b) => {
      // Keep TBA at the bottom
      if (a.facultyName === 'TBA') return 1;
      if (b.facultyName === 'TBA') return -1;
      return a.facultyName.localeCompare(b.facultyName);
    });
  }

  if (sortBy === 'time') {
    return copy.sort((a, b) => {
      const minA = Math.min(
        ...a.sections.flatMap((s) => s.meetings.map((m) => m.start))
      );
      const minB = Math.min(
        ...b.sections.flatMap((s) => s.meetings.map((m) => m.start))
      );
      return minA - minB;
    });
  }

  if (sortBy === 'section') {
    return copy.sort((a, b) => {
      const secA = a.sections[0]?.section || '';
      const secB = b.sections[0]?.section || '';
      return secA.localeCompare(secB);
    });
  }

  return copy;
}

/**
 * Checks if a section clashes with any active course in the schedule (read-only using bitmasks).
 * Returns the clashing course code or null.
 */
export function checkSectionClash(
  section: Section,
  activeScheduleSections: Section[]
): string | null {
  if (!activeScheduleSections || activeScheduleSections.length === 0) {
    return null;
  }

  const secBitmask = computeSectionMask(section);

  for (const other of activeScheduleSections) {
    // Skip if comparing to the same course
    if (other.courseCode === section.courseCode) continue;

    const otherBitmask = computeSectionMask(other);
    if (hasOverlap(secBitmask, otherBitmask)) {
      return other.courseCode;
    }
  }

  return null;
}
