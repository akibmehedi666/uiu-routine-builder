import { Course, Faculty, Section } from '../types';

export interface FacultyMeeting {
  day: string;
  start: number;
  end: number;
  room?: string;
}

export interface FacultyTeachingSection {
  id: string; // section ID
  sl: number;
  program: string;
  courseCode: string;
  courseTitle: string;
  section: string;
  credit: number;
  kind: Section['kind'];
  meetings: FacultyMeeting[];
  tentative: boolean;
}

export interface FacultyCourseGroup {
  courseCode: string;
  courseTitle: string;
  program: string;
  credit: number;
  sections: FacultyTeachingSection[];
}

export interface FacultyTimetableBlock {
  courseCode: string;
  section: string;
  room?: string;
  kind: Section['kind'];
  day: string;
  start: number;
  end: number;
  isClashing?: boolean;
}

export interface FacultyEntry {
  id: string; // slug
  name: string;
  searchNormalized: string;
  initials?: string;
  programs: string[];
  courseCodes: string[];
  courses: FacultyCourseGroup[];
  totalSections: number;
  totalWeeklySlots: number;
  hasClash: boolean;
  clashingSlots: FacultyTimetableBlock[];
  timetableBlocks: FacultyTimetableBlock[];
}

export interface FacultyFilters {
  search?: string;
  program?: 'ALL' | 'BSCSE' | 'BSDS' | string;
  course?: string;
  days?: string[];
  timeSlots?: ('Morning' | 'Midday' | 'Afternoon')[];
}

export type FacultySortOption = 'a-z' | 'most-sections' | 'most-courses';

/**
 * Deterministically generates a URL-safe slug from a faculty name.
 */
export function slugifyFacultyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolves duplicate slug collisions deterministically by appending a counter (-2, -3, etc.).
 */
export function resolveSlugCollisions(names: string[]): Map<string, string> {
  const result = new Map<string, string>();
  const counts = new Map<string, number>();

  for (const name of names) {
    const baseSlug = slugifyFacultyName(name) || 'faculty';
    const count = counts.get(baseSlug) || 0;
    counts.set(baseSlug, count + 1);

    if (count === 0) {
      result.set(name, baseSlug);
    } else {
      result.set(name, `${baseSlug}-${count + 1}`);
    }
  }

  return result;
}

/**
 * Normalizes text for search indexing by stripping accents, punctuation, and excess spaces.
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds the faculty index merging sections.json, courses.json, and faculty.json.
 */
