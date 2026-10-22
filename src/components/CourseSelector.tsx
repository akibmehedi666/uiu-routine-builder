'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Course,
  Day,
  DAYS_LIST,
  Faculty,
  Meeting,
  Section,
  SolveRequest,
} from '../types';
import {
  Search,
  Plus,
  Trash2,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Sliders,
  AlertTriangle,
  Beaker,
  X,
  RotateCcw,
  Pencil,
  Check,
  Clock,
  MapPin,
  User,
} from 'lucide-react';
import { formatTime24 } from '../utils/export';
import { isFixedCourse } from '../config/fixedCourses';
import {
  isManualScheduleCourse,
  ManualScheduleInput,
  formatManualScheduleDescription,
  computeFYDPClashes,
  parseTimeString,
} from '../lib/fixedCourses';

interface CourseSelectorProps {
  courses: Course[];
  sections: Section[];
  faculty: Faculty[];
  request: SolveRequest;
  onRequestChange: (newRequest: SolveRequest) => void;
  onOpenExplorer?: (courseCode: string) => void;
  manualSchedules?: Record<string, ManualScheduleInput>;
  onOpenManualScheduleModal?: (courseCode: string) => void;
  activeSection?: 'all' | 'courses' | 'preferences';
  mobileTab?: 'courses' | 'preferences';
  onRemoveBlockedSlot?: (courseCode: string) => void;
}

