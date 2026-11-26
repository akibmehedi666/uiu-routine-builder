'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  ExamRow,
  ExamClashReport,
  getExamForSection,
  isExamExemptCourse,
  formatExamDateShort,
  formatExamTimeRange,
  exportExamsToText,
  exportExamsToICS,
  RoutineExamExportItem,
  clearLegacyStudentIdStorage,
} from '../lib/exams';
import { downloadFile } from '../utils/export';
import { Course, Section } from '../types';
import { EXAMS_NOTE, EXAMS_UPDATED } from '../config/site';
import { ExamClashSummary } from './ExamClashSummary';
import {
  Copy,
  Check,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

interface RoutineExamsViewProps {
  sections: Section[];
  courses: Course[];
  exams: ExamRow[];
  examReport: ExamClashReport | null;
}

export function RoutineExamsView({
  sections,
  courses,
  exams,
  examReport,
}: RoutineExamsViewProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    clearLegacyStudentIdStorage();
  }, []);

  const courseByCode = useMemo(() => {
    const m = new Map<string, Course>();
    for (const c of courses) {
      m.set(c.code, c);
    }
    return m;
  }, [courses]);

  // Resolve exams for active (non-dropped) routine sections
  const { resolvedItems, unannouncedCourses } = useMemo(() => {
    const items: {
      section: Section;
      exam: ExamRow;
      hasClash: boolean;
    }[] = [];
    const missing: Section[] = [];

    const clashingCourses = new Set<string>();
    if (examReport) {
      for (const c of examReport.clashes) {
        clashingCourses.add(c.a);
        clashingCourses.add(c.b);
      }
    }

    for (const sec of sections) {
      if (sec.status === 'dropped') continue;
      const courseObj = courseByCode.get(sec.courseCode);
      if (
        sec.kind === 'lab' ||
        isExamExemptCourse(courseObj || sec.courseCode, sections)
      ) {
        continue;
      }

      const exam = getExamForSection(sec.id, exams);
      if (!exam) {
        missing.push(sec);
        continue;
      }

      items.push({
        section: sec,
        exam,
        hasClash: clashingCourses.has(sec.courseCode),
      });
    }

    items.sort(
      (a, b) =>
        a.exam.date.localeCompare(b.exam.date) ||
        a.exam.startMin - b.exam.startMin ||
        a.exam.courseCode.localeCompare(b.exam.courseCode)
    );

    return { resolvedItems: items, unannouncedCourses: missing };
  }, [sections, courseByCode, exams, examReport]);

  // Group sorted exams by date
  const groupedByDate = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        dayOfWeek: string;
        items: typeof resolvedItems;
      }
    >();
    for (const item of resolvedItems) {
      if (!map.has(item.exam.date)) {
        map.set(item.exam.date, {
          date: item.exam.date,
          dayOfWeek: item.exam.dayOfWeek,
          items: [],
        });
      }
      map.get(item.exam.date)!.items.push(item);
    }
    return Array.from(map.values());
  }, [resolvedItems]);

  const exportPayload: RoutineExamExportItem[] = useMemo(
    () => resolvedItems.map((item) => ({ exam: item.exam })),
    [resolvedItems]
  );

  const handleCopyList = async () => {
    const text = exportExamsToText(exportPayload);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownloadICS = () => {
    const ics = exportExamsToICS(exportPayload);
    downloadFile(ics, 'UIU_Midterm_Exams_Fall_2026.ics', 'text/calendar');
  };

  if (exams.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="bg-surface p-3.5 sm:p-4 rounded-card border border-app-border shadow-warm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-text-primary">
              Mid-Term Exam Schedule
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold">
              {resolvedItems.length} exam{resolvedItems.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">
            {EXAMS_NOTE} (Updated {EXAMS_UPDATED})
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleCopyList}
            disabled={resolvedItems.length === 0}
            className="min-h-[40px] px-3 py-1.5 rounded-btn bg-surface hover:bg-subtle disabled:opacity-40 text-text-primary border border-app-border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
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
            onClick={handleDownloadICS}
            disabled={resolvedItems.length === 0}
            className="min-h-[40px] px-3 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Download .ics</span>
          </button>
        </div>
      </div>

      {/* Clash Summary */}
      {examReport && (
        <div className="flex flex-wrap items-center gap-2">
          <ExamClashSummary report={examReport} variant="chips" />
        </div>
      )}

      {/* Exam List Grouped by Date */}
      {groupedByDate.length === 0 ? (
        <div className="p-8 text-center rounded-card bg-surface border border-dashed border-app-border text-xs text-text-muted">
          No mid-term exams found for the courses in this routine.
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <section
              key={group.date}
              aria-label={`Exams on ${formatExamDateShort(group.date)}`}
              className="rounded-card bg-surface border border-app-border shadow-warm overflow-hidden"
            >
              {/* Day Header */}
              <div className="px-4 py-2.5 bg-subtle border-b border-app-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-orange-500 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold text-text-primary">
                    {formatExamDateShort(group.date)} ({group.dayOfWeek})
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-surface border border-app-border text-[11px] font-semibold text-text-secondary">
                  {group.items.length} exam{group.items.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Exam Rows */}
              <div className="divide-y divide-app-border">
                {group.items.map(({ exam, hasClash }) => (
                  <div
                    key={exam.id}
                    className={`p-3.5 sm:p-4 space-y-2.5 transition-colors ${
                      hasClash ? 'bg-rose-50/60' : 'bg-surface'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-text-primary">
                          {exam.courseCode}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-subtle border border-app-border text-[11px] font-bold text-text-primary">
                          Sec {exam.section}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200 text-[11px] font-semibold">
                          <Clock className="w-3 h-3 text-orange-600 shrink-0" />
                          <span>
                            {formatExamTimeRange(exam.startMin, exam.endMin)}
                          </span>
                        </span>
                        {hasClash && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>Exam clash</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-secondary font-medium">
                        {exam.courseTitle}
                      </div>
                    </div>

                    {/* Collapsed Rooms by ID range */}
                    {exam.rooms.length > 0 && (
                      <details className="text-[11px] group">
                        <summary className="cursor-pointer text-text-muted hover:text-text-primary select-none inline-flex items-center gap-1 font-medium py-0.5">
                          <span>
                            Rooms by ID range ({exam.rooms.length} room
                            {exam.rooms.length === 1 ? '' : 's'}:{' '}
                            {exam.rooms.map((r) => r.room).join(', ')})
                          </span>
                          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="mt-2 space-y-1.5">
                          <p className="text-[11px] text-text-muted">
                            Find your section&apos;s room by your ID range.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {exam.rooms.map((r, idx) => (
                              <div
                                key={`${r.room}-${idx}`}
                                className="px-2.5 py-1.5 rounded bg-page border border-app-border flex items-center justify-between gap-2"
                              >
                                <span className="font-bold text-text-primary">
                                  Room {r.room}
                                </span>
                                <span className="font-mono text-text-muted">
                                  {r.idFrom} – {r.idTo}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Unannounced Theory Courses Note */}
      {unannouncedCourses.length > 0 && (
        <div className="p-3 rounded-card bg-subtle border border-app-border text-xs text-text-muted">
          <span className="font-semibold text-text-secondary">
            Exam not announced:
          </span>{' '}
          {unannouncedCourses
            .map((s) => `${s.courseCode} (Sec ${s.section})`)
            .join(', ')}
        </div>
      )}
    </div>
  );
}
