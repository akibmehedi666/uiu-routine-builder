import { describe, it, expect } from 'vitest';
import { Section } from '../../types';
import {
  groupCourseSectionsByFaculty,
  filterSections,
  sortFacultyGroups,
  checkSectionClash,
} from '../courseExplorer';

const mockSections: Section[] = [
  {
    id: '1',
    sl: 1,
    program: 'BSCSE',
    courseCode: 'CSE 1111',
    title: 'Structured Programming Language',
    section: 'B',
    credit: 3,
    kind: 'theory',
    meetings: [
      { day: 'Sat', start: 590, end: 670, room: '301' },
      { day: 'Tue', start: 590, end: 670, room: '301' },
    ],
    faculty: ['Dr. Sadia Kazi'],
    facultyIds: ['sadia-kazi'],
    tentative: false,
  },
  {
    id: '2',
    sl: 2,
    program: 'BSCSE',
    courseCode: 'CSE 1111',
    title: 'Structured Programming Language',
    section: 'A',
    credit: 3,
    kind: 'theory',
    meetings: [
      { day: 'Sat', start: 510, end: 590, room: '302' },
      { day: 'Tue', start: 510, end: 590, room: '302' },
    ],
    faculty: ['Ishrat Jahan'],
    facultyIds: ['ishrat-jahan'],
    tentative: false,
  },
  {
    id: '3',
    sl: 3,
    program: 'BSCSE',
    courseCode: 'CSE 1111',
    title: 'Structured Programming Language',
    section: 'C',
    credit: 3,
    kind: 'theory',
    meetings: [
      { day: 'Sun', start: 830, end: 910, room: '303' },
      { day: 'Wed', start: 830, end: 910, room: '303' },
    ],
    faculty: ['Dr. Sadia Kazi'],
    facultyIds: ['sadia-kazi'],
    tentative: true,
  },
];

describe('Course Explorer Helpers', () => {
  it('groups sections by distinct faculty correctly', () => {
    const groups = groupCourseSectionsByFaculty(mockSections);
    expect(groups).toHaveLength(2);

    const sadia = groups.find((g) => g.facultyId === 'sadia-kazi');
    expect(sadia).toBeDefined();
    expect(sadia?.sections).toHaveLength(2);

    const ishrat = groups.find((g) => g.facultyId === 'ishrat-jahan');
    expect(ishrat).toBeDefined();
    expect(ishrat?.sections).toHaveLength(1);
  });

  it('filters sections by faculty name search query', () => {
    const filtered = filterSections(mockSections, { facultyQuery: 'Sadia' });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((s) => s.faculty.includes('Dr. Sadia Kazi'))).toBe(true);
  });

  it('filters sections by day of week chips', () => {
    const filtered = filterSections(mockSections, { dayFilter: ['Sun'] });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].section).toBe('C');
  });

  it('filters sections by time of day', () => {
    const morning = filterSections(mockSections, { timeOfDay: 'morning' });
    expect(morning).toHaveLength(2); // 510 and 590 both < 670

    const afternoon = filterSections(mockSections, { timeOfDay: 'afternoon' });
    expect(afternoon).toHaveLength(1);
    expect(afternoon[0].section).toBe('C'); // 830
  });

  it('sorts faculty groups by name and section', () => {
    const groups = groupCourseSectionsByFaculty(mockSections);
    const sortedByName = sortFacultyGroups(groups, 'name');
    expect(sortedByName[0].facultyName).toBe('Dr. Sadia Kazi');
    expect(sortedByName[1].facultyName).toBe('Ishrat Jahan');

    const sortedBySection = sortFacultyGroups(groups, 'section');
    expect(sortedBySection[0].facultyName).toBe('Ishrat Jahan'); // Sec A is earliest
  });

  it('detects clashes against active schedule sections', () => {
    const activeSchedule: Section[] = [
      {
        id: '10',
        sl: 10,
        program: 'BSCSE',
        courseCode: 'MATH 1151',
        title: 'Differential Calculus',
        section: 'A',
        credit: 3,
        kind: 'theory',
        meetings: [{ day: 'Sat', start: 510, end: 590, room: '401' }],
        faculty: ['Teacher A'],
        facultyIds: ['teacher-a'],
        tentative: false,
      },
    ];

    // mockSections[1] meets Sat 510..590 -> clashes with MATH 1151
    const clash = checkSectionClash(mockSections[1], activeSchedule);
    expect(clash).toBe('MATH 1151');

    // mockSections[0] meets Sat 590..670 -> does NOT clash with MATH 1151 (510..590)
    const noClash = checkSectionClash(mockSections[0], activeSchedule);
    expect(noClash).toBeNull();
  });
});
