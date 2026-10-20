import { describe, it, expect } from 'vitest';
import {
  naturalSectionSort,
  getFacultyInitials,
  getFacultyAvatarColor,
  buildCourseDirectory,
  filterCourses,
  filterCourseSections,
  groupSectionsByFaculty,
  getFacultyCrossReferences,
  generateCopyCourseSections,
  sortCourses,
  getActiveSectionFilterCount,
} from '../courseDirectory';
import { Course, Section } from '../../types';

describe('courseDirectory pure helpers', () => {
  it('naturalSectionSort correctly sorts single letters, double letters, and alphanumeric labels', () => {
    const labels = ['B', 'A', 'AA', 'Z', 'A2', 'A1', 'AB', 'BA', 'C'];
    const sorted = [...labels].sort(naturalSectionSort);
    // Natural order: A, A1, A2, B, C, Z, AA, AB, BA
    expect(sorted).toEqual(['A', 'A1', 'A2', 'B', 'C', 'Z', 'AA', 'AB', 'BA']);
  });

  it('getFacultyInitials extracts clean 2-letter initials and ignores common prefixes', () => {
    expect(getFacultyInitials('Ishrat Jahan')).toBe('IJ');
    expect(getFacultyInitials('Dr. Swakkhar Shatabda')).toBe('SS');
    expect(getFacultyInitials('Md. Tariqul Islam')).toBe('TI');
    expect(getFacultyInitials('Prof. Dr. M. Sajjad Hossain')).toBe('SH');
    expect(getFacultyInitials('RaAN')).toBe('RN');
    expect(getFacultyInitials('TBA')).toBe('TBA');
  });

  it('getFacultyAvatarColor deterministically returns soft light-theme palette colors', () => {
    const c1 = getFacultyAvatarColor('Ishrat Jahan');
    const c2 = getFacultyAvatarColor('Ishrat Jahan');
    expect(c1).toEqual(c2);
    expect(c1.bg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(c1.text).toMatch(/^#[0-9A-F]{6}$/i);
  });

  describe('course indexing, aliases, and theory-lab pairing', () => {
    const mockCourses: Course[] = [
      {
        code: 'CSE 1111',
        title: 'Structured Programming Language',
        program: 'BSCSE',
        credit: 3,
        hasLab: true,
        labCode: 'CSE 1112',
      },
      {
        code: 'CSE 1112',
        title: 'Structured Programming Language Laboratory',
        program: 'BSCSE',
        credit: 1,
        hasLab: false,
        theoryCode: 'CSE 1111',
      },
      {
        code: 'CSE 2215',
        title: 'Data Structures and Algorithms',
        program: 'BSCSE',
        credit: 3,
        hasLab: true,
        labCode: 'CSE 2216',
      },
    ];

    const mockSections: Section[] = [
      {
        id: 'CSE1111-A',
        sl: 1,
        program: 'BSCSE',
        courseCode: 'CSE 1111',
        title: 'Structured Programming Language',
        section: 'A',
        credit: 3,
        kind: 'theory',
        meetings: [{ day: 'Sat', start: 510, end: 590, room: '301' }], // Morning (08:30-09:50)
        faculty: ['Ishrat Jahan'],
        facultyIds: ['ishrat-jahan'],
        tentative: false,
      },
      {
        id: 'CSE1111-B',
        sl: 2,
        program: 'BSCSE',
        courseCode: 'CSE 1111',
        title: 'Structured Programming Language',
        section: 'B',
        credit: 3,
        kind: 'theory',
        meetings: [{ day: 'Sun', start: 850, end: 930, room: '302' }], // Afternoon (14:10-15:30)
        faculty: ['Md. Mahfuzur Rahman'],
        facultyIds: ['md-mahfuzur-rahman'],
        tentative: true,
      },
      {
        id: 'CSE2215-A',
        sl: 3,
        program: 'BSCSE',
        courseCode: 'CSE 2215',
        title: 'Data Structures and Algorithms',
        section: 'A',
        credit: 3,
        kind: 'theory',
        meetings: [{ day: 'Mon', start: 670, end: 750, room: '401' }], // Midday (11:10-12:30)
        faculty: ['Ishrat Jahan'],
        facultyIds: ['ishrat-jahan'],
        tentative: false,
      },
    ];

    const directory = buildCourseDirectory(mockCourses, mockSections);

    it('indexes courses and pairs theory with lab', () => {
      expect(directory.length).toBe(3);
      const c1111 = directory.find((c) => c.code === 'CSE 1111');
      expect(c1111).toBeDefined();
      expect(c1111?.hasLab).toBe(true);
      expect(c1111?.pairedCourseCode).toBe('CSE 1112');
      expect(c1111?.isLab).toBe(false);

      const c1112 = directory.find((c) => c.code === 'CSE 1112');
      expect(c1112?.isLab).toBe(true);
      expect(c1112?.pairedCourseCode).toBe('CSE 1111');
    });

    it('matches aliases such as DSA, SPL, OOP', () => {
      const dsaMatches = filterCourses(directory, { search: 'dsa' });
      expect(dsaMatches.some((c) => c.code === 'CSE 2215')).toBe(true);

      const splMatches = filterCourses(directory, { search: 'spl' });
      expect(splMatches.some((c) => c.code === 'CSE 1111')).toBe(true);
    });

    it('filters courses by faculty name query', () => {
      const res = filterCourses(directory, { search: 'Ishrat Jahan' });
      expect(res.map((c) => c.code)).toContain('CSE 1111');
      expect(res.map((c) => c.code)).toContain('CSE 2215');
    });

    it('filters within-course sections by day and time of day', () => {
      const c1111 = directory.find((c) => c.code === 'CSE 1111')!;
      
      // Filter by day Sat
      const satOnly = filterCourseSections(c1111.sections, { days: ['Sat'] });
      expect(satOnly.length).toBe(1);
      expect(satOnly[0].section).toBe('A');

      // Filter by time Afternoon
      const afternoonOnly = filterCourseSections(c1111.sections, { timeSlots: ['Afternoon'] });
      expect(afternoonOnly.length).toBe(1);
      expect(afternoonOnly[0].section).toBe('B');
    });

    it('groups sections by faculty', () => {
      const c1111 = directory.find((c) => c.code === 'CSE 1111')!;
      const groups = groupSectionsByFaculty(c1111.sections);
      expect(groups.length).toBe(2);
      expect(groups.map((g) => g.facultyName).sort()).toEqual([
        'Ishrat Jahan',
        'Md. Mahfuzur Rahman',
      ]);
    });

    it('cross-references other courses taught by faculty across the trimester', () => {
      const refs = getFacultyCrossReferences(mockSections, 'Ishrat Jahan', 'CSE 1111');
      expect(refs.length).toBe(1);
      expect(refs[0].courseCode).toBe('CSE 2215');
      expect(refs[0].section).toBe('A');
    });

    it('generates plain-text sections copy string', () => {
      const c1111 = directory.find((c) => c.code === 'CSE 1111')!;
      const text = generateCopyCourseSections(c1111);
      expect(text).toContain('=== CSE 1111: Structured Programming Language (3 Cr) ===');
      expect(text).toContain('Section A: Ishrat Jahan | Sat 08:30–09:50 (Room 301)');
      expect(text).toContain('Section B: Md. Mahfuzur Rahman | Sun 14:10–15:30 (Room 302)');
    });
  });

  describe('real data search tests (Bugs 1 and 2 and STEP 4)', () => {
    // Import real data
    const realCourses = require('../../../data/courses.json') as Course[];
    const realSections = require('../../../data/sections.json') as Section[];
    const realDirectory = buildCourseDirectory(realCourses, realSections);

    it('searching "operating system" returns CSE 4509 as the top result', () => {
      const results = filterCourses(realDirectory, { search: 'operating system' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('CSE 4509');
    });

    it('searching "operating systems" returns CSE 4509 and CSE 4510', () => {
      const results = filterCourses(realDirectory, { search: 'operating systems' });
      const codes = results.map((c) => c.code);
      expect(codes).toContain('CSE 4509');
      expect(codes).toContain('CSE 4510');
      expect(results[0].code).toBe('CSE 4509');
    });

    it('searching "OS" / "os" / " Os " returns CSE 4509 first, without false positive faculty matches like "Hossain"', () => {
      for (const q of ['OS', 'os', ' Os ']) {
        const results = filterCourses(realDirectory, { search: q });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].code).toBe('CSE 4509');
        // CSE 4510 should also be present
        const codes = results.map((c) => c.code);
        expect(codes).toContain('CSE 4510');
        // Crucial: Must NOT match courses just because faculty name has substring "os" (like Hossain, Mostofa)
        expect(codes).not.toContain('CSE 1111');
      }
    });

    it('"cse4509", "cse 4509", "CSE-4509" yield the same single top result', () => {
      for (const q of ['cse4509', 'cse 4509', 'CSE-4509']) {
        const results = filterCourses(realDirectory, { search: q });
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].code).toBe('CSE 4509');
      }
    });

    it('"dsa" finds CSE 2215 (and CSE 2217), and "oop" finds Object Oriented Programming', () => {
      const dsaResults = filterCourses(realDirectory, { search: 'dsa' });
      const dsaCodes = dsaResults.map((c) => c.code);
      expect(dsaCodes).toContain('CSE 2215');
      expect(dsaCodes).toContain('CSE 2217');

      const oopResults = filterCourses(realDirectory, { search: 'oop' });
      const oopCodes = oopResults.map((c) => c.code);
      expect(oopCodes).toContain('CSE 1115');
      expect(oopCodes).toContain('CSE 1116');
    });

    it('"database management" and "management database" give the same set', () => {
      const res1 = filterCourses(realDirectory, { search: 'database management' });
      const res2 = filterCourses(realDirectory, { search: 'management database' });
      const codes1 = res1.map((c) => c.code).sort();
      const codes2 = res2.map((c) => c.code).sort();
      expect(codes1.length).toBeGreaterThan(0);
      expect(codes1).toEqual(codes2);
      expect(codes1).toContain('CSE 3521');
    });

    it('typo query "opertaing" still finds Operating Systems via Levenshtein tolerance', () => {
      const results = filterCourses(realDirectory, { search: 'opertaing' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('CSE 4509');
    });

    it('a real faculty name query finds the courses they teach', () => {
      const results = filterCourses(realDirectory, { search: 'Abdullah Ibne Masud Ma' });
      const codes = results.map((c) => c.code);
      expect(codes).toContain('CSE 1112');
      expect(codes).toContain('CSE 2213');
    });

    it('nonsense query "zzzzq" returns empty', () => {
      const results = filterCourses(realDirectory, { search: 'zzzzq' });
      expect(results.length).toBe(0);
    });

    it('natural code sort puts ACT and BDS before CSE, and CSE 1111 before CSE 2215 before CSE 4509', () => {
      const allCodes = realDirectory.map((c) => c.code);
      const actIdx = allCodes.indexOf('ACT 2111');
      const bdsIdx = allCodes.indexOf('BDS 1201');
      const cse1111Idx = allCodes.indexOf('CSE 1111');
      const cse2215Idx = allCodes.indexOf('CSE 2215');
      const cse4509Idx = allCodes.indexOf('CSE 4509');

      expect(actIdx).toBeGreaterThanOrEqual(0);
      expect(bdsIdx).toBeGreaterThan(actIdx);
      expect(cse1111Idx).toBeGreaterThan(bdsIdx);
      expect(cse2215Idx).toBeGreaterThan(cse1111Idx);
      expect(cse4509Idx).toBeGreaterThan(cse2215Idx);
    });

    it('Title A-Z and Most sections sorts work properly', () => {
      const titleSorted = sortCourses(realDirectory, 'title-az');
      expect(titleSorted[0].title.localeCompare(titleSorted[1].title)).toBeLessThanOrEqual(0);

      const sectionSorted = sortCourses(realDirectory, 'most-sections');
      expect(sectionSorted[0].sectionCount).toBeGreaterThanOrEqual(sectionSorted[1].sectionCount);
    });

    it('group-by-faculty toggle does not count as an active filter', () => {
      expect(
        getActiveSectionFilterCount({
          facultySearch: '',
          days: [],
          timeSlots: [],
          groupByFaculty: true,
        })
      ).toBe(0);

      expect(
        getActiveSectionFilterCount({
          facultySearch: 'Ishrat',
          days: [],
          timeSlots: [],
          groupByFaculty: false,
        })
      ).toBe(1);

      expect(
        getActiveSectionFilterCount({
          facultySearch: 'Ishrat',
          days: ['Sat'],
          timeSlots: ['Morning'],
          groupByFaculty: true,
        })
      ).toBe(3);
    });

    it('prints sample 15 query results table for inspection', () => {
      const sampleQueries = [
        'operating system',
        'operating systems',
        'os',
        'cse4509',
        'cse 4509',
        'dsa',
        'oop',
        'database management',
        'management database',
        'opertaing',
        'Abdullah Ibne Masud Ma',
        'se',
        'spl',
        'ai',
        'zzzzq',
      ];

      const tableRows = sampleQueries.map((q) => {
        const res = filterCourses(realDirectory, { search: q });
        const top3 = res.slice(0, 3).map((c) => `${c.code} (${c.title})`).join(' | ');
        return { Query: q, 'Total Matches': res.length, 'Top Results': top3 || '(none)' };
      });

      console.log('\n--- 15 SAMPLE QUERIES EVALUATION TABLE ---');
      console.table(tableRows);
    });
  });
});

