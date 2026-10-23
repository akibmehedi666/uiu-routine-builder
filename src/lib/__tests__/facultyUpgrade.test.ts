import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import rawFaculty from '../../../data/faculty.json';
import rawSections from '../../../data/sections.json';
import rawAliases from '../../../data/faculty-id-aliases.json';
import {
  getAllFacultyStats,
  getFacultyStatsById,
  generateSearchAliases,
  filterFaculty,
  computeFacultyBadges,
} from '../facultyStats';
import { resolveFacultyId, migrateFacultyIdArray, migrateFacultyIdRecord } from '../facultyAliases';
import { parseFloorFromRoom, getRoomSchedule, getAllRooms } from '../roomSchedule';
import { getCampusStats } from '../campusStats';
import { FACULTY_BADGE_THRESHOLDS } from '../../config/facultyBadges';

describe('Phase 0: Faculty Name Fix & Backward Compatibility Tests', () => {
  const allFaculty = getAllFacultyStats();

  it('1. Golden test for the 6 critical names: must match complete full names from PDF', () => {
    const nameMap = new Map(allFaculty.map((f) => [f.id, f.name]));

    // 1. Abdullah Ibne Masud Mahi
    expect(nameMap.get('abdullah-ibne-masud-mahi')).toBe('Abdullah Ibne Masud Mahi');
    // 2. Abu Shafin Mohammad Mahdee Jameel
    expect(nameMap.get('abu-shafin-mohammad-mahdee-jameel')).toBe(
      'Abu Shafin Mohammad Mahdee Jameel'
    );
    // 3. Ahmed Abdullah Bin Farooqi Rayhan
    expect(nameMap.get('ahmed-abdullah-bin-farooqi-rayhan')).toBe(
      'Ahmed Abdullah Bin Farooqi Rayhan'
    );
    // 4. Sheikh Mohammed Al Hadi Elaf
    expect(nameMap.get('sheikh-mohammed-al-hadi-elaf')).toBe('Sheikh Mohammed Al Hadi Elaf');
    // 5. Md. Mutasim Billah Kouser
    expect(nameMap.get('md-mutasim-billah-kouser')).toBe('Md. Mutasim Billah Kouser');
    // 6. Mr. Abid Hasan Khondaker
    expect(nameMap.get('mr-abid-hasan-khondaker')).toBe('Mr. Abid Hasan Khondaker');
  });

  it('2. No faculty name is a strict prefix of another name in the dataset', () => {
    const names = allFaculty.map((f) => f.name.toLowerCase().trim());
    for (let i = 0; i < names.length; i++) {
      for (let j = 0; j < names.length; j++) {
        if (i !== j) {
          const isPrefix = names[j].startsWith(names[i] + ' ');
          expect(isPrefix).toBe(false);
        }
      }
    }
  });

  it('3. ID alias map resolves all 14 legacy IDs to new canonical IDs', () => {
    expect(Object.keys(rawAliases).length).toBe(14);

    expect(resolveFacultyId('abdullah-ibne-masud-ma')).toBe('abdullah-ibne-masud-mahi');
    expect(resolveFacultyId('abu-shafin-mohammad-m')).toBe('abu-shafin-mohammad-mahdee-jameel');
    expect(resolveFacultyId('ahmed-abdullah-bin-faro')).toBe('ahmed-abdullah-bin-farooqi-rayhan');
    expect(resolveFacultyId('sheikh-mohammed-al-ha')).toBe('sheikh-mohammed-al-hadi-elaf');
    expect(resolveFacultyId('md-mutasim-billah-kouse')).toBe('md-mutasim-billah-kouser');
    expect(resolveFacultyId('syed-abu-ammar-muhammad-sonnet')).toBe('syed-abu-ammar-muhammad-zarif');

    // Unknown or already canonical IDs resolve to themselves
    expect(resolveFacultyId('ishrat-jahan')).toBe('ishrat-jahan');
    expect(resolveFacultyId('non-existent-id')).toBe('non-existent-id');
  });

  it('4. getFacultyStatsById resolves legacy IDs seamlessly', () => {
    const f1 = getFacultyStatsById('abdullah-ibne-masud-ma');
    expect(f1).toBeDefined();
    expect(f1?.id).toBe('abdullah-ibne-masud-mahi');
    expect(f1?.name).toBe('Abdullah Ibne Masud Mahi');

    const f2 = getFacultyStatsById('abu-shafin-mohammad-m');
    expect(f2).toBeDefined();
    expect(f2?.id).toBe('abu-shafin-mohammad-mahdee-jameel');
  });

  it('5. migrateFacultyIdArray and migrateFacultyIdRecord work correctly', () => {
    const oldArray = ['abdullah-ibne-masud-ma', 'ishrat-jahan', 'abdullah-ibne-masud-mahi'];
    const migratedArray = migrateFacultyIdArray(oldArray);
    expect(migratedArray).toEqual(['abdullah-ibne-masud-mahi', 'ishrat-jahan']);

    const oldRecord = {
      'abdullah-ibne-masud-ma': 'prefer',
      'ishrat-jahan': 'avoid',
    };
    const migratedRecord = migrateFacultyIdRecord(oldRecord);
    expect(migratedRecord).toEqual({
      'abdullah-ibne-masud-mahi': 'prefer',
      'ishrat-jahan': 'avoid',
    });
  });

  it('6. Documentation file docs/name-fix.md exists and logs before/after', () => {
    const filePath = path.resolve(process.cwd(), 'docs/name-fix.md');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Abdullah Ibne Masud Mahi');
    expect(content).toContain('Abu Shafin Mohammad Mahdee Jameel');
    expect(content).toContain('Sheikh Mohammed Al Hadi Elaf');
  });
});

