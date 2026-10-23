'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Award,
  Search,
  X,
  Check,
  Copy,
  Star,
  Info,
  SlidersHorizontal,
  Sparkles,
  ExternalLink,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react';

import {
  getFacultyBadgesOverview,
  sortBadgeSummaries,
  filterAndSortHolders,
  BadgeSortOption,
  BadgeSummary,
  BadgeHolder,
} from '../../lib/facultyBadges';
import { BadgeCategory, getAllBadgeDefinitions } from '../../config/facultyBadges';
import { BadgeIcon } from './BadgesLegendModal';
import { FacultyStats } from '../../lib/facultyStats';

interface FacultyBadgesViewProps {
  initialBadgeId?: string;
  pinnedIds: string[];
  onTogglePin: (id: string) => void;
  compareSelection: string[];
  onToggleCompare: (id: string) => void;
  onOpenLegendModal: () => void;
}

const CATEGORIES: { id: 'All' | BadgeCategory; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Schedule', label: 'Schedule' },
  { id: 'Courses', label: 'Courses' },
  { id: 'Rooms', label: 'Rooms' },
  { id: 'Programs', label: 'Programs' },
];

const SORT_OPTIONS: { id: BadgeSortOption; label: string }[] = [
  { id: 'rarest', label: 'Rarest first' },
  { id: 'common', label: 'Most common' },
  { id: 'priority', label: 'Priority order' },
  { id: 'az', label: 'A to Z' },
];

const PAGE_SIZE = 30;

