'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  Check,
  Plus,
  Copy,
  ExternalLink,
  AlertTriangle,
  Calendar,
  Clock,
  BookOpen,
  ArrowRight,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

import sectionsJson from '../../../data/sections.json';
import coursesJson from '../../../data/courses.json';
import facultyJson from '../../../data/faculty.json';
import { Course, Faculty, Section, SolveRequest } from '../../types';
import {
  buildFacultyIndex,
  filterFacultyList,
  sortFacultyList,
  generateCopyScheduleText,
  FacultyEntry,
  FacultySortOption,
} from '../../lib/facultyIndex';
import { SiteNav } from '../../components/SiteNav';
import { getCourseColor } from '../../utils/colors';
import { formatTime24 } from '../../utils/export';
import { serializeToParams } from '../../utils/urlSync';

const allSections = sectionsJson as unknown as Section[];
const allCourses = coursesJson as unknown as Course[];
const allFaculty = facultyJson as unknown as Faculty[];

const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed'] as const;
const DAY_LABELS: Record<string, string> = {
  Sat: 'Saturday',
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
};

const TIME_OF_DAY_SLOTS = ['Morning', 'Midday', 'Afternoon'] as const;

function FacultyDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Build Index once
  const facultyIndex = useMemo(
    () => buildFacultyIndex(allSections, allCourses, allFaculty),
    []
  );

  // 2. Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<'ALL' | 'BSCSE' | 'BSDS'>('ALL');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [dayFilter, setDayFilter] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<('Morning' | 'Midday' | 'Afternoon')[]>([]);
  const [sortBy, setSortBy] = useState<FacultySortOption>('a-z');

  // Selected faculty slug
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Mobile drawer state
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Shared builder state
  const [builderRequest, setBuilderRequest] = useState<Partial<SolveRequest>>({
    selectedCourses: [],
    preferredFaculty: {},
    avoidFaculty: {},
  });

  // Load shared builder request from storage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored =
        sessionStorage.getItem('uiu_routine_builder_state') ||
        localStorage.getItem('uiu_routine_builder_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        setBuilderRequest(parsed);
      }
    } catch (e) {
      console.warn('Failed to read builder state:', e);
    }
  }, []);

  // Save builder request back to storage whenever it changes
  const updateSharedRequest = (updater: (prev: Partial<SolveRequest>) => Partial<SolveRequest>) => {
    setBuilderRequest((prev) => {
      const next = updater(prev);
      try {
        sessionStorage.setItem('uiu_routine_builder_state', JSON.stringify(next));
        localStorage.setItem('uiu_routine_builder_state', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save builder state:', e);
      }
      return next;
    });
  };

  // Sync selected slug from URL query
  useEffect(() => {
    const slugFromUrl = searchParams.get('f');
    if (slugFromUrl) {
      setSelectedSlug(slugFromUrl);
      if (window.innerWidth < 1024) {
        setMobileDetailOpen(true);
      }
    } else if (facultyIndex.length > 0 && window.innerWidth >= 1024) {
      // Default to first on desktop if none specified
      setSelectedSlug(facultyIndex[0].id);
    }
  }, [searchParams, facultyIndex]);

  // Handle faculty selection and URL updating
  const handleSelectFaculty = (slug: string) => {
    setSelectedSlug(slug);
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('f', slug);
    window.history.pushState(null, '', `?${newParams.toString()}`);
    if (window.innerWidth < 1024) {
      setMobileDetailOpen(true);
    }
  };

  // Filter and sort the faculty entries
  const filteredFaculty = useMemo(() => {
    const filtered = filterFacultyList(facultyIndex, {
      search: searchQuery,
      program: programFilter,
      course: courseFilter,
      days: dayFilter,
      timeSlots: timeFilter,
    });
    return sortFacultyList(filtered, sortBy);
  }, [facultyIndex, searchQuery, programFilter, courseFilter, dayFilter, timeFilter, sortBy]);

  // Selected faculty entry
  const selectedFaculty = useMemo(() => {
    if (!selectedSlug) return filteredFaculty[0] || null;
    return (
      facultyIndex.find((f) => f.id === selectedSlug) ||
      filteredFaculty[0] ||
      null
    );
  }, [facultyIndex, selectedSlug, filteredFaculty]);

  // Global keyboard shortcuts (Arrows to navigate faculty, Esc to close mobile sheet)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName || '')) {
        return;
      }
      if (e.key === 'Escape') {
        if (mobileDetailOpen) {
          e.preventDefault();
          setMobileDetailOpen(false);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIdx = filteredFaculty.findIndex((f) => f.id === selectedFaculty?.id);
        const nextIdx = Math.min(filteredFaculty.length - 1, currentIdx + 1);
        if (filteredFaculty[nextIdx]) {
          handleSelectFaculty(filteredFaculty[nextIdx].id);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = filteredFaculty.findIndex((f) => f.id === selectedFaculty?.id);
        const prevIdx = Math.max(0, currentIdx - 1);
        if (filteredFaculty[prevIdx]) {
          handleSelectFaculty(filteredFaculty[prevIdx].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileDetailOpen, filteredFaculty, selectedFaculty]);

  // List of unique courses for course dropdown filter
  const uniqueCourses = useMemo(() => {
    const set = new Set<string>();
    for (const f of facultyIndex) {
      for (const c of f.courseCodes) set.add(c);
    }
    return Array.from(set).sort();
  }, [facultyIndex]);

  // Check active filter count
  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (programFilter !== 'ALL' ? 1 : 0) +
    (courseFilter !== 'ALL' ? 1 : 0) +
    dayFilter.length +
    timeFilter.length;

  const clearAllFilters = () => {
    setSearchQuery('');
    setProgramFilter('ALL');
    setCourseFilter('ALL');
    setDayFilter([]);
    setTimeFilter([]);
    setSortBy('a-z');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Actions for selected faculty
  const handleToggleCourse = (courseCode: string) => {
    const isSelected = builderRequest.selectedCourses?.includes(courseCode);
    updateSharedRequest((prev) => {
      const current = prev.selectedCourses || [];
      const nextCourses = isSelected
        ? current.filter((c) => c !== courseCode)
        : [...current, courseCode];
      return {
        ...prev,
        selectedCourses: nextCourses,
      };
    });
    showToast(
      isSelected
        ? `Removed ${courseCode} from selection`
        : `Added ${courseCode} to selection`
    );
  };

  const handleTogglePreference = (
    type: 'prefer' | 'avoid',
    courseCode: string,
    facultyId: string
  ) => {
    // If course isn't in selectedCourses yet, auto-add it
    const isCourseSelected = builderRequest.selectedCourses?.includes(courseCode);
    let autoAdded = false;

    updateSharedRequest((prev) => {
      const selectedCourses = isCourseSelected
        ? prev.selectedCourses || []
        : [...(prev.selectedCourses || []), courseCode];
      if (!isCourseSelected) autoAdded = true;

      const prefCurrent = prev.preferredFaculty?.[courseCode] || [];
      const avoidCurrent = prev.avoidFaculty?.[courseCode] || [];

      if (type === 'prefer') {
        const isPref = prefCurrent.includes(facultyId);
        const nextPref = isPref
          ? prefCurrent.filter((id) => id !== facultyId)
          : [...prefCurrent, facultyId];
        const nextAvoid = avoidCurrent.filter((id) => id !== facultyId);

        return {
          ...prev,
          selectedCourses,
          preferredFaculty: { ...prev.preferredFaculty, [courseCode]: nextPref },
          avoidFaculty: { ...prev.avoidFaculty, [courseCode]: nextAvoid },
        };
      } else {
        const isAvoid = avoidCurrent.includes(facultyId);
        const nextAvoid = isAvoid
          ? avoidCurrent.filter((id) => id !== facultyId)
          : [...avoidCurrent, facultyId];
        const nextPref = prefCurrent.filter((id) => id !== facultyId);

        return {
          ...prev,
          selectedCourses,
          preferredFaculty: { ...prev.preferredFaculty, [courseCode]: nextPref },
          avoidFaculty: { ...prev.avoidFaculty, [courseCode]: nextAvoid },
        };
      }
    });

    if (autoAdded) {
      showToast(`Added ${courseCode} to selection and updated preference`);
    } else {
      showToast(`Updated preference for ${courseCode}`);
    }
  };

  const handleCopySchedule = async () => {
    if (!selectedFaculty) return;
    const text = generateCopyScheduleText(selectedFaculty);
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied schedule to clipboard!');
    } catch (e) {
      showToast('Failed to copy schedule.');
    }
  };

  // Build "Open in builder" URL
  const openInBuilderUrl = useMemo(() => {
    if (!selectedFaculty) return '/builder';
    const courses = selectedFaculty.courseCodes;
    const prefObj: Record<string, string[]> = {};
    for (const c of courses) {
      prefObj[c] = [selectedFaculty.id];
    }
    const params = serializeToParams({
      selectedCourses: courses,
      preferredFaculty: prefObj,
    });
    return `/builder?${params}`;
  }, [selectedFaculty]);

  // Alphabet jump bar letters
  const alphabetLetters = useMemo(() => {
    const letters = new Set<string>();
    for (const f of facultyIndex) {
      const firstChar = f.name.trim().charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstChar)) letters.add(firstChar);
    }
    return Array.from(letters).sort();
  }, [facultyIndex]);

  const scrollToLetter = (letter: string) => {
    const el = document.getElementById(`faculty-letter-${letter}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-page text-text-primary">
      {/* 1. Shared Navigation */}
      <SiteNav />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-card bg-text-primary text-white text-xs font-semibold shadow-warm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Page Sub-Header */}
      <div className="border-b border-app-border bg-surface">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
                Faculty Directory
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold">
                {facultyIndex.length} Teachers
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Browse weekly schedules, assigned sections, and configure preferences across BSCSE &amp; BSDS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/builder"
              className="px-3.5 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Go to Routine Builder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Pane Layout */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-[minmax(340px,400px)_1fr] gap-6 items-start">
        {/* LEFT PANE: Searchable, Filterable Faculty List */}
        <section
          aria-label="Faculty List"
          className="bg-surface border border-app-border rounded-card shadow-warm p-4 space-y-4 lg:sticky lg:top-20 max-h-[calc(100vh-100px)] overflow-hidden flex flex-col"
        >
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search faculty name or course code..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-btn border border-app-border bg-page placeholder:text-text-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Chips & Controls */}
          <div className="space-y-3 text-xs border-b border-app-border pb-3">
            {/* Program Chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-text-muted w-14">Program:</span>
              {(['ALL', 'BSCSE', 'BSDS'] as const).map((prog) => (
                <button
                  key={prog}
                  onClick={() => setProgramFilter(prog)}
                  className={`px-2.5 py-1 rounded-chip text-[11px] font-semibold transition-all ${
                    programFilter === prog
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                  }`}
                >
                  {prog}
                </button>
              ))}
            </div>

            {/* Course Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-text-muted w-14">Course:</span>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="flex-1 py-1 px-2 text-[11px] rounded border border-app-border bg-page text-text-primary focus:outline-none focus:border-orange-500"
              >
                <option value="ALL">All Courses ({uniqueCourses.length})</option>
                {uniqueCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Day Chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-text-muted w-14">Days:</span>
              <div className="flex flex-wrap gap-1">
                {DAYS.map((day) => {
                  const isActive = dayFilter.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() =>
                        setDayFilter(
                          isActive
                            ? dayFilter.filter((d) => d !== day)
                            : [...dayFilter, day]
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        isActive
                          ? 'bg-orange-600 text-white font-bold'
                          : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time of Day Chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-text-muted w-14">Time:</span>
              <div className="flex flex-wrap gap-1">
                {TIME_OF_DAY_SLOTS.map((slot) => {
                  const isActive = timeFilter.includes(slot);
                  return (
                    <button
                      key={slot}
                      onClick={() =>
                        setTimeFilter(
                          isActive
                            ? timeFilter.filter((t) => t !== slot)
                            : [...timeFilter, slot]
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        isActive
                          ? 'bg-orange-600 text-white font-bold'
                          : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort & Filter Status Bar */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-text-muted">Sort:</span>
                {(
                  [
                    { id: 'a-z', label: 'A–Z' },
                    { id: 'most-sections', label: 'Sections' },
                    { id: 'most-courses', label: 'Courses' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSortBy(s.id)}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      sortBy === s.id
                        ? 'text-orange-600 font-bold bg-orange-50 border border-orange-200'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear filters ({activeFiltersCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Desktop Alphabet Letter Jump Bar (if >60 entries) */}
          {facultyIndex.length > 60 && (
            <div className="hidden lg:flex flex-wrap gap-1 items-center justify-center py-1 px-1 bg-subtle rounded border border-app-border text-[10px] text-text-muted font-bold">
              {alphabetLetters.map((letter) => (
                <button
                  key={letter}
                  onClick={() => scrollToLetter(letter)}
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-orange-500 hover:text-white transition-colors"
                >
                  {letter}
                </button>
              ))}
            </div>
          )}

          {/* List Header Count */}
          <div className="text-xs font-semibold text-text-secondary flex items-center justify-between px-1">
            <span>
              Showing {filteredFaculty.length} of {facultyIndex.length} faculty
            </span>
          </div>

          {/* Scrollable Faculty List */}
          <div
            role="listbox"
            aria-label="Faculty Directory"
            className="flex-1 overflow-y-auto space-y-1.5 pr-1 focus:outline-none"
            tabIndex={0}
          >
            {filteredFaculty.length === 0 ? (
              <div className="p-8 text-center rounded-card border border-dashed border-app-border text-xs text-text-muted space-y-2">
                <p>No faculty match the selected criteria.</p>
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-1.5 rounded-btn bg-surface hover:bg-subtle text-text-primary font-semibold border border-app-border shadow-2xs inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3 text-orange-500" />
                  <span>Clear filters</span>
                </button>
              </div>
            ) : (
              filteredFaculty.map((fac, idx) => {
                const isSelected = selectedFaculty?.id === fac.id;
                const firstLetter = fac.name.trim().charAt(0).toUpperCase();
                const isFirstOfLetter =
                  idx === 0 ||
                  filteredFaculty[idx - 1].name.trim().charAt(0).toUpperCase() !==
                    firstLetter;

                return (
                  <React.Fragment key={fac.id}>
                    {isFirstOfLetter && (
                      <div
                        id={`faculty-letter-${firstLetter}`}
                        className="text-[10px] font-black text-text-muted uppercase tracking-wider px-2 pt-2 pb-0.5"
                      >
                        {firstLetter}
                      </div>
                    )}
                    <button
                      role="option"
                      aria-selected={isSelected}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => handleSelectFaculty(fac.id)}
                      className={`w-full text-left p-2.5 rounded-card transition-all flex flex-col gap-1.5 border ${
                        isSelected
                          ? 'bg-orange-50 border-orange-300 shadow-2xs ring-1 ring-orange-400/40'
                          : 'bg-page border-app-border hover:border-orange-200 hover:bg-subtle'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold text-xs truncate ${
                            isSelected ? 'text-orange-950 font-extrabold' : 'text-text-primary'
                          }`}
                        >
                          {fac.name}
                        </span>
                        {fac.hasClash && (
                          <span
                            title="Schedule has overlapping section slots"
                            className="p-0.5 rounded text-amber-600 bg-amber-50 border border-amber-200"
                          >
                            <AlertTriangle className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-text-muted">
                        <span>
                          {fac.courseCodes.length} course{fac.courseCodes.length > 1 ? 's' : ''} •{' '}
                          {fac.totalSections} section{fac.totalSections > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Course chips (up to 3 + more) */}
                      <div className="flex flex-wrap gap-1 items-center">
                        {fac.courseCodes.slice(0, 3).map((code) => (
                          <span
                            key={code}
                            className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-surface text-text-secondary border border-app-border"
                          >
                            {code}
                          </span>
                        ))}
                        {fac.courseCodes.length > 3 && (
                          <span className="text-[10px] text-text-muted font-semibold">
                            +{fac.courseCodes.length - 3} more
                          </span>
                        )}
                      </div>
                    </button>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </section>

        {/* RIGHT PANE: Details of Selected Faculty (Desktop View) */}
        <section
          aria-label="Faculty Details"
          className="hidden lg:block space-y-6"
        >
          {selectedFaculty ? (
            <FacultyDetailView
              faculty={selectedFaculty}
              builderRequest={builderRequest}
              onToggleCourse={handleToggleCourse}
              onTogglePreference={handleTogglePreference}
              onCopySchedule={handleCopySchedule}
              openInBuilderUrl={openInBuilderUrl}
            />
          ) : (
            <div className="p-12 text-center rounded-card bg-surface border border-app-border text-text-muted">
              Select a faculty member from the list to view their timetable and sections.
            </div>
          )}
        </section>
      </main>

      {/* MOBILE FULL-SCREEN SHEET for Selected Faculty Details */}
      {mobileDetailOpen && selectedFaculty && (
        <div
          role="dialog"
          aria-modal="true"
          className="lg:hidden fixed inset-0 z-50 bg-page flex flex-col animate-in slide-in-from-bottom-4 duration-200"
        >
          {/* Mobile Sheet Header */}
          <div className="p-4 border-b border-app-border bg-surface flex items-center justify-between sticky top-0 z-10">
            <button
              onClick={() => setMobileDetailOpen(false)}
              className="text-xs font-semibold text-orange-600 flex items-center gap-1"
            >
              <span>← Back to list</span>
            </button>
            <button
              onClick={() => setMobileDetailOpen(false)}
              className="p-1 text-text-muted hover:text-text-primary rounded"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Sheet Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <FacultyDetailView
              faculty={selectedFaculty}
              builderRequest={builderRequest}
              onToggleCourse={handleToggleCourse}
              onTogglePreference={handleTogglePreference}
              onCopySchedule={handleCopySchedule}
              openInBuilderUrl={openInBuilderUrl}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component: FacultyDetailView (used on both desktop right pane & mobile sheet)
// -----------------------------------------------------------------------------
interface FacultyDetailViewProps {
  faculty: FacultyEntry;
  builderRequest: Partial<SolveRequest>;
  onToggleCourse: (courseCode: string) => void;
  onTogglePreference: (type: 'prefer' | 'avoid', courseCode: string, facultyId: string) => void;
  onCopySchedule: () => void;
  openInBuilderUrl: string;
}

function FacultyDetailView({
  faculty,
  builderRequest,
  onToggleCourse,
  onTogglePreference,
  onCopySchedule,
  openInBuilderUrl,
}: FacultyDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="p-5 rounded-card bg-surface border border-app-border shadow-warm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary">
                {faculty.name}
              </h2>
              {faculty.programs.map((p) => (
                <span
                  key={p}
                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-50 text-orange-600 border border-orange-200"
                >
                  {p}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary flex-wrap">
              <span className="font-semibold">{faculty.courseCodes.length} Courses</span>
              <span className="text-border-strong">•</span>
              <span className="font-semibold">{faculty.totalSections} Sections</span>
              <span className="text-border-strong">•</span>
              <span className="font-semibold">{faculty.totalWeeklySlots} Weekly Teaching Slots</span>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onCopySchedule}
              className="px-3 py-1.5 rounded-btn bg-surface hover:bg-subtle text-text-primary font-semibold text-xs border border-app-border shadow-2xs flex items-center gap-1.5 transition-colors"
              title="Copy plain text schedule"
            >
              <Copy className="w-3.5 h-3.5 text-text-muted" />
              <span>Copy schedule</span>
            </button>

            <Link
              href={openInBuilderUrl}
              className="px-3.5 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-warm flex items-center gap-1.5 transition-colors"
              title="Open routine builder with this faculty preferred"
            >
              <span>Open in builder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Schedule Clash Warning Alert (if any) */}
        {faculty.hasClash && (
          <div className="p-3 rounded-btn bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Overlapping Section Notice: </span>
              In the official published schedule, this faculty has 2 or more teaching sections scheduled at the same time on the same day. These are flagged with an orange warning border below.
            </div>
          </div>
        )}
      </div>

      {/* 2. Mini Weekly Timetable (Sat–Wed, 08:30–16:30) */}
      <div className="p-5 rounded-card bg-surface border border-app-border shadow-warm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-app-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-sm text-text-primary">Weekly Teaching Timetable</h3>
          </div>
          <span className="text-[11px] text-text-muted">Sat–Wed • 08:30–16:30</span>
        </div>

        {/* Timetable Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[600px] border border-app-border rounded-lg overflow-hidden bg-page">
            {/* Day Header Row */}
            <div className="grid grid-cols-5 border-b border-app-border bg-subtle text-center text-xs font-bold text-text-secondary py-2">
              {DAYS.map((d) => (
                <div key={d} className="border-r last:border-r-0 border-app-border">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid Columns */}
            <div className="grid grid-cols-5 min-h-[220px] bg-surface relative divide-x divide-app-border">
              {DAYS.map((day) => {
                const dayBlocks = faculty.timetableBlocks.filter((b) => b.day === day);
                dayBlocks.sort((a, b) => a.start - b.start);

                return (
                  <div key={day} className="p-1.5 space-y-1.5 flex flex-col justify-start">
                    {dayBlocks.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[10px] text-text-muted italic py-6">
                        No classes
                      </div>
                    ) : (
                      dayBlocks.map((block, i) => {
                        const courseColor = getCourseColor(block.courseCode);
                        return (
                          <div
                            key={`${block.courseCode}-${block.section}-${block.start}-${i}`}
                            style={{
                              backgroundColor: courseColor.bg,
                              borderLeftColor: block.isClashing ? '#DC2626' : courseColor.border,
                            }}
                            className={`p-2 rounded border border-app-border border-l-4 text-left transition-transform hover:scale-[1.02] shadow-2xs ${
                              block.isClashing ? 'ring-1 ring-danger' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                style={{ color: courseColor.text }}
                                className="font-bold text-xs truncate"
                              >
                                {block.courseCode} ({block.section})
                              </span>
                              {block.isClashing && (
                                <AlertTriangle className="w-3 h-3 text-danger shrink-0 ml-1" />
                              )}
                            </div>
                            <div className="text-[10px] text-text-muted mt-0.5">
                              {formatTime24(block.start)}–{formatTime24(block.end)}
                            </div>
                            {block.room && (
                              <div className="text-[10px] text-text-secondary font-medium">
                                Room {block.room}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sections Grouped by Course */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-text-primary">
            Course Offerings &amp; Section Details
          </h3>
          <span className="text-xs text-text-muted">
            {faculty.courses.length} course group{faculty.courses.length > 1 ? 's' : ''}
          </span>
        </div>

        {faculty.courses.map((cg) => {
          const isCourseSelected = builderRequest.selectedCourses?.includes(cg.courseCode);
          const prefList = builderRequest.preferredFaculty?.[cg.courseCode] || [];
          const avoidList = builderRequest.avoidFaculty?.[cg.courseCode] || [];
          const isPreferred = prefList.includes(faculty.id);
          const isAvoided = avoidList.includes(faculty.id);

          return (
            <div
              key={cg.courseCode}
              className="p-5 rounded-card bg-surface border border-app-border shadow-warm space-y-4"
            >
              {/* Course Title & Global Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-app-border">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-text-primary">
                      {cg.courseCode}
                    </span>
                    <span className="text-xs font-semibold text-text-secondary">
                      {cg.courseTitle}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-subtle text-text-muted border border-app-border">
                      {cg.credit} Cr
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                      {cg.program}
                    </span>
                  </div>
                </div>

                {/* Course Header Buttons */}
                <div className="flex items-center gap-2">
                  {/* Add / Selected Course Button */}
                  <button
                    onClick={() => onToggleCourse(cg.courseCode)}
                    className={`px-3 py-1.5 rounded-btn text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isCourseSelected
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-orange-500 hover:bg-orange-600 text-white shadow-2xs'
                    }`}
                  >
                    {isCourseSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Selected ✓</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add course</span>
                      </>
                    )}
                  </button>

                  {/* View course explorer link */}
                  <Link
                    href={`/builder?course=${cg.courseCode}`}
                    className="px-2.5 py-1.5 rounded-btn bg-surface hover:bg-subtle text-text-secondary hover:text-text-primary text-xs font-medium border border-app-border flex items-center gap-1 transition-colors"
                    title="Open course details in the builder panel"
                  >
                    <span>Course explorer</span>
                    <ExternalLink className="w-3 h-3 text-text-muted" />
                  </Link>
                </div>
              </div>

              {/* Prefer / Avoid buttons for this course */}
              <div className="flex items-center justify-between bg-page p-2.5 rounded-btn border border-app-border text-xs">
                <span className="text-text-muted font-medium">
                  Preference for {faculty.name} in {cg.courseCode}:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onTogglePreference('prefer', cg.courseCode, faculty.id)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      isPreferred
                        ? 'bg-success text-white shadow-2xs'
                        : 'bg-surface text-text-secondary hover:text-success border border-app-border'
                    }`}
                  >
                    Prefer {isPreferred ? '✓' : ''}
                  </button>
                  <button
                    onClick={() => onTogglePreference('avoid', cg.courseCode, faculty.id)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      isAvoided
                        ? 'bg-danger text-white shadow-2xs'
                        : 'bg-surface text-text-secondary hover:text-danger border border-app-border'
                    }`}
                  >
                    Avoid {isAvoided ? '✓' : ''}
                  </button>
                </div>
              </div>

              {/* Section Rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {cg.sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="p-3 rounded-btn bg-page border border-app-border space-y-1.5 text-xs text-left transition-colors hover:border-orange-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary">
                          Section {sec.section}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-text-muted">
                          ({sec.kind})
                        </span>
                      </div>
                      {sec.tentative && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Tentative
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-text-secondary space-y-0.5">
                      {sec.meetings.map((m, mi) => (
                        <div key={mi} className="flex items-center justify-between">
                          <span className="font-medium text-text-primary">
                            {DAY_LABELS[m.day] || m.day}: {formatTime24(m.start)}–{formatTime24(m.end)}
                          </span>
                          <span className="text-text-muted">
                            {m.room ? `Room ${m.room}` : 'TBA Room'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FacultyDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-page flex items-center justify-center text-xs text-text-muted">
          Loading faculty directory...
        </div>
      }
    >
      <FacultyDirectoryContent />
    </Suspense>
  );
}
