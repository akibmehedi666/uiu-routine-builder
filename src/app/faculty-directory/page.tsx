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
  Clock,
  BookOpen,
  Calendar,
  Sparkles,
  Trophy,
  Flame,
  Moon,
  Bell,
  FlaskConical,
  Users,
  MapPin,
  ExternalLink,
  RotateCcw,
  Copy,
  Check,
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
  formatMinutesToTime,
} from '../../lib/facultyStats';
import { getCourseColor } from '../../utils/colors';
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

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <>{text}</>;
  const regex = new RegExp(
    `(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-orange-100 text-orange-950 rounded-xs px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

const TIMETABLE_SLOTS = [
  { label: '08:30', min: 510 },
  { label: '09:50', min: 590 },
  { label: '11:10', min: 670 },
  { label: '12:30', min: 750 },
  { label: '13:50', min: 830 },
  { label: '15:10', min: 910 },
  { label: '16:30', min: 990 },
];

function FacultyDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const allFaculty = useMemo(() => getAllFacultyStats(), []);
  const tbaGroups = useMemo(() => getTBASections(), []);
  const leaderboards = useMemo(() => getFacultyLeaderboards(allFaculty), [allFaculty]);

  // Compute deterministic daily spotlight
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

  // Selected faculty ID (deep-linkable via ?f=<id>)
  const initialFacultyId = searchParams.get('f') || (allFaculty.length > 0 ? allFaculty[0].id : '');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(initialFacultyId);

  // Mobile accordion expanded faculty ID (< 768px)
  const [expandedMobileFacultyId, setExpandedMobileFacultyId] = useState<string | null>(
    searchParams.get('f') || null
  );

  // Copy link feedback
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Collapsible panels
  const [isLeaderboardsOpen, setIsLeaderboardsOpen] = useState<boolean>(false);
  const [isTBAOpen, setIsTBAOpen] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync state to URL search params cleanly
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (program !== 'ALL') params.set('p', program);
    if (day !== 'ALL') params.set('day', day);
    if (timeSlot !== 'ALL') params.set('time', timeSlot);
    if (kind !== 'ALL') params.set('kind', kind);
    if (sortBy && sortBy !== 'az') params.set('sort', sortBy);
    if (selectedFacultyId) params.set('f', selectedFacultyId);

    const qs = params.toString();
    const target = qs ? `/faculty-directory?${qs}` : '/faculty-directory';
    window.history.replaceState(null, '', target);
  }, [search, program, day, timeSlot, kind, sortBy, selectedFacultyId]);

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

  // Ensure selected faculty is valid
  useEffect(() => {
    if (filteredFaculty.length > 0) {
      const exists = filteredFaculty.some((f) => f.id === selectedFacultyId);
      if (!exists && !searchParams.get('f')) {
        setSelectedFacultyId(filteredFaculty[0].id);
      }
    }
  }, [filteredFaculty, selectedFacultyId, searchParams]);

  const selectedFaculty = useMemo(() => {
    return allFaculty.find((f) => f.id === selectedFacultyId) || filteredFaculty[0] || null;
  }, [allFaculty, selectedFacultyId, filteredFaculty]);

  const handleSelectFaculty = (id: string) => {
    setSelectedFacultyId(id);
    setExpandedMobileFacultyId((prev) => (prev === id ? null : id));
  };

  const handleClearFilters = () => {
    setSearch('');
    setProgram('ALL');
    setDay('ALL');
    setTimeSlot('ALL');
    setKind('ALL');
    setSortBy('az');
  };

  const handleCopyLink = async () => {
    try {
      if (typeof window !== 'undefined') {
        const url = `${window.location.origin}/faculty-directory?f=${encodeURIComponent(
          selectedFaculty?.id || ''
        )}`;
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (program !== 'ALL' ? 1 : 0) +
    (day !== 'ALL' ? 1 : 0) +
    (timeSlot !== 'ALL' ? 1 : 0) +
    (kind !== 'ALL' ? 1 : 0);

  const totalTBACount = useMemo(() => {
    return tbaGroups.reduce((acc, g) => acc + g.sections.length, 0);
  }, [tbaGroups]);

  return (
    <div className="min-h-screen bg-bg-page flex flex-col justify-between">
      <main className={`${PAGE_MAX_W} mx-auto w-full px-4 sm:px-6 py-5 md:py-6 space-y-4 flex-1`}>
        {/* Header Section */}
        <div className="space-y-1">
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
            Select a faculty member to see their teaching load, weekly timetable, and assigned sections.
          </p>
        </div>

        {/* Toolbar & Filters (Course Directory Style) */}
        <div className="bg-surface rounded-card border border-app-border p-3.5 sm:p-4 shadow-warm space-y-3">
          {/* Row 1: Search + Sort dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
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

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-medium text-text-muted hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as FacultyFilterCriteria['sortBy'])
                }
                className="h-10 px-3 bg-bg-page border border-app-border rounded-btn text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 cursor-pointer"
              >
                <option value="az">Name (A–Z)</option>
                <option value="most-sections">Most sections</option>
                <option value="most-courses">Most courses</option>
                <option value="most-credits">Most credits</option>
                <option value="most-hours">Most weekly hours</option>
              </select>
            </div>
          </div>

          {/* Row 2: Filter Chips */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-app-border/80 text-xs">
            {/* Program Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-text-muted font-medium">Program:</span>
              {(['ALL', 'BSCSE', 'BSDS'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProgram(p)}
                  className={`min-h-[28px] px-2.5 rounded-full text-xs font-semibold transition-colors ${
                    program === p
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <span className="text-app-border hidden sm:inline">•</span>

            {/* Day Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-text-muted font-medium">Day:</span>
              <button
                type="button"
                onClick={() => setDay('ALL')}
                className={`min-h-[28px] px-2.5 rounded-full text-xs font-semibold transition-colors ${
                  day === 'ALL'
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                }`}
              >
                All
              </button>
              {DAYS_LIST.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(d)}
                  className={`min-h-[28px] px-2.5 rounded-full text-xs font-semibold transition-colors ${
                    day === d
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <span className="text-app-border hidden sm:inline">•</span>

            {/* Time Slot Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-text-muted font-medium">Time:</span>
              {(['ALL', 'Morning', 'Midday', 'Afternoon'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeSlot(t)}
                  className={`min-h-[28px] px-2.5 rounded-full text-xs font-semibold transition-colors ${
                    timeSlot === t
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                  }`}
                >
                  {t === 'ALL' ? 'All' : t}
                </button>
              ))}
            </div>

            <span className="text-app-border hidden sm:inline">•</span>

            {/* Type Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-text-muted font-medium">Type:</span>
              {(['ALL', 'theory', 'lab'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`min-h-[28px] px-2.5 rounded-full text-xs font-semibold transition-colors ${
                    kind === k
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                  }`}
                >
                  {k === 'ALL' ? 'All' : k === 'theory' ? 'Theory' : 'Lab'}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Status Summary + Quick Links */}
          <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-app-border/70">
            <span>
              Showing <strong className="text-text-primary">{filteredFaculty.length}</strong> of{' '}
              {allFaculty.length} faculty
            </span>

            <div className="flex items-center gap-3">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-orange-600 hover:text-orange-700 font-semibold underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear filters</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsLeaderboardsOpen(!isLeaderboardsOpen)}
                className="text-text-secondary hover:text-orange-600 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-orange-500" />
                <span>Leaderboards</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTBAOpen(!isTBAOpen)}
                className="text-text-secondary hover:text-orange-600 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>TBA ({totalTBACount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Panels: Leaderboards & TBA */}
        {isLeaderboardsOpen && (
          <div className="bg-surface rounded-card border border-app-border p-4 shadow-warm space-y-3">
            <div className="flex items-center justify-between border-b border-app-border pb-2">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-orange-500" />
                Teaching Load Leaderboards (Top 5)
              </h2>
              <button
                type="button"
                onClick={() => setIsLeaderboardsOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-bg-page rounded-lg p-3 border border-app-border space-y-2">
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" /> Most Sections
                </h3>
                <ol className="space-y-1.5 text-xs">
                  {leaderboards.mostSections.map((item, idx) => (
                    <li key={item.facultyId} className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => handleSelectFaculty(item.facultyId)}
                        className="truncate hover:text-orange-600 font-medium text-left"
                      >
                        <span className="text-text-muted font-bold mr-1">{idx + 1}.</span>
                        {item.name}
                      </button>
                      <span className="font-semibold text-text-primary text-[11px] bg-orange-100/80 px-1.5 py-0.2 rounded font-mono">
                        {item.metricValue}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-bg-page rounded-lg p-3 border border-app-border space-y-2">
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" /> Most Courses
                </h3>
                <ol className="space-y-1.5 text-xs">
                  {leaderboards.mostCourses.map((item, idx) => (
                    <li key={item.facultyId} className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => handleSelectFaculty(item.facultyId)}
                        className="truncate hover:text-orange-600 font-medium text-left"
                      >
                        <span className="text-text-muted font-bold mr-1">{idx + 1}.</span>
                        {item.name}
                      </button>
                      <span className="font-semibold text-text-primary text-[11px] bg-purple-100/80 px-1.5 py-0.2 rounded font-mono">
                        {item.metricValue}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-bg-page rounded-lg p-3 border border-app-border space-y-2">
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-600" /> Most Weekly Hours
                </h3>
                <ol className="space-y-1.5 text-xs">
                  {leaderboards.mostHours.map((item, idx) => (
                    <li key={item.facultyId} className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => handleSelectFaculty(item.facultyId)}
                        className="truncate hover:text-orange-600 font-medium text-left"
                      >
                        <span className="text-text-muted font-bold mr-1">{idx + 1}.</span>
                        {item.name}
                      </button>
                      <span className="font-semibold text-text-primary text-[11px] bg-sky-100/80 px-1.5 py-0.2 rounded font-mono">
                        {item.metricValue}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-bg-page rounded-lg p-3 border border-app-border space-y-2">
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-amber-600" /> 08:30 AM Starts
                </h3>
                <ol className="space-y-1.5 text-xs">
                  {leaderboards.mostFirstBell.map((item, idx) => (
                    <li key={item.facultyId} className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => handleSelectFaculty(item.facultyId)}
                        className="truncate hover:text-orange-600 font-medium text-left"
                      >
                        <span className="text-text-muted font-bold mr-1">{idx + 1}.</span>
                        {item.name}
                      </button>
                      <span className="font-semibold text-text-primary text-[11px] bg-amber-100/80 px-1.5 py-0.2 rounded font-mono">
                        {item.metricValue}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}

        {isTBAOpen && (
          <div className="bg-amber-50/60 rounded-card border border-amber-200 p-4 shadow-warm space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <h2 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                Unassigned Sections (Faculty TBA) — {totalTBACount} sections
              </h2>
              <button
                type="button"
                onClick={() => setIsTBAOpen(false)}
                className="p-1 text-amber-900 hover:text-amber-950 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
              {tbaGroups.map((group) => (
                <div
                  key={group.courseCode}
                  className="bg-surface rounded-lg p-2.5 border border-amber-200/80 space-y-1"
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

        {/* 2-PANE LAYOUT (Exact Course Directory Style: Left List, Right Details) */}
        {filteredFaculty.length === 0 ? (
          <div className="bg-surface rounded-card border border-app-border p-8 text-center space-y-3 shadow-warm">
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
        ) : (
          <div className="hidden md:grid md:grid-cols-[300px_1fr] lg:grid-cols-[minmax(340px,380px)_1fr] gap-6 items-start">
            {/* LEFT PANE: Sticky Scrollable Faculty List */}
            <section
              aria-label="Faculty List"
              role="listbox"
              tabIndex={0}
              className="bg-surface border border-app-border rounded-card shadow-warm p-2.5 space-y-1.5 sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto focus:outline-none"
            >
              {filteredFaculty.map((f) => {
                const isSelected = selectedFaculty?.id === f.id;

                return (
                  <button
                    key={f.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectFaculty(f.id)}
                    className={`w-full text-left p-3 rounded-card transition-all flex flex-col gap-1.5 border cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50/80 border-orange-300 border-l-[3px] border-l-orange-500 shadow-2xs ring-1 ring-orange-400/20'
                        : 'bg-page border-app-border hover:border-orange-200 hover:bg-subtle'
                    }`}
                  >
                    {/* Top row: Avatar + Name + Program */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs"
                        style={{
                          backgroundColor: f.avatarColor.bg,
                          color: f.avatarColor.text,
                          borderColor: f.avatarColor.border,
                        }}
                      >
                        {f.initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span
                          className={`font-bold text-xs block truncate ${
                            isSelected ? 'text-orange-950 font-extrabold' : 'text-text-primary'
                          }`}
                        >
                          <HighlightText text={f.name} query={search} />
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {f.programs.map((p) => (
                            <span
                              key={p}
                              className="text-[11px] font-semibold text-text-muted bg-subtle px-1.5 py-0.2 rounded border border-app-border"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Middle stats & badges chips */}
                    <div className="flex items-center justify-between gap-1 text-[11px] text-text-secondary pt-0.5">
                      <span>
                        <strong className="text-text-primary">{f.totalSections}</strong> sec ·{' '}
                        <strong className="text-text-primary">{f.distinctCourseCount}</strong> crs ·{' '}
                        <strong className="text-text-primary">{f.totalWeeklyHours}h</strong>
                      </span>

                      {/* Day dots */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {DAYS_LIST.map((d) => {
                          const isActive = f.activeDays.includes(d);
                          return (
                            <span
                              key={d}
                              className={`w-3.5 h-3.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                                isActive
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-app-border/70 text-text-muted/60'
                              }`}
                            >
                              {d[0]}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Badges preview row if any */}
                    {f.badges.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {f.badges.slice(0, 2).map((b) => (
                          <span
                            key={b.id}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.2 rounded border ${b.badgeStyle}`}
                          >
                            <BadgeIcon name={b.iconName} className="w-3 h-3" />
                            <span>{b.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </section>

            {/* RIGHT PANE: Selected Faculty Teaching Details */}
            {selectedFaculty && (
              <section aria-label="Faculty Teaching Details" className="space-y-4">
                {/* 1. Profile Header Card */}
                <div className="bg-surface rounded-card border border-app-border p-5 shadow-warm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shrink-0 border-2 shadow-xs"
                        style={{
                          backgroundColor: selectedFaculty.avatarColor.bg,
                          color: selectedFaculty.avatarColor.text,
                          borderColor: selectedFaculty.avatarColor.border,
                        }}
                      >
                        {selectedFaculty.initials}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {selectedFaculty.programs.map((p) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 rounded text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200"
                            >
                              {p}
                            </span>
                          ))}
                          <span className="text-xs text-text-muted">Dept. of CSE & Data Science</span>
                        </div>
                        <h2 className="text-xl font-bold text-text-primary tracking-tight">
                          {selectedFaculty.name}
                        </h2>
                        <p className="text-xs text-text-muted">
                          Fall 2026 Teaching Schedule & Assigned Sections
                        </p>
                      </div>
                    </div>

                    {/* Action: Copy Link */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="h-8 px-3 rounded-btn bg-surface hover:bg-orange-50 border border-app-border text-xs font-semibold text-text-primary hover:text-orange-600 transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                        title="Copy shareable link to this faculty"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Link copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-orange-500" />
                            <span>Copy link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Badges strip */}
                  {selectedFaculty.badges.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-app-border/60">
                      {selectedFaculty.badges.map((b) => (
                        <span
                          key={b.id}
                          title={b.description}
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs ${b.badgeStyle}`}
                        >
                          <BadgeIcon name={b.iconName} className="w-3.5 h-3.5" />
                          <span>{b.name}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 4 Quick Stat Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-app-border/80 text-center">
                    <div className="bg-bg-page rounded-xl p-2.5 border border-app-border/70">
                      <span className="block text-base font-bold text-text-primary">
                        {selectedFaculty.distinctCourseCount}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        Courses ({selectedFaculty.theoryCourseCount} Th, {selectedFaculty.labCourseCount} Lab)
                      </span>
                    </div>

                    <div className="bg-bg-page rounded-xl p-2.5 border border-app-border/70">
                      <span className="block text-base font-bold text-text-primary">
                        {selectedFaculty.totalSections}
                      </span>
                      <span className="text-[11px] text-text-muted">Total Sections</span>
                    </div>

                    <div className="bg-bg-page rounded-xl p-2.5 border border-app-border/70">
                      <span className="block text-base font-bold text-text-primary">
                        {selectedFaculty.totalCredits}
                      </span>
                      <span className="text-[11px] text-text-muted">Course Credits</span>
                    </div>

                    <div className="bg-bg-page rounded-xl p-2.5 border border-app-border/70">
                      <span className="block text-base font-bold text-text-primary">
                        {selectedFaculty.totalWeeklyHours}h
                      </span>
                      <span className="text-[11px] text-text-muted">Weekly Contact Hours</span>
                    </div>
                  </div>

                  {/* Info details row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-app-border/60">
                    <div>
                      <span className="text-text-muted block font-medium">Busiest Day:</span>
                      <span className="font-bold text-text-primary mt-0.5 block">
                        {selectedFaculty.busiestDay || 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block font-medium">Campus Days:</span>
                      <span className="font-bold text-text-primary mt-0.5 block">
                        {selectedFaculty.daysOnCampus} days ({selectedFaculty.activeDays.join(', ')})
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block font-medium">Earliest & Latest:</span>
                      <span className="font-bold text-text-primary mt-0.5 block">
                        {selectedFaculty.earliestStartTimeStr} – {selectedFaculty.latestEndTimeStr}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block font-medium">Time Breakdown:</span>
                      <span className="font-bold text-text-primary mt-0.5 block">
                        {selectedFaculty.slotCounts.morning}M · {selectedFaculty.slotCounts.midday}Mid ·{' '}
                        {selectedFaculty.slotCounts.afternoon}Aft
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Weekly Teaching Timetable */}
                <div className="bg-surface rounded-card border border-app-border p-4 shadow-warm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <h3 className="text-sm font-bold text-text-primary">
                        Weekly Teaching Timetable
                      </h3>
                    </div>
                    <span className="text-xs text-text-muted">Sat – Wed · 08:30 AM – 04:30 PM</span>
                  </div>

                  {/* Mini Timetable Grid */}
                  <div className="overflow-x-auto pb-1">
                    <div className="min-w-[560px]">
                      {/* Grid Header: Days */}
                      <div className="grid grid-cols-[50px_repeat(5,1fr)] gap-2 mb-2 text-center text-xs font-bold text-text-secondary">
                        <div className="text-text-muted font-normal text-[11px] self-end pb-1">Time</div>
                        {DAYS_LIST.map((d) => {
                          const isActive = selectedFaculty.activeDays.includes(d);
                          const count = selectedFaculty.weeklyPattern[d].count;
                          return (
                            <div
                              key={d}
                              className={`py-1 rounded-lg border text-xs font-semibold ${
                                isActive
                                  ? 'bg-orange-50 border-orange-200 text-orange-900 font-bold'
                                  : 'bg-bg-page border-app-border/80 text-text-muted'
                              }`}
                            >
                              <span>{d}</span>
                              {count > 0 && (
                                <span className="ml-1 text-[11px] text-orange-600 font-normal">
                                  ({count})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Grid Body: 480 minutes (08:30 to 16:30) */}
                      <div className="relative h-[360px] grid grid-cols-[50px_repeat(5,1fr)] gap-2 bg-bg-page rounded-xl border border-app-border p-2">
                        {/* Time Scale Column */}
                        <div className="relative h-full text-[11px] text-text-muted font-mono select-none">
                          {TIMETABLE_SLOTS.map((slot) => {
                            const topPct = ((slot.min - 510) / 480) * 100;
                            return (
                              <div
                                key={slot.min}
                                style={{ top: `${topPct}%` }}
                                className="absolute right-1 -translate-y-1/2"
                              >
                                {slot.label}
                              </div>
                            );
                          })}
                        </div>

                        {/* 5 Day Columns */}
                        {DAYS_LIST.map((d) => {
                          const dayPattern = selectedFaculty.weeklyPattern[d];
                          return (
                            <div
                              key={d}
                              className="relative h-full rounded-lg bg-surface/90 border border-app-border/60 overflow-hidden"
                            >
                              {/* Horizontal time guide lines */}
                              {TIMETABLE_SLOTS.map((slot) => {
                                const topPct = ((slot.min - 510) / 480) * 100;
                                return (
                                  <div
                                    key={slot.min}
                                    style={{ top: `${topPct}%` }}
                                    className="absolute left-0 right-0 border-t border-app-border/40 pointer-events-none"
                                  />
                                );
                              })}

                              {/* Class Blocks */}
                              {dayPattern.meetings.map((m, idx) => {
                                const topPct = ((m.start - 510) / 480) * 100;
                                const heightPct = Math.max(((m.end - m.start) / 480) * 100, 8);
                                const color = getCourseColor(m.courseCode);

                                return (
                                  <div
                                    key={`${m.courseCode}-${m.section}-${m.start}-${idx}`}
                                    style={{
                                      top: `${topPct}%`,
                                      height: `${heightPct}%`,
                                    }}
                                    className={`absolute left-1 right-1 p-1 rounded-btn border-l-4 border shadow-xs overflow-hidden flex flex-col justify-between ${
                                      color.bg
                                    } ${color.border} ${m.tentative ? 'border-dashed' : ''}`}
                                    title={`${m.courseCode} Sec ${m.section} (${formatMinutesToTime(
                                      m.start
                                    )} - ${formatMinutesToTime(m.end)})${m.room ? ` Rm ${m.room}` : ''}`}
                                  >
                                    <div className="flex items-center justify-between gap-1 leading-tight">
                                      <span className={`font-bold text-xs truncate ${color.text}`}>
                                        {m.courseCode}
                                      </span>
                                      <span className="text-[11px] font-bold px-1 rounded bg-surface/90 text-text-primary">
                                        {m.section}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-text-muted mt-0.5">
                                      <span>{formatMinutesToTime(m.start).replace(':00', '')}</span>
                                      {m.room && <span>Rm {m.room}</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Accessible screen reader alternative */}
                  <div className="pt-1 border-t border-app-border/60">
                    <details className="text-xs text-text-muted group">
                      <summary className="cursor-pointer font-medium hover:text-text-primary list-none flex items-center gap-1 select-none">
                        <span className="underline underline-offset-2">
                          View accessible timetable text list
                        </span>
                      </summary>
                      <div className="mt-2 space-y-1.5 bg-bg-page p-3 rounded-lg border border-app-border">
                        {DAYS_LIST.map((d) => {
                          const meetings = selectedFaculty.weeklyPattern[d].meetings;
                          if (meetings.length === 0) return null;
                          return (
                            <div key={d} className="space-y-0.5">
                              <span className="font-bold text-text-primary">{d}:</span>
                              <ul className="list-disc list-inside space-y-0.5 pl-2">
                                {meetings.map((m, i) => (
                                  <li key={i}>
                                    <strong>{m.courseCode}</strong> Section {m.section} (
                                    {formatMinutesToTime(m.start)} – {formatMinutesToTime(m.end)})
                                    {m.room ? `, Room ${m.room}` : ''} [{m.kind}]
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  </div>
                </div>

                {/* 3. Courses & Assigned Sections (Course Directory row design, NO prefer/avoid buttons) */}
                <div className="bg-surface rounded-card border border-app-border p-4 shadow-warm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-orange-500" />
                      <h3 className="text-sm font-bold text-text-primary">
                        Courses & Assigned Sections
                      </h3>
                    </div>
                    <span className="text-xs text-text-muted">
                      {selectedFaculty.courses.length} courses
                    </span>
                  </div>

                  <div className="space-y-3">
                    {selectedFaculty.courses.map((course) => (
                      <div
                        key={course.courseCode}
                        className="rounded-xl border border-app-border bg-bg-page overflow-hidden"
                      >
                        {/* Course Header with deep link to Course Directory */}
                        <div className="px-3.5 py-2.5 bg-surface border-b border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Link
                              href={`/faculty?c=${encodeURIComponent(course.courseCode)}`}
                              className="font-bold text-xs sm:text-sm text-text-primary hover:text-orange-600 transition-colors inline-flex items-center gap-1"
                              title="View this course in Course Directory"
                            >
                              <span>{course.courseCode}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-orange-500" />
                            </Link>
                            <span className="text-text-muted">·</span>
                            <span className="text-xs text-text-secondary truncate">
                              {course.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-xs">
                            <span className="px-2 py-0.5 rounded bg-bg-page border border-app-border text-text-muted font-medium text-[11px]">
                              {course.credit} Cr
                            </span>
                            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-900 font-semibold text-[11px]">
                              {course.sectionCount} {course.sectionCount === 1 ? 'sec' : 'secs'}
                            </span>
                          </div>
                        </div>

                        {/* Section Rows (UCAM Course Directory Style, strictly NO prefer/avoid buttons) */}
                        <div className="divide-y divide-app-border/60">
                          {course.sections.map((sec) => (
                            <div
                              key={sec.id}
                              className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-orange-50/20 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-lg bg-orange-500 text-white font-bold flex items-center justify-center shrink-0">
                                  {sec.section}
                                </span>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-text-primary">
                                      Section {sec.section}
                                    </span>
                                    <span className="text-[11px] font-semibold text-text-muted uppercase px-1.5 py-0.2 rounded bg-surface border border-app-border">
                                      {sec.kind}
                                    </span>
                                    {sec.tentative && (
                                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                                        Tentative
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-text-muted text-[11px]">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-orange-500" />
                                      {sec.days.join(', ')} · {sec.timeRange}
                                    </span>
                                    {sec.room && (
                                      <span className="inline-flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-text-muted" />
                                        Room {sec.room}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2 py-0.5 rounded-btn bg-surface border border-app-border text-text-secondary font-mono text-[11px]">
                                  {sec.timeRange}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Teaches With (Co-instructors) */}
                {selectedFaculty.teachesWith.length > 0 && (
                  <div className="bg-surface rounded-card border border-app-border p-4 shadow-warm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-orange-500" />
                        <h3 className="text-sm font-bold text-text-primary">
                          Teaches With (Co-Instructors)
                        </h3>
                      </div>
                      <span className="text-xs text-text-muted">Shares the same courses</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {selectedFaculty.teachesWith.map((co) => (
                        <button
                          key={co.facultyId}
                          type="button"
                          onClick={() => handleSelectFaculty(co.facultyId)}
                          className="bg-bg-page hover:bg-orange-50/60 rounded-xl border border-app-border hover:border-orange-300 p-2.5 transition-colors text-left group cursor-pointer"
                        >
                          <span className="text-xs font-bold text-text-primary group-hover:text-orange-600 truncate block transition-colors">
                            {co.facultyName}
                          </span>
                          <span className="text-[11px] text-text-muted block truncate mt-0.5">
                            Shares: {co.sharedCourses.join(', ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* MOBILE (< 768px): Accordion Style (Exact Course Directory Experience) */}
        {filteredFaculty.length > 0 && (
          <div className="md:hidden space-y-2.5">
            {filteredFaculty.map((f) => {
              const isExpanded = expandedMobileFacultyId === f.id;

              return (
                <div
                  key={f.id}
                  className={`bg-surface rounded-card border transition-all duration-150 overflow-hidden ${
                    isExpanded
                      ? 'border-orange-400 ring-2 ring-orange-500/20 shadow-warm'
                      : 'border-app-border'
                  }`}
                >
                  {/* Accordion Trigger Header */}
                  <button
                    type="button"
                    onClick={() => handleSelectFaculty(f.id)}
                    className="w-full text-left p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs"
                        style={{
                          backgroundColor: f.avatarColor.bg,
                          color: f.avatarColor.text,
                          borderColor: f.avatarColor.border,
                        }}
                      >
                        {f.initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-sm text-text-primary block truncate">
                          <HighlightText text={f.name} query={search} />
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-secondary">
                          <span>
                            {f.totalSections} sections · {f.distinctCourseCount} courses · {f.totalWeeklyHours}h
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-orange-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-text-muted" />
                      )}
                    </div>
                  </button>

                  {/* Accordion Expanded Content */}
                  {isExpanded && (
                    <div className="p-3.5 border-t border-app-border/80 bg-bg-page space-y-3.5">
                      {/* Programs & Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {f.programs.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200"
                          >
                            {p}
                          </span>
                        ))}
                        {f.badges.map((b) => (
                          <span
                            key={b.id}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${b.badgeStyle}`}
                          >
                            <BadgeIcon name={b.iconName} className="w-3 h-3" />
                            <span>{b.name}</span>
                          </span>
                        ))}
                      </div>

                      {/* Timetable Mini */}
                      <div className="bg-surface rounded-xl border border-app-border p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-text-primary flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-orange-500" /> Weekly Timetable
                          </span>
                          <span className="text-[11px] text-text-muted">
                            {f.daysOnCampus} days ({f.activeDays.join(', ')})
                          </span>
                        </div>

                        {/* Accessible daily schedule list */}
                        <div className="space-y-1.5 text-xs pt-1 border-t border-app-border/60">
                          {DAYS_LIST.map((d) => {
                            const meetings = f.weeklyPattern[d].meetings;
                            if (meetings.length === 0) return null;
                            return (
                              <div key={d} className="space-y-0.5">
                                <span className="font-bold text-orange-700">{d}:</span>
                                <div className="space-y-1 pl-2">
                                  {meetings.map((m, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between bg-bg-page px-2 py-1 rounded border border-app-border text-[11px]"
                                    >
                                      <span className="font-bold text-text-primary">
                                        {m.courseCode} Sec {m.section}
                                      </span>
                                      <span className="text-text-muted font-mono">
                                        {formatMinutesToTime(m.start)}–{formatMinutesToTime(m.end)}
                                        {m.room ? ` · Rm ${m.room}` : ''}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Course and Section list */}
                      <div className="space-y-2">
                        <span className="font-bold text-xs text-text-primary block">
                          Assigned Courses ({f.courses.length})
                        </span>
                        {f.courses.map((c) => (
                          <div
                            key={c.courseCode}
                            className="bg-surface rounded-lg border border-app-border p-2.5 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <Link
                                href={`/faculty?c=${encodeURIComponent(c.courseCode)}`}
                                className="font-bold text-xs text-text-primary hover:text-orange-600 inline-flex items-center gap-1"
                              >
                                <span>{c.courseCode}</span>
                                <ExternalLink className="w-3 h-3 text-orange-500" />
                              </Link>
                              <span className="text-[11px] text-text-muted">{c.credit} Cr</span>
                            </div>
                            <p className="text-[11px] text-text-muted truncate">{c.title}</p>
                            <div className="divide-y divide-app-border/60 pt-1">
                              {c.sections.map((sec) => (
                                <div
                                  key={sec.id}
                                  className="py-1 flex items-center justify-between text-[11px]"
                                >
                                  <span className="font-bold text-text-primary">
                                    Sec {sec.section}
                                  </span>
                                  <span className="text-text-secondary">
                                    {sec.days.join(', ')} · {sec.timeRange}
                                  </span>
                                  {sec.room && (
                                    <span className="text-text-muted">Rm {sec.room}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Note */}
        <p className="text-[11px] text-text-muted text-center pt-2">
          Based on the Fall 2026 offering PDF. Assignments may change.
        </p>
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
