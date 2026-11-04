import { describe, it, expect } from 'vitest';
import rawSections from '../../../data/sections.json';
import rawCourses from '../../../data/courses.json';
import rawFaculty from '../../../data/faculty.json';
import droppedOverridePayload from '../../../data/overrides/2026-fall-dropped-sections.json';
import { Section, Course, SolveRequest } from '../../types';
import { solveSchedules } from '../../solver';
import { filterValidLocks } from '../lockUtils';
import { validateSavedRoutine } from '../../utils/savedRoutinesStorage';
import {
  getAllFacultyStats,
  getTBASections,
  getMostDroppedFacultyLeaderboard,
} from '../facultyStats';
import { naturalSectionSort } from '../courseDirectory';

describe('Fall 2026 Dropped Sections & Derived Views Test Suite', () => {
  const sections = rawSections as unknown as Section[];
  const courses = rawCourses as unknown as Course[];
  const faculty = rawFaculty as unknown as { id: string; name: string; courses: any[]; droppedSections?: any[] }[];

  describe('1. Data Layer & Catalog Rebuild Integrity', () => {
    it('total sections count remains exactly 791 (no rows added or deleted)', () => {
      expect(sections.length).toBe(791);
    });

    it('identifies applied vs not found entries from the override list', () => {
      const droppedInPayload = droppedOverridePayload as { program: string; courseCode: string; section: string }[];
      expect(droppedInPayload.length).toBe(58);

      const foundList: typeof droppedInPayload = [];
      const notFoundList: typeof droppedInPayload = [];

      for (const entry of droppedInPayload) {
        const match = sections.find(
          (s) =>
            s.program === entry.program &&
            s.courseCode === entry.courseCode &&
            s.section === entry.section
        );
        if (match) {
          foundList.push(entry);
        } else {
          notFoundList.push(entry);
        }
      }

      // Exactly 53 found and applied, 5 not found
      expect(foundList.length).toBe(53);
      expect(notFoundList.length).toBe(5);

      const notFoundCodes = notFoundList.map((e) => `${e.courseCode} ${e.section}`).sort();
      expect(notFoundCodes).toEqual([
        'CSE 1325 H',
        'CSE 4325 K',
        'CSE 4509 J',
        'DS 1116 BB',
        'MATH 1151 AA',
      ]);
    });

    it('all applied sections have status="dropped" and droppedAt timestamp, others are active', () => {
      const droppedSections = sections.filter((s) => s.status === 'dropped');
      const activeSections = sections.filter((s) => s.status === 'active' || !s.status);

      expect(droppedSections.length).toBe(53);
      expect(activeSections.length).toBe(738);
      expect(droppedSections.length + activeSections.length).toBe(791);

      for (const sec of droppedSections) {
        expect(sec.droppedAt).toBeDefined();
        expect(sec.droppedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('courses.json correctly reflects activeSectionCount and allDropped', () => {
      expect(courses.length).toBe(107);

      const fullyDropped = courses.filter((c) => c.allDropped);
      const fullyDroppedCodes = fullyDropped.map((c) => c.code).sort();

      expect(fullyDroppedCodes).toEqual(['CSE 4133', 'CSE 4399', 'CSE 4811', 'CSE 4817']);

      for (const c of fullyDropped) {
        expect(c.activeSectionCount).toBe(0);
      }

      for (const c of courses) {
        const matchingSecs = sections.filter(
          (s) => s.program === c.program && s.courseCode === c.code
        );
        const activeCount = matchingSecs.filter((s) => s.status !== 'dropped').length;
        expect(c.activeSectionCount).toBe(activeCount);
        expect(c.allDropped).toBe(matchingSecs.length > 0 && activeCount === 0);
      }
    });

    it('faculty.json has zero-section faculty removed, active faculty counts only active courses', () => {
      // 186 active faculty members (pruned from 192)
      expect(faculty.length).toBe(186);

      for (const f of faculty) {
        expect(f.courses.length).toBeGreaterThan(0);
      }

      // Check the 6 removed faculty members
      const removedIds = [
        'emrul-kayes-raceme',
        'k-m-faizullah-fuhad',
        'mr-angkon-deb',
        'mr-masnoon-muztahid',
        'rifa-noor',
        'siddique-md-lutful-kabir',
      ];

      for (const rId of removedIds) {
        const found = faculty.find((f) => f.id === rId);
        expect(found).toBeUndefined();
      }
    });
  });

  describe('2. Solver & Stale User State Safety', () => {
    it('solver never returns any dropped section', () => {
      const activeSections = sections.filter((s) => s.status !== 'dropped');
      const droppedSectionIds = new Set(
        sections.filter((s) => s.status === 'dropped').map((s) => s.id)
      );

      const request: SolveRequest = {
        selectedCourses: ['ACT 2111', 'CSE 1115', 'CSE 1116', 'ENG 1011'],
        lockedSections: {},
        preferredFaculty: {},
        avoidFaculty: {},
        maxResults: 15,
      };

      const response = solveSchedules(activeSections, request);
      expect(response.schedules.length).toBeGreaterThan(0);

      for (const routine of response.schedules) {
        for (const sec of routine.sections) {
          expect(droppedSectionIds.has(sec.id)).toBe(false);
          expect(sec.status).not.toBe('dropped');
        }
      }
    });

    it('selecting a fully dropped course does not crash solver', () => {
      const activeSections = sections.filter((s) => s.status !== 'dropped');

      // CSE 4133 has 0 active sections
      const activeCourseCodes = new Set(activeSections.map((s) => s.courseCode));
      const requested = ['CSE 4133', 'CSE 1115'];
      const effectiveCourses = requested.filter((c) => activeCourseCodes.has(c));

      const request: SolveRequest = {
        selectedCourses: effectiveCourses,
        lockedSections: {},
        preferredFaculty: {},
        avoidFaculty: {},
        maxResults: 5,
      };

      expect(() => solveSchedules(activeSections, request)).not.toThrow();
      const response = solveSchedules(activeSections, request);
      expect(response.schedules.length).toBeGreaterThan(0);
      for (const r of response.schedules) {
        expect(r.sections.some((s) => s.courseCode === 'CSE 4133')).toBe(false);
      }
    });

    it('stale locks pointing to dropped sections are filtered out', () => {
      const activeSections = sections.filter((s) => s.status !== 'dropped');

      // BSCSE-ACT 2111-I is a dropped section
      const staleLocks = {
        'ACT 2111': 'BSCSE-ACT 2111-I',
        'CSE 1115': 'BSCSE-CSE 1115-A', // active
      };

      const { validLocks, staleCodes } = filterValidLocks(staleLocks, activeSections);
      expect(staleCodes).toContain('ACT 2111');
      expect(validLocks['ACT 2111']).toBeUndefined();
      expect(validLocks['CSE 1115']).toBe('BSCSE-CSE 1115-A');
    });

    it('saved routine with dropped section triggers warning with reason "Section dropped"', () => {
      const droppedSec = sections.find((s) => s.status === 'dropped')!;
      const savedRoutine = {
        id: 'test-saved-routine',
        name: 'My Saved Routine',
        createdAt: '2026-10-20',
        sections: [
          {
            sectionId: droppedSec.id,
            courseCode: droppedSec.courseCode,
            section: droppedSec.section,
            title: droppedSec.title,
            meetings: droppedSec.meetings,
          },
        ],
      };

      const validation = validateSavedRoutine(savedRoutine as any, sections);
      expect(validation.isFullyValid).toBe(false);
      expect(validation.hasChangedSections).toBe(true);
      expect(validation.diffs[0].details).toBe('Section dropped');
    });

    it('getAllFacultyStats excludes dropped sections and zero-section faculty', () => {
      const allStats = getAllFacultyStats();
      expect(allStats.length).toBe(186);

      for (const f of allStats) {
        expect(f.totalSections).toBeGreaterThan(0);
        for (const group of f.courses) {
          for (const s of group.sections) {
            const secInRaw = sections.find((raw) => raw.id === s.id);
            expect(secInRaw?.status).not.toBe('dropped');
          }
        }
      }
    });

    it('getTBASections excludes dropped sections', () => {
      const tbaGroups = getTBASections();
      for (const group of tbaGroups) {
        for (const sec of group.sections) {
          const secInRaw = sections.find((raw) => raw.id === sec.id);
          expect(secInRaw?.status).not.toBe('dropped');
        }
      }
    });
  });

  describe('3. "Most Dropped Sections" Leaderboard Ranking', () => {
    it('computes top rankings correctly, handles ties, max bar 100%, and excludes TBA', () => {
      const ranking = getMostDroppedFacultyLeaderboard();
      expect(ranking.entries.length).toBeLessThanOrEqual(5);
      expect(ranking.entries.length).toBeGreaterThan(0);

      // Top entry has max dropped sections
      const top = ranking.entries[0];
      expect(top.barPercentage).toBe(100);
      expect(top.droppedCount).toBe(2);

      // Verify tie handling: top entries sharing the same droppedCount and totalSections share "=1"
      const rank1Entries = ranking.entries.filter((e) => e.rank === '=1');
      expect(rank1Entries.length).toBe(3);
      for (const e of rank1Entries) {
        expect(e.droppedCount).toBe(2);
        expect(e.totalSections).toBe(6);
      }

      // Check TBA dropped sections count
      expect(ranking.tbaDroppedCount).toBe(11);

      // Detail formatting check
      for (const e of ranking.entries) {
        expect(e.sectionsDetail).toBeDefined();
        expect(e.sectionsDetail.length).toBeGreaterThan(0);
      }
    });

    it('naturalSectionSort sorts section letters naturally', () => {
      const raw = ['C', 'A', 'AA', 'B', 'AB', 'A1', 'A2'];
      const sorted = [...raw].sort(naturalSectionSort);
      expect(sorted).toEqual(['A', 'A1', 'A2', 'B', 'C', 'AA', 'AB']);
    });
  });
});
