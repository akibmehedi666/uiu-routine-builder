import { z } from 'zod';
import { Day, FilterTimeWindow, Meeting, ScoreWeights, Section } from '../types';
import { ManualScheduleInput } from '../lib/fixedCourses';

export type SavedRoutineColor = 'rose' | 'amber' | 'emerald' | 'sky' | 'indigo';

export const SAVED_ROUTINE_COLORS: {
  id: SavedRoutineColor;
  label: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  dotClass: string;
}[] = [
  {
    id: 'rose',
    label: 'Rose / Red',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    textClass: 'text-rose-700',
    dotClass: 'bg-rose-500',
  },
  {
    id: 'amber',
    label: 'Amber / Orange',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-800',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'emerald',
    label: 'Emerald / Green',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    textClass: 'text-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  {
    id: 'sky',
    label: 'Sky / Blue',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200',
    textClass: 'text-sky-800',
    dotClass: 'bg-sky-500',
  },
  {
    id: 'indigo',
    label: 'Indigo / Purple',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-200',
    textClass: 'text-indigo-800',
    dotClass: 'bg-indigo-500',
  },
];

export interface SavedSectionSnapshot {
  sectionId: string;
  courseCode: string;
  title: string;
  section: string;
  faculty: string[];
  meetings: Meeting[];
  credit: number;
  kind: 'theory' | 'lab' | 'single-day-theory';
  tentative?: boolean;
}

export interface SavedRoutineTotals {
  credits: number;
  daysOnCampus: number;
  score: number;
}

export interface SavedRoutineInputSnapshot {
  selectedCourses: string[];
  preferredFaculty: Record<string, string[]>;
  avoidFaculty: Record<string, string[]>;
  lockedSections: Record<string, string>;
  filterDayOff: Day[];
  filterTimeWindow?: FilterTimeWindow;
  maxGapMinutesPerDay?: number;
  weights: ScoreWeights;
  manualSchedules?: Record<string, ManualScheduleInput>;
}

export interface SavedRoutine {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  trimester: string;
  dataVersion: string;
  sections: SavedSectionSnapshot[];
  totals: SavedRoutineTotals;
  inputs: SavedRoutineInputSnapshot;
  note?: string;
  colorTag?: SavedRoutineColor;
  isFavorite?: boolean;
}

export interface SavedRoutinesStorage {
  version: 1;
  routines: SavedRoutine[];
}

// Zod Schemas for runtime import validation
const MeetingSchema = z.object({
  day: z.enum(['Sat', 'Sun', 'Mon', 'Tue', 'Wed']),
  start: z.number(),
  end: z.number(),
  room: z.string().nullable().optional(),
});

const SavedSectionSnapshotSchema = z.object({
  sectionId: z.string(),
  courseCode: z.string(),
  title: z.string(),
  section: z.string(),
  faculty: z.array(z.string()),
  meetings: z.array(MeetingSchema),
  credit: z.number(),
  kind: z.enum(['theory', 'lab', 'single-day-theory']),
  tentative: z.boolean().optional(),
});

const SavedRoutineTotalsSchema = z.object({
  credits: z.number(),
  daysOnCampus: z.number(),
  score: z.number(),
});

const SavedRoutineInputSnapshotSchema = z.object({
  selectedCourses: z.array(z.string()),
  preferredFaculty: z.record(z.string(), z.array(z.string())),
  avoidFaculty: z.record(z.string(), z.array(z.string())),
  lockedSections: z.record(z.string(), z.string()),
  filterDayOff: z.array(z.enum(['Sat', 'Sun', 'Mon', 'Tue', 'Wed'])),
  filterTimeWindow: z
    .object({
      earliestStart: z.number().optional(),
      latestEnd: z.number().optional(),
    })
    .optional(),
  maxGapMinutesPerDay: z.number().optional(),
  weights: z.object({
    facultyPreference: z.number(),
    minimizeGaps: z.number(),
    compactDays: z.number(),
    avoidEarlyLate: z.number(),
    avoidTentative: z.number(),
  }),
  manualSchedules: z.record(z.string(), z.any()).optional(),
});

export const SavedRoutineSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  createdAt: z.number(),
  updatedAt: z.number(),
  trimester: z.string(),
  dataVersion: z.string(),
  sections: z.array(SavedSectionSnapshotSchema),
  totals: SavedRoutineTotalsSchema,
  inputs: SavedRoutineInputSnapshotSchema,
  note: z.string().max(300).optional(),
  colorTag: z.enum(['rose', 'amber', 'emerald', 'sky', 'indigo']).optional(),
  isFavorite: z.boolean().optional(),
});

export const SavedRoutinesBackupFileSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().optional(),
  app: z.string().optional(),
  routines: z.array(SavedRoutineSchema),
});

export type SavedRoutinesBackupFile = z.infer<typeof SavedRoutinesBackupFileSchema>;

export interface SectionChangeDiff {
  courseCode: string;
  section: string;
  type: 'missing' | 'time_changed' | 'room_changed' | 'faculty_changed' | 'tentative_changed';
  details: string;
}

export interface SavedRoutineValidation {
  isFullyValid: boolean;
  hasChangedSections: boolean;
  diffs: SectionChangeDiff[];
  hasInternalOverlap: boolean;
  hasBlockedTimeConflict: boolean;
  tentativeCount: number;
  tbaFacultyCount: number;
}
