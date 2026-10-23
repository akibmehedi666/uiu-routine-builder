import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import rawSections from '../../../data/sections.json';
import rawCourses from '../../../data/courses.json';
import rawFaculty from '../../../data/faculty.json';
import overridesList from '../../../data/overrides/2026-fall-faculty-changes.json';
import { Section, Course, SolveRequest } from '../../types';
import { getAllFacultyStats, getFacultyStatsById, filterFaculty, getTBASections } from '../facultyStats';
import { buildCourseDirectory } from '../courseDirectory';
import { solveSchedules } from '../../solver';
import { validateSavedRoutine, buildSavedRoutineObject } from '../../utils/savedRoutinesStorage';
import { migrateFacultyIdArray } from '../facultyAliases';

describe('Fall 2026 Data Overrides & Catalog Rebuild Tests', () => {
  const allFaculty = getAllFacultyStats();

  describe('1. Overrides Application & Integrity', () => {
    it('contains exactly 9 overrides in 2026-fall-faculty-changes.json', () => {
      expect(overridesList.length).toBe(9);
    });

    it('total section count strictly remains 791', () => {
      expect(rawSections.length).toBe(791);
    });

    it('applies all 9 overrides with exact new faculty and matching meetings', () => {
      for (const ov of overridesList) {
        const sec = rawSections.find(
          (s) =>
            s.program === ov.program &&
            s.courseCode === ov.courseCode &&
            s.section === ov.section
        );
        expect(sec).toBeDefined();

        if (ov.newFaculty === 'TBA') {
          expect(sec!.faculty).toEqual(['TBA']);
          expect(sec!.facultyIds).toEqual([]);
          expect(sec!.tentative).toBe(true);
        } else {
          expect(sec!.faculty).toEqual([ov.newFaculty]);
          expect(sec!.facultyIds).toContain('nazmul-hasan');
        }

        expect(sec!.updated).toBe(true);
        expect(sec!.updatedNote).toBe('Faculty updated in UCAM');

        // Verify meetings (day, start, end, room) exactly match expected
        expect(sec!.meetings.length).toBe(ov.meetingsExpected.length);
        for (let i = 0; i < sec!.meetings.length; i++) {
          expect(sec!.meetings[i].day).toBe(ov.meetingsExpected[i].day);
          expect(sec!.meetings[i].start).toBe(ov.meetingsExpected[i].start);
          expect(sec!.meetings[i].end).toBe(ov.meetingsExpected[i].end);
          expect(sec!.meetings[i].room).toBe(ov.meetingsExpected[i].room);
        }
      }
    });

    it('MATH 2205 D is assigned to Nazmul Hasan with id nazmul-hasan and marked updated', () => {
      const sec = rawSections.find(
        (s) => s.courseCode === 'MATH 2205' && s.section === 'D' && s.program === 'BSCSE'
      );
      expect(sec).toBeDefined();
      expect(sec!.faculty).toEqual(['Nazmul Hasan']);
      expect(sec!.facultyIds).toEqual(['nazmul-hasan']);
      expect(sec!.updated).toBe(true);
      expect(sec!.updatedNote).toBe('Faculty updated in UCAM');
    });

    it('ECO 4101 and CSE 4883 sections remain completely untouched', () => {
      const ecoSections = rawSections.filter((s) => s.courseCode === 'ECO 4101');
      const cse4883Sections = rawSections.filter((s) => s.courseCode === 'CSE 4883');

      expect(ecoSections.length).toBe(8);
      expect(cse4883Sections.length).toBe(5);

      // Verify specific known instructors
      const ecoA = ecoSections.find((s) => s.section === 'A');
      expect(ecoA?.faculty).toEqual(['Tasneem Jahan Tumpa']);
      expect(ecoA?.updated).toBeUndefined();

      const cse4883A = cse4883Sections.find((s) => s.section === 'A');
      expect(cse4883A?.faculty).toEqual(['Md. Tanvir Raihan']);
      expect(cse4883A?.updated).toBeUndefined();

      const cse4883D = cse4883Sections.find((s) => s.section === 'D');
      expect(cse4883D?.faculty).toEqual(['Md. Suzauddola']);
      expect(cse4883D?.updated).toBeUndefined();
    });
  });

  describe('2. Derived Catalogs Integrity & Zero-Section Cleanup', () => {
    it('no faculty in faculty.json has zero courses or sections', () => {
      for (const f of rawFaculty) {
        expect(f.courses.length).toBeGreaterThan(0);
      }
    });

    it('Rion (id: rion) and Sobur (id: sobur) are completely removed from faculty catalog', () => {
      const rionInJson = rawFaculty.find((f) => f.id === 'rion');
      const soburInJson = rawFaculty.find((f) => f.id === 'sobur');

      expect(rionInJson).toBeUndefined();
      expect(soburInJson).toBeUndefined();

      const rionInStats = getFacultyStatsById('rion');
      const soburInStats = getFacultyStatsById('sobur');

      expect(rionInStats).toBeUndefined();
      expect(soburInStats).toBeUndefined();
    });

    it('Rion and Sobur do not appear in directory search results', () => {
      const rionSearch = filterFaculty(allFaculty, { search: 'Rion' });
      const soburSearch = filterFaculty(allFaculty, { search: 'Sobur' });

      expect(rionSearch.length).toBe(0);
      expect(soburSearch.length).toBe(0);
    });

    it('Nazmul Hasan course count includes MATH 2205 D with updated flag', () => {
      const nazmul = getFacultyStatsById('nazmul-hasan');
      expect(nazmul).toBeDefined();

      const math2205 = nazmul!.courses.find((c) => c.courseCode === 'MATH 2205');
      expect(math2205).toBeDefined();
      expect(math2205!.sections.map((s) => s.section)).toContain('D');
      const secD = math2205!.sections.find((s) => s.section === 'D');
      expect(secD?.updated).toBe(true);
      expect(nazmul!.totalSections).toBe(6);
    });

    it('updated sections carry updated badge flags in TBA list and Course Directory', () => {
      const tbaGroups = getTBASections();
      const math2205TBA = tbaGroups.find((g) => g.courseCode === 'MATH 2205');
      expect(math2205TBA).toBeDefined();
      const secA = math2205TBA!.sections.find((s) => s.section === 'A');
      expect(secA?.updated).toBe(true);

      const dir = buildCourseDirectory(rawCourses as Course[], rawSections as Section[]);
      const dirMath2205 = dir.find((c) => c.code === 'MATH 2205');
      expect(dirMath2205).toBeDefined();
      const dirSecA = dirMath2205!.sections.find((s) => s.section === 'A');
      expect(dirSecA?.updated).toBe(true);
      expect(dirSecA?.updatedNote).toBe('Faculty updated in UCAM');
    });

    it('sum of faculty sections plus TBA sections accounts for every section (+1 multi-faculty)', () => {
      const totalFacultyAssigned = allFaculty.reduce((sum, f) => sum + f.totalSections, 0);
      const tbaSections = rawSections.filter((s) => s.faculty.includes('TBA')).length;

      // 760 assigned + 32 TBA = 792 = 791 sections + 1 (CSE 4399 A co-taught)
      expect(totalFacultyAssigned + tbaSections).toBe(rawSections.length + 1);
      expect(tbaSections).toBe(32);
    });
  });

  describe('3. Stale User State & Backward Compatibility', () => {
    it('stale pinned faculty IDs (e.g. rion, sobur) are filtered out gracefully', () => {
      const stalePins = ['rion', 'sobur', 'nazmul-hasan'];
      const validFacultyIds = new Set(rawFaculty.map((f) => f.id));

      const cleaned = migrateFacultyIdArray(stalePins).filter((id) => validFacultyIds.has(id));
      expect(cleaned).toEqual(['nazmul-hasan']);
      expect(cleaned).not.toContain('rion');
      expect(cleaned).not.toContain('sobur');
    });

    it('solver runs safely without error if request contains stale preferred/avoid faculty', () => {
      const req: SolveRequest = {
        selectedCourses: ['MATH 2205', 'CSE 2213'],
        preferredFaculty: { 'MATH 2205': ['rion'] }, // Stale preference
        avoidFaculty: { 'MATH 2205': ['sobur'] },     // Stale avoid
        lockedSections: {},
        filterDayOff: [],
        weights: {
          facultyPreference: 20,
          minimizeGaps: 20,
          compactDays: 20,
          avoidEarlyLate: 20,
          avoidTentative: 20,
        },
        limit: 10,
      };

      const result = solveSchedules(rawSections as Section[], req);
      expect(result.schedules.length).toBeGreaterThan(0);
      expect(result.totalValidCombinations).toBeGreaterThan(0);
    });

    it('saved routine with pre-update CSE 4509 E triggers data changed warning with faculty diff', () => {
      // Simulate a snapshot saved prior to the override
      const mockSnapshot = buildSavedRoutineObject({
        name: 'My Saved Routine',
        schedule: {
          score: 95,
          sections: [
            {
              id: 'BSCSE-CSE 4509-E',
              sl: 400,
              program: 'BSCSE',
              courseCode: 'CSE 4509',
              title: 'Operating Systems',
              section: 'E',
              credit: 3,
              kind: 'theory',
              meetings: [
                { day: 'Sun', start: 510, end: 590, room: '406' },
                { day: 'Wed', start: 510, end: 590, room: '406' },
              ],
              faculty: ['Mr. Syed Tauhid Zuhori'], // Old faculty before override
              facultyIds: ['mr-syed-tauhid-zuhori'],
              tentative: false,
            },
          ],
          stats: {
            credits: 3,
            daysUsed: ['Sun', 'Wed'],
            totalGapMinutes: 0,
            earliestStart: 510,
            latestEnd: 590,
            tentativeCount: 0,
          },
        },
        request: {
          selectedCourses: ['CSE 4509'],
          preferredFaculty: {},
          avoidFaculty: {},
          lockedSections: {},
          filterDayOff: [],
          weights: {
            facultyPreference: 20,
            minimizeGaps: 20,
            compactDays: 20,
            avoidEarlyLate: 20,
            avoidTentative: 20,
          },
        },
      });

      const validation = validateSavedRoutine(mockSnapshot, rawSections as Section[]);
      expect(validation.hasChangedSections).toBe(true);
      expect(validation.isFullyValid).toBe(false);
      expect(validation.diffs.length).toBe(1);

      const diff = validation.diffs[0];
      expect(diff.courseCode).toBe('CSE 4509');
      expect(diff.section).toBe('E');
      expect(diff.type).toBe('faculty_changed');
      expect(diff.details).toContain('Faculty reassigned');
      expect(diff.details).toContain('TBA');
    });
  });

  describe('4. Fail-Loudly Script Tests', () => {
    const scriptPath = path.resolve(process.cwd(), 'scripts/apply_overrides.py');
    const tempDir = path.resolve(process.cwd(), 'data/scratch-test-overrides');

    it('fails loudly when expectedOldFaculty does not match section current faculty', () => {
      // Create a temporary mismatch override
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const testOverridesPath = path.join(tempDir, 'mismatch-overrides.json');
      fs.writeFileSync(
        testOverridesPath,
        JSON.stringify([
          {
            program: 'BSCSE',
            courseCode: 'CSE 4509',
            section: 'E',
            expectedOldFaculty: 'Wrong Faculty Name',
            newFaculty: 'TBA',
            meetingsExpected: [
              { day: 'Sun', start: 510, end: 590, room: '406' },
              { day: 'Wed', start: 510, end: 590, room: '406' },
            ],
          },
        ])
      );

      expect(() => {
        execFileSync('python3', [
          scriptPath,
          '--data_dir',
          path.resolve(process.cwd(), 'data'),
          '--overrides',
          testOverridesPath,
        ]);
      }).toThrow();

      // Clean up temp
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('fails loudly when section is missing from the dataset', () => {
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const testOverridesPath = path.join(tempDir, 'missing-section-overrides.json');
      fs.writeFileSync(
        testOverridesPath,
        JSON.stringify([
          {
            program: 'BSCSE',
            courseCode: 'NON_EXISTENT_9999',
            section: 'Z',
            expectedOldFaculty: 'Nobody',
            newFaculty: 'TBA',
            meetingsExpected: [],
          },
        ])
      );

      expect(() => {
        execFileSync('python3', [
          scriptPath,
          '--data_dir',
          path.resolve(process.cwd(), 'data'),
          '--overrides',
          testOverridesPath,
        ]);
      }).toThrow();

      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('fails loudly when meetingsExpected differs from section meetings', () => {
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const testOverridesPath = path.join(tempDir, 'mismatch-meetings-overrides.json');
      fs.writeFileSync(
        testOverridesPath,
        JSON.stringify([
          {
            program: 'BSCSE',
            courseCode: 'CSE 4509',
            section: 'E',
            expectedOldFaculty: 'TBA', // Currently TBA after first run
            newFaculty: 'TBA',
            meetingsExpected: [
              { day: 'Sun', start: 600, end: 700, room: '999' }, // Drifted time/room
            ],
          },
        ])
      );

      expect(() => {
        execFileSync('python3', [
          scriptPath,
          '--data_dir',
          path.resolve(process.cwd(), 'data'),
          '--overrides',
          testOverridesPath,
        ]);
      }).toThrow();

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });
});
