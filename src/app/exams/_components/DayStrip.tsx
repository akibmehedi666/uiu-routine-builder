'use client';

import React from 'react';
import { ExamDayStat } from '../../../lib/exams';

interface DayStripProps {
  days: ExamDayStat[];
  selectedDate: string;
  totalExamsCount: number;
  onSelectDate: (date: string) => void;
}

export function DayStrip({
  days,
  selectedDate,
  totalExamsCount,
  onSelectDate,
}: DayStripProps) {
  if (days.length === 0) return null;

  return (
    <div className="min-w-0">
      <div
        role="tablist"
        aria-label="Exam dates calendar strip"
        className="flex items-stretch gap-2 overflow-x-auto pb-1.5"
      >
        {/* All dates tile */}
        <button
          type="button"
          role="tab"
          aria-selected={selectedDate === 'ALL'}
          onClick={() => onSelectDate('ALL')}
          className={`min-h-[76px] min-w-[92px] px-3 py-2.5 rounded-card border text-left flex flex-col justify-between shrink-0 transition-all ${
            selectedDate === 'ALL'
              ? 'bg-orange-50/90 border-orange-500 ring-2 ring-orange-400/20 shadow-2xs'
              : 'bg-surface border-app-border hover:border-orange-300 hover:bg-subtle/60'
          }`}
        >
          <span className="text-xs font-semibold text-text-muted">All dates</span>
          <div className="text-lg font-bold text-text-primary leading-none my-1">
            {days.length}d
          </div>
          <span className="text-xs text-text-secondary font-medium">
            {totalExamsCount} {totalExamsCount === 1 ? 'exam' : 'exams'}
          </span>
        </button>

        {/* Individual exam date tiles */}
        {days.map((d) => {
          const isSelected = selectedDate === d.date;
          const barPct = Math.max(d.examCount > 0 ? 12 : 0, Math.round(d.ratio * 100));
          return (
            <button
              key={d.date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectDate(d.date)}
              className={`min-h-[76px] min-w-[96px] px-3 py-2 rounded-card border text-left flex flex-col justify-between shrink-0 transition-all relative ${
                isSelected
                  ? 'bg-orange-50/90 border-orange-500 ring-2 ring-orange-400/20 shadow-2xs'
                  : 'bg-surface border-app-border hover:border-orange-300 hover:bg-subtle/60'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-semibold text-text-muted">
                  {d.dayOfWeek}
                </span>
                {d.hasUserExam && (
                  <span
                    className="w-2 h-2 rounded-full bg-orange-500 shrink-0"
                    title="You have an exam on this day"
                    aria-label="You have an exam on this day"
                  />
                )}
              </div>

              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-lg font-bold text-text-primary leading-none tabular-nums">
                  {d.dayNumber}
                </span>
                <span className="text-xs text-text-muted font-medium">
                  {d.monthLabel}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium text-text-secondary tabular-nums">
                  {d.examCount} {d.examCount === 1 ? 'exam' : 'exams'}
                </div>
                <div className="h-1 w-full rounded-full bg-subtle overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isSelected ? 'bg-orange-500' : 'bg-orange-400/80'
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