export function CourseSelector({
  courses,
  sections,
  faculty,
  request,
  onRequestChange,
  onOpenExplorer,
  manualSchedules = {},
  onOpenManualScheduleModal,
  activeSection = 'all',
  mobileTab = 'courses',
  onRemoveBlockedSlot,
}: CourseSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [programFilter, setProgramFilter] = useState<'ALL' | 'BSCSE' | 'BSDS'>('ALL');
  const [isFiltersOpen, setIsFiltersOpen] = useState(request.selectedCourses.length > 0);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [creditWarningExpanded, setCreditWarningExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const courseListRef = useRef<HTMLDivElement>(null);
  const prevCourseCountRef = useRef(request.selectedCourses.length);

  const openMobileSearch = useCallback(() => {
    setMobileSearchOpen(true);
    try {
      window.history.pushState({ mobileSearch: true }, '');
    } catch {
      // ignore
    }
  }, []);

  const closeMobileSearch = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.state?.mobileSearch) {
      window.history.back();
    } else {
      setMobileSearchOpen(false);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setMobileSearchOpen(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMobileSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileSearchOpen, closeMobileSearch]);

  // When a course is added, scroll so the new card's Faculty Pref block is inside the visible area
  useEffect(() => {
    if (request.selectedCourses.length > prevCourseCountRef.current) {
      if (courseListRef.current && request.selectedCourses.length > 1) {
        courseListRef.current.scrollTo({
          top: courseListRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
    prevCourseCountRef.current = request.selectedCourses.length;
  }, [request.selectedCourses.length]);

  // Undo and remove state
  interface UndoState {
    message: string;
    previousRequest: SolveRequest;
  }
  const [undoToast, setUndoToast] = useState<UndoState | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [alsoResetPrefs, setAlsoResetPrefs] = useState(false);
  const [pendingRemoveLabPair, setPendingRemoveLabPair] = useState<{
    theoryCode: string;
    labCode: string;
  } | null>(null);
  const [showRemoveHint, setShowRemoveHint] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('uiu_routine_dismiss_remove_hint');
      if (!dismissed) {
        setShowRemoveHint(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDismissHint = () => {
    setShowRemoveHint(false);
    try {
      localStorage.setItem('uiu_routine_dismiss_remove_hint', 'true');
    } catch {
      // ignore
    }
  };

  // Undo timer: auto-hide after 6 seconds
  useEffect(() => {
    if (!undoToast) return;
    const timer = setTimeout(() => {
      setUndoToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [undoToast]);

  const handleUndo = useCallback(() => {
    if (!undoToast) return;
    onRequestChange(undoToast.previousRequest);
    setUndoToast(null);
  }, [undoToast, onRequestChange]);

  // Keyboard shortcut: pressing 'u' or Ctrl+Z triggers undo
  useEffect(() => {
    const handleToastKeyDown = (e: KeyboardEvent) => {
      if (!undoToast) return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName || '')) {
        return;
      }
      if (
        e.key === 'u' ||
        e.key === 'U' ||
        ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleToastKeyDown);
    return () => window.removeEventListener('keydown', handleToastKeyDown);
  }, [undoToast, handleUndo]);

  // Track courses that have "Hidden by FYDP" expanded
  const [expandedClashes, setExpandedClashes] = useState<Set<string>>(new Set());

  // Clashes between non-FYDP courses and active FYDP courses
  const fydpClashes = useMemo(() => {
    return computeFYDPClashes(
      request.selectedCourses || [],
      sections,
      undefined,
      request.lockedSections
    );
  }, [request.selectedCourses, sections, request.lockedSections]);

  // Check if multiple FYDP courses selected
  const selectedFYDPCourses = useMemo(() => {
    return (request.selectedCourses || []).filter((code) => isFixedCourse(code));
  }, [request.selectedCourses]);

  // Auto-expand filters when courses are selected
  useEffect(() => {
    if (request.selectedCourses.length > 0) {
      setIsFiltersOpen(true);
    }
  }, [request.selectedCourses.length]);

  // Group sections by courseCode for quick lookup
  const sectionsByCourse = useMemo(() => {
    const map = new Map<string, Section[]>();
    for (const sec of sections) {
      if (!map.has(sec.courseCode)) map.set(sec.courseCode, []);
      map.get(sec.courseCode)!.push(sec);
    }
    return map;
  }, [sections]);

  // Map courseCode to Course object
  const coursesByCode = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses) {
      map.set(c.code, c);
    }
    return map;
  }, [courses]);

  // Map faculty ID to clean name
  const facultyById = useMemo(() => {
    const map = new Map<string, Faculty>();
    for (const f of faculty) {
      map.set(f.id, f);
    }
    return map;
  }, [faculty]);

  // Selected courses details & total credits
  const selectedCourseObjs = useMemo(() => {
    return (request.selectedCourses || [])
      .map((code) => coursesByCode.get(code))
      .filter((c): c is Course => Boolean(c));
  }, [request.selectedCourses, coursesByCode]);

  const totalCredits = useMemo(() => {
    return selectedCourseObjs.reduce((sum, c) => sum + c.credit, 0);
  }, [selectedCourseObjs]);

  // Filter available courses for autocomplete (does NOT filter out already selected)
  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return courses.filter((c) => {
      // Program filter
      if (programFilter !== 'ALL' && c.program !== programFilter) return false;

      if (!term) return true;

      // Keyword matching (code, title, common aliases)
      const codeMatch = c.code.toLowerCase().includes(term);
      const titleMatch = c.title.toLowerCase().includes(term);
      const aliasMatch =
        (term === 'dsa' && c.title.toLowerCase().includes('data structure')) ||
        (term === 'oop' && c.title.toLowerCase().includes('object oriented')) ||
        (term === 'ai' && c.title.toLowerCase().includes('artificial intelligence')) ||
        (term === 'db' && c.title.toLowerCase().includes('database')) ||
        (term === 'os' && c.title.toLowerCase().includes('operating system')) ||
        (term === 'fydp' && c.code.includes('4000'));

      return codeMatch || titleMatch || aliasMatch;
    });
  }, [courses, searchTerm, programFilter]);

  // Toggle course selection
  const handleAddCourse = (courseCode: string, keepOpen = false) => {
    if ((request.selectedCourses || []).includes(courseCode)) return;
    const newCourses = [...(request.selectedCourses || []), courseCode];
    onRequestChange({
      ...request,
      selectedCourses: newCourses,
    });
    if (!keepOpen) {
      setSearchTerm('');
      setIsSearchOpen(false);
    }

    if (!isFixedCourse(courseCode) && isManualScheduleCourse(courseCode) && !manualSchedules[courseCode]) {
      onOpenManualScheduleModal?.(courseCode);
    }
  };

  const executeRemoveCourse = useCallback(
    (courseCode: string, alsoRemoveLab = false) => {
      const previousRequest = { ...request };
      const codesToRemove = [courseCode];
      if (alsoRemoveLab) {
        const courseObj = coursesByCode.get(courseCode);
        if (courseObj?.labCode) {
          codesToRemove.push(courseObj.labCode);
        }
      }

      const newCourses = (request.selectedCourses || []).filter(
        (c) => !codesToRemove.includes(c)
      );
      const newPref = { ...request.preferredFaculty };
      const newAvoid = { ...request.avoidFaculty };
      const newLock = { ...request.lockedSections };
      for (const c of codesToRemove) {
        delete newPref[c];
        delete newAvoid[c];
        delete newLock[c];
      }

      onRequestChange({
        ...request,
        selectedCourses: newCourses,
        preferredFaculty: newPref,
        avoidFaculty: newAvoid,
        lockedSections: newLock,
      });

      const msg =
        codesToRemove.length > 1
          ? `Removed ${courseCode} & ${codesToRemove[1]}`
          : `Removed ${courseCode}`;

      setUndoToast({
        message: msg,
        previousRequest,
      });
      setPendingRemoveLabPair(null);
    },
    [request, coursesByCode, onRequestChange]
  );

  const handleInitiateRemove = useCallback(
    (courseCode: string) => {
      const courseObj = coursesByCode.get(courseCode);
      const pairedLabCode =
        courseObj?.hasLab &&
        courseObj.labCode &&
        (request.selectedCourses || []).includes(courseObj.labCode)
          ? courseObj.labCode
          : null;

      if (pairedLabCode) {
        setIsSearchOpen(false);
        setPendingRemoveLabPair({
          theoryCode: courseCode,
          labCode: pairedLabCode,
        });
        return;
      }

      executeRemoveCourse(courseCode, false);
    },
    [coursesByCode, request.selectedCourses, executeRemoveCourse]
  );

  const handleConfirmClearAll = useCallback(() => {
    const count = request.selectedCourses.length;
    const previousRequest = { ...request };

    const updatedRequest: SolveRequest = {
      ...request,
      selectedCourses: [],
      preferredFaculty: {},
      avoidFaculty: {},
      lockedSections: {},
      ...(alsoResetPrefs
        ? {
            filterDayOff: [],
            filterTimeWindow: undefined,
            maxGapMinutesPerDay: undefined,
          }
        : {}),
    };

    onRequestChange(updatedRequest);
    setIsClearConfirmOpen(false);
    setAlsoResetPrefs(false);

    setUndoToast({
      message: `Removed all ${count} courses`,
      previousRequest,
    });
  }, [request, alsoResetPrefs, onRequestChange]);

  // Toggle co-requisite lab
  const handleAddLab = (labCode: string) => {
    handleAddCourse(labCode);
  };

  // Day-off filter toggle
  const toggleDayOff = (day: Day) => {
    const current = new Set(request.filterDayOff || []);
    if (current.has(day)) current.delete(day);
    else current.add(day);

    onRequestChange({
      ...request,
      filterDayOff: Array.from(current),
    });
  };

  // Lock section
  const handleLockSection = (courseCode: string, sectionId: string | '') => {
    const newLock = { ...request.lockedSections };
    if (!sectionId) {
      delete newLock[courseCode];
    } else {
      newLock[courseCode] = sectionId;
    }
    onRequestChange({
      ...request,
      lockedSections: newLock,
    });
  };

  // Preferred faculty toggle
  const toggleFacultyPref = (courseCode: string, facultyId: string) => {
    const current = request.preferredFaculty?.[courseCode] || [];
    const isSelected = current.includes(facultyId);

    const updated = isSelected
      ? current.filter((id) => id !== facultyId)
      : [...current, facultyId];

    // Remove from avoid if added to preferred
    const avoidCurrent = request.avoidFaculty?.[courseCode] || [];
    const updatedAvoid = avoidCurrent.filter((id) => id !== facultyId);

    onRequestChange({
      ...request,
      preferredFaculty: {
        ...request.preferredFaculty,
        [courseCode]: updated,
      },
      avoidFaculty: {
        ...request.avoidFaculty,
        [courseCode]: updatedAvoid,
      },
    });
  };

  // Avoid faculty toggle
  const toggleFacultyAvoid = (courseCode: string, facultyId: string) => {
    const currentAvoid = request.avoidFaculty?.[courseCode] || [];
    const currentPrefs = request.preferredFaculty?.[courseCode] || [];

    const isCurrentlyAvoided = currentAvoid.includes(facultyId);
    let newAvoid: string[];
    let newPrefs = currentPrefs.filter((id) => id !== facultyId);

    if (isCurrentlyAvoided) {
      newAvoid = currentAvoid.filter((id) => id !== facultyId);
    } else {
      newAvoid = [...currentAvoid, facultyId];
    }

    onRequestChange({
      ...request,
      preferredFaculty: {
        ...request.preferredFaculty,
        [courseCode]: newPrefs,
      },
      avoidFaculty: {
        ...request.avoidFaculty,
        [courseCode]: newAvoid,
      },
    });
  };

  const resetWeights = () => {
    onRequestChange({
      ...request,
      weights: {
        facultyPreference: 35,
        minimizeGaps: 25,
        compactDays: 20,
        avoidEarlyLate: 10,
        avoidTentative: 10,
      },
    });
  };

  return (
    <aside className="w-full flex-shrink-0 flex flex-col space-y-3.5 bg-surface p-3.5 sm:p-4 rounded-card border border-app-border shadow-warm lg:sticky lg:top-[72px] lg:max-h-[calc(100dvh-88px)] lg:overflow-y-auto">
      {/* 1. Header with Credit Limit Badge & Clear All */}
      <div className="flex items-center justify-between pb-3 border-b border-app-border">
        <div>
          <h2 className="text-sm font-semibold text-text-primary tracking-wide uppercase">
            <span className={mobileTab === 'preferences' ? 'hidden lg:inline' : 'inline'}>
              Course Selection
            </span>
            {mobileTab === 'preferences' && (
              <span className="lg:hidden">Preferences & Filters</span>
            )}
          </h2>
          <span className="text-xs text-text-muted">
            <span className={mobileTab === 'preferences' ? 'hidden lg:inline' : 'inline'}>
              {request.selectedCourses.length} course(s) selected
            </span>
            {mobileTab === 'preferences' && (
              <span className="lg:hidden">{request.selectedCourses.length} course(s) configured</span>
            )}
          </span>
        </div>

        <div className={`items-center gap-2 ${mobileTab === 'preferences' ? 'hidden lg:flex' : 'flex'}`}>
          {request.selectedCourses.length >= 2 && (
            <button
              type="button"
              onClick={() => setIsClearConfirmOpen((prev) => !prev)}
              className="text-xs font-semibold text-danger hover:underline hover:bg-danger-bg/50 px-2 py-1 rounded-btn transition-colors focus:outline-none focus:ring-2 focus:ring-danger/50"
              title="Clear all courses"
            >
              Clear all
            </button>
          )}

          {/* Credit Counter */}
          <div
            className={`px-3 py-1 rounded-chip text-xs font-bold border flex items-center gap-1.5 transition-colors ${
              totalCredits > 18
                ? 'bg-danger-bg text-danger border-danger/30'
                : totalCredits < 9 && totalCredits > 0
                ? 'bg-warning-bg text-warning border-warning/30'
                : totalCredits === 0
                ? 'bg-subtle text-text-muted border-app-border'
                : 'bg-success-bg text-success border-success/30'
            }`}
            title={
              totalCredits > 18
                ? 'Overload warning: > 18 credits requires departmental permission.'
                : totalCredits < 9 && totalCredits > 0
                ? 'Underload warning: Standard full-time minimum is 9 credits.'
                : 'Normal credit load (9-18 credits)'
            }
          >
            {totalCredits > 18 || (totalCredits < 9 && totalCredits > 0) ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : null}
            <span>{totalCredits} Credits</span>
          </div>
        </div>
      </div>

      {/* Clear All Confirmation Popover */}
      {isClearConfirmOpen && request.selectedCourses.length >= 2 && (
        <div className="p-3 rounded-card bg-surface border border-danger/30 shadow-warm space-y-2.5 animate-in fade-in duration-150">
          <div className="text-xs font-bold text-text-primary">
            Remove all {request.selectedCourses.length} courses?
          </div>
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={alsoResetPrefs}
              onChange={(e) => setAlsoResetPrefs(e.target.checked)}
              className="rounded border-app-border text-orange-500 focus:ring-orange-400"
            />
            <span>Also reset preferences & blocked time</span>
          </label>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsClearConfirmOpen(false);
                setAlsoResetPrefs(false);
              }}
              className="px-2.5 py-1 rounded-btn text-xs font-medium text-text-secondary hover:bg-subtle border border-app-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmClearAll}
              className="px-2.5 py-1 rounded-btn text-xs font-semibold text-white bg-danger hover:bg-danger/90 transition-colors shadow-xs"
            >
              Remove all
            </button>
          </div>
        </div>
      )}

      {/* Credit warning banner if outside 9-18 (Hidden on mobile preferences tab) */}
      <div className={mobileTab === 'preferences' ? 'hidden lg:block' : 'block'}>
        {totalCredits > 18 && (
          <div
            onClick={() => setCreditWarningExpanded((prev) => !prev)}
            role="button"
            tabIndex={0}
            className="p-2 sm:p-2.5 rounded-btn bg-danger-bg border border-danger/20 text-danger text-xs flex items-center justify-between gap-2 mb-2 cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold truncate sm:hidden">
                Overload: max 18 credits
              </span>
              <span className="hidden sm:inline">
                Overload: UIU limits standard enrollment to 18 credits.
              </span>
              {creditWarningExpanded && (
                <span className="sm:hidden text-[11px] block text-danger/90">
                  UIU limits standard enrollment to 18 credits.
                </span>
              )}
            </div>
            <span className="text-[11px] text-danger/70 underline shrink-0 sm:hidden">
              {creditWarningExpanded ? 'Less' : 'Info'}
            </span>
          </div>
        )}
        {totalCredits > 0 && totalCredits < 9 && (
          <div
            onClick={() => setCreditWarningExpanded((prev) => !prev)}
            role="button"
            tabIndex={0}
            className="p-2 sm:p-2.5 rounded-btn bg-warning-bg border border-warning/20 text-warning text-xs flex items-center justify-between gap-2 mb-2 cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold truncate sm:hidden">
                Underload: min 9 credits
              </span>
              <span className="hidden sm:inline">
                Underload: Standard regular status requires at least 9 credits.
              </span>
              {creditWarningExpanded && (
                <span className="sm:hidden text-[11px] block text-warning/90">
                  Standard regular status requires at least 9 credits.
                </span>
              )}
            </div>
            <span className="text-[11px] text-warning/70 underline shrink-0 sm:hidden">
              {creditWarningExpanded ? 'Less' : 'Info'}
            </span>
          </div>
        )}
      </div>

      {/* Search Trigger for Mobile & Desktop Input (Hidden on mobile preferences tab) */}
      <div className={`relative ${mobileTab === 'preferences' ? 'hidden lg:block' : 'block'}`}>
        {/* Mobile Search Trigger Button */}
        <div className="lg:hidden">
          <div
            onClick={openMobileSearch}
            className="relative flex items-center cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openMobileSearch();
              }
            }}
          >
            <Search className="w-4 h-4 absolute left-3 text-text-muted pointer-events-none" />
            <input
              type="text"
              readOnly
              placeholder="Search course, e.g. CSE 1111"
              className="w-full pl-9 pr-4 py-2.5 rounded-btn bg-subtle border border-app-border text-sm text-text-primary placeholder-text-muted cursor-pointer"
            />
          </div>
        </div>

        {/* Desktop Search & Autocomplete Input */}
        <div className="hidden lg:block">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-text-muted pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search code or title (e.g. CSE 1111, DSA)..."
              className="w-full pl-9 pr-8 py-2 rounded-btn bg-subtle border border-app-border text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 text-text-muted hover:text-text-primary"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Program Filter Pills */}
          <div className="flex items-center gap-1 mt-2">
            {(['ALL', 'BSCSE', 'BSDS'] as const).map((prog) => (
              <button
                key={prog}
                onClick={() => setProgramFilter(prog)}
                className={`px-2.5 py-1 rounded-btn text-[11px] font-medium transition-colors ${
                  programFilter === prog
                    ? 'bg-orange-500 text-white font-semibold'
                    : 'bg-subtle text-text-secondary hover:text-text-primary hover:bg-orange-50 border border-app-border'
                }`}
              >
                {prog}
              </button>
            ))}
          </div>

          {/* Desktop Autocomplete Dropdown */}
          {isSearchOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsSearchOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-surface border border-app-border rounded-card shadow-warm z-30 divide-y divide-app-border">
                {filteredCourses.length === 0 ? (
                  <div className="p-3 text-xs text-text-muted text-center">
                    No courses found matching &quot;{searchTerm}&quot;
                  </div>
                ) : (
                  filteredCourses.slice(0, 15).map((course) => {
                    const isSelected = (request.selectedCourses || []).includes(course.code);

                    return (
                      <div
                        key={course.code}
                        tabIndex={0}
                        role="button"
                        aria-label={isSelected ? `${course.code} is added. Click to remove` : `Add ${course.code}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (isSelected) {
                              handleInitiateRemove(course.code);
                            } else {
                              handleAddCourse(course.code);
                            }
                          }
                        }}
                        className="w-full p-2.5 hover:bg-subtle focus:bg-subtle flex items-center justify-between group transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-400"
                        onClick={() => {
                          if (isSelected) {
                            handleInitiateRemove(course.code);
                          } else {
                            if (onOpenExplorer) {
                              onOpenExplorer(course.code);
                            } else {
                              handleAddCourse(course.code);
                            }
                          }
                        }}
                      >
                        <div className="pr-2 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-text-primary group-hover:text-orange-600">
                              {course.code}
                            </span>
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-subtle text-text-secondary border border-app-border">
                              {course.credit} cr
                            </span>
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-subtle text-text-muted">
                              {course.program}
                            </span>
                            {isManualScheduleCourse(course.code) && (
                              <span className="text-[11px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-300 font-semibold flex items-center gap-0.5">
                                <Pencil className="w-2.5 h-2.5 text-amber-600" />
                                Manual
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-text-muted truncate">
                            {course.title}
                          </div>
                        </div>

                        {isSelected ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInitiateRemove(course.code);
                            }}
                            className="px-2 py-1 rounded-btn text-xs font-semibold bg-success-bg text-success border border-success/30 group-hover:bg-danger-bg group-hover:text-danger group-hover:border-danger/30 group-focus:bg-danger-bg group-focus:text-danger group-focus:border-danger/30 transition-colors flex items-center gap-1 flex-shrink-0"
                            title="Remove course"
                            aria-label={`Remove ${course.code}`}
                          >
                            <Check className="w-3.5 h-3.5 group-hover:hidden group-focus:hidden flex-shrink-0" />
                            <Trash2 className="w-3.5 h-3.5 hidden group-hover:inline group-focus:inline flex-shrink-0" />
                            <span className="group-hover:hidden group-focus:hidden text-[11px]">Added</span>
                            <span className="hidden group-hover:inline group-focus:inline text-[11px]">
                              Added · click to remove
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddCourse(course.code);
                            }}
                            className="w-6 h-6 rounded-btn bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white flex items-center justify-center flex-shrink-0 transition-colors border border-orange-200"
                            title="Add course"
                            aria-label={`Add ${course.code}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Full-Screen Search Sheet */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] h-[100dvh] lg:hidden">
          {/* Sticky Header */}
          <div className="px-4 py-3 border-b border-app-border bg-white space-y-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 absolute left-3 text-text-muted pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search course, e.g. CSE 1111"
                  className="w-full pl-9 pr-8 py-2 rounded-btn bg-subtle border border-app-border text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 text-text-muted hover:text-text-primary p-1"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={closeMobileSearch}
                className="min-w-[44px] min-h-[44px] px-3 py-2 text-sm font-semibold text-orange-600 hover:text-orange-700 active:bg-orange-50 rounded-btn transition-colors shrink-0"
              >
                Done
              </button>
            </div>

            {/* Program Filter Pills + Added Count Badge */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1.5">
                {(['ALL', 'BSCSE', 'BSDS'] as const).map((prog) => (
                  <button
                    key={prog}
                    type="button"
                    onClick={() => setProgramFilter(prog)}
                    className={`min-h-[32px] px-3 py-1 rounded-btn text-xs font-medium transition-colors ${
                      programFilter === prog
                        ? 'bg-orange-500 text-white font-semibold'
                        : 'bg-subtle text-text-secondary border border-app-border'
                    }`}
                  >
                    {prog}
                  </button>
                ))}
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 shrink-0">
                {request.selectedCourses.length} added
              </span>
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-app-border px-2 pb-6">
            {filteredCourses.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-muted">
                No courses found matching &quot;{searchTerm}&quot;
              </div>
            ) : (
              filteredCourses.map((course) => {
                const isSelected = (request.selectedCourses || []).includes(course.code);
                return (
                  <div
                    key={course.code}
                    onClick={() => {
                      if (isSelected) {
                        executeRemoveCourse(course.code, false);
                      } else {
                        handleAddCourse(course.code, true);
                      }
                    }}
                    className="min-h-[48px] p-3 flex items-center justify-between gap-3 active:bg-subtle cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-text-primary">
                          {course.code}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded bg-subtle text-text-secondary border border-app-border">
                          {course.credit} cr
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded bg-subtle text-text-muted">
                          {course.program}
                        </span>
                        {isManualScheduleCourse(course.code) && (
                          <span className="text-[11px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-300 font-semibold flex items-center gap-0.5">
                            <Pencil className="w-2.5 h-2.5 text-amber-600" />
                            Manual
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-muted truncate mt-0.5">
                        {course.title}
                      </div>
                    </div>

                    {isSelected ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          executeRemoveCourse(course.code, false);
                        }}
                        className="min-h-[36px] px-2.5 py-1 rounded-btn text-xs font-semibold bg-success-bg text-success border border-success/30 flex items-center gap-1 shrink-0"
                      >
                        <Check className="w-3.5 h-3.5 text-success" />
                        <span>Added</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddCourse(course.code, true);
                        }}
                        className="min-h-[36px] min-w-[36px] rounded-btn bg-orange-50 active:bg-orange-500 text-orange-600 active:text-white flex items-center justify-center shrink-0 border border-orange-200"
                        title="Add course"
                        aria-label={`Add ${course.code}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. Selected Courses List */}
      <div ref={courseListRef} className="selected-courses-box space-y-2.5 overflow-visible lg:overflow-y-auto pr-0 lg:pr-1">
        {selectedFYDPCourses.length > 1 && (
          <div className="p-2.5 rounded-btn bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>FYDP courses usually run one at a time; check UCAM.</span>
          </div>
        )}

        {selectedCourseObjs.length === 0 ? (
          <div className="p-5 sm:p-6 text-center border border-dashed border-app-border rounded-card bg-subtle/50 space-y-1.5">
            <div className="text-xs font-semibold text-text-primary">
              Get started with your routine
            </div>
            <p className="text-xs text-text-muted">
              Add your courses to see possible routines. Search above to begin.
            </p>
          </div>
        ) : (
          selectedCourseObjs.map((course) => {
            const isFixed = isFixedCourse(course.code);
            const courseSections = sectionsByCourse.get(course.code) || [];
            const lockedSecId = request.lockedSections?.[course.code] || '';
            const preferredFids = request.preferredFaculty?.[course.code] || [];
            const avoidFids = request.avoidFaculty?.[course.code] || [];

            // Distinct faculty teaching this course with section counts
            const facultyStats = new Map<string, { faculty: Faculty; count: number }>();
            for (const sec of courseSections) {
              for (const fid of sec.facultyIds) {
                const fac = facultyById.get(fid);
                if (fac) {
                  if (!facultyStats.has(fid)) {
                    facultyStats.set(fid, { faculty: fac, count: 0 });
                  }
                  facultyStats.get(fid)!.count++;
                }
              }
            }

            // Sorted sections by day/time for fixed courses
            const dayOrder: Record<string, number> = { Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 };
            const sortedFixedSections = isFixed
              ? [...courseSections].sort((a, b) => {
                  const mA = a.meetings[0];
                  const mB = b.meetings[0];
                  if (!mA && !mB) return 0;
                  if (!mA) return 1;
                  if (!mB) return -1;
                  const dA = dayOrder[mA.day] ?? 99;
                  const dB = dayOrder[mB.day] ?? 99;
                  if (dA !== dB) return dA - dB;
                  if (mA.start !== mB.start) return mA.start - mB.start;
                  if (mA.end !== mB.end) return mA.end - mB.end;
                  return a.section.localeCompare(b.section);
                })
              : courseSections;

            const chosenFixedSection = isFixed ? courseSections.find((s) => s.id === lockedSecId) : null;

            // Check if user has a blocked FYDP slot differing from the chosen section
            const blockedSlot = manualSchedules?.[course.code];
            let isDifferentFromBlocked = false;
            let blockedDesc = '';
            if (isFixed && blockedSlot && chosenFixedSection) {
              const bStart = parseTimeString(blockedSlot.startTime);
              const bEnd = parseTimeString(blockedSlot.endTime);
              blockedDesc = `${blockedSlot.days.join(', ')} ${blockedSlot.startTime}-${blockedSlot.endTime}`;
              const matches = chosenFixedSection.meetings.every(
                (m) => blockedSlot.days.includes(m.day) && m.start >= bStart && m.end <= bEnd
              );
              if (!matches) {
                isDifferentFromBlocked = true;
              }
            }

            const formatMeeting24 = (m: Meeting): string => {
              const sH = Math.floor(m.start / 60).toString().padStart(2, '0');
              const sM = (m.start % 60).toString().padStart(2, '0');
              const eH = Math.floor(m.end / 60).toString().padStart(2, '0');
              const eM = (m.end % 60).toString().padStart(2, '0');
              return `${m.day} ${sH}:${sM}-${eH}:${eM}`;
            };

            // Has paired lab not yet selected?
            const canAddLab =
              !isFixed &&
              course.hasLab &&
              course.labCode &&
              !request.selectedCourses.includes(course.labCode);

            return (
              <div
                key={course.code}
                role="listitem"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === 'Delete' || e.key === 'Backspace')) {
                    e.preventDefault();
                    handleInitiateRemove(course.code);
                  }
                }}
                className="p-3 rounded-card bg-surface border border-app-border hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-500 transition-all space-y-2 shadow-2xs"
              >
                {/* Course Header */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div
                    className={`min-w-0 flex-1 ${!isFixed && onOpenExplorer ? 'cursor-pointer' : ''}`}
                    onClick={() => !isFixed && onOpenExplorer && onOpenExplorer(course.code)}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-text-primary hover:text-orange-600 transition-colors">
                        {course.code}
                      </span>
                      <span className="text-[11px] px-1.5 py-0.2 rounded bg-subtle text-text-secondary border border-app-border font-medium">
                        {course.credit} cr
                      </span>
                      {!isFixed && lockedSecId && (
                        <span
                          data-testid={`locked-badge-${course.code}`}
                          className="text-[11px] px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 border border-orange-200 font-semibold flex items-center gap-0.5"
                          title="Section locked for this course"
                        >
                          <Lock className="w-2.5 h-2.5 text-orange-500" />
                          <span>Locked</span>
                        </span>
                      )}
                      {isFixed ? (
                        <span className="text-[11px] text-text-muted">
                          ({courseSections.length} available)
                        </span>
                      ) : isManualScheduleCourse(course.code) ? (
                        <span className="text-[11px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold flex items-center gap-1">
                          <Pencil className="w-2.5 h-2.5 text-amber-600" />
                          {manualSchedules[course.code]
                            ? `Manual: ${manualSchedules[course.code].days.join('-')} ${manualSchedules[course.code].startTime}-${manualSchedules[course.code].endTime}, Sec ${manualSchedules[course.code].section}`
                            : 'Manual: Schedule required'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-text-muted">
                          ({courseSections.length} secs)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-text-secondary font-medium line-clamp-1 mt-0.5">
                      {course.title}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isFixed ? null : isManualScheduleCourse(course.code) ? (
                      <button
                        type="button"
                        onClick={() => onOpenManualScheduleModal?.(course.code)}
                        className="px-1.5 py-0.5 text-amber-800 hover:text-amber-950 bg-amber-100/70 hover:bg-amber-100 border border-amber-300 rounded-btn transition-colors text-[11px] font-semibold flex items-center gap-1"
                        title="Edit schedule"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        <span>Edit</span>
                      </button>
                    ) : (
                      onOpenExplorer && (
                        <button
                          type="button"
                          onClick={() => onOpenExplorer(course.code)}
                          className="p-1 text-text-muted hover:text-orange-600 hover:bg-subtle rounded-btn transition-colors text-[11px]"
                          title="Faculty & sections explorer"
                          aria-label={`Explore faculty for ${course.code}`}
                        >
                          Sections
                        </button>
                      )
                    )}                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInitiateRemove(course.code);
                      }}
                      className={`relative items-center justify-center gap-1.5 h-8 min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] px-2 md:px-2.5 rounded-btn text-danger bg-transparent hover:bg-danger-bg border border-transparent hover:border-danger/30 transition-colors focus:outline-none focus:ring-2 focus:ring-danger/50 focus:border-danger flex-shrink-0 text-xs md:text-[13px] font-medium ${
                        mobileTab === 'preferences' ? 'hidden lg:flex' : 'flex'
                      }`}
                      title="Remove course"
                      aria-label={`Remove ${course.code} ${course.title}`}
                    >
                      <Trash2 className="w-4 h-4 text-danger flex-shrink-0" />
                      <span className="hidden md:inline font-medium">Remove</span>
                    </button>
                  </div>
                </div>

                {/* Inline Lab Removal Confirmation Prompt */}
                {pendingRemoveLabPair?.theoryCode === course.code && (
                  <div className="p-2.5 rounded-card bg-surface border border-danger/30 shadow-warm space-y-2 mt-1 animate-in fade-in duration-150">
                    <div className="text-xs font-semibold text-text-primary">
                      Also remove the lab {pendingRemoveLabPair.labCode}?
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        autoFocus
                        onClick={() => executeRemoveCourse(course.code, true)}
                        className="px-2.5 py-1 rounded-btn text-xs font-semibold bg-danger text-white hover:bg-danger/90 transition-colors shadow-xs"
                      >
                        Remove both (default)
                      </button>
                      <button
                        type="button"
                        onClick={() => executeRemoveCourse(course.code, false)}
                        className="px-2.5 py-1 rounded-btn text-xs font-medium text-text-primary bg-subtle hover:bg-app-border/40 border border-app-border transition-colors"
                      >
                        Keep lab only
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingRemoveLabPair(null)}
                        className="px-2 py-1 rounded-btn text-xs text-text-muted hover:text-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Co-requisite Lab One-Click Button */}
                {canAddLab && (
                  <button
                    onClick={() => handleAddLab(course.labCode!)}
                    className={`w-full py-1.5 px-2 rounded-btn bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold items-center justify-center gap-1.5 transition-colors group ${
                      mobileTab === 'preferences' ? 'hidden lg:flex' : 'flex'
                    }`}
                  >
                    <Beaker className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span>+ Add Co-requisite Lab ({course.labCode})</span>
                  </button>
                )}

                {/* Required Fixed FYDP Section Picker vs Manual vs Normal Lock/Faculty */}
                {isFixed ? (
                  <div className="space-y-2 pt-1">
                    {/* Section Picker Label */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-orange-600 font-bold flex items-center gap-1 text-[11px]">
                        <Lock className="w-3 h-3 text-orange-500" />
                        Choose Section (Required):
                      </span>
                      {lockedSecId && (
                        <span className="text-[11px] text-success font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3 text-success" />
                          Locked
                        </span>
                      )}
                    </div>

                    {/* Section Select Dropdown with NO "Any Section" option */}
                    <select
                      id={`fydp-section-picker-${course.code}`}
                      data-testid="fydp-section-picker"
                      aria-label={`Choose section for ${course.code}`}
                      value={lockedSecId}
                      onChange={(e) => handleLockSection(course.code, e.target.value)}
                      className={`w-full bg-subtle border rounded-btn py-1.5 px-2 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-orange-400 font-medium ${
                        lockedSecId ? 'border-orange-400 bg-orange-50/20' : 'border-amber-400 bg-amber-50/20'
                      }`}
                    >
                      {!lockedSecId && (
                        <option value="" disabled>
                          -- Choose your FYDP section (Required) --
                        </option>
                      )}
                      {sortedFixedSections.map((s) => {
                        const meetingStr = s.meetings.map(formatMeeting24).join(', ');
                        const facStr = s.faculty.join(', ') || 'Faculty TBA';
                        return (
                          <option key={s.id} value={s.id}>
                            Sec {s.section} - {meetingStr} - {facStr}
                          </option>
                        );
                      })}
                    </select>

                    {/* Until a section is chosen: small inline notice (orange/warning token) */}
                    {!lockedSecId && (
                      <div
                        data-testid="fydp-unselected-notice"
                        className="p-2 rounded-btn bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-medium flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Choose your FYDP section to continue</span>
                      </div>
                    )}

                    {/* Once chosen: Highlight the chosen one with day, time, room, faculty */}
                    {lockedSecId && chosenFixedSection && (
                      <div
                        data-testid="chosen-fydp-highlight"
                        className="p-2.5 rounded-btn bg-orange-50 border border-orange-300 text-text-primary text-xs space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between font-bold text-orange-950">
                          <span className="flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-orange-600" />
                            <span>Sec {chosenFixedSection.section}</span>
                          </span>
                          <span className="text-[11px] px-1.5 py-0.2 rounded bg-orange-200 text-orange-900 font-extrabold uppercase tracking-wider">
                            Fixed Section
                          </span>
                        </div>
                        <div className="text-[11px] text-text-secondary flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-orange-600 shrink-0" />
                          <span>
                            {chosenFixedSection.meetings
                              .map((m) => `${m.day} ${formatTime24(m.start)}–${formatTime24(m.end)}`)
                              .join(', ')}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-secondary flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 text-orange-600 shrink-0" />
                          <span>{chosenFixedSection.meetings[0]?.room || 'Room TBA'}</span>
                        </div>
                        <div className="text-[11px] text-text-secondary flex items-center gap-1 font-medium truncate">
                          <User className="w-3 h-3 text-orange-600 shrink-0" />
                          <span title={chosenFixedSection.faculty.join(', ')}>
                            {chosenFixedSection.faculty.join(', ') || 'Faculty TBA'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Blocked slot conflict hint */}
                    {isDifferentFromBlocked && blockedDesc && (
                      <div
                        data-testid="fydp-blocked-diff-hint"
                        className="p-2 rounded-btn bg-amber-50/90 border border-amber-300 text-amber-900 text-[11px] flex items-center justify-between gap-2"
                      >
                        <span className="flex-1">
                          Your blocked FYDP slot ({blockedDesc}) differs from the chosen section. Remove the block?
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveBlockedSlot?.(course.code)}
                          className="px-2 py-0.5 rounded-btn bg-amber-200 hover:bg-amber-300 text-amber-950 text-[11px] font-bold border border-amber-400 whitespace-nowrap transition-colors"
                        >
                          Remove block
                        </button>
                      </div>
                    )}
                  </div>
                ) : isManualScheduleCourse(course.code) ? (
                  <div className="text-[11px] text-text-muted bg-amber-50/50 p-2 rounded border border-amber-200/60 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium text-text-secondary">
                      <Pencil className="w-3 h-3 text-amber-600" />
                      <span>
                        {manualSchedules[course.code]
                          ? `Manual: ${formatManualScheduleDescription(manualSchedules[course.code])}`
                          : 'No schedule configured yet'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenManualScheduleModal?.(course.code)}
                      className="font-semibold text-amber-900 text-[11px] px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors flex items-center gap-1"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      <span>{manualSchedules[course.code] ? 'Edit' : 'Set Schedule'}</span>
                    </button>
                  </div>
                ) : (
                  <div className={`space-y-2 pt-1 ${mobileTab === 'courses' ? 'hidden lg:block' : 'block'}`}>
                    {/* Section Lock Dropdown */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-text-muted flex items-center gap-1 text-[11px] shrink-0">
                        {lockedSecId ? (
                          <Lock className="w-3 h-3 text-orange-500" />
                        ) : (
                          <Unlock className="w-3 h-3 text-text-muted" />
                        )}
                        Lock:
                      </span>
                      <select
                        aria-label={`Lock section for ${course.code}`}
                        value={lockedSecId}
                        onChange={(e) => handleLockSection(course.code, e.target.value)}
                        className={`flex-1 bg-subtle border rounded-btn py-1 px-2 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-orange-400 min-w-0 truncate ${
                          lockedSecId ? 'border-orange-400 bg-orange-50/20 font-medium' : 'border-app-border'
                        }`}
                      >
                        <option value="">Any Section ({courseSections.length} available)</option>
                        {courseSections.map((s) => (
                          <option key={s.id} value={s.id}>
                            Sec {s.section} — {s.meetings.map((m) => `${m.day} ${formatTime24(m.start)}`).join(', ')} ({s.faculty.join(', ')})
                          </option>
                        ))}
                      </select>
                      {lockedSecId && (
                        <button
                          type="button"
                          data-testid={`unlock-course-${course.code}`}
                          onClick={() => handleLockSection(course.code, '')}
                          className="p-1 min-h-[44px] min-w-[44px] md:min-h-[28px] md:min-w-[28px] rounded-btn text-orange-600 hover:text-orange-800 hover:bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0 transition-colors"
                          title={`Unlock ${course.code}`}
                          aria-label={`Unlock ${course.code}`}
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span className="sr-only">Unlock</span>
                        </button>
                      )}
                    </div>

                    {/* Faculty Preferences */}
                    {facultyStats.size > 0 && (
                      <details open className="text-[11px] group/details">
                        <summary className="cursor-pointer text-text-muted hover:text-text-primary select-none flex items-center justify-between py-1">
                          <span>
                            Faculty Preference{' '}
                            {preferredFids.length > 0 && (
                              <span className="text-success font-semibold">
                                ({preferredFids.length} pref)
                              </span>
                            )}
                            {avoidFids.length > 0 && (
                              <span className="text-danger font-semibold">
                                ({avoidFids.length} avoid)
                              </span>
                            )}
                          </span>
                          <ChevronDown className="w-3 h-3 group-open/details:rotate-180 transition-transform" />
                        </summary>

                        <div className="pt-1.5 space-y-1">
                          {Array.from(facultyStats.values()).map(({ faculty: f, count }) => {
                            const isPref = preferredFids.includes(f.id);
                            const isAvoid = avoidFids.includes(f.id);

                            return (
                              <div
                                key={f.id}
                                className="flex items-center justify-between p-1.5 rounded-btn bg-subtle border border-app-border"
                              >
                                <span className="text-text-primary truncate max-w-[170px]" title={f.name}>
                                  {f.name} <span className="text-text-muted">({count} sec)</span>
                                </span>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => toggleFacultyPref(course.code, f.id)}
                                    className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                      isPref
                                        ? 'bg-success text-white font-bold'
                                        : 'bg-surface text-text-secondary hover:text-success border border-app-border'
                                    }`}
                                    title="Prefer this faculty"
                                  >
                                    Prefer
                                  </button>
                                  <button
                                    onClick={() => toggleFacultyAvoid(course.code, f.id)}
                                    className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                      isAvoid
                                        ? 'bg-danger text-white font-bold'
                                        : 'bg-surface text-text-secondary hover:text-danger border border-app-border'
                                    }`}
                                    title="Avoid this faculty"
                                  >
                                    Avoid
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                    {/* FYDP Clash Information (if course has clashing sections) */}
                    {(() => {
                      if (isFixed) return null;
                      const clashInfo = fydpClashes.get(course.code);
                      if (!clashInfo) return null;
                      const lockedFYDPCode = (request.selectedCourses || []).find((c) => isFixedCourse(c));
                      const lockedFYDPSecId = lockedFYDPCode ? request.lockedSections?.[lockedFYDPCode] : null;
                      const lockedFYDPSec = lockedFYDPSecId ? sections.find((s) => s.id === lockedFYDPSecId) : null;
                      const activeManual = Object.values(manualSchedules)[0];
                      const clashLabel = lockedFYDPSec
                        ? `Sec ${lockedFYDPSec.section} (${lockedFYDPSec.meetings.map(formatMeeting24).join(', ')})`
                        : activeManual
                        ? `${activeManual.days.join(', ')} ${activeManual.startTime}–${activeManual.endTime}`
                        : 'Sat 11:11-13:40';
                      if (clashInfo.allSectionsClash) {
                        return (
                          <div className="p-2 rounded-btn bg-danger-bg border border-danger/30 text-danger text-xs flex items-start gap-1.5 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>FYDP {clashLabel} conflicts with all sections of {course.code}</span>
                          </div>
                        );
                      }
                      const isExpanded = expandedClashes.has(course.code);
                      return (
                        <div className="pt-1.5 border-t border-app-border text-[11px]">
                          <div className="flex items-center justify-between text-text-secondary">
                            <span className="font-medium">
                              <strong className="text-text-primary">{clashInfo.availableSections} of {clashInfo.totalSections}</strong> sections available
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedClashes((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(course.code)) next.delete(course.code);
                                  else next.add(course.code);
                                  return next;
                                });
                              }}
                              className="text-text-muted hover:text-text-primary underline flex items-center gap-0.5 text-[11px]"
                            >
                              <span>Hidden by FYDP ({clashInfo.hiddenSections.length})</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="mt-1.5 p-2 rounded bg-subtle border border-app-border text-[11px] space-y-1">
                              <div className="font-semibold text-text-muted">Clashes with FYDP ({clashLabel}):</div>
                              {clashInfo.hiddenSections.map((h) => (
                                <div key={h.section} className="flex items-center justify-between text-text-secondary">
                                  <span className="font-bold text-text-primary">Sec {h.section}</span>
                                  <span>{h.clashTimes}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
              </div>
            );
          })
        )}
      </div>

      {/* Dismissible Tip */}
      {showRemoveHint && selectedCourseObjs.length > 0 && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-btn bg-subtle border border-app-border text-[11px] text-text-muted">
          <span>Tip: click Remove or press Delete to drop a course.</span>
          <button
            type="button"
            onClick={handleDismissHint}
            className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors"
            aria-label="Dismiss tip"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Empty Notice for Preferences Tab when no courses selected */}
      {selectedCourseObjs.length === 0 && (
        <div className={`p-4 rounded-card bg-subtle border border-app-border text-center text-xs text-text-muted space-y-1 ${mobileTab === 'preferences' ? 'block lg:hidden' : 'hidden'}`}>
          <div className="font-semibold text-text-primary">No courses selected yet</div>
          <div>Switch to the Courses tab to add courses, then customize section locks and faculty preferences here.</div>
        </div>
      )}

      {/* 4. Filter & Weights Controls */}
      <div className={`border-t border-app-border pt-2 ${mobileTab === 'courses' ? 'hidden lg:block' : 'block'}`}>
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="w-full flex items-center justify-between py-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-orange-500" />
            Filters & Scoring Weights
          </span>
          {isFiltersOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {(isFiltersOpen || mobileTab === 'preferences') && (
          <div className="pt-2 space-y-4 text-xs animate-in fade-in duration-200">
              {/* Day Off Filters */}
              <div>
                <label className="block text-text-muted font-medium mb-1.5">
                  Must-Have Day Off (0 classes):
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {DAYS_LIST.map((day) => {
                    const isOff = (request.filterDayOff || []).includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => toggleDayOff(day)}
                        className={`py-1.5 rounded-btn text-xs font-bold transition-all ${
                          isOff
                            ? 'bg-danger-bg text-danger border border-danger/40 shadow-xs'
                            : 'bg-subtle text-text-secondary hover:bg-orange-50 border border-app-border'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Window Filters */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-text-muted font-medium mb-1">
                    Earliest Start:
                  </label>
                  <select
                    value={request.filterTimeWindow?.earliestStart || ''}
                    onChange={(e) =>
                      onRequestChange({
                        ...request,
                        filterTimeWindow: {
                          ...request.filterTimeWindow,
                          earliestStart: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        },
                      })
                    }
                    className="w-full bg-subtle border border-app-border rounded-btn p-1.5 text-xs text-text-primary"
                  >
                    <option value="">Any (from 08:30)</option>
                    <option value="591">09:50 AM or later</option>
                    <option value="671">11:10 AM or later</option>
                    <option value="751">12:30 PM or later</option>
                  </select>
                </div>

                <div>
                  <label className="block text-text-muted font-medium mb-1">
                    Latest End:
                  </label>
                  <select
                    value={request.filterTimeWindow?.latestEnd || ''}
                    onChange={(e) =>
                      onRequestChange({
                        ...request,
                        filterTimeWindow: {
                          ...request.filterTimeWindow,
                          latestEnd: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        },
                      })
                    }
                    className="w-full bg-subtle border border-app-border rounded-btn p-1.5 text-xs text-text-primary"
                  >
                    <option value="">Any (until 16:30)</option>
                    <option value="830">01:50 PM or earlier</option>
                    <option value="910">03:10 PM or earlier</option>
                    <option value="990">04:30 PM</option>
                  </select>
                </div>
              </div>

              {/* Max Gap Per Day */}
              <div>
                <label className="block text-text-muted font-medium mb-1">
                  Max Gap Between Classes:
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: 'Any', value: undefined },
                    { label: '60m', value: 60 },
                    { label: '120m', value: 120 },
                    { label: '180m', value: 180 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() =>
                        onRequestChange({
                          ...request,
                          maxGapMinutesPerDay: item.value,
                        })
                      }
                      className={`py-1 rounded-btn text-[11px] font-medium transition-colors ${
                        request.maxGapMinutesPerDay === item.value
                          ? 'bg-orange-500 text-white font-semibold'
                          : 'bg-subtle text-text-secondary hover:bg-orange-50 border border-app-border'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ranking Weights Sliders */}
              <div className="space-y-2 pt-2 border-t border-app-border">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">Ranking Weights</span>
                  <button
                    onClick={resetWeights}
                    className="text-[11px] text-text-muted hover:text-orange-600 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>

                {[
                  { key: 'facultyPreference' as const, label: 'Faculty Preference' },
                  { key: 'minimizeGaps' as const, label: 'Minimize Gaps' },
                  { key: 'compactDays' as const, label: 'Compact Days (Fewer days)' },
                  { key: 'avoidEarlyLate' as const, label: 'Avoid Early/Late Hours' },
                  { key: 'avoidTentative' as const, label: 'Avoid Tentative Sections' },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-[11px] text-text-muted">
                      <span>{label}</span>
                      <span className="font-mono font-semibold text-text-primary">
                        {request.weights[key]}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={request.weights[key]}
                      onChange={(e) =>
                        onRequestChange({
                          ...request,
                          weights: {
                            ...request.weights,
                            [key]: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      className="w-full accent-orange-500 h-1.5 bg-border rounded-lg cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      {/* Undo Toast */}
      {undoToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px)+16px)] md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-card bg-text-primary text-surface shadow-warm border border-app-border text-xs md:text-sm animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:transition-none motion-reduce:animate-none"
        >
          <span className="font-medium">{undoToast.message}</span>
          <span className="text-text-muted">·</span>
          <button
            type="button"
            onClick={handleUndo}
            className="font-bold text-orange-400 hover:text-orange-300 underline focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-1 transition-colors"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setUndoToast(null)}
            className="text-text-muted hover:text-surface ml-1 p-0.5 rounded transition-colors"
            aria-label="Dismiss undo notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
}
