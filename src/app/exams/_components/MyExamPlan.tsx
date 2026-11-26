'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Course } from '../../../types';
import {
  ExamRow,
  UniqueExam,
  ExamClashReport,
  formatExamDateShort,
  formatExamTimeRange,
  getExamsForCourse,
  isExamExemptCourse,
  exportExamsToText,
  exportExamsToICS,
  RoutineExamExportItem,
} from '../../../lib/exams';
import { downloadFile } from '../../../utils/export';
import {
  Search,
  Plus,
  X,
  Copy,
  Check,
  Calendar,
  Printer,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface MyExamPlanProps {
  courses: Course[];
  allActiveRows: ExamRow[];
  myUniqueExams: UniqueExam[];
  selectedCourses: string[];
  lockedSections: Record<string, string>;
  examReport: ExamClashReport | null;
  onAddCourse: (courseCode: string) => void;
  onRemoveCourse: (courseCode: string) => void;
  quickAddInputRef?: React.RefObject<HTMLInputElement>;
  mobileExpanded: boolean;
  onToggleMobileExpanded: () => void;
}

export function MyExamPlan({
  courses,
  allActiveRows,
  myUniqueExams,
  selectedCourses,
  lockedSections,
  examReport,
  onAddCourse,
  onRemoveCourse,
  quickAddInputRef,
  mobileExpanded,
  onToggleMobileExpanded,
}: MyExamPlanProps) {
  const [quickQuery, setQuickQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const localInputRef = useRef<HTMLInputElement>(null);
  const inputRef = quickAddInputRef || localInputRef;

  const uniqueCourses = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses) {
      if (!map.has(c.code)) {
        map.set(c.code, c);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true })
    );
  }, [courses]);

  const courseByCode = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of uniqueCourses) {
      map.set(c.code, c);
    }
    return map;
  }, [uniqueCourses]);

  const quickMatches = useMemo(() => {
    const q = quickQuery.trim().toLowerCase();
    const qCompact = q.replace(/\s+/g, '');
    return uniqueCourses
      .filter((c) => {
        if (!q) return true;
        return (
          c.code.toLowerCase().includes(q) ||
          c.code.toLowerCase().replace(/\s+/g, '').includes(qCompact) ||
          c.title.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [uniqueCourses, quickQuery]);

  const selectedCourseDetails = useMemo(() => {
    return selectedCourses.map((code) => {
      const courseObj = courseByCode.get(code);
      const isExempt = isExamExemptCourse(courseObj || code);
      const courseRows = isExempt
        ? []
        : getExamsForCourse(null, code, allActiveRows);
      const lockedId = lockedSections[code];
      const ownRow = lockedId
        ? courseRows.find((r) => r.sectionId === lockedId) || courseRows[0] || null
        : courseRows[0] || null;

      const uniqueForCourse = myUniqueExams.filter(
        (u) => u.courseCode === code || u.courseCodes.includes(code)
      );

      return {
        code,
        isExempt,
        uniqueForCourse,
        ownRow,
      };
    });
  }, [selectedCourses, courseByCode, allActiveRows, lockedSections, myUniqueExams]);

  const exportItems: RoutineExamExportItem[] = useMemo(() => {
    const items: RoutineExamExportItem[] = [];
    for (const d of selectedCourseDetails) {
      if (!d.ownRow) continue;
      items.push({ exam: d.ownRow });
    }
    return items;
  }, [selectedCourseDetails]);

  const firstAndLastDate = useMemo(() => {
    if (myUniqueExams.length === 0) return null;
    const sorted = [...myUniqueExams].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    return {
      first: sorted[0].date,
      last: sorted[sorted.length - 1].date,
    };
  }, [myUniqueExams]);

  const handleCopy = async () => {
    const text = exportExamsToText(exportItems);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadIcs = () => {
    const ics = exportExamsToICS(exportItems);
    downloadFile(ics, 'UIU_My_Midterm_Exams_Fall_2026.ics', 'text/calendar');
  };

  const handlePrint = () => {
    window.print();
  };

  const clashCount = examReport?.clashes.length || 0;
  const possibleCount = examReport?.possible.length || 0;

  const panelBody = (
    <div className="space-y-4">
      {/* Quick Add */}
      <div className="space-y-1.5 relative">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="quick-add-exam-course"
            className="text-xs font-semibold text-text-primary"
          >
            Quick add course
          </label>
          <span className="text-xs text-text-muted">Shared with the Builder</span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            id="quick-add-exam-course"
            type="text"
            value={quickQuery}
            onChange={(e) => {
              setQuickQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Add course (e.g. CSE 4509, OS)..."
            className="w-full min-h-[44px] sm:min-h-[38px] pl-9 pr-8 py-1.5 rounded-btn bg-page border border-app-border text-base sm:text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-500"
          />
          {quickQuery && (
            <button
              type="button"
              onClick={() => setQuickQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] flex items-center justify-center text-text-muted hover:text-text-primary"
              aria-label="Clear quick add search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-surface border border-app-border rounded-card shadow-warm z-30 divide-y divide-app-border">
              {quickMatches.length === 0 ? (
                <div className="p-3 text-xs text-text-muted text-center">
                  No matching courses
                </div>
              ) : (
                quickMatches.map((c) => {
                  const isAdded = selectedCourses.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        if (isAdded) {
                          onRemoveCourse(c.code);
                        } else {
                          onAddCourse(c.code);
                          setQuickQuery('');
                          setDropdownOpen(false);
                        }
                      }}
                      className="w-full p-2.5 text-left flex items-center justify-between gap-2 hover:bg-subtle transition-colors min-h-[44px]"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-text-primary">
                          {c.code}
                        </div>
                        <div className="text-xs text-text-muted truncate">
                          {c.title}
                        </div>
                      </div>
                      {isAdded ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold shrink-0">
                          Added
                        </span>
                      ) : (
                        <span className="w-7 h-7 rounded-btn bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Selected Courses List (date/time only) */}
      {selectedCourseDetails.length === 0 ? (
        <div className="p-3.5 rounded-btn bg-subtle/70 border border-dashed border-app-border text-xs text-text-muted">
          No courses selected yet. Search above to add your courses and sync
          automatically with the Routine Builder.
        </div>
      ) : (
        <div className="space-y-1.5">
          {selectedCourseDetails.map((d) => {
            const firstSlot = d.uniqueForCourse[0];
            const slotText = d.isExempt
              ? 'Lab / Project (no exam)'
              : d.uniqueForCourse.length > 1
              ? `${d.uniqueForCourse.length} slots`
              : firstSlot
              ? `${formatExamDateShort(firstSlot.date)} · ${formatExamTimeRange(
                  firstSlot.startMin,
                  firstSlot.endMin
                )}`
              : 'Not announced';

            return (
              <div
                key={d.code}
                className="p-2.5 rounded-btn bg-page border border-app-border flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-text-primary">
                    {d.code}
                  </div>
                  <div className="text-xs text-text-muted">{slotText}</div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveCourse(d.code)}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-btn text-text-muted hover:text-rose-700 hover:bg-rose-50 transition-colors shrink-0"
                  aria-label={`Remove ${d.code}`}
                  title={`Remove ${d.code}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Summary */}
      {selectedCourseDetails.length > 0 && (
        <div className="p-3 rounded-btn bg-subtle border border-app-border space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold">
            {clashCount > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-rose-800">
                  {clashCount} exam {clashCount === 1 ? 'clash' : 'clashes'} found
                </span>
              </>
            ) : possibleCount > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-amber-800">
                  Possible clash depending on section
                </span>
              </>
            ) : examReport?.allTheoryExamsKnown ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-emerald-800">No exam clashes</span>
              </>
            ) : (
              <span className="text-text-secondary">
                {myUniqueExams.length} {myUniqueExams.length === 1 ? 'exam' : 'exams'} scheduled
              </span>
            )}
          </div>

          <div className="text-text-secondary flex items-center justify-between gap-2 flex-wrap">
            <span>
              {myUniqueExams.length} {myUniqueExams.length === 1 ? 'exam' : 'exams'}
            </span>
            {firstAndLastDate && (
              <span>
                {formatExamDateShort(firstAndLastDate.first)}
                {firstAndLastDate.first !== firstAndLastDate.last
                  ? ` – ${formatExamDateShort(firstAndLastDate.last)}`
                  : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {exportItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-app-border">
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-btn bg-surface hover:bg-subtle text-text-primary border border-app-border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
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
            onClick={handleDownloadIcs}
            className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Download .ics</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-btn bg-surface hover:bg-subtle text-text-secondary hover:text-text-primary border border-app-border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <aside
      aria-label="My exam plan"
      className="rounded-card bg-surface border border-app-border shadow-warm p-4 min-[1100px]:sticky min-[1100px]:top-20 min-[1100px]:max-h-[calc(100dvh-96px)] min-[1100px]:overflow-y-auto"
    >
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-app-border">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-text-primary">My exam plan</h2>
          <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold">
            {myUniqueExams.length} {myUniqueExams.length === 1 ? 'exam' : 'exams'}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMobileExpanded}
          aria-expanded={mobileExpanded}
          className="min-[1100px]:hidden min-h-[44px] px-2.5 rounded-btn text-xs font-semibold text-orange-600 hover:bg-orange-50 inline-flex items-center gap-1"
        >
          <span>{mobileExpanded ? 'Hide' : 'Open'}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              mobileExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      <div className={`pt-3.5 ${mobileExpanded ? 'block' : 'hidden min-[1100px]:block'}`}>
        {panelBody}
      </div>
    </aside>
  );
}
