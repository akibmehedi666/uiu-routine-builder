import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getAllFacultyStats,
  getFacultyStatsById,
  getTBASections,
  classifyTimeSlot,
  stripFacultyTitle,
  filterFaculty,
  sortFaculty,
  computeFacultyBadges,
  getFacultyLeaderboards,
  getDailyFacultySpotlight,
  formatMinutesToTime,
} from '../facultyStats';
import rawSections from '../../../data/sections.json';
import rawFaculty from '../../../data/faculty.json';
import { getNavConfig } from '../../config/nav';
import { FACULTY_BADGE_THRESHOLDS } from '../../config/facultyBadges';

describe('Faculty Stats Data Layer & Integrity Tests', () => {
  const allFaculty = getAllFacultyStats();

  describe('1. Totals sanity and completeness', () => {
    it('loads exactly 207 faculty members excluding TBA', () => {
      expect(allFaculty.length).toBe(207);
      // Ensure no TBA faculty entry in the directory
      expect(allFaculty.some((f) => f.id === 'tba')).toBe(false);
      expect(allFaculty.some((f) => f.name.toLowerCase() === 'tba')).toBe(false);
    });

    it('sum of sections across faculty plus TBA sections equals raw sections + multi-faculty duplicates', () => {
      const tbaGroups = getTBASections();
      const tbaSectionsCount = tbaGroups.reduce((acc, g) => acc + g.sections.length, 0);
      expect(tbaSectionsCount).toBe(25);

      const totalFacultyAssignedSections = allFaculty.reduce(
        (sum, f) => sum + f.totalSections,
        0
      );

      // Section CSE 4399 A has 2 faculty members: Siddique Md. Lutful Kabir and Mr. Angkon Deb
      // So it is counted on both faculty pages (+1).
      // Total sections in sections.json is 791.
      expect(totalFacultyAssignedSections + tbaSectionsCount).toBe(rawSections.length + 1);
      expect(rawSections.length).toBe(791);
      expect(totalFacultyAssignedSections).toBe(767);
    });

    it('multi-faculty section CSE 4399 is credited to both instructors', () => {
      const angkon = getFacultyStatsById('mr-angkon-deb');
      const siddique = getFacultyStatsById('siddique-md-lutful-kabir');

      expect(angkon).toBeDefined();
      expect(siddique).toBeDefined();

      const angkonHasCSE4399 = angkon?.courses.some((c) => c.courseCode === 'CSE 4399');
      const siddiqueHasCSE4399 = siddique?.courses.some((c) => c.courseCode === 'CSE 4399');

      expect(angkonHasCSE4399).toBe(true);
      expect(siddiqueHasCSE4399).toBe(true);
    });
  });

  describe('2. Time formatting and slot boundaries', () => {
    it('correctly classifies slot boundaries (11:10 vs 11:11, 13:50 vs 13:51)', () => {
      // 11:10 = 11*60 + 10 = 670 -> Morning
      expect(classifyTimeSlot(670)).toBe('Morning');
      // 11:11 = 11*60 + 11 = 671 -> Midday
      expect(classifyTimeSlot(671)).toBe('Midday');
      // 13:50 = 13*60 + 50 = 830 -> Midday
      expect(classifyTimeSlot(830)).toBe('Midday');
      // 13:51 = 13*60 + 51 = 831 -> Afternoon
      expect(classifyTimeSlot(831)).toBe('Afternoon');

      // 08:30 = 510 -> Morning
      expect(classifyTimeSlot(510)).toBe('Morning');
      // 14:00 = 840 -> Afternoon
      expect(classifyTimeSlot(840)).toBe('Afternoon');
    });

    it('formats minutes into standard 12-hour display strings', () => {
      expect(formatMinutesToTime(510)).toBe('08:30 AM');
      expect(formatMinutesToTime(590)).toBe('09:50 AM');
      expect(formatMinutesToTime(671)).toBe('11:11 AM');
      expect(formatMinutesToTime(830)).toBe('01:50 PM');
      expect(formatMinutesToTime(831)).toBe('01:51 PM');
      expect(formatMinutesToTime(990)).toBe('04:30 PM');
    });
  });

  describe('3. Title-insensitive sorting and name quirks', () => {
    it('strips academic and honorific prefixes for sorting without modifying display name', () => {
      expect(stripFacultyTitle('Mr. Abid Hasan Khondaker')).toBe('Abid Hasan Khondaker');
      expect(stripFacultyTitle('Dr. Mohammad Nurul Huda')).toBe('Mohammad Nurul Huda');
      expect(stripFacultyTitle('Prof. Dr. M. Rezwan Khan')).toBe('Rezwan Khan');
      expect(stripFacultyTitle('Md. Sajjad Hossain')).toBe('Sajjad Hossain');
      expect(stripFacultyTitle('Ms. Shakila Aziz')).toBe('Shakila Aziz');
    });

    it('sorts faculty list alphabetically ignoring titles', () => {
      const sorted = sortFaculty(allFaculty, 'az');
      // Verify sortName is strictly in ascending alphabetical order
      for (let i = 0; i < sorted.length - 1; i++) {
        const cmp = sorted[i].sortName.localeCompare(sorted[i + 1].sortName, undefined, {
          sensitivity: 'base',
        });
        expect(cmp).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('4. Badge thresholds and evaluation', () => {
    it('evaluates badges consistently with centralized thresholds', () => {
      const badges = computeFacultyBadges({
        firstBellSections: 3,
        lateShiftSections: 0,
        labSections: 3,
        distinctCourses: 5,
        totalSections: 6,
        satTueSections: 5,
      });

      const badgeIds = badges.map((b) => b.id);
      expect(badgeIds).toContain('firstBell');
      expect(badgeIds).toContain('labPro');
      expect(badgeIds).toContain('multiCourse');
      expect(badgeIds).toContain('busiest');
      expect(badgeIds).toContain('weekendStarter');
      expect(badgeIds).not.toContain('lateShift');
    });

    it('each faculty has badges array and stats numbers are non-negative', () => {
      for (const f of allFaculty) {
        expect(f.totalSections).toBeGreaterThan(0);
        expect(f.distinctCourseCount).toBeGreaterThan(0);
        expect(f.totalWeeklyMinutes).toBeGreaterThan(0);
        expect(f.totalWeeklyHours).toBeGreaterThan(0);
        expect(f.daysOnCampus).toBeGreaterThanOrEqual(1);
        expect(f.daysOnCampus).toBeLessThanOrEqual(5);
        expect(Array.isArray(f.badges)).toBe(true);
      }
    });
  });

  describe('5. Filters and sorting operations', () => {
    it('filters by program', () => {
      const bscseOnly = filterFaculty(allFaculty, { program: 'BSCSE' });
      expect(bscseOnly.every((f) => f.programs.includes('BSCSE'))).toBe(true);

      const bsdsOnly = filterFaculty(allFaculty, { program: 'BSDS' });
      expect(bsdsOnly.every((f) => f.programs.includes('BSDS'))).toBe(true);
      expect(bsdsOnly.length).toBeLessThan(allFaculty.length);
    });

    it('filters by day', () => {
      const satOnly = filterFaculty(allFaculty, { day: 'Sat' });
      expect(satOnly.every((f) => f.activeDays.includes('Sat'))).toBe(true);
    });

    it('filters by time slot', () => {
      const morningOnly = filterFaculty(allFaculty, { timeSlot: 'Morning' });
      expect(morningOnly.every((f) => f.slotCounts.morning > 0)).toBe(true);

      const afternoonOnly = filterFaculty(allFaculty, { timeSlot: 'Afternoon' });
      expect(afternoonOnly.every((f) => f.slotCounts.afternoon > 0)).toBe(true);
    });

    it('filters by course kind (theory vs lab)', () => {
      const labOnly = filterFaculty(allFaculty, { kind: 'lab' });
      expect(labOnly.every((f) => f.labCourseCount > 0)).toBe(true);

      const theoryOnly = filterFaculty(allFaculty, { kind: 'theory' });
      expect(theoryOnly.every((f) => f.theoryCourseCount > 0)).toBe(true);
    });

    it('filters by text search on faculty name and course code', () => {
      const searchName = filterFaculty(allFaculty, { search: 'shakila' });
      expect(searchName.length).toBeGreaterThan(0);
      expect(searchName.some((f) => f.name.toLowerCase().includes('shakila'))).toBe(true);

      const searchCourse = filterFaculty(allFaculty, { search: 'CSE 1111' });
      expect(searchCourse.length).toBeGreaterThan(0);
      expect(
        searchCourse.every((f) => f.courses.some((c) => c.courseCode.includes('CSE 1111')))
      ).toBe(true);
    });

    it('sorts by different criteria', () => {
      const bySections = sortFaculty(allFaculty, 'most-sections');
      expect(bySections[0].totalSections).toBeGreaterThanOrEqual(bySections[1].totalSections);

      const byCourses = sortFaculty(allFaculty, 'most-courses');
      expect(byCourses[0].distinctCourseCount).toBeGreaterThanOrEqual(
        byCourses[1].distinctCourseCount
      );

      const byCredits = sortFaculty(allFaculty, 'most-credits');
      expect(byCredits[0].totalCredits).toBeGreaterThanOrEqual(byCredits[1].totalCredits);

      const byHours = sortFaculty(allFaculty, 'most-hours');
      expect(byHours[0].totalWeeklyMinutes).toBeGreaterThanOrEqual(
        byHours[1].totalWeeklyMinutes
      );
    });
  });

  describe('6. Leaderboards and Daily Spotlight', () => {
    it('produces 4 top-5 leaderboards with valid entries', () => {
      const boards = getFacultyLeaderboards(allFaculty);
      expect(boards.mostSections.length).toBe(5);
      expect(boards.mostCourses.length).toBe(5);
      expect(boards.mostHours.length).toBe(5);
      expect(boards.mostFirstBell.length).toBe(5);

      expect(boards.mostSections[0].metricValue).toMatch(/\d+ sections/);
      expect(boards.mostCourses[0].metricValue).toMatch(/\d+ courses/);
      expect(boards.mostHours[0].metricValue).toMatch(/\d+(\.\d+)? hrs/);
    });

    it('deterministic spotlight returns identical result for identical date string', () => {
      const spot1 = getDailyFacultySpotlight(allFaculty, '2026-10-22');
      const spot2 = getDailyFacultySpotlight(allFaculty, '2026-10-22');
      expect(spot1).not.toBeNull();
      expect(spot1?.id).toBe(spot2?.id);

      const spotOtherDay = getDailyFacultySpotlight(allFaculty, '2026-10-23');
      expect(spotOtherDay).not.toBeNull();
    });
  });

  describe('7. Static Safety & Navigation Config', () => {
    it('nav config properly identifies faculty-directory and preserves links order', () => {
      const config = getNavConfig('/faculty-directory');
      expect(config.activeRoute).toBe('faculty-directory');

      const detailConfig = getNavConfig('/faculty-directory/ishrat-jahan');
      expect(detailConfig.activeRoute).toBe('faculty-directory');

      const dirConfig = getNavConfig('/faculty');
      expect(dirConfig.activeRoute).toBe('directory');
    });

    it('no Prefer/Avoid or routine-builder state imports in facultyStats', () => {
      const statsFile = fs.readFileSync(
        path.join(__dirname, '../facultyStats.ts'),
        'utf-8'
      );
      expect(statsFile).not.toContain('preferredFaculty');
      expect(statsFile).not.toContain('avoidFaculty');
      expect(statsFile).not.toContain('useSolver');
      expect(statsFile).not.toContain('savedRoutines');
    });
  });
});
