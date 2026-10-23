import {
  BADGE_DEFINITIONS,
  BadgeDefinition,
  BadgeCategory,
  getAllBadgeDefinitions,
} from '../config/facultyBadges';
import { getAllFacultyStats, FacultyStats, FacultyBadge } from './facultyStats';

export interface BadgeHolder {
  faculty: FacultyStats;
  metricValue: number;
  metricLabel: string;
}

export interface TopHolderSummary {
  facultyName: string;
  facultyId: string;
  metricLabel: string;
  metricValue: number;
  tieCount: number;
  label: string;
}

export interface BadgeSummary {
  badge: BadgeDefinition;
  holders: BadgeHolder[];
  holdersCount: number;
  sharePercent: number;
  rarityRank: number;
  isRarest: boolean;
  topHolder: TopHolderSummary | null;
}

export interface FacultyWithMostBadges {
  faculty: FacultyStats;
  badgeCount: number;
  badges: FacultyBadge[];
}

export interface FacultyBadgesOverview {
  badges: BadgeSummary[];
  totalFacultyCount: number;
  facultyWithMostBadges: FacultyWithMostBadges[];
  badgeMap: Map<string, BadgeSummary>;
}

export type BadgeSortOption = 'rarest' | 'common' | 'az' | 'priority';

export interface HolderFilterCriteria {
  search?: string;
  program?: 'ALL' | 'BSCSE' | 'BSDS';
  sort?: 'metric' | 'az';
}

/**
 * Computes the complete badges overview from a list of faculty.
 * Deterministic and pure; memoized when run without parameters.
 */
export function computeBadgesOverview(facultyList?: FacultyStats[]): FacultyBadgesOverview {
  const list = facultyList ?? getAllFacultyStats();
  const totalFacultyCount = list.length;
  const allDefinitions = getAllBadgeDefinitions();

  const summaries: BadgeSummary[] = [];

  for (const badge of allDefinitions) {
    // Find all faculty who earned this badge
    const matchedFaculty = list.filter((f) => f.badges.some((b) => b.id === badge.id));

    // Map each holder with their metric
    const holders: BadgeHolder[] = matchedFaculty.map((f) => ({
      faculty: f,
      metricValue: badge.metricValue(f),
      metricLabel: badge.metricLabel(f),
    }));

    // Sort holders by metric high to low, tie breaking by alphabetical sortName
    holders.sort((a, b) => {
      if (b.metricValue !== a.metricValue) {
        return b.metricValue - a.metricValue;
      }
      return a.faculty.sortName.localeCompare(b.faculty.sortName);
    });

    const holdersCount = holders.length;
    const sharePercent =
      totalFacultyCount > 0 ? Number(((holdersCount / totalFacultyCount) * 100).toFixed(1)) : 0;

    // Determine top holder
    let topHolder: TopHolderSummary | null = null;
    if (holders.length > 0) {
      const topMetric = holders[0].metricValue;
      const tied = holders.filter((h) => h.metricValue === topMetric);
      const tieCount = tied.length - 1;
      const first = holders[0];
      const tieSuffix = tieCount > 0 ? ` (+${tieCount} more)` : '';
      const label = `Highest: ${first.faculty.name}${tieSuffix} (${first.metricLabel})`;

      topHolder = {
        facultyName: first.faculty.name,
        facultyId: first.faculty.id,
        metricLabel: first.metricLabel,
        metricValue: first.metricValue,
        tieCount,
        label,
      };
    }

    summaries.push({
      badge,
      holders,
      holdersCount,
      sharePercent,
      rarityRank: 0, // Assigned below
      isRarest: false,
      topHolder,
    });
  }

  // Assign rarity ranking: sorted by holdersCount ascending (smallest = rarest = rank 1)
  // Tie-break by priority
  const sortedByRarity = [...summaries].sort((a, b) => {
    if (a.holdersCount !== b.holdersCount) {
      return a.holdersCount - b.holdersCount;
    }
    return a.badge.priority - b.badge.priority;
  });

  sortedByRarity.forEach((item, index) => {
    item.rarityRank = index + 1;
    item.isRarest = index < 3; // Top 3 rarest badges
  });

  // Calculate top 5 faculty with the most badges
  const facultyWithBadges: FacultyWithMostBadges[] = list
    .map((f) => ({
      faculty: f,
      badgeCount: f.badges.length,
      badges: f.badges,
    }))
    .filter((fb) => fb.badgeCount > 0)
    .sort((a, b) => {
      if (b.badgeCount !== a.badgeCount) return b.badgeCount - a.badgeCount;
      if (b.faculty.totalSections !== a.faculty.totalSections) {
        return b.faculty.totalSections - a.faculty.totalSections;
      }
      return a.faculty.sortName.localeCompare(b.faculty.sortName);
    })
    .slice(0, 5);

  const badgeMap = new Map<string, BadgeSummary>();
  for (const s of summaries) {
    badgeMap.set(s.badge.id, s);
  }

  return {
    badges: summaries,
    totalFacultyCount,
    facultyWithMostBadges: facultyWithBadges,
    badgeMap,
  };
}

let cachedOverview: FacultyBadgesOverview | null = null;

/**
 * Returns the memoized Badges Overview computed once per application run.
 */
export function getFacultyBadgesOverview(): FacultyBadgesOverview {
  if (!cachedOverview) {
    cachedOverview = computeBadgesOverview();
  }
  return cachedOverview;
}

/**
 * Sorts badge summaries according to user selection.
 */
export function sortBadgeSummaries(
  badges: BadgeSummary[],
  sort: BadgeSortOption
): BadgeSummary[] {
  const copy = [...badges];
  switch (sort) {
    case 'rarest':
      return copy.sort((a, b) => {
        if (a.holdersCount !== b.holdersCount) return a.holdersCount - b.holdersCount;
        return a.badge.priority - b.badge.priority;
      });
    case 'common':
      return copy.sort((a, b) => {
        if (b.holdersCount !== a.holdersCount) return b.holdersCount - a.holdersCount;
        return a.badge.priority - b.badge.priority;
      });
    case 'az':
      return copy.sort((a, b) => a.badge.name.localeCompare(b.badge.name));
    case 'priority':
    default:
      return copy.sort((a, b) => a.badge.priority - b.badge.priority);
  }
}

/**
 * Filters and sorts badge holders inside the faculty list panel.
 */
export function filterAndSortHolders(
  holders: BadgeHolder[],
  criteria: HolderFilterCriteria
): BadgeHolder[] {
  const { search, program = 'ALL', sort = 'metric' } = criteria;
  const q = search?.trim().toLowerCase();

  const filtered = holders.filter((h) => {
    const f = h.faculty;

    // Program check
    if (program !== 'ALL') {
      if (!f.programs.includes(program)) return false;
    }

    // Search query check
    if (q) {
      const matchName = f.name.toLowerCase().includes(q) || f.sortName.toLowerCase().includes(q);
      const matchInitial =
        f.initials.toLowerCase().includes(q) ||
        f.searchAliases.some((alias) => alias.toLowerCase().includes(q));
      const matchCourse = f.courses.some(
        (c) => c.courseCode.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
      );
      if (!matchName && !matchInitial && !matchCourse) return false;
    }

    return true;
  });

  if (sort === 'az') {
    return filtered.sort((a, b) => a.faculty.sortName.localeCompare(b.faculty.sortName));
  }

  // Default: by metric high-to-low
  return filtered.sort((a, b) => {
    if (b.metricValue !== a.metricValue) {
      return b.metricValue - a.metricValue;
    }
    return a.faculty.sortName.localeCompare(b.faculty.sortName);
  });
}
