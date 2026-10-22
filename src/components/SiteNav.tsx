'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PAGE_MAX_W } from '../config/layout';
import { getNavConfig } from '../config/nav';
import { BrandLogo } from './BrandLogo';
import { HelpGuideModal } from './Modals';
import { loadSavedRoutines } from '../utils/savedRoutinesStorage';
import {
  Menu,
  X,
  HelpCircle,
  Keyboard,
  Bookmark,
  ArrowRight,
} from 'lucide-react';

export function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const { activeRoute, actions } = getNavConfig(pathname || '/');

  // Sync saved routines count from localStorage & storage/custom events
  useEffect(() => {
    const updateCount = () => {
      try {
        const { routines } = loadSavedRoutines();
        setSavedCount(routines.length);
      } catch {
        // Fallback gracefully
      }
    };

    updateCount();

    const handleSavedUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ count?: number }>;
      if (typeof customEvent.detail?.count === 'number') {
        setSavedCount(customEvent.detail.count);
      } else {
        updateCount();
      }
    };

    window.addEventListener('saved-routines-updated', handleSavedUpdated);
    window.addEventListener('storage', updateCount);

    return () => {
      window.removeEventListener('saved-routines-updated', handleSavedUpdated);
      window.removeEventListener('storage', updateCount);
    };
  }, []);

  const handleOpenSaved = () => {
    if (activeRoute === 'builder') {
      window.dispatchEvent(new CustomEvent('nav:open-saved'));
    } else {
      router.push('/builder?saved=true');
    }
  };

  const handleOpenShortcuts = () => {
    if (activeRoute === 'builder') {
      window.dispatchEvent(new CustomEvent('nav:open-shortcuts'));
    }
  };

  const handleOpenGuide = () => {
    if (activeRoute === 'builder') {
      window.dispatchEvent(new CustomEvent('nav:open-guide'));
    } else {
      setIsHelpOpen(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-app-border">
        {/* Desktop Navigation (>= 768px): 64px (h-16), 3-column CSS grid */}
        <div className={`${PAGE_MAX_W} mx-auto w-full px-4 sm:px-6 h-16 hidden md:grid grid-cols-[1fr_auto_1fr] items-center`}>
          {/* Left Cell: Brand & Text */}
          <div className="justify-self-start">
            <Link href="/" className="flex items-center group min-w-0">
              <BrandLogo size="nav" showText={true} />
            </Link>
          </div>

          {/* Center Cell: Exactly Centered Nav Links (Never shifts across pages) */}
          <nav
            aria-label="Primary Navigation"
            className="justify-self-center flex items-center gap-6 sm:gap-8 text-sm font-medium"
          >
            <Link
              href="/"
              className={`py-1 border-b-2 transition-colors ${
                activeRoute === 'home'
                  ? 'border-orange-500 font-semibold text-orange-600'
                  : 'border-transparent text-text-secondary hover:text-orange-600'
              }`}
            >
              Home
            </Link>

            <Link
              href="/builder"
              className={`py-1 border-b-2 transition-colors ${
                activeRoute === 'builder'
                  ? 'border-orange-500 font-semibold text-orange-600'
                  : 'border-transparent text-text-secondary hover:text-orange-600'
              }`}
            >
              Builder
            </Link>

            <Link
              href="/faculty"
              className={`py-1 border-b-2 transition-colors ${
                activeRoute === 'directory'
                  ? 'border-orange-500 font-semibold text-orange-600'
                  : 'border-transparent text-text-secondary hover:text-orange-600'
              }`}
            >
              Course Directory
            </Link>
          </nav>

          {/* Right Cell: Route-Driven Actions */}
          <div className="justify-self-end flex items-center gap-2">
            {actions.showSaved && (
              <button
                type="button"
                onClick={handleOpenSaved}
                className="h-8 px-2.5 rounded-btn bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 flex items-center justify-center gap-1.5 transition-colors shadow-2xs relative text-xs font-semibold"
                title="My Saved Routines (Key: S)"
                aria-label="My Saved Routines"
              >
                <Bookmark className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                <span className="hidden sm:inline">Saved</span>
                {savedCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[11px] font-bold leading-tight font-mono tabular-nums">
                    {savedCount}
                  </span>
                )}
              </button>
            )}

            {actions.showShortcuts && (
              <button
                type="button"
                onClick={handleOpenShortcuts}
                className="h-8 px-2.5 text-text-secondary hover:text-text-primary hover:bg-subtle rounded-btn transition-colors hidden lg:flex items-center gap-1.5 text-xs font-medium border border-transparent hover:border-app-border"
                title="Keyboard Shortcuts"
              >
                <Keyboard className="w-4 h-4 text-text-muted" />
                <span>Shortcuts</span>
              </button>
            )}

            {actions.showGuide && (
              <button
                type="button"
                onClick={handleOpenGuide}
                className="h-8 px-2.5 text-text-secondary hover:text-text-primary hover:bg-subtle rounded-btn transition-colors flex items-center justify-center gap-1.5 text-xs font-medium border border-transparent hover:border-app-border"
                title="Help & How to Use"
                aria-label="Help & Guide"
              >
                <HelpCircle className="w-4 h-4 text-text-muted" />
                <span className="hidden sm:inline">Guide</span>
              </button>
            )}

            {actions.showBuildCta && (
              <Link
                href="/builder"
                className="h-9 px-3.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                <span>Build routine</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation (< 768px): Single Row 52px */}
        <div className={`${PAGE_MAX_W} mx-auto w-full px-4 h-[52px] flex md:hidden items-center justify-between gap-1`}>
          {/* Mobile Left: Logo & Brand Text */}
          <Link href="/" className="flex items-center space-x-2 group min-w-0 flex-1">
            <BrandLogo size="sm" />
            <div className="min-w-0 flex-1 truncate">
              <span className="text-base font-semibold text-text-primary tracking-tight truncate block">
                Routine Builder
              </span>
            </div>
          </Link>

          {/* Mobile Right: Action Triggers & Hamburger */}
          <div className="flex items-center space-x-1 shrink-0">
            {actions.showSaved && (
              <button
                type="button"
                onClick={handleOpenSaved}
                className="min-w-[44px] min-h-[44px] px-2 py-1.5 text-xs font-semibold rounded-btn bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 flex items-center justify-center gap-1 relative"
                aria-label="My Saved Routines"
              >
                <Bookmark className="w-4 h-4 fill-orange-500 text-orange-500" />
                {savedCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[11px] font-bold leading-tight font-mono tabular-nums">
                    {savedCount}
                  </span>
                )}
              </button>
            )}

            {actions.showGuide && (
              <button
                type="button"
                onClick={handleOpenGuide}
                className="min-w-[44px] min-h-[44px] p-2 text-text-secondary hover:text-text-primary hover:bg-subtle rounded-btn flex items-center justify-center"
                aria-label="User Guide"
              >
                <HelpCircle className="w-4 h-4 text-text-muted" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-text-secondary hover:text-text-primary hover:bg-subtle rounded-btn transition-colors"
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
              className={`min-h-[44px] flex items-center px-3 rounded-lg font-medium transition-colors ${
                activeRoute === 'home'
                  ? 'text-orange-600 font-bold bg-orange-50'
                  : 'text-text-secondary hover:bg-subtle'
              }`}
            >
              Home
            </Link>
            <Link
              href="/builder"
              onClick={() => setMobileOpen(false)}
              className={`min-h-[44px] flex items-center px-3 rounded-lg font-medium transition-colors ${
                activeRoute === 'builder'
                  ? 'text-orange-600 font-bold bg-orange-50'
                  : 'text-text-secondary hover:bg-subtle'
              }`}
            >
              Routine Builder
            </Link>
            <Link
              href="/faculty"
              onClick={() => setMobileOpen(false)}
              className={`min-h-[44px] flex items-center px-3 rounded-lg font-medium transition-colors ${
                activeRoute === 'directory'
                  ? 'text-orange-600 font-bold bg-orange-50'
                  : 'text-text-secondary hover:bg-subtle'
              }`}
            >
              Course Directory
            </Link>

            <div className="pt-2 border-t border-app-border space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  handleOpenSaved();
                }}
                className="w-full text-left min-h-[44px] px-3 rounded-lg text-orange-800 font-semibold flex items-center gap-2 hover:bg-orange-50 transition-colors"
              >
                <Bookmark className="w-4 h-4 fill-orange-500 text-orange-500" />
                <span>My Saved Routines {savedCount > 0 ? `(${savedCount})` : ''}</span>
              </button>

              {activeRoute === 'builder' && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleOpenShortcuts();
                  }}
                  className="w-full text-left min-h-[44px] px-3 rounded-lg text-text-secondary flex items-center gap-2 hover:bg-subtle transition-colors"
                >
                  <Keyboard className="w-4 h-4 text-text-muted" />
                  <span>Keyboard Shortcuts</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  handleOpenGuide();
                }}
                className="w-full text-left min-h-[44px] px-3 rounded-lg text-text-secondary flex items-center gap-2 hover:bg-subtle transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-text-muted" />
                <span>User Guide</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Guide modal for non-builder pages when Guide is triggered */}
      {isHelpOpen && <HelpGuideModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />}
    </>
  );
}
