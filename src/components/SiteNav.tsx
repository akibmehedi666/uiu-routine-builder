'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  HelpCircle,
  Keyboard,
  Star,
  Bookmark,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';

interface SiteNavProps {
  totalSaved?: number;
  onOpenSavedRoutines?: () => void;
  onOpenFavorites?: () => void;
  onOpenShortcuts?: () => void;
  onOpenHelp?: () => void;
  savedButtonRef?: React.RefObject<HTMLButtonElement>;
}

export function SiteNav({
  totalSaved = 0,
  onOpenSavedRoutines,
  onOpenFavorites,
  onOpenShortcuts,
  onOpenHelp,
  savedButtonRef,
}: SiteNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = pathname === '/';
  const isBuilder = pathname === '/builder';
  const isFaculty = pathname.startsWith('/faculty');

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-app-border w-full max-w-full">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 h-[52px] md:h-14 flex items-center justify-between gap-1 sm:gap-2 min-w-0">
        {/* Left: Brand & Term Badge */}
        <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group min-w-0 flex-1 sm:flex-initial">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-warm text-white font-black text-sm md:text-base tracking-tight group-hover:scale-105 transition-transform shrink-0">
            UIU
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold text-text-primary tracking-tight truncate">
                Routine Builder
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-50 text-orange-600 border border-orange-200 shrink-0">
                Fall 2026
              </span>
            </div>
            <p className="text-[11px] text-text-muted hidden sm:block truncate">
              Dept. of CSE &amp; Data Science
            </p>
          </div>
        </Link>

        {/* Center / Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-xs sm:text-sm font-medium text-text-secondary">
          <Link
            href="/"
            className={`transition-colors py-1 ${
              isHome
                ? 'text-orange-600 font-bold border-b-2 border-orange-500'
                : 'hover:text-orange-600'
            }`}
          >
            Home
          </Link>

          {isHome ? (
            <>
              <a href="#how-it-works" className="hover:text-orange-600 transition-colors py-1">
                How it works
              </a>
              <a href="#features" className="hover:text-orange-600 transition-colors py-1">
                Features
              </a>
              <Link
                href="/faculty"
                className={`transition-colors py-1 ${
                  isFaculty
                    ? 'text-orange-600 font-bold border-b-2 border-orange-500'
                    : 'hover:text-orange-600'
                }`}
              >
                Course Directory
              </Link>
              <a href="#faq" className="hover:text-orange-600 transition-colors py-1">
                FAQ
              </a>
            </>
          ) : (
            <>
              <Link
                href="/builder"
                className={`transition-colors py-1 ${
                  isBuilder
                    ? 'text-orange-600 font-bold border-b-2 border-orange-500'
                    : 'hover:text-orange-600'
                }`}
              >
                Builder
              </Link>

              <Link
                href="/faculty"
                className={`transition-colors py-1 ${
                  isFaculty
                    ? 'text-orange-600 font-bold border-b-2 border-orange-500'
                    : 'hover:text-orange-600'
                }`}
              >
                Course Directory
              </Link>
            </>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          {/* Builder specific triggers */}
          {isBuilder && (
            <>
              {onOpenSavedRoutines && (
                <button
                  ref={savedButtonRef}
                  onClick={onOpenSavedRoutines}
                  className="min-w-[44px] min-h-[44px] px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-btn bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 flex items-center justify-center gap-1.5 transition-colors shadow-2xs relative"
                  title="My Saved Routines (Key: S)"
                  aria-label="My Saved Routines"
                >
                  <Bookmark className="w-4 h-4 sm:w-3.5 sm:h-3.5 fill-orange-500 text-orange-500" />
                  <span className="hidden sm:inline">Saved</span>
                  {totalSaved > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-tight">
                      {totalSaved}
                    </span>
                  )}
                </button>
              )}

              {onOpenShortcuts && (
                <button
                  onClick={onOpenShortcuts}
                  className="px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-subtle rounded-btn transition-colors hidden sm:flex items-center gap-1 text-xs border border-transparent hover:border-app-border"
                  title="Keyboard Shortcuts"
                >
                  <Keyboard className="w-4 h-4 text-text-muted" />
                  <span className="hidden lg:inline">Shortcuts</span>
                </button>
              )}

              {onOpenHelp && (
                <button
                  onClick={onOpenHelp}
                  className="min-w-[44px] min-h-[44px] px-2 sm:px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-subtle rounded-btn transition-colors flex items-center justify-center gap-1 text-xs border border-transparent hover:border-app-border"
                  title="Help & How to Use"
                  aria-label="Help & Guide"
                >
                  <HelpCircle className="w-4.5 h-4.5 sm:w-4 sm:h-4 text-text-muted" />
                  <span className="hidden sm:inline">Guide</span>
                </button>
              )}
            </>
          )}

          {/* If on home or faculty, show CTA to builder */}
          {!isBuilder && (
            <Link
              href="/builder"
              className="min-h-[44px] px-3 sm:px-3.5 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Build routine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-text-secondary hover:text-text-primary hover:bg-subtle rounded-btn transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-surface border-b border-app-border px-4 py-2 space-y-1 text-sm">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={`min-h-[44px] flex items-center px-2 rounded-lg font-medium transition-colors ${
              isHome ? 'text-orange-600 font-bold bg-orange-50' : 'text-text-secondary hover:bg-subtle'
            }`}
          >
            Home
          </Link>
          <Link
            href="/builder"
            onClick={() => setMobileOpen(false)}
            className={`min-h-[44px] flex items-center px-2 rounded-lg font-medium transition-colors ${
              isBuilder ? 'text-orange-600 font-bold bg-orange-50' : 'text-text-secondary hover:bg-subtle'
            }`}
          >
            Routine Builder
          </Link>
          <Link
            href="/faculty"
            onClick={() => setMobileOpen(false)}
            className={`min-h-[44px] flex items-center px-2 rounded-lg font-medium transition-colors ${
              isFaculty ? 'text-orange-600 font-bold bg-orange-50' : 'text-text-secondary hover:bg-subtle'
            }`}
          >
            Course Directory
          </Link>

          {isHome && (
            <>
              <a
                href="#how-it-works"
                onClick={() => setMobileOpen(false)}
                className="min-h-[44px] flex items-center px-2 rounded-lg text-text-secondary font-medium hover:bg-subtle transition-colors"
              >
                How it works
              </a>
              <a
                href="#features"
                onClick={() => setMobileOpen(false)}
                className="min-h-[44px] flex items-center px-2 rounded-lg text-text-secondary font-medium hover:bg-subtle transition-colors"
              >
                Features
              </a>
              <a
                href="#faq"
                onClick={() => setMobileOpen(false)}
                className="min-h-[44px] flex items-center px-2 rounded-lg text-text-secondary font-medium hover:bg-subtle transition-colors"
              >
                FAQ
              </a>
            </>
          )}

          {onOpenSavedRoutines && (
            <button
              onClick={() => {
                setMobileOpen(false);
                onOpenSavedRoutines();
              }}
              className="w-full text-left min-h-[44px] px-2 rounded-lg text-orange-800 font-semibold flex items-center gap-2 hover:bg-orange-50 transition-colors"
            >
              <Bookmark className="w-4 h-4 fill-orange-500 text-orange-500" />
              <span>My Saved Routines {totalSaved > 0 ? `(${totalSaved})` : ''}</span>
            </button>
          )}

          {isBuilder && onOpenShortcuts && (
            <button
              onClick={() => {
                setMobileOpen(false);
                onOpenShortcuts();
              }}
              className="w-full text-left min-h-[44px] px-2 rounded-lg text-text-secondary flex items-center gap-2 hover:bg-subtle transition-colors"
            >
              <Keyboard className="w-4 h-4 text-text-muted" />
              <span>Keyboard Shortcuts</span>
            </button>
          )}

          {isBuilder && onOpenHelp && (
            <button
              onClick={() => {
                setMobileOpen(false);
                onOpenHelp();
              }}
              className="w-full text-left min-h-[44px] px-2 rounded-lg text-text-secondary flex items-center gap-2 hover:bg-subtle transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-text-muted" />
              <span>User Guide</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
