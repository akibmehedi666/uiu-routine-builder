'use client';

import React from 'react';
import { SavedRoutine, SavedRoutineValidation } from '../types/savedRoutine';
import { Bookmark, ArrowLeft, RefreshCw, AlertTriangle, AlertCircle, Share2, Check } from 'lucide-react';

interface SavedRoutineBannerProps {
  routine: SavedRoutine;
  isSharedLink?: boolean;
  validation?: SavedRoutineValidation;
  onExit: () => void;
  onSaveShared?: () => void;
  onUpdateToLatestData?: () => void;
  onLoadSettings?: () => void;
}

export function SavedRoutineBanner({
  routine,
  isSharedLink = false,
  validation,
  onExit,
  onSaveShared,
  onUpdateToLatestData,
  onLoadSettings,
}: SavedRoutineBannerProps) {
  return (
    <div className="bg-surface rounded-card border-2 border-orange-500/80 shadow-warm p-3.5 space-y-2 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Indicator */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-btn bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
            <Bookmark className="w-4 h-4 fill-orange-500 text-orange-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">
                {isSharedLink ? 'Viewing Shared Routine' : 'Viewing Saved Routine'}
              </span>
              <span className="font-extrabold text-sm text-text-primary">
                {routine.name}
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              {routine.totals.credits} credits • {routine.totals.daysOnCampus} days • {routine.trimester}
              {routine.note ? ` • Note: ${routine.note}` : ''}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {isSharedLink && onSaveShared && (
            <button
              onClick={onSaveShared}
              className="px-3 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Bookmark className="w-3.5 h-3.5 fill-white text-white" />
              <span>Save to My Routines</span>
            </button>
          )}

          {onLoadSettings && (
            <button
              onClick={onLoadSettings}
              className="px-3 py-1.5 rounded-btn bg-subtle hover:bg-orange-50 text-text-primary hover:text-orange-600 border border-app-border hover:border-orange-200 font-medium text-xs transition-colors flex items-center gap-1.5"
              title="Restore courses, faculty preferences and filters into solver"
            >
              <RefreshCw className="w-3 h-3 text-orange-500" />
              <span>Load settings in solver</span>
            </button>
          )}

          <button
            onClick={onExit}
            className="px-3 py-1.5 rounded-btn bg-page hover:bg-subtle text-text-secondary hover:text-text-primary border border-app-border font-medium text-xs transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-text-muted" />
            <span>Back to results</span>
          </button>
        </div>
      </div>

      {/* Warnings Bar if data changed / internal conflict */}
      {validation && (validation.hasChangedSections || validation.hasInternalOverlap || validation.hasBlockedTimeConflict) && (
        <div className="pt-2 border-t border-app-border/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            {validation.hasInternalOverlap ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-300 font-semibold text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Schedule has internal overlap
              </span>
            ) : validation.hasChangedSections ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-semibold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Data changed since you saved this ({validation.diffs.length} updates)
              </span>
            ) : validation.hasBlockedTimeConflict ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-300 font-semibold text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-sky-600" />
                Conflicts with your current blocked-time settings
              </span>
            ) : null}

            {validation.diffs.length > 0 && (
              <span className="text-[11px] text-text-muted">
                {validation.diffs.map((d) => `${d.courseCode}-${d.section}: ${d.details}`).join(' • ')}
              </span>
            )}
          </div>

          {validation.hasChangedSections && onUpdateToLatestData && (
            <button
              onClick={onUpdateToLatestData}
              className="px-2.5 py-1 rounded-btn bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-semibold text-[11px] transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3 text-amber-700" />
              <span>Update to latest data (save copy)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
