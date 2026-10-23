import { Day, Meeting, Section, ScheduleResult, SolveRequest } from '../types';
import { resolveSectionId } from '../lib/sectionAliases';
import {
  SavedRoutine,
  SavedRoutinesStorage,
  SavedSectionSnapshot,
  SavedRoutinesBackupFileSchema,
  SavedRoutineValidation,
  SectionChangeDiff,
  SavedRoutineColor,
} from '../types/savedRoutine';

export const SAVED_ROUTINES_STORAGE_KEY = 'uiu-rb:saved:v1';
export const SAVED_ROUTINES_MAX_LIMIT = 50;
export const CURRENT_TRIMESTER = 'Fall 2026';
export const CURRENT_DATA_VERSION = '1.0.0';

let isStorageBlockedNoticeShown = false;

/**
 * Check if localStorage is available and writable
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load saved routines from localStorage
 */
export function loadSavedRoutines(): { routines: SavedRoutine[]; isBlocked: boolean } {
  if (!isLocalStorageAvailable()) {
    return { routines: [], isBlocked: true };
  }

  try {
    const raw = window.localStorage.getItem(SAVED_ROUTINES_STORAGE_KEY);
    if (!raw) {
      return { routines: [], isBlocked: false };
    }

    const parsed = JSON.parse(raw) as SavedRoutinesStorage;
    if (parsed && parsed.version === 1 && Array.isArray(parsed.routines)) {
      return { routines: parsed.routines, isBlocked: false };
    }

    return { routines: [], isBlocked: false };
  } catch (err) {
    console.warn('Failed to parse saved routines from localStorage:', err);
    return { routines: [], isBlocked: false };
  }
}

/**
 * Persist saved routines into localStorage
 */
export function saveRoutinesToStorage(routines: SavedRoutine[]): {
  success: boolean;
  error?: string;
  isBlocked?: boolean;
} {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      isBlocked: true,
      error:
        "Saving isn't available in this browser mode (private/blocked storage). Use Export instead.",
    };
  }

  try {
    const payload: SavedRoutinesStorage = {
      version: 1,
      routines: routines.slice(0, SAVED_ROUTINES_MAX_LIMIT),
    };
    window.localStorage.setItem(SAVED_ROUTINES_STORAGE_KEY, JSON.stringify(payload));
    return { success: true };
  } catch (err: unknown) {
    const errorObj = err as { name?: string; message?: string };
    if (errorObj?.name === 'QuotaExceededError' || errorObj?.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return {
        success: false,
        error: 'Storage quota exceeded. Please export your routines and remove old ones.',
      };
    }
    return {
      success: false,
      error: 'Failed to save routines to browser storage.',
    };
  }
}

/**
 * Create a snapshot of a schedule's sections
 */
export function createSectionSnapshots(sections: Section[]): SavedSectionSnapshot[] {
  return sections.map((sec) => ({
    sectionId: sec.id,
    courseCode: sec.courseCode,
    title: sec.title,
    section: sec.section,
    faculty: [...(sec.faculty || [])],
    meetings: sec.meetings.map((m) => ({
      day: m.day,
      start: m.start,
      end: m.end,
      room: m.room ?? null,
    })),
    credit: sec.credit,
    kind: sec.kind,
    tentative: Boolean(sec.tentative),
  }));
}

/**
 * Generate a canonical signature for a routine's section IDs to detect exact duplicates
 */
export function getSectionSignature(
  sections: { sectionId?: string; id?: string }[]
): string {
  const ids = sections
    .map((s) => s.sectionId || s.id || '')
    .filter(Boolean)
    .sort();
  return ids.join('|');
}

/**
 * Find if exact same set of sections is already saved
 */
export function findDuplicateSavedRoutine(
  sections: { sectionId?: string; id?: string }[],
  savedRoutines: SavedRoutine[]
): SavedRoutine | null {
  const targetSig = getSectionSignature(sections);
  if (!targetSig) return null;

  for (const saved of savedRoutines) {
    const savedSig = getSectionSignature(saved.sections);
    if (savedSig === targetSig) {
      return saved;
    }
  }
  return null;
}

/**
 * Generate a default name for a routine
 */
