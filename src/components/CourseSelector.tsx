'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Course,
  Day,
  DAYS_LIST,
  Faculty,
  ScoreWeights,
  Section,
  SolveRequest,
} from '../types';
import { COURSE_PRESETS, CoursePreset } from '../utils/presets';
import {
  Search,
  Plus,
  Trash2,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
  AlertTriangle,
  Beaker,
  UserCheck,
  UserX,
  X,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { formatTime24 } from '../utils/export';

interface CourseSelectorProps {
  courses: Course[];
  sections: Section[];
  faculty: Faculty[];
  request: SolveRequest;
  onRequestChange: (newRequest: SolveRequest) => void;
  onApplyPreset: (preset: CoursePreset) => void;
}

export function CourseSelector({
  courses,
  sections,
  faculty,
  request,
  onRequestChange,
  onApplyPreset,
}: CourseSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [programFilter, setProgramFilter] = useState<'ALL' | 'BSCSE' | 'BSDS'>('ALL');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    <aside className="w-full lg:w-96 flex-shrink-0 flex flex-col space-y-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
      {/* 1. Header with Credit Limit Badge */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
            Course Selection
          </h2>
          <span className="text-xs text-slate-400">
            {request.selectedCourses.length} course(s) selected
          </span>
        </div>

        {/* Credit Counter */}
        <div
          className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
            totalCredits > 18
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : totalCredits < 9 && totalCredits > 0
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : totalCredits === 0
              ? 'bg-slate-800 text-slate-400 border-slate-700'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
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
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>Overload: UIU limits standard enrollment to 18 credits.</span>
        </div>
      )}
      {totalCredits > 0 && totalCredits < 9 && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>Underload: Standard regular status requires at least 9 credits.</span>
        </div>
      )}

      {/* 2. Presets Bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1 font-medium text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" /> Quick Presets
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {COURSE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onApplyPreset(preset)}
              className="text-left p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-orange-500/40 text-xs transition-all group"
            >
              <div className="font-semibold text-slate-200 group-hover:text-orange-400 truncate">
                {preset.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {preset.courses.length} courses
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Search & Autocomplete Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
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
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 text-slate-400 hover:text-white"
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
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                programFilter === prog
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
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
            <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-30 divide-y divide-slate-800/50">
              {filteredCourses.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">
                  No courses found matching &quot;{searchTerm}&quot;
                </div>
              ) : (
                filteredCourses.slice(0, 15).map((course) => (
                  <button
                    key={course.code}
                    onClick={() => handleAddCourse(course.code)}
                    className="w-full p-2.5 text-left hover:bg-slate-900 flex items-center justify-between group transition-colors"
                  >
                    <div className="pr-2 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-white group-hover:text-orange-400">
                          {course.code}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {course.credit} cr
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/60 text-slate-400">
                          {course.program}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {course.title}
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-md bg-orange-500/10 group-hover:bg-orange-500 text-orange-400 group-hover:text-white flex items-center justify-center flex-shrink-0 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* 4. Selected Courses List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {selectedCourseObjs.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
            No courses selected yet.
            <br />
            Select from quick presets or search courses above.
          </div>
        ) : (
          selectedCourseObjs.map((course) => {
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
              course.hasLab &&
              course.labCode &&
              !request.selectedCourses.includes(course.labCode);

            return (
              <div
                key={course.code}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all space-y-2"
              >
                {/* Course Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white">
                        {course.code}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
                        {course.credit} cr
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({courseSections.length} secs)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium line-clamp-1">
                      {course.title}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveCourse(course.code)}
                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                    title="Remove course"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Co-requisite Lab One-Click Button */}
                {canAddLab && (
                  <button
                    onClick={() => handleAddLab(course.labCode!)}
                    className="w-full py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors group animate-pulse"
                  >
                    <Beaker className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    <span>+ Add Co-requisite Lab ({course.labCode})</span>
                  </button>
                )}

                {/* Section Lock Dropdown */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    {lockedSecId ? (
                      <Lock className="w-3 h-3 text-orange-400" />
                    ) : (
                      <Unlock className="w-3 h-3 text-slate-500" />
                    )}
                    Lock:
                  </span>
                  <select
                    value={lockedSecId}
                    onChange={(e) => handleLockSection(course.code, e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-md py-1 px-2 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
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
                    <summary className="cursor-pointer text-slate-400 hover:text-slate-200 select-none flex items-center justify-between py-1">
                      <span>
                        Faculty Preference{' '}
                        {preferredFids.length > 0 && (
                          <span className="text-emerald-400 font-semibold">
                            ({preferredFids.length} pref)
                          </span>
                        )}
                        {avoidFids.length > 0 && (
                          <span className="text-rose-400 font-semibold">
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
                            className="flex items-center justify-between p-1.5 rounded-md bg-slate-900/60 border border-slate-800"
                          >
                            <span className="text-slate-300 truncate max-w-[170px]" title={f.name}>
                              {f.name} <span className="text-slate-500">({count} sec)</span>
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleFacultyPref(course.code, f.id)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  isPref
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-emerald-300'
                                }`}
                                title="Prefer this faculty"
                              >
                                Prefer
                              </button>
                              <button
                                onClick={() => toggleFacultyAvoid(course.code, f.id)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  isAvoid
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-rose-300'
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
            );
          })
        )}
      </div>

      {/* 5. Collapsible Filter & Weights Controls */}
      <div className="border-t border-slate-800 pt-2">
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="w-full flex items-center justify-between py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-orange-400" />
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
              <label className="block text-slate-400 font-medium mb-1.5">
                Must-Have Day Off (0 classes):
              </label>
              <div className="grid grid-cols-5 gap-1">
                {DAYS_LIST.map((day) => {
                  const isOff = (request.filterDayOff || []).includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDayOff(day)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isOff
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm shadow-rose-500/20'
                          : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 border border-slate-700/60'
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
                <label className="block text-slate-400 font-medium mb-1">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                >
                  <option value="">Any (from 08:30)</option>
                  <option value="591">09:50 AM or later</option>
                  <option value="671">11:10 AM or later</option>
                  <option value="751">12:30 PM or later</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
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
              <label className="block text-slate-400 font-medium mb-1">
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
                    className={`py-1 rounded-md text-[11px] font-medium transition-colors ${
                      request.maxGapMinutesPerDay === item.value
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ranking Weights Sliders */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Ranking Weights</span>
                <button
                  onClick={resetWeights}
                  className="text-[10px] text-slate-400 hover:text-orange-400 flex items-center gap-1"
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
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{label}</span>
                    <span className="font-mono text-slate-200">
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
                    className="w-full accent-orange-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
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
