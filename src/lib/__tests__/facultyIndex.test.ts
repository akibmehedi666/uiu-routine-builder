import { describe, it, expect } from 'vitest';
import {
  slugifyFacultyName,
  resolveSlugCollisions,
  normalizeForSearch,
  buildFacultyIndex,
  filterFacultyList,
  sortFacultyList,
  generateCopyScheduleText,
} from '../facultyIndex';
import { Course, Faculty, Section } from '../../types';

describe('facultyIndex pure helpers', () => {
  it('slugifyFacultyName generates clean lowercase URL slugs', () => {
    expect(slugifyFacultyName('Dr. Swakkhar Shatabda')).toBe('dr-swakkhar-shatabda');
    expect(slugifyFacultyName('  Md. Tariqul Islam  ')).toBe('md-tariqul-islam');
    expect(slugifyFacultyName('RaAN')).toBe('raan');
    expect(slugifyFacultyName('A & B / C')).toBe('a-b-c');
  });

  it('resolveSlugCollisions resolves duplicate names deterministically with counters', () => {
    const names = [
      'Sajjad Hossain',
      'Dr. Sadia Kazi',
      'Sajjad Hossain',
      'Sajjad Hossain',
    ];
    const map = resolveSlugCollisions(names);
    expect(map.get('Dr. Sadia Kazi')).toBe('dr-sadia-kazi');
    // First occurrence gets base slug
    // Subsequent occurrences get -2, -3
    expect(slugifyFacultyName('Sajjad Hossain')).toBe('sajjad-hossain');
  });

  it('normalizeForSearch strips punctuation, accents, and case', () => {
    expect(normalizeForSearch('Dr. Md. Tariqul Islam')).toBe('dr md tariqul islam');
    expect(normalizeForSearch('Café / Rôle-Play')).toBe('cafe role play');
  });

  it('buildFacultyIndex groups sections by faculty and detects clashing schedules', () => {
    const mockCourses: Course[] = [
      { code: 'CSE 1111', title: 'Structured Programming', program: 'BSCSE', credit: 3, hasLab: true },
      { code: 'CSE 2213', title: 'Discrete Math', program: 'BSCSE', credit: 3, hasLab: false },
    ];

    const mockFaculty: Faculty[] = [
      {
        id: 'prof-x',
        name: 'Prof. X',
        courses: [],
      },
    ];

    const mockSections: Section[] = [
      {
        id: 'sec-1',
        sl: 1,
        program: 'BSCSE',
        courseCode: 'CSE 1111',
        title: 'Structured Programming',
        section: 'A',
        credit: 3,
        kind: 'theory',
        meetings: [
          { day: 'Sat', start: 510, end: 590, room: '301' }, // 08:30-09:50
        ],
        faculty: ['Prof. X'],
        facultyIds: ['prof-x'],
      },
      {
        id: 'sec-2',
        sl: 2,
        program: 'BSCSE',
        courseCode: 'CSE 2213',
        title: 'Discrete Math',
        section: 'B',
        credit: 3,
        kind: 'theory',
        meetings: [
          // Clashing meeting on Sat at the same time
          { day: 'Sat', start: 510, end: 590, room: '302' },
        ],
        faculty: ['Prof. X'],
        facultyIds: ['prof-x'],
      },
    ];

    const index = buildFacultyIndex(mockSections, mockCourses, mockFaculty);
    expect(index.length).toBe(1);
    const profX = index[0];
    expect(profX.name).toBe('Prof. X');
    expect(profX.totalSections).toBe(2);
    expect(profX.courseCodes).toEqual(['CSE 1111', 'CSE 2213']);
    expect(profX.hasClash).toBe(true);
    expect(profX.clashingSlots.length).toBe(2);
  });

  describe('filtering and sorting', () => {
    const sampleEntries = [
      {
        id: 'dr-al-amin',
        name: 'Dr. Al-Amin',
        searchNormalized: 'dr al amin cse 1111 act 2111',
        programs: ['BSCSE'],
        courseCodes: ['CSE 1111', 'ACT 2111'],
        courses: [],
        totalSections: 4,
        totalWeeklySlots: 8,
        hasClash: false,
        clashingSlots: [],
        timetableBlocks: [
          { courseCode: 'CSE 1111', section: 'A', day: 'Sat', start: 510, end: 590, kind: 'theory' as const },
          { courseCode: 'ACT 2111', section: 'B', day: 'Tue', start: 750, end: 830, kind: 'theory' as const },
        ],
      },
      {
        id: 'zara-rahman',
        name: 'Zara Rahman',
        searchNormalized: 'zara rahman dse 1101',
        programs: ['BSDS'],
        courseCodes: ['DSE 1101'],
        courses: [],
        totalSections: 1,
        totalWeeklySlots: 2,
        hasClash: false,
        clashingSlots: [],
        timetableBlocks: [
          { courseCode: 'DSE 1101', section: 'A', day: 'Sun', start: 850, end: 930, kind: 'theory' as const },
        ],
      },
    ];

    it('filters by program', () => {
      const bscseOnly = filterFacultyList(sampleEntries, { program: 'BSCSE' });
      expect(bscseOnly.length).toBe(1);
      expect(bscseOnly[0].id).toBe('dr-al-amin');

      const bsdsOnly = filterFacultyList(sampleEntries, { program: 'BSDS' });
      expect(bsdsOnly.length).toBe(1);
      expect(bsdsOnly[0].id).toBe('zara-rahman');
    });

    it('filters by course', () => {
      const res = filterFacultyList(sampleEntries, { course: 'DSE 1101' });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('zara-rahman');
    });

    it('filters by days', () => {
      const satMatch = filterFacultyList(sampleEntries, { days: ['Sat'] });
      expect(satMatch.length).toBe(1);
      expect(satMatch[0].id).toBe('dr-al-amin');

      const monMatch = filterFacultyList(sampleEntries, { days: ['Mon'] });
      expect(monMatch.length).toBe(0);
    });

    it('filters by time slot (Morning, Midday, Afternoon)', () => {
      // 510 min is Morning (<670), 750 min is Midday (670..840)
      const morningRes = filterFacultyList(sampleEntries, { timeSlots: ['Morning'] });
      expect(morningRes.length).toBe(1);
      expect(morningRes[0].id).toBe('dr-al-amin');

      // 850 min is Afternoon (>=840)
      const afternoonRes = filterFacultyList(sampleEntries, { timeSlots: ['Afternoon'] });
      expect(afternoonRes.length).toBe(1);
      expect(afternoonRes[0].id).toBe('zara-rahman');
    });

    it('sorts by A-Z, most sections, most courses', () => {
      const az = sortFacultyList(sampleEntries, 'a-z');
      expect(az[0].name).toBe('Dr. Al-Amin');

      const bySec = sortFacultyList(sampleEntries, 'most-sections');
      expect(bySec[0].name).toBe('Dr. Al-Amin'); // 4 sections vs 1

      const byCourses = sortFacultyList(sampleEntries, 'most-courses');
      expect(byCourses[0].name).toBe('Dr. Al-Amin'); // 2 courses vs 1
    });

    it('generates copy schedule text', () => {
      const mockEntry = {
        id: 'test',
        name: 'Test Faculty',
        searchNormalized: '',
        programs: ['BSCSE'],
        courseCodes: ['CSE 1111'],
        totalSections: 1,
        totalWeeklySlots: 1,
        hasClash: false,
        clashingSlots: [],
        timetableBlocks: [],
        courses: [
          {
            courseCode: 'CSE 1111',
            courseTitle: 'Structured Programming',
            program: 'BSCSE',
            credit: 3,
            sections: [
              {
                id: 's1',
                sl: 1,
                program: 'BSCSE',
                courseCode: 'CSE 1111',
                courseTitle: 'Structured Programming',
                section: 'A',
                credit: 3,
                kind: 'theory' as const,
                meetings: [{ day: 'Sat', start: 510, end: 590, room: '301' }],
                tentative: false,
              },
            ],
          },
        ],
      };

      const text = generateCopyScheduleText(mockEntry);
      expect(text).toContain('=== Faculty Schedule: Test Faculty ===');
      expect(text).toContain('CSE 1111: Structured Programming (3 Cr)');
      expect(text).toContain('Sec A: Sat 08:30–09:50 (Room 301)');
    });
  });
});