export function generateDefaultRoutineName(
  schedule: ScheduleResult,
  existingCount: number
): string {
  const daysCount = schedule.stats.daysUsed.length;
  return `Routine ${existingCount + 1} - ${daysCount} days - ${CURRENT_TRIMESTER}`;
}

/**
 * Create a new SavedRoutine from active schedule & request
 */
export function buildSavedRoutineObject(params: {
  id?: string;
  name: string;
  schedule: ScheduleResult;
  request: SolveRequest;
  note?: string;
  colorTag?: SavedRoutineColor;
  isFavorite?: boolean;
}): SavedRoutine {
  const now = Date.now();
  const id = params.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sr_${now}_${Math.random().toString(36).slice(2, 9)}`);

  return {
    id,
    name: params.name.trim(),
    createdAt: now,
    updatedAt: now,
    trimester: CURRENT_TRIMESTER,
    dataVersion: CURRENT_DATA_VERSION,
    sections: createSectionSnapshots(params.schedule.sections),
    totals: {
      credits: params.schedule.stats.credits,
      daysOnCampus: params.schedule.stats.daysUsed.length,
      score: params.schedule.score,
    },
    inputs: {
      selectedCourses: [...params.request.selectedCourses],
      preferredFaculty: { ...params.request.preferredFaculty },
      avoidFaculty: { ...params.request.avoidFaculty },
      lockedSections: { ...params.request.lockedSections },
      filterDayOff: [...params.request.filterDayOff],
      filterTimeWindow: params.request.filterTimeWindow
        ? { ...params.request.filterTimeWindow }
        : undefined,
      maxGapMinutesPerDay: params.request.maxGapMinutesPerDay,
      weights: { ...params.request.weights },
    },
    note: params.note ? params.note.slice(0, 300) : undefined,
    colorTag: params.colorTag,
    isFavorite: Boolean(params.isFavorite),
  };
}

/**
 * Check if two meeting times overlap
 */
function meetingsOverlap(m1: Meeting, m2: Meeting): boolean {
  if (m1.day !== m2.day) return false;
  return m1.start < m2.end && m2.start < m1.end;
}

/**
 * Validate a saved routine against current live section catalog and filters
 */
export function validateSavedRoutine(
  routine: SavedRoutine,
  liveSections: Section[],
  currentFilters?: {
    filterDayOff?: Day[];
    filterTimeWindow?: { earliestStart?: number; latestEnd?: number };
  }
): SavedRoutineValidation {
  const diffs: SectionChangeDiff[] = [];
  const liveSectionMap = new Map<string, Section>();
  for (const s of liveSections) {
    liveSectionMap.set(s.id, s);
  }

  let tentativeCount = 0;
  let tbaFacultyCount = 0;

  // 1. Check each saved section against live catalog
  for (const savedSec of routine.sections) {
    const liveSec =
      liveSectionMap.get(savedSec.sectionId) ||
      liveSectionMap.get(resolveSectionId(savedSec.sectionId));

    if (savedSec.tentative) {
      tentativeCount++;
    }

    const hasTbaFaculty =
      !savedSec.faculty ||
      savedSec.faculty.length === 0 ||
      savedSec.faculty.some((f) => f.toUpperCase().includes('TBA'));
    if (hasTbaFaculty) {
      tbaFacultyCount++;
    }

    if (!liveSec) {
      diffs.push({
        courseCode: savedSec.courseCode,
        section: savedSec.section,
        type: 'missing',
        details: 'Section no longer offered in current trimester routine.',
      });
      continue;
    }

    // Check meetings changes
    const timeMatch =
      savedSec.meetings.length === liveSec.meetings.length &&
      savedSec.meetings.every((sm) =>
        liveSec.meetings.some(
          (lm) => lm.day === sm.day && lm.start === sm.start && lm.end === sm.end
        )
      );

    if (!timeMatch) {
      diffs.push({
        courseCode: savedSec.courseCode,
        section: savedSec.section,
        type: 'time_changed',
        details: 'Schedule meeting day or time has changed in the latest catalog.',
      });
    }

    // Check room changes
    const roomMatch = savedSec.meetings.every((sm) =>
      liveSec.meetings.some(
        (lm) => lm.day === sm.day && (lm.room ?? null) === (sm.room ?? null)
      )
    );
    if (!roomMatch && timeMatch) {
      diffs.push({
        courseCode: savedSec.courseCode,
        section: savedSec.section,
        type: 'room_changed',
        details: 'Classroom allocation changed.',
      });
    }

    // Check faculty changes
    const liveFacultyStr = [...(liveSec.faculty || [])].sort().join(',');
    const savedFacultyStr = [...(savedSec.faculty || [])].sort().join(',');
    if (liveFacultyStr !== savedFacultyStr) {
      diffs.push({
        courseCode: savedSec.courseCode,
        section: savedSec.section,
        type: 'faculty_changed',
        details: `Faculty reassigned: now ${liveSec.faculty?.join(', ') || 'TBA'}.`,
      });
    }
  }

  // 2. Check internal overlap among saved meetings
  let hasInternalOverlap = false;
  const allMeetings: { sec: SavedSectionSnapshot; m: Meeting }[] = [];
  for (const s of routine.sections) {
    for (const m of s.meetings) {
      allMeetings.push({ sec: s, m });
    }
  }

  for (let i = 0; i < allMeetings.length; i++) {
    for (let j = i + 1; j < allMeetings.length; j++) {
      if (allMeetings[i].sec.sectionId !== allMeetings[j].sec.sectionId) {
        if (meetingsOverlap(allMeetings[i].m, allMeetings[j].m)) {
          hasInternalOverlap = true;
          break;
        }
      }
    }
    if (hasInternalOverlap) break;
  }

  // 3. Check blocked-time conflict
  let hasBlockedTimeConflict = false;
  if (currentFilters) {
    const dayOffSet = new Set(currentFilters.filterDayOff || []);
    const { earliestStart, latestEnd } = currentFilters.filterTimeWindow || {};

    for (const s of routine.sections) {
      for (const m of s.meetings) {
        if (dayOffSet.has(m.day)) {
          hasBlockedTimeConflict = true;
          break;
        }
        if (earliestStart !== undefined && m.start < earliestStart) {
          hasBlockedTimeConflict = true;
          break;
        }
        if (latestEnd !== undefined && m.end > latestEnd) {
          hasBlockedTimeConflict = true;
          break;
        }
      }
      if (hasBlockedTimeConflict) break;
    }
  }

  const hasChangedSections = diffs.length > 0;
  const isFullyValid = !hasChangedSections && !hasInternalOverlap;

  return {
    isFullyValid,
    hasChangedSections,
    diffs,
    hasInternalOverlap,
    hasBlockedTimeConflict,
    tentativeCount,
    tbaFacultyCount,
  };
}

/**
 * Recreate routine updated to latest live section data (keeps old as a copy)
 */
export function updateRoutineToLatestData(
  routine: SavedRoutine,
  liveSections: Section[]
): { updatedRoutine: SavedRoutine; changedCount: number } {
  const liveMap = new Map<string, Section>();
  for (const s of liveSections) {
    liveMap.set(s.id, s);
  }

  let changedCount = 0;
  const newSections: SavedSectionSnapshot[] = [];

  for (const s of routine.sections) {
    const live = liveMap.get(s.sectionId);
    if (live) {
      changedCount++;
      newSections.push({
        sectionId: live.id,
        courseCode: live.courseCode,
        title: live.title,
        section: live.section,
        faculty: [...(live.faculty || [])],
        meetings: live.meetings.map((m) => ({
          day: m.day,
          start: m.start,
          end: m.end,
          room: m.room ?? null,
        })),
        credit: live.credit,
        kind: live.kind,
        tentative: Boolean(live.tentative),
      });
    } else {
      // Keep existing snapshot if missing
      newSections.push({ ...s });
    }
  }

  const now = Date.now();
  const updatedRoutine: SavedRoutine = {
    ...routine,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sr_${now}_${Math.random().toString(36).slice(2, 9)}`,
    name: `${routine.name} (Updated ${new Date().toLocaleDateString()})`,
    updatedAt: now,
    createdAt: now,
    sections: newSections,
  };

  return { updatedRoutine, changedCount };
}

