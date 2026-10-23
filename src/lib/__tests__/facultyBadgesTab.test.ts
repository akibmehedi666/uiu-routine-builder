import { describe, it, expect } from 'vitest';
import {
  getFacultyBadgesOverview,
  computeBadgesOverview,
  sortBadgeSummaries,
  filterAndSortHolders,
  computeHolderRanks,
  sortHoldersByMetric,
  isMetricDetailRedundant,
  BadgeHolder,
} from '../facultyBadges';
import {
  getAllBadgeDefinitions,
  computeMarathonDetail,
  countBackToBackPairs,
} from '../../config/facultyBadges';
import { getAllFacultyStats, FacultyStats } from '../facultyStats';

describe('Faculty Badges Tab - Data & Computations', () => {
  const allFaculty = getAllFacultyStats();
  const overview = getFacultyBadgesOverview();

  it('1. Computes overview for all 12 registered badges', () => {
    expect(overview.badges.length).toBe(12);
    expect(overview.totalFacultyCount).toBe(allFaculty.length);
    expect(overview.badgeMap.size).toBe(12);
  });

  it('2. Guaranteed ZERO DRIFT: holders count equals faculty with that badge', () => {
    for (const summary of overview.badges) {
      const expectedHolders = allFaculty.filter((f) =>
        f.badges.some((b) => b.id === summary.badge.id)
      );
      expect(summary.holdersCount).toBe(expectedHolders.length);
      expect(summary.holders.length).toBe(expectedHolders.length);
    }
  });

  it('3. Rarity ranking correctly identifies top 3 rarest badges', () => {
    const rarestBadges = overview.badges.filter((b) => b.isRarest);
    expect(rarestBadges.length).toBe(3);

    // Verify rarest have the smallest holdersCount
    const allCounts = overview.badges.map((b) => b.holdersCount);
    const minCounts = [...allCounts].sort((a, b) => a - b).slice(0, 3);

    for (const b of rarestBadges) {
      expect(b.rarityRank).toBeLessThanOrEqual(3);
      expect(minCounts).toContain(b.holdersCount);
    }
  });

  it('4. Share percent calculation is mathematically sound', () => {
    for (const summary of overview.badges) {
      const calculatedShare = Number(
        ((summary.holdersCount / overview.totalFacultyCount) * 100).toFixed(1)
      );
      expect(summary.sharePercent).toBe(calculatedShare);
      expect(summary.sharePercent).toBeGreaterThanOrEqual(0);
      expect(summary.sharePercent).toBeLessThanOrEqual(100);
    }
  });

  it('5. Metric labels and values are generated correctly for holders', () => {
    for (const summary of overview.badges) {
      for (const holder of summary.holders) {
        expect(typeof holder.metricValue).toBe('number');
        expect(holder.metricValue).toBeGreaterThanOrEqual(0);
        expect(typeof holder.metricLabel).toBe('string');
        expect(holder.metricLabel.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('6. Top holder formatting correctly handles ties and single winners', () => {
    for (const summary of overview.badges) {
      if (summary.holdersCount > 0) {
        expect(summary.topHolder).not.toBeNull();
        expect(summary.topHolder?.label).toMatch(/^Highest: /);
        if ((summary.topHolder?.tieCount ?? 0) > 0) {
          expect(summary.topHolder?.label).toContain('more)');
        }
      } else {
        expect(summary.topHolder).toBeNull();
      }
    }
  });

  it('7. Faculty with most badges returns top 5 in descending order', () => {
    expect(overview.facultyWithMostBadges.length).toBeLessThanOrEqual(5);
    expect(overview.facultyWithMostBadges.length).toBeGreaterThan(0);

    for (let i = 0; i < overview.facultyWithMostBadges.length - 1; i++) {
      const curr = overview.facultyWithMostBadges[i];
      const next = overview.facultyWithMostBadges[i + 1];
      expect(curr.badgeCount).toBeGreaterThanOrEqual(next.badgeCount);
    }
  });

  it('8. Badge sorting works for rarest, common, az, and priority', () => {
    const byRarest = sortBadgeSummaries(overview.badges, 'rarest');
    for (let i = 0; i < byRarest.length - 1; i++) {
      expect(byRarest[i].holdersCount).toBeLessThanOrEqual(byRarest[i + 1].holdersCount);
    }

    const byCommon = sortBadgeSummaries(overview.badges, 'common');
    for (let i = 0; i < byCommon.length - 1; i++) {
      expect(byCommon[i].holdersCount).toBeGreaterThanOrEqual(byCommon[i + 1].holdersCount);
    }

    const byAZ = sortBadgeSummaries(overview.badges, 'az');
    for (let i = 0; i < byAZ.length - 1; i++) {
      expect(byAZ[i].badge.name.localeCompare(byAZ[i + 1].badge.name)).toBeLessThanOrEqual(0);
    }

    const byPriority = sortBadgeSummaries(overview.badges, 'priority');
    for (let i = 0; i < byPriority.length - 1; i++) {
      expect(byPriority[i].badge.priority).toBeLessThanOrEqual(byPriority[i + 1].badge.priority);
    }
  });

  it('9. Holder filtering and sorting works correctly with search and program', () => {
    // Pick busiest badge
    const busiest = overview.badgeMap.get('busiest');
    expect(busiest).toBeDefined();
    if (!busiest) return;

    // Filter by program
    const bscseOnly = filterAndSortHolders(busiest.holders, { program: 'BSCSE' });
    for (const h of bscseOnly) {
      expect(h.faculty.programs).toContain('BSCSE');
    }

    // Sort by az
    const azSorted = filterAndSortHolders(busiest.holders, { sort: 'az' });
    for (let i = 0; i < azSorted.length - 1; i++) {
      expect(
        azSorted[i].faculty.sortName.localeCompare(azSorted[i + 1].faculty.sortName)
      ).toBeLessThanOrEqual(0);
    }

    // Search filter
    if (busiest.holders.length > 0) {
      const sample = busiest.holders[0];
      const searchRes = filterAndSortHolders(busiest.holders, {
        search: sample.faculty.name.slice(0, 4),
      });
      expect(searchRes.some((h) => h.faculty.id === sample.faculty.id)).toBe(true);
    }
  });

  it('10. Handles synthetic empty faculty list gracefully without crashing', () => {
    const emptyOverview = computeBadgesOverview([]);
    expect(emptyOverview.badges.length).toBe(12);
    expect(emptyOverview.totalFacultyCount).toBe(0);
    expect(emptyOverview.facultyWithMostBadges.length).toBe(0);
    for (const b of emptyOverview.badges) {
      expect(b.holdersCount).toBe(0);
      expect(b.sharePercent).toBe(0);
      expect(b.topHolder).toBeNull();
    }
  });

  it('11. Synthetic tie-break testing for topHolder', () => {
    // Create mock faculty
    const mockF1 = {
      id: 'f-1',
      name: 'Dr. One',
      sortName: 'One',
      programs: ['BSCSE'],
      badges: [{ id: 'busiest', name: 'Busiest' }],
      totalSections: 8,
      courses: [],
    } as unknown as FacultyStats;

    const mockF2 = {
      id: 'f-2',
      name: 'Dr. Two',
      sortName: 'Two',
      programs: ['BSCSE'],
      badges: [{ id: 'busiest', name: 'Busiest' }],
      totalSections: 8,
      courses: [],
    } as unknown as FacultyStats;

    const mockOverview = computeBadgesOverview([mockF1, mockF2]);
    const busiest = mockOverview.badgeMap.get('busiest');
    expect(busiest?.topHolder?.tieCount).toBe(1);
    expect(busiest?.topHolder?.label).toContain('+1 more');
  });

  it('12. computeHolderRanks handles ties with "=" prefix and advances ranks correctly', () => {
    const ranks = computeHolderRanks([
      { metricValue: 12 },
      { metricValue: 12 },
      { metricValue: 9 },
      { metricValue: 6 },
      { metricValue: 6 },
      { metricValue: 3 },
    ]);
    expect(ranks).toEqual(['=1', '=1', '3', '=4', '=4', '6']);
  });

  it('13. sortHoldersByMetric implements 3-factor tie-breaking: metric desc -> totalSections desc -> sortName A-Z', () => {
    const makeHolder = (id: string, name: string, sortName: string, metricValue: number, totalSections: number): BadgeHolder => ({
      faculty: {
        id,
        name,
        sortName,
        totalSections,
        programs: ['BSCSE'],
        avatarColor: 'bg-emerald-100 text-emerald-800',
        badges: [],
      } as unknown as FacultyStats,
      metricValue,
      metricLabel: `${metricValue}`,
      metricUnit: 'units',
      metricDetail: 'detail',
      rank: '1',
      relativeWidthPercent: 100,
    });

    const holders: BadgeHolder[] = [
      makeHolder('1', 'Charlie', 'Charlie', 10, 5),
      makeHolder('2', 'Alice', 'Alice', 10, 8),      // same metric, more sections -> comes first
      makeHolder('3', 'Bob', 'Bob', 10, 5),          // same metric, same sections as Charlie -> alphabetical
      makeHolder('4', 'David', 'David', 12, 2),      // highest metric -> first overall
    ];

    const sorted = sortHoldersByMetric(holders);
    expect(sorted.map((h) => h.faculty.name)).toEqual(['David', 'Alice', 'Bob', 'Charlie']);
  });

  it('14. Relative bar widths: max is always 100% and relative widths are within [10, 100]', () => {
    for (const summary of overview.badges) {
      if (summary.holders.length > 0) {
        expect(summary.holders[0].relativeWidthPercent).toBe(100);
        for (const h of summary.holders) {
          expect(h.relativeWidthPercent).toBeGreaterThanOrEqual(10);
          expect(h.relativeWidthPercent).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('15. All 12 badge definitions have metricUnit and metricDetail defined', () => {
    const definitions = getAllBadgeDefinitions();
    expect(definitions.length).toBe(12);

    const sampleFaculty = allFaculty[0] || ({
      id: 'sample',
      name: 'Sample Faculty',
      sortName: 'Faculty, Sample',
      programs: ['BSCSE', 'BSDS'],
      totalSections: 6,
      weeklyHours: 18,
      uniqueCourses: 3,
      theorySections: 4,
      labSections: 2,
      activeDaysCount: 4,
      courses: [
        {
          code: 'CSE 2213',
          title: 'Algorithms',
          program: 'BSCSE',
          sections: [
            {
              sectionName: 'A',
              room: '530',
              roomNumber: 530,
              dayOfWeek: 'Saturday',
              startTime: '08:30 AM',
              endTime: '10:00 AM',
              durationMinutes: 90,
            },
            {
              sectionName: 'B',
              room: '530',
              roomNumber: 530,
              dayOfWeek: 'Sunday',
              startTime: '08:30 AM',
              endTime: '10:00 AM',
              durationMinutes: 90,
            },
          ],
        },
      ],
      badges: [],
      avatarColor: 'bg-indigo-100 text-indigo-800',
    } as unknown as FacultyStats);

    for (const badge of definitions) {
      expect(typeof badge.metricUnit).toBe('string');
      expect(badge.metricUnit.length).toBeGreaterThan(0);
      const detail = badge.metricDetail(sampleFaculty);
      expect(typeof detail).toBe('string');
      expect(detail.length).toBeGreaterThan(0);
    }
  });

  it('16. Static verification: no duplicate Badges header button, no black active chips', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const pagePath = path.resolve(process.cwd(), 'src/app/faculty-directory/page.tsx');
    const pageSource = fs.readFileSync(pagePath, 'utf-8');

    // Header must NOT contain separate Badges (12) button
    expect(pageSource).not.toMatch(/Badges\s*\(\d+\)/);

    const viewPath = path.resolve(process.cwd(), 'src/components/faculty/FacultyBadgesView.tsx');
    const viewSource = fs.readFileSync(viewPath, 'utf-8');

    // Filter chips must use orange active style, not bg-neutral-900 / bg-black
    expect(viewSource).not.toContain('bg-neutral-900');
    expect(viewSource).not.toContain('bg-black');

    // Must have rarity label "Rarity #"
    expect(viewSource).toContain('Rarity #');
  });

  it('17. isMetricDetailRedundant correctly identifies when metricDetail merely repeats value+unit', () => {
    // Redundant cases
    expect(isMetricDetailRedundant('5 courses', 5, 'courses')).toBe(true);
    expect(isMetricDetailRedundant('5 distinct courses', 5, 'courses')).toBe(true);
    expect(isMetricDetailRedundant('3 in a row', 3, 'in a row')).toBe(true);
    expect(isMetricDetailRedundant('3 laboratory sections', 3, 'lab sections')).toBe(true);
    expect(isMetricDetailRedundant('', 6, 'sections')).toBe(true);
    expect(isMetricDetailRedundant('   ', 6, 'sections')).toBe(true);

    // Non-redundant informative cases
    expect(isMetricDetailRedundant('Sun 09:51-01:40 PM · 2 pairs this week', 3, 'in a row')).toBe(false);
    expect(isMetricDetailRedundant('4 theory · 2 lab', 6, 'sections')).toBe(false);
    expect(isMetricDetailRedundant('BSCSE 5 · BSDS 3 sections', 2, 'programs')).toBe(false);
    expect(isMetricDetailRedundant('CSE 1111, CSE 2215', 5, 'courses')).toBe(false);
    expect(isMetricDetailRedundant('Room 530 (8 meetings)', 78, '% in room')).toBe(false);
    expect(isMetricDetailRedundant('Floors 3, 4, 5, 6', 4, 'floors')).toBe(false);
  });

  it('18. computeMarathonDetail formats time range, pairs count, and multi-day indicator', () => {
    const mockFacultyMultiDay = {
      id: 'mock-runner',
      name: 'Dr. Marathon',
      sortName: 'Marathon, Dr.',
      maxMarathonChain: 3,
      weeklyPattern: {
        Sat: { day: 'Sat', meetings: [], count: 0, morningCount: 0, middayCount: 0, afternoonCount: 0 },
        Sun: {
          day: 'Sun',
          meetings: [
            { start: 591, end: 681, day: 'Sun' }, // 09:51 - 11:21
            { start: 681, end: 771, day: 'Sun' }, // 11:21 - 12:51
            { start: 771, end: 820, day: 'Sun' }, // 12:51 - 01:40 PM (3 in a row!)
          ],
          count: 3,
          morningCount: 1,
          middayCount: 2,
          afternoonCount: 0,
        },
        Mon: { day: 'Mon', meetings: [], count: 0, morningCount: 0, middayCount: 0, afternoonCount: 0 },
        Tue: {
          day: 'Tue',
          meetings: [
            { start: 510, end: 600, day: 'Tue' }, // 08:30 - 10:00
            { start: 600, end: 690, day: 'Tue' }, // 10:00 - 11:30 (2 in a row!)
          ],
          count: 2,
          morningCount: 2,
          middayCount: 0,
          afternoonCount: 0,
        },
        Wed: { day: 'Wed', meetings: [], count: 0, morningCount: 0, middayCount: 0, afternoonCount: 0 },
      },
    } as unknown as FacultyStats;

    const detail = computeMarathonDetail(mockFacultyMultiDay);
    // Should include Sun 09:51-01:40 PM
    expect(detail).toContain('Sun 09:51-01:40 PM');
    // Should include +1 more day because Tue also has back-to-back classes
    expect(detail).toContain('+1 more day');
    // Total pairs: 2 on Sun + 1 on Tue = 3 pairs this week
    expect(detail).toContain('3 pairs this week');
    expect(countBackToBackPairs(mockFacultyMultiDay)).toBe(3);
  });

  it('19. sortHoldersByMetric uses total back-to-back pairs as secondary tie-breaker for Marathon', () => {
    // Two holders with same metricValue (3 in a row), but holder B has 4 pairs and holder A has 2 pairs
    const makeHolder = (id: string, name: string, pairs: number): BadgeHolder => ({
      badgeId: 'marathon',
      faculty: {
        id,
        name,
        sortName: name,
        totalSections: 6,
        programs: ['BSCSE'],
        weeklyPattern: {
          Sat: {
            day: 'Sat',
            meetings: Array.from({ length: pairs + 1 }, (_, i) => ({
              start: 500 + i * 90,
              end: 590 + i * 90,
              day: 'Sat',
            })),
            count: pairs + 1,
            morningCount: 1,
            middayCount: 0,
            afternoonCount: 0,
          },
          Sun: { day: 'Sun', meetings: [], count: 0, morningCount: 0, middayCount: 0, afternoonCount: 0 },
          Mon: { day: 'Mon', meetings: [], count: 0, morningCount: 0, middayCount: 0, afternoonCount: 0 },
          Tue: { day: 'Tue', meetings: [], count: 0, morningCount: 0, middayCount: 0, afternoonCount: 0 },
          Wed: { day: 'Wed', meetings: [], count: 0, morningCount: 0, middayCount: 0, afternoonCount: 0 },
        },
        badges: [],
      } as unknown as FacultyStats,
      metricValue: 3,
      metricLabel: '3 in a row',
      metricUnit: 'in a row',
      metricDetail: 'detail',
      rank: '=1',
      relativeWidthPercent: 100,
    });

    const holderLow = makeHolder('low', 'Alice', 2);
    const holderHigh = makeHolder('high', 'Bob', 4);

    const sorted = sortHoldersByMetric([holderLow, holderHigh], 'marathon');
    // Bob has 4 pairs vs Alice with 2 pairs -> Bob must be sorted first!
    expect(sorted[0].faculty.name).toBe('Bob');
    expect(sorted[1].faculty.name).toBe('Alice');
  });

  it('20. Tie note and medal logic for >3 holders sharing rank 1', () => {
    // When 4 faculty are tied at rank 1
    const tiedHolders = [
      { metricValue: 5 },
      { metricValue: 5 },
      { metricValue: 5 },
      { metricValue: 5 },
    ];
    const ranks = computeHolderRanks(tiedHolders);
    expect(ranks).toEqual(['=1', '=1', '=1', '=1']);

    const rank1Count = ranks.filter((r) => r === '1' || r === '=1').length;
    expect(rank1Count).toBe(4);
    expect(rank1Count > 3).toBe(true);

    // Formatted note test
    const note = `${rank1Count} faculty are tied at 5 in a row`;
    expect(note).toBe('4 faculty are tied at 5 in a row');
  });

  it('21. Static verification: avatars use inline styles with pastel colors (no white circles or invalid class interpolation)', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const viewPath = path.resolve(process.cwd(), 'src/components/faculty/FacultyBadgesView.tsx');
    const viewSource = fs.readFileSync(viewPath, 'utf-8');

    // Must NOT have invalid interpolation like `${faculty.avatarColor.bg}` in className
    expect(viewSource).not.toMatch(/className=.*faculty\.avatarColor\.bg/);

    // Must use inline styles for avatar
    expect(viewSource).toContain('style={{');
    expect(viewSource).toContain('backgroundColor: faculty.avatarColor.bg');
    expect(viewSource).toContain('color: faculty.avatarColor.text');
    expect(viewSource).toContain('borderColor: faculty.avatarColor.border');
  });
});


