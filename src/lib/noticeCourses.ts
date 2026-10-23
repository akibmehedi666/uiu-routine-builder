import rawSections from '../../data/sections.json';
import { Section } from '../types';

/**
 * Extracts unique course codes of updated sections sorted naturally.
 * Used for the landing page temporary notice banner.
 */
export function getUpdatedCourseLists(sections: Section[] = rawSections as Section[]): {
  facultyCourses: string[];
  scheduleCourses: string[];
} {
  const facSet = new Set<string>();
  const schedSet = new Set<string>();

  for (const s of sections) {
    if (s.updated) {
      const kind = s.updatedKind || 'faculty';
      if (kind === 'faculty' || kind === 'both') {
        facSet.add(s.courseCode);
      }
      if (kind === 'schedule' || kind === 'new' || kind === 'both') {
        schedSet.add(s.courseCode);
      }
    }
  }

  const naturalSort = (a: string, b: string) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

  return {
    facultyCourses: Array.from(facSet).sort(naturalSort),
    scheduleCourses: Array.from(schedSet).sort(naturalSort),
  };
}