describe('Phase 1.A: Initials Generation & Search Matching Tests', () => {
  it('1. Generates expected initials variants including all words, without titles, without Md./Mohammad, and first-two', () => {
    // "Abdullah Ibne Masud Mahi" -> AIMM, AI
    const aliasesMahi = generateSearchAliases('Abdullah Ibne Masud Mahi');
    expect(aliasesMahi).toContain('AIMM');
    expect(aliasesMahi).toContain('AI');

    // "Mr. Abid Hasan Khondaker" -> MAHK (all), AHK (no title), AH (first two of non-title)
    const aliasesAbid = generateSearchAliases('Mr. Abid Hasan Khondaker');
    expect(aliasesAbid).toContain('AHK');
    expect(aliasesAbid).toContain('AH');

    // "Md. Iqbal Bahar Chowdhury" -> MIBC (all), IBC (without Md.)
    const aliasesIqbal = generateSearchAliases('Md. Iqbal Bahar Chowdhury');
    expect(aliasesIqbal).toContain('MIBC');
    expect(aliasesIqbal).toContain('IBC');

    // "Dr. Swakkhar Shatabda" -> SS (without Dr.)
    const aliasesSwakkhar = generateSearchAliases('Dr. Swakkhar Shatabda');
    expect(aliasesSwakkhar).toContain('SS');
  });

  it('2. Search by initials matches case-insensitively exact and prefix', () => {
    const all = getAllFacultyStats();

    // Query "AIMM" should match Abdullah Ibne Masud Mahi
    const matchesAIMM = filterFaculty(all, { search: 'AIMM' });
    expect(matchesAIMM.some((f) => f.name === 'Abdullah Ibne Masud Mahi')).toBe(true);

    // Query "aimm" lowercase
    const matchesLower = filterFaculty(all, { search: 'aimm' });
    expect(matchesLower.some((f) => f.name === 'Abdullah Ibne Masud Mahi')).toBe(true);

    // Query "ASMMJ" should match Abu Shafin Mohammad Mahdee Jameel
    const matchesASMMJ = filterFaculty(all, { search: 'ASMMJ' });
    expect(matchesASMMJ.some((f) => f.name === 'Abu Shafin Mohammad Mahdee Jameel')).toBe(true);

    // If query matches multiple faculty, all are returned
    const matchesSS = filterFaculty(all, { search: 'SS' });
    expect(matchesSS.length).toBeGreaterThan(1);
  });
});

