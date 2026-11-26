import {
  normalizeStudentId,
  getExamForSection,
  getExamsForCourse,
  findRoomForId,
  lookupStudentRoomForCourse,
  detectExamClashes,
  exportExamsToICS,
  exportExamsToText,
  groupUniqueExams,
  countExamsAndSections,
  formatExamCountSummary,
  timeOfDay,
  formatDate,
  formatExamDayLabel,
  getNextExam,
  dayStats,
  parseExamsPageParams,
  serializeExamsPageParams,
  ExamRow,
} from '../exams';
import { serializeToParams } from '../../utils/urlSync';
import { buildSavedRoutineObject, encodeSharedRoutineUrl } from '../../utils/savedRoutinesStorage';
import { ScheduleResult, Section, SolveRequest } from '../../types';

const SAMPLE_EXAMS: ExamRow[] = [
  {
    id: 'BSCSE-CSE 4509-A',
    program: 'BSCSE',
    courseCodes: ['CSE 4509', 'CSE 4511', 'CSI 309'],
    sectionId: 'BSCSE-CSE 4509-A',
    sectionStatus: 'active',
    courseCode: 'CSE 4509',
    courseTitle: 'Operating Systems',
    section: 'A',
    teacherInitials: 'MdSam',
    date: '2026-12-05',
    dayOfWeek: 'Sat',
    startMin: 510, // 08:30 AM
    endMin: 630,   // 10:30 AM
    rooms: [
      { room: '303', idFrom: '0112020072', idTo: '0112330055' },
      { room: '304', idFrom: '0112330211', idTo: '0112420255' },
    ],
  },
  {
    id: 'BSCSE-CSE 4509-B',
    program: 'BSCSE',
    courseCodes: ['CSE 4509', 'CSE 4511', 'CSI 309'],
    sectionId: 'BSCSE-CSE 4509-B',
    sectionStatus: 'active',
    courseCode: 'CSE 4509',
    courseTitle: 'Operating Systems',
    section: 'B',
    teacherInitials: 'MdSam',
    date: '2026-12-05',
    dayOfWeek: 'Sat',
    startMin: 510,
    endMin: 630,
    rooms: [
      { room: '305', idFrom: '0111820112', idTo: '0112310254' },
    ],
  },
  {
    id: 'BSCSE-CSE 3811-A',
    program: 'BSCSE',
    courseCodes: ['CSE 3811'],
    sectionId: 'BSCSE-CSE 3811-A',
    sectionStatus: 'active',
    courseCode: 'CSE 3811',
    courseTitle: 'Artificial Intelligence',
    section: 'A',
    teacherInitials: 'ABC',
    date: '2026-12-05',
    dayOfWeek: 'Sat',
    startMin: 540, // 09:00 AM - 11:00 AM (overlaps 08:30-10:30)
    endMin: 660,
    rooms: [
      { room: '601', idFrom: '0111310140', idTo: '0112230263' },
    ],
  },
  {
    id: 'BSCSE-CSE 4889-A',
    program: 'BSCSE',
    courseCodes: ['CSE 4889'],
    sectionId: 'BSCSE-CSE 4889-A',
    sectionStatus: 'active',
    courseCode: 'CSE 4889',
    courseTitle: 'Machine Learning',
    section: 'A',
    teacherInitials: 'XYZ',
    date: '2026-12-05',
    dayOfWeek: 'Sat',
    startMin: 660, // 11:00 AM - 01:00 PM (adjacent to 09:00-11:00, NO clash)
    endMin: 780,
    rooms: [
      { room: '602', idFrom: '0112230273', idTo: '0112410383' },
    ],
  },
  {
    id: 'BSCSE-CSE 3521-A',
    program: 'BSCSE',
    courseCodes: ['CSE 3521'],
    sectionId: 'BSCSE-CSE 3521-A',
    sectionStatus: 'active',
    courseCode: 'CSE 3521',
    courseTitle: 'Database Management Systems',
    section: 'A',
    teacherInitials: 'DEF',
    date: '2026-12-07', // Different date, same 08:30-10:30 slot
    dayOfWeek: 'Mon',
    startMin: 510,
    endMin: 630,
    rooms: [{ room: '401', idFrom: '0112010001', idTo: '0112410999' }],
  },
  {
    id: 'BSDS-CSE 3521-BA',
    program: 'BSDS',
    courseCodes: ['CSE 3521'],
    sectionId: 'BSDS-CSE 3521-BA',
    sectionStatus: 'active',
    courseCode: 'CSE 3521',
    courseTitle: 'Database Management Systems',
    section: 'BA',
    teacherInitials: 'DEF',
    date: '2026-12-07',
    dayOfWeek: 'Mon',
    startMin: 510,
    endMin: 630,
    rooms: [{ room: '402', idFrom: '0152210001', idTo: '0152410999' }],
  },
  {
    id: 'BSCSE-CSE 4165-A',
    program: 'BSCSE',
    courseCodes: ['CSE 4165', 'CSE 465'],
    sectionId: 'BSCSE-CSE 4165-A',
    sectionStatus: 'active',
    courseCode: 'CSE 4165',
    courseTitle: 'Web Programming',
    section: 'A',
    teacherInitials: 'WP1',
    date: '2026-12-12',
    dayOfWeek: 'Sat',
    startMin: 540, // 09:00 AM - 11:00 AM
    endMin: 660,
    rooms: [{ room: '326 (Computer Lab)', idFrom: '0112230975', idTo: '0112520079' }],
  },
  {
    id: 'BSCSE-CSE 4165-C',
    program: 'BSCSE',
    courseCodes: ['CSE 4165', 'CSE 465'],
    sectionId: 'BSCSE-CSE 4165-C',
    sectionStatus: 'active',
    courseCode: 'CSE 4165',
    courseTitle: 'Web Programming',
    section: 'C',
    teacherInitials: 'WP2',
    date: '2026-12-12',
    dayOfWeek: 'Sat',
    startMin: 705, // 11:45 AM - 01:45 PM
    endMin: 825,
    rooms: [{ room: '327 (Computer Lab)', idFrom: '0112330607', idTo: '0112430623' }],
  },
  {
    id: 'BSCSE-CSE 3411-A',
    program: 'BSCSE',
    courseCodes: ['CSE 3411'],
    sectionId: 'BSCSE-CSE 3411-A',
    sectionStatus: 'active',
    courseCode: 'CSE 3411',
    courseTitle: 'System Analysis and Design',
    section: 'A',
    teacherInitials: 'SAD',
    date: '2026-12-12',
    dayOfWeek: 'Sat',
    startMin: 540, // 09:00 AM - 11:00 AM (clashes with Web Programming Sec A, not Sec C)
    endMin: 660,
    rooms: [{ room: '501', idFrom: '0112110001', idTo: '0112410999' }],
  },
  {
    id: 'BSCSE-CSE 4811-A',
    program: 'BSCSE',
    courseCodes: ['CSE 4811'],
    sectionId: 'BSCSE-CSE 4811-A',
    sectionStatus: 'dropped',
    courseCode: 'CSE 4811',
    courseTitle: 'Dropped Course',
    section: 'A',
    teacherInitials: 'DRP',
    date: '2026-12-08',
    dayOfWeek: 'Tue',
    startMin: 540,
    endMin: 660,
    rooms: [{ room: '701', idFrom: '0112210001', idTo: '0112210999' }],
  },
];

