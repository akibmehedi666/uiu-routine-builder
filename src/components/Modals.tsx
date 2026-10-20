'use client';

import React from 'react';
import { X, Keyboard, HelpCircle, Star, Trash2, Calendar, Check, ExternalLink } from 'lucide-react';
import { ScheduleResult } from '../types';
import { formatTime24 } from '../utils/export';

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
    { key: 'Esc', desc: 'Close modals or cancel dropdowns' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-orange-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80"
            >
              <span className="text-slate-300">{sc.desc}</span>
              <kbd className="px-2.5 py-1 rounded-md bg-slate-800 text-orange-400 font-mono text-xs font-bold border border-slate-700 shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-orange-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              UIU Routine Builder Guide
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div>
            <h4 className="font-bold text-white text-sm mb-1">1. Select Your Courses</h4>
            <p className="text-slate-400">
              Type any course code (e.g. <code>CSE 1111</code>) or title in the search box.
              If a course has a co-requisite lab (like CSE 1112 for CSE 1111), a single-click green button appears to immediately add the lab.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white text-sm mb-1">2. Customize Faculty & Filters</h4>
            <p className="text-slate-400">
              Expand &quot;Faculty Preference&quot; on any selected course to mark professors you prefer or want to avoid.
              Use the Filters panel to enforce day-offs (e.g., free Tuesdays), restrict class hours, or minimize gaps.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white text-sm mb-1">3. Instant Client-Side Ranking</h4>
            <p className="text-slate-400">
              A high-performance bitmask constraint solver runs directly in your browser inside a Web Worker.
              It prunes billions of theoretical clashes in milliseconds and scores valid combinations (0 to 100) based on your priorities.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white text-sm mb-1">4. Enter into UCAM</h4>
            <p className="text-slate-400">
              Click &quot;Copy UCAM&quot; to copy the course codes, section letters, and time slots directly to your clipboard.
              You can also export to Google Calendar / Apple Calendar via the <code>.ics</code> download button.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
          <span className="text-[11px] text-slate-500">
            Fall 2026 Offering • Dept. of CSE, UIU
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Saved Routine Variations ({favorites.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {favorites.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No saved routines yet. Click the star icon (or press F) on any routine to save it here.
          </div>
        ) : (
          <div className="space-y-2.5">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group"
              >
                <div
                  onClick={() => {
                    onSelectFavorite(fav.schedule);
                    onClose();
                  }}
                  className="cursor-pointer flex-1 mr-2"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-xs">
                      {fav.name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                      Score: {fav.schedule.score}/100
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {fav.schedule.stats.credits} cr
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
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
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onRemoveFavorite(fav.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete"
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
