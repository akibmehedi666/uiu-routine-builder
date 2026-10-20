'use client';

import React from 'react';
import {
  Calendar,
  AlertTriangle,
  RotateCcw,
  Zap,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { SolveRequest } from '../types';

interface EmptyStateProps {
  type: 'welcome' | 'conflict';
  request: SolveRequest;
  errorMessage?: string | null;
  onResetFilters: () => void;
}

export function EmptyState({
  type,
  request,
  errorMessage,
  onResetFilters,
}: EmptyStateProps) {
  if (type === 'welcome') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-warm text-white font-black text-xl mb-4">
          UIU
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight max-w-xl">
          Build Your Conflict-Free Class Routine
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-text-muted max-w-lg">
          Select courses for the <span className="text-orange-600 font-semibold">Fall 2026 Trimester</span>. Our solver analyzes all 791 sections client-side, optimizes for preferred faculty, minimizes gaps, and generates a visual timetable ready for UCAM.
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          <span className="px-3 py-1 rounded-chip bg-surface border border-app-border text-xs font-medium text-text-secondary flex items-center gap-1.5 shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-orange-500" />
            Instant Web Worker Solver
          </span>
          <span className="px-3 py-1 rounded-chip bg-surface border border-app-border text-xs font-medium text-text-secondary flex items-center gap-1.5 shadow-2xs">
            <CheckCircle className="w-3.5 h-3.5 text-success" />
            100% Conflict-Free
          </span>
          <span className="px-3 py-1 rounded-chip bg-surface border border-app-border text-xs font-medium text-text-secondary flex items-center gap-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            iCal (.ics) & PDF Export
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
