'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Course,
  Day,
  DAYS_LIST,
  Faculty,
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
} from 'lucide-react';
import { formatTime24 } from '../utils/export';
import {
  isFixedCourse,
  getFixedScheduleDescription,
  computeFYDPClashes,
} from '../lib/fixedCourses';

interface CourseSelectorProps {
  courses: Course[];
  sections: Section[];
  faculty: Faculty[];
  request: SolveRequest;
  onRequestChange: (newRequest: SolveRequest) => void;
  onOpenExplorer?: (courseCode: string) => void;
}

export function CourseSelector({
  courses,
  sections,
  faculty,
  request,
  onRequestChange,
  onOpenExplorer,
}: CourseSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [programFilter, setProgramFilter] = useState<'ALL' | 'BSCSE' | 'BSDS'>('ALL');
  const [isFiltersOpen, setIsFiltersOpen] = useState(request.selectedCourses.length > 0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track courses that have "Hidden by FYDP" expanded
  const [expandedClashes, setExpandedClashes] = useState<Set<string>>(new Set());

  // Clashes between non-FYDP courses and active FYDP courses
  const fydpClashes = useMemo(() => {
    return computeFYDPClashes(request.selectedCourses || [], sections);
  }, [request.selectedCourses, sections]);

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

  // Filter available courses for autocomplete
  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const selectedSet = new Set(request.selectedCourses || []);

    return courses.filter((c) => {
      // Don't show already selected
      if (selectedSet.has(c.code)) return false;

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
  }, [courses, searchTerm, programFilter, request.selectedCourses]);

  // Toggle course selection
  const handleAddCourse = (courseCode: string) => {
    if ((request.selectedCourses || []).includes(courseCode)) return;
    const newCourses = [...(request.selectedCourses || []), courseCode];
    onRequestChange({
      ...request,
      selectedCourses: newCourses,
    });
    setSearchTerm('');
    setIsSearchOpen(false);
  };

  const handleRemoveCourse = (courseCode: string) => {
    const newCourses = (request.selectedCourses || []).filter((c) => c !== courseCode);
    const newPref = { ...request.preferredFaculty };
    delete newPref[courseCode];
    const newAvoid = { ...request.avoidFaculty };
    delete newAvoid[courseCode];
    const newLock = { ...request.lockedSections };
    delete newLock[courseCode];

    onRequestChange({
      ...request,
      selectedCourses: newCourses,
      preferredFaculty: newPref,
      avoidFaculty: newAvoid,
      lockedSections: newLock,
    });
  };

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
    const current = request.avoidFaculty?.[courseCode] || [];
    const isSelected = current.includes(facultyId);

    const updatedAvoid = isSelected
      ? current.filter((id) => id !== facultyId)
      : [...current, facultyId];

    // Remove from preferred if added to avoid
    const prefCurrent = request.preferredFaculty?.[courseCode] || [];
    const updatedPref = prefCurrent.filter((id) => id !== facultyId);

    onRequestChange({
      ...request,
      preferredFaculty: {
        ...request.preferredFaculty,
        [courseCode]: updatedPref,
      },
      avoidFaculty: {
        ...request.avoidFaculty,
        [courseCode]: updatedAvoid,
      },
    });
  };

  // Reset weights
  const resetWeights = () => {
    onRequestChange({
      ...request,
      weights: {
        facultyPreference: 30,
        minimizeGaps: 25,
        compactDays: 20,
        avoidEarlyLate: 15,
        avoidTentative: 10,
      },
    });
  };

  return (
    <aside className="w-full flex-shrink-0 flex flex-col space-y-3.5 bg-surface p-4 rounded-card border border-app-border shadow-warm lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] overflow-y-auto">
      {/* 1. Header with Credit Limit Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-app-border">
        <div>
          <h2 className="text-sm font-semibold text-text-primary tracking-wide uppercase">
            Course Selection
          </h2>
          <span className="text-xs text-text-muted">
            {request.selectedCourses.length} course(s) selected
          </span>
        </div>

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

      {/* Credit warning banner if outside 9-18 */}
      {totalCredits > 18 && (
        <div className="p-2.5 rounded-btn bg-danger-bg border border-danger/20 text-danger text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Overload: UIU limits standard enrollment to 18 credits.</span>
        </div>
      )}
      {totalCredits > 0 && totalCredits < 9 && (
        <div className="p-2.5 rounded-btn bg-warning-bg border border-warning/20 text-warning text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Underload: Standard regular status requires at least 9 credits.</span>
        </div>
      )}

      {/* Search & Autocomplete Input */}
      <div className="relative">
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

        {/* Autocomplete Dropdown */}
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
                filteredCourses.slice(0, 15).map((course) => (
                  <div
                    key={course.code}
                    className="w-full p-2.5 hover:bg-subtle flex items-center justify-between group transition-colors cursor-pointer"
                    onClick={() => {
                      if (onOpenExplorer) {
                        onOpenExplorer(course.code);
                      } else {
                        handleAddCourse(course.code);
                      }
                    }}
                  >
                    <div className="pr-2 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-text-primary group-hover:text-orange-600">
                          {course.code}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-subtle text-text-secondary border border-app-border">
                          {course.credit} cr
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-subtle text-text-muted">
                          {course.program}
                        </span>
                        {isFixedCourse(course.code) && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-300 font-semibold flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5 text-amber-600" />
                            Fixed
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted truncate">
                        {course.title}
                      </div>
                    </div>
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
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* 3. Selected Courses List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {selectedFYDPCourses.length > 1 && (
          <div className="p-2.5 rounded-btn bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>FYDP courses usually run one at a time; check UCAM.</span>
          </div>
        )}

        {selectedCourseObjs.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-app-border rounded-card text-text-muted text-xs">
            No courses selected yet.
            <br />
            Search courses above to build your routine.
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

            // Has paired lab not yet selected?
            const canAddLab =
              !isFixed &&
              course.hasLab &&
              course.labCode &&
              !request.selectedCourses.includes(course.labCode);

            return (
              <div
                key={course.code}
                className="p-3 rounded-card bg-surface border border-app-border hover:border-orange-300 transition-all space-y-2 shadow-2xs"
              >
                {/* Course Header */}
                <div className="flex items-start justify-between">
                  <div
                    className={onOpenExplorer ? 'cursor-pointer' : ''}
                    onClick={() => onOpenExplorer && onOpenExplorer(course.code)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-text-primary hover:text-orange-600 transition-colors">
                        {course.code}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-subtle text-text-secondary border border-app-border font-medium">
                        {course.credit} cr
                      </span>
                      {isFixed ? (
                        <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-amber-600" />
                          Fixed: Sat 11:11 AM-01:40 PM
                        </span>
                      ) : (
                        <span className="text-[10px] text-text-muted">
                          ({courseSections.length} secs)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-text-secondary font-medium line-clamp-1">
                      {course.title}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {onOpenExplorer && !isFixed && (
                      <button
                        onClick={() => onOpenExplorer(course.code)}
                        className="p-1 text-text-muted hover:text-orange-600 hover:bg-subtle rounded-btn transition-colors text-[10px]"
                        title="Faculty & sections explorer"
                        aria-label={`Explore faculty for ${course.code}`}
                      >
                        Sections
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveCourse(course.code)}
                      className="p-1 text-text-muted hover:text-danger hover:bg-danger-bg rounded-btn transition-colors"
                      title="Remove course"
                      aria-label={`Remove ${course.code}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Co-requisite Lab One-Click Button */}
                {canAddLab && (
                  <button
                    onClick={() => handleAddLab(course.labCode!)}
                    className="w-full py-1.5 px-2 rounded-btn bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors group"
                  >
                    <Beaker className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span>+ Add Co-requisite Lab ({course.labCode})</span>
                  </button>
                )}

                {/* Fixed Course Info Row vs Configurable Lock/Faculty */}
                {isFixed ? (
                  <div className="text-[11px] text-text-muted bg-amber-50/50 p-2 rounded border border-amber-200/60 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium text-text-secondary">
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>Section I • Saturday 11:11 AM–01:40 PM</span>
                    </span>
                    <span className="font-semibold text-amber-800 text-[10px] px-1.5 py-0.2 rounded bg-amber-100 border border-amber-200">
                      Fixed Schedule
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Section Lock Dropdown */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-text-muted flex items-center gap-1 text-[11px]">
                        {lockedSecId ? (
                          <Lock className="w-3 h-3 text-orange-500" />
                        ) : (
                          <Unlock className="w-3 h-3 text-text-muted" />
                        )}
                        Lock:
                      </span>
                      <select
                        value={lockedSecId}
                        onChange={(e) => handleLockSection(course.code, e.target.value)}
                        className="flex-1 bg-subtle border border-app-border rounded-btn py-1 px-2 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-orange-400"
                      >
                        <option value="">Any Section ({courseSections.length} available)</option>
                        {courseSections.map((s) => (
                          <option key={s.id} value={s.id}>
                            Sec {s.section} — {s.meetings.map((m) => `${m.day} ${formatTime24(m.start)}`).join(', ')} ({s.faculty.join(', ')})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Faculty Preferences */}
                    {facultyStats.size > 0 && (
                      <details className="text-[11px] group/details">
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
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
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
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
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

                    {/* FYDP Clash Information (if course has clashing sections) */}
                    {(() => {
                      const clashInfo = fydpClashes.get(course.code);
                      if (!clashInfo) return null;
                      if (clashInfo.allSectionsClash) {
                        return (
                          <div className="p-2 rounded-btn bg-danger-bg border border-danger/30 text-danger text-xs flex items-start gap-1.5 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>No section of {course.code} fits around FYDP (Sat 11:11 AM-01:40 PM)</span>
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
                              className="text-text-muted hover:text-text-primary underline flex items-center gap-0.5 text-[10px]"
                            >
                              <span>Hidden by FYDP ({clashInfo.hiddenSections.length})</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="mt-1.5 p-2 rounded bg-subtle border border-app-border text-[10px] space-y-1">
                              <div className="font-semibold text-text-muted">Clashes with Saturday 11:11 AM–01:40 PM:</div>
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
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Collapsible Filter & Weights Controls */}
      <div className="border-t border-app-border pt-2">
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

        {isFiltersOpen && (
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
                  className="text-[10px] text-text-muted hover:text-orange-600 flex items-center gap-1"
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
    </aside>
  );
}
