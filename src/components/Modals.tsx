'use client';

import React from 'react';
import { X, Keyboard, HelpCircle, Star, Trash2 } from 'lucide-react';
import { ScheduleResult } from '../types';

// 1. Keyboard Shortcuts Modal
interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '←', desc: 'Navigate to previous routine' },
    { key: '→', desc: 'Navigate to next routine' },
    { key: '/', desc: 'Focus course search input' },
    { key: 'f', desc: 'Toggle favorite for current routine' },
    { key: 'p', desc: 'Print or export schedule to PDF' },
    { key: 'Esc', desc: 'Close modals or explorer panel' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-app-border rounded-card max-w-md w-full p-5 shadow-warm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-app-border">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-btn hover:bg-subtle transition-colors"
            aria-label="Close shortcuts"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2.5 rounded-btn bg-subtle border border-app-border"
            >
              <span className="text-text-secondary">{sc.desc}</span>
              <kbd className="px-2.5 py-1 rounded bg-surface text-orange-600 font-mono text-xs font-bold border border-app-border shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// 2. Help Guide Modal
interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpGuideModal({ isOpen, onClose }: HelpGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-app-border rounded-card max-w-lg w-full p-6 shadow-warm space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-app-border">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              UIU Routine Builder Guide
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-btn hover:bg-subtle transition-colors"
            aria-label="Close guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
          <div>
            <h4 className="font-bold text-text-primary text-sm mb-1">1. Select Your Courses</h4>
            <p className="text-text-muted">
              Type any course code (e.g. <code>CSE 1111</code>) or title in the search box.
              If a course has a co-requisite lab (like CSE 1112 for CSE 1111), a single-click button appears to immediately add the lab.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-text-primary text-sm mb-1">2. Faculty Explorer & Preferences</h4>
            <p className="text-text-muted">
              Click any course to open the Faculty Explorer. View all offering faculty, sections, times, and day distribution.
              Mark professors as &quot;Prefer&quot; or &quot;Avoid&quot; to guide solver scoring.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-text-primary text-sm mb-1">3. Instant Client-Side Ranking</h4>
            <p className="text-text-muted">
              A high-performance bitmask constraint solver runs directly in your browser inside a Web Worker.
              It prunes billions of theoretical clashes in milliseconds and scores valid combinations (0 to 100) based on your priorities.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-text-primary text-sm mb-1">4. Enter into UCAM</h4>
            <p className="text-text-muted">
              Click &quot;Copy UCAM&quot; to copy course codes, section letters, and time slots directly to your clipboard.
              You can also export to Google Calendar / Apple Calendar via the <code>.ics</code> download button or print a clean schedule.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-app-border flex justify-between items-center">
          <span className="text-[11px] text-text-muted">
            Fall 2026 Offering • Dept. of CSE, UIU
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}

// 3. Saved Favorites Modal
interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: { id: string; name: string; schedule: ScheduleResult }[];
  onSelectFavorite: (schedule: ScheduleResult) => void;
  onRemoveFavorite: (id: string) => void;
}

export function FavoritesModal({
  isOpen,
  onClose,
  favorites,
  onSelectFavorite,
  onRemoveFavorite,
}: FavoritesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-app-border rounded-card max-w-lg w-full p-5 shadow-warm space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-app-border">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              Saved Routine Variations ({favorites.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-btn hover:bg-subtle transition-colors"
            aria-label="Close saved routines"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {favorites.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted">
            No saved routines yet. Click the star icon (or press F) on any routine to save it here.
          </div>
        ) : (
          <div className="space-y-2.5">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="p-3 rounded-card bg-subtle border border-app-border hover:border-orange-400 transition-all flex items-center justify-between group"
              >
                <div
                  onClick={() => {
                    onSelectFavorite(fav.schedule);
                    onClose();
                  }}
                  className="cursor-pointer flex-1 mr-2"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-text-primary text-xs">
                      {fav.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                      Score: {fav.schedule.score}/100
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {fav.schedule.stats.credits} cr
                    </span>
                  </div>
                  <div className="text-[11px] text-text-secondary">
                    {fav.schedule.sections
                      .map((s) => `${s.courseCode} (${s.section})`)
                      .join(' • ')}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onSelectFavorite(fav.schedule);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-btn bg-surface hover:bg-subtle text-text-primary text-xs font-semibold border border-app-border transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onRemoveFavorite(fav.id)}
                    className="p-1.5 text-text-muted hover:text-danger hover:bg-danger-bg rounded-btn transition-colors"
                    title="Delete"
                    aria-label="Delete saved routine"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