export function FacultyBadgesView({
  initialBadgeId,
  pinnedIds,
  onTogglePin,
  compareSelection,
  onToggleCompare,
  onOpenLegendModal,
}: FacultyBadgesViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load memoized data
  const overview = useMemo(() => getFacultyBadgesOverview(), []);

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<'All' | BadgeCategory>('All');
  // Sort order
  const [badgeSort, setBadgeSort] = useState<BadgeSortOption>('rarest');

  // Filtered and sorted badge cards
  const displayedBadges = useMemo(() => {
    let list = overview.badges;
    if (selectedCategory !== 'All') {
      list = list.filter((b) => b.badge.category === selectedCategory);
    }
    return sortBadgeSummaries(list, badgeSort);
  }, [overview.badges, selectedCategory, badgeSort]);

  // Selected badge state
  const defaultBadgeId = displayedBadges[0]?.badge.id || 'busiest';
  const urlBadgeId = searchParams.get('badge') || initialBadgeId;
  const initialValidBadge =
    urlBadgeId && overview.badgeMap.has(urlBadgeId) ? urlBadgeId : defaultBadgeId;

  const [selectedBadgeId, setSelectedBadgeId] = useState<string>(initialValidBadge);

  // Sync if URL query param changes
  useEffect(() => {
    const qBadge = searchParams.get('badge');
    if (qBadge && overview.badgeMap.has(qBadge) && qBadge !== selectedBadgeId) {
      setSelectedBadgeId(qBadge);
    }
  }, [searchParams, overview.badgeMap, selectedBadgeId]);

  // Current selected badge summary
  const selectedSummary = useMemo(() => {
    return overview.badgeMap.get(selectedBadgeId) || displayedBadges[0] || overview.badges[0];
  }, [overview.badgeMap, selectedBadgeId, displayedBadges, overview.badges]);

  // Update deep-link URL state without full page reload
  const handleSelectBadge = (badgeId: string) => {
    setSelectedBadgeId(badgeId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'badges');
      url.searchParams.set('badge', badgeId);
      window.history.replaceState(null, '', url.toString());
    }
    // On mobile, selecting opens the sheet
    setIsMobileSheetOpen(true);
  };

  // Holders list filters
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [programFilter, setProgramFilter] = useState<'ALL' | 'BSCSE' | 'BSDS'>(
    (searchParams.get('program') as 'ALL' | 'BSCSE' | 'BSDS') || 'ALL'
  );
  const [holderSort, setHolderSort] = useState<'metric' | 'az'>('metric');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedBadgeId, searchQuery, programFilter, holderSort]);

  // Filtered and sorted holders
  const filteredHolders = useMemo(() => {
    if (!selectedSummary) return [];
    return filterAndSortHolders(selectedSummary.holders, {
      search: searchQuery,
      program: programFilter,
      sort: holderSort,
    });
  }, [selectedSummary, searchQuery, programFilter, holderSort]);

  const pagedHolders = useMemo(() => {
    return filteredHolders.slice(0, visibleCount);
  }, [filteredHolders, visibleCount]);

  // Copy link handler
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const handleCopyLink = async () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/faculty-directory?tab=badges&badge=${selectedBadgeId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  // Mobile bottom sheet state
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (isMobileSheetOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsMobileSheetOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isMobileSheetOpen]);

  // Card element refs for keyboard nav & scroll-into-view
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keyboard navigation between badge cards
  const handleCardKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (index + 1) % displayedBadges.length;
      cardRefs.current[next]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (index - 1 + displayedBadges.length) % displayedBadges.length;
      cardRefs.current[prev]?.focus();
    }
  };

  // Scroll active card into view on mount or deep link change
  useEffect(() => {
    const idx = displayedBadges.findIndex((b) => b.badge.id === selectedBadgeId);
    if (idx !== -1 && cardRefs.current[idx]) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      cardRefs.current[idx]?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [selectedBadgeId, displayedBadges]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: overview.badges.length };
    for (const b of overview.badges) {
      counts[b.badge.category] = (counts[b.badge.category] || 0) + 1;
    }
    return counts;
  }, [overview.badges]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Tab Subtitle & How Badges Work Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/70 border border-stone-200/80 rounded-2xl p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text-primary">
              Faculty Badges & Achievements
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-900 border border-orange-200">
              12 Badges
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Data-driven recognition computed across class schedules, teaching loads, and campus locations for Fall 2026.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenLegendModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100/80 text-stone-700 text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto min-h-[38px]"
        >
          <Info className="w-3.5 h-3.5 text-orange-500" />
          <span>How badges work</span>
        </button>
      </div>

      {/* Main 2-Pane Layout (Grid on Desktop, Stacked on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Badges Grid & Filters (7 Columns on Large Desktop) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Toolbar: Category Chips & Sort Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            {/* Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.id] || 0;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border min-h-[38px] ${
                      isSelected
                        ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[11px] ${
                        isSelected ? 'bg-orange-600 text-white' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-text-muted font-medium whitespace-nowrap">Sort:</span>
              <div className="relative">
                <select
                  value={badgeSort}
                  onChange={(e) => setBadgeSort(e.target.value as BadgeSortOption)}
                  className="h-9 pl-3 pr-8 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none shadow-2xs cursor-pointer"
                  aria-label="Sort badges by"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <SlidersHorizontal className="w-3 h-3 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Badge Cards Grid: 3 cols on xl, 2 cols on sm, 1 col on mobile */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
            role="radiogroup"
            aria-label="Faculty badges grid"
          >
            {displayedBadges.map((summary, idx) => {
              const b = summary.badge;
              const isSelected = selectedSummary?.badge.id === b.id;

              return (
                <button
                  key={b.id}
                  ref={(el) => {
                    cardRefs.current[idx] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectBadge(b.id)}
                  onKeyDown={(e) => handleCardKeyDown(e, idx)}
                  className={`relative text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between min-h-[160px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    isSelected
                      ? 'bg-orange-50/40 border-orange-500 ring-2 ring-orange-200/80 shadow-xs'
                      : 'bg-white border-stone-200/80 hover:border-orange-300 hover:shadow-2xs'
                  }`}
                >
                  {/* Top Row: Icon + Name + Rarest Tag */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs ${b.badgeStyle}`}
                      >
                        <BadgeIcon name={b.iconName} className="w-4 h-4" />
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {summary.isRarest && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                            <span>Rarest</span>
                          </span>
                        )}
                        <span
                          className="text-[11px] font-semibold text-stone-500 bg-stone-100/90 px-1.5 py-0.5 rounded-md border border-stone-200"
                          title="1 = fewest faculty hold this badge"
                        >
                          Rarity #{summary.rarityRank}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-text-primary tracking-tight">
                          {b.name}
                        </h3>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary leading-snug line-clamp-2">
                        {b.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Stats: Holder Count, Share Bar & Top Holder */}
                  <div className="pt-3 mt-2 border-t border-stone-100/90 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-stone-800">
                        {summary.holdersCount} faculty
                      </span>
                      <span className="font-semibold text-stone-500">
                        {summary.sharePercent}%
                      </span>
                    </div>

                    {/* Progress Bar of Share */}
                    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(4, summary.sharePercent))}%` }}
                      />
                    </div>

                    {/* Top Holder Line */}
                    {summary.topHolder ? (
                      <div
                        className="text-[11px] text-stone-500 truncate pt-0.5"
                        title={summary.topHolder.label}
                      >
                        <span className="text-stone-400">Highest: </span>
                        <span className="font-semibold text-stone-800">
                          {summary.topHolder.facultyName}
                        </span>
                        {summary.topHolder.tieCount > 0 && (
                          <span className="text-stone-400">
                            {' '}
                            (+{summary.topHolder.tieCount} more)
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-stone-400 italic pt-0.5">
                        No faculty earned yet
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Card: Multi-Badge Achievers (Top 5 Faculty with Most Badges) */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5 mt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Faculty with Most Badges
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    Top 5 instructors earning multiple distinct achievement badges this trimester
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5 pt-1">
              {overview.facultyWithMostBadges.map((item, rank) => {
                const f = item.faculty;
                const medal =
                  rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`;

                return (
                  <Link
                    key={f.id}
                    href={`/faculty-directory/${f.id}`}
                    className="p-2.5 rounded-xl border border-stone-200/80 bg-stone-50/50 hover:bg-orange-50/30 hover:border-orange-300 transition-all flex flex-col justify-between space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-500">{medal}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-900 border border-orange-200">
                        {item.badgeCount} badges
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <h4
                        className="text-xs font-bold text-text-primary group-hover:text-orange-600 transition-colors truncate"
                        title={f.name}
                      >
                        {f.name}
                      </h4>
                      <p className="text-[11px] text-text-muted truncate">
                        {f.totalSections} sections • {f.distinctCourseCount} courses
                      </p>
                    </div>

                    {/* Mini Badge Icons */}
                    <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-stone-200/60">
                      {f.badges.slice(0, 3).map((badge) => (
                        <span
                          key={badge.id}
                          className={`w-5 h-5 rounded-md flex items-center justify-center border text-[11px] ${badge.badgeStyle}`}
                          title={`${badge.name}: ${badge.description}`}
                        >
                          <BadgeIcon name={badge.iconName} className="w-3 h-3" />
                        </span>
                      ))}
                      {f.badges.length > 3 && (
                        <span className="text-[11px] font-semibold text-stone-400">
                          +{f.badges.length - 3}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Pane: Selected Badge Faculty List Panel (Desktop Sticky 5 Columns) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-20 h-[calc(100vh-6.5rem)]">
          {selectedSummary && (
            <FacultyBadgeHoldersPanel
              summary={selectedSummary}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              programFilter={programFilter}
              onProgramChange={setProgramFilter}
              holderSort={holderSort}
              onHolderSortChange={setHolderSort}
              filteredHolders={filteredHolders}
              pagedHolders={pagedHolders}
              visibleCount={visibleCount}
              onLoadMore={() => setVisibleCount((c) => c + PAGE_SIZE)}
              pinnedIds={pinnedIds}
              onTogglePin={onTogglePin}
              compareSelection={compareSelection}
              onToggleCompare={onToggleCompare}
              onCopyLink={handleCopyLink}
              copiedLink={copiedLink}
            />
          )}
        </div>
      </div>

      {/* Mobile Full-Screen / Bottom Sheet for Selected Badge */}
      {isMobileSheetOpen && selectedSummary && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-t border-stone-200 animate-in slide-in-from-bottom duration-250">
            {/* Sheet Header with Close Button */}
            <div className="p-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center border ${selectedSummary.badge.badgeStyle}`}
                >
                  <BadgeIcon name={selectedSummary.badge.iconName} className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">
                  {selectedSummary.badge.name} ({selectedSummary.holdersCount})
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="w-9 h-9 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-700 flex items-center justify-center min-h-[44px] min-w-[44px]"
                aria-label="Close sheet"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sheet Body */}
            <div className="p-3.5 overflow-hidden flex-1 flex flex-col min-h-0">
              <FacultyBadgeHoldersPanel
                summary={selectedSummary}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                programFilter={programFilter}
                onProgramChange={setProgramFilter}
                holderSort={holderSort}
                onHolderSortChange={setHolderSort}
                filteredHolders={filteredHolders}
                pagedHolders={pagedHolders}
                visibleCount={visibleCount}
                onLoadMore={() => setVisibleCount((c) => c + PAGE_SIZE)}
                pinnedIds={pinnedIds}
                onTogglePin={onTogglePin}
                compareSelection={compareSelection}
                onToggleCompare={onToggleCompare}
                onCopyLink={handleCopyLink}
                copiedLink={copiedLink}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-component: Faculty Badge Holders List Panel
// -----------------------------------------------------------------------------
interface FacultyBadgeHoldersPanelProps {
  summary: BadgeSummary;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  programFilter: 'ALL' | 'BSCSE' | 'BSDS';
  onProgramChange: (p: 'ALL' | 'BSCSE' | 'BSDS') => void;
  holderSort: 'metric' | 'az';
  onHolderSortChange: (s: 'metric' | 'az') => void;
  filteredHolders: BadgeHolder[];
  pagedHolders: BadgeHolder[];
  visibleCount: number;
  onLoadMore: () => void;
  pinnedIds: string[];
  onTogglePin: (id: string) => void;
  compareSelection: string[];
  onToggleCompare: (id: string) => void;
  onCopyLink: () => void;
  copiedLink: boolean;
}

const CATEGORY_BANNER_STYLES: Record<BadgeCategory, string> = {
  Schedule: 'bg-amber-50/70 border-amber-200/80',
  Courses: 'bg-orange-50/70 border-orange-200/80',
  Rooms: 'bg-cyan-50/70 border-cyan-200/80',
  Programs: 'bg-teal-50/70 border-teal-200/80',
};

function FacultyBadgeHoldersPanel({
  summary,
  searchQuery,
  onSearchChange,
  programFilter,
  onProgramChange,
  holderSort,
  onHolderSortChange,
  filteredHolders,
  pagedHolders,
  visibleCount,
  onLoadMore,
  pinnedIds,
  onTogglePin,
  compareSelection,
  onToggleCompare,
  onCopyLink,
  copiedLink,
}: FacultyBadgeHoldersPanelProps) {
  const router = useRouter();
  const b = summary.badge;

  const bannerStyle = CATEGORY_BANNER_STYLES[b.category] || 'bg-stone-50/70 border-stone-200/80';

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col h-full">
      {/* 1. Eye-Catching Soft Tinted Banner Header */}
      <div className={`p-4 sm:p-5 border-b border-stone-200/80 ${bannerStyle} space-y-3.5 shrink-0`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* 48px Icon Tile */}
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-2xs shrink-0 ${b.badgeStyle}`}
            >
              <BadgeIcon name={b.iconName} className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-text-primary tracking-tight">{b.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/90 text-stone-700 border border-stone-200/80 shadow-2xs">
                  {b.category}
                </span>
              </div>
            </div>
          </div>

          {/* Copy Link Button */}
          <button
            type="button"
            onClick={onCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold shadow-2xs transition-colors min-h-[36px]"
            title="Copy shareable link to this badge"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>Copy link</span>
              </>
            )}
          </button>
        </div>

        {/* 3 Mini Stats Strip */}
        <div className="grid grid-cols-3 gap-2 bg-white/80 p-2.5 rounded-xl border border-stone-200/80 text-center shadow-2xs">
          <div>
            <div className="text-[28px] font-bold text-text-primary tracking-tight leading-none">
              {summary.holdersCount}
            </div>
            <div className="text-[11px] text-text-muted font-medium mt-1">Holders</div>
          </div>
          <div className="border-x border-stone-200/60">
            <div className="text-[28px] font-bold text-text-primary tracking-tight leading-none">
              {summary.sharePercent}%
            </div>
            <div className="text-[11px] text-text-muted font-medium mt-1">% of faculty</div>
          </div>
          <div>
            <div className="text-[28px] font-bold text-text-primary tracking-tight leading-none">
              #{summary.rarityRank}
            </div>
            <div className="text-[11px] text-text-muted font-medium mt-1">Rarity (of 12)</div>
          </div>
        </div>

        {/* Combined Single-Line Rule with Info Tooltip */}
        <div
          className="flex items-center gap-1.5 text-xs text-stone-700 bg-white/80 px-3 py-2 rounded-xl border border-stone-200/80 cursor-help shadow-2xs"
          title={`How to earn: ${b.howToEarn}`}
        >
          <Info className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span className="truncate">
            <strong className="font-semibold text-stone-900">Rule:</strong> {b.description}
          </span>
          <span className="text-[11px] text-stone-400 shrink-0 ml-auto hidden sm:inline">
            Hover for earn rule
          </span>
        </div>
      </div>

      {/* 2. Pinned Toolbar: Search, Program Chips (Orange Active), & Sort */}
      <div className="p-3 sm:px-4 sm:py-3 border-b border-stone-100 bg-stone-50/50 space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search holders by name, initials..."
            className="w-full pl-8 pr-8 py-2 rounded-xl border border-stone-200 bg-white text-base sm:text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Program Chips: Active uses App Orange Token (No Black ALL) */}
          <div className="flex items-center gap-1">
            {(['ALL', 'BSCSE', 'BSDS'] as const).map((prog) => {
              const isSelected = programFilter === prog;
              return (
                <button
                  key={prog}
                  type="button"
                  onClick={() => onProgramChange(prog)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    isSelected
                      ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {prog}
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown Matching Main Directory Style */}
          <div className="flex items-center gap-1.5 text-xs text-stone-600">
            <span className="text-[11px] text-text-muted">Sort:</span>
            <div className="relative">
              <select
                value={holderSort}
                onChange={(e) => onHolderSortChange(e.target.value as 'metric' | 'az')}
                className="h-8 pl-2.5 pr-7 rounded-lg border border-stone-200 bg-white text-[11px] font-semibold text-stone-700 hover:border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none shadow-2xs cursor-pointer"
                aria-label="Sort holders"
              >
                <option value="metric">By metric (high to low)</option>
                <option value="az">A to Z (alphabetical)</option>
              </select>
              <ArrowUpDown className="w-3 h-3 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Showing X of Y Counter */}
      <div
        className="px-4 py-1.5 bg-stone-50/80 border-b border-stone-100 text-[11px] text-text-muted flex items-center justify-between shrink-0"
        aria-live="polite"
      >
        <span>
          Showing <strong>{pagedHolders.length}</strong> of {filteredHolders.length} holders
        </span>
        {summary.topHolder && (
          <span className="text-stone-500 truncate max-w-[200px]" title={summary.topHolder.label}>
            Top: {summary.topHolder.facultyName}
          </span>
        )}
      </div>

      {/* 4. Scrollable Holders Rows List */}
      <div className="divide-y divide-stone-100 flex-1 overflow-y-auto min-h-0">
        {pagedHolders.length > 0 ? (
          pagedHolders.map((holder) => {
            const { faculty, metricValue, metricUnit, metricDetail, rank, relativeWidthPercent } =
              holder;
            const isFav = pinnedIds.includes(faculty.id);
            const isCompared = compareSelection.includes(faculty.id);

            // Rank Badge Styling: Gold, Silver, Bronze soft circles for top 3
            let rankStyle = 'bg-stone-100 text-stone-600 border-stone-200';
            if (rank === '1' || rank === '=1') {
              rankStyle = 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs font-bold';
            } else if (rank === '2' || rank === '=2') {
              rankStyle = 'bg-stone-200 text-stone-800 border-stone-300 shadow-2xs font-bold';
            } else if (rank === '3' || rank === '=3') {
              rankStyle = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
            }

            return (
              <div
                key={faculty.id}
                onClick={() => router.push(`/faculty-directory/${faculty.id}`)}
                className="p-3 sm:p-3.5 hover:bg-orange-50/40 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
              >
                {/* Left Section: Rank + Compare + Avatar + Name & Tags */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  {/* Rank Soft Circle (With = prefix for ties) */}
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs shrink-0 border ${rankStyle}`}
                    title={`Rank ${rank}`}
                  >
                    {rank}
                  </div>

                  {/* Compare Checkbox */}
                  <div
                    className="shrink-0 flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isCompared}
                      onChange={() => onToggleCompare(faculty.id)}
                      className="w-4 h-4 rounded-sm border-stone-300 text-orange-500 focus:ring-orange-500 cursor-pointer sm:opacity-0 group-hover:opacity-100 focus:opacity-100 checked:opacity-100 transition-opacity"
                      aria-label={`Select ${faculty.name} for comparison`}
                    />
                  </div>

                  {/* Pastel Stable-Color Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${faculty.avatarColor.bg} ${faculty.avatarColor.text} ${faculty.avatarColor.border}`}
                  >
                    {faculty.initials}
                  </div>

                  {/* Name + ONE Program Tag Group + Other Badges */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4
                      className="text-sm font-semibold text-text-primary group-hover:text-orange-600 transition-colors truncate"
                      title={faculty.name}
                    >
                      {faculty.name}
                    </h4>

                    {/* Single Program Tag Group + Other Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {faculty.programs.map((p) => (
                        <span
                          key={p}
                          className="px-1.5 py-0.2 rounded-xs text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200"
                        >
                          {p}
                        </span>
                      ))}

                      {/* Other Badges of that person (max 3 icon-only chips) */}
                      {faculty.badges
                        .filter((ob) => ob.id !== b.id)
                        .slice(0, 3)
                        .map((ob) => (
                          <span
                            key={ob.id}
                            className={`w-5 h-5 rounded-md flex items-center justify-center border text-[11px] shadow-2xs ${ob.badgeStyle}`}
                            title={`${ob.name}: ${ob.description}`}
                          >
                            <BadgeIcon name={ob.iconName} className="w-3 h-3" />
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Right Section: Prominent Metric Block + Action Buttons */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Prominent Metric Block */}
                  <div className="flex flex-col items-end text-right shrink-0 min-w-[90px] sm:min-w-[110px]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[18px] font-bold tabular-nums text-text-primary leading-none">
                        {metricValue}
                      </span>
                      <span className="text-[11px] font-medium text-text-muted">
                        {metricUnit}
                      </span>
                    </div>

                    {/* Thin Relative Orange Bar */}
                    <div className="w-16 sm:w-20 h-1 bg-stone-100 rounded-full overflow-hidden my-1">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all duration-300"
                        style={{ width: `${relativeWidthPercent}%` }}
                      />
                    </div>

                    {/* Muted Second Line Detail */}
                    <span
                      className="text-[11px] text-stone-500 truncate max-w-[110px] sm:max-w-[150px]"
                      title={metricDetail}
                    >
                      {metricDetail}
                    </span>
                  </div>

                  {/* 32px Pin & Open Page Buttons */}
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onTogglePin(faculty.id)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors min-h-[32px] min-w-[32px] ${
                        isFav
                          ? 'bg-amber-50 text-amber-500 border-amber-200'
                          : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100 border-stone-200/60'
                      }`}
                      title={isFav ? `Unpin ${faculty.name}` : `Pin ${faculty.name}`}
                      aria-label={isFav ? `Unpin ${faculty.name}` : `Pin ${faculty.name}`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push(`/faculty-directory/${faculty.id}`)}
                      className="w-8 h-8 rounded-lg border border-stone-200/60 text-stone-400 hover:text-orange-600 hover:bg-orange-50 flex items-center justify-center transition-colors min-h-[32px] min-w-[32px]"
                      title={`View ${faculty.name}'s schedule`}
                      aria-label={`View ${faculty.name}'s schedule`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <Award className="w-5 h-5" />
            </div>
            <p className="text-xs text-text-secondary font-medium">
              {summary.holdersCount === 0
                ? 'No faculty earned this badge this trimester.'
                : 'No faculty match the current search or program filters.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="text-xs text-orange-600 font-semibold hover:underline"
              >
                Clear search query
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. Pagination Load More */}
      {filteredHolders.length > visibleCount && (
        <div className="p-2.5 border-t border-stone-100 bg-stone-50/50 text-center shrink-0">
          <button
            type="button"
            onClick={onLoadMore}
            className="w-full py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 shadow-2xs transition-colors min-h-[38px]"
          >
            Load more ({filteredHolders.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
