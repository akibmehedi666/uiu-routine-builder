'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import coursesJson from '../../../data/courses.json';
import { Course, SolveRequest } from '../../types';
import { PAGE_MAX_W } from '../../config/layout';
import { EXAMS_NOTE, EXAMS_UPDATED } from '../../config/site';
import { SiteFooter } from '../../components/SiteFooter';
import { useExams } from '../../hooks/useExams';
import { ExamClashSummary } from '../../components/ExamClashSummary';
import { StudentIdRoomLookup } from '../../components/StudentIdRoomLookup';
import {
  ExamRow,
  detectExamClashes,
  exportExamsToICS,
  exportExamsToText,
  formatExamDateShort,
  formatExamTimeRange,
  getExamsForCourse,
  isExamExemptCourse,
  lookupStudentRoomForCourse,
} from '../../lib/exams';
import { downloadFile, formatTime24 } from '../../utils/export';
import { naturalCourseCodeSort } from '../../lib/courseSearch';
import {
  Search,
  X,
  Calendar,
  Clock,
  Copy,
  Check,
  LayoutGrid,
  List,
  BookOpen,
  ArrowRight,
  MapPin,
  AlertTriangle,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';

const allCourses = coursesJson as unknown as Course[];

interface CourseCardGroup {
  key: string;
  program: 'BSCSE' | 'BSDS';
  courseCode: string;
  courseTitle: string;
  date: string;
  dayOfWeek: string;
  startMin: number;
  endMin: number;
  rows: ExamRow[];
}

function ExamsPageContent() {
  const searchParams = useSearchParams();
  const { exams, loaded } = useExams(true);

  // Only show non-dropped exam rows
  const activeExams = useMemo(
    () => exams.filter((e) => e.sectionStatus !== 'dropped'),
    [exams]
  );

  // Filters & view state
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<'ALL' | 'BSCSE' | 'BSDS'>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<string>('ALL');
  const [mineOnly, setMineOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'code'>('date');
  const [viewMode, setViewMode] = useState<'by-date' | 'list'>('by-date');
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  // Shared Builder working state for "My courses only"
  const [builderState, setBuilderState] = useState<Partial<SolveRequest>>({
    selectedCourses: [],
    lockedSections: {},
  });

  // Student ID room lookup (in component state only, only for "My courses only")
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load Builder shared working state from storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw =
        sessionStorage.getItem('uiu_routine_builder_state') ||
        localStorage.getItem('uiu_routine_builder_state');
      if (raw) {
        setBuilderState(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  // Hydrate initial filters from URL (?q=&program=&date=&mine=1)
  const hasHydratedUrl = React.useRef(false);
  useEffect(() => {
    if (hasHydratedUrl.current) return;
    hasHydratedUrl.current = true;

    const q = searchParams.get('q');
    if (q) setSearchQuery(q);

    const prog = searchParams.get('program');
    if (prog && ['BSCSE', 'BSDS'].includes(prog.toUpperCase())) {
      setProgramFilter(prog.toUpperCase() as 'BSCSE' | 'BSDS');
    }

    const d = searchParams.get('date');
    if (d) setDateFilter(d);

    const m = searchParams.get('mine');
    if (m === '1' || m === 'true') setMineOnly(true);
  }, [searchParams]);

  // Sync deep links (?q=&program=&date=&mine=1) — NEVER include student ID
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (programFilter !== 'ALL') params.set('program', programFilter);
    if (dateFilter !== 'ALL') params.set('date', dateFilter);
    if (mineOnly) params.set('mine', '1');
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  }, [searchQuery, programFilter, dateFilter, mineOnly]);

  const courseByCode = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of allCourses) {
      map.set(c.code, c);
    }
    return map;
  }, []);

  const selectedCourses = useMemo(
    () => builderState.selectedCourses || [],
    [builderState.selectedCourses]
  );

  // Unique dates with counts (after program filter so counts reflect context)
  const dateChips = useMemo(() => {
    const counts = new Map<string, { date: string; dayOfWeek: string; count: number }>();
    for (const e of activeExams) {
      if (programFilter !== 'ALL' && e.program !== programFilter) continue;
      if (!counts.has(e.date)) {
        counts.set(e.date, { date: e.date, dayOfWeek: e.dayOfWeek, count: 0 });
      }
      counts.get(e.date)!.count++;
    }
    return Array.from(counts.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [activeExams, programFilter]);

  // Unique time slots
  const timeSlotChips = useMemo(() => {
    const map = new Map<string, { key: string; startMin: number; endMin: number; label: string }>();
    for (const e of activeExams) {
      const key = `${e.startMin}-${e.endMin}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          startMin: e.startMin,
          endMin: e.endMin,
          label: `${formatTime24(e.startMin)} - ${formatTime24(e.endMin)}`,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => a.startMin - b.startMin || a.endMin - b.endMin
    );
  }, [activeExams]);

  // Set of exam IDs matching user's selected courses (and locked sections if chosen)
  const myCourseExamRows = useMemo(() => {
    if (selectedCourses.length === 0 || activeExams.length === 0) return [];
    const matched: ExamRow[] = [];
    const seenIds = new Set<string>();
    for (const code of selectedCourses) {
      const courseObj = courseByCode.get(code);
      if (isExamExemptCourse(courseObj || code)) continue;
      const lockedId = builderState.lockedSections?.[code];
      const rows = getExamsForCourse(courseObj?.program ?? null, code, activeExams);
      const chosenRows = lockedId
        ? rows.filter((r) => r.sectionId === lockedId)
        : rows;
      for (const r of chosenRows.length > 0 ? chosenRows : rows) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          matched.push(r);
        }
      }
    }
    return matched;
  }, [selectedCourses, activeExams, courseByCode, builderState.lockedSections]);

  // Clash report for "My courses only"
  const myExamReport = useMemo(() => {
    if (selectedCourses.length === 0 || activeExams.length === 0) return null;
    const selection = selectedCourses.map((code) => {
      const courseObj = courseByCode.get(code);
      return {
        course: courseObj || code,
        sectionId: builderState.lockedSections?.[code] || null,
        program: courseObj?.program,
        isLab: isExamExemptCourse(courseObj || code),
      };
    });
    return detectExamClashes(selection, activeExams);
  }, [selectedCourses, activeExams, courseByCode, builderState.lockedSections]);

  const myClashingCourseSet = useMemo(() => {
    const s = new Set<string>();
    if (myExamReport) {
      for (const c of myExamReport.clashes) {
        s.add(c.a);
        s.add(c.b);
      }
    }
    return s;
  }, [myExamReport]);

  // Filtered and sorted exam rows
  const filteredExams = useMemo(() => {
    const base = mineOnly ? myCourseExamRows : activeExams;
    const q = searchQuery.trim().toLowerCase();
    const qCompact = q.replace(/\s+/g, '');

    const filtered = base.filter((e) => {
      if (programFilter !== 'ALL' && e.program !== programFilter) return false;
      if (dateFilter !== 'ALL' && e.date !== dateFilter) return false;
      if (timeFilter !== 'ALL' && `${e.startMin}-${e.endMin}` !== timeFilter) {
        return false;
      }
      if (q) {
        const codeMatch =
          e.courseCode.toLowerCase().includes(q) ||
          e.courseCode.toLowerCase().replace(/\s+/g, '').includes(qCompact) ||
          e.courseCodes.some(
            (c) =>
              c.toLowerCase().includes(q) ||
              c.toLowerCase().replace(/\s+/g, '').includes(qCompact)
          );
        const titleMatch = e.courseTitle.toLowerCase().includes(q);
        const secMatch = e.section.toLowerCase() === q || `sec ${e.section.toLowerCase()}` === q;
        if (!codeMatch && !titleMatch && !secMatch) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'code') {
        const cCmp = naturalCourseCodeSort(a.courseCode, b.courseCode);
        if (cCmp !== 0) return cCmp;
        const pCmp = a.program.localeCompare(b.program);
        if (pCmp !== 0) return pCmp;
        return a.section.localeCompare(b.section, undefined, { numeric: true });
      }
      return (
        a.date.localeCompare(b.date) ||
        a.startMin - b.startMin ||
        naturalCourseCodeSort(a.courseCode, b.courseCode) ||
        a.section.localeCompare(b.section, undefined, { numeric: true })
      );
    });
  }, [
    mineOnly,
    myCourseExamRows,
    activeExams,
    searchQuery,
    programFilter,
    dateFilter,
    timeFilter,
    sortBy,
  ]);

  // Group filtered exams by date for "By date" view
  const byDateGroups = useMemo(() => {
    const dateMap = new Map<
      string,
      { date: string; dayOfWeek: string; cards: CourseCardGroup[]; rowCount: number }
    >();

    for (const e of filteredExams) {
      if (!dateMap.has(e.date)) {
        dateMap.set(e.date, {
          date: e.date,
          dayOfWeek: e.dayOfWeek,
          cards: [],
          rowCount: 0,
        });
      }
      const bucket = dateMap.get(e.date)!;
      bucket.rowCount++;

      // Group same (program, courseCode, startMin, endMin) into one card showing sections count/letter
      const groupKey = `${e.date}|${e.startMin}|${e.endMin}|${e.program}|${e.courseCode}`;
      let card = bucket.cards.find((c) => c.key === groupKey);
      if (!card) {
        card = {
          key: groupKey,
          program: e.program,
          courseCode: e.courseCode,
          courseTitle: e.courseTitle,
          date: e.date,
          dayOfWeek: e.dayOfWeek,
          startMin: e.startMin,
          endMin: e.endMin,
          rows: [],
        };
        bucket.cards.push(card);
      }
      card.rows.push(e);
    }

    const dates = Array.from(dateMap.values());
    if (sortBy === 'date') {
      dates.sort((a, b) => a.date.localeCompare(b.date));
    }
    return dates;
  }, [filteredExams, sortBy]);

  // Export items for "My courses only" (only when mineOnly is active)
  const myExportItems = useMemo(() => {
    if (!mineOnly) return [];
    return filteredExams.map((exam) => {
      if (!activeStudentId) return { exam, foundRoom: null };
      const allCourseExams = getExamsForCourse(exam.program, exam.courseCode, activeExams);
      const res = lookupStudentRoomForCourse(exam, allCourseExams, activeStudentId);
      const foundRoom =
        res.status === 'found-own' || res.status === 'found-other' ? res.room : null;
      return { exam, foundRoom };
    });
  }, [mineOnly, filteredExams, activeStudentId, activeExams]);

  const handleCopyMyExams = async () => {
    const text = exportExamsToText(myExportItems);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadMyIcs = () => {
    const ics = exportExamsToICS(myExportItems);
    downloadFile(ics, 'UIU_My_Midterm_Exams_Fall_2026.ics', 'text/calendar');
  };

  const toggleGroupExpand = (key: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setProgramFilter('ALL');
    setDateFilter('ALL');
    setTimeFilter('ALL');
    setSortBy('date');
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    programFilter !== 'ALL' ||
    dateFilter !== 'ALL' ||
    timeFilter !== 'ALL' ||
    sortBy !== 'date';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-page text-text-primary">
      {/* Page Sub-Header */}
      <div className="border-b border-app-border bg-surface">
        <div className={`${PAGE_MAX_W} mx-auto px-4 sm:px-6 py-4 space-y-1.5`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[28px] font-bold text-text-primary tracking-tight">
              Exam Schedule
            </h1>
            {activeExams.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold">
                {filteredExams.length} exams
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary">
            {EXAMS_NOTE}{' '}
            <span className="text-text-muted font-medium">
              Last updated {EXAMS_UPDATED}.
            </span>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className={`flex-1 ${PAGE_MAX_W} w-full mx-auto px-4 sm:px-6 py-5 space-y-4`}>
        {loaded && activeExams.length === 0 ? (
          <div className="p-8 text-center rounded-card bg-surface border border-dashed border-app-border text-sm text-text-muted">
            Mid-term exam schedule is not available yet.
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="p-3.5 sm:p-4 rounded-card bg-surface border border-app-border shadow-warm space-y-3">
              {/* Row 1: Search + Program + My courses only + Sort + View toggle */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search course code, title, or section..."
                    className="w-full min-h-[44px] sm:min-h-[38px] pl-9 pr-9 py-1.5 rounded-btn bg-page border border-app-border text-base sm:text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] flex items-center justify-center text-text-muted hover:text-text-primary"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Program Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['ALL', 'BSCSE', 'BSDS'] as const).map((prog) => (
                    <button
                      key={prog}
                      type="button"
                      onClick={() => setProgramFilter(prog)}
                      className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-chip text-xs font-semibold transition-colors ${
                        programFilter === prog
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                      }`}
                    >
                      {prog}
                    </button>
                  ))}

                  {/* My Courses Only Toggle */}
                  <button
                    type="button"
                    aria-pressed={mineOnly}
                    onClick={() => setMineOnly((prev) => !prev)}
                    className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-chip text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                      mineOnly
                        ? 'bg-orange-500 text-white border-orange-600 shadow-2xs'
                        : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span>My courses only</span>
                    {selectedCourses.length > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                          mineOnly ? 'bg-white/25 text-white' : 'bg-orange-200 text-orange-900'
                        }`}
                      >
                        {selectedCourses.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Sort & View Switcher */}
                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="exam-sort-select" className="text-xs text-text-muted">
                      Sort:
                    </label>
                    <select
                      id="exam-sort-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'date' | 'code')}
                      className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1 rounded-btn bg-page border border-app-border text-base sm:text-xs font-medium text-text-primary focus:outline-none focus:border-orange-500"
                    >
                      <option value="date">Date</option>
                      <option value="code">Course code</option>
                    </select>
                  </div>

                  <div
                    role="group"
                    aria-label="Exam view mode"
                    className="inline-flex items-center p-0.5 rounded-btn bg-subtle border border-app-border"
                  >
                    <button
                      type="button"
                      onClick={() => setViewMode('by-date')}
                      className={`min-h-[40px] sm:min-h-[32px] px-2.5 py-1 rounded-btn text-xs font-semibold flex items-center gap-1 transition-colors ${
                        viewMode === 'by-date'
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>By date</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`min-h-[40px] sm:min-h-[32px] px-2.5 py-1 rounded-btn text-xs font-semibold flex items-center gap-1 transition-colors ${
                        viewMode === 'list'
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>List</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Date Chips (scrolls ONLY inside its own container) */}
              <div className="min-w-0">
                <div
                  aria-label="Filter by exam date"
                  className="flex items-center gap-1.5 overflow-x-auto pb-1"
                >
                  <button
                    type="button"
                    onClick={() => setDateFilter('ALL')}
                    className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-chip text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      dateFilter === 'ALL'
                        ? 'bg-orange-500 text-white shadow-2xs'
                        : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                    }`}
                  >
                    All dates
                  </button>
                  {dateChips.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setDateFilter(d.date)}
                      className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-chip text-xs font-semibold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1 ${
                        dateFilter === d.date
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                      }`}
                    >
                      <span>
                        {formatExamDateShort(d.date)} ({d.dayOfWeek})
                      </span>
                      <span
                        className={`text-[11px] ${
                          dateFilter === d.date ? 'text-white/90' : 'text-text-muted'
                        }`}
                      >
                        {d.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Time Slot Chips + Reset */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-text-muted font-medium mr-0.5">
                    Time:
                  </span>
                  <button
                    type="button"
                    onClick={() => setTimeFilter('ALL')}
                    className={`min-h-[36px] sm:min-h-[28px] px-2.5 py-1 rounded-chip text-[11px] font-semibold transition-colors ${
                      timeFilter === 'ALL'
                        ? 'bg-orange-500 text-white'
                        : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                    }`}
                  >
                    All times
                  </button>
                  {timeSlotChips.map((slot) => (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => setTimeFilter(slot.key)}
                      className={`min-h-[36px] sm:min-h-[28px] px-2.5 py-1 rounded-chip text-[11px] font-semibold transition-colors ${
                        timeFilter === slot.key
                          ? 'bg-orange-500 text-white'
                          : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset filters</span>
                  </button>
                )}
              </div>
            </div>

            {/* "My courses only" mode: Empty state OR Clash Chips + Copy/ICS + Student ID Room Lookup */}
            {mineOnly && selectedCourses.length === 0 ? (
              <div className="p-8 text-center rounded-card bg-surface border border-dashed border-app-border shadow-2xs space-y-3">
                <div className="w-11 h-11 rounded-full bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mx-auto">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-text-primary">
                    No courses selected in Builder yet
                  </h2>
                  <p className="text-xs text-text-secondary max-w-md mx-auto">
                    Select your courses in the Routine Builder first to filter
                    your personal mid-term exam schedule, check clashes, and look
                    up your room by student ID.
                  </p>
                </div>
                <Link
                  href="/builder"
                  className="min-h-[44px] px-4 py-2 rounded-btn bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <span>Go to Routine Builder</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <>
                {mineOnly && selectedCourses.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <ExamClashSummary report={myExamReport} variant="chips" />
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={handleCopyMyExams}
                          disabled={filteredExams.length === 0}
                          className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-btn bg-surface hover:bg-subtle disabled:opacity-40 text-text-primary border border-app-border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-text-muted" />
                          )}
                          <span>{copied ? 'Copied!' : 'Copy list'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadMyIcs}
                          disabled={filteredExams.length === 0}
                          className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Download .ics</span>
                        </button>
                      </div>
                    </div>

                    <StudentIdRoomLookup
                      activeStudentId={activeStudentId}
                      onApplyStudentId={setActiveStudentId}
                    />
                  </div>
                )}

                {/* Results */}
                {filteredExams.length === 0 ? (
                  <div className="p-8 text-center rounded-card bg-surface border border-dashed border-app-border text-xs text-text-muted space-y-2">
                    <p className="font-semibold text-sm text-text-primary">
                      No exams match the current filters
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-btn bg-subtle hover:bg-orange-50 text-orange-700 border border-app-border font-semibold inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset filters</span>
                      </button>
                    )}
                  </div>
                ) : viewMode === 'by-date' ? (
                  /* BY DATE VIEW (day columns on desktop, stacked single-column on mobile) */
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                    {byDateGroups.map((dayGroup) => (
                      <section
                        key={dayGroup.date}
                        aria-label={`Exams on ${formatExamDateShort(dayGroup.date)}`}
                        className="rounded-card bg-surface border border-app-border shadow-warm overflow-hidden"
                      >
                        <div className="px-4 py-3 bg-subtle border-b border-app-border flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
                            <h2 className="text-sm font-bold text-text-primary truncate">
                              {formatExamDateShort(dayGroup.date)} ({dayGroup.dayOfWeek})
                            </h2>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-surface border border-app-border text-[11px] font-bold text-text-secondary shrink-0">
                            {dayGroup.rowCount} section{dayGroup.rowCount === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="divide-y divide-app-border">
                          {dayGroup.cards.map((card) => {
                            const isExpanded = expandedGroupKeys.has(card.key);
                            const isSingle = card.rows.length === 1;
                            const singleRow = isSingle ? card.rows[0] : null;
                            const hasClash = mineOnly && myClashingCourseSet.has(card.courseCode);

                            // Room lookup in "My courses only" mode when a single row is shown
                            const lookup =
                              mineOnly && activeStudentId && singleRow
                                ? lookupStudentRoomForCourse(
                                    singleRow,
                                    getExamsForCourse(
                                      singleRow.program,
                                      singleRow.courseCode,
                                      activeExams
                                    ),
                                    activeStudentId
                                  )
                                : null;

                            return (
                              <div
                                key={card.key}
                                className={`p-3.5 space-y-2 ${
                                  hasClash ? 'bg-rose-50/60' : 'bg-surface'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200 text-[11px] font-semibold">
                                        <Clock className="w-3 h-3 text-orange-600 shrink-0" />
                                        <span>
                                          {formatExamTimeRange(card.startMin, card.endMin)}
                                        </span>
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded bg-subtle border border-app-border text-[11px] font-bold text-text-muted">
                                        {card.program}
                                      </span>
                                      {hasClash && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold">
                                          <AlertTriangle className="w-3 h-3 shrink-0" />
                                          <span>Clash</span>
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-sm text-text-primary">
                                        {card.courseCode}
                                      </span>
                                      {isSingle && singleRow ? (
                                        <span className="px-1.5 py-0.2 rounded bg-subtle border border-app-border text-[11px] font-bold text-text-primary">
                                          Sec {singleRow.section}
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded bg-subtle border border-app-border text-[11px] font-semibold text-text-secondary">
                                          {card.rows.length} sections
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-xs text-text-secondary font-medium">
                                      {card.courseTitle}
                                    </div>
                                  </div>

                                  {lookup?.status === 'found-own' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold shrink-0">
                                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>Room {lookup.room}</span>
                                    </span>
                                  )}
                                </div>

                                {lookup?.status === 'found-other' && (
                                  <div className="p-2 rounded-btn bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-1.5 font-medium">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>
                                      Your ID is listed under section{' '}
                                      <strong>{lookup.section}</strong> (Room{' '}
                                      <strong>{lookup.room}</strong>)
                                    </span>
                                  </div>
                                )}

                                {lookup?.status === 'not-found' && (
                                  <div className="p-2 rounded-btn bg-subtle border border-app-border text-text-secondary text-xs flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>
                                      Your ID isn&apos;t in any room range for this course.
                                      Check the notice board.
                                    </span>
                                  </div>
                                )}

                                {isSingle && singleRow ? (
                                  <div className="text-[11px] text-text-muted space-y-1">
                                    <div>
                                      Rooms:{' '}
                                      <span className="font-medium text-text-secondary">
                                        {singleRow.rooms.map((r) => r.room).join(', ') || 'TBA'}
                                      </span>
                                    </div>
                                    {singleRow.rooms.length > 0 && (
                                      <details className="group">
                                        <summary className="cursor-pointer text-orange-600 hover:text-orange-700 font-semibold underline inline-flex items-center gap-0.5">
                                          <span>ID ranges</span>
                                          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                                        </summary>
                                        <div className="mt-1.5 space-y-1">
                                          {singleRow.rooms.map((r, idx) => (
                                            <div
                                              key={`${r.room}-${idx}`}
                                              className="px-2 py-1 rounded bg-page border border-app-border flex items-center justify-between gap-2"
                                            >
                                              <span className="font-bold text-text-primary">
                                                Room {r.room}
                                              </span>
                                              <span className="font-mono text-text-muted">
                                                {r.idFrom}–{r.idTo}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => toggleGroupExpand(card.key)}
                                      aria-expanded={isExpanded}
                                      className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 underline inline-flex items-center gap-1 py-0.5"
                                    >
                                      <span>
                                        {isExpanded
                                          ? 'Hide sections & rooms'
                                          : `Show ${card.rows.length} sections & rooms (${card.rows
                                              .map((r) => r.section)
                                              .slice(0, 6)
                                              .join(', ')}${card.rows.length > 6 ? '...' : ''})`}
                                      </span>
                                      <ChevronDown
                                        className={`w-3 h-3 transition-transform ${
                                          isExpanded ? 'rotate-180' : ''
                                        }`}
                                      />
                                    </button>

                                    {isExpanded && (
                                      <div className="mt-2 space-y-1.5">
                                        {card.rows.map((r) => {
                                          const rowLookup =
                                            mineOnly && activeStudentId
                                              ? lookupStudentRoomForCourse(
                                                  r,
                                                  getExamsForCourse(
                                                    r.program,
                                                    r.courseCode,
                                                    activeExams
                                                  ),
                                                  activeStudentId
                                                )
                                              : null;
                                          return (
                                            <div
                                              key={r.id}
                                              className="p-2 rounded bg-page border border-app-border text-[11px] space-y-1"
                                            >
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-text-primary">
                                                  Sec {r.section}
                                                </span>
                                                <span className="text-text-secondary font-medium">
                                                  Rooms: {r.rooms.map((rm) => rm.room).join(', ') || 'TBA'}
                                                </span>
                                              </div>
                                              {rowLookup?.status === 'found-own' && (
                                                <div className="text-emerald-800 font-bold">
                                                  Your room: Room {rowLookup.room}
                                                </div>
                                              )}
                                              {r.rooms.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                  {r.rooms.map((rm, idx) => (
                                                    <span
                                                      key={`${rm.room}-${idx}`}
                                                      className="px-1.5 py-0.5 rounded bg-surface border border-app-border font-mono text-text-muted"
                                                    >
                                                      {rm.room}: {rm.idFrom}–{rm.idTo}
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  /* LIST VIEW (Table on desktop, single-column stacked cards on mobile) */
                  <>
                    {/* Mobile stacked cards (< 768px) */}
                    <div className="md:hidden space-y-2.5">
                      {filteredExams.map((e) => {
                        const lookup =
                          mineOnly && activeStudentId
                            ? lookupStudentRoomForCourse(
                                e,
                                getExamsForCourse(e.program, e.courseCode, activeExams),
                                activeStudentId
                              )
                            : null;
                        return (
                          <div
                            key={e.id}
                            className="p-3.5 rounded-card bg-surface border border-app-border shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-sm text-text-primary">
                                  {e.courseCode}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-subtle border border-app-border text-[11px] font-bold">
                                  Sec {e.section}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold">
                                  {e.program}
                                </span>
                              </div>
                              {lookup?.status === 'found-own' && (
                                <span className="px-2 py-0.5 rounded-chip bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold shrink-0">
                                  Room {lookup.room}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-text-secondary font-medium">
                              {e.courseTitle}
                            </div>
                            <div className="text-xs text-text-primary font-semibold">
                              {formatExamDateShort(e.date)} ({e.dayOfWeek}) •{' '}
                              {formatExamTimeRange(e.startMin, e.endMin)}
                            </div>
                            <div className="text-[11px] text-text-muted">
                              Rooms: {e.rooms.map((r) => r.room).join(', ') || 'TBA'}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop table (>= 768px) */}
                    <div className="hidden md:block rounded-card bg-surface border border-app-border shadow-warm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-subtle border-b border-app-border text-[11px] uppercase tracking-wider text-text-muted">
                              <th className="py-2.5 px-3.5 font-bold">Date</th>
                              <th className="py-2.5 px-3.5 font-bold">Time</th>
                              <th className="py-2.5 px-3.5 font-bold">Course</th>
                              <th className="py-2.5 px-3.5 font-bold">Sec</th>
                              <th className="py-2.5 px-3.5 font-bold">Program</th>
                              <th className="py-2.5 px-3.5 font-bold">Rooms</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-app-border">
                            {filteredExams.map((e) => {
                              const hasClash =
                                mineOnly && myClashingCourseSet.has(e.courseCode);
                              const lookup =
                                mineOnly && activeStudentId
                                  ? lookupStudentRoomForCourse(
                                      e,
                                      getExamsForCourse(e.program, e.courseCode, activeExams),
                                      activeStudentId
                                    )
                                  : null;
                              return (
                                <tr
                                  key={e.id}
                                  className={
                                    hasClash
                                      ? 'bg-rose-50/60 hover:bg-rose-50'
                                      : 'hover:bg-subtle/60'
                                  }
                                >
                                  <td className="py-2.5 px-3.5 whitespace-nowrap font-medium text-text-primary">
                                    {formatExamDateShort(e.date)} ({e.dayOfWeek})
                                  </td>
                                  <td className="py-2.5 px-3.5 whitespace-nowrap text-text-secondary font-medium">
                                    {formatExamTimeRange(e.startMin, e.endMin)}
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    <div className="font-bold text-text-primary">
                                      {e.courseCode}
                                    </div>
                                    <div className="text-[11px] text-text-muted">
                                      {e.courseTitle}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3.5 font-bold text-text-primary">
                                    {e.section}
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    <span className="px-1.5 py-0.5 rounded bg-subtle border border-app-border text-[11px] font-bold text-text-secondary">
                                      {e.program}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {lookup?.status === 'found-own' && (
                                        <span className="px-2 py-0.5 rounded-chip bg-emerald-50 text-emerald-900 border border-emerald-300 text-[11px] font-bold">
                                          Room {lookup.room}
                                        </span>
                                      )}
                                      {lookup?.status === 'found-other' && (
                                        <span className="px-2 py-0.5 rounded-chip bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-semibold">
                                          Sec {lookup.section} (Room {lookup.room})
                                        </span>
                                      )}
                                      <span className="text-text-secondary">
                                        {e.rooms.map((r) => r.room).join(', ') || 'TBA'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
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
        <div className="min-h-[100dvh] bg-page flex items-center justify-center text-xs text-text-muted">
          Loading exam schedule...
        </div>
      }
    >
      <ExamsPageContent />
    </Suspense>
  );
}
