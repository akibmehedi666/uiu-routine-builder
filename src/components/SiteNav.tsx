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
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-app-border">
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
        <div className="flex items-center space-x-2">
          {/* Builder specific triggers */}
          {isBuilder && (
            <>
              {onOpenSavedRoutines && (
                <button
                  ref={savedButtonRef}
                  onClick={onOpenSavedRoutines}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-btn bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="My Saved Routines (Key: S)"
                  aria-label="My Saved Routines"
                >
                  <Bookmark className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                  <span>Saved</span>
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
                  className="px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-subtle rounded-btn transition-colors flex items-center gap-1 text-xs border border-transparent hover:border-app-border"
                  title="Help & How to Use"
                >
                  <HelpCircle className="w-4 h-4 text-text-muted" />
                  <span className="hidden sm:inline">Guide</span>
                </button>
              )}
            </>
          )}

          {/* If on home or faculty, show CTA to builder */}
          {!isBuilder && (
            <Link
              href="/builder"
              className="px-3.5 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Build routine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-1.5 text-text-secondary hover:text-text-primary hover:bg-subtle rounded-btn"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-surface border-b border-app-border px-4 py-3 space-y-2 text-xs">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={`block py-1.5 font-medium ${isHome ? 'text-orange-600 font-bold' : 'text-text-secondary'}`}
          >
            Home
          </Link>
          <Link
            href="/builder"
            onClick={() => setMobileOpen(false)}
            className={`block py-1.5 font-medium ${isBuilder ? 'text-orange-600 font-bold' : 'text-text-secondary'}`}
          >
            Routine Builder
          </Link>
          <Link
            href="/faculty"
            onClick={() => setMobileOpen(false)}
            className={`block py-1.5 font-medium ${isFaculty ? 'text-orange-600 font-bold' : 'text-text-secondary'}`}
          >
            Course Directory
          </Link>

          {isHome && (
            <>
              <a
                href="#how-it-works"
                onClick={() => setMobileOpen(false)}
                className="block py-1.5 text-text-secondary font-medium"
              >
                How it works
              </a>
              <a
                href="#features"
                onClick={() => setMobileOpen(false)}
                className="block py-1.5 text-text-secondary font-medium"
              >
                Features
              </a>
              <a
                href="#faq"
                onClick={() => setMobileOpen(false)}
                className="block py-1.5 text-text-secondary font-medium"
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
              className="w-full text-left py-1.5 text-orange-800 font-semibold flex items-center gap-1.5"
            >
              <Bookmark className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
              <span>My Saved Routines {totalSaved > 0 ? `(${totalSaved})` : ''}</span>
            </button>
          )}

          {isBuilder && onOpenShortcuts && (
            <button
              onClick={() => {
                setMobileOpen(false);
                onOpenShortcuts();
              }}
              className="w-full text-left py-1.5 text-text-secondary flex items-center gap-1.5"
            >
              <Keyboard className="w-3.5 h-3.5 text-text-muted" />
              <span>Keyboard Shortcuts</span>
            </button>
          )}

          {isBuilder && onOpenHelp && (
            <button
              onClick={() => {
                setMobileOpen(false);
                onOpenHelp();
              }}
              className="w-full text-left py-1.5 text-text-secondary flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-text-muted" />
              <span>User Guide</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
