export type Day = 'Sat' | 'Sun' | 'Mon' | 'Tue' | 'Wed';

export const DAYS_LIST: Day[] = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed'];

export interface Meeting {
  day: Day;
  start: number; // minutes since 00:00 (e.g. 510 = 08:30)
  end: number;   // minutes since 00:00 (e.g. 590 = 09:50)
  room: string | null;
}

export interface Section {
  id: string; // `${program}-${code}-${section}`
  sl: number;
  program: 'BSCSE' | 'BSDS';
  courseCode: string; // 'CSE 3811'
  title: string;
  section: string;
  credit: number;
  kind: 'theory' | 'lab' | 'single-day-theory';
  meetings: Meeting[];
  faculty: string[];
  facultyIds: string[];
  tentative: boolean;
}

export interface Course {
  code: string;
  title: string;
  program: 'BSCSE' | 'BSDS';
  credit: number;
  hasLab: boolean;
  labCode?: string;
  theoryCode?: string;
}

export interface FacultyCourseOffering {
  program: string;
  code: string;
  title: string;
  section: string;
  kind: string;
  days: Day[];
  time: string;
}

export interface Faculty {
  id: string;
  name: string;
  courses: FacultyCourseOffering[];
}

export interface FilterTimeWindow {
  earliestStart?: number; // e.g. 510 (08:30)
  latestEnd?: number;     // e.g. 990 (16:30)
}

export interface ScoreWeights {
  facultyPreference: number; // default 30
  minimizeGaps: number;      // default 25
  compactDays: number;       // default 20 (fewer days with classes)
  avoidEarlyLate: number;    // default 15
  avoidTentative: number;    // default 10
}

export interface SolveRequest {
  selectedCourses: string[]; // courseCodes
  preferredFaculty: Record<string, string[]>; // courseCode -> facultyId[]
  avoidFaculty: Record<string, string[]>;      // courseCode -> facultyId[]
  lockedSections: Record<string, string>;     // courseCode -> sectionId
  filterDayOff: Day[];                       // days that must have 0 classes
  filterTimeWindow?: FilterTimeWindow;
  maxGapMinutesPerDay?: number;
  weights: ScoreWeights;
  limit?: number;                            // default 50
}

export interface ScoreBreakdown {
  facultyScore: number;
  gapScore: number;
  dayCompactScore: number;
  timePreferenceScore: number;
  tentativePenalty: number;
}

export interface ScheduleStats {
  daysUsed: Day[];
  totalGapMinutes: number;
  earliestStart: number;
  latestEnd: number;
  tentativeCount: number;
  credits: number;
}

export interface ScheduleResult {
  sections: Section[];
  score: number;
  breakdown: ScoreBreakdown;
  stats: ScheduleStats;
}

export interface SolveResponse {
  schedules: ScheduleResult[];
  totalValidCombinations: number;
  truncated: boolean;
  searchTimeMs: number;
  nodesExplored: number;
  error?: string;
}
