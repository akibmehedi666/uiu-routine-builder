/**
 * Configuration for Faculty Directory Badges.
 * All thresholds and definitions are centralized here for easy tuning.
 */

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  iconName:
    | 'Bell'
    | 'Moon'
    | 'FlaskConical'
    | 'BookOpen'
    | 'Flame'
    | 'Calendar'
    | 'Zap'
    | 'Building2'
    | 'Home'
    | 'Boxes'
    | 'GitFork'
    | 'Coffee';
  // Styling tokens adhering to the warm UIU design system
  badgeStyle: string;
  // Priority order for display (lower number = higher priority; max 3 shown on cards)
  priority: number;
}

export const FACULTY_BADGE_THRESHOLDS = {
  // Busiest: top section count tier (6+ sections, top faculty load)
  busiestMinSections: 6,
  // Marathon: longest chain of back-to-back classes on one day (gap <= 15 min between meetings)
  marathonMinChain: 3,
  marathonMaxGapMinutes: 15,
  // Cross-Program: has sections in both BSCSE and BSDS
  // Multi-Course: teaches 5 or more distinct courses
  multiCourseMinCount: 5,
  // Course Hub: teaches 3 or more sections of the same course
  courseHubMinSections: 3,
  // Lab Pro: teaches 3 or more lab sections
  labProMinSections: 3,
  // Floor Hopper: teaches on 4 or more distinct floors
  floorHopperMinFloors: 4,
  // Home Room: >= 70% of meetings in the same room and at least 4 meetings
  homeRoomMinRatio: 0.7,
  homeRoomMinMeetings: 4,
  // First Bell: sections starting at 08:30 (start <= 510 minutes)
  firstBellMinSections: 3,
  // Late Shift: sections starting at 13:51 or later (start >= 831 minutes)
  lateShiftMinSections: 3,
  // Monday Special: >= 60% of sections on Monday and at least 2 sections
  mondaySpecialMinRatio: 0.6,
  mondaySpecialMinSections: 2,
  // Weekend Starter: >= 70% of sections on Sat/Tue with at least 2 sections
  weekendStarterMinRatio: 0.7,
  weekendStarterMinSections: 2,
} as const;

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  busiest: {
    id: 'busiest',
    name: 'Busiest',
    description: 'Top teaching load with 6+ sections assigned',
    iconName: 'Flame',
    badgeStyle: 'bg-orange-50 text-orange-900 border-orange-200/80',
    priority: 1,
  },
  marathon: {
    id: 'marathon',
    name: 'Marathon',
    description: '3+ back-to-back classes in a single day (gap ≤ 15 min)',
    iconName: 'Zap',
    badgeStyle: 'bg-rose-50 text-rose-900 border-rose-200/80',
    priority: 2,
  },
  crossProgram: {
    id: 'crossProgram',
    name: 'Cross-Program',
    description: 'Teaches sections in both BSCSE and BSDS programs',
    iconName: 'GitFork',
    badgeStyle: 'bg-teal-50 text-teal-900 border-teal-200/80',
    priority: 3,
  },
  multiCourse: {
    id: 'multiCourse',
    name: 'Multi-Course',
    description: 'Teaches 5+ distinct courses this trimester',
    iconName: 'BookOpen',
    badgeStyle: 'bg-purple-50 text-purple-900 border-purple-200/80',
    priority: 4,
  },
  courseHub: {
    id: 'courseHub',
    name: 'Course Hub',
    description: 'Teaches 3+ sections of the same course',
    iconName: 'Boxes',
    badgeStyle: 'bg-blue-50 text-blue-900 border-blue-200/80',
    priority: 5,
  },
  labPro: {
    id: 'labPro',
    name: 'Lab Pro',
    description: 'Teaches 3+ laboratory sections this trimester',
    iconName: 'FlaskConical',
    badgeStyle: 'bg-emerald-50 text-emerald-900 border-emerald-200/80',
    priority: 6,
  },
  floorHopper: {
    id: 'floorHopper',
    name: 'Floor Hopper',
    description: 'Teaches across 4+ distinct campus floors',
    iconName: 'Building2',
    badgeStyle: 'bg-violet-50 text-violet-900 border-violet-200/80',
    priority: 7,
  },
  homeRoom: {
    id: 'homeRoom',
    name: 'Home Room',
    description: 'Majority (≥70%) of classes held in a single room (min 4 meetings)',
    iconName: 'Home',
    badgeStyle: 'bg-cyan-50 text-cyan-900 border-cyan-200/80',
    priority: 8,
  },
  firstBell: {
    id: 'firstBell',
    name: 'First Bell',
    description: 'Teaches 3+ early morning sections (starts at 08:30 AM)',
    iconName: 'Bell',
    badgeStyle: 'bg-amber-50 text-amber-900 border-amber-200/80',
    priority: 9,
  },
  lateShift: {
    id: 'lateShift',
    name: 'Late Shift',
    description: 'Teaches 3+ afternoon sections (starts at 01:51 PM or later)',
    iconName: 'Moon',
    badgeStyle: 'bg-indigo-50 text-indigo-900 border-indigo-200/80',
    priority: 10,
  },
  mondaySpecial: {
    id: 'mondaySpecial',
    name: 'Monday Special',
    description: 'Majority (≥60%) of sections taught on Mondays (min 2 sections)',
    iconName: 'Coffee',
    badgeStyle: 'bg-lime-50 text-lime-900 border-lime-200/80',
    priority: 11,
  },
  weekendStarter: {
    id: 'weekendStarter',
    name: 'Weekend Starter',
    description: 'Majority (≥70%) of sections scheduled on Sat & Tue',
    iconName: 'Calendar',
    badgeStyle: 'bg-sky-50 text-sky-900 border-sky-200/80',
    priority: 12,
  },
};

/**
 * Returns all badge definitions sorted by priority.
 */
export function getAllBadgeDefinitions(): BadgeDefinition[] {
  return Object.values(BADGE_DEFINITIONS).sort((a, b) => a.priority - b.priority);
}
