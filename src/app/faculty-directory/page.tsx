'use client';

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Clock,
  BookOpen,
  Calendar,
  Sparkles,
  Trophy,
  Flame,
  Moon,
  Bell,
  FlaskConical,
  CheckSquare,
  Square,
  Users,
  ArrowRight,
  Layers,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

import { PAGE_MAX_W } from '../../config/layout';
import { SiteFooter } from '../../components/SiteFooter';
import {
  getAllFacultyStats,
  getTBASections,
  filterFaculty,
  sortFaculty,
  getFacultyLeaderboards,
  getDailyFacultySpotlight,
  FacultyStats,
  FacultyFilterCriteria,
  TimeSlot,
  TBACourseGroup,
} from '../../lib/facultyStats';
import { Day, DAYS_LIST } from '../../types';

function BadgeIcon({ name, className = 'w-3.5 h-3.5' }: { name: string; className?: string }) {
  switch (name) {
    case 'Bell':
      return <Bell className={className} />;
    case 'Moon':
      return <Moon className={className} />;
    case 'FlaskConical':
      return <FlaskConical className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'Calendar':
      return <Calendar className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

function FacultyDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const allFaculty = useMemo(() => getAllFacultyStats(), []);
  const tbaGroups = useMemo(() => getTBASections(), []);
  const leaderboards = useMemo(() => getFacultyLeaderboards(allFaculty), [allFaculty]);

  // Compute spotlight deterministically based on today's UTC date
  const spotlightFaculty = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return getDailyFacultySpotlight(allFaculty, today);
  }, [allFaculty]);

  // Filter & sort state derived from URL or defaults
  const [search, setSearch] = useState<string>(searchParams.get('q') || '');
  const [program, setProgram] = useState<'ALL' | 'BSCSE' | 'BSDS'>(
    (searchParams.get('p') as 'BSCSE' | 'BSDS') || 'ALL'
  );
  const [day, setDay] = useState<'ALL' | Day>((searchParams.get('day') as Day) || 'ALL');
  const [timeSlot, setTimeSlot] = useState<'ALL' | TimeSlot>(
    (searchParams.get('time') as TimeSlot) || 'ALL'
  );
  const [kind, setKind] = useState<'ALL' | 'theory' | 'lab'>(
    (searchParams.get('kind') as 'theory' | 'lab') || 'ALL'
  );
  const [sortBy, setSortBy] = useState<FacultyFilterCriteria['sortBy']>(
    (searchParams.get('sort') as FacultyFilterCriteria['sortBy']) || 'az'
  );

  // Pagination (24 per page for instant performance)
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 24;

  // Comparison state (up to 2 faculty)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);

  // Collapsible panels
  const [isLeaderboardsOpen, setIsLeaderboardsOpen] = useState<boolean>(false);
  const [isTBAOpen, setIsTBAOpen] = useState<boolean>(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync state to URL search params cleanly without full reload
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (program !== 'ALL') params.set('p', program);
    if (day !== 'ALL') params.set('day', day);
    if (timeSlot !== 'ALL') params.set('time', timeSlot);
    if (kind !== 'ALL') params.set('kind', kind);
    if (sortBy && sortBy !== 'az') params.set('sort', sortBy);

    const qs = params.toString();
    const target = qs ? `/faculty-directory?${qs}` : '/faculty-directory';
    window.history.replaceState(null, '', target);
  }, [search, program, day, timeSlot, kind, sortBy]);

  // Keyboard shortcut: "/" to focus search, "Escape" to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearch('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter and sort the faculty list
  const filteredFaculty = useMemo(() => {
    const filtered = filterFaculty(allFaculty, {
      search,
      program,
      day,
      timeSlot,
      kind,
    });
    return sortFaculty(filtered, sortBy);
  }, [allFaculty, search, program, day, timeSlot, kind, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, program, day, timeSlot, kind, sortBy]);

  const visibleFaculty = useMemo(() => {
    return filteredFaculty.slice(0, page * PAGE_SIZE);
  }, [filteredFaculty, page]);

  const hasMore = visibleFaculty.length < filteredFaculty.length;

  const handleClearFilters = () => {
    setSearch('');
    setProgram('ALL');
    setDay('ALL');
    setTimeSlot('ALL');
    setKind('ALL');
    setSortBy('az');
    setPage(1);
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (program !== 'ALL' ? 1 : 0) +
    (day !== 'ALL' ? 1 : 0) +
    (timeSlot !== 'ALL' ? 1 : 0) +
    (kind !== 'ALL' ? 1 : 0);

  const toggleCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  // Compare faculty data
  const compareItems = useMemo(() => {
    return selectedForCompare
      .map((id) => allFaculty.find((f) => f.id === id))
      .filter((f): f is FacultyStats => Boolean(f));
  }, [selectedForCompare, allFaculty]);

  // Shared courses between selected faculty
  const sharedCourses = useMemo(() => {
    if (compareItems.length < 2) return [];
    const setA = new Set(compareItems[0].courses.map((c) => c.courseCode));
    return compareItems[1].courses.filter((c) => setA.has(c.courseCode));
  }, [compareItems]);

  const totalTBACount = useMemo(() => {
    return tbaGroups.reduce((acc, g) => acc + g.sections.length, 0);
  }, [tbaGroups]);

  return (
    <div className="min-h-screen bg-bg-page flex flex-col justify-between">
      <main className={`${PAGE_MAX_W} mx-auto w-full px-4 sm:px-6 py-6 md:py-8 space-y-6 flex-1`}>
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-bold text-text-primary tracking-tight">
              Faculty Directory
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-900 border border-orange-200">
              {allFaculty.length} faculty
            </span>
            <span className="text-xs text-text-muted hidden sm:inline">
              Dept. of CSE & Data Science
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            See who teaches what this trimester. Browse profiles, teaching loads, and section timetables.
          </p>
        </div>

        {/* Spotlight Card */}
        {spotlightFaculty && (
          <div className="bg-gradient-to-r from-orange-50/80 via-surface to-amber-50/50 rounded-xl border border-orange-200/90 p-4 sm:p-5 shadow-xs relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shrink-0 border shadow-2xs"
                  style={{
                    backgroundColor: spotlightFaculty.avatarColor.bg,
                    color: spotlightFaculty.avatarColor.text,
                    borderColor: spotlightFaculty.avatarColor.border,
                  }}
                >
                  {spotlightFaculty.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded">
                      <Sparkles className="w-3 h-3 text-orange-600" />
                      Faculty Spotlight · Daily Highlight
                    </span>
                    {spotlightFaculty.programs.map((p) => (
                      <span
                        key={p}
                        className="text-[11px] font-semibold text-text-muted bg-surface px-1.5 py-0.5 rounded border border-app-border"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-base font-bold text-text-primary mt-0.5 truncate">
                    {spotlightFaculty.name}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Teaches {spotlightFaculty.totalSections} sections across{' '}
                    {spotlightFaculty.distinctCourseCount} courses ({spotlightFaculty.totalWeeklyHours} hrs/wk)
                    {spotlightFaculty.busiestDay && ` · Busiest on ${spotlightFaculty.busiestDay}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
                <Link
                  href={`/faculty-directory/${spotlightFaculty.id}`}
                  className="w-full sm:w-auto h-9 px-4 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <span>View timetable</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="bg-surface rounded-xl border border-app-border p-4 shadow-xs space-y-3.5">
          {/* Top row: Search input + Mobile filter trigger + Sort select */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search faculty name or course code/title... (press / to focus)"
                className="w-full h-10 pl-9 pr-9 bg-bg-page border border-app-border rounded-btn text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary rounded"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="sm:hidden min-h-[44px] px-3.5 rounded-btn bg-surface border border-app-border text-xs font-semibold text-text-primary flex items-center justify-center gap-2"
            >
              <Filter className="w-4 h-4 text-orange-600" />
              <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
              {isMobileFilterOpen ? (
                <ChevronUp className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              )}
            </button>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-medium text-text-muted hidden md:inline">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as FacultyFilterCriteria['sortBy'])
                }
                className="h-10 px-3 bg-bg-page border border-app-border rounded-btn text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              >
                <option value="az">Name (A–Z)</option>
                <option value="most-sections">Most sections</option>
                <option value="most-courses">Most courses</option>
                <option value="most-credits">Most credits</option>
                <option value="most-hours">Most weekly hours</option>
              </select>
            </div>
          </div>

          {/* Chips Row: Program, Day, Time, Kind (collapsible on mobile, inline on desktop) */}
          <div
            className={`space-y-2.5 pt-2 border-t border-app-border/80 ${
              isMobileFilterOpen ? 'block' : 'hidden sm:block'
            }`}
          >
            {/* Program Chips */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-text-muted font-medium w-16 shrink-0">Program:</span>
              {(['ALL', 'BSCSE', 'BSDS'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProgram(p)}
                  className={`min-h-[32px] sm:h-7 px-3 rounded-full text-xs font-semibold transition-colors ${
                    program === p
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Day Chips */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-text-muted font-medium w-16 shrink-0">Day:</span>
              <button
                type="button"
                onClick={() => setDay('ALL')}
                className={`min-h-[32px] sm:h-7 px-3 rounded-full text-xs font-semibold transition-colors ${
                  day === 'ALL'
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                }`}
              >
                All Days
              </button>
              {DAYS_LIST.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(d)}
                  className={`min-h-[32px] sm:h-7 px-3 rounded-full text-xs font-semibold transition-colors ${
                    day === d
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Time Slot & Kind Chips */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-text-muted font-medium w-16 shrink-0">Time:</span>
                {(['ALL', 'Morning', 'Midday', 'Afternoon'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeSlot(t)}
                    className={`min-h-[32px] sm:h-7 px-3 rounded-full text-xs font-semibold transition-colors ${
                      timeSlot === t
                        ? 'bg-orange-500 text-white shadow-2xs'
                        : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                    }`}
                  >
                    {t === 'ALL' ? 'All Times' : t}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-text-muted font-medium shrink-0">Type:</span>
                {(['ALL', 'theory', 'lab'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`min-h-[32px] sm:h-7 px-3 rounded-full text-xs font-semibold transition-colors ${
                      kind === k
                        ? 'bg-orange-500 text-white shadow-2xs'
                        : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                    }`}
                  >
                    {k === 'ALL' ? 'All Types' : k === 'theory' ? 'Theory' : 'Laboratory'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Summary and Clear Filters */}
          <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-app-border/60">
            <span>
              Showing <strong className="text-text-primary">{filteredFaculty.length}</strong> of{' '}
              {allFaculty.length} faculty
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-orange-600 hover:text-orange-700 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Sections Bar: Leaderboards & TBA Tracker */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setIsLeaderboardsOpen(!isLeaderboardsOpen)}
            className={`min-h-[36px] px-3 rounded-btn border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              isLeaderboardsOpen
                ? 'bg-orange-50 border-orange-300 text-orange-900'
                : 'bg-surface border-app-border text-text-secondary hover:bg-subtle'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-orange-500" />
            <span>Leaderboards (Top 5)</span>
            {isLeaderboardsOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsTBAOpen(!isTBAOpen)}
            className={`min-h-[36px] px-3 rounded-btn border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              isTBAOpen
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-surface border-app-border text-text-secondary hover:bg-subtle'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Unassigned (TBA) Sections ({totalTBACount})</span>
            {isTBAOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Leaderboards Panel */}
        {isLeaderboardsOpen && (
          <div className="bg-surface rounded-xl border border-app-border p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-app-border pb-2">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-orange-500" />
                Teaching Load Leaderboards (Top 5)
              </h2>
              <span className="text-[11px] text-text-muted">Plain facts from registrar data</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Leaderboard 1: Most Sections */}
              <div className="bg-bg-page rounded-lg p-3 border border-app-border space-y-2">
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  Most Sections
                </h3>
                <ol className="space-y-1.5 text-xs">
                  {leaderboards.mostSections.map((item, idx) => (
                    <li key={item.facultyId} className="flex items-center justify-between gap-1">
                      <Link
                        href={`/faculty-directory/${item.facultyId}`}
                        className="truncate hover:text-orange-600 font-medium"
                      >
                        <span className="text-text-muted font-bold mr-1">{idx + 1}.</span>
                        {item.name}
                      </Link>
                      <span className="font-semibold text-text-primary shrink-0 text-[11px] bg-orange-100/80 px-1.5 py-0.2 rounded font-mono">
                        {item.metricValue}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Leaderboard 2: Most Courses */}
              <div className="bg-bg-page rounded-lg p-3 border border-app-border space-y-2">
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                  Most Courses
                </h3>
                <ol className="space-y-1.5 text-xs">
                  {leaderboards.mostCourses.map((item, idx) => (
                    <li key={item.facultyId} className="flex items-center justify-between gap-1">
                      <Link
                        href={`/faculty-directory/${item.facultyId}`}
                        className="truncate hover:text-orange-600 font-medium"
                      >
                        <span className="text-text-muted font-bold mr-1">{idx + 1}.</span>
                        {item.name}
                      </Link>
                      <span className="font-semibold text-text-primary shrink-0 text-[11px] bg-purple-100/80 px-1.5 py-0.2 rounded font-mono">
                        {item.metricValue}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Leaderboard 3: Most Weekly Hours */}
              <div className="bg-bg-page rounded-lg p-3 border border-app-border space-y-2">
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  Most Weekly Hours
                </h3>
                <ol className="space-y-1.5 text-xs">
                  {leaderboards.mostHours.map((item, idx) => (
                    <li key={item.facultyId} className="flex items-center justify-between gap-1">
                      <Link
                        href={`/faculty-directory/${item.facultyId}`}
                        className="truncate hover:text-orange-600 font-medium"
                      >
                        <span className="text-text-muted font-bold mr-1">{idx + 1}.</span>
                        {item.name}
                      </Link>
                      <span className="font-semibold text-text-primary shrink-0 text-[11px] bg-sky-100/80 px-1.5 py-0.2 rounded font-mono">
                        {item.metricValue}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Leaderboard 4: Most First Bell (08:30 starts) */}
              <div className="bg-bg-page rounded-lg p-3 border border-app-border space-y-2">
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  First Bell (08:30 AM)
                </h3>
                <ol className="space-y-1.5 text-xs">
                  {leaderboards.mostFirstBell.map((item, idx) => (
                    <li key={item.facultyId} className="flex items-center justify-between gap-1">
                      <Link
                        href={`/faculty-directory/${item.facultyId}`}
                        className="truncate hover:text-orange-600 font-medium"
                      >
                        <span className="text-text-muted font-bold mr-1">{idx + 1}.</span>
                        {item.name}
                      </Link>
                      <span className="font-semibold text-text-primary shrink-0 text-[11px] bg-amber-100/80 px-1.5 py-0.2 rounded font-mono">
                        {item.metricValue}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* TBA Unassigned Sections Panel */}
        {isTBAOpen && (
          <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <h2 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                Unassigned Sections (Faculty TBA) — {totalTBACount} sections
              </h2>
              <span className="text-[11px] text-amber-800">
                Pending departmental instructor assignment
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {tbaGroups.map((group) => (
                <div
                  key={group.courseCode}
                  className="bg-surface rounded-lg p-3 border border-amber-200/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-text-primary">
                      {group.courseCode}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                      {group.sections.length} sec
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted truncate">{group.courseTitle}</p>
                  <div className="space-y-1 pt-1 border-t border-app-border/60">
                    {group.sections.map((sec) => (
                      <div
                        key={sec.id}
                        className="flex items-center justify-between text-[11px] text-text-secondary"
                      >
                        <span className="font-semibold">Sec {sec.section}</span>
                        <span>
                          {sec.days.join(', ')} · {sec.timeRange}
                        </span>
                        {sec.room && <span className="text-text-muted">Rm {sec.room}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Faculty Cards Grid */}
        {filteredFaculty.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleFaculty.map((f) => {
                const isSelected = selectedForCompare.includes(f.id);

                return (
                  <div
                    key={f.id}
                    className={`bg-surface rounded-xl border transition-all duration-150 p-4 flex flex-col justify-between relative group hover:shadow-warm hover:border-orange-300 ${
                      isSelected
                        ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/20'
                        : 'border-app-border'
                    }`}
                  >
                    {/* Top Row: Avatar + Name + Compare Checkbox */}
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/faculty-directory/${f.id}`}
                        className="flex items-start gap-3 min-w-0 flex-1 group-hover:text-orange-600 transition-colors"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs"
                          style={{
                            backgroundColor: f.avatarColor.bg,
                            color: f.avatarColor.text,
                            borderColor: f.avatarColor.border,
                          }}
                        >
                          {f.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-sm font-bold text-text-primary group-hover:text-orange-600 truncate transition-colors">
                            {f.name}
                          </h2>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {f.programs.map((p) => (
                              <span
                                key={p}
                                className="text-[11px] font-semibold text-text-muted bg-bg-page px-1.5 py-0.2 rounded border border-app-border"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Link>

                      {/* Compare Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => toggleCompare(f.id, e)}
                        className="p-1 text-text-muted hover:text-orange-600 rounded transition-colors"
                        title={
                          isSelected
                            ? 'Remove from compare'
                            : selectedForCompare.length >= 2
                            ? 'Replace with this faculty for comparison'
                            : 'Select to compare'
                        }
                        aria-label={`Select ${f.name} for comparison`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-orange-600" />
                        ) : (
                          <Square className="w-4 h-4 text-text-muted/60" />
                        )}
                      </button>
                    </div>

                    {/* Middle: 3 Stat Chips */}
                    <Link
                      href={`/faculty-directory/${f.id}`}
                      className="grid grid-cols-3 gap-1.5 py-3 border-y border-app-border/80 my-3 text-center"
                    >
                      <div className="bg-bg-page rounded-lg p-1.5 border border-app-border/60">
                        <span className="block text-xs font-bold text-text-primary">
                          {f.distinctCourseCount}
                        </span>
                        <span className="text-[11px] text-text-muted">Courses</span>
                      </div>
                      <div className="bg-bg-page rounded-lg p-1.5 border border-app-border/60">
                        <span className="block text-xs font-bold text-text-primary">
                          {f.totalSections}
                        </span>
                        <span className="text-[11px] text-text-muted">Sections</span>
                      </div>
                      <div className="bg-bg-page rounded-lg p-1.5 border border-app-border/60">
                        <span className="block text-xs font-bold text-text-primary">
                          {f.totalWeeklyHours}h
                        </span>
                        <span className="text-[11px] text-text-muted">Weekly</span>
                      </div>
                    </Link>

                    {/* Bottom Row: Badges (max 3) + Sat-Wed day dot strip */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      {/* Badges strip (max 3) */}
                      <div className="flex items-center gap-1 flex-wrap min-w-0">
                        {f.badges.slice(0, 3).map((b) => (
                          <span
                            key={b.id}
                            title={b.description}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs ${b.badgeStyle}`}
                          >
                            <BadgeIcon name={b.iconName} className="w-3 h-3" />
                            <span>{b.name}</span>
                          </span>
                        ))}
                      </div>

                      {/* Day Dot Strip (Sat-Wed) */}
                      <div
                        className="flex items-center gap-1 shrink-0"
                        title={`Teaching days: ${f.activeDays.join(', ')}`}
                        aria-label={`Teaches on ${f.activeDays.join(', ')}`}
                      >
                        {DAYS_LIST.map((d) => {
                          const isActive = f.activeDays.includes(d);
                          return (
                            <span
                              key={d}
                              className={`w-4 h-4 rounded-full text-[11px] font-bold flex items-center justify-center ${
                                isActive
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-app-border/60 text-text-muted/60'
                              }`}
                            >
                              {d[0]}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="min-h-[44px] px-6 rounded-btn bg-surface hover:bg-orange-50 border border-app-border hover:border-orange-300 text-text-primary hover:text-orange-600 font-semibold text-xs transition-colors shadow-2xs inline-flex items-center gap-2"
                >
                  <span>Load more ({filteredFaculty.length - visibleFaculty.length} remaining)</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-surface rounded-xl border border-app-border p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-text-primary">No faculty found</h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              No faculty match your active search and filter combination. Try adjusting your query or clear filters.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="h-9 px-4 rounded-btn bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <span>Clear all filters</span>
            </button>
          </div>
        )}

        {/* Footer Note */}
        <p className="text-[11px] text-text-muted text-center pt-2">
          Based on the Fall 2026 offering PDF. Assignments may change.
        </p>

        {/* Sticky Compare Bar */}
        {selectedForCompare.length > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-surface/95 backdrop-blur-md border border-orange-200 rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-3.5 max-w-lg w-[calc(100%-2rem)]">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-xs font-bold text-text-primary shrink-0">
                Compare ({selectedForCompare.length}/2):
              </span>
              <div className="flex items-center gap-1 truncate">
                {compareItems.map((f) => (
                  <span
                    key={f.id}
                    className="text-xs text-text-secondary bg-orange-50 px-2 py-0.5 rounded border border-orange-200 truncate"
                  >
                    {f.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCompareOpen(true)}
                disabled={compareItems.length < 2}
                className="h-8 px-3 rounded-btn bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-2xs"
              >
                Compare
              </button>
              <button
                type="button"
                onClick={() => setSelectedForCompare([])}
                className="p-1.5 text-text-muted hover:text-text-primary rounded"
                title="Clear comparison"
                aria-label="Clear selected faculty for comparison"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Compare Modal */}
        {isCompareOpen && compareItems.length >= 2 && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl border border-app-border shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-app-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  <h3 className="text-base font-bold text-text-primary">Faculty Comparison</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCompareOpen(false)}
                  className="p-1 text-text-muted hover:text-text-primary rounded-btn"
                  aria-label="Close comparison modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Side-by-side Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-app-border">
                        <th className="py-2.5 px-3 font-semibold text-text-muted w-1/3">Metric</th>
                        {compareItems.map((f) => (
                          <th key={f.id} className="py-2.5 px-3 font-bold text-text-primary w-1/3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border shrink-0"
                                style={{
                                  backgroundColor: f.avatarColor.bg,
                                  color: f.avatarColor.text,
                                  borderColor: f.avatarColor.border,
                                }}
                              >
                                {f.initials}
                              </div>
                              <span className="truncate">{f.name}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border/60">
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-text-muted">Programs</td>
                        {compareItems.map((f) => (
                          <td key={f.id} className="py-2.5 px-3">
                            {f.programs.join(', ')}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-text-muted">Total Courses</td>
                        {compareItems.map((f) => (
                          <td key={f.id} className="py-2.5 px-3 font-semibold text-text-primary">
                            {f.distinctCourseCount} ({f.theoryCourseCount} theory, {f.labCourseCount} lab)
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-text-muted">Total Sections</td>
                        {compareItems.map((f) => (
                          <td key={f.id} className="py-2.5 px-3 font-semibold text-text-primary">
                            {f.totalSections} sections
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-text-muted">Weekly Contact Hours</td>
                        {compareItems.map((f) => (
                          <td key={f.id} className="py-2.5 px-3 font-semibold text-text-primary">
                            {f.totalWeeklyHours} hrs/week
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-text-muted">Total Distinct Credits</td>
                        {compareItems.map((f) => (
                          <td key={f.id} className="py-2.5 px-3 font-semibold text-text-primary">
                            {f.totalCredits} credits
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-text-muted">Days on Campus</td>
                        {compareItems.map((f) => (
                          <td key={f.id} className="py-2.5 px-3">
                            {f.daysOnCampus} days ({f.activeDays.join(', ')})
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-text-muted">Daily Time Slots</td>
                        {compareItems.map((f) => (
                          <td key={f.id} className="py-2.5 px-3">
                            {f.slotCounts.morning} morning · {f.slotCounts.midday} midday ·{' '}
                            {f.slotCounts.afternoon} afternoon
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-text-muted">Earliest & Latest</td>
                        {compareItems.map((f) => (
                          <td key={f.id} className="py-2.5 px-3">
                            {f.earliestStartTimeStr} – {f.latestEndTimeStr}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-text-muted">Shared Courses</td>
                        <td colSpan={2} className="py-2.5 px-3">
                          {sharedCourses.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {sharedCourses.map((c) => (
                                <span
                                  key={c.courseCode}
                                  className="text-[11px] font-semibold bg-orange-100 text-orange-900 px-2 py-0.5 rounded"
                                >
                                  {c.courseCode} ({c.title})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-text-muted italic">No shared courses</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-app-border bg-bg-page flex items-center justify-between">
                <span className="text-[11px] text-text-muted">
                  Plain data comparison only.
                </span>
                <div className="flex items-center gap-2">
                  {compareItems.map((f) => (
                    <Link
                      key={f.id}
                      href={`/faculty-directory/${f.id}`}
                      className="h-8 px-3 rounded-btn bg-surface hover:bg-orange-50 border border-app-border text-xs font-semibold text-text-primary hover:text-orange-600 transition-colors"
                    >
                      View {f.name.split(' ')[0]}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

export default function FacultyDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-page flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-text-muted">Loading Faculty Directory...</p>
          </div>
        </div>
      }
    >
      <FacultyDirectoryContent />
    </Suspense>
  );
}
