'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, X, RotateCcw } from 'lucide-react';
import { Course, Day, Meeting, Section } from '../types';
import rawFaculty from '../../data/faculty.json';
import { formatTime24 } from '../utils/export';
import { naturalSectionSort } from '../lib/courseDirectory';

const DAY_FULL_NAMES: Record<Day, string> = {
  Sat: 'Saturday',
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
};

interface DroppedSectionsPanelProps {
  sections: Section[];
  courses: Course[];
  onClose: () => void;
}

function naturalCourseCodeSort(a: string, b: string): number {
  const [aDept, aNum] = a.split(/\s+/);
  const [bDept, bNum] = b.split(/\s+/);
  if (aDept !== bDept) {
    return (aDept || '').localeCompare(bDept || '');
  }
  const aVal = parseInt(aNum || '0', 10);
  const bVal = parseInt(bNum || '0', 10);
  if (isNaN(aVal) || isNaN(bVal)) {
    return (aNum || '').localeCompare(bNum || '');
  }
  return aVal - bVal;
}

export function DroppedSectionsPanel({
  sections,
  courses,
  onClose,
}: DroppedSectionsPanelProps) {
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState<'ALL' | 'BSCSE' | 'BSDS'>('ALL');

  const activeFacultyIds = useMemo(
    () => new Set(rawFaculty.map((f: { id: string }) => f.id)),
    []
  );

  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses) {
      map.set(`${c.program}-${c.code}`, c);
      map.set(c.code, c);
    }
    return map;
  }, [courses]);

  // Compute fully dropped courses across the entire dataset
  const fullyDroppedCourseCodes = useMemo(() => {
    const set = new Set<string>();
    const courseSecs = new Map<string, Section[]>();
    for (const s of sections) {
      if (!courseSecs.has(s.courseCode)) {
        courseSecs.set(s.courseCode, []);
      }
      courseSecs.get(s.courseCode)!.push(s);
    }
    for (const [code, secs] of courseSecs.entries()) {
      const activeCount = secs.filter((s) => s.status !== 'dropped').length;
      if (activeCount === 0 && secs.length > 0) {
        set.add(code);
      }
    }
    return set;
  }, [sections]);

  // All dropped sections
  const allDropped = useMemo(
    () => sections.filter((s) => s.status === 'dropped'),
    [sections]
  );

  // Filter dropped sections by search and program
  const filteredDropped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allDropped.filter((s) => {
      if (programFilter !== 'ALL' && s.program !== programFilter) {
        return false;
      }
      if (!q) return true;

      const codeMatch = s.courseCode.toLowerCase().includes(q);
      const titleMatch = (s.title || '').toLowerCase().includes(q);
      const facMatch = s.faculty.some((f) => f.toLowerCase().includes(q));
      const secMatch = s.section.toLowerCase() === q;

      return codeMatch || titleMatch || facMatch || secMatch;
    });
  }, [allDropped, search, programFilter]);

  // Group by course, naturally sorted
  const groupedCourses = useMemo(() => {
    const map = new Map<string, { code: string; title: string; program: 'BSCSE' | 'BSDS'; sections: Section[] }>();
    for (const s of filteredDropped) {
      const key = `${s.program}-${s.courseCode}`;
      if (!map.has(key)) {
        map.set(key, {
          code: s.courseCode,
          title: s.title,
          program: s.program,
          sections: [],
        });
      }
      map.get(key)!.sections.push(s);
    }

    const list = Array.from(map.values());
    list.sort((a, b) => naturalCourseCodeSort(a.code, b.code));

    for (const item of list) {
      item.sections.sort((a, b) => naturalSectionSort(a.section, b.section));
    }

    return list;
  }, [filteredDropped]);

  return (
    <section
      aria-label="Dropped sections panel"
      className="bg-surface rounded-card border-2 border-rose-200/90 shadow-warm p-4 sm:p-5 space-y-4 my-4 animate-in fade-in duration-200"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
              Dropped Sections
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
              Fall 2026 Portal Sync
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Sections cancelled by the university in the latest portal update.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close dropped sections view"
          className="self-end sm:self-center px-3 py-1.5 rounded-btn bg-page hover:bg-subtle border border-app-border text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[38px] sm:min-h-0"
        >
          <X className="w-3.5 h-3.5" />
          <span>Close panel</span>
        </button>
      </div>

      {/* Controls Bar: Search & Program Chips & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dropped by course, title, faculty..."
              className="w-full pl-9 pr-8 py-2 text-base sm:text-xs rounded-btn border border-app-border bg-page placeholder:text-text-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all min-h-[44px] sm:min-h-0"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1"
                aria-label="Clear dropped search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Program Filter Chips */}
          <div className="flex items-center gap-1">
            {(['ALL', 'BSCSE', 'BSDS'] as const).map((prog) => (
              <button
                key={prog}
                type="button"
                onClick={() => setProgramFilter(prog)}
                className={`px-3 py-1.5 rounded-chip text-xs font-semibold transition-all min-h-[44px] sm:min-h-[32px] flex items-center justify-center ${
                  programFilter === prog
                    ? 'bg-orange-500 text-white shadow-2xs font-bold'
                    : 'bg-page text-text-secondary hover:bg-subtle border border-app-border'
                }`}
              >
                {prog}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Count */}
        <div className="text-xs text-text-muted font-medium shrink-0 flex items-center gap-2">
          <span>
            <strong className="text-text-primary font-bold">{filteredDropped.length}</strong> sections dropped across{' '}
            <strong className="text-text-primary font-bold">{groupedCourses.length}</strong> courses
          </span>
          {(search || programFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setProgramFilter('ALL');
              }}
              className="text-orange-600 hover:text-orange-700 underline font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Courses & Sections List */}
      <div className="space-y-3 pt-1">
        {groupedCourses.length === 0 ? (
          <div className="p-8 text-center rounded-card bg-page border border-dashed border-app-border text-xs text-text-muted space-y-2">
            <p>No dropped sections match your filter.</p>
          </div>
        ) : (
          groupedCourses.map((group) => {
            const isFullyDropped = fullyDroppedCourseCodes.has(group.code);
            return (
              <div
                key={`${group.program}-${group.code}`}
                className="rounded-card border border-rose-200/70 bg-page overflow-hidden shadow-2xs"
              >
                {/* Course Header */}
                <div className="px-4 py-2.5 bg-rose-50/60 border-b border-rose-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-xs text-text-primary">
                      {group.code}
                    </span>
                    <span className="text-text-muted text-xs">·</span>
                    <span className="text-xs text-text-secondary font-medium">
                      {group.title}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10.5px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                      {group.program}
                    </span>
                  </div>

                  {isFullyDropped && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      All sections dropped
                    </span>
                  )}
                </div>

                {/* Dropped Sections Rows (Read-Only) */}
                <div className="divide-y divide-app-border/50 text-xs">
                  {group.sections.map((sec) => {
                    const days = Array.from(new Set(sec.meetings.map((m) => m.day)));
                    const timeRange = sec.meetings.length > 0
                      ? `${formatTime24(sec.meetings[0].start)}–${formatTime24(sec.meetings[0].end)}`
                      : 'TBA';
                    const room = sec.meetings[0]?.room || null;

                    return (
                      <div
                        key={sec.id}
                        className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface hover:bg-rose-50/20 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                          {/* Section Letter */}
                          <span className="font-bold text-xs text-text-muted px-2 py-0.5 rounded bg-subtle border border-app-border line-through">
                            Sec {sec.section}
                          </span>

                          {/* Faculty Name (linked only if active faculty) */}
                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            {sec.faculty.map((fName, idx) => {
                              const fid = sec.facultyIds?.[idx];
                              const isTBA = fName === 'TBA' || !fid || fid === 'tba';
                              const isActive = !isTBA && activeFacultyIds.has(fid);

                              if (isActive && fid) {
                                return (
                                  <Link
                                    key={`${fid}-${idx}`}
                                    href={`/faculty-directory/${fid}`}
                                    className="font-semibold text-text-primary hover:text-orange-600 hover:underline transition-colors"
                                    title={`View ${fName}'s profile`}
                                  >
                                    {fName}
                                  </Link>
                                );
                              }
                              return (
                                <span key={idx} className="text-text-muted font-medium">
                                  {fName || 'TBA'}
                                </span>
                              );
                            })}
                          </div>

                          {/* Days, Times, and Room */}
                          <div className="flex items-center gap-1.5 text-text-muted text-[11px] font-mono flex-wrap">
                            <span>•</span>
                            <span>{days.join(', ')}</span>
                            <span>{timeRange}</span>
                            {room && <span>(Room {room})</span>}
                          </div>
                        </div>

                        {/* Muted Dropped Badge (Read-Only) */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            Dropped
                          </span>
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
    </section>
  );
}