/**
 * Compact Share Link Encoder
 * Encodes name, color, note, and section IDs into a URL parameter under ~2000 chars.
 */
export function encodeSharedRoutineUrl(routine: SavedRoutine): string {
  try {
    const compactObj = {
      n: routine.name,
      c: routine.colorTag,
      t: routine.note,
      s: routine.sections.map((sec) => sec.sectionId),
    };
    const json = JSON.stringify(compactObj);
    // Base64 URL safe
    const base64 = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return base64;
  } catch (e) {
    console.warn('Failed to encode share link:', e);
    return '';
  }
}

/**
 * Compact Share Link Decoder
 */
export function decodeSharedRoutineUrl(
  token: string,
  liveSections: Section[]
): Partial<SavedRoutine> | null {
  try {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(json) as {
      n?: string;
      c?: SavedRoutineColor;
      t?: string;
      s?: string[];
    };

    if (!parsed || !Array.isArray(parsed.s)) {
      return null;
    }

    const liveMap = new Map<string, Section>();
    for (const s of liveSections) {
      liveMap.set(s.id, s);
    }

    const matchedSections: SavedSectionSnapshot[] = [];
    for (const id of parsed.s) {
      const live = liveMap.get(id);
      if (live) {
        matchedSections.push({
          sectionId: live.id,
          courseCode: live.courseCode,
          title: live.title,
          section: live.section,
          faculty: [...(live.faculty || [])],
          meetings: live.meetings.map((m) => ({
            day: m.day,
            start: m.start,
            end: m.end,
            room: m.room ?? null,
          })),
          credit: live.credit,
          kind: live.kind,
          tentative: Boolean(live.tentative),
        });
      }
    }

    const daysUsed = Array.from(
      new Set(matchedSections.flatMap((sec) => sec.meetings.map((m) => m.day)))
    ) as Day[];

    const totalCredits = matchedSections.reduce((acc, s) => acc + s.credit, 0);

    return {
      name: parsed.n || `Shared Routine (${matchedSections.length} courses)`,
      colorTag: parsed.c,
      note: parsed.t,
      sections: matchedSections,
      totals: {
        credits: totalCredits,
        daysOnCampus: daysUsed.length,
        score: 100,
      },
    };
  } catch (e) {
    console.warn('Failed to decode shared routine:', e);
    return null;
  }
}

