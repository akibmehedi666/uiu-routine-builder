'use client';

import React from 'react';
import Link from 'next/link';
import { HelpCircle, Keyboard, Star } from 'lucide-react';

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
    <header className="border-b border-app-border bg-surface/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Brand & Term Badge */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-warm text-white font-black text-lg tracking-tight group-hover:scale-105 transition-transform">
            UIU
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold text-text-primary tracking-tight">
                Routine Builder
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                Fall 2026
              </span>
            </div>
            <p className="text-[11px] text-text-muted hidden sm:block">
              BSCSE & BSDS • Dept. of CSE
            </p>
          </div>
        </Link>

        {/* Center: Live Dataset Stats */}
        <div className="hidden md:flex items-center space-x-2 text-xs text-text-secondary bg-subtle px-3 py-1 rounded-btn border border-app-border">
          <span className="flex items-center gap-1.5 font-medium text-text-primary">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            791 Sections
          </span>
          <span className="text-border-strong">•</span>
          <span>107 Courses</span>
          <span className="text-border-strong">•</span>
          <span>207 Faculty</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {totalSaved > 0 && (
            <button
              onClick={onOpenFavorites}
              className="px-3 py-1.5 text-xs font-semibold rounded-btn bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5 transition-colors"
              title="Saved Routine Variations"
            >
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Saved ({totalSaved})</span>
            </button>
          )}

          <button
            onClick={onOpenShortcuts}
            className="px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-subtle rounded-btn transition-colors hidden sm:flex items-center gap-1 text-xs border border-transparent hover:border-app-border"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4 text-text-muted" />
            <span className="hidden lg:inline">Shortcuts</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-subtle rounded-btn transition-colors flex items-center gap-1 text-xs border border-transparent hover:border-app-border"
            title="Help & How to Use"
          >
            <HelpCircle className="w-4 h-4 text-text-muted" />
            <span className="hidden sm:inline">Guide</span>
          </button>
        </div>
      </div>
    </header>
  );
}
