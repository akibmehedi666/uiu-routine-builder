'use client';

import React from 'react';
import { formatExamDateShort } from '../../../lib/exams';
import { Calendar, Layers, Flame, BookOpen } from 'lucide-react';

interface StatStripProps {
  totalDays: number;
  dateRangeLabel: string;
  totalExams: number;
  totalSections: number;
  busiestDay: { date: string; dayOfWeek: string; examCount: number } | null;
  selectedCoursesCount: number;
  myExamCount: number;
  hasClashes: boolean;
  onClickYourExams: () => void;
}

export function StatStrip({
  totalDays,
  dateRangeLabel,
  totalExams,
  totalSections,
  busiestDay,
  selectedCoursesCount,
  myExamCount,
  hasClashes,
  onClickYourExams,
}: StatStripProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Tile 1: Exam days */}
      <div className="p-3.5 rounded-card bg-surface border border-app-border shadow-2xs flex items-start gap-3">
        <div className="w-9 h-9 rounded-btn bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-text-muted font-medium">Exam days</div>
          <div className="text-base font-semibold text-text-primary leading-tight mt-0.5">
            {totalDays} exam days
          </div>
          <div className="text-xs text-text-muted mt-0.5 truncate">
            {dateRangeLabel || '—'}
          </div>
        </div>
      </div>

      {/* Tile 2: Total exams */}
      <div className="p-3.5 rounded-card bg-surface border border-app-border shadow-2xs flex items-start gap-3">
        <div className="w-9 h-9 rounded-btn bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-text-muted font-medium">Total exams</div>
          <div className="text-base font-semibold text-text-primary leading-tight mt-0.5">
            {totalExams} {totalExams === 1 ? 'exam' : 'exams'}
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            {totalSections} sections
          </div>
        </div>
      </div>

      {/* Tile 3: Busiest day */}
      <div className="p-3.5 rounded-card bg-surface border border-app-border shadow-2xs flex items-start gap-3">
        <div className="w-9 h-9 rounded-btn bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
          <Flame className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-text-muted font-medium">Busiest day</div>
          <div className="text-base font-semibold text-text-primary leading-tight mt-0.5 truncate">
            {busiestDay
              ? `${formatExamDateShort(busiestDay.date)} · ${busiestDay.examCount}`
              : '—'}
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            {busiestDay
              ? `${busiestDay.dayOfWeek} (${busiestDay.examCount} exams)`
              : 'No exams'}
          </div>
        </div>
      </div>

      {/* Tile 4: Your exams */}
      <button
        type="button"
        onClick={onClickYourExams}
        className={`p-3.5 rounded-card border shadow-2xs flex items-start gap-3 text-left transition-all hover:-translate-y-[1px] hover:shadow-warm motion-reduce:hover:translate-y-0 min-h-[44px] ${
          selectedCoursesCount > 0
            ? hasClashes
              ? 'bg-rose-50/70 border-rose-300'
              : 'bg-orange-50/70 border-orange-300'
            : 'bg-surface border-app-border hover:border-orange-300'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-btn border flex items-center justify-center shrink-0 ${
            selectedCoursesCount > 0
              ? hasClashes
                ? 'bg-rose-100 border-rose-300 text-rose-700'
                : 'bg-orange-500 border-orange-600 text-white'
              : 'bg-subtle border-app-border text-text-secondary'
          }`}
        >
          <BookOpen className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-text-muted font-medium">Your exams</div>
          <div className="text-base font-semibold text-text-primary leading-tight mt-0.5 truncate">
            {selectedCoursesCount > 0
              ? `${selectedCoursesCount} of your courses`
              : 'Add your courses'}
          </div>
          <div
            className={`text-xs mt-0.5 font-medium ${
              hasClashes ? 'text-rose-700' : 'text-orange-700'
            }`}
          >
            {selectedCoursesCount > 0
              ? hasClashes
                ? 'Exam clash detected'
                : `${myExamCount} scheduled`
              : 'Click to quick-add'}
          </div>
        </div>
      </button>
    </div>
  );
}
