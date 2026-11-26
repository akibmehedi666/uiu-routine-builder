'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import coursesJson from '../../../data/courses.json';
import sectionsJson from '../../../data/sections.json';
import { Course, Section, SolveRequest } from '../../types';
import { PAGE_MAX_W } from '../../config/layout';
import { EXAMS_UPDATED } from '../../config/site';
import { SiteFooter } from '../../components/SiteFooter';
import { useExams } from '../../hooks/useExams';
import {
  UniqueExam,
  TimeOfDayGroup,
  TIME_OF_DAY_META,
  ExamsPageUrlState,
  countExamsAndSections,
  dayStats,
  detectExamClashes,
  formatDate,
  formatExamCountSummary,
  formatExamDateShort,
  formatExamTimeRange,
  getExamsForCourse,
  getNextExam,
  groupUniqueExams,
  isExamExemptCourse,
  parseExamsPageParams,
  serializeExamsPageParams,
  clearLegacyStudentIdStorage,
} from '../../lib/exams';
import { naturalCourseCodeSort } from '../../lib/courseSearch';
import { StatStrip } from './_components/StatStrip';
import { StartHere } from './_components/StartHere';
import { DayStrip } from './_components/DayStrip';
import { ExamTimeline } from './_components/ExamTimeline';
import { MyExamPlan } from './_components/MyExamPlan';
import {
  Search,
  X,
  Sunrise,
  Sun,
  Sunset,
  RotateCcw,
  Calendar,
  List,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

const allCourses = coursesJson as unknown as Course[];
const allSections = (sectionsJson as unknown as Section[]).filter(
  (s) => s.status !== 'dropped'
);

const START_HERE_DISMISSED_KEY = 'uiu-rb:exams-start-here-dismissed:v1';

const DEFAULT_SOLVE_WEIGHTS = {
  facultyPreference: 30,
  minimizeGaps: 25,
  compactDays: 20,
  avoidEarlyLate: 15,
  avoidTentative: 10,
};

function ExamsPageContent() {
  const searchParams = useSearchParams();
  const { exams, loaded } = useExams(true);

  const activeRows = useMemo(
    () => exams.filter((e) => e.sectionStatus !== 'dropped'),
    [exams]
  );

  // Shared Builder working state
  const [builderState, setBuilderState] = useState<Partial<SolveRequest>>({
    selectedCourses: [],
    preferredFaculty: {},
    avoidFaculty: {},
    lockedSections: {},
    filterDayOff: [],
    weights: DEFAULT_SOLVE_WEIGHTS,
  });
  const [storageHydrated, setStorageHydrated] = useState(false);

  // StartHere dismissal
  const [startHereDismissed, setStartHereDismissed] = useState(false);

  // URL-synced filters & view state
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<'ALL' | 'BSCSE' | 'BSDS'>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<'ALL' | TimeOfDayGroup>('ALL');
  const [mode, setMode] = useState<'mine' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'date' | 'list'>('date');
  const [sortBy, setSortBy] = useState<'date' | 'code'>('date');

  // Mobile side-panel collapse state (< 1100px)
  const [mobilePlanExpanded, setMobilePlanExpanded] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const quickAddInputRef = useRef<HTMLInputElement>(null);
  const urlHydratedRef = useRef(false);

  // 1. Hydrate shared Builder state, StartHere dismissal, and clear legacy student ID key
  useEffect(() => {
    if (typeof window === 'undefined') return;
    clearLegacyStudentIdStorage();
    let loadedCourses: string[] = [];
    try {
      const raw =
        sessionStorage.getItem('uiu_routine_builder_state') ||
        localStorage.getItem('uiu_routine_builder_state');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SolveRequest>;
        setBuilderState(parsed);
        loadedCourses = parsed.selectedCourses || [];
      }
    } catch {
      // ignore storage errors
    }

    try {
      if (localStorage.getItem(START_HERE_DISMISSED_KEY) === 'true') {
        setStartHereDismissed(true);
      }
    } catch {
      // ignore
    }

    if (loadedCourses.length > 0) {
      setMobilePlanExpanded(true);
    }

    // Hydrate URL params once we know whether courses exist
    if (!urlHydratedRef.current) {
      urlHydratedRef.current = true;
      const parsedUrl = parseExamsPageParams(
        window.location.search,
        loadedCourses.length > 0
      );
      setSearchQuery(parsedUrl.q);
      setProgramFilter(parsedUrl.program);
      setDateFilter(parsedUrl.date);
      setTimeFilter(parsedUrl.time);
      setMode(parsedUrl.mode);
      setViewMode(parsedUrl.view);
    }

    setStorageHydrated(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'uiu_routine_builder_state' && e.newValue) {
        try {
          setBuilderState(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [searchParams]);

  // 2. Sync URL params cleanly (NEVER student ID)
  useEffect(() => {
    if (!storageHydrated || typeof window === 'undefined') return;
    const state: ExamsPageUrlState = {
      q: searchQuery,
      program: programFilter,
      date: dateFilter,
      time: timeFilter,
      mode,
      view: viewMode,
    };
    const qs = serializeExamsPageParams(state);
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  }, [storageHydrated, searchQuery, programFilter, dateFilter, timeFilter, mode, viewMode]);

  // 3. Keyboard "/" shortcut to focus search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName || '';
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Shared Builder state mutators (keep Builder & /exams synced)
  const updateSharedBuilderState = (
    updater: (prev: Partial<SolveRequest>) => Partial<SolveRequest>
  ) => {
    setBuilderState((prev) => {
      const next = updater(prev);
      try {
        const json = JSON.stringify(next);
        sessionStorage.setItem('uiu_routine_builder_state', json);
        localStorage.setItem('uiu_routine_builder_state', json);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleAddCourse = (courseCode: string) => {
    updateSharedBuilderState((prev) => {
      const current = prev.selectedCourses || [];
      if (current.includes(courseCode)) return prev;
      return {
        ...prev,
        selectedCourses: [...current, courseCode],
      };
    });
  };

  const handleRemoveCourse = (courseCode: string) => {
    updateSharedBuilderState((prev) => {
      const current = prev.selectedCourses || [];
      const newPref = { ...(prev.preferredFaculty || {}) };
      const newAvoid = { ...(prev.avoidFaculty || {}) };
      const newLock = { ...(prev.lockedSections || {}) };
      delete newPref[courseCode];
      delete newAvoid[courseCode];
      delete newLock[courseCode];
      return {
        ...prev,
        selectedCourses: current.filter((c) => c !== courseCode),
        preferredFaculty: newPref,
        avoidFaculty: newAvoid,
        lockedSections: newLock,
      };
    });
  };

  const handleDismissStartHere = () => {
    setStartHereDismissed(true);
    try {
      localStorage.setItem(START_HERE_DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const handleFocusQuickAdd = () => {
    setMobilePlanExpanded(true);
    setTimeout(() => {
      quickAddInputRef.current?.focus();
      quickAddInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const selectedCourses = useMemo(
    () => builderState.selectedCourses || [],
    [builderState.selectedCourses]
  );

  const lockedSections = useMemo(
    () => builderState.lockedSections || {},
    [builderState.lockedSections]
  );

  const userCourseSet = useMemo(() => new Set(selectedCourses), [selectedCourses]);

  const courseByCode = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of allCourses) {
      map.set(c.code, c);
    }
    return map;
  }, []);

  // 4. Unique exams across entire active dataset (BSCSE + BSDS merged per course+date+slot)
  const allUniqueExams = useMemo(
    () => groupUniqueExams(activeRows),
    [activeRows]
  );

  const totalCounts = useMemo(
    () => countExamsAndSections(allUniqueExams),
    [allUniqueExams]
  );

  // User's selected exam rows (honoring lockedSections if chosen)
  const mySelectedExamRows = useMemo(() => {
    if (selectedCourses.length === 0 || activeRows.length === 0) return [];
    const matched: typeof activeRows = [];
    const seenIds = new Set<string>();
    for (const code of selectedCourses) {
      const courseObj = courseByCode.get(code);
      if (isExamExemptCourse(courseObj || code, allSections)) continue;
      const rows = getExamsForCourse(null, code, activeRows);
      const lockedId = lockedSections[code];
      const filtered = lockedId
        ? rows.filter((r) => r.sectionId === lockedId)
        : rows;
      for (const r of filtered.length > 0 ? filtered : rows) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          matched.push(r);
        }
      }
    }
    return matched;
  }, [selectedCourses, activeRows, courseByCode, lockedSections]);

  const myUniqueExams = useMemo(
    () => groupUniqueExams(mySelectedExamRows),
    [mySelectedExamRows]
  );

  // Clash report for user's selected courses
  const myExamReport = useMemo(() => {
    if (selectedCourses.length === 0 || activeRows.length === 0) return null;
    const selection = selectedCourses.map((code) => {
      const courseObj = courseByCode.get(code);
      return {
        course: courseObj || code,
        sectionId: lockedSections[code] || null,
        program: courseObj?.program,
        isLab: isExamExemptCourse(courseObj || code, allSections),
      };
    });
    return detectExamClashes(selection, activeRows);
  }, [selectedCourses, activeRows, courseByCode, lockedSections]);

  // Day stats for StatStrip & DayStrip
  const allDayStats = useMemo(
    () => dayStats(allUniqueExams, selectedCourses),
    [allUniqueExams, selectedCourses]
  );

  // In My exams mode, DayStrip keeps all 7 exam dates visible, with user's exam counts & bars
  const dayStripDays = useMemo(() => {
    if (mode !== 'mine') return allDayStats.days;
    const myMap = new Map<string, { examCount: number; sectionCount: number }>();
    for (const e of myUniqueExams) {
      const cur = myMap.get(e.date) || { examCount: 0, sectionCount: 0 };
      cur.examCount += 1;
      cur.sectionCount += e.sectionCount;
      myMap.set(e.date, cur);
    }
    const maxMy = Math.max(1, ...Array.from(myMap.values()).map((v) => v.examCount));
    return allDayStats.days.map((d) => {
      const mine = myMap.get(d.date) || { examCount: 0, sectionCount: 0 };
      return {
        ...d,
        examCount: mine.examCount,
        sectionCount: mine.sectionCount,
        ratio: mine.examCount > 0 ? mine.examCount / maxMy : 0,
      };
    });
  }, [mode, allDayStats.days, myUniqueExams]);

  // Next Exam (My exams mode)
  const nextExamResult = useMemo(
    () => (mode === 'mine' ? getNextExam(myUniqueExams) : { status: 'none' as const }),
    [mode, myUniqueExams]
  );

  // Filter & sort UniqueExams for the active mode
  const filteredExams = useMemo(() => {
    const base = mode === 'mine' ? myUniqueExams : allUniqueExams;
    const q = searchQuery.trim().toLowerCase();
    const qCompact = q.replace(/\s+/g, '');

    const filtered: UniqueExam[] = [];
    for (const exam of base) {
      if (dateFilter !== 'ALL' && exam.date !== dateFilter) continue;
      if (timeFilter !== 'ALL' && exam.timeOfDay !== timeFilter) continue;

      // Program filter: filter sections within exam if programFilter != ALL
      let workingExam = exam;
      if (programFilter !== 'ALL') {
        const progSections = exam.sections.filter((s) => s.program === programFilter);
        if (progSections.length === 0) continue;
        const roomsSet = new Set<string>();
        for (const s of progSections) {
          for (const r of s.rooms) roomsSet.add(r.room);
        }
        workingExam = {
          ...exam,
          programs: [{ program: programFilter, sectionCount: progSections.length }],
          sections: progSections,
          sectionCount: progSections.length,
          roomsSummary: Array.from(roomsSet),
        };
      }

      if (q) {
        const codeMatch =
          workingExam.courseCode.toLowerCase().includes(q) ||
          workingExam.courseCode.toLowerCase().replace(/\s+/g, '').includes(qCompact) ||
          workingExam.courseCodes.some(
            (c) =>
              c.toLowerCase().includes(q) ||
              c.toLowerCase().replace(/\s+/g, '').includes(qCompact)
          );
        const titleMatch = workingExam.courseTitle.toLowerCase().includes(q);
        const secMatch = workingExam.sections.some(
          (s) =>
            s.section.toLowerCase() === q ||
            `sec ${s.section.toLowerCase()}` === q
        );
        if (!codeMatch && !titleMatch && !secMatch) continue;
      }

      filtered.push(workingExam);
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'code') {
        return (
          naturalCourseCodeSort(a.courseCode, b.courseCode) ||
          a.date.localeCompare(b.date) ||
          a.startMin - b.startMin
        );
      }
      return (
        a.date.localeCompare(b.date) ||
        a.startMin - b.startMin ||
        naturalCourseCodeSort(a.courseCode, b.courseCode)
      );
    });
  }, [
    mode,
    myUniqueExams,
    allUniqueExams,
    searchQuery,
    programFilter,
    dateFilter,
    timeFilter,
    sortBy,
  ]);

  const filteredCounts = useMemo(
    () => countExamsAndSections(filteredExams),
    [filteredExams]
  );

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    programFilter !== 'ALL' ||
    dateFilter !== 'ALL' ||
    timeFilter !== 'ALL' ||
    sortBy !== 'date';

  const resetFilters = () => {
    setSearchQuery('');
    setProgramFilter('ALL');
    setDateFilter('ALL');
    setTimeFilter('ALL');
    setSortBy('date');
  };

  // Unannounced selected theory courses (for My exams notice / empty state)
  const unannouncedSelectedCourses = useMemo(
    () => myExamReport?.unannouncedCourses || [],
    [myExamReport]
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-page text-text-primary">
      {/* A. Header */}
      <div className="border-b border-app-border bg-surface">
        <div className={`${PAGE_MAX_W} mx-auto px-4 sm:px-6 py-4 space-y-1.5`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[28px] font-bold text-text-primary tracking-tight">
              Exam Schedule
            </h1>
            {allUniqueExams.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold">
                {totalCounts.examCount} exams
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary">
            Find your exams, check for clashes and see your room.
          </p>
          <p className="text-xs text-text-muted">
            Mid-term schedule from the SoSE notice board. Last updated{' '}
            {formatDate(EXAMS_UPDATED)}. Confirm on the notice board, dates and
            rooms may change.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <main className={`flex-1 ${PAGE_MAX_W} w-full mx-auto px-4 sm:px-6 py-5 space-y-5`}>
        {loaded && activeRows.length === 0 ? (
          <div className="p-8 text-center rounded-card bg-surface border border-dashed border-app-border text-sm text-text-muted">
            Mid-term exam schedule is not available right now.
          </div>
        ) : (
          <>
            {/* B. Stat Strip (4 tiles) */}
            <StatStrip
              totalDays={allDayStats.totalDays}
              dateRangeLabel={allDayStats.dateRangeLabel}
              totalExams={totalCounts.examCount}
              totalSections={totalCounts.sectionCount}
              busiestDay={allDayStats.busiestDay}
              selectedCoursesCount={selectedCourses.length}
              myExamCount={myUniqueExams.length}
              hasClashes={(myExamReport?.clashes.length || 0) > 0}
              onClickYourExams={() => {
                if (selectedCourses.length > 0) {
                  setMode('mine');
                } else {
                  handleFocusQuickAdd();
                }
              }}
            />

            {/* C. Start Here Strip (only when no selected courses & not dismissed) */}
            {storageHydrated &&
              selectedCourses.length === 0 &&
              !startHereDismissed && (
                <StartHere
                  onQuickAddClick={handleFocusQuickAdd}
                  onBrowseAll={() => setMode('all')}
                  onDismiss={handleDismissStartHere}
                />
              )}

            {/* D. Mode Switch ("My exams | All exams") + View Switch ("By date | List") */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Primary Mode Segmented Control */}
              <div
                role="tablist"
                aria-label="Exam schedule mode"
                className="inline-flex items-center p-1 rounded-card bg-surface border border-app-border shadow-2xs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'mine'}
                  onClick={() => setMode('mine')}
                  className={`min-h-[44px] sm:min-h-[38px] px-4 py-1.5 rounded-btn text-sm font-semibold transition-colors flex items-center gap-2 ${
                    mode === 'mine'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span>My exams</span>
                  {selectedCourses.length > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        mode === 'mine'
                          ? 'bg-white/25 text-white'
                          : 'bg-orange-50 text-orange-700 border border-orange-200'
                      }`}
                    >
                      {myUniqueExams.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'all'}
                  onClick={() => setMode('all')}
                  className={`min-h-[44px] sm:min-h-[38px] px-4 py-1.5 rounded-btn text-sm font-semibold transition-colors flex items-center gap-2 ${
                    mode === 'all'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span>All exams</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      mode === 'all'
                        ? 'bg-white/25 text-white'
                        : 'bg-subtle text-text-secondary border border-app-border'
                    }`}
                  >
                    {totalCounts.examCount}
                  </span>
                </button>
              </div>

              {/* Secondary View Switch: By date | List */}
              <div
                role="group"
                aria-label="Layout view"
                className="inline-flex items-center p-1 rounded-btn bg-surface border border-app-border shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('date')}
                  className={`min-h-[44px] sm:min-h-[34px] px-3 py-1 rounded-btn text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                    viewMode === 'date'
                      ? 'bg-subtle text-orange-700 border border-orange-200'
                      : 'text-text-secondary hover:text-text-primary border border-transparent'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>By date</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`min-h-[44px] sm:min-h-[34px] px-3 py-1 rounded-btn text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-subtle text-orange-700 border border-orange-200'
                      : 'text-text-secondary hover:text-text-primary border border-transparent'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
              </div>
            </div>

            {/* E. Two-Column Layout (>= 1100px: Main left, Sticky Plan right; < 1100px: Plan above Main) */}
            <div className="grid grid-cols-1 min-[1100px]:grid-cols-[1fr_360px] gap-5 items-start">
              {/* Right Side Panel in DOM order-1 on < 1100px, order-2 on >= 1100px */}
              <div className="order-1 min-[1100px]:order-2 w-full">
                <MyExamPlan
                  courses={allCourses}
                  allActiveRows={activeRows}
                  myUniqueExams={myUniqueExams}
                  selectedCourses={selectedCourses}
                  lockedSections={lockedSections}
                  examReport={myExamReport}
                  onAddCourse={handleAddCourse}
                  onRemoveCourse={handleRemoveCourse}
                  quickAddInputRef={quickAddInputRef}
                  mobileExpanded={mobilePlanExpanded}
                  onToggleMobileExpanded={() =>
                    setMobilePlanExpanded((prev) => !prev)
                  }
                />
              </div>

              {/* Left Main Column */}
              <div className="order-2 min-[1100px]:order-1 min-w-0 space-y-4">
                {/* Next Exam Card (My exams mode) */}
                {mode === 'mine' && selectedCourses.length > 0 && (
                  <>
                    {nextExamResult.status === 'upcoming' && (
                      <section
                        aria-label="Next upcoming exam"
                        className="p-4 rounded-card bg-surface border border-orange-300 shadow-warm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          <div className="w-16 rounded-card bg-orange-50 border border-orange-200 p-2 text-center shrink-0">
                            <div className="text-xs font-semibold text-orange-700 uppercase">
                              {formatExamDateShort(nextExamResult.exam.date).split(' ')[0]}
                            </div>
                            <div className="text-2xl font-bold text-text-primary leading-tight tabular-nums">
                              {formatExamDateShort(nextExamResult.exam.date).split(' ')[1]}
                            </div>
                            <div className="text-xs font-medium text-text-muted">
                              {nextExamResult.exam.dayOfWeek}
                            </div>
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                                Next exam
                              </span>
                              <span className="px-2 py-0.5 rounded-chip bg-orange-500 text-white text-xs font-bold">
                                {nextExamResult.label}
                              </span>
                            </div>
                            <div className="text-base font-semibold text-text-primary">
                              {nextExamResult.exam.courseCode} —{' '}
                              {nextExamResult.exam.courseTitle}
                            </div>
                            <div className="text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Clock className="w-3.5 h-3.5 text-orange-500" />
                                {formatExamTimeRange(
                                  nextExamResult.exam.startMin,
                                  nextExamResult.exam.endMin
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </section>
                    )}

                    {nextExamResult.status === 'completed' && (
                      <div className="p-3.5 rounded-card bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>All your exams are completed.</span>
                      </div>
                    )}

                    {/* Clash Banner (My exams mode) */}
                    {myExamReport &&
                      (myExamReport.knownTheoryCount > 0 ||
                        myExamReport.unannouncedCourses.length > 0) && (
                        <div className="space-y-2">
                          {myExamReport.clashes.map((c, idx) => (
                            <div
                              key={`${c.a}-${c.b}-${idx}`}
                              role="alert"
                              className="p-3 rounded-card bg-rose-50 border border-rose-300 text-rose-900 text-sm font-semibold flex items-center gap-2"
                            >
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>
                                Exam clash: {c.a} and {c.b} on{' '}
                                {formatExamDateShort(c.date)}, {c.time}
                              </span>
                            </div>
                          ))}

                          {myExamReport.possible.map((p, idx) => (
                            <div
                              key={`${p.a}-${p.b}-poss-${idx}`}
                              className="p-3 rounded-card bg-amber-50 border border-amber-300 text-amber-900 text-sm font-medium flex items-center gap-2"
                            >
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>
                                Possible clash: {p.a} and {p.b} on{' '}
                                {formatExamDateShort(p.date)}, {p.time} (depends
                                on section)
                              </span>
                            </div>
                          ))}

                          {myExamReport.sameDayGroups.map((g) => (
                            <div
                              key={g.date}
                              className="p-2.5 rounded-card bg-sky-50 border border-sky-200 text-sky-900 text-xs font-medium flex items-center gap-2"
                            >
                              <Info className="w-4 h-4 text-sky-600 shrink-0" />
                              <span>
                                {g.count} exams on {formatExamDateShort(g.date)} (
                                {g.courses.join(', ')})
                              </span>
                            </div>
                          ))}

                          {myExamReport.clashes.length === 0 &&
                            myExamReport.possible.length === 0 &&
                            myExamReport.allTheoryExamsKnown && (
                              <div className="p-2.5 rounded-card bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>No exam clashes across your selected courses</span>
                              </div>
                            )}

                          {unannouncedSelectedCourses.length > 0 && (
                            <div className="p-2.5 rounded-card bg-subtle border border-app-border text-text-secondary text-xs">
                              <span className="font-semibold text-text-primary">
                                Exam not announced yet for:
                              </span>{' '}
                              {unannouncedSelectedCourses.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                  </>
                )}

                {/* Day Strip (Calendar) */}
                <DayStrip
                  days={dayStripDays}
                  selectedDate={dateFilter}
                  totalExamsCount={
                    mode === 'mine' ? myUniqueExams.length : totalCounts.examCount
                  }
                  onSelectDate={setDateFilter}
                />

                {/* Filter Bar + Time-of-day Chips */}
                <div className="p-3.5 rounded-card bg-surface border border-app-border shadow-2xs space-y-3">
                  {/* Row 1: Search + Program + Sort */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <div className="relative flex-1 min-w-0">
                      <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search course code, title, or section... (Press '/')"
                        className="w-full min-h-[44px] sm:min-h-[38px] pl-9 pr-9 py-1.5 rounded-btn bg-page border border-app-border text-base sm:text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-500"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] flex items-center justify-center text-text-muted hover:text-text-primary"
                          aria-label="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        {(['ALL', 'BSCSE', 'BSDS'] as const).map((prog) => (
                          <button
                            key={prog}
                            type="button"
                            onClick={() => setProgramFilter(prog)}
                            className={`min-h-[44px] sm:min-h-[34px] px-2.5 py-1 rounded-chip text-xs font-semibold transition-colors ${
                              programFilter === prog
                                ? 'bg-orange-500 text-white shadow-2xs'
                                : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                            }`}
                          >
                            {prog}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label
                          htmlFor="exam-sort-select"
                          className="text-xs text-text-muted"
                        >
                          Sort:
                        </label>
                        <select
                          id="exam-sort-select"
                          value={sortBy}
                          onChange={(e) =>
                            setSortBy(e.target.value as 'date' | 'code')
                          }
                          className="min-h-[44px] sm:min-h-[34px] px-2.5 py-1 rounded-btn bg-page border border-app-border text-base sm:text-xs font-medium text-text-primary focus:outline-none focus:border-orange-500"
                        >
                          <option value="date">Date</option>
                          <option value="code">Course code</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Time-of-day Chips (Morning / Midday / Afternoon) */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setTimeFilter('ALL')}
                        className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-chip text-xs font-semibold transition-colors ${
                          timeFilter === 'ALL'
                            ? 'bg-orange-500 text-white shadow-2xs'
                            : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                        }`}
                      >
                        All times
                      </button>

                      {(
                        [
                          { id: 'morning' as const, Icon: Sunrise },
                          { id: 'midday' as const, Icon: Sun },
                          { id: 'afternoon' as const, Icon: Sunset },
                        ] as const
                      ).map(({ id, Icon }) => {
                        const meta = TIME_OF_DAY_META[id];
                        const isActive = timeFilter === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setTimeFilter(id)}
                            title={meta.tooltip}
                            className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-chip text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                              isActive
                                ? 'bg-orange-500 text-white shadow-2xs'
                                : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                            }`}
                          >
                            <Icon
                              className={`w-3.5 h-3.5 ${
                                isActive ? 'text-white' : 'text-orange-500'
                              }`}
                            />
                            <span>{meta.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-semibold text-text-secondary">
                        {formatExamCountSummary(
                          filteredCounts.examCount,
                          filteredCounts.sectionCount
                        )}
                      </span>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-orange-600 hover:text-orange-700 font-semibold underline inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset filters</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Results / Empty States */}
                {mode === 'mine' && selectedCourses.length === 0 ? (
                  <div className="p-6 sm:p-8 rounded-card bg-surface border border-dashed border-app-border text-center space-y-4">
                    <div className="w-11 h-11 rounded-full bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mx-auto">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-text-primary">
                        No courses in your exam plan yet
                      </h2>
                      <p className="text-sm text-text-secondary max-w-md mx-auto">
                        1. Add your courses &rarr; 2. See your dates and clashes
                        &rarr; 3. Check your section&apos;s room by ID range.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleFocusQuickAdd}
                        className="min-h-[44px] px-4 py-2 rounded-btn bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-xs transition-colors"
                      >
                        Add courses
                      </button>
                      <Link
                        href="/builder"
                        className="min-h-[44px] px-4 py-2 rounded-btn bg-surface hover:bg-subtle text-text-primary border border-app-border text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <span>Open Builder</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ) : mode === 'mine' &&
                  myUniqueExams.length === 0 &&
                  !hasActiveFilters ? (
                  <div className="p-6 rounded-card bg-surface border border-app-border text-center space-y-2">
                    <h2 className="text-base font-semibold text-text-primary">
                      Exam not announced yet for:{' '}
                      {unannouncedSelectedCourses.length > 0
                        ? unannouncedSelectedCourses.join(', ')
                        : selectedCourses.join(', ')}
                    </h2>
                    <p className="text-xs text-text-muted">
                      Labs and project courses do not have scheduled mid-term
                      exam halls.
                    </p>
                  </div>
                ) : filteredExams.length === 0 ? (
                  <div className="p-8 rounded-card bg-surface border border-dashed border-app-border text-center space-y-3">
                    <h2 className="text-base font-semibold text-text-primary">
                      No exams match your filters
                    </h2>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset filters</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <ExamTimeline
                    exams={filteredExams}
                    viewMode={viewMode}
                    mode={mode}
                    userCourseSet={userCourseSet}
                    lockedSections={lockedSections}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

export default function ExamsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-page flex items-center justify-center text-sm text-text-muted">
          Loading exam schedule...
        </div>
      }
    >
      <ExamsPageContent />
    </Suspense>
  );
}