describe('exams pure logic', () => {
  describe('normalizeStudentId', () => {
    it('normalizes 9-digit legacy IDs by inserting 0 before last 3 digits', () => {
      expect(normalizeStudentId('011131140')).toBe('0111310140');
      expect(normalizeStudentId('011202072')).toBe('0112020072');
    });

    it('keeps valid 10-digit IDs intact and strips spaces/dashes', () => {
      expect(normalizeStudentId('0112230263')).toBe('0112230263');
      expect(normalizeStudentId(' 011-223-0263 ')).toBe('0112230263');
      expect(normalizeStudentId('011-131-140')).toBe('0111310140');
    });

    it('rejects invalid lengths or non-digit characters', () => {
      expect(normalizeStudentId('')).toBeNull();
      expect(normalizeStudentId('12345678')).toBeNull();
      expect(normalizeStudentId('12345678901')).toBeNull();
      expect(normalizeStudentId('011223026A')).toBeNull();
    });
  });

  describe('range check boundaries and mixed-length ranges', () => {
    it('matches inclusive start and end boundaries', () => {
      const row = SAMPLE_EXAMS[2]; // 601: 0111310140 - 0112230263
      expect(findRoomForId(row, '0111310140')).toBe('601');
      expect(findRoomForId(row, '011131140')).toBe('601'); // 9-digit equivalent of start
      expect(findRoomForId(row, '0112230263')).toBe('601');
      expect(findRoomForId(row, '0111310139')).toBeNull();
      expect(findRoomForId(row, '0112230264')).toBeNull();
    });

    it('handles mixed-length range ends defensively', () => {
      const mixedRow: ExamRow = {
        ...SAMPLE_EXAMS[0],
        rooms: [{ room: '601', idFrom: '011131140', idTo: '0112230263' }],
      };
      expect(findRoomForId(mixedRow, '011131500')).toBe('601');
      expect(findRoomForId(mixedRow, '0112020072')).toBe('601');
    });
  });

  describe('code-list matching and program separation', () => {
    it('matches any code in merged courseCodes list (e.g. CSE 4509/CSE 4511/CSI 309)', () => {
      expect(getExamsForCourse('BSCSE', 'CSE 4509', SAMPLE_EXAMS)).toHaveLength(2);
      expect(getExamsForCourse('BSCSE', 'CSE 4511', SAMPLE_EXAMS)).toHaveLength(2);
      expect(getExamsForCourse('BSCSE', 'CSI309', SAMPLE_EXAMS)).toHaveLength(2);
    });

    it('separates BSDS vs BSCSE keys when program is specified', () => {
      const bscse = getExamsForCourse('BSCSE', 'CSE 3521', SAMPLE_EXAMS);
      const bsds = getExamsForCourse('BSDS', 'CSE 3521', SAMPLE_EXAMS);
      expect(bscse).toHaveLength(1);
      expect(bscse[0].section).toBe('A');
      expect(bsds).toHaveLength(1);
      expect(bsds[0].section).toBe('BA');
    });
  });

  describe('dropped-section handling', () => {
    it('hides dropped sections by default and reveals them with includeDropped', () => {
      expect(getExamForSection('BSCSE-CSE 4811-A', SAMPLE_EXAMS)).toBeNull();
      expect(getExamsForCourse('BSCSE', 'CSE 4811', SAMPLE_EXAMS)).toHaveLength(0);

      expect(
        getExamForSection('BSCSE-CSE 4811-A', SAMPLE_EXAMS, { includeDropped: true })?.section
      ).toBe('A');
      expect(
        getExamsForCourse('BSCSE', 'CSE 4811', SAMPLE_EXAMS, { includeDropped: true })
      ).toHaveLength(1);
    });
  });

  describe('clash detection', () => {
    it('detects overlap on the same date (08:30-10:30 vs 09:00-11:00)', () => {
      const report = detectExamClashes(
        [{ course: 'CSE 4509' }, { course: 'CSE 3811' }],
        SAMPLE_EXAMS
      );
      expect(report.clashes).toHaveLength(1);
      expect(report.clashes[0].date).toBe('2026-12-05');
    });

    it('does not flag same time slot on different dates', () => {
      const report = detectExamClashes(
        [{ course: 'CSE 4509' }, { course: 'CSE 3521' }],
        SAMPLE_EXAMS
      );
      expect(report.clashes).toHaveLength(0);
      expect(report.possible).toHaveLength(0);
    });

    it('does not clash on adjacent slots (11:00 end vs 11:00 start) and marks sameDay', () => {
      const report = detectExamClashes(
        [{ course: 'CSE 3811' }, { course: 'CSE 4889' }],
        SAMPLE_EXAMS
      );
      expect(report.clashes).toHaveLength(0);
      expect(report.sameDay).toHaveLength(1);
      expect(report.sameDayGroups).toHaveLength(1);
      expect(report.sameDayGroups[0].count).toBe(2);
    });

    it('reports possible clash for multi-slot courses when section is not chosen, and resolves when chosen', () => {
      const unselected = detectExamClashes(
        [{ course: 'CSE 4165' }, { course: 'CSE 3411' }],
        SAMPLE_EXAMS
      );
      expect(unselected.clashes).toHaveLength(0);
      expect(unselected.possible).toHaveLength(1);

      const clashingSection = detectExamClashes(
        [{ course: 'CSE 4165', sectionId: 'BSCSE-CSE 4165-A' }, { course: 'CSE 3411' }],
        SAMPLE_EXAMS
      );
      expect(clashingSection.clashes).toHaveLength(1);
      expect(clashingSection.possible).toHaveLength(0);

      const nonClashingSection = detectExamClashes(
        [{ course: 'CSE 4165', sectionId: 'BSCSE-CSE 4165-C' }, { course: 'CSE 3411' }],
        SAMPLE_EXAMS
      );
      expect(nonClashingSection.clashes).toHaveLength(0);
      expect(nonClashingSection.possible).toHaveLength(0);
      expect(nonClashingSection.sameDay).toHaveLength(1);
    });
  });

  describe('room lookup (own section / other section / not found)', () => {
    it('finds room in own section, other section, or returns not-found', () => {
      const own = SAMPLE_EXAMS[0]; // Sec A: 0112020072-0112330055 (303)
      const courseExams = getExamsForCourse('BSCSE', 'CSE 4509', SAMPLE_EXAMS);

      const resOwn = lookupStudentRoomForCourse(own, courseExams, '0112020072');
      expect(resOwn.status).toBe('found-own');
      if (resOwn.status === 'found-own') {
        expect(resOwn.room).toBe('303');
      }

      // ID 011182112 -> 0111820112 is in Sec B (room 305)
      const resOther = lookupStudentRoomForCourse(own, courseExams, '011182112');
      expect(resOther.status).toBe('found-other');
      if (resOther.status === 'found-other') {
        expect(resOther.section).toBe('B');
        expect(resOther.room).toBe('305');
      }

      const resNone = lookupStudentRoomForCourse(own, courseExams, '0119999999');
      expect(resNone.status).toBe('not-found');
    });
  });

  describe('privacy invariants', () => {
    it('never leaks student ID into generated URLs, ICS, text export, or saved routine objects', () => {
      const secretId = '0112230263';
      const urlParams = serializeToParams({
        selectedCourses: ['CSE 4509'],
        lockedSections: { 'CSE 4509': 'BSCSE-CSE 4509-A' },
      });
      expect(urlParams).not.toContain(secretId);

      const ics = exportExamsToICS([{ exam: SAMPLE_EXAMS[0], foundRoom: '303' }]);
      expect(ics).toContain('LOCATION:Room 303, UIU Campus');
      expect(ics).not.toContain(secretId);
      expect(ics).not.toContain('VALARM');

      const txt = exportExamsToText([{ exam: SAMPLE_EXAMS[0], foundRoom: '303' }]);
      expect(txt).not.toContain(secretId);

      const mockSec: Section = {
        id: 'BSCSE-CSE 4509-A',
        sl: 1,
        program: 'BSCSE',
        courseCode: 'CSE 4509',
        title: 'Operating Systems',
        section: 'A',
        credit: 3,
        kind: 'theory',
        meetings: [{ day: 'Sat', start: 510, end: 590, room: '303' }],
        faculty: ['Faculty A'],
        facultyIds: ['faculty-a'],
        tentative: false,
      };
      const mockSchedule: ScheduleResult = {
        sections: [mockSec],
        score: 100,
        breakdown: {
          facultyScore: 0,
          gapScore: 0,
          dayCompactScore: 0,
          timePreferenceScore: 0,
          tentativePenalty: 0,
        },
        stats: {
          daysUsed: ['Sat'],
          totalGapMinutes: 0,
          earliestStart: 510,
          latestEnd: 590,
          tentativeCount: 0,
          credits: 3,
        },
      };
      const mockReq: SolveRequest = {
        selectedCourses: ['CSE 4509'],
        preferredFaculty: {},
        avoidFaculty: {},
        lockedSections: {},
        filterDayOff: [],
        weights: {
          facultyPreference: 30,
          minimizeGaps: 25,
          compactDays: 20,
          avoidEarlyLate: 15,
          avoidTentative: 10,
        },
      };

      const saved = buildSavedRoutineObject({
        name: 'My Routine',
        schedule: mockSchedule,
        request: mockReq,
      });
      const savedJson = JSON.stringify(saved);
      expect(savedJson).not.toContain(secretId);
      expect(savedJson).not.toContain('exams');

      const shareToken = encodeSharedRoutineUrl(saved);
      expect(shareToken).not.toContain(secretId);
    });
  });

  describe('unique exam grouping and counts', () => {
    it('merges BSCSE and BSDS rows of the same course and slot into one exam', () => {
      const grouped = groupUniqueExams(SAMPLE_EXAMS);
      // SAMPLE_EXAMS has 10 rows:
      // - CSE 4509 A & B (1 exam, 2 sections)
      // - CSE 3811 A (1 exam, 1 section)
      // - CSE 4889 A (1 exam, 1 section)
      // - CSE 3521 A (BSCSE) + BA (BSDS) -> merged into 1 exam, 2 sections
      // - CSE 4165 A (slot 1) and C (slot 2) -> 2 exams, 1 section each
      // - CSE 3411 A (1 exam, 1 section)
      // - CSE 4811 A (dropped -> excluded)
      expect(grouped).toHaveLength(7);
      const { examCount, sectionCount } = countExamsAndSections(grouped);
      expect(examCount).toBe(7);
      expect(sectionCount).toBe(9);
      expect(formatExamCountSummary(examCount, sectionCount)).toBe('7 exams · 9 sections');

      const dbms = grouped.find((e) => e.courseCode === 'CSE 3521');
      expect(dbms).toBeDefined();
      expect(dbms?.sectionCount).toBe(2);
      expect(dbms?.programs).toEqual([
        { program: 'BSCSE', sectionCount: 1 },
        { program: 'BSDS', sectionCount: 1 },
      ]);

      const webProg = grouped.filter((e) => e.courseCode === 'CSE 4165');
      expect(webProg).toHaveLength(2);
    });
  });

  describe('timeOfDay boundaries', () => {
    it('classifies Morning (<11:00), Midday (11:00..13:59), Afternoon (>=14:00)', () => {
      expect(timeOfDay(510)).toBe('morning'); // 08:30
      expect(timeOfDay(659)).toBe('morning'); // 10:59
      expect(timeOfDay(660)).toBe('midday');  // 11:00
      expect(timeOfDay(839)).toBe('midday');  // 13:59
      expect(timeOfDay(840)).toBe('afternoon'); // 14:00
      expect(timeOfDay(870)).toBe('afternoon'); // 14:30
    });
  });

  describe('formatDate and formatExamDayLabel', () => {
    it('formats ISO dates for display', () => {
      expect(formatDate('2026-11-26')).toBe('Nov 26, 2026');
      expect(formatExamDayLabel('2026-12-05')).toBe('Sat, Dec 5');
      expect(formatExamDayLabel('2026-12-08')).toBe('Tue, Dec 8');
    });
  });

  describe('getNextExam', () => {
    it('computes today, tomorrow, in N days, and completed states', () => {
      const grouped = groupUniqueExams(SAMPLE_EXAMS);

      const resToday = getNextExam(grouped, '2026-12-05');
      expect(resToday.status).toBe('upcoming');
      if (resToday.status === 'upcoming') {
        expect(resToday.label).toBe('Today');
        expect(resToday.daysUntil).toBe(0);
      }

      const resTomorrow = getNextExam(grouped, '2026-12-04');
      expect(resTomorrow.status).toBe('upcoming');
      if (resTomorrow.status === 'upcoming') {
        expect(resTomorrow.label).toBe('Tomorrow');
        expect(resTomorrow.daysUntil).toBe(1);
      }

      const res9Days = getNextExam(grouped, '2026-11-26');
      expect(res9Days.status).toBe('upcoming');
      if (res9Days.status === 'upcoming') {
        expect(res9Days.label).toBe('in 9 days');
        expect(res9Days.daysUntil).toBe(9);
      }

      const resDone = getNextExam(grouped, '2026-12-20');
      expect(resDone.status).toBe('completed');
    });
  });

  describe('dayStats', () => {
    it('aggregates days, busiest day, and user exam flags', () => {
      const grouped = groupUniqueExams(SAMPLE_EXAMS);
      const summary = dayStats(grouped, ['CSE 3521']);
      expect(summary.totalDays).toBe(3);
      expect(summary.dateRangeLabel).toBe('Dec 5–12');
      expect(summary.busiestDay?.date).toBe('2026-12-05');
      expect(summary.busiestDay?.examCount).toBe(3);

      const dec7 = summary.days.find((d) => d.date === '2026-12-07');
      expect(dec7?.hasUserExam).toBe(true);
      const dec12 = summary.days.find((d) => d.date === '2026-12-12');
      expect(dec12?.hasUserExam).toBe(false);
    });
  });

  describe('deep-link parsing and privacy', () => {
    it('parses valid params, falls back on invalid values, and never serializes student ID', () => {
      const parsed = parseExamsPageParams(
        '?q=CSE+4509&program=BSCSE&date=2026-12-05&time=morning&mode=all&view=list&id=0112230263',
        true
      );
      expect(parsed).toEqual({
        q: 'CSE 4509',
        program: 'BSCSE',
        date: '2026-12-05',
        time: 'morning',
        mode: 'all',
        view: 'list',
      });

      const fallback = parseExamsPageParams(
        '?program=INVALID&date=bad&time=midnight&mode=weird&view=grid',
        true
      );
      expect(fallback).toEqual({
        q: '',
        program: 'ALL',
        date: 'ALL',
        time: 'ALL',
        mode: 'mine',
        view: 'date',
      });

      const qs = serializeExamsPageParams(parsed);
      expect(qs).not.toContain('0112230263');
    });
  });
});
