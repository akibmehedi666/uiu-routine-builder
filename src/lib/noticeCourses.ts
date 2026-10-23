import rawSections from '../../data/sections.json';
import rawCourses from '../../data/courses.json';
import { Section, Course } from '../types';

export interface NoticeCourseItem {
  code: string;
  title: string;
}

export interface NoticeExpandedCourseItem {
  code: string;
  title: string;
  changeKind: 'faculty' | 'schedule' | 'faculty & schedule' | 'new section';
}

export interface NoticeData {
  facultyChangedCodes: NoticeCourseItem[];
  scheduleChangedCodes: NoticeCourseItem[];
  allChangedCourses: NoticeExpandedCourseItem[];
}

/**
 * Extracts unique course codes of updated sections sorted naturally.
 * Used for tests and backwards compatibility.
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

/**
 * Computes all notice course data with course titles and change kinds.
 * Generated automatically from data/sections.json and data/courses.json.
 */
export function getNoticeData(
  sections: Section[] = rawSections as Section[],
  courses: Course[] = rawCourses as Course[]
): NoticeData {
  const titleMap = new Map<string, string>();
  for (const c of courses) {
    if (!titleMap.has(c.code)) {
      titleMap.set(c.code, c.title);
    }
  }

  const naturalSort = (a: { code: string }, b: { code: string }) =>
    a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });

  const facSet = new Set<string>();
  const schedSet = new Set<string>();
  const courseKindsMap = new Map<string, Set<string>>();

  for (const s of sections) {
    if (s.updated) {
      const kind = s.updatedKind || 'faculty';
      if (!courseKindsMap.has(s.courseCode)) {
        courseKindsMap.set(s.courseCode, new Set());
      }
      courseKindsMap.get(s.courseCode)!.add(kind);

      if (kind === 'faculty' || kind === 'both') {
        facSet.add(s.courseCode);
      }
      if (kind === 'schedule' || kind === 'new' || kind === 'both') {
        schedSet.add(s.courseCode);
      }
    }
  }

  const facultyChangedCodes: NoticeCourseItem[] = Array.from(facSet)
    .map((code) => ({
      code,
      title: titleMap.get(code) || code,
    }))
    .sort(naturalSort);

  const scheduleChangedCodes: NoticeCourseItem[] = Array.from(schedSet)
    .map((code) => ({
      code,
      title: titleMap.get(code) || code,
    }))
    .sort(naturalSort);

  const allChangedCourses: NoticeExpandedCourseItem[] = Array.from(courseKindsMap.keys())
    .map((code) => {
      const kinds = courseKindsMap.get(code)!;
      let changeKind: 'faculty' | 'schedule' | 'faculty & schedule' | 'new section' = 'faculty';
      if (kinds.has('both') || (kinds.has('faculty') && kinds.has('schedule'))) {
        changeKind = 'faculty & schedule';
      } else if (kinds.has('new')) {
        changeKind = 'new section';
      } else if (kinds.has('schedule')) {
        changeKind = 'schedule';
      } else {
        changeKind = 'faculty';
      }

      return {
        code,
        title: titleMap.get(code) || code,
        changeKind,
      };
    })
    .sort(naturalSort);

  return {
    facultyChangedCodes,
    scheduleChangedCodes,
    allChangedCourses,
  };
}