describe('Phase 1.D: Badges Evaluation & Boundary Tests', () => {
  it('1. Marathon badge: gap <= 15 min vs gap == 16 min boundary', () => {
    // 3 back-to-back classes with gap 15 min -> earns Marathon
    const earnsMarathon = computeFacultyBadges({
      firstBellSections: 0,
      lateShiftSections: 0,
      labSections: 0,
      distinctCourses: 1,
      totalSections: 3,
      satTueSections: 0,
      maxMarathonChain: 3,
    });
    expect(earnsMarathon.some((b) => b.id === 'marathon')).toBe(true);

    // Chain is only 2 classes -> does not earn Marathon
    const failsMarathon = computeFacultyBadges({
      firstBellSections: 0,
      lateShiftSections: 0,
      labSections: 0,
      distinctCourses: 1,
      totalSections: 3,
      satTueSections: 0,
      maxMarathonChain: 2,
    });
    expect(failsMarathon.some((b) => b.id === 'marathon')).toBe(false);
  });

  it('2. Floor Hopper badge: >= 4 floors vs 3 floors', () => {
    const earnsFloorHopper = computeFacultyBadges({
      firstBellSections: 0,
      lateShiftSections: 0,
      labSections: 0,
      distinctCourses: 1,
      totalSections: 4,
      satTueSections: 0,
      distinctFloors: 4,
    });
    expect(earnsFloorHopper.some((b) => b.id === 'floorHopper')).toBe(true);

    const failsFloorHopper = computeFacultyBadges({
      firstBellSections: 0,
      lateShiftSections: 0,
      labSections: 0,
      distinctCourses: 1,
      totalSections: 4,
      satTueSections: 0,
      distinctFloors: 3,
    });
    expect(failsFloorHopper.some((b) => b.id === 'floorHopper')).toBe(false);
  });

  it('3. Home Room badge: 69% vs 70% boundary and min meetings check', () => {
    // 7 out of 10 meetings = 70% (>= 70% and >= 4 meetings) -> earns Home Room
    const earnsHomeRoom = computeFacultyBadges({
      firstBellSections: 0,
      lateShiftSections: 0,
      labSections: 0,
      distinctCourses: 1,
      totalSections: 5,
      satTueSections: 0,
      totalMeetings: 10,
      maxSingleRoomMeetings: 7,
    });
    expect(earnsHomeRoom.some((b) => b.id === 'homeRoom')).toBe(true);

    // 69 out of 100 meetings = 69% (< 70%) -> does not earn Home Room
    const failsHomeRoomRatio = computeFacultyBadges({
      firstBellSections: 0,
      lateShiftSections: 0,
      labSections: 0,
      distinctCourses: 1,
      totalSections: 5,
      satTueSections: 0,
      totalMeetings: 100,
      maxSingleRoomMeetings: 69,
    });
    expect(failsHomeRoomRatio.some((b) => b.id === 'homeRoom')).toBe(false);

    // 100% in 1 room but only 3 meetings total (< 4 meetings min) -> does not earn Home Room
    const failsHomeRoomMinMeetings = computeFacultyBadges({
      firstBellSections: 0,
      lateShiftSections: 0,
      labSections: 0,
      distinctCourses: 1,
      totalSections: 2,
      satTueSections: 0,
      totalMeetings: 3,
      maxSingleRoomMeetings: 3,
    });
    expect(failsHomeRoomMinMeetings.some((b) => b.id === 'homeRoom')).toBe(false);
  });

  it('4. Course Hub badge: >= 3 sections of the same course', () => {
    const earnsCourseHub = computeFacultyBadges({
      firstBellSections: 0,
      lateShiftSections: 0,
      labSections: 0,
      distinctCourses: 1,
      totalSections: 3,
      satTueSections: 0,
      maxSectionsPerCourse: 3,
    });
    expect(earnsCourseHub.some((b) => b.id === 'courseHub')).toBe(true);

    const failsCourseHub = computeFacultyBadges({
      firstBellSections: 0,
      lateShiftSections: 0,
      labSections: 0,
      distinctCourses: 2,
      totalSections: 2,
      satTueSections: 0,
      maxSectionsPerCourse: 2,
    });
    expect(failsCourseHub.some((b) => b.id === 'courseHub')).toBe(false);
  });

  it('5. Cross-Program badge: teaches in both BSCSE and BSDS', () => {
    const earnsCrossProg = computeFacultyBadges({
      firstBellSections: 0,
      lateShiftSections: 0,
      labSections: 0,
      distinctCourses: 2,
      totalSections: 2,
      satTueSections: 0,
      programs: ['BSCSE', 'BSDS'],
    });
    expect(earnsCrossProg.some((b) => b.id === 'crossProgram')).toBe(true);

    const failsCrossProg = computeFacultyBadges({
      firstBellSections: 0,
      lateShiftSections: 0,
      labSections: 0,
      distinctCourses: 2,
      totalSections: 2,
      satTueSections: 0,
      programs: ['BSCSE'],
    });
    expect(failsCrossProg.some((b) => b.id === 'crossProgram')).toBe(false);
  });

  it('6. Monday Special badge: >= 60% sections on Monday and >= 2 sections', () => {
    const earnsMonday = computeFacultyBadges({
      firstBellSections: 0,
      lateShiftSections: 0,
      labSections: 0,
      distinctCourses: 2,
      totalSections: 3,
      satTueSections: 0,
      mondaySections: 2, // 2/3 = 66.7%
    });
    expect(earnsMonday.some((b) => b.id === 'mondaySpecial')).toBe(true);

    const failsMondayRatio = computeFacultyBadges({
      firstBellSections: 0,
      lateShiftSections: 0,
      labSections: 0,
      distinctCourses: 2,
      totalSections: 3,
      satTueSections: 0,
      mondaySections: 1, // 1/3 = 33.3%
    });
    expect(failsMondayRatio.some((b) => b.id === 'mondaySpecial')).toBe(false);
  });

  it('7. parseFloorFromRoom extracts floors correctly and handles edge cases', () => {
    expect(parseFloorFromRoom('530')).toBe(5);
    expect(parseFloorFromRoom('826 (Computer Lab)')).toBe(8);
    expect(parseFloorFromRoom('307')).toBe(3);
    expect(parseFloorFromRoom('101')).toBe(1);
    expect(parseFloorFromRoom('Auditorium')).toBeNull();
    expect(parseFloorFromRoom(null)).toBeNull();
    expect(parseFloorFromRoom('')).toBeNull();
  });
});

