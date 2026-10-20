'use client';

import React from 'react';
import { DAYS_LIST, Day, SolveRequest } from '../types';
import { AlertTriangle, RotateCcw, HelpCircle, Lightbulb } from 'lucide-react';

interface EmptyStateProps {
  type: 'welcome' | 'conflict';
  request: SolveRequest;
  errorMessage?: string | null;
  onResetFilters: () => void;
}

const GHOST_TIME_SLOTS = [
  '08:30 AM',
  '09:50 AM',
  '11:10 AM',
  '12:30 PM',
  '01:50 PM',
  '03:10 PM',
  '04:30 PM',
];

export function EmptyState({
  type,
  request,
  errorMessage,
  onResetFilters,
}: EmptyStateProps) {
  if (type === 'welcome') {
    return (
      <div className="flex-1 flex flex-col space-y-4 w-full animate-in fade-in">
        {/* Faint Ghost Weekly Timetable Grid */}
        <div className="relative rounded-card border border-app-border bg-surface p-4 shadow-warm overflow-hidden min-h-[480px] flex flex-col">
          {/* Day Headers */}
          <div className="grid grid-cols-[56px_repeat(5,1fr)] gap-2 pb-2.5 border-b border-app-border/80 text-center font-bold text-xs uppercase tracking-wider text-text-muted/60">
            <div className="py-1">Time</div>
            {DAYS_LIST.map((day) => (
              <div
                key={day}
                className="py-1.5 rounded-btn bg-subtle/30 text-text-muted/70 border border-app-border/40 font-medium text-xs"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Ghost Timetable Body with Slot Lines */}
          <div className="relative grid grid-cols-[56px_repeat(5,1fr)] gap-2 flex-1 mt-2 min-h-[380px]">
            {/* Time labels axis */}
            <div className="relative h-full select-none text-[10px] font-mono text-text-muted/50 flex flex-col justify-between py-1 text-right pr-2">
              {GHOST_TIME_SLOTS.map((slot) => (
                <div key={slot}>{slot}</div>
              ))}
            </div>

            {/* 5 Faint Day Columns */}
            {DAYS_LIST.map((day, idx) => (
              <div
                key={day}
                className={`h-full rounded-btn border border-dashed border-app-border/70 ${
                  idx % 2 === 0 ? 'bg-[#FFFFFF]/40' : 'bg-[#FFFCF9]/60'
                }`}
              />
            ))}

            {/* Centered Overlay Prompt */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-none">
              <div className="p-4 sm:p-6 rounded-card bg-surface/95 border border-app-border shadow-warm backdrop-blur-xs max-w-sm space-y-2">
                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mx-auto shadow-2xs font-bold text-sm">
                  UIU
                </div>
                <h3 className="text-sm sm:text-base font-bold text-text-primary">
                  Add courses on the left to see your routine here.
                </h3>
                <p className="text-xs text-text-muted">
                  The solver will instantly compute clash-free section options.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Slim Tip Strip */}
        <div className="px-4 py-2.5 rounded-btn bg-subtle border border-app-border text-xs text-text-secondary flex items-center gap-2 shadow-2xs">
          <Lightbulb className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span>
            <strong className="text-text-primary font-semibold">Tip:</strong> Search by code (<code>CSE 1111</code>) or alias (<code>DSA</code>, <code>OOP</code>). Click any course to see its faculty and sections.
          </span>
        </div>
      </div>
    );
  }

  // Conflict State
  const hasDayOffFilter = (request.filterDayOff || []).length > 0;
  const hasTimeFilter =
    request.filterTimeWindow?.earliestStart !== undefined ||
    request.filterTimeWindow?.latestEnd !== undefined;
  const hasLocked = Object.keys(request.lockedSections || {}).length > 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-danger-bg border border-danger/30 flex items-center justify-center text-danger mb-4 shadow-sm">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <h3 className="text-xl font-bold text-text-primary tracking-tight">
        No Conflict-Free Combinations Found
      </h3>

      <p className="mt-2 text-xs sm:text-sm text-text-muted max-w-md">
        {errorMessage ||
          'All section combinations for the selected courses clash with each other or violate your active filters.'}
      </p>

      {/* Suggested Fixes */}
      <div className="mt-6 p-4 rounded-card bg-surface border border-app-border max-w-md w-full text-left text-xs space-y-2 shadow-warm">
        <div className="font-semibold text-text-primary mb-2 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-orange-500" />
          Recommended Fixes:
        </div>

        {hasDayOffFilter && (
          <div className="flex items-start gap-2 text-text-secondary">
            <span className="text-orange-500">•</span>
            <span>
              Relax day-off filters: currently excluding{' '}
              <span className="font-mono font-semibold text-text-primary">
                {request.filterDayOff.join(', ')}
              </span>
            </span>
          </div>
        )}

        {hasLocked && (
          <div className="flex items-start gap-2 text-text-secondary">
            <span className="text-orange-500">•</span>
            <span>
              Unlock section locks: some locked sections may clash directly with other courses.
            </span>
          </div>
        )}

        {hasTimeFilter && (
          <div className="flex items-start gap-2 text-text-secondary">
            <span className="text-orange-500">•</span>
            <span>
              Widen time window (some required courses might only be offered in early morning or late afternoon).
            </span>
          </div>
        )}

        <div className="flex items-start gap-2 text-text-secondary">
          <span className="text-orange-500">•</span>
          <span>
            Remove one of the selected courses or choose an alternative elective.
          </span>
        </div>
      </div>

      <button
        onClick={onResetFilters}
        className="mt-6 px-4 py-2 rounded-btn bg-surface hover:bg-subtle text-text-primary text-xs font-semibold border border-app-border flex items-center gap-2 shadow-xs transition-all hover:border-orange-400"
      >
        <RotateCcw className="w-4 h-4 text-orange-500" />
        <span>Reset Filters & Locks</span>
      </button>
    </div>
  );
}
