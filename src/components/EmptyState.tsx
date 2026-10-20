'use client';

import React from 'react';
import { COURSE_PRESETS, CoursePreset } from '../utils/presets';
import {
  Sparkles,
  Calendar,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Zap,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { SolveRequest } from '../types';

interface EmptyStateProps {
  type: 'welcome' | 'conflict';
  request: SolveRequest;
  errorMessage?: string | null;
  onApplyPreset: (preset: CoursePreset) => void;
  onResetFilters: () => void;
}

export function EmptyState({
  type,
  request,
  errorMessage,
  onApplyPreset,
  onResetFilters,
}: EmptyStateProps) {
  if (type === 'welcome') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-xl shadow-orange-500/20 text-white font-black text-2xl mb-6 animate-bounce">
          UIU
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight max-w-xl">
          Build Your Conflict-Free Class Routine in Seconds
        </h2>
        <p className="mt-3 text-sm text-slate-400 max-w-lg">
          Select courses for the <span className="text-orange-400 font-semibold">Fall 2026 Trimester</span>. Our solver client-side analyzes all 791 sections, optimizes for preferred faculty, minimizes gap times, and generates a visual timetable ready for UCAM.
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            Instant Web Worker Solver
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            100% Conflict-Free
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            iCal (.ics) & PDF Export
          </span>
        </div>

        {/* 1-Click Presets Header */}
        <div className="mt-10 w-full max-w-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-400" />
              Try a Popular Routine Preset:
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {COURSE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset)}
                className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-orange-500/50 transition-all group shadow-md"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white group-hover:text-orange-400 transition-colors">
                    {preset.name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {preset.program}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {preset.description}
                </p>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-orange-400 group-hover:translate-x-1 transition-transform">
                  <span>Load Preset ({preset.courses.length} courses) →</span>
                </div>
              </button>
            ))}
          </div>
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
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/10">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h3 className="text-xl font-bold text-white tracking-tight">
        No Conflict-Free Combinations Found
      </h3>

      <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md">
        {errorMessage ||
          'All section combinations for the selected courses clash with each other or violate your active filters.'}
      </p>

      {/* Suggested Fixes */}
      <div className="mt-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 max-w-md w-full text-left text-xs space-y-2">
        <div className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-orange-400" />
          Recommended Fixes:
        </div>

        {hasDayOffFilter && (
          <div className="flex items-start gap-2 text-slate-300">
            <span className="text-orange-400">•</span>
            <span>
              Relax day-off filters: currently excluding{' '}
              <span className="font-mono text-white">
                {request.filterDayOff.join(', ')}
              </span>
            </span>
          </div>
        )}

        {hasLocked && (
          <div className="flex items-start gap-2 text-slate-300">
            <span className="text-orange-400">•</span>
            <span>
              Unlock section locks: some locked sections may clash directly with other courses.
            </span>
          </div>
        )}

        {hasTimeFilter && (
          <div className="flex items-start gap-2 text-slate-300">
            <span className="text-orange-400">•</span>
            <span>
              Widen time window (some required courses might only be offered in early morning or late afternoon).
            </span>
          </div>
        )}

        <div className="flex items-start gap-2 text-slate-300">
          <span className="text-orange-400">•</span>
          <span>
            Remove one of the selected courses or choose an alternative elective.
          </span>
        </div>
      </div>

      <button
        onClick={onResetFilters}
        className="mt-6 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold border border-slate-700 flex items-center gap-2 transition-all"
      >
        <RotateCcw className="w-4 h-4 text-orange-400" />
        <span>Reset Filters & Locks</span>
      </button>
    </div>
  );
}
