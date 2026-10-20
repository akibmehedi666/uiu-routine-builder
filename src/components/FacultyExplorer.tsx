'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Course, Day, DAYS_LIST, Section } from '../types';
import {
  FacultySectionGroup,
  SortByOption,
  TimeOfDayOption,
  groupCourseSectionsByFaculty,
  filterSections,
  sortFacultyGroups,
  checkSectionClash,
} from '../lib/courseExplorer';
import { formatTime24 } from '../utils/export';
import { getCourseColor } from '../utils/colors';
import {
  X,
  Search,
  Filter,
  Copy,
  Check,
  UserCheck,
  UserX,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  Layers,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';

interface FacultyExplorerProps {
  courseCode: string | null;
  onClose: () => void;
  courses: Course[];
  sections: Section[];
  selectedCourses: string[];
  preferredFaculty: Record<string, string[]>;
  avoidFaculty: Record<string, string[]>;
  onTogglePreferred: (courseCode: string, facultyId: string) => void;
  onToggleAvoid: (courseCode: string, facultyId: string) => void;
  onAddCourse: (courseCode: string) => void;
  onRemoveCourse: (courseCode: string) => void;
  activeScheduleSections?: Section[];
  onHoverSection?: (section: Section | null) => void;
}

export function FacultyExplorer({
  courseCode,
  onClose,
  courses,
  sections,
  selectedCourses,
  preferredFaculty,
  avoidFaculty,
  onTogglePreferred,
  onToggleAvoid,
  onAddCourse,
  onRemoveCourse,
  activeScheduleSections = [],
  onHoverSection,
}: FacultyExplorerProps) {
  const [activeCourseCode, setActiveCourseCode] = useState<string | null>(courseCode);
  const [facultyQuery, setFacultyQuery] = useState('');
  const [dayFilter, setDayFilter] = useState<Day[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayOption>('all');
  const [sortBy, setSortBy] = useState<SortByOption>('name');
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync internal activeCourseCode with prop
  useEffect(() => {
    if (courseCode) {
      setActiveCourseCode(courseCode);
    }
  }, [courseCode]);

  // Toast timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && courseCode) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [courseCode, onClose]);

  // Find course object
  const course = useMemo(() => {
    return courses.find((c) => c.code === activeCourseCode) || null;
  }, [courses, activeCourseCode]);

  // Paired co-requisite course if available
  const pairedCourse = useMemo(() => {
    if (!course) return null;
    if (course.hasLab && course.labCode) {
      return courses.find((c) => c.code === course.labCode) || null;
    }
    if (course.theoryCode) {
      return courses.find((c) => c.code === course.theoryCode) || null;
    }
    return null;
  }, [course, courses]);

  // All sections for active course
  const courseSections = useMemo(() => {
    if (!activeCourseCode) return [];
    return sections.filter((s) => s.courseCode === activeCourseCode);
  }, [sections, activeCourseCode]);

  // Filtered sections
  const filtered = useMemo(() => {
    return filterSections(courseSections, {
      facultyQuery,
      dayFilter,
      timeOfDay,
    });
  }, [courseSections, facultyQuery, dayFilter, timeOfDay]);

  // Faculty groups
  const facultyGroups = useMemo(() => {
    const rawGroups = groupCourseSectionsByFaculty(filtered);
    return sortFacultyGroups(rawGroups, sortBy);
  }, [filtered, sortBy]);

  // Total distinct faculty count
  const totalFacultyCount = useMemo(() => {
    const rawAll = groupCourseSectionsByFaculty(courseSections);
    return rawAll.length;
  }, [courseSections]);

  const activeFilterCount =
    (facultyQuery ? 1 : 0) + dayFilter.length + (timeOfDay !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setFacultyQuery('');
    setDayFilter([]);
    setTimeOfDay('all');
  };

  const isSelected = activeCourseCode ? selectedCourses.includes(activeCourseCode) : false;

  const handleFacultyPreference = (type: 'pref' | 'avoid', facultyId: string) => {
    if (!activeCourseCode) return;
    if (!isSelected) {
      onAddCourse(activeCourseCode);
      setToastMessage(`Added ${activeCourseCode} to selection`);
    }
    if (type === 'pref') {
      onTogglePreferred(activeCourseCode, facultyId);
    } else {
      onToggleAvoid(activeCourseCode, facultyId);
    }
  };

  const handleCopyList = async () => {
    if (!course || courseSections.length === 0) return;
    const lines = [
      `=== ${course.code}: ${course.title} (${course.credit} Cr) ===`,
      `Total Sections: ${courseSections.length}`,
      '',
    ];

    for (const group of facultyGroups) {
      lines.push(`Faculty: ${group.facultyName}`);
      for (const s of group.sections) {
        const meets = s.meetings
          .map((m) => `${m.day} ${formatTime24(m.start)}-${formatTime24(m.end)} (R: ${m.room || 'TBA'})`)
          .join(', ');
        lines.push(`  - Sec ${s.section}: ${meets}`);
      }
      lines.push('');
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Failed to copy to clipboard.');
    }
  };

  if (!courseCode || !course) return null;

  const courseColor = getCourseColor(course.code);

  return (
    <>
      {/* Backdrop for mobile & click-outside on desktop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer (Desktop: Right ~520px; Mobile: Bottom sheet) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="explorer-title"
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] bg-surface border-l border-app-border shadow-2xl flex flex-col max-h-screen overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-chip bg-orange-500 text-white text-xs font-semibold shadow-warm animate-in fade-in">
            {toastMessage}
          </div>
        )}

        {/* 1. Header */}
        <div className="p-4 sm:p-5 border-b border-app-border bg-subtle/50 flex flex-col space-y-3">
          <div className="flex items-start justify-between">
            <div className="pr-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  id="explorer-title"
                  className="font-extrabold text-lg text-text-primary tracking-tight"
                >
                  {course.code}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-surface text-text-secondary border border-app-border">
                  {course.credit} Credits
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-surface text-text-muted border border-app-border">
                  {course.program}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-text-secondary mt-1 leading-snug">
                {course.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Add/Selected Toggle */}
              <button
                onClick={() => {
                  if (isSelected) {
                    onRemoveCourse(course.code);
                  } else {
                    onAddCourse(course.code);
                  }
                }}
                className={`px-3 py-1.5 rounded-btn text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs ${
                  isSelected
                    ? 'bg-success-bg text-success border border-success/30 hover:bg-rose-50 hover:text-danger hover:border-danger/30'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Selected</span>
                  </>
                ) : (
                  <span>+ Add Course</span>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-subtle rounded-btn transition-colors"
                aria-label="Close explorer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Theory / Lab Tabs if paired */}
          {pairedCourse && (
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => setActiveCourseCode(course.hasLab ? course.code : pairedCourse.code)}
                className={`px-3 py-1 rounded-btn text-xs font-semibold transition-all ${
                  activeCourseCode === (course.hasLab ? course.code : pairedCourse.code)
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'bg-surface text-text-secondary hover:bg-subtle border border-app-border'
                }`}
              >
                Theory ({course.hasLab ? course.code : pairedCourse.code})
              </button>
              <button
                onClick={() => setActiveCourseCode(course.hasLab ? pairedCourse.code : course.code)}
                className={`px-3 py-1 rounded-btn text-xs font-semibold transition-all ${
                  activeCourseCode === (course.hasLab ? pairedCourse.code : course.code)
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'bg-surface text-text-secondary hover:bg-subtle border border-app-border'
                }`}
              >
                Laboratory ({course.hasLab ? pairedCourse.code : course.code})
              </button>
            </div>
          )}

          {/* Counts & Copy List Action */}
          <div className="flex items-center justify-between text-xs text-text-muted pt-1">
            <span>
              {courseSections.length} section{courseSections.length > 1 ? 's' : ''} • {totalFacultyCount} faculty member{totalFacultyCount > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleCopyList}
              className="text-xs text-orange-600 hover:text-orange-500 font-medium flex items-center gap-1"
              title="Copy plain-text faculty & sections list"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied list!' : 'Copy faculty list'}</span>
            </button>
          </div>
        </div>

        {/* 2. Controls & Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-app-border bg-surface space-y-3">
          {/* Search by faculty */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={facultyQuery}
              onChange={(e) => setFacultyQuery(e.target.value)}
              placeholder="Search faculty name or initials..."
              className="w-full pl-9 pr-3 py-1.5 rounded-btn bg-subtle border border-app-border text-xs text-text-primary placeholder-text-muted focus:ring-2 focus:ring-orange-400 focus:border-orange-500 transition-all"
            />
          </div>

          {/* Day Chips & Time Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Days */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-text-muted mr-1">Day:</span>
              {DAYS_LIST.map((day) => {
                const isActive = dayFilter.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => {
                      if (isActive) {
                        setDayFilter(dayFilter.filter((d) => d !== day));
                      } else {
                        setDayFilter([...dayFilter, day]);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      isActive
                        ? 'bg-orange-500 text-white font-bold'
                        : 'bg-subtle text-text-secondary hover:bg-orange-50 border border-app-border'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Time of day segmented selector */}
            <div className="flex items-center gap-1">
              {(['all', 'morning', 'midday', 'afternoon'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeOfDay(t)}
                  className={`px-2 py-0.5 rounded text-[11px] capitalize transition-colors ${
                    timeOfDay === t
                      ? 'bg-orange-500 text-white font-semibold'
                      : 'bg-subtle text-text-muted hover:text-text-primary border border-app-border'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Sort & Active Filter Summary */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-app-border/60">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-text-muted">Sort:</span>
              {(['name', 'time', 'section'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`px-2 py-0.5 rounded text-[10px] capitalize font-medium ${
                    sortBy === s
                      ? 'text-orange-600 font-bold bg-orange-50 border border-orange-200'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  By {s}
                </button>
              ))}
            </div>

            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-orange-600 font-semibold">
                  {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}
                </span>
                <button
                  onClick={clearFilters}
                  className="text-text-muted hover:text-text-primary underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Faculty Groups List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {facultyGroups.length === 0 ? (
            <div className="p-8 text-center rounded-card border border-dashed border-app-border text-xs text-text-muted space-y-3">
              <p>No sections match your active filters.</p>
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 rounded-btn bg-surface hover:bg-subtle text-text-primary font-semibold border border-app-border shadow-2xs inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
                <span>Clear filters</span>
              </button>
            </div>
          ) : (
            facultyGroups.map((group) => {
              const prefList = preferredFaculty[course.code] || [];
              const avoidList = avoidFaculty[course.code] || [];
              const isPref = prefList.includes(group.facultyId);
              const isAvoid = avoidList.includes(group.facultyId);

              return (
                <div
                  key={group.facultyId}
                  className="p-3.5 rounded-card bg-surface border border-app-border shadow-2xs space-y-2.5 transition-all hover:border-orange-300"
                >
                  {/* Faculty Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-app-border">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-text-primary">
                        {group.facultyName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-subtle text-text-muted border border-app-border">
                        {group.sections.length} section{group.sections.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Prefer / Avoid quick buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleFacultyPreference('pref', group.facultyId)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          isPref
                            ? 'bg-success text-white'
                            : 'bg-subtle text-text-secondary hover:text-success border border-app-border'
                        }`}
                        title="Prefer this faculty in solver scoring"
                      >
                        Prefer
                      </button>
                      <button
                        onClick={() => handleFacultyPreference('avoid', group.facultyId)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          isAvoid
                            ? 'bg-danger text-white'
                            : 'bg-subtle text-text-secondary hover:text-danger border border-app-border'
                        }`}
                        title="Avoid this faculty in solver scoring"
                      >
                        Avoid
                      </button>
                    </div>
                  </div>

                  {/* Section Rows */}
                  <div className="space-y-1.5">
                    {group.sections.map((sec) => {
                      const clashCourse = checkSectionClash(sec, activeScheduleSections);

                      return (
                        <div
                          key={sec.id}
                          onMouseEnter={() => onHoverSection && onHoverSection(sec)}
                          onMouseLeave={() => onHoverSection && onHoverSection(null)}
                          className="p-2 rounded-btn bg-subtle border border-app-border hover:border-orange-400 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                        >
                          {/* Left: Section badge & Time */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-extrabold text-xs text-text-primary px-1.5 py-0.5 rounded bg-surface border border-app-border">
                              Sec {sec.section}
                            </span>

                            <div className="text-[11px] text-text-secondary">
                              <span className="font-semibold text-text-primary">
                                {sec.meetings.map((m) => m.day).join('/')}
                              </span>{' '}
                              <span>
                                {formatTime24(sec.meetings[0]?.start)}–{formatTime24(sec.meetings[0]?.end)}
                              </span>
                              {sec.meetings[0]?.room && (
                                <span className="text-text-muted ml-1.5">
                                  • Room {sec.meetings[0].room}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Badges & Mini 5-Day Strip */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Clash Badge if clashes with active routine */}
                            {clashCourse && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-danger-bg text-danger border border-danger/30 flex items-center gap-0.5"
                                title={`Clashes with ${clashCourse} in active routine`}
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Clashes with {clashCourse}
                              </span>
                            )}

                            {/* Tentative badge */}
                            {sec.tentative && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Tentative
                              </span>
                            )}

                            {/* Mini 5-Day Strip */}
                            <div className="flex items-center gap-0.5" title="Day schedule distribution">
                              {DAYS_LIST.map((d) => {
                                const activeOnDay = sec.meetings.some((m) => m.day === d);
                                return (
                                  <div
                                    key={d}
                                    style={{
                                      backgroundColor: activeOnDay ? courseColor.accent : '#F1E4D6',
                                    }}
                                    className={`w-2 h-3.5 rounded-2xs transition-colors`}
                                    title={`${d}: ${activeOnDay ? 'Class' : 'Off'}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
