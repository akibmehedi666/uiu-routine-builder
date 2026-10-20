'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  X,
  Check,
  Plus,
  Copy,
  ChevronDown,
  ChevronRight,
  Clock,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  Sparkles,
  UserCheck,
  UserX,
  Users,
  BookOpen,
} from 'lucide-react';

import sectionsJson from '../../../data/sections.json';
import coursesJson from '../../../data/courses.json';
import { Course, Day, DAYS_LIST, Meeting, Section, SolveRequest } from '../../types';
import {
  buildCourseDirectory,
  filterCourses,
  sortCourses,
  filterCourseSections,
  groupSectionsByFaculty,
  getFacultyCrossReferences,
  generateCopyCourseSections,
  CourseDirectoryItem,
  CourseDirectorySection,
  CourseSortOption,
  FacultyCrossReferenceItem,
} from '../../lib/courseDirectory';
import { SiteNav } from '../../components/SiteNav';
import { getCourseColor } from '../../utils/colors';
import { formatTime24 } from '../../utils/export';

const allSections = sectionsJson as unknown as Section[];
const allCourses = coursesJson as unknown as Course[];

const DAYS: Day[] = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
const DAY_FULL_NAMES: Record<Day, string> = {
  Sat: 'Saturday',
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
};

const CREDIT_OPTIONS = ['ALL', 1, 2, 3] as const;
const TIME_OF_DAY_SLOTS = ['Morning', 'Midday', 'Afternoon'] as const;

function CourseDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Build course directory index once
  const courseDirectory = useMemo(
    () => buildCourseDirectory(allCourses, allSections),
    []
  );

  // 2. Global Toolbar filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<'ALL' | 'BSCSE' | 'BSDS'>('ALL');
  const [creditFilter, setCreditFilter] = useState<'ALL' | number>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'theory' | 'lab'>('ALL');
  const [sortBy, setSortBy] = useState<CourseSortOption>('code-az');

  // Selected / Expanded course code
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(null);

  // Mobile accordion expanded course codes
  const [expandedMobileCodes, setExpandedMobileCodes] = useState<Set<string>>(new Set());

  // 3. Within-course section filter state
  const [facultySearch, setFacultySearch] = useState('');
  const [dayFilter, setDayFilter] = useState<Day[]>([]);
  const [timeFilter, setTimeFilter] = useState<('Morning' | 'Midday' | 'Afternoon')[]>([]);
  const [sectionSortBy, setSectionSortBy] = useState<'section' | 'faculty' | 'time'>('section');
  const [groupByFaculty, setGroupByFaculty] = useState(false);

  // 4. Faculty popover state for cross-referencing
  const [popoverFaculty, setPopoverFaculty] = useState<{
    name: string;
    courseCode: string;
    items: FacultyCrossReferenceItem[];
    anchorRect?: DOMRect;
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 5. Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 6. Shared builder state (single source of truth with /builder and FacultyExplorer)
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
        setBuilderRequest(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to read builder state:', e);
    }
  }, []);

  // Save builder request back to storage
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync selected course and query filters from URL parameter (?c=..., ?f=..., ?q=...)
  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam) {
      setSearchQuery(qParam);
    }

    const pParam = searchParams.get('p');
    if (pParam && ['BSCSE', 'BSDS'].includes(pParam.toUpperCase())) {
      setProgramFilter(pParam.toUpperCase() as 'BSCSE' | 'BSDS');
    }

    const facultyParam = searchParams.get('f');
    if (facultyParam) {
      for (const s of allSections) {
        const idx = s.facultyIds?.indexOf(facultyParam);
        if (idx !== undefined && idx >= 0 && s.faculty?.[idx]) {
          setSearchQuery(s.faculty[idx]);
          break;
        }
      }
    }

    const codeParam = searchParams.get('c');
    if (codeParam) {
      // Find course matching with or without spaces
      const matched = courseDirectory.find(
        (c) =>
          c.code.toLowerCase().replace(/\s+/g, '') ===
          codeParam.toLowerCase().replace(/\s+/g, '')
      );
      if (matched) {
        setSelectedCourseCode(matched.code);
        setExpandedMobileCodes(new Set([matched.code]));
      }
    } else if (courseDirectory.length > 0 && !selectedCourseCode) {
      // Default select first course on desktop
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setSelectedCourseCode(courseDirectory[0].code);
      }
    }
  }, [searchParams, courseDirectory, selectedCourseCode]);

  // Handle selecting a course on desktop
  const handleSelectCourse = (code: string) => {
    setSelectedCourseCode(code);
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('c', code);
    window.history.pushState(null, '', `?${newParams.toString()}`);
  };

  // Handle expanding/collapsing accordion on mobile (<768px)
  const handleToggleMobileAccordion = (code: string) => {
    setExpandedMobileCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
        setSelectedCourseCode(code);
        const newParams = new URLSearchParams(window.location.search);
        newParams.set('c', code);
        window.history.pushState(null, '', `?${newParams.toString()}`);
      }
      return next;
    });
  };

  // Filtered and sorted courses list
  const filteredCourses = useMemo(() => {
    const filtered = filterCourses(courseDirectory, {
      search: searchQuery,
      program: programFilter,
      credit: creditFilter,
      type: typeFilter,
    });
    return sortCourses(filtered, sortBy);
  }, [courseDirectory, searchQuery, programFilter, creditFilter, typeFilter, sortBy]);

  // Active filter count for main toolbar
  const activeToolbarFiltersCount =
    (searchQuery ? 1 : 0) +
    (programFilter !== 'ALL' ? 1 : 0) +
    (creditFilter !== 'ALL' ? 1 : 0) +
    (typeFilter !== 'ALL' ? 1 : 0);

  const clearToolbarFilters = () => {
    setSearchQuery('');
    setProgramFilter('ALL');
    setCreditFilter('ALL');
    setTypeFilter('ALL');
    setSortBy('code-az');
  };

  // Selected course object
  const selectedCourse = useMemo(() => {
    if (!selectedCourseCode) return filteredCourses[0] || null;
    return (
      courseDirectory.find((c) => c.code === selectedCourseCode) ||
      filteredCourses[0] ||
      null
    );
  }, [courseDirectory, selectedCourseCode, filteredCourses]);

  // Filtered sections for selected course
  const filteredSections = useMemo(() => {
    if (!selectedCourse) return [];
    return filterCourseSections(selectedCourse.sections, {
      facultySearch,
      days: dayFilter,
      timeSlots: timeFilter,
      sortBy: sectionSortBy,
    });
  }, [selectedCourse, facultySearch, dayFilter, timeFilter, sectionSortBy]);

  // Grouped sections if group-by-faculty is active
  const facultyGroups = useMemo(() => {
    if (!groupByFaculty) return [];
    return groupSectionsByFaculty(filteredSections);
  }, [groupByFaculty, filteredSections]);

  const activeSectionFiltersCount =
    (facultySearch ? 1 : 0) +
    dayFilter.length +
    timeFilter.length +
    (sectionSortBy !== 'section' ? 1 : 0) +
    (groupByFaculty ? 1 : 0);

  const clearSectionFilters = () => {
    setFacultySearch('');
    setDayFilter([]);
    setTimeFilter([]);
    setSectionSortBy('section');
    setGroupByFaculty(false);
  };

  // Prefer / Avoid toggle handler
  const handleTogglePreference = (
    type: 'prefer' | 'avoid',
    courseCode: string,
    facultyId: string
  ) => {
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

  // Add / Remove course from builder selection
  const handleToggleCourseSelection = (courseCode: string) => {
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
        ? `Removed ${courseCode} from routine builder`
        : `Added ${courseCode} to routine builder ✓`
    );
  };

  // Copy plain text sections
  const handleCopySections = async (course: CourseDirectoryItem) => {
    const text = generateCopyCourseSections(course);
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied sections for ${course.code} to clipboard!`);
    } catch (e) {
      showToast('Failed to copy sections.');
    }
  };

  // Faculty cross-reference click
  const handleOpenFacultyPopover = (
    facultyName: string,
    currentCourseCode: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!facultyName || facultyName === 'TBA') return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const refs = getFacultyCrossReferences(allSections, facultyName, currentCourseCode);
    setPopoverFaculty({
      name: facultyName,
      courseCode: currentCourseCode,
      items: refs,
      anchorRect: rect,
    });
  };

  // "Show this faculty's courses" action from popover
  const handleFilterByFacultyCourses = (facultyName: string) => {
    setPopoverFaculty(null);
    setSearchQuery(facultyName);
    showToast(`Filtering courses taught by ${facultyName}`);
  };

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverFaculty(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopoverFaculty(null);
      } else if (
        !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName || '')
      ) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const curIdx = filteredCourses.findIndex((c) => c.code === selectedCourse?.code);
          const nextIdx = Math.min(filteredCourses.length - 1, curIdx + 1);
          if (filteredCourses[nextIdx]) {
            handleSelectCourse(filteredCourses[nextIdx].code);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const curIdx = filteredCourses.findIndex((c) => c.code === selectedCourse?.code);
          const prevIdx = Math.max(0, curIdx - 1);
          if (filteredCourses[prevIdx]) {
            handleSelectCourse(filteredCourses[prevIdx].code);
          }
        }
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [filteredCourses, selectedCourse]);

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

      {/* 2. Compact Page Sub-Header */}
      <div className="border-b border-app-border bg-surface">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
                Course Directory
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold">
                {courseDirectory.length} courses
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Pick a course to see which faculty teach which section, and when.
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

      {/* 3. Global Filter Toolbar */}
      <div className="border-b border-app-border bg-surface/60 backdrop-blur-sm sticky top-14 z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 space-y-2">
          {/* Main Toolbar Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search course code, title, faculty, or alias (e.g. DSA, OOP)..."
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-btn border border-app-border bg-page placeholder:text-text-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  aria-label="Clear course search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Program Chips */}
            <div className="flex items-center gap-1">
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

            {/* Credit Filter Chips */}
            <div className="flex items-center gap-1">
              {CREDIT_OPTIONS.map((cr) => (
                <button
                  key={cr}
                  onClick={() => setCreditFilter(cr)}
                  className={`px-2 py-1 rounded-chip text-[11px] font-semibold transition-all ${
                    creditFilter === cr
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                  }`}
                >
                  {cr === 'ALL' ? 'All Cr' : `${cr} Cr`}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1">
              {(['ALL', 'theory', 'lab'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2 py-1 rounded-chip text-[11px] font-semibold capitalize transition-all ${
                    typeFilter === t
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[11px] text-text-muted">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as CourseSortOption)}
                className="py-1 px-2 text-[11px] rounded border border-app-border bg-page text-text-primary focus:outline-none focus:border-orange-500"
              >
                <option value="code-az">Code A–Z</option>
                <option value="title-az">Title A–Z</option>
                <option value="most-sections">Most Sections</option>
              </select>
            </div>
          </div>

          {/* Count & Reset Row */}
          <div className="flex items-center justify-between text-[11px] text-text-muted pt-0.5">
            <span>
              Showing <strong className="text-text-primary font-bold">{filteredCourses.length}</strong> of{' '}
              {courseDirectory.length} courses
            </span>

            {activeToolbarFiltersCount > 0 && (
              <button
                onClick={clearToolbarFilters}
                className="text-orange-600 hover:text-orange-700 font-semibold underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Main Two-Pane Layout (Desktop & Tablet) / Accordion (Mobile) */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-5">
        {/* Desktop / Tablet Two-Pane Grid (>=768px) */}
        <div className="hidden md:grid md:grid-cols-[300px_1fr] lg:grid-cols-[minmax(340px,400px)_1fr] gap-6 items-start">
          {/* LEFT PANE: Course List */}
          <section
            aria-label="Course List"
            role="listbox"
            tabIndex={0}
            className="bg-surface border border-app-border rounded-card shadow-warm p-2.5 space-y-1.5 sticky top-36 max-h-[calc(100vh-160px)] overflow-y-auto focus:outline-none"
          >
            {filteredCourses.length === 0 ? (
              <div className="p-8 text-center rounded-card border border-dashed border-app-border text-xs text-text-muted space-y-2">
                <p>No courses match your filter criteria.</p>
                <button
                  onClick={clearToolbarFilters}
                  className="px-3 py-1.5 rounded-btn bg-surface hover:bg-subtle text-text-primary font-semibold border border-app-border shadow-2xs inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3 text-orange-500" />
                  <span>Clear filters</span>
                </button>
              </div>
            ) : (
              filteredCourses.map((c) => {
                const isSelected = selectedCourse?.code === c.code;
                const hasSections = c.sectionCount > 0;

                return (
                  <button
                    key={c.code}
                    role="option"
                    aria-selected={isSelected}
                    aria-current={isSelected ? 'true' : undefined}
                    disabled={!hasSections}
                    onClick={() => hasSections && handleSelectCourse(c.code)}
                    className={`w-full text-left p-3 rounded-card transition-all flex flex-col gap-1 border ${
                      isSelected
                        ? 'bg-orange-50/80 border-orange-300 border-l-[3px] border-l-orange-500 shadow-2xs ring-1 ring-orange-400/20'
                        : hasSections
                        ? 'bg-page border-app-border hover:border-orange-200 hover:bg-subtle'
                        : 'bg-subtle/50 border-app-border/60 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {/* Row Top: Code, Credit, Program Badge, Sections Count */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold text-xs ${
                            isSelected ? 'text-orange-950 font-extrabold' : 'text-text-primary'
                          }`}
                        >
                          {c.code}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-subtle text-text-muted border border-app-border">
                          {c.credit} Cr
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                          {c.program}
                        </span>
                      </div>

                      {hasSections ? (
                        <div className="flex items-center gap-1 text-[11px] text-text-muted">
                          <span>
                            {c.sectionCount} sec • {c.facultyCount} fac
                          </span>
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform ${
                              isSelected ? 'text-orange-600 translate-x-0.5' : 'text-text-muted'
                            }`}
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] text-text-muted italic">No sections</span>
                      )}
                    </div>

                    {/* Course Title */}
                    <div className="text-xs text-text-secondary line-clamp-1 font-medium">
                      {c.title}
                    </div>

                    {/* Paired Lab / Theory chip if present */}
                    {c.pairedCourseCode && (
                      <div className="pt-1 flex items-center gap-1">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCourse(c.pairedCourseCode!);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.2 rounded transition-colors"
                        >
                          <Layers className="w-2.5 h-2.5" />
                          <span>
                            {c.hasLab ? 'Lab co-req' : 'Theory'}: {c.pairedCourseCode}
                          </span>
                        </span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </section>

          {/* RIGHT PANE: Selected Course Section List */}
          <section aria-label="Course Sections" className="space-y-4">
            {selectedCourse ? (
              <SelectedCourseSectionView
                course={selectedCourse}
                sections={filteredSections}
                facultyGroups={facultyGroups}
                builderRequest={builderRequest}
                onToggleCourse={handleToggleCourseSelection}
                onCopySections={() => handleCopySections(selectedCourse)}
                onTogglePreference={handleTogglePreference}
                onOpenFacultyPopover={handleOpenFacultyPopover}
                onSelectCourse={handleSelectCourse}
                // Within-course filters
                facultySearch={facultySearch}
                onFacultySearchChange={setFacultySearch}
                dayFilter={dayFilter}
                onDayFilterChange={setDayFilter}
                timeFilter={timeFilter}
                onTimeFilterChange={setTimeFilter}
                sectionSortBy={sectionSortBy}
                onSectionSortByChange={setSectionSortBy}
                groupByFaculty={groupByFaculty}
                onGroupByFacultyChange={setGroupByFaculty}
                activeFiltersCount={activeSectionFiltersCount}
                onClearFilters={clearSectionFilters}
              />
            ) : (
              <div className="p-12 text-center rounded-card bg-surface border border-app-border text-text-muted">
                Select a course from the directory to view its sections and faculty.
              </div>
            )}
          </section>
        </div>

        {/* Mobile Accordion View (<768px, UCAM style inline expansion) */}
        <div className="md:hidden space-y-2">
          {filteredCourses.length === 0 ? (
            <div className="p-8 text-center rounded-card border border-dashed border-app-border text-xs text-text-muted space-y-2">
              <p>No courses match your filter criteria.</p>
              <button
                onClick={clearToolbarFilters}
                className="px-3 py-1.5 rounded-btn bg-surface hover:bg-subtle text-text-primary font-semibold border border-app-border shadow-2xs inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3 text-orange-500" />
                <span>Clear filters</span>
              </button>
            </div>
          ) : (
            filteredCourses.map((c) => {
              const isExpanded = expandedMobileCodes.has(c.code);
              const hasSections = c.sectionCount > 0;

              return (
                <div
                  key={c.code}
                  className={`border rounded-card transition-all overflow-hidden ${
                    isExpanded
                      ? 'border-orange-300 border-l-[3px] border-l-orange-500 bg-surface shadow-2xs'
                      : hasSections
                      ? 'border-app-border bg-surface'
                      : 'border-app-border/60 bg-subtle/50 opacity-60'
                  }`}
                >
                  {/* Accordion Header Row */}
                  <button
                    disabled={!hasSections}
                    onClick={() => hasSections && handleToggleMobileAccordion(c.code)}
                    aria-expanded={isExpanded}
                    className="w-full text-left p-3.5 flex items-center justify-between gap-2"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-text-primary">
                          {c.code}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-subtle text-text-muted border border-app-border">
                          {c.credit} Cr
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                          {c.program}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary truncate font-medium">
                        {c.title}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasSections ? (
                        <>
                          <span className="text-[11px] text-text-muted">
                            {c.sectionCount} sec
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-orange-600' : ''
                            }`}
                          />
                        </>
                      ) : (
                        <span className="text-[10px] text-text-muted italic">No sections</span>
                      )}
                    </div>
                  </button>

                  {/* Accordion Body: Section List */}
                  {isExpanded && hasSections && (
                    <div className="p-3 border-t border-app-border bg-page space-y-4">
                      <SelectedCourseSectionView
                        course={c}
                        sections={filterCourseSections(c.sections, {
                          facultySearch,
                          days: dayFilter,
                          timeSlots: timeFilter,
                          sortBy: sectionSortBy,
                        })}
                        facultyGroups={groupSectionsByFaculty(
                          filterCourseSections(c.sections, {
                            facultySearch,
                            days: dayFilter,
                            timeSlots: timeFilter,
                            sortBy: sectionSortBy,
                          })
                        )}
                        builderRequest={builderRequest}
                        onToggleCourse={handleToggleCourseSelection}
                        onCopySections={() => handleCopySections(c)}
                        onTogglePreference={handleTogglePreference}
                        onOpenFacultyPopover={handleOpenFacultyPopover}
                        onSelectCourse={handleSelectCourse}
                        // Within-course filters
                        facultySearch={facultySearch}
                        onFacultySearchChange={setFacultySearch}
                        dayFilter={dayFilter}
                        onDayFilterChange={setDayFilter}
                        timeFilter={timeFilter}
                        onTimeFilterChange={setTimeFilter}
                        sectionSortBy={sectionSortBy}
                        onSectionSortByChange={setSectionSortBy}
                        groupByFaculty={groupByFaculty}
                        onGroupByFacultyChange={setGroupByFaculty}
                        activeFiltersCount={activeSectionFiltersCount}
                        onClearFilters={clearSectionFilters}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 5. Faculty Cross-Reference Popover (11D) */}
      {popoverFaculty && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`Courses taught by ${popoverFaculty.name}`}
          className="fixed z-50 w-80 sm:w-96 rounded-card bg-surface border border-app-border shadow-warm p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: popoverFaculty.anchorRect
              ? Math.min(
                  window.innerHeight - 320,
                  Math.max(10, popoverFaculty.anchorRect.bottom + 8)
                )
              : '20%',
            left: popoverFaculty.anchorRect
              ? Math.min(
                  window.innerWidth - 340,
                  Math.max(10, popoverFaculty.anchorRect.left - 20)
                )
              : '20%',
          }}
        >
          <div className="flex items-start justify-between pb-2 border-b border-app-border">
            <div>
              <div className="font-extrabold text-xs text-text-primary">
                {popoverFaculty.name}
              </div>
              <div className="text-[11px] text-text-muted">
                Other teaching sections this trimester
              </div>
            </div>
            <button
              onClick={() => setPopoverFaculty(null)}
              className="p-1 text-text-muted hover:text-text-primary rounded"
              aria-label="Close popover"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 text-xs">
            {popoverFaculty.items.length === 0 ? (
              <p className="text-[11px] text-text-muted italic py-2">
                No other sections taught this trimester.
              </p>
            ) : (
              popoverFaculty.items.map((ref, idx) => (
                <div
                  key={`${ref.courseCode}-${ref.section}-${idx}`}
                  className="p-2 rounded bg-page border border-app-border space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary">
                      {ref.courseCode} ({ref.section})
                    </span>
                    <span className="text-[10px] uppercase font-bold text-text-muted">
                      {ref.kind}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-secondary truncate">
                    {ref.courseTitle}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {ref.meetings
                      .map(
                        (m) =>
                          `${m.day} ${formatTime24(m.start)}–${formatTime24(m.end)}${
                            m.room ? ` (R${m.room})` : ''
                          }`
                      )
                      .join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-1 border-t border-app-border flex items-center justify-between">
            <button
              onClick={() => handleFilterByFacultyCourses(popoverFaculty.name)}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Show this faculty's courses</span>
            </button>
            <button
              onClick={() => setPopoverFaculty(null)}
              className="px-2.5 py-1 text-xs rounded bg-subtle text-text-secondary hover:text-text-primary"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component: SelectedCourseSectionView (used on both desktop right pane & mobile accordion)
// -----------------------------------------------------------------------------
interface SelectedCourseSectionViewProps {
  course: CourseDirectoryItem;
  sections: CourseDirectorySection[];
  facultyGroups: { facultyName: string; facultyId: string; sections: CourseDirectorySection[] }[];
  builderRequest: Partial<SolveRequest>;
  onToggleCourse: (courseCode: string) => void;
  onCopySections: () => void;
  onTogglePreference: (type: 'prefer' | 'avoid', courseCode: string, facultyId: string) => void;
  onOpenFacultyPopover: (facultyName: string, courseCode: string, e: React.MouseEvent) => void;
  onSelectCourse: (code: string) => void;
  // Within-course filters
  facultySearch: string;
  onFacultySearchChange: (val: string) => void;
  dayFilter: Day[];
  onDayFilterChange: (days: Day[]) => void;
  timeFilter: ('Morning' | 'Midday' | 'Afternoon')[];
  onTimeFilterChange: (slots: ('Morning' | 'Midday' | 'Afternoon')[]) => void;
  sectionSortBy: 'section' | 'faculty' | 'time';
  onSectionSortByChange: (sort: 'section' | 'faculty' | 'time') => void;
  groupByFaculty: boolean;
  onGroupByFacultyChange: (val: boolean) => void;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

function SelectedCourseSectionView({
  course,
  sections,
  facultyGroups,
  builderRequest,
  onToggleCourse,
  onCopySections,
  onTogglePreference,
  onOpenFacultyPopover,
  onSelectCourse,
  facultySearch,
  onFacultySearchChange,
  dayFilter,
  onDayFilterChange,
  timeFilter,
  onTimeFilterChange,
  sectionSortBy,
  onSectionSortByChange,
  groupByFaculty,
  onGroupByFacultyChange,
  activeFiltersCount,
  onClearFilters,
}: SelectedCourseSectionViewProps) {
  const isSelectedInBuilder = builderRequest.selectedCourses?.includes(course.code);

  return (
    <div className="space-y-4">
      {/* 1. Course Header Card (sticky within pane) */}
      <div className="p-4 sm:p-5 rounded-card bg-surface border border-app-border shadow-warm space-y-4 sticky top-36 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                {course.code}
              </h2>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-subtle text-text-muted border border-app-border">
                {course.credit} Credits
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200">
                {course.program}
              </span>
            </div>
            <p className="text-sm font-semibold text-text-secondary mt-0.5">
              {course.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-text-muted">
              <span>{course.sectionCount} Sections</span>
              <span>•</span>
              <span>{course.facultyCount} Faculty</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onToggleCourse(course.code)}
              className={`px-3.5 py-1.5 rounded-btn text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isSelectedInBuilder
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-2xs'
              }`}
            >
              {isSelectedInBuilder ? (
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

            <button
              onClick={onCopySections}
              className="px-3 py-1.5 rounded-btn bg-surface hover:bg-subtle text-text-primary font-semibold text-xs border border-app-border shadow-2xs flex items-center gap-1.5 transition-colors"
              title="Copy plain-text sections list"
            >
              <Copy className="w-3.5 h-3.5 text-text-muted" />
              <span>Copy list</span>
            </button>
          </div>
        </div>

        {/* Theory / Lab Tabs if paired course exists */}
        {course.pairedCourseCode && (
          <div className="flex items-center gap-2 pt-1 border-t border-app-border text-xs">
            <span className="text-text-muted font-medium">Co-requisite:</span>
            <button
              onClick={() => onSelectCourse(course.pairedCourseCode!)}
              className="px-2.5 py-1 rounded-btn font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 flex items-center gap-1 transition-colors"
            >
              <Layers className="w-3 h-3" />
              <span>
                Switch to {course.hasLab ? 'Lab' : 'Theory'}: {course.pairedCourseCode}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Within-Course Filters Bar */}
      <div className="p-3 rounded-card bg-surface border border-app-border shadow-2xs space-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Faculty Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={facultySearch}
              onChange={(e) => onFacultySearchChange(e.target.value)}
              placeholder="Filter by faculty..."
              className="w-full pl-8 pr-6 py-1 text-xs rounded border border-app-border bg-page text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange-500"
            />
            {facultySearch && (
              <button
                onClick={() => onFacultySearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Day Chips */}
          <div className="flex items-center gap-1">
            {DAYS.map((d) => {
              const isActive = dayFilter.includes(d);
              return (
                <button
                  key={d}
                  onClick={() =>
                    onDayFilterChange(
                      isActive ? dayFilter.filter((x) => x !== d) : [...dayFilter, d]
                    )
                  }
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-orange-600 text-white font-bold'
                      : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Time Slot Chips */}
          <div className="flex items-center gap-1">
            {TIME_OF_DAY_SLOTS.map((slot) => {
              const isActive = timeFilter.includes(slot);
              return (
                <button
                  key={slot}
                  onClick={() =>
                    onTimeFilterChange(
                      isActive ? timeFilter.filter((x) => x !== slot) : [...timeFilter, slot]
                    )
                  }
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
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

          {/* Section Sort */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-text-muted">Sort:</span>
            {(
              [
                { id: 'section', label: 'Section' },
                { id: 'faculty', label: 'Faculty' },
                { id: 'time', label: 'Time' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => onSectionSortByChange(s.id)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  sectionSortBy === s.id
                    ? 'bg-orange-50 text-orange-600 border border-orange-200'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Group-by-Faculty Toggle */}
          <button
            onClick={() => onGroupByFacultyChange(!groupByFaculty)}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
              groupByFaculty
                ? 'bg-orange-500 text-white shadow-2xs'
                : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Group by Faculty</span>
          </button>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-app-border text-[11px]">
            <span className="text-orange-600 font-semibold">
              {sections.length} section{sections.length !== 1 ? 's' : ''} match active filters
            </span>
            <button
              onClick={onClearFilters}
              className="text-text-muted hover:text-text-primary underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear filters</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Section Rows List (UCAM-inspired clean card layout) */}
      <div className="space-y-2.5">
        {sections.length === 0 ? (
          <div className="p-8 text-center rounded-card bg-surface border border-dashed border-app-border text-xs text-text-muted space-y-2">
            <p>No sections match the selected section filters.</p>
            <button
              onClick={onClearFilters}
              className="px-3 py-1.5 rounded-btn bg-surface hover:bg-subtle text-text-primary font-semibold border border-app-border shadow-2xs inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3 text-orange-500" />
              <span>Clear section filters</span>
            </button>
          </div>
        ) : groupByFaculty ? (
          /* Grouped by faculty */
          facultyGroups.map((group) => (
            <div
              key={group.facultyId}
              className="p-4 rounded-card bg-surface border border-app-border shadow-warm space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-app-border">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-text-primary">
                    {group.facultyName}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                    {group.sections.length} section{group.sections.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {group.sections.map((sec) => (
                  <SectionRowItem
                    key={sec.id}
                    section={sec}
                    courseCode={course.code}
                    builderRequest={builderRequest}
                    onTogglePreference={onTogglePreference}
                    onOpenFacultyPopover={onOpenFacultyPopover}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          /* Standard section order (A, B, C...) */
          sections.map((sec) => (
            <SectionRowItem
              key={sec.id}
              section={sec}
              courseCode={course.code}
              builderRequest={builderRequest}
              onTogglePreference={onTogglePreference}
              onOpenFacultyPopover={onOpenFacultyPopover}
            />
          ))
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component: SectionRowItem (UCAM-inspired Section Row)
// -----------------------------------------------------------------------------
interface SectionRowItemProps {
  section: CourseDirectorySection;
  courseCode: string;
  builderRequest: Partial<SolveRequest>;
  onTogglePreference: (type: 'prefer' | 'avoid', courseCode: string, facultyId: string) => void;
  onOpenFacultyPopover: (facultyName: string, courseCode: string, e: React.MouseEvent) => void;
}

function SectionRowItem({
  section,
  courseCode,
  builderRequest,
  onTogglePreference,
  onOpenFacultyPopover,
}: SectionRowItemProps) {
  const prefList = builderRequest.preferredFaculty?.[courseCode] || [];
  const avoidList = builderRequest.avoidFaculty?.[courseCode] || [];
  const isPreferred = prefList.includes(section.primaryFacultyId);
  const isAvoided = avoidList.includes(section.primaryFacultyId);

  const courseColor = getCourseColor(courseCode);

  const meetingSpeech = section.meetings
    .map(
      (m) =>
        `${DAY_FULL_NAMES[m.day as Day] || m.day} ${formatTime24(m.start)} to ${formatTime24(m.end)}`
    )
    .join(' and ');
  const roomSpeech = section.meetings[0]?.room ? `, Room ${section.meetings[0].room}` : '';
  const accessibleLabel = `Section ${section.section}, ${section.primaryFaculty}, ${meetingSpeech}${roomSpeech}`;

  return (
    <div
      aria-label={accessibleLabel}
      className="p-3 sm:p-3.5 rounded-card bg-surface border border-app-border shadow-2xs hover:border-orange-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
    >
      {/* Left side: Avatar, Section label, Faculty name, Meeting times, Room */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        {/* Soft pastel Avatar Circle with initials */}
        <div
          style={{
            backgroundColor: section.avatarColor.bg,
            color: section.avatarColor.text,
            borderColor: section.avatarColor.border,
          }}
          className="w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-2xs"
          title={`Faculty initials: ${section.facultyInitials}`}
        >
          {section.facultyInitials}
        </div>

        {/* Section info & Meeting times */}
        <div className="space-y-1 min-w-0 flex-1">
          {/* Section badge + Faculty Name */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-sm text-text-primary px-1.5 py-0.5 rounded bg-subtle border border-app-border">
              {section.section}
            </span>

            {/* Clickable Faculty Name opens cross-reference popover */}
            <button
              onClick={(e) => onOpenFacultyPopover(section.primaryFaculty, courseCode, e)}
              className="font-bold text-xs text-text-primary hover:text-orange-600 hover:underline transition-colors text-left"
              title="Click to see other courses taught by this faculty"
            >
              {section.primaryFaculty}
            </button>

            {section.tentative && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Tentative
              </span>
            )}
          </div>

          {/* Time chips (Full day names on desktop, 3-letter on narrow screens, wraps cleanly) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {section.meetings.map((m, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-page border border-app-border text-text-secondary whitespace-nowrap"
              >
                <Clock className="w-3 h-3 text-orange-500 shrink-0" />
                <span className="hidden sm:inline">
                  {DAY_FULL_NAMES[m.day as Day] || m.day}
                </span>
                <span className="sm:hidden">{m.day}</span>
                <span>
                  {formatTime24(m.start)}–{formatTime24(m.end)}
                </span>
              </span>
            ))}

            {/* Room text separated by divider */}
            {section.meetings[0]?.room && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-subtle text-text-primary border border-app-border">
                <MapPin className="w-3 h-3 text-text-muted shrink-0" />
                <span>Room {section.meetings[0].room}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Mini 5-Day Strip (Desktop) + Prefer/Avoid Action Buttons */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-app-border">
        {/* Mini 5-day strip (Sat–Wed, desktop only) */}
        <div
          className="hidden lg:flex items-center gap-0.5 p-1 rounded bg-subtle border border-app-border"
          title="Weekly day occupancy (Sat–Wed)"
        >
          {DAYS.map((d, dIdx) => {
            const isOccupied = section.dayMask[dIdx];
            return (
              <span
                key={d}
                style={{
                  backgroundColor: isOccupied ? courseColor.border : 'transparent',
                  color: isOccupied ? '#FFFFFF' : '#9CA3AF',
                }}
                className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center transition-colors`}
              >
                {d[0]}
              </span>
            );
          })}
        </div>

        {/* Prefer & Avoid Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onTogglePreference('prefer', courseCode, section.primaryFacultyId)}
            aria-label={`Prefer faculty ${section.primaryFaculty} for ${courseCode}`}
            title="Prefer this faculty in routine builder scoring"
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
              isPreferred
                ? 'bg-success text-white shadow-2xs'
                : 'bg-page text-text-secondary hover:text-success hover:bg-subtle border border-app-border'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Prefer{isPreferred ? ' ✓' : ''}</span>
          </button>

          <button
            onClick={() => onTogglePreference('avoid', courseCode, section.primaryFacultyId)}
            aria-label={`Avoid faculty ${section.primaryFaculty} for ${courseCode}`}
            title="Avoid this faculty in routine builder scoring"
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
              isAvoided
                ? 'bg-danger text-white shadow-2xs'
                : 'bg-page text-text-secondary hover:text-danger hover:bg-subtle border border-app-border'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Avoid{isAvoided ? ' ✓' : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FacultyDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-page flex items-center justify-center text-xs text-text-muted">
          Loading course directory...
        </div>
      }
    >
      <CourseDirectoryContent />
    </Suspense>
  );
}
