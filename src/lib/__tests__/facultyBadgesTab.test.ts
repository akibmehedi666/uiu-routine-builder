import { describe, it, expect } from 'vitest';
import {
  getFacultyBadgesOverview,
  computeBadgesOverview,
  sortBadgeSummaries,
  filterAndSortHolders,
  computeHolderRanks,
  sortHoldersByMetric,
  BadgeHolder,
} from '../facultyBadges';
import { getAllBadgeDefinitions } from '../../config/facultyBadges';
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
});

