'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import sectionsJson from '../../../data/sections.json';
import coursesJson from '../../../data/courses.json';
import facultyJson from '../../../data/faculty.json';
import {
  Course,
  Day,
  Faculty,
  ScheduleResult,
  Section,
  SolveRequest,
} from '../../types';
import { useSolver } from '../../hooks/useSolver';
import { SiteFooter } from '../../components/SiteFooter';
import { CourseSelector } from '../../components/CourseSelector';
import { Timetable } from '../../components/Timetable';
import { ScheduleComparison } from '../../components/ScheduleComparison';
import { EmptyState } from '../../components/EmptyState';
import { FacultyExplorer } from '../../components/FacultyExplorer';
import { HelpGuideModal, ShortcutsModal, FavoritesModal } from '../../components/Modals';
import { ManualScheduleModal } from '../../components/ManualScheduleModal';
import { parseFromParams, serializeToParams } from '../../utils/urlSync';
import { isFixedCourse } from '../../config/fixedCourses';
import { PAGE_MAX_W } from '../../config/layout';
import {
  isManualScheduleCourse,
  ManualScheduleInput,
  applyManualCourseOverlay,
  computeManualClashes,
  loadManualSchedulesFromStorage,
  saveManualSchedulesToStorage,
  encodeManualScheduleUrl,
  decodeManualScheduleUrl,
} from '../../lib/fixedCourses';
import { formatTime24 } from '../../utils/export';
import confetti from 'canvas-confetti';
import { Loader2, BookOpen, Sliders, Calendar, ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';
import {
  SavedRoutine,
  SavedRoutineColor,
} from '../../types/savedRoutine';
import {
  loadSavedRoutines,
  saveRoutinesToStorage,
  buildSavedRoutineObject,
  findDuplicateSavedRoutine,
  validateSavedRoutine,
  decodeSharedRoutineUrl,
  mergeImportedRoutines,
  updateRoutineToLatestData,
} from '../../utils/savedRoutinesStorage';
import { SavedRoutinesDrawer } from '../../components/SavedRoutinesDrawer';
import { SaveRoutinePopover } from '../../components/SaveRoutinePopover';
import { SavedRoutineBanner } from '../../components/SavedRoutineBanner';
import {
  lockAllSections,
  unlockAllSections,
  lockRemainingSections,
  unlockCourse,
  filterValidLocks,
  getLockStatus,
} from '../../lib/lockUtils';

const allSections = sectionsJson as unknown as Section[];
const allCourses = coursesJson as unknown as Course[];
const allFaculty = facultyJson as unknown as Faculty[];

interface SavedFavorite {
  id: string;
  name: string;
  schedule: ScheduleResult;
}

export default function BuilderPage() {
  // Manual course schedule state (e.g. FYDP)
  const [manualSchedules, setManualSchedules] = useState<Record<string, ManualScheduleInput>>({});
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [modalCourseCode, setModalCourseCode] = useState<string | null>(null);

  // Apply manual course UI overlay (keeps catalog strictly at 107 real courses)
  const { courses: effectiveCourses, sections: effectiveSections } = useMemo(
    () => applyManualCourseOverlay(allCourses, allSections, manualSchedules),
    [manualSchedules]
  );

  // Solver request state
  const [request, setRequest] = useState<SolveRequest>({
    selectedCourses: [],
    preferredFaculty: {},
    avoidFaculty: {},
    lockedSections: {},
    filterDayOff: [],
    weights: {
      facultyPreference: 30,
      minimizeGaps: 25,
      compactDays: 20,
      avoidEarlyLate: 15,
      avoidTentative: 10,
    },
    limit: 50,
  });

  // Modals state
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [favorites, setFavorites] = useState<SavedFavorite[]>([]);

  // Saved Routines State
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutine[]>([]);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [isSavePopoverOpen, setIsSavePopoverOpen] = useState(false);
  const [scheduleToSave, setScheduleToSave] = useState<ScheduleResult | null>(null);
  const [viewingSavedRoutine, setViewingSavedRoutine] = useState<SavedRoutine | null>(null);
  const [isSharedViewing, setIsSharedViewing] = useState(false);
  const [comparingSavedRoutines, setComparingSavedRoutines] = useState<SavedRoutine[] | null>(null);
  const [storageBlockedNotice, setStorageBlockedNotice] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<{
    message: string;
    showView: boolean;
    onUndo?: () => void;
  } | null>(null);

  const showToast = useCallback((message: string, showView = true, onUndo?: () => void) => {
    setSavedToast({ message, showView, onUndo });
    setTimeout(() => {
      setSavedToast(null);
    }, 4000);
  }, []);
  const savedButtonRef = useRef<HTMLButtonElement>(null);

  // Listen for nav action events from shared SiteNav
  useEffect(() => {
    const handleOpenSaved = () => setIsSavedDrawerOpen(true);
    const handleOpenShortcuts = () => setIsShortcutsOpen(true);
    const handleOpenGuide = () => setIsHelpOpen(true);

    window.addEventListener('nav:open-saved', handleOpenSaved);
    window.addEventListener('nav:open-shortcuts', handleOpenShortcuts);
    window.addEventListener('nav:open-guide', handleOpenGuide);

    return () => {
      window.removeEventListener('nav:open-saved', handleOpenSaved);
      window.removeEventListener('nav:open-shortcuts', handleOpenShortcuts);
      window.removeEventListener('nav:open-guide', handleOpenGuide);
    };
  }, []);

  // Broadcast saved routines count changes to SiteNav
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('saved-routines-updated', {
        detail: { count: savedRoutines.length },
      })
    );
  }, [savedRoutines.length]);

  // Faculty Explorer state
  const [explorerCourseCode, setExplorerCourseCode] = useState<string | null>(null);
  const [previewSection, setPreviewSection] = useState<Section | null>(null);

  // Mobile Workspace Navigation Tab (< 1024px)
  const [mobileTab, setMobileTab] = useState<'courses' | 'preferences' | 'results'>('courses');

  // Compute active filters count for Preferences mobile badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (request.filterDayOff && request.filterDayOff.length > 0) {
      count += request.filterDayOff.length;
    }
    if (request.filterTimeWindow?.earliestStart || request.filterTimeWindow?.latestEnd) {
      count += 1;
    }
    if (request.maxGapMinutesPerDay !== undefined) {
      count += 1;
    }
    if (request.lockedSections) {
      count += Object.keys(request.lockedSections).length;
    }
    if (request.preferredFaculty) {
      for (const prefs of Object.values(request.preferredFaculty)) {
        count += prefs.length;
      }
    }
    if (request.avoidFaculty) {
      for (const avoids of Object.values(request.avoidFaculty)) {
        count += avoids.length;
      }
    }
    return count;
  }, [request]);

  // Hook for solving
  const {
    solve,
    cancel,
    isSolving,
    progress,
    results,
    error,
    currentRank,
    setRank,
    currentSchedule,
  } = useSolver();

  // Load URL params & local storage on initial mount
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasInitialized.current) {
      hasInitialized.current = true;

      // 1. Read shared storage or URL query
      let storedReq: Partial<SolveRequest> = {};
      try {
        const raw =
          sessionStorage.getItem('uiu_routine_builder_state') ||
          localStorage.getItem('uiu_routine_builder_state');
        if (raw) storedReq = JSON.parse(raw);
      } catch (e) {
        console.warn('Failed to read builder state:', e);
      }

      let fromUrl: Partial<SolveRequest> = {};
      if (window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const openCourse = urlParams.get('course');
        if (openCourse) {
          setExplorerCourseCode(openCourse);
        }
        if (urlParams.get('saved') === 'true') {
          setIsSavedDrawerOpen(true);
        }

        fromUrl = parseFromParams(window.location.search);
        const combinedLocks = { ...(storedReq.lockedSections || {}), ...(fromUrl.lockedSections || {}) };
        const { validLocks, staleCodes } = filterValidLocks(combinedLocks, allSections);
        const staleCount = staleCodes.length;
        if (staleCount > 0) {
          showToast(`Cleared ${staleCount} stale locked section${staleCount > 1 ? 's' : ''}`, false);
        }
        setRequest((prev) => ({
          ...prev,
          ...storedReq,
          ...fromUrl,
          lockedSections: validLocks,
          weights: prev.weights,
        }));
      } else if (Object.keys(storedReq).length > 0) {
        const combinedLocks = storedReq.lockedSections || {};
        const { validLocks, staleCodes } = filterValidLocks(combinedLocks, allSections);
        const staleCount = staleCodes.length;
        if (staleCount > 0) {
          showToast(`Cleared ${staleCount} stale locked section${staleCount > 1 ? 's' : ''}`, false);
        }
        setRequest((prev) => ({
          ...prev,
          ...storedReq,
          lockedSections: validLocks,
          weights: prev.weights,
        }));
      }

      // 2. Read saved routines
      const { routines: loadedSaved, isBlocked } = loadSavedRoutines();
      setSavedRoutines(loadedSaved);
      if (isBlocked) {
        setStorageBlockedNotice(
          "Saving isn't available in this browser mode (private/blocked storage). Use Export instead."
        );
      }

      // 3. Check URL parameters for saved drawer or shared routine
      if (window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('seed_demo') === 'true') {
          const sample1 = allSections.find((s) => s.courseCode === 'CSE 4509');
          const sample2 = allSections.find((s) => s.courseCode === 'CSE 2215');
          const sample3 = allSections.find((s) => s.courseCode === 'CSE 1115');

          const demoList: SavedRoutine[] = [
            {
              id: 'demo-1',
              name: 'Routine 1 - 3 days - Fall 2026',
              createdAt: Date.now() - 3600000 * 24 * 3,
              updatedAt: Date.now() - 3600000 * 24 * 3,
              trimester: 'Fall 2026',
              dataVersion: '1.0.0',
              sections: sample1
                ? [
                    {
                      sectionId: sample1.id,
                      courseCode: sample1.courseCode,
                      title: sample1.title,
                      section: sample1.section,
                      faculty: sample1.faculty,
                      credit: sample1.credit,
                      kind: sample1.kind,
                      meetings: sample1.meetings,
                    },
                  ]
                : [],
              totals: { credits: 3, daysOnCampus: 2, score: 95 },
              inputs: {
                selectedCourses: ['CSE 4509'],
                preferredFaculty: {},
                avoidFaculty: {},
                lockedSections: {},
                filterDayOff: [],
                weights: {
                  facultyPreference: 30,
                  minimizeGaps: 25,
                  compactDays: 20,
                  avoidEarlyLate: 15,
                  avoidTentative: 10,
                },
              },
              note: 'Preferred morning classes with Dr. MHR',
              colorTag: 'rose',
              isFavorite: true,
            },
            {
              id: 'demo-2',
              name: 'Routine 2 - 4 days - Fall 2026',
              createdAt: Date.now() - 3600000 * 24 * 2,
              updatedAt: Date.now() - 3600000 * 24 * 2,
              trimester: 'Fall 2026',
              dataVersion: '1.0.0',
              sections: sample2
                ? [
                    {
                      sectionId: sample2.id,
                      courseCode: sample2.courseCode,
                      title: sample2.title,
                      section: sample2.section,
                      faculty: sample2.faculty,
                      credit: sample2.credit,
                      kind: sample2.kind,
                      meetings: sample2.meetings,
                    },
                  ]
                : [],
              totals: { credits: 3, daysOnCampus: 2, score: 88 },
              inputs: {
                selectedCourses: ['CSE 2215'],
                preferredFaculty: {},
                avoidFaculty: {},
                lockedSections: {},
                filterDayOff: [],
                weights: {
                  facultyPreference: 30,
                  minimizeGaps: 25,
                  compactDays: 20,
                  avoidEarlyLate: 15,
                  avoidTentative: 10,
                },
              },
              note: 'Balanced schedule',
              colorTag: 'emerald',
              isFavorite: false,
            },
            {
              id: 'demo-3',
              name: 'Outdated Draft (Fall 2025)',
              createdAt: Date.now() - 3600000 * 24 * 5,
              updatedAt: Date.now() - 3600000 * 24 * 5,
              trimester: 'Fall 2025',
              dataVersion: '0.9.0',
              sections: [
                {
                  sectionId: 'CSE 4509_OLD_DISCONTINUED',
                  courseCode: 'CSE 4509',
                  title: 'Operating Systems',
                  section: 'Z',
                  faculty: ['TBA'],
                  credit: 3,
                  kind: 'theory',
                  meetings: [
                    {
                      day: 'Mon',
                      start: 510,
                      end: 600,
                      room: 'UB 0999 (Old Room)',
                    },
                  ],
                },
              ],
              totals: { credits: 3, daysOnCampus: 1, score: 72 },
              inputs: {
                selectedCourses: ['CSE 4509'],
                preferredFaculty: {},
                avoidFaculty: {},
                lockedSections: {},
                filterDayOff: [],
                weights: {
                  facultyPreference: 30,
                  minimizeGaps: 25,
                  compactDays: 20,
                  avoidEarlyLate: 15,
                  avoidTentative: 10,
                },
              },
              note: 'Room and time changed since last trimester',
              colorTag: 'amber',
              isFavorite: false,
            },
            {
              id: 'demo-4',
              name: 'Weekend Free Dream Schedule',
              createdAt: Date.now() - 3600000 * 12,
              updatedAt: Date.now() - 3600000 * 12,
              trimester: 'Fall 2026',
              dataVersion: '1.0.0',
              sections: sample3
                ? [
                    {
                      sectionId: sample3.id,
                      courseCode: sample3.courseCode,
                      title: sample3.title,
                      section: sample3.section,
                      faculty: sample3.faculty,
                      credit: sample3.credit,
                      kind: sample3.kind,
                      meetings: sample3.meetings,
                    },
                  ]
                : [],
              totals: { credits: 3, daysOnCampus: 2, score: 94 },
              inputs: {
                selectedCourses: ['CSE 1115'],
                preferredFaculty: {},
                avoidFaculty: {},
                lockedSections: {},
                filterDayOff: [],
                weights: {
                  facultyPreference: 30,
                  minimizeGaps: 25,
                  compactDays: 20,
                  avoidEarlyLate: 15,
                  avoidTentative: 10,
                },
              },
              note: 'Light load with OOP theory',
              colorTag: 'sky',
              isFavorite: true,
            },
          ];

          saveRoutinesToStorage(demoList);
          setSavedRoutines(demoList);
          setIsSavedDrawerOpen(true);
        } else if (urlParams.get('saved') === 'true') {
          setIsSavedDrawerOpen(true);
        }
        const srToken = urlParams.get('sr') || urlParams.get('saved_routine');
        if (srToken) {
          const decoded = decodeSharedRoutineUrl(srToken, allSections);
          if (decoded && decoded.sections && decoded.sections.length > 0) {
            const sharedRoutineObj: SavedRoutine = {
              id: `shared_${Date.now()}`,
              name: decoded.name || 'Shared Routine',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              trimester: 'Fall 2026',
              dataVersion: '1.0.0',
              sections: decoded.sections,
              totals: decoded.totals || {
                credits: decoded.sections.reduce((a, s) => a + s.credit, 0),
                daysOnCampus: 3,
                score: 100,
              },
              inputs: {
                selectedCourses: decoded.sections.map((s) => s.courseCode),
                preferredFaculty: {},
                avoidFaculty: {},
                lockedSections: {},
                filterDayOff: [],
                weights: {
                  facultyPreference: 30,
                  minimizeGaps: 25,
                  compactDays: 20,
                  avoidEarlyLate: 15,
                  avoidTentative: 10,
                },
              },
              note: decoded.note,
              colorTag: decoded.colorTag,
            };
            setViewingSavedRoutine(sharedRoutineObj);
            setIsSharedViewing(true);
          }
        }
      }

      // 4. Read favorites
      try {
        const saved = localStorage.getItem('uiu_routine_favorites');
        if (saved) {
          setFavorites(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Failed to read favorites:', e);
      }

      // 3. Read manual schedules from storage & URL
      const storedManual = loadManualSchedulesFromStorage();
      let urlManual: Record<string, ManualScheduleInput> = {};
      if (window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const mxParam = urlParams.get('mx');
        if (mxParam) {
          urlManual = decodeManualScheduleUrl(mxParam);
        }
      }
      const mergedManual = { ...storedManual, ...urlManual };
      setManualSchedules(mergedManual);

      // If a selected course is a manual-schedule course without schedule, prompt modal
      const initialCourses = fromUrl.selectedCourses || storedReq.selectedCourses || [];
      for (const c of initialCourses) {
        if (!isFixedCourse(c) && isManualScheduleCourse(c) && !mergedManual[c]) {
          setModalCourseCode(c);
          setIsManualModalOpen(true);
          break;
        }
      }
    }
  }, []);

  // Sync state to URL query string and shared storage whenever request or explorer changes
  useEffect(() => {
    if (!hasInitialized.current) return;
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem('uiu_routine_builder_state', JSON.stringify(request));
      localStorage.setItem('uiu_routine_builder_state', JSON.stringify(request));
    } catch (e) {
      console.warn('Failed to save builder state:', e);
    }

    const baseParams = serializeToParams(request);
    const params = new URLSearchParams(baseParams);

    if (explorerCourseCode) {
      params.set('course', explorerCourseCode);
    }

    const mxStr = encodeManualScheduleUrl(manualSchedules);
    if (mxStr) {
      params.set('mx', mxStr);
    } else {
      params.delete('mx');
    }

    const queryString = params.toString();
    const newRelativePath = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.replaceState(null, '', newRelativePath);
  }, [request, explorerCourseCode, manualSchedules]);

  // Check if any fixed course in selectedCourses is unselected (no section chosen yet)
  const hasUnselectedFixedCourse = useMemo(() => {
    return (request.selectedCourses || []).some(
      (c) => isFixedCourse(c) && !request.lockedSections?.[c]
    );
  }, [request.selectedCourses, request.lockedSections]);

  // Exclude unselected fixed courses from solver input
  const effectiveSolveRequest = useMemo(() => {
    const unselectedFixed = new Set(
      (request.selectedCourses || []).filter(
        (c) => isFixedCourse(c) && !request.lockedSections?.[c]
      )
    );
    if (unselectedFixed.size === 0) return request;
    return {
      ...request,
      selectedCourses: (request.selectedCourses || []).filter((c) => !unselectedFixed.has(c)),
    };
  }, [request]);

  // Trigger solve on debounced request changes
  useEffect(() => {
    if (effectiveSolveRequest.selectedCourses.length === 0) {
      cancel();
      return;
    }

    const timer = setTimeout(() => {
      solve(effectiveSolveRequest, effectiveSections);
    }, 120);

    return () => clearTimeout(timer);
  }, [effectiveSolveRequest, solve, cancel, effectiveSections]);

  // Compute active fixed or manual sections for clash detection
  const activeFixedOrManualSections = useMemo(() => {
    const list: Section[] = [];
    for (const code of request.selectedCourses || []) {
      if (isFixedCourse(code) && request.lockedSections?.[code]) {
        const sec = effectiveSections.find((s) => s.id === request.lockedSections[code]);
        if (sec) list.push(sec);
      }
    }
    const manualList = effectiveSections.filter(
      (s) => s.manual && (request.selectedCourses || []).includes(s.courseCode)
    );
    return [...list, ...manualList];
  }, [effectiveSections, request.selectedCourses, request.lockedSections]);

  // Compute clash info with FYDP/manual courses to show clear message if a course cannot fit around FYDP
  const fydpClashes = useMemo(() => {
    return computeManualClashes(request.selectedCourses || [], allSections, activeFixedOrManualSections);
  }, [request.selectedCourses, activeFixedOrManualSections]);

  const effectiveErrorMessage = useMemo(() => {
    for (const [code, info] of fydpClashes.entries()) {
      if (info.allSectionsClash) {
        const firstSection = activeFixedOrManualSections[0];
        const schedDesc = firstSection
          ? `Sec ${firstSection.section} (${firstSection.meetings
              .map((m) => {
                const sH = Math.floor(m.start / 60).toString().padStart(2, '0');
                const sM = (m.start % 60).toString().padStart(2, '0');
                const eH = Math.floor(m.end / 60).toString().padStart(2, '0');
                const eM = (m.end % 60).toString().padStart(2, '0');
                return `${m.day} ${sH}:${sM}-${eH}:${eM}`;
              })
              .join(', ')})`
          : 'Sat 11:11-13:40';
        return `FYDP ${schedDesc} conflicts with all sections of ${code}. Try choosing a different FYDP section or course.`;
      }
    }
    return error;
  }, [fydpClashes, error, activeFixedOrManualSections]);

  const openManualModal = (code: string) => {
    setModalCourseCode(code);
    setIsManualModalOpen(true);
  };

  const handleSaveManualSchedule = (sched: ManualScheduleInput) => {
    setManualSchedules((prev) => {
      const next = { ...prev, [sched.courseCode]: sched };
      saveManualSchedulesToStorage(next);
      return next;
    });
    setIsManualModalOpen(false);
    setModalCourseCode(null);
  };

  const handleCancelManualSchedule = () => {
    setIsManualModalOpen(false);
    if (modalCourseCode && !manualSchedules[modalCourseCode]) {
      // Cancel on first add removes course from selection
      setRequest((prev) => ({
        ...prev,
        selectedCourses: (prev.selectedCourses || []).filter((c) => c !== modalCourseCode),
      }));
    }
    setModalCourseCode(null);
  };

  const handleRemoveBlockedSlot = (courseCode: string) => {
    setManualSchedules((prev) => {
      const next = { ...prev };
      delete next[courseCode];
      saveManualSchedulesToStorage(next);
      return next;
    });
  };

  // Helper to uniquely identify a schedule by its section IDs
  const getScheduleId = (schedule: ScheduleResult) =>
    schedule.sections.map((s) => s.id).sort().join('_');

  // Confetti on 100/100 score
  const hasCelebrated = useRef<string | null>(null);
  useEffect(() => {
    if (currentSchedule && currentSchedule.score === 100) {
      const schedId = getScheduleId(currentSchedule);
      if (hasCelebrated.current !== schedId) {
        hasCelebrated.current = schedId;
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F26B21', '#FF8A4C', '#F59E0B', '#FFFFFF'],
        });
      }
    }
  }, [currentSchedule]);

  // Sync across tabs using the "storage" event
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'uiu-rb:saved:v1') {
        const { routines } = loadSavedRoutines();
        setSavedRoutines(routines);
      }
    };
    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, []);

  // Compute active displayed schedule (falls back to saved routine if in viewing mode)
  const activeDisplaySchedule: ScheduleResult | null = useMemo(() => {
    if (viewingSavedRoutine) {
      return {
        sections: viewingSavedRoutine.sections as unknown as Section[],
        score: viewingSavedRoutine.totals.score,
        breakdown: {
          facultyScore: 0,
          gapScore: 0,
          dayCompactScore: 0,
          timePreferenceScore: 0,
          tentativePenalty: 0,
        },
        stats: {
          daysUsed: Array.from(
            new Set(viewingSavedRoutine.sections.flatMap((s) => s.meetings.map((m) => m.day)))
          ) as Day[],
          totalGapMinutes: 0,
          earliestStart: 510,
          latestEnd: 990,
          tentativeCount: viewingSavedRoutine.sections.filter((s) => s.tentative).length,
          credits: viewingSavedRoutine.totals.credits,
        },
      };
    }
    return currentSchedule;
  }, [viewingSavedRoutine, currentSchedule]);

  // Check if active schedule is currently saved
  const existingSavedForActive = useMemo(() => {
    if (!activeDisplaySchedule) return null;
    return findDuplicateSavedRoutine(activeDisplaySchedule.sections, savedRoutines);
  }, [activeDisplaySchedule, savedRoutines]);

  // Validation of viewing saved routine against live catalog
  const viewingSavedValidation = useMemo(() => {
    if (!viewingSavedRoutine) return undefined;
    return validateSavedRoutine(viewingSavedRoutine, effectiveSections, {
      filterDayOff: request.filterDayOff,
      filterTimeWindow: request.filterTimeWindow,
    });
  }, [viewingSavedRoutine, effectiveSections, request.filterDayOff, request.filterTimeWindow]);

  // Comparison schedules list (switches if comparing saved routines)
  const activeComparisonSchedules = useMemo(() => {
    if (comparingSavedRoutines && comparingSavedRoutines.length > 0) {
      return comparingSavedRoutines.map((r) => ({
        sections: r.sections as unknown as Section[],
        score: r.totals.score,
        breakdown: {
          facultyScore: 0,
          gapScore: 0,
          dayCompactScore: 0,
          timePreferenceScore: 0,
          tentativePenalty: 0,
        },
        stats: {
          daysUsed: Array.from(
            new Set(r.sections.flatMap((s) => s.meetings.map((m) => m.day)))
          ) as Day[],
          totalGapMinutes: 0,
          earliestStart: 510,
          latestEnd: 990,
          tentativeCount: r.sections.filter((s) => s.tentative).length,
          credits: r.totals.credits,
        },
      }));
    }
    return results ? results.schedules : [];
  }, [comparingSavedRoutines, results]);

  const handleOpenSavePopover = (sched?: ScheduleResult) => {
    setScheduleToSave(sched || activeDisplaySchedule);
    setIsSavePopoverOpen(true);
  };

  const handleSaveRoutine = (
    data: {
      name: string;
      note?: string;
      colorTag?: SavedRoutineColor;
      isFavorite?: boolean;
    },
    existingIdToUpdate?: string
  ) => {
    if (existingIdToUpdate) {
      const updated = savedRoutines.map((r) =>
        r.id === existingIdToUpdate
          ? {
              ...r,
              name: data.name,
              note: data.note,
              colorTag: data.colorTag,
              isFavorite: data.isFavorite,
              updatedAt: Date.now(),
            }
          : r
      );
      setSavedRoutines(updated);
      saveRoutinesToStorage(updated);
      if (viewingSavedRoutine && viewingSavedRoutine.id === existingIdToUpdate) {
        setViewingSavedRoutine({
          ...viewingSavedRoutine,
          name: data.name,
          note: data.note,
          colorTag: data.colorTag,
          isFavorite: data.isFavorite,
        });
      }
      showToast('Routine updated', true);
      return;
    }

    const targetSched = scheduleToSave || activeDisplaySchedule;
    if (!targetSched) return;

    const newRoutine = buildSavedRoutineObject({
      name: data.name,
      schedule: targetSched,
      request,
      note: data.note,
      colorTag: data.colorTag,
      isFavorite: data.isFavorite,
    });

    const updated = [newRoutine, ...savedRoutines];
    setSavedRoutines(updated);
    saveRoutinesToStorage(updated);
    showToast('Saved to My Routines • View', true);
  };

  const handleDeleteRoutine = (id: string) => {
    const updated = savedRoutines.filter((r) => r.id !== id);
    setSavedRoutines(updated);
    saveRoutinesToStorage(updated);
    if (viewingSavedRoutine && viewingSavedRoutine.id === id) {
      setViewingSavedRoutine(null);
    }
  };

  const handleDeleteAll = () => {
    setSavedRoutines([]);
    saveRoutinesToStorage([]);
    setViewingSavedRoutine(null);
    showToast('All saved routines deleted', false);
  };

  const handleUpdateRoutine = (
    id: string,
    updates: Partial<Pick<SavedRoutine, 'name' | 'note' | 'colorTag' | 'isFavorite'>>
  ) => {
    const updated = savedRoutines.map((r) =>
      r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r
    );
    setSavedRoutines(updated);
    saveRoutinesToStorage(updated);
    if (viewingSavedRoutine && viewingSavedRoutine.id === id) {
      setViewingSavedRoutine({ ...viewingSavedRoutine, ...updates });
    }
  };

  const handleDuplicateRoutine = (id: string) => {
    const target = savedRoutines.find((r) => r.id === id);
    if (!target) return;
    const now = Date.now();
    const copy: SavedRoutine = {
      ...target,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sr_${now}_${Math.random().toString(36).slice(2, 9)}`,
      name: `${target.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [copy, ...savedRoutines];
    setSavedRoutines(updated);
    saveRoutinesToStorage(updated);
    showToast(`Created copy of ${target.name}`, true);
  };

  const handleImportRoutines = (incoming: SavedRoutine[], mode: 'merge' | 'replace') => {
    const { result, addedCount } = mergeImportedRoutines(savedRoutines, incoming, mode);
    setSavedRoutines(result);
    saveRoutinesToStorage(result);
    showToast(`Imported ${addedCount} routine(s)`, true);
  };

  const handleLoadSettings = (inputs: SavedRoutine['inputs']) => {
    setRequest({
      selectedCourses: [...inputs.selectedCourses],
      preferredFaculty: { ...inputs.preferredFaculty },
      avoidFaculty: { ...inputs.avoidFaculty },
      lockedSections: { ...inputs.lockedSections },
      filterDayOff: [...inputs.filterDayOff],
      filterTimeWindow: inputs.filterTimeWindow ? { ...inputs.filterTimeWindow } : undefined,
      maxGapMinutesPerDay: inputs.maxGapMinutesPerDay,
      weights: { ...inputs.weights },
      limit: 50,
    });
    setViewingSavedRoutine(null);
    showToast('Settings restored to solver', false);
  };

  // Course addition / removal helpers (synced with explorer)
  const handleAddCourse = useCallback((courseCode: string) => {
    setRequest((prev) => {
      if ((prev.selectedCourses || []).includes(courseCode)) return prev;
      return {
        ...prev,
        selectedCourses: [...(prev.selectedCourses || []), courseCode],
      };
    });
  }, []);

  const handleRemoveCourse = useCallback((courseCode: string) => {
    setRequest((prev) => {
      const newCourses = (prev.selectedCourses || []).filter((c) => c !== courseCode);
      const newPref = { ...prev.preferredFaculty };
      delete newPref[courseCode];
      const newAvoid = { ...prev.avoidFaculty };
      delete newAvoid[courseCode];
      const newLock = { ...prev.lockedSections };
      delete newLock[courseCode];

      return {
        ...prev,
        selectedCourses: newCourses,
        preferredFaculty: newPref,
        avoidFaculty: newAvoid,
        lockedSections: newLock,
      };
    });
  }, []);

  // Faculty preference toggles (synced with explorer and sidebar)
  const toggleFacultyPref = useCallback((courseCode: string, facultyId: string) => {
    setRequest((prev) => {
      const current = prev.preferredFaculty?.[courseCode] || [];
      const isSelected = current.includes(facultyId);
      const updated = isSelected
        ? current.filter((id) => id !== facultyId)
        : [...current, facultyId];

      const avoidCurrent = prev.avoidFaculty?.[courseCode] || [];
      const updatedAvoid = avoidCurrent.filter((id) => id !== facultyId);

      return {
        ...prev,
        preferredFaculty: {
          ...prev.preferredFaculty,
          [courseCode]: updated,
        },
        avoidFaculty: {
          ...prev.avoidFaculty,
          [courseCode]: updatedAvoid,
        },
      };
    });
  }, []);

  const toggleFacultyAvoid = useCallback((courseCode: string, facultyId: string) => {
    setRequest((prev) => {
      const current = prev.avoidFaculty?.[courseCode] || [];
      const isSelected = current.includes(facultyId);
      const updatedAvoid = isSelected
        ? current.filter((id) => id !== facultyId)
        : [...current, facultyId];

      const prefCurrent = prev.preferredFaculty?.[courseCode] || [];
      const updatedPref = prefCurrent.filter((id) => id !== facultyId);

      return {
        ...prev,
        preferredFaculty: {
          ...prev.preferredFaculty,
          [courseCode]: updatedPref,
        },
        avoidFaculty: {
          ...prev.avoidFaculty,
          [courseCode]: updatedAvoid,
        },
      };
    });
  }, []);

  // Lock & Unlock handlers
  const handleLockAllSections = useCallback((schedule: ScheduleResult) => {
    const prevLocks = { ...(request.lockedSections || {}) };
    const { newLocks, lockedCount } = lockAllSections(schedule.sections, request.lockedSections);
    setRequest((prev) => ({
      ...prev,
      lockedSections: newLocks,
    }));
    showToast(`${lockedCount} sections locked`, false, () => {
      setRequest((prev) => ({
        ...prev,
        lockedSections: prevLocks,
      }));
    });
  }, [request.lockedSections, showToast]);

  const handleUnlockAllSections = useCallback(() => {
    const prevLocks = { ...(request.lockedSections || {}) };
    const { newLocks, unlockedCount } = unlockAllSections(request.lockedSections);
    setRequest((prev) => ({
      ...prev,
      lockedSections: newLocks,
    }));
    showToast(`${unlockedCount} sections unlocked`, false, () => {
      setRequest((prev) => ({
        ...prev,
        lockedSections: prevLocks,
      }));
    });
  }, [request.lockedSections, showToast]);

  const handleLockRemainingSections = useCallback((schedule: ScheduleResult) => {
    const prevLocks = { ...(request.lockedSections || {}) };
    const { newLocks, newlyLockedCount } = lockRemainingSections(schedule.sections, request.lockedSections);
    setRequest((prev) => ({
      ...prev,
      lockedSections: newLocks,
    }));
    showToast(`${newlyLockedCount} sections locked`, false, () => {
      setRequest((prev) => ({
        ...prev,
        lockedSections: prevLocks,
      }));
    });
  }, [request.lockedSections, showToast]);

  const handleUnlockCourse = useCallback((courseCode: string) => {
    const prevLocks = { ...(request.lockedSections || {}) };
    const newLocks = unlockCourse(courseCode, request.lockedSections);
    setRequest((prev) => ({
      ...prev,
      lockedSections: newLocks,
    }));
    showToast(`${courseCode} unlocked`, false, () => {
      setRequest((prev) => ({
        ...prev,
        lockedSections: prevLocks,
      }));
    });
  }, [request.lockedSections, showToast]);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is inside an input/select/textarea
      if (
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(
          (e.target as HTMLElement)?.tagName || ''
        )
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setRank(Math.max(0, currentRank - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (results && results.schedules.length > 0) {
          setRank(Math.min(results.schedules.length - 1, currentRank + 1));
        }
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[type="text"]'
        ) as HTMLInputElement | null;
        searchInput?.focus();
      } else if (e.key === 'Enter') {
        // Open explorer for first selected course if none open
        if (!explorerCourseCode && request.selectedCourses.length > 0) {
          e.preventDefault();
          setExplorerCourseCode(request.selectedCourses[0]);
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setIsSavedDrawerOpen((prev) => !prev);
        }
      } else if (e.key === 'u' || e.key === 'U') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          const targetSchedule = activeDisplaySchedule || currentSchedule;
          const status = getLockStatus(targetSchedule?.sections || [], request.lockedSections);
          if (status.lockedCount > 0) {
            handleUnlockAllSections();
          } else if (targetSchedule) {
            handleLockAllSections(targetSchedule);
          }
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (currentSchedule) {
          toggleFavorite(currentSchedule);
        }
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        window.print();
      } else if (e.key === 'Escape') {
        setExplorerCourseCode(null);
        setIsHelpOpen(false);
        setIsShortcutsOpen(false);
        setIsFavoritesOpen(false);
        setIsSavedDrawerOpen(false);
        setIsSavePopoverOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentRank,
    results,
    currentSchedule,
    activeDisplaySchedule,
    setRank,
    explorerCourseCode,
    request.selectedCourses,
    request.lockedSections,
    handleUnlockAllSections,
    handleLockAllSections,
  ]);

  // Reset filters
  const handleResetFilters = () => {
    setRequest((prev) => ({
      ...prev,
      filterDayOff: [],
      filterTimeWindow: undefined,
      maxGapMinutesPerDay: undefined,
      lockedSections: {},
    }));
  };

  const isCurrentFavorite = Boolean(
    currentSchedule && favorites.some((f) => f.id === getScheduleId(currentSchedule))
  );

  const toggleFavorite = (schedule: ScheduleResult) => {
    const schedId = getScheduleId(schedule);
    const existingIdx = favorites.findIndex((f) => f.id === schedId);
    let updated: SavedFavorite[];

    if (existingIdx >= 0) {
      updated = favorites.filter((f) => f.id !== schedId);
    } else {
      const favName = `Variation #${favorites.length + 1} (${schedule.sections
        .map((s) => s.courseCode)
        .slice(0, 3)
        .join(', ')}...)`;
      const newFav: SavedFavorite = {
        id: schedId,
        name: favName,
        schedule,
      };
      updated = [...favorites, newFav];
    }

    setFavorites(updated);
    try {
      localStorage.setItem('uiu_routine_favorites', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save favorite:', e);
    }
  };

  const handleRemoveFavorite = (id: string) => {
    const updated = favorites.filter((f) => f.id !== id);
    setFavorites(updated);
    try {
      localStorage.setItem('uiu_routine_favorites', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to remove favorite:', e);
    }
  };

  const handleSelectFavorite = (schedule: ScheduleResult) => {
    const courses = schedule.sections.map((s) => s.courseCode);
    const locks: Record<string, string> = {};
    for (const s of schedule.sections) {
      locks[s.courseCode] = s.id;
    }

    setRequest((prev) => ({
      ...prev,
      selectedCourses: courses,
      lockedSections: locks,
    }));
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-page text-text-primary">
      {/* Storage Blocked Banner (if private browser mode) */}
      {storageBlockedNotice && (
        <div className="bg-amber-50 border-b border-amber-300 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
          <span>{storageBlockedNotice}</span>
          <button
            onClick={() => setStorageBlockedNotice(null)}
            className="text-amber-700 hover:text-amber-950 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Main Workspace Layout */}
      <main className={`flex-1 ${PAGE_MAX_W} w-full mx-auto px-4 sm:px-6 py-4 pb-[calc(56px+env(safe-area-inset-bottom,0px)+16px)] lg:pb-4 grid grid-cols-1 lg:grid-cols-[minmax(340px,400px)_1fr] gap-5 items-start`}>
        <h1 className="sr-only">UIU Routine Builder</h1>
        {/* Left Sidebar: Course & Faculty Selector */}
        <div className={mobileTab === 'results' ? 'hidden lg:block' : 'block'}>
          <CourseSelector
            courses={effectiveCourses}
            sections={effectiveSections}
            faculty={allFaculty}
            request={request}
            onRequestChange={setRequest}
            onOpenExplorer={(code) => setExplorerCourseCode(code)}
            manualSchedules={manualSchedules}
            onOpenManualScheduleModal={openManualModal}
            mobileTab={mobileTab === 'preferences' ? 'preferences' : 'courses'}
            onRemoveBlockedSlot={handleRemoveBlockedSlot}
          />
        </div>

        {/* Right Content Area */}
        <div className={`flex-1 flex flex-col min-w-0 space-y-6 ${mobileTab !== 'results' ? 'hidden lg:flex' : 'flex'}`}>
          {/* If viewing a saved/shared routine, show the banner */}
          {viewingSavedRoutine && (
            <SavedRoutineBanner
              routine={viewingSavedRoutine}
              isSharedLink={isSharedViewing}
              validation={viewingSavedValidation}
              onExit={() => {
                setViewingSavedRoutine(null);
                setIsSharedViewing(false);
              }}
              onSaveShared={() => {
                const updated = [viewingSavedRoutine, ...savedRoutines];
                setSavedRoutines(updated);
                saveRoutinesToStorage(updated);
                setIsSharedViewing(false);
                showToast('Saved to My Routines • View', true);
              }}
              onUpdateToLatestData={() => {
                const { updatedRoutine } = updateRoutineToLatestData(
                  viewingSavedRoutine,
                  effectiveSections
                );
                const updated = [updatedRoutine, ...savedRoutines];
                setSavedRoutines(updated);
                saveRoutinesToStorage(updated);
                setViewingSavedRoutine(updatedRoutine);
                showToast('Saved updated copy', true);
              }}
              onLoadSettings={() => handleLoadSettings(viewingSavedRoutine.inputs)}
            />
          )}

          {/* If comparing saved routines */}
          {comparingSavedRoutines && comparingSavedRoutines.length > 0 && (
            <div className="bg-orange-50/90 border border-orange-200 rounded-card p-3 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-orange-950">
                  Comparing {comparingSavedRoutines.length} Saved Routines
                </span>
                <span className="text-[11px] text-orange-800 truncate">
                  ({comparingSavedRoutines.map((r) => r.name).join(' vs ')})
                </span>
              </div>
              <button
                onClick={() => setComparingSavedRoutines(null)}
                className="px-2.5 py-1 rounded-btn bg-surface hover:bg-orange-100 text-orange-800 text-xs font-semibold border border-orange-300 transition-colors"
              >
                Exit Comparison
              </button>
            </div>
          )}

          {/* Soft Banner: FYDP section not selected yet */}
          {hasUnselectedFixedCourse && (
            <div
              role="status"
              data-testid="fydp-banner-notice"
              className="bg-amber-50/90 border border-amber-300 rounded-card p-3 flex items-center gap-2.5 text-amber-950 text-xs shadow-2xs animate-in fade-in"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="font-semibold">
                FYDP section not selected yet. Routines are shown without it.
              </span>
            </div>
          )}

          {/* Welcome / Solving / Conflict / Timetable View */}
          {viewingSavedRoutine ? (
            /* Always display saved timetable when viewing saved routine */
            <>
              {activeDisplaySchedule && (
                <Timetable
                  schedule={activeDisplaySchedule}
                  currentRank={0}
                  totalSchedules={1}
                  onSetRank={() => {}}
                  onLockAllSections={handleLockAllSections}
                  lockedSections={request.lockedSections}
                  onUnlockAllSections={handleUnlockAllSections}
                  onLockRemainingSections={handleLockRemainingSections}
                  onUnlockCourse={handleUnlockCourse}
                  isFavorite={Boolean(viewingSavedRoutine.isFavorite)}
                  onToggleFavorite={() =>
                    handleUpdateRoutine(viewingSavedRoutine.id, {
                      isFavorite: !viewingSavedRoutine.isFavorite,
                    })
                  }
                  isSaved={true}
                  onOpenSavePopover={() => handleOpenSavePopover(activeDisplaySchedule)}
                  savePopoverContent={
                    isSavePopoverOpen && activeDisplaySchedule ? (
                      <SaveRoutinePopover
                        isOpen={isSavePopoverOpen}
                        onClose={() => setIsSavePopoverOpen(false)}
                        schedule={activeDisplaySchedule}
                        request={request}
                        savedRoutines={savedRoutines}
                        existingSavedRoutine={existingSavedForActive}
                        onSave={handleSaveRoutine}
                        onRemove={handleDeleteRoutine}
                        onOpenSavedDrawer={() => setIsSavedDrawerOpen(true)}
                      />
                    ) : null
                  }
                  isTruncated={false}
                  previewSection={previewSection}
                />
              )}
            </>
          ) : comparingSavedRoutines && comparingSavedRoutines.length > 0 ? (
            /* Comparing saved routines view */
            <>
              {activeDisplaySchedule && (
                <Timetable
                  schedule={activeDisplaySchedule}
                  currentRank={currentRank}
                  totalSchedules={activeComparisonSchedules.length}
                  onSetRank={setRank}
                  onLockAllSections={handleLockAllSections}
                  lockedSections={request.lockedSections}
                  onUnlockAllSections={handleUnlockAllSections}
                  onLockRemainingSections={handleLockRemainingSections}
                  onUnlockCourse={handleUnlockCourse}
                  isFavorite={isCurrentFavorite}
                  onToggleFavorite={toggleFavorite}
                  isSaved={Boolean(existingSavedForActive)}
                  onOpenSavePopover={() => handleOpenSavePopover()}
                  savePopoverContent={
                    isSavePopoverOpen && activeDisplaySchedule ? (
                      <SaveRoutinePopover
                        isOpen={isSavePopoverOpen}
                        onClose={() => setIsSavePopoverOpen(false)}
                        schedule={activeDisplaySchedule}
                        request={request}
                        savedRoutines={savedRoutines}
                        existingSavedRoutine={existingSavedForActive}
                        onSave={handleSaveRoutine}
                        onRemove={handleDeleteRoutine}
                        onOpenSavedDrawer={() => setIsSavedDrawerOpen(true)}
                      />
                    ) : null
                  }
                  previewSection={previewSection}
                />
              )}
              <ScheduleComparison
                schedules={activeComparisonSchedules}
                activeRank={currentRank}
                onSelectRank={setRank}
                onSaveSchedule={(sched) => handleOpenSavePopover(sched)}
                titleText={`Saved Routines Comparison (${activeComparisonSchedules.length})`}
                isSavedComparison={true}
              />
            </>
          ) : request.selectedCourses.length === 0 || effectiveSolveRequest.selectedCourses.length === 0 ? (
            <EmptyState
              type="welcome"
              request={request}
              onResetFilters={handleResetFilters}
            />
          ) : isSolving ? (
            /* Live Progress / Solving State */
            <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center bg-surface rounded-card border border-app-border shadow-warm">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-text-primary">
                Exploring Conflict-Free Combinations...
              </h3>
              <p className="text-xs text-text-muted mt-1 max-w-xs">
                Bitmask solver analyzing sections on a background worker thread.
              </p>
              {progress.checkedCount > 0 && (
                <div className="mt-4 px-3 py-1.5 rounded-btn bg-subtle border border-app-border text-xs font-mono text-orange-600 font-semibold">
                  {progress.checkedCount.toLocaleString()} nodes checked •{' '}
                  {progress.validCount.toLocaleString()} valid combinations
                </div>
              )}
            </div>
          ) : !results || results.schedules.length === 0 ? (
            /* Conflict / 0 Combinations Found */
            <EmptyState
              type="conflict"
              request={request}
              errorMessage={effectiveErrorMessage}
              onResetFilters={handleResetFilters}
              onUnlockAllSections={handleUnlockAllSections}
              onUnlockCourse={handleUnlockCourse}
            />
          ) : (
            /* Timetable View & Multi-Schedule Comparison */
            <>
              {currentSchedule && (
                <Timetable
                  schedule={currentSchedule}
                  currentRank={currentRank}
                  totalSchedules={results.schedules.length}
                  onSetRank={setRank}
                  onLockAllSections={handleLockAllSections}
                  lockedSections={request.lockedSections}
                  onUnlockAllSections={handleUnlockAllSections}
                  onLockRemainingSections={handleLockRemainingSections}
                  onUnlockCourse={handleUnlockCourse}
                  isFavorite={isCurrentFavorite}
                  onToggleFavorite={toggleFavorite}
                  isSaved={Boolean(existingSavedForActive)}
                  onOpenSavePopover={() => handleOpenSavePopover()}
                  savePopoverContent={
                    isSavePopoverOpen && activeDisplaySchedule ? (
                      <SaveRoutinePopover
                        isOpen={isSavePopoverOpen}
                        onClose={() => setIsSavePopoverOpen(false)}
                        schedule={activeDisplaySchedule}
                        request={request}
                        savedRoutines={savedRoutines}
                        existingSavedRoutine={existingSavedForActive}
                        onSave={handleSaveRoutine}
                        onRemove={handleDeleteRoutine}
                        onOpenSavedDrawer={() => setIsSavedDrawerOpen(true)}
                      />
                    ) : null
                  }
                  isTruncated={results.truncated}
                  previewSection={previewSection}
                />
              )}

              {/* Multi-Schedule Comparison & Diff */}
              <ScheduleComparison
                schedules={results.schedules}
                activeRank={currentRank}
                onSelectRank={setRank}
                onSaveSchedule={(sched) => handleOpenSavePopover(sched)}
              />
            </>
          )}
        </div>
      </main>

      {/* Sticky Bottom Tab Bar (Phones & Small Tablets < 1024px) */}
      <nav
        aria-label="Mobile workspace navigation"
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white border-t border-app-border shadow-warm"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="h-14 grid grid-cols-3 max-w-md mx-auto">
          {/* Tab 1: Courses */}
          <button
            type="button"
            onClick={() => setMobileTab('courses')}
            className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
              mobileTab === 'courses'
                ? 'text-orange-500 font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <div className="relative">
              <BookOpen className="w-5 h-5" />
              {request.selectedCourses.length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                  {request.selectedCourses.length}
                </span>
              )}
            </div>
            <span className="text-[11px]">Courses</span>
            {mobileTab === 'courses' && (
              <span className="absolute bottom-0 inset-x-6 h-0.5 bg-orange-500 rounded-full" />
            )}
          </button>

          {/* Tab 2: Preferences */}
          <button
            type="button"
            onClick={() => setMobileTab('preferences')}
            className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
              mobileTab === 'preferences'
                ? 'text-orange-500 font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <div className="relative">
              <Sliders className="w-5 h-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            <span className="text-[11px]">Preferences</span>
            {mobileTab === 'preferences' && (
              <span className="absolute bottom-0 inset-x-6 h-0.5 bg-orange-500 rounded-full" />
            )}
          </button>

          {/* Tab 3: Results */}
          <button
            type="button"
            onClick={() => {
              setMobileTab('results');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
              mobileTab === 'results'
                ? 'text-orange-500 font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <div className="relative">
              <Calendar className="w-5 h-5" />
              {results && results.schedules.length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                  {results.schedules.length}
                </span>
              )}
            </div>
            <span className="text-[11px]">Results</span>
            {mobileTab === 'results' && (
              <span className="absolute bottom-0 inset-x-6 h-0.5 bg-orange-500 rounded-full" />
            )}
          </button>
        </div>
      </nav>

      {/* Footer */}
      <SiteFooter onOpenSavedRoutines={() => setIsSavedDrawerOpen(true)} />

      {/* 3. Course-Wise Faculty Explorer Slide-Over Panel */}
      {explorerCourseCode && (
        <FacultyExplorer
          courseCode={explorerCourseCode}
          onClose={() => {
            setExplorerCourseCode(null);
            setPreviewSection(null);
          }}
          courses={effectiveCourses}
          sections={effectiveSections}
          selectedCourses={request.selectedCourses}
          preferredFaculty={request.preferredFaculty}
          avoidFaculty={request.avoidFaculty}
          onTogglePreferred={toggleFacultyPref}
          onToggleAvoid={toggleFacultyAvoid}
          onAddCourse={handleAddCourse}
          onRemoveCourse={handleRemoveCourse}
          activeScheduleSections={currentSchedule?.sections || []}
          onHoverSection={(sec) => setPreviewSection(sec)}
        />
      )}

      {/* 4. Modals */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <HelpGuideModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favorites}
        onSelectFavorite={handleSelectFavorite}
        onRemoveFavorite={handleRemoveFavorite}
      />

      <ManualScheduleModal
        isOpen={isManualModalOpen}
        courseCode={modalCourseCode || ''}
        courseTitle={effectiveCourses.find((c) => c.code === modalCourseCode)?.title}
        initialSchedule={modalCourseCode ? manualSchedules[modalCourseCode] : null}
        sections={allSections}
        onSave={handleSaveManualSchedule}
        onCancel={handleCancelManualSchedule}
      />

      {/* 5. Saved Routines Drawer */}
      <SavedRoutinesDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        savedRoutines={savedRoutines}
        liveSections={effectiveSections}
        onOpenRoutine={(routine) => {
          setViewingSavedRoutine(routine);
          setIsSharedViewing(false);
          setComparingSavedRoutines(null);
          setMobileTab('results');
        }}
        onLoadSettings={handleLoadSettings}
        onCompareRoutines={(routines) => {
          setComparingSavedRoutines(routines);
          setMobileTab('results');
        }}
        onDeleteRoutine={handleDeleteRoutine}
        onDeleteAll={handleDeleteAll}
        onUpdateRoutine={handleUpdateRoutine}
        onDuplicateRoutine={handleDuplicateRoutine}
        onImportRoutines={handleImportRoutines}
        onAddUpdatedCopy={(newRoutine) => {
          const updated = [newRoutine, ...savedRoutines];
          setSavedRoutines(updated);
          saveRoutinesToStorage(updated);
        }}
        triggerButtonRef={savedButtonRef}
      />

      {/* 6. Saved Routine Toast Notification */}
      {savedToast && (
        <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px)+16px)] md:bottom-6 right-4 md:right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-card shadow-warm-lg flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2">
          <span>{savedToast.message}</span>
          {savedToast.onUndo && (
            <button
              onClick={() => {
                savedToast.onUndo?.();
                setSavedToast(null);
              }}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-orange-400 hover:text-orange-300 font-bold text-[11px] transition-colors border border-slate-700 active:scale-95"
            >
              Undo
            </button>
          )}
          {savedToast.showView && (
            <button
              onClick={() => {
                setSavedToast(null);
                setIsSavedDrawerOpen(true);
              }}
              className="px-2.5 py-1 rounded bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] transition-colors"
            >
              View
            </button>
          )}
        </div>
      )}
    </div>
  );
}