export function buildFacultyIndex(
  sections: Section[],
  courses: Course[],
  facultyList: Faculty[]
): FacultyEntry[] {
  // Course lookup map
  const courseMap = new Map<string, Course>();
  for (const c of courses) {
    courseMap.set(c.code, c);
  }

  // Pre-seed slug resolution
  const facultyNames = facultyList.map((f) => f.name);
  const slugMap = resolveSlugCollisions(facultyNames);

  // Group sections by faculty slug
  // A section may have multiple faculty members in `faculty` and `facultyIds`
  const facultySectionsMap = new Map<string, { facultyName: string; sections: Section[] }>();

  // Initialize with known faculty from faculty.json
  for (const fac of facultyList) {
    const slug = fac.id || slugMap.get(fac.name) || slugifyFacultyName(fac.name);
    facultySectionsMap.set(slug, {
      facultyName: fac.name,
      sections: [],
    });
  }

  // Map each section to its assigned faculty
  for (const sec of sections) {
    if (!sec.faculty || sec.faculty.length === 0) continue;

    for (let i = 0; i < sec.faculty.length; i++) {
      const name = sec.faculty[i];
      if (!name || name === 'TBA') continue;

      const slug =
        sec.facultyIds?.[i] || slugMap.get(name) || slugifyFacultyName(name);

      let group = facultySectionsMap.get(slug);
      if (!group) {
        group = { facultyName: name, sections: [] };
        facultySectionsMap.set(slug, group);
      }
      group.sections.push(sec);
    }
  }

  const entries: FacultyEntry[] = [];

  for (const [slug, { facultyName, sections: facSections }] of facultySectionsMap.entries()) {
    // Collect unique courses
    const courseGroupMap = new Map<string, FacultyTeachingSection[]>();
    const programsSet = new Set<string>();

    for (const s of facSections) {
      programsSet.add(s.program);
      const c = courseMap.get(s.courseCode);
      const teachingSec: FacultyTeachingSection = {
        id: s.id,
        sl: s.sl,
        program: s.program,
        courseCode: s.courseCode,
        courseTitle: c ? c.title : s.title,
        section: s.section,
        credit: s.credit,
        kind: s.kind,
        meetings: (s.meetings || []).map((m) => ({
          day: m.day,
          start: m.start,
          end: m.end,
          room: m.room || undefined,
        })),
        tentative: !!s.tentative,
      };

      if (!courseGroupMap.has(s.courseCode)) {
        courseGroupMap.set(s.courseCode, []);
      }
      courseGroupMap.get(s.courseCode)!.push(teachingSec);
    }

    // Build course groups sorted by course code
    const courseGroups: FacultyCourseGroup[] = [];
    const courseCodes: string[] = [];

    for (const [cCode, secs] of courseGroupMap.entries()) {
      courseCodes.push(cCode);
      secs.sort((a, b) => a.section.localeCompare(b.section));
      const c = courseMap.get(cCode);
      courseGroups.push({
        courseCode: cCode,
        courseTitle: c ? c.title : secs[0]?.courseTitle || cCode,
        program: secs[0]?.program || 'BSCSE',
        credit: secs[0]?.credit || 3,
        sections: secs,
      });
    }

    courseGroups.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
    courseCodes.sort();

    // Build all timetable blocks and check for clashes within this faculty's schedule
    const timetableBlocks: FacultyTimetableBlock[] = [];
    let totalWeeklySlots = 0;

    for (const cg of courseGroups) {
      for (const sec of cg.sections) {
        for (const m of sec.meetings) {
          totalWeeklySlots++;
          timetableBlocks.push({
            courseCode: sec.courseCode,
            section: sec.section,
            room: m.room,
            kind: sec.kind,
            day: m.day,
            start: m.start,
            end: m.end,
            isClashing: false,
          });
        }
      }
    }

    // Detect clashing timetable blocks (same day, overlapping time: start1 < end2 && start2 < end1)
    let hasClash = false;
    const clashingSlots: FacultyTimetableBlock[] = [];

    for (let i = 0; i < timetableBlocks.length; i++) {
      for (let j = i + 1; j < timetableBlocks.length; j++) {
        const b1 = timetableBlocks[i];
        const b2 = timetableBlocks[j];
        if (b1.day === b2.day) {
          if (b1.start < b2.end && b2.start < b1.end) {
            b1.isClashing = true;
            b2.isClashing = true;
            hasClash = true;
            if (!clashingSlots.includes(b1)) clashingSlots.push(b1);
            if (!clashingSlots.includes(b2)) clashingSlots.push(b2);
          }
        }
      }
    }

    entries.push({
      id: slug,
      name: facultyName,
      searchNormalized: normalizeForSearch(`${facultyName} ${courseCodes.join(' ')}`),
      programs: Array.from(programsSet).sort(),
      courseCodes,
      courses: courseGroups,
      totalSections: facSections.length,
      totalWeeklySlots,
      hasClash,
      clashingSlots,
      timetableBlocks,
    });
  }

  // Default A-Z sort
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

/**
 * Filters the faculty list based on search and chip criteria.
 */
export function filterFacultyList(
  faculty: FacultyEntry[],
  filters: FacultyFilters
): FacultyEntry[] {
  const { search, program, course, days, timeSlots } = filters;
  const normalizedQuery = search ? normalizeForSearch(search) : '';

  return faculty.filter((entry) => {
    // 1. Search filter
    if (normalizedQuery) {
      const match =
        entry.searchNormalized.includes(normalizedQuery) ||
        entry.courseCodes.some((code) =>
          normalizeForSearch(code).includes(normalizedQuery)
        );
      if (!match) return false;
    }

    // 2. Program filter
    if (program && program !== 'ALL') {
      if (!entry.programs.includes(program)) {
        return false;
      }
    }

    // 3. Specific course filter
    if (course && course !== 'ALL') {
      if (!entry.courseCodes.includes(course)) {
        return false;
      }
    }

    // 4. Day chips (if specified, faculty must have at least one meeting on one of the selected days)
    if (days && days.length > 0) {
      const facultyDays = new Set<string>();
      for (const block of entry.timetableBlocks) {
        facultyDays.add(block.day);
      }
      const hasMatchingDay = days.some((d) => facultyDays.has(d));
      if (!hasMatchingDay) return false;
    }

    // 5. Time of day chips (Morning < 11:10 (670), Midday 11:10-14:00 (670..840), Afternoon >= 14:00 (840))
    if (timeSlots && timeSlots.length > 0) {
      const hasMatchingSlot = entry.timetableBlocks.some((b) => {
        const isMorning = b.start < 670;
        const isMidday = b.start >= 670 && b.start < 840;
        const isAfternoon = b.start >= 840;

        if (timeSlots.includes('Morning') && isMorning) return true;
        if (timeSlots.includes('Midday') && isMidday) return true;
        if (timeSlots.includes('Afternoon') && isAfternoon) return true;
        return false;
      });

      if (!hasMatchingSlot) return false;
    }

    return true;
  });
}

/**
 * Sorts faculty entries.
 */
export function sortFacultyList(
  faculty: FacultyEntry[],
  sortBy: FacultySortOption
): FacultyEntry[] {
  const copy = [...faculty];
  switch (sortBy) {
    case 'most-sections':
      return copy.sort((a, b) => b.totalSections - a.totalSections || a.name.localeCompare(b.name));
    case 'most-courses':
      return copy.sort(
        (a, b) => b.courseCodes.length - a.courseCodes.length || a.name.localeCompare(b.name)
      );
    case 'a-z':
    default:
      return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
}

/**
 * Formats a plain text summary of a faculty member's schedule for easy copying.
 */
export function generateCopyScheduleText(entry: FacultyEntry): string {
  const lines: string[] = [
    `=== Faculty Schedule: ${entry.name} ===`,
    `Courses: ${entry.courseCodes.join(', ')}`,
    `Total Sections: ${entry.totalSections} | Total Weekly Slots: ${entry.totalWeeklySlots}`,
    '',
  ];

  for (const cg of entry.courses) {
    lines.push(`-- ${cg.courseCode}: ${cg.courseTitle} (${cg.credit} Cr) --`);
    for (const sec of cg.sections) {
      const meetingStrs = sec.meetings
        .map((m) => {
          const startH = Math.floor(m.start / 60).toString().padStart(2, '0');
          const startM = (m.start % 60).toString().padStart(2, '0');
          const endH = Math.floor(m.end / 60).toString().padStart(2, '0');
          const endM = (m.end % 60).toString().padStart(2, '0');
          const roomStr = m.room ? ` (Room ${m.room})` : '';
          return `${m.day} ${startH}:${startM}–${endH}:${endM}${roomStr}`;
        })
        .join(', ');
      lines.push(`  Sec ${sec.section}: ${meetingStrs || 'No meeting scheduled'}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