describe('Phase 1.E: Fall 2026 by the Numbers (Campus Stats) Integrity Tests', () => {
  const stats = getCampusStats();

  it('1. Heatmap counts: total counted meetings in "all" mode equals total meetings in raw data', () => {
    const totalMeetingsInRaw = (rawSections as any[]).reduce(
      (sum, s) => sum + s.meetings.length,
      0
    );
    expect(totalMeetingsInRaw).toBe(1296);

    const heatmapAllTotal = Object.values(stats.heatmapGrid.totalsByDay.all).reduce(
      (sum, count) => sum + count,
      0
    );
    expect(heatmapAllTotal).toBe(1296);
    expect(stats.totalMeetings).toBe(1296);

    // Theory + Lab breakdown
    const theoryTotal = Object.values(stats.heatmapGrid.totalsByDay.theory).reduce(
      (sum, count) => sum + count,
      0
    );
    const labTotal = Object.values(stats.heatmapGrid.totalsByDay.lab).reduce(
      (sum, count) => sum + count,
      0
    );
    expect(theoryTotal + labTotal).toBe(1296);
    expect(theoryTotal).toBe(1090);
    expect(labTotal).toBe(206);
  });

  it('2. Histogram sums exactly to total faculty count', () => {
    const totalInHistogram = stats.facultySectionHistogram.reduce(
      (sum, bucket) => sum + bucket.count,
      0
    );
    expect(totalInHistogram).toBe(stats.totalFaculty);
    expect(stats.totalFaculty).toBe(rawFaculty.length);
  });

  it('3. Section kind shares sum exactly to total sections (791)', () => {
    const { theory, lab, singleDay } = stats.sectionsByKind;
    expect(theory + lab + singleDay).toBe(791);
    expect(stats.totalSections).toBe(791);
  });

  it('4. Busiest day is Wednesday (322 meetings) and quietest day is Monday (40 meetings)', () => {
    expect(stats.busiestDay.day).toBe('Wed');
    expect(stats.busiestDay.count).toBe(322);

    expect(stats.quietestDay.day).toBe('Mon');
    expect(stats.quietestDay.count).toBe(40);
  });

  it('5. Top 10 courses and rooms return 10 ranked items', () => {
    expect(stats.topCoursesBySections.length).toBe(10);
    expect(stats.topCoursesBySections[0].code).toBe('CSE 2213');

    expect(stats.topRoomsByMeetings.length).toBe(10);
    expect(stats.topRoomsByMeetings[0].room).toBe('309');
  });

  it('6. RoomSchedule indexing resolves room 309 correctly', () => {
    const r309 = getRoomSchedule('309');
    expect(r309).toBeDefined();
    expect(r309?.totalMeetings).toBe(26);
    expect(r309?.floor).toBe(3);

    const allRooms = getAllRooms();
    expect(allRooms.length).toBeGreaterThan(20);
    expect(allRooms[0].room).toBe('309');
  });
});

