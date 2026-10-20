'use client';

import React, { useState } from 'react';
import { Calendar, HelpCircle, Keyboard, Sparkles, BookOpen, ExternalLink } from 'lucide-react';

interface HeaderProps {
  onOpenHelp: () => void;
  onOpenShortcuts: () => void;
  totalSaved: number;
  onOpenFavorites: () => void;
}

export function Header({
  onOpenHelp,
  onOpenShortcuts,
  totalSaved,
  onOpenFavorites,
}: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Term Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black text-xl tracking-tighter">
            UIU
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Routine Builder
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">
                Fall 2026
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              BSCSE & BSDS • Dept. of Computer Science & Engineering
            </p>
          </div>
        </div>

        {/* Center: Live Dataset Stats */}
        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            791 Sections
          </span>
          <span className="text-slate-600">•</span>
          <span>107 Courses</span>
          <span className="text-slate-600">•</span>
          <span>207 Faculty</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {totalSaved > 0 && (
            <button
              onClick={onOpenFavorites}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors"
              title="Saved Routine Variations"
            >
              ★ Saved ({totalSaved})
            </button>
          )}

          <button
            onClick={onOpenShortcuts}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors hidden sm:flex items-center gap-1 text-xs"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4" />
            <span className="hidden lg:inline">Shortcuts</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-1 text-xs"
            title="Help & How to Use"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Guide</span>
          </button>
        </div>
      </div>
    </header>
  );
}
