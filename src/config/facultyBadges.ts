/**
 * Configuration for Faculty Directory Badges.
 * All thresholds are centralized here for easy tuning.
 */

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  iconName: 'Bell' | 'Moon' | 'FlaskConical' | 'BookOpen' | 'Flame' | 'Calendar';
  // Styling tokens adhering to the warm UIU design system
  badgeStyle: string;
}

export const FACULTY_BADGE_THRESHOLDS = {
  // First Bell: sections starting at 08:30 (start <= 510 minutes)
  firstBellMinSections: 3,
  // Late Shift: sections starting at 13:51 or later (start >= 831 minutes)
  lateShiftMinSections: 3,
  // Lab Pro: teaches 3 or more lab sections
  labProMinSections: 3,
  // Multi-Course: teaches 5 or more distinct courses
  multiCourseMinCount: 5,
  // Busiest: top section count tier (6+ sections, top ~10 faculty)
  busiestMinSections: 6,
  // Weekend Starter: >= 70% of sections on Sat/Tue with at least 2 sections
  weekendStarterMinRatio: 0.7,
  weekendStarterMinSections: 2,
} as const;

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  firstBell: {
    id: 'firstBell',
    name: 'First Bell',
    description: 'Teaches 3+ early morning sections (starts at 08:30 AM)',
    iconName: 'Bell',
    badgeStyle: 'bg-amber-50 text-amber-900 border-amber-200/80',
  },
  lateShift: {
    id: 'lateShift',
    name: 'Late Shift',
    description: 'Teaches 3+ afternoon sections (starts at 01:51 PM or later)',
    iconName: 'Moon',
    badgeStyle: 'bg-indigo-50 text-indigo-900 border-indigo-200/80',
  },
  labPro: {
    id: 'labPro',
    name: 'Lab Pro',
    description: 'Teaches 3+ laboratory sections this trimester',
    iconName: 'FlaskConical',
    badgeStyle: 'bg-emerald-50 text-emerald-900 border-emerald-200/80',
  },
  multiCourse: {
    id: 'multiCourse',
    name: 'Multi-Course',
    description: 'Teaches 5+ distinct courses this trimester',
    iconName: 'BookOpen',
    badgeStyle: 'bg-purple-50 text-purple-900 border-purple-200/80',
  },
  busiest: {
    id: 'busiest',
    name: 'Busiest',
    description: 'Top teaching load with 6+ sections assigned',
    iconName: 'Flame',
    badgeStyle: 'bg-orange-50 text-orange-900 border-orange-200/80',
  },
  weekendStarter: {
    id: 'weekendStarter',
    name: 'Weekend Starter',
    description: 'Majority (≥70%) of sections scheduled on Sat & Tue',
    iconName: 'Calendar',
    badgeStyle: 'bg-sky-50 text-sky-900 border-sky-200/80',
  },
};