/**
 * Backup / Export all routines as formatted JSON string
 */
export function exportRoutinesToJson(routines: SavedRoutine[]): string {
  const payload = {
    version: 1,
    app: 'uiu-routine-builder',
    exportedAt: new Date().toISOString(),
    routines,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Import routines from JSON with Zod schema validation
 */
export function importRoutinesFromJson(jsonString: string): {
  success: boolean;
  routines?: SavedRoutine[];
  error?: string;
} {
  try {
    const raw = JSON.parse(jsonString);
    const parsed = SavedRoutinesBackupFileSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        success: false,
        error: `Invalid file structure: ${parsed.error.issues[0]?.message || 'Schema mismatch'}`,
      };
    }

    return {
      success: true,
      routines: parsed.data.routines as SavedRoutine[],
    };
  } catch (err) {
    return {
      success: false,
      error: 'File is not a valid JSON document.',
    };
  }
}

/**
 * Merge imported routines with current routines
 */
export function mergeImportedRoutines(
  current: SavedRoutine[],
  incoming: SavedRoutine[],
  mode: 'merge' | 'replace'
): {
  result: SavedRoutine[];
  addedCount: number;
  duplicateCount: number;
} {
  if (mode === 'replace') {
    return {
      result: incoming.slice(0, SAVED_ROUTINES_MAX_LIMIT),
      addedCount: Math.min(incoming.length, SAVED_ROUTINES_MAX_LIMIT),
      duplicateCount: 0,
    };
  }

  // Merge mode: skip exact duplicates
  const currentSigs = new Set(current.map((r) => getSectionSignature(r.sections)));
  const merged = [...current];
  let duplicateCount = 0;
  let addedCount = 0;

  for (const inc of incoming) {
    const sig = getSectionSignature(inc.sections);
    if (currentSigs.has(sig)) {
      duplicateCount++;
    } else {
      if (merged.length < SAVED_ROUTINES_MAX_LIMIT) {
        merged.push({
          ...inc,
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        });
        currentSigs.add(sig);
        addedCount++;
      }
    }
  }

  return {
    result: merged,
    addedCount,
    duplicateCount,
  };
}
