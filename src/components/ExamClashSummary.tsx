'use client';

import React, { useState } from 'react';
import {
  ExamClashReport,
  formatExamDateShort,
} from '../lib/exams';
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ChevronDown,
  Info,
} from 'lucide-react';

interface ExamClashSummaryProps {
  report: ExamClashReport | null;
  variant: 'panel' | 'chips';
  onOpenExams?: () => void;
}

export function ExamClashSummary({
  report,
  variant,
  onOpenExams,
}: ExamClashSummaryProps) {
  const [clashesExpanded, setClashesExpanded] = useState(false);

  if (!report) return null;
  if (report.knownTheoryCount === 0 && report.unannouncedCourses.length === 0) {
    return null;
  }

  const hasClashes = report.clashes.length > 0;
  const hasPossible = report.possible.length > 0;
  const hasSameDay = report.sameDayGroups.length > 0;

  if (variant === 'chips') {
    return (
      <>
        {hasClashes && (
          <button
            type="button"
            onClick={onOpenExams}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-chip bg-rose-50 text-rose-800 border border-rose-300 font-semibold text-xs hover:bg-rose-100 transition-colors cursor-pointer"
            title={report.clashes
              .map(
                (c) =>
                  `${c.a} & ${c.b} - ${formatExamDateShort(c.date)}, ${c.time}`
              )
              .join('; ')}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>
              Exam clash: {report.clashes[0].a} &amp; {report.clashes[0].b} -{' '}
              {formatExamDateShort(report.clashes[0].date)},{' '}
              {report.clashes[0].time}
              {report.clashes.length > 1
                ? ` (+${report.clashes.length - 1} more)`
                : ''}
            </span>
          </button>
        )}

        {!hasClashes && hasPossible && (
          <button
            type="button"
            onClick={onOpenExams}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-chip bg-amber-50 text-amber-800 border border-amber-300 font-semibold text-xs hover:bg-amber-100 transition-colors cursor-pointer"
            title="Some section choices have overlapping exam times"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Possible exam clash depending on section</span>
          </button>
        )}

        {!hasClashes && !hasPossible && report.allTheoryExamsKnown && (
          <button
            type="button"
            onClick={onOpenExams}
            className="flex items-center gap-1 px-2.5 py-1 rounded-chip bg-emerald-50 text-emerald-800 border border-emerald-300 font-medium text-xs hover:bg-emerald-100 transition-colors cursor-pointer"
            title="All selected theory courses have known non-overlapping mid-term slots"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>No exam clashes</span>
          </button>
        )}

        {hasSameDay &&
          report.sameDayGroups.map((g) => (
            <button
              key={g.date}
              type="button"
              onClick={onOpenExams}
              className="flex items-center gap-1 px-2.5 py-1 rounded-chip bg-sky-50 text-sky-800 border border-sky-200 font-medium text-xs hover:bg-sky-100 transition-colors cursor-pointer"
              title={`${g.courses.join(', ')} on ${formatExamDateShort(g.date)}`}
            >
              <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>
                {g.count} exams on {formatExamDateShort(g.date)}
              </span>
            </button>
          ))}
      </>
    );
  }

  // Panel variant (inside Courses panel)
  if (
    !hasClashes &&
    !hasPossible &&
    !hasSameDay &&
    !report.allTheoryExamsKnown
  ) {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Mid-term exam status"
      className="space-y-1.5 text-xs"
    >
      {hasClashes && (
        <div className="p-2.5 rounded-btn bg-rose-50 border border-rose-300 text-rose-900 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-bold">
                  Exam clash: {report.clashes[0].a} &amp; {report.clashes[0].b}
                </span>{' '}
                <span className="text-rose-800">
                  - {formatExamDateShort(report.clashes[0].date)},{' '}
                  {report.clashes[0].time}
                </span>
              </div>
            </div>
            {report.clashes.length > 1 && (
              <button
                type="button"
                onClick={() => setClashesExpanded((prev) => !prev)}
                className="text-[11px] font-bold text-rose-700 hover:text-rose-950 underline flex items-center gap-0.5 shrink-0"
                aria-expanded={clashesExpanded}
              >
                <span>+{report.clashes.length - 1} more</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    clashesExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}
          </div>

          {clashesExpanded && report.clashes.length > 1 && (
            <ul className="pl-5 space-y-1 text-[11px] text-rose-800 list-disc">
              {report.clashes.slice(1).map((c, idx) => (
                <li key={`${c.a}-${c.b}-${idx}`}>
                  <strong>
                    {c.a} &amp; {c.b}
                  </strong>{' '}
                  - {formatExamDateShort(c.date)}, {c.time}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {hasPossible && (
        <div className="p-2.5 rounded-btn bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="font-semibold">
              Possible clash depending on section:
            </span>{' '}
            <span>
              {report.possible
                .map(
                  (p) =>
                    `${p.a} & ${p.b} (${formatExamDateShort(p.date)}, ${p.time})`
                )
                .join('; ')}
            </span>
          </div>
        </div>
      )}

      {!hasClashes && !hasPossible && report.allTheoryExamsKnown && (
        <div className="px-2.5 py-2 rounded-btn bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>No exam clashes</span>
        </div>
      )}

      {hasSameDay && (
        <div className="px-2.5 py-1.5 rounded-btn bg-sky-50 border border-sky-200 text-sky-900 flex items-start gap-1.5 text-[11px]">
          <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
          <span>
            {report.sameDayGroups
              .map(
                (g) =>
                  `${g.count} exams on ${formatExamDateShort(
                    g.date
                  )} (${g.courses.join(', ')})`
              )
              .join(' • ')}
          </span>
        </div>
      )}
    </div>
  );
}