describe('Phase 2 & 3: Architectural Decoupling & Style Rules', () => {
  it('1. Faculty directory files never import builder state, solver, or routines storage', () => {
    const facultyFiles = [
      'src/app/faculty-directory/page.tsx',
      'src/app/faculty-directory/[id]/page.tsx',
      'src/app/faculty-directory/[id]/FacultyDetailView.tsx',
      'src/app/faculty-directory/[id]/FacultyDetailActions.tsx',
      'src/app/faculty-directory/compare/page.tsx',
      'src/components/faculty/BadgesLegendModal.tsx',
      'src/components/faculty/CampusStatsView.tsx',
      'src/components/faculty/RoomScheduleSheet.tsx',
      'src/hooks/usePinnedFaculty.ts',
      'src/lib/facultyStats.ts',
      'src/lib/campusStats.ts',
      'src/lib/roomSchedule.ts',
      'src/lib/facultyAliases.ts',
    ];

    for (const relPath of facultyFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(content).not.toContain('../solver');
        expect(content).not.toContain('/solver');
        expect(content).not.toContain('savedRoutinesStorage');
        expect(content).not.toContain('routineStore');
        expect(content).not.toContain('routineState');
      }
    }
  });

  it('2. No max-w-full or 100vw viewport tricks used in faculty directory components', () => {
    const targetFiles = [
      'src/app/faculty-directory/page.tsx',
      'src/app/faculty-directory/compare/page.tsx',
      'src/app/faculty-directory/[id]/FacultyDetailView.tsx',
      'src/components/faculty/CampusStatsView.tsx',
    ];

    for (const relPath of targetFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(content).not.toContain('max-w-full');
        expect(content).not.toContain('100vw');
      }
    }
  });
});
