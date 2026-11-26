'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, CalendarCheck2, MapPin, X, ArrowRight } from 'lucide-react';

interface StartHereProps {
  onQuickAddClick: () => void;
  onBrowseAll: () => void;
  onDismiss: () => void;
}

export function StartHere({
  onQuickAddClick,
  onBrowseAll,
  onDismiss,
}: StartHereProps) {
  return (
    <section
      aria-label="Getting started with your exam schedule"
      className="p-4 sm:p-5 rounded-card bg-surface border border-orange-200 shadow-warm space-y-4 relative"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Start here — check your mid-term plan in 3 steps
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Add the courses you are taking this trimester to see your exam dates,
            clashes, and room numbers.
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="min-h-[44px] min-w-[44px] -mt-1 -mr-1 flex items-center justify-center rounded-btn text-text-muted hover:text-text-primary hover:bg-subtle transition-colors shrink-0"
          aria-label="Dismiss start here guide"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1 */}
        <div className="p-3.5 rounded-card bg-orange-50/70 border border-orange-200 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <PlusCircle className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="text-sm font-semibold text-text-primary">
              Add your courses
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Pick your Fall 2026 courses here or import them straight from the
            Routine Builder.
          </p>
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <button
              type="button"
              onClick={onQuickAddClick}
              className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Quick add courses
            </button>
            <Link
              href="/builder"
              className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-btn bg-surface hover:bg-subtle text-text-secondary border border-app-border text-xs font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <span>Open Builder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-3.5 rounded-card bg-subtle/60 border border-app-border space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-surface border border-app-border text-text-primary text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <CalendarCheck2 className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="text-sm font-semibold text-text-primary">
              See your dates &amp; clashes
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Spot overlapping exam slots, back-to-back exams on the same day, and
            your countdown to the next exam.
          </p>
        </div>

        {/* Step 3 */}
        <div className="p-3.5 rounded-card bg-subtle/60 border border-app-border space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-surface border border-app-border text-text-primary text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="text-sm font-semibold text-text-primary">
              Enter your student ID to find your room
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Your ID stays in this browser only and matches rooms strictly for
            your selected courses.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end pt-1">
        <button
          type="button"
          onClick={onBrowseAll}
          className="min-h-[44px] sm:min-h-[32px] px-2 text-xs font-semibold text-orange-600 hover:text-orange-700 underline inline-flex items-center gap-1"
        >
          <span>Just browsing? Use All exams</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
}
