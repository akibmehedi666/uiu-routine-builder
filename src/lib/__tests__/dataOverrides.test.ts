import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import rawSections from '../../../data/sections.json';
import rawCourses from '../../../data/courses.json';
import rawFaculty from '../../../data/faculty.json';
import overridesList from '../../../data/overrides/2026-fall-faculty-changes.json';
import oct24Overrides from '../../../data/overrides/2026-fall-faculty-changes-oct24.json';
import oct24Remaining from '../../../data/overrides/2026-fall-sync-remaining-oct24.json';
import { Section, Course, SolveRequest } from '../../types';
import { getAllFacultyStats, getFacultyStatsById, filterFaculty, getTBASections } from '../facultyStats';
import { buildCourseDirectory } from '../courseDirectory';
import { solveSchedules } from '../../solver';
import { validateSavedRoutine, buildSavedRoutineObject } from '../../utils/savedRoutinesStorage';
import { migrateFacultyIdArray } from '../facultyAliases';
import { resolveSectionId } from '../sectionAliases';
import { getUpdatedCourseLists, getNoticeData } from '../noticeCourses';

describe('Fall 2026 Data Overrides & Catalog Rebuild Tests', () => {
  const allFaculty = getAllFacultyStats();

  describe('1. Overrides Application & Integrity', () => {
    it('contains exactly 74 overrides in 2026-fall-faculty-changes-oct24.json', () => {
      expect(oct24Overrides.length).toBe(74);
    });

    it('total section count strictly remains 791', () => {
      expect(rawSections.length).toBe(791);
    });

    it('applies all 74 overrides with exact new faculty, matching meetings, and updatedOn 2026-10-24', () => {
      for (const ov of oct24Overrides) {
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
          expect(sec!.facultyIds.length).toBeGreaterThan(0);
        }

        expect(sec!.updated).toBe(true);
        expect(sec!.updatedOn).toBe('2026-10-24');
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

    it('exactly 131 sections in the dataset have updated: true and updatedOn: 2026-10-24', () => {
      const updatedSecs = rawSections.filter((s) => s.updated === true);
      expect(updatedSecs.length).toBe(131);
      for (const s of updatedSecs) {
        expect(s.updatedOn).toBe('2026-10-24');
      }
    });

    it('historical 9 overrides in 2026-fall-faculty-changes.json still retain their assigned faculty', () => {
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
        } else {
          expect(sec!.faculty).toEqual([ov.newFaculty]);
        }
      }
    });

    it('MATH 2205 D is assigned to Nazmul Hasan with id nazmul-hasan', () => {
      const sec = rawSections.find(
        (s) => s.courseCode === 'MATH 2205' && s.section === 'D' && s.program === 'BSCSE'
      );
      expect(sec).toBeDefined();
      expect(sec!.faculty).toEqual(['Nazmul Hasan']);
      expect(sec!.facultyIds).toEqual(['nazmul-hasan']);
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

    it('Nazmul Hasan course count includes MATH 2205 D', () => {
      const nazmul = getFacultyStatsById('nazmul-hasan');
      expect(nazmul).toBeDefined();

      const math2205 = nazmul!.courses.find((c) => c.courseCode === 'MATH 2205');
      expect(math2205).toBeDefined();
      expect(math2205!.sections.map((s) => s.section)).toContain('D');
      expect(nazmul!.totalSections).toBe(6);
    });

    it('updated sections carry updated badge flags in TBA list and Course Directory', () => {
      const tbaGroups = getTBASections();
      const cse1110TBA = tbaGroups.find((g) => g.courseCode === 'CSE 1110');
      expect(cse1110TBA).toBeDefined();
      const secN = cse1110TBA!.sections.find((s) => s.section === 'N');
      expect(secN?.updated).toBe(true);
      expect(secN?.updatedOn).toBe('2026-10-24');

      const dir = buildCourseDirectory(rawCourses as Course[], rawSections as Section[]);
      const dirCSE1110 = dir.find((c) => c.code === 'CSE 1110');
      expect(dirCSE1110).toBeDefined();
      const dirSecN = dirCSE1110!.sections.find((s) => s.section === 'N');
      expect(dirSecN?.updated).toBe(true);
      expect(dirSecN?.updatedOn).toBe('2026-10-24');
      expect(dirSecN?.updatedNote).toBe('Faculty updated in UCAM');
    });

    it('sum of faculty sections plus TBA sections accounts for every section (+1 multi-faculty)', () => {
      const totalFacultyAssigned = allFaculty.reduce((sum, f) => sum + f.totalSections, 0);
      const tbaSections = rawSections.filter((s) => s.faculty.includes('TBA')).length;

      // 696 assigned + 96 TBA = 792 = 791 sections + 1 (CSE 4399 A co-taught)
      expect(totalFacultyAssigned + tbaSections).toBe(rawSections.length + 1);
      expect(tbaSections).toBe(96);
      expect(allFaculty.length).toBe(192);
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

  describe('5. Group B & Group C-D Timetable Sync & Invariants', () => {
    it('applies all 7 Group B room updates with matching schedule and updatedKind="schedule"', () => {
      for (const b of oct24Remaining.group_b) {
        const sec = rawSections.find((s) => s.sl === b.sl);
        expect(sec).toBeDefined();
        expect(sec!.courseCode).toBe(b.courseCode);
        expect(sec!.section).toBe(b.section);
        expect(sec!.faculty).toEqual(b.newFaculty);
        expect(sec!.meetings).toEqual(b.newMeetings);
        expect(sec!.updated).toBe(true);
        expect(sec!.updatedOn).toBe('2026-10-24');
        expect(sec!.updatedKind).toBe('schedule');
      }
    });

    it('applies all 50 Group C-D paired section updates in place', () => {
      for (const cd of oct24Remaining.group_cd_paired) {
        const sec = rawSections.find((s) => s.sl === cd.sl);
        expect(sec).toBeDefined();
        expect(sec!.courseCode).toBe(cd.courseCode);
        expect(sec!.section).toBe(cd.newSection);
        expect(sec!.id).toBe(`${cd.program}-${cd.courseCode}-${cd.newSection}`);
        expect(sec!.faculty).toEqual(cd.newFaculty);
        expect(sec!.meetings).toEqual(cd.newMeetings);
        expect(sec!.updated).toBe(true);
        expect(sec!.updatedOn).toBe('2026-10-24');
        expect(sec!.updatedKind).toBe(cd.updatedKind);
      }
    });

    it('every updated section exists and exactly 131 sections have updated: true', () => {
      const updatedSecs = rawSections.filter((s) => s.updated === true);
      expect(updatedSecs.length).toBe(131); // 74 Group a + 7 Group b + 50 Group c-d
      for (const s of updatedSecs) {
        expect(s.updatedOn).toBe('2026-10-24');
        expect(['faculty', 'schedule', 'both', 'new']).toContain(s.updatedKind);
      }
    });

    it('no section outside the diff lists has updated: true', () => {
      const groupASls = new Set(
        oct24Overrides.map((ov) => {
          const s = rawSections.find(
            (sec) =>
              sec.program === ov.program &&
              sec.courseCode === ov.courseCode &&
              sec.section === ov.section
          );
          return s?.sl;
        }).filter(Boolean)
      );
      const groupBSls = new Set(oct24Remaining.group_b.map((b) => b.sl));
      const groupCDSls = new Set(oct24Remaining.group_cd_paired.map((cd) => cd.sl));

      const expectedUpdatedSls = new Set([...groupASls, ...groupBSls, ...groupCDSls]);
      expect(expectedUpdatedSls.size).toBe(131);

      for (const sec of rawSections) {
        if (sec.updated) {
          expect(expectedUpdatedSls.has(sec.sl)).toBe(true);
        } else {
          expect(expectedUpdatedSls.has(sec.sl)).toBe(false);
        }
      }
    });

    it('no duplicate (program, courseCode, section) keys among updated sections', () => {
      const updatedSecs = rawSections.filter((s) => s.updated === true);
      const keys = updatedSecs.map((s) => `${s.program}-${s.courseCode}-${s.section}`);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    it('no two updated sections share the same id', () => {
      const updatedSecs = rawSections.filter((s) => s.updated === true);
      const ids = updatedSecs.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('CSE 1112 (23 sections), CSE 3522 (18 sections), and SOC 2101 (10 sections) have completely unique section letters and IDs', () => {
      for (const code of ['CSE 1112', 'CSE 3522', 'SOC 2101']) {
        const secs = rawSections.filter((s) => s.courseCode === code);
        const secLetters = secs.map((s) => `${s.program}-${s.section}`);
        const secIds = secs.map((s) => s.id);
        expect(secLetters.length).toBe(new Set(secLetters).size);
        expect(secIds.length).toBe(new Set(secIds).size);
      }
    });

    it('no new faculty overlapping conflicts were introduced (exactly 5 baseline conflicts exist)', () => {
      const facultyMeetings: Record<string, { id: string; day: string; start: number; end: number }[]> = {};
      for (const s of rawSections) {
        for (const f of s.faculty) {
          if (f === 'TBA') continue;
          for (const m of s.meetings) {
            if (!facultyMeetings[f]) facultyMeetings[f] = [];
            facultyMeetings[f].push({ id: s.id, day: m.day, start: m.start, end: m.end });
          }
        }
      }

      let overlapCount = 0;
      for (const [, ms] of Object.entries(facultyMeetings)) {
        for (let i = 0; i < ms.length; i++) {
          for (let j = i + 1; j < ms.length; j++) {
            if (ms[i].id === ms[j].id) continue;
            if (ms[i].day === ms[j].day) {
              if (Math.max(ms[i].start, ms[j].start) < Math.min(ms[i].end, ms[j].end)) {
                overlapCount++;
              }
            }
          }
        }
      }

      // Exactly the 5 pre-existing faculty overlaps in registrar data
      expect(overlapCount).toBe(5);
    });

    it('landing notice course lists match unique course codes of updated sections', () => {
      const { facultyCourses, scheduleCourses } = getUpdatedCourseLists(rawSections as Section[]);

      const expectedFacCourses = Array.from(
        new Set(
          rawSections
            .filter((s) => s.updated && (s.updatedKind === 'faculty' || s.updatedKind === 'both'))
            .map((s) => s.courseCode)
        )
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      const expectedSchedCourses = Array.from(
        new Set(
          rawSections
            .filter((s) => s.updated && (s.updatedKind === 'schedule' || s.updatedKind === 'both' || s.updatedKind === 'new'))
            .map((s) => s.courseCode)
        )
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      expect(facultyCourses).toEqual(expectedFacCourses);
      expect(scheduleCourses).toEqual(expectedSchedCourses);
      expect(facultyCourses.length).toBe(29);
      expect(scheduleCourses.length).toBe(8);
    });

    it('every code in the notice exists in courses.json with a title, and the notice list equals the unique course codes of updated sections', () => {
      const noticeData = getNoticeData();
      const rawCoursesMap = new Map(rawCourses.map((c) => [c.code, c.title]));
      const updatedCodes = new Set(rawSections.filter((s) => s.updated).map((s) => s.courseCode));

      // The notice expanded list equals the unique course codes of updated sections
      expect(noticeData.allChangedCourses.length).toBe(updatedCodes.size);
      const noticeCodes = new Set(noticeData.allChangedCourses.map((c) => c.code));
      expect(noticeCodes).toEqual(updatedCodes);

      // Every code in allChangedCourses exists in courses.json with a non-empty title
      for (const item of noticeData.allChangedCourses) {
        expect(rawCoursesMap.has(item.code)).toBe(true);
        expect(item.title).toBe(rawCoursesMap.get(item.code));
        expect(item.title.length).toBeGreaterThan(0);
      }

      // Every code in inline facultyChangedCodes and scheduleChangedCodes exists in courses.json with a title
      for (const item of noticeData.facultyChangedCodes) {
        expect(rawCoursesMap.has(item.code)).toBe(true);
        expect(item.title).toBe(rawCoursesMap.get(item.code));
        expect(item.title.length).toBeGreaterThan(0);
      }
      for (const item of noticeData.scheduleChangedCodes) {
        expect(rawCoursesMap.has(item.code)).toBe(true);
        expect(item.title).toBe(rawCoursesMap.get(item.code));
        expect(item.title.length).toBeGreaterThan(0);
      }
    });

    it('legacy section IDs resolve seamlessly via resolveSectionId', () => {
      expect(resolveSectionId('BSCSE-BDS 1201-DS')).toBe('BSCSE-BDS 1201-AE');
      expect(resolveSectionId('BSCSE-CSE 3522-S')).toBe('BSCSE-CSE 3522-A');
      expect(resolveSectionId('BSDS-CSE 3522-S')).toBe('BSDS-CSE 3522-BA');
      expect(resolveSectionId('BSCSE-CSE 1111-A')).toBe('BSCSE-CSE 1111-A'); // Unchanged
    });
  });
});
