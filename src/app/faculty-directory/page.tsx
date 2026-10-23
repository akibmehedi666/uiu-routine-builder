'use client';

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
  Calendar,
  Sparkles,
  Trophy,
  Flame,
  Moon,
  Bell,
  FlaskConical,
  Users,
  MapPin,
  ExternalLink,
  RotateCcw,
  Copy,
  Check,
  Award,
  Shuffle,
  Star,
  BarChart3,
  Layers,
} from 'lucide-react';

import { PAGE_MAX_W } from '../../config/layout';
import { SiteFooter } from '../../components/SiteFooter';
import { DATA_UPDATED } from '../../config/site';
import {
  getAllFacultyStats,
  getTBASections,
  filterFaculty,
  sortFaculty,
  getFacultyLeaderboards,
  getDailyFacultySpotlight,
  FacultyStats,
  FacultyFilterCriteria,
  TimeSlot,
  formatMinutesToTime,
} from '../../lib/facultyStats';
import { getCourseColor } from '../../utils/colors';
import { Day, DAYS_LIST } from '../../types';
import { usePinnedFaculty } from '../../hooks/usePinnedFaculty';
import { BadgeIcon, BadgesLegendModal } from '../../components/faculty/BadgesLegendModal';
import { CampusStatsView } from '../../components/faculty/CampusStatsView';
import { RoomScheduleSheet } from '../../components/faculty/RoomScheduleSheet';
import { FacultyBadgesView } from '../../components/faculty/FacultyBadgesView';

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <>{text}</>;
  const regex = new RegExp(
    `(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-orange-100 text-orange-950 rounded-xs px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

const TIMETABLE_SLOTS = [
  { label: '08:30', min: 510 },
  { label: '09:50', min: 590 },
  { label: '11:10', min: 670 },
  { label: '12:30', min: 750 },
  { label: '13:50', min: 830 },
  { label: '15:10', min: 910 },
  { label: '16:30', min: 990 },
];

function FacultyDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const allFaculty = useMemo(() => getAllFacultyStats(), []);
  const tbaGroups = useMemo(() => getTBASections(), []);
  const leaderboards = useMemo(() => getFacultyLeaderboards(allFaculty), [allFaculty]);

  // Main view switcher: 'directory' | 'stats' | 'badges'
  const initialUrlTab = searchParams.get('tab');
  const [activeMainTab, setActiveMainTab] = useState<'directory' | 'stats' | 'badges'>(
    initialUrlTab === 'stats' || initialUrlTab === 'badges' ? initialUrlTab : 'directory'
  );

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab === 'badges' || urlTab === 'stats' || urlTab === 'directory') {
      if (urlTab !== activeMainTab) {
        setActiveMainTab(urlTab);
      }
    }
  }, [searchParams, activeMainTab]);

  const handleTabSwitch = (tab: 'directory' | 'stats' | 'badges') => {
    setActiveMainTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'directory') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState(null, '', url.toString());
    }
  };

  // Pinned faculty hook (localStorage + cross-tab sync)
  const { pinnedIds, isPinned, togglePin, unpinFaculty } = usePinnedFaculty();
  const [pinnedOnly, setPinnedOnly] = useState<boolean>(false);

  // Compare 2 faculty
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [compareNotice, setCompareNotice] = useState<string | null>(null);

  // Modals / sheets
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState<boolean>(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Compute deterministic daily spotlight
  const spotlightFaculty = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return getDailyFacultySpotlight(allFaculty, today);
  }, [allFaculty]);

  // Filter & sort state derived from URL or defaults
  const [search, setSearch] = useState<string>(searchParams.get('q') || '');
  const [program, setProgram] = useState<'ALL' | 'BSCSE' | 'BSDS'>(
    (searchParams.get('p') as 'BSCSE' | 'BSDS') || 'ALL'
  );
  const [day, setDay] = useState<'ALL' | Day>((searchParams.get('day') as Day) || 'ALL');
  const [timeSlot, setTimeSlot] = useState<'ALL' | TimeSlot>(
    (searchParams.get('time') as TimeSlot) || 'ALL'
  );
  const [kind, setKind] = useState<'ALL' | 'theory' | 'lab'>(
    (searchParams.get('kind') as 'theory' | 'lab') || 'ALL'
  );
  const [sortBy, setSortBy] = useState<FacultyFilterCriteria['sortBy']>(
    (searchParams.get('sort') as FacultyFilterCriteria['sortBy']) || 'az'
  );

  // Selected faculty ID (deep-linkable via ?f=<id>)
  const initialFacultyId = searchParams.get('f') || (allFaculty.length > 0 ? allFaculty[0].id : '');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(initialFacultyId);

  // Mobile accordion expanded faculty ID (< 768px)
  const [expandedMobileFacultyId, setExpandedMobileFacultyId] = useState<string | null>(
    searchParams.get('f') || null
  );

  // Copy link feedback
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Prominently featured Leaderboards section (open by default, collapsible)
  const [isLeaderboardsOpen, setIsLeaderboardsOpen] = useState<boolean>(true);
  const [isTBAOpen, setIsTBAOpen] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync state to URL search params cleanly
  useEffect(() => {
    if (activeMainTab !== 'directory') return;
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (program !== 'ALL') params.set('p', program);
    if (day !== 'ALL') params.set('day', day);
    if (timeSlot !== 'ALL') params.set('time', timeSlot);
    if (kind !== 'ALL') params.set('kind', kind);
    if (sortBy && sortBy !== 'az') params.set('sort', sortBy);
    if (selectedFacultyId) params.set('f', selectedFacultyId);

    const qs = params.toString();
    const target = qs ? `/faculty-directory?${qs}` : '/faculty-directory';
    window.history.replaceState(null, '', target);
  }, [search, program, day, timeSlot, kind, sortBy, selectedFacultyId, activeMainTab]);

  // Keyboard shortcut: "/" to focus search, "Escape" to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearch('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter and sort the faculty list
  const filteredFaculty = useMemo(() => {
    let filtered = filterFaculty(allFaculty, {
      search,
      program,
      day,
      timeSlot,
      kind,
    });
    if (pinnedOnly) {
      filtered = filtered.filter((f) => pinnedIds.includes(f.id));
    }
    return sortFaculty(filtered, sortBy);
  }, [allFaculty, search, program, day, timeSlot, kind, sortBy, pinnedOnly, pinnedIds]);

  // Ensure selected faculty is valid
  useEffect(() => {
    if (filteredFaculty.length > 0) {
      const exists = filteredFaculty.some((f) => f.id === selectedFacultyId);
      if (!exists && !searchParams.get('f')) {
        setSelectedFacultyId(filteredFaculty[0].id);
      }
    }
  }, [filteredFaculty, selectedFacultyId, searchParams]);

  const selectedFaculty = useMemo(() => {
    return allFaculty.find((f) => f.id === selectedFacultyId) || filteredFaculty[0] || null;
  }, [allFaculty, selectedFacultyId, filteredFaculty]);

  const handleSelectFaculty = (id: string) => {
    setSelectedFacultyId(id);
    setExpandedMobileFacultyId((prev) => (prev === id ? null : id));
  };

  const handleClearFilters = () => {
    setSearch('');
    setProgram('ALL');
    setDay('ALL');
    setTimeSlot('ALL');
    setKind('ALL');
    setSortBy('az');
    setPinnedOnly(false);
  };

  const handleCopyLink = async () => {
    try {
      if (typeof window !== 'undefined') {
        const url = `${window.location.origin}/faculty-directory?f=${encodeURIComponent(
          selectedFaculty?.id || ''
        )}`;
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleToggleCompare = (id: string) => {
    setCompareSelection((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        setCompareNotice('Maximum 2 faculty can be compared at once.');
        setTimeout(() => setCompareNotice(null), 3000);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleClearCompare = () => {
    setCompareSelection([]);
  };

  // Surprise me random button
  const handleSurpriseMe = () => {
    if (allFaculty.length === 0) return;
    const randomIndex = Math.floor(Math.random() * allFaculty.length);
    const randomFaculty = allFaculty[randomIndex];
    router.push(`/faculty-directory/${randomFaculty.id}`);
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (program !== 'ALL' ? 1 : 0) +
    (day !== 'ALL' ? 1 : 0) +
    (timeSlot !== 'ALL' ? 1 : 0) +
    (kind !== 'ALL' ? 1 : 0) +
    (pinnedOnly ? 1 : 0);

  const totalTBACount = useMemo(() => {
    return tbaGroups.reduce((acc, g) => acc + g.sections.length, 0);
  }, [tbaGroups]);

  return (
    <div className="min-h-screen bg-bg-page flex flex-col justify-between">
      <main className={`${PAGE_MAX_W} mx-auto w-full px-4 sm:px-6 py-5 md:py-6 space-y-5 flex-1`}>
        {/* Header Section with Navigation & Main View Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] font-bold text-text-primary tracking-tight">
                Faculty Directory
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-900 border border-orange-200">
                {allFaculty.length} faculty
              </span>
              <span className="text-xs text-text-muted hidden sm:inline">
                Dept. of CSE & Data Science
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              Explore instructor workloads, weekly teaching timetables, and room allocations for Fall 2026.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher Tabs */}
            <div className="p-1 bg-stone-100 rounded-xl border border-stone-200/80 flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleTabSwitch('directory')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeMainTab === 'directory'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Directory
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('stats')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeMainTab === 'stats'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-orange-500" />
                <span>Stats & Heatmap</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('badges')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeMainTab === 'badges'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-orange-500" />
                <span>Badges</span>
              </button>
            </div>

            {/* Surprise Me Button */}
            <button
              type="button"
              onClick={handleSurpriseMe}
              className="h-9 px-3 rounded-xl border border-stone-200 bg-white hover:bg-orange-50 text-stone-700 hover:text-orange-700 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Open a random faculty profile"
            >
              <Shuffle className="w-3.5 h-3.5 text-orange-500" />
              <span>Surprise me</span>
            </button>
          </div>
        </div>

        {/* Notice Toast */}
        {compareNotice && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-4 py-2 rounded-xl text-xs shadow-lg animate-in fade-in duration-150">
            {compareNotice}
          </div>
        )}

        {/* View Switcher: Stats View, Badges View, or Directory View */}
        {activeMainTab === 'stats' ? (
          <CampusStatsView onSelectRoom={(room) => setSelectedRoom(room)} />
        ) : activeMainTab === 'badges' ? (
          <FacultyBadgesView
            initialBadgeId={searchParams.get('badge') || undefined}
            pinnedIds={pinnedIds}
            onTogglePin={togglePin}
            compareSelection={compareSelection}
            onToggleCompare={handleToggleCompare}
            onOpenLegendModal={() => setIsBadgesModalOpen(true)}
          />
        ) : (
          <>
            {/* 1. Spotlight Banner (Daily Highlight) */}
            {spotlightFaculty && (
              <div className="bg-gradient-to-r from-orange-50 via-surface to-amber-50/70 rounded-card border border-orange-200/90 p-4 sm:p-5 shadow-warm relative overflow-hidden">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border shadow-2xs ring-2 ring-orange-200"
                      style={{
                        backgroundColor: spotlightFaculty.avatarColor.bg,
                        color: spotlightFaculty.avatarColor.text,
                        borderColor: spotlightFaculty.avatarColor.border,
                      }}
                    >
                      {spotlightFaculty.initials}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                          <Sparkles className="w-3 h-3 text-orange-600" />
                          Faculty Spotlight · Daily Highlight
                        </span>
                        {spotlightFaculty.programs.map((p) => (
                          <span
                            key={p}
                            className="text-[11px] font-semibold text-text-muted bg-surface px-1.5 py-0.5 rounded border border-app-border"
                          >
                            {p}
                          </span>
                        ))}
                        {spotlightFaculty.badges.slice(0, 3).map((b) => (
                          <Link
                            key={b.id}
                            href={`/faculty-directory?tab=badges&badge=${b.id}`}
                            title={`${b.name}: ${b.description}`}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border hover:scale-105 transition-transform ${b.badgeStyle}`}
                          >
                            <BadgeIcon name={b.iconName} className="w-3 h-3" />
                            <span>{b.name}</span>
                          </Link>
                        ))}
                      </div>
                      <h3 className="text-base font-bold text-text-primary truncate" title={spotlightFaculty.name}>
                        {spotlightFaculty.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-text-secondary flex-wrap">
                        <span>
                          <strong className="text-text-primary">{spotlightFaculty.totalSections}</strong> sections ({spotlightFaculty.theoryCourseCount} theory, {spotlightFaculty.labCourseCount} lab)
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-text-primary">{spotlightFaculty.distinctCourseCount}</strong> courses
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-text-primary">{spotlightFaculty.totalWeeklyHours}h</strong> / week
                        </span>
                        {spotlightFaculty.busiestDay && (
                          <>
                            <span>•</span>
                            <span>
                              Busiest: <strong className="text-orange-700">{spotlightFaculty.busiestDay}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSelectFaculty(spotlightFaculty.id)}
                      className="w-full sm:w-auto h-9 px-4 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>View Schedule</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Highlighted Teaching Load Leaderboards Showcase */}
            <div className="bg-surface rounded-card border-2 border-orange-200/80 shadow-warm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-orange-100/70 via-amber-50/50 to-surface border-b border-orange-200/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold shadow-2xs">
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-text-primary">
                        Teaching Load Leaderboard
                      </h2>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200">
                        Top 5 in 5 Categories
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Click any instructor to view their complete teaching schedule & sections
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLeaderboardsOpen(!isLeaderboardsOpen)}
                    className="text-xs font-semibold text-text-secondary hover:text-orange-600 inline-flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded hover:bg-orange-50/80 border border-transparent hover:border-orange-200 transition-colors"
                    aria-expanded={isLeaderboardsOpen}
                  >
                    <span>{isLeaderboardsOpen ? 'Collapse' : 'Expand'}</span>
                    {isLeaderboardsOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {isLeaderboardsOpen && (
                <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 bg-bg-page/40">
                  {/* Category 1: Most Theory Courses */}
                  <div className="bg-surface rounded-xl p-3 border border-blue-200 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                        <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-blue-600" /> Most Theory Courses
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          Distinct
                        </span>
                      </div>
                      <ol className="space-y-1.5 text-xs pt-2">
                        {leaderboards.mostTheoryCourses.map((item, idx) => (
                          <li key={item.facultyId}>
                            <button
                              type="button"
                              onClick={() => handleSelectFaculty(item.facultyId)}
                              className="w-full flex items-center justify-between gap-1.5 p-1 rounded hover:bg-blue-50/70 transition-colors group cursor-pointer text-left"
                              title={item.name}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`w-4 h-4 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                    idx === 0
                                      ? 'bg-amber-400 text-amber-950 shadow-2xs'
                                      : idx === 1
                                      ? 'bg-slate-300 text-slate-800'
                                      : idx === 2
                                      ? 'bg-amber-200 text-amber-900'
                                      : 'text-text-muted bg-subtle'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <span className="truncate font-medium text-text-primary group-hover:text-blue-700">
                                  {item.name}
                                </span>
                              </div>
                              <span className="font-semibold text-text-primary text-[11px] bg-blue-50 text-blue-900 border border-blue-200 px-1.5 py-0.2 rounded font-mono shrink-0">
                                {item.metricValue}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Category 2: Most Lab Courses */}
                  <div className="bg-surface rounded-xl p-3 border border-emerald-200 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                        <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <FlaskConical className="w-4 h-4 text-emerald-600" /> Most Lab Courses
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Distinct
                        </span>
                      </div>
                      <ol className="space-y-1.5 text-xs pt-2">
                        {leaderboards.mostLabCourses.map((item, idx) => (
                          <li key={item.facultyId}>
                            <button
                              type="button"
                              onClick={() => handleSelectFaculty(item.facultyId)}
                              className="w-full flex items-center justify-between gap-1.5 p-1 rounded hover:bg-emerald-50/70 transition-colors group cursor-pointer text-left"
                              title={item.name}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`w-4 h-4 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                    idx === 0
                                      ? 'bg-amber-400 text-amber-950 shadow-2xs'
                                      : idx === 1
                                      ? 'bg-slate-300 text-slate-800'
                                      : idx === 2
                                      ? 'bg-amber-200 text-amber-900'
                                      : 'text-text-muted bg-subtle'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <span className="truncate font-medium text-text-primary group-hover:text-emerald-700">
                                  {item.name}
                                </span>
                              </div>
                              <span className="font-semibold text-text-primary text-[11px] bg-emerald-50 text-emerald-900 border border-emerald-200 px-1.5 py-0.2 rounded font-mono shrink-0">
                                {item.metricValue}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Category 3: Total Sections */}
                  <div className="bg-surface rounded-xl p-3 border border-orange-200 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-orange-100">
                        <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-orange-600" /> Total Sections
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                          Teaching Load
                        </span>
                      </div>
                      <ol className="space-y-1.5 text-xs pt-2">
                        {leaderboards.mostSections.map((item, idx) => (
                          <li key={item.facultyId}>
                            <button
                              type="button"
                              onClick={() => handleSelectFaculty(item.facultyId)}
                              className="w-full flex items-center justify-between gap-1.5 p-1 rounded hover:bg-orange-50/70 transition-colors group cursor-pointer text-left"
                              title={item.name}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`w-4 h-4 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                    idx === 0
                                      ? 'bg-amber-400 text-amber-950 shadow-2xs'
                                      : idx === 1
                                      ? 'bg-slate-300 text-slate-800'
                                      : idx === 2
                                      ? 'bg-amber-200 text-amber-900'
                                      : 'text-text-muted bg-subtle'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <span className="truncate font-medium text-text-primary group-hover:text-orange-700">
                                  {item.name}
                                </span>
                              </div>
                              <span className="font-semibold text-text-primary text-[11px] bg-orange-50 text-orange-900 border border-orange-200 px-1.5 py-0.2 rounded font-mono shrink-0">
                                {item.metricValue}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Category 4: Weekly Hours */}
                  <div className="bg-surface rounded-xl p-3 border border-sky-200 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-sky-100">
                        <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-sky-600" /> Weekly Hours
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                          Contact
                        </span>
                      </div>
                      <ol className="space-y-1.5 text-xs pt-2">
                        {leaderboards.mostHours.map((item, idx) => (
                          <li key={item.facultyId}>
                            <button
                              type="button"
                              onClick={() => handleSelectFaculty(item.facultyId)}
                              className="w-full flex items-center justify-between gap-1.5 p-1 rounded hover:bg-sky-50/70 transition-colors group cursor-pointer text-left"
                              title={item.name}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`w-4 h-4 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                    idx === 0
                                      ? 'bg-amber-400 text-amber-950 shadow-2xs'
                                      : idx === 1
                                      ? 'bg-slate-300 text-slate-800'
                                      : idx === 2
                                      ? 'bg-amber-200 text-amber-900'
                                      : 'text-text-muted bg-subtle'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <span className="truncate font-medium text-text-primary group-hover:text-sky-700">
                                  {item.name}
                                </span>
                              </div>
                              <span className="font-semibold text-text-primary text-[11px] bg-sky-50 text-sky-900 border border-sky-200 px-1.5 py-0.2 rounded font-mono shrink-0">
                                {item.metricValue}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Category 5: First Bell */}
                  <div className="bg-surface rounded-xl p-3 border border-amber-200 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <Bell className="w-4 h-4 text-amber-600" /> 08:30 AM Starts
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Early
                        </span>
                      </div>
                      <ol className="space-y-1.5 text-xs pt-2">
                        {leaderboards.mostFirstBell.map((item, idx) => (
                          <li key={item.facultyId}>
                            <button
                              type="button"
                              onClick={() => handleSelectFaculty(item.facultyId)}
                              className="w-full flex items-center justify-between gap-1.5 p-1 rounded hover:bg-amber-50/70 transition-colors group cursor-pointer text-left"
                              title={item.name}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`w-4 h-4 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                    idx === 0
                                      ? 'bg-amber-400 text-amber-950 shadow-2xs'
                                      : idx === 1
                                      ? 'bg-slate-300 text-slate-800'
                                      : idx === 2
                                      ? 'bg-amber-200 text-amber-900'
                                      : 'text-text-muted bg-subtle'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <span className="truncate font-medium text-text-primary group-hover:text-amber-700">
                                  {item.name}
                                </span>
                              </div>
                              <span className="font-semibold text-text-primary text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.2 rounded font-mono shrink-0">
                                {item.metricValue}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Faculty Strip ("My faculty") */}
            {pinnedIds.length > 0 && (
              <div className="bg-surface rounded-card border border-app-border p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-stone-900">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>My Pinned Faculty ({pinnedIds.length})</span>
                  </div>
                  <button
                    onClick={() => setPinnedOnly(!pinnedOnly)}
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                      pinnedOnly
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {pinnedOnly ? 'Showing Pinned Only' : 'Filter Pinned Only'}
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                  {pinnedIds.map((pid) => {
                    const fac = allFaculty.find((f) => f.id === pid);
                    if (!fac) return null;
                    return (
                      <div
                        key={pid}
                        className="flex items-center gap-2 px-2.5 py-1 rounded-xl border border-stone-200 bg-white hover:border-orange-300 transition-colors shrink-0 shadow-2xs"
                      >
                        <button
                          onClick={() => handleSelectFaculty(fac.id)}
                          className="flex items-center gap-2 text-left"
                          title={fac.name}
                        >
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0"
                            style={{
                              backgroundColor: fac.avatarColor.bg,
                              color: fac.avatarColor.text,
                            }}
                          >
                            {fac.initials}
                          </div>
                          <span className="text-xs font-semibold text-stone-800 hover:text-orange-600 truncate max-w-[130px]">
                            {fac.name}
                          </span>
                          <span className="text-[11px] text-stone-400">({fac.totalSections}s)</span>
                        </button>
                        <button
                          onClick={() => unpinFaculty(fac.id)}
                          className="p-0.5 text-stone-400 hover:text-red-500 rounded transition-colors"
                          aria-label={`Unpin ${fac.name}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Toolbar & Filters */}
            <div className="bg-surface rounded-card border border-app-border p-3.5 sm:p-4 shadow-warm space-y-3">
              {/* Row 1: Search + Sort dropdown */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search faculty name, course code/title, or initials... (press / to focus)"
                    className="w-full h-10 pl-9 pr-9 bg-bg-page border border-app-border rounded-btn text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary rounded cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-medium text-text-muted hidden sm:inline">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as FacultyFilterCriteria['sortBy'])
                    }
                    className="h-10 px-3 bg-bg-page border border-app-border rounded-btn text-xs font-semibold text-text-primary focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 cursor-pointer"
                  >
                    <option value="az">Name (A–Z)</option>
                    <option value="most-sections">Most sections</option>
                    <option value="most-courses">Most courses</option>
                    <option value="most-credits">Most credits</option>
                    <option value="most-hours">Most weekly hours</option>
                  </select>
                </div>
              </div>

              {/* Initials search hint */}
              <p className="text-[11px] text-stone-400 pl-1">
                Tip: search by initials, e.g. <span className="font-semibold text-stone-600">AIMM</span>, <span className="font-semibold text-stone-600">ASMMJ</span>, <span className="font-semibold text-stone-600">SS</span>
              </p>

              {/* Row 2: Filter Chips */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-app-border/80 text-xs">
                {/* Pinned filter toggle chip */}
                {pinnedIds.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPinnedOnly(!pinnedOnly)}
                      className={`min-h-[28px] px-2.5 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                        pinnedOnly
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'bg-bg-page text-text-secondary hover:bg-amber-50 border border-app-border'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${pinnedOnly ? 'fill-white' : 'text-amber-500 fill-amber-400'}`} />
                      <span>Pinned only ({pinnedIds.length})</span>
                    </button>
                    <span className="text-app-border hidden sm:inline">•</span>
                  </>
                )}

                {/* Program Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-text-muted font-medium">Program:</span>
                  {(['ALL', 'BSCSE', 'BSDS'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProgram(p)}
                      className={`min-h-[28px] px-2.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        program === p
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <span className="text-app-border hidden sm:inline">•</span>

                {/* Day Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-text-muted font-medium">Day:</span>
                  <button
                    type="button"
                    onClick={() => setDay('ALL')}
                    className={`min-h-[28px] px-2.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      day === 'ALL'
                        ? 'bg-orange-500 text-white shadow-2xs'
                        : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                    }`}
                  >
                    All
                  </button>
                  {DAYS_LIST.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDay(d)}
                      className={`min-h-[28px] px-2.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        day === d
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <span className="text-app-border hidden sm:inline">•</span>

                {/* Time Slot Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-text-muted font-medium">Time:</span>
                  {(['ALL', 'Morning', 'Midday', 'Afternoon'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimeSlot(t)}
                      className={`min-h-[28px] px-2.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        timeSlot === t
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                      }`}
                    >
                      {t === 'ALL' ? 'All' : t}
                    </button>
                  ))}
                </div>

                <span className="text-app-border hidden sm:inline">•</span>

                {/* Type Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-text-muted font-medium">Type:</span>
                  {(['ALL', 'theory', 'lab'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={`min-h-[28px] px-2.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        kind === k
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'bg-bg-page text-text-secondary hover:bg-orange-50 border border-app-border'
                      }`}
                    >
                      {k === 'ALL' ? 'All' : k === 'theory' ? 'Theory' : 'Lab'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Status Summary + TBA link */}
              <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-app-border/70">
                <span>
                  Showing <strong className="text-text-primary">{filteredFaculty.length}</strong> of{' '}
                  {allFaculty.length} faculty (sorted A–Z)
                </span>

                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="text-orange-600 hover:text-orange-700 font-semibold underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear filters</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsTBAOpen(!isTBAOpen)}
                    className="text-text-secondary hover:text-orange-600 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>TBA Sections ({totalTBACount})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TBA Unassigned Sections Modal / Collapsible */}
            {isTBAOpen && (
              <div className="bg-amber-50/60 rounded-card border border-amber-200 p-4 shadow-warm space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <h3 className="text-sm font-bold text-amber-950">
                      Unassigned (TBA) Course Sections ({totalTBACount})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTBAOpen(false)}
                    className="text-xs text-amber-800 hover:text-amber-950 font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {tbaGroups.map((g) => (
                    <div
                      key={g.courseCode}
                      className="bg-surface rounded-xl border border-amber-200/90 p-3 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-primary">{g.courseCode}</span>
                        <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                          {g.sections.length} sec
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted truncate">{g.courseTitle}</p>
                      <div className="divide-y divide-app-border/40 pt-1">
                        {g.sections.map((sec) => (
                          <div
                            key={sec.id}
                            className="py-1 flex items-center justify-between text-[11px]"
                          >
                            <span className="font-semibold text-text-primary">Sec {sec.section}</span>
                            <span className="text-text-secondary font-mono">
                              {sec.days.join(', ')} · {sec.timeRange}
                            </span>
                            {sec.room && <span className="text-text-muted">Rm {sec.room}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. TWO-PANE LAYOUT */}
            {filteredFaculty.length === 0 ? (
              <div className="bg-surface rounded-card border border-app-border p-8 text-center space-y-3 shadow-warm">
                <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-text-primary">No faculty found</h3>
                <p className="text-xs text-text-secondary max-w-md mx-auto">
                  No faculty match your active search and filter combination. Try adjusting your query or clear filters.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="h-9 px-4 rounded-btn bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <span>Clear all filters</span>
                </button>
              </div>
            ) : (
              <div className="hidden md:grid md:grid-cols-[300px_1fr] lg:grid-cols-[minmax(340px,380px)_1fr] gap-6 items-start">
                {/* LEFT PANE: Sticky Scrollable Alphabetical Faculty List */}
                <section
                  aria-label="Faculty List"
                  role="listbox"
                  tabIndex={0}
                  className="bg-surface border border-app-border rounded-card shadow-warm p-2.5 space-y-1.5 sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto focus:outline-hidden"
                >
                  {filteredFaculty.map((f, idx) => {
                    const isSelected = selectedFaculty?.id === f.id;
                    const isPinnedFaculty = isPinned(f.id);
                    const isChecked = compareSelection.includes(f.id);
                    const currentLetter = f.name.charAt(0).toUpperCase();
                    const prevLetter =
                      idx > 0 ? filteredFaculty[idx - 1].name.charAt(0).toUpperCase() : null;
                    const isNewLetter = sortBy === 'az' && currentLetter !== prevLetter;

                    return (
                      <React.Fragment key={f.id}>
                        {isNewLetter && (
                          <div className="sticky top-0 z-10 px-2.5 py-1 my-1 bg-surface/95 backdrop-blur-xs border-y border-orange-200/80 bg-orange-50/70 rounded flex items-center justify-between text-xs font-bold text-orange-900 shadow-2xs">
                            <span className="font-mono text-xs">{currentLetter}</span>
                            <span className="text-[11px] font-semibold text-text-muted">
                              {
                                filteredFaculty.filter(
                                  (fac) => fac.name.charAt(0).toUpperCase() === currentLetter
                                ).length
                              }{' '}
                              faculty
                            </span>
                          </div>
                        )}
                        <div
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectFaculty(f.id)}
                          className={`w-full text-left p-3 rounded-card transition-all flex flex-col gap-1.5 border cursor-pointer ${
                            isSelected
                              ? 'bg-orange-50/80 border-orange-300 border-l-[3px] border-l-orange-500 shadow-2xs ring-1 ring-orange-400/20'
                              : 'bg-page border-app-border hover:border-orange-200 hover:bg-subtle'
                          }`}
                        >
                          {/* Top row: Checkbox + Avatar + Name + Pin button */}
                          <div className="flex items-center gap-2">
                            {/* Compare Checkbox */}
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleCompare(f.id);
                              }}
                              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-stone-300 cursor-pointer shrink-0"
                              aria-label={`Select ${f.name} for compare`}
                              title="Select for compare"
                            />

                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs"
                              style={{
                                backgroundColor: f.avatarColor.bg,
                                color: f.avatarColor.text,
                                borderColor: f.avatarColor.border,
                              }}
                            >
                              {f.initials}
                            </div>

                            <div className="min-w-0 flex-1">
                              <span
                                className={`font-bold text-xs block truncate ${
                                  isSelected ? 'text-orange-950 font-extrabold' : 'text-text-primary'
                                }`}
                                title={f.name}
                              >
                                <HighlightText text={f.name} query={search} />
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {f.programs.map((p) => (
                                  <span
                                    key={p}
                                    className="text-[11px] font-semibold text-text-muted bg-subtle px-1.5 py-0.2 rounded border border-app-border"
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Pin Star Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin(f.id);
                              }}
                              className={`p-1 rounded-md transition-colors shrink-0 ${
                                isPinnedFaculty
                                  ? 'text-amber-500 fill-amber-400'
                                  : 'text-stone-300 hover:text-stone-500'
                              }`}
                              aria-label={isPinnedFaculty ? `Unpin ${f.name}` : `Pin ${f.name}`}
                              title={isPinnedFaculty ? 'Pinned faculty' : 'Pin faculty'}
                            >
                              <Star className={`w-3.5 h-3.5 ${isPinnedFaculty ? 'fill-current' : ''}`} />
                            </button>
                          </div>

                          {/* Middle stats */}
                          <div className="flex items-center justify-between gap-1 text-[11px] text-text-secondary pt-0.5 pl-6">
                            <span>
                              <strong className="text-text-primary">{f.totalSections}</strong> sec ·{' '}
                              <strong className="text-text-primary">{f.distinctCourseCount}</strong> crs ·{' '}
                              <strong className="text-text-primary">{f.totalWeeklyHours}h</strong>
                            </span>

                            <div className="flex items-center gap-0.5 shrink-0">
                              {DAYS_LIST.map((d) => {
                                const isActive = f.activeDays.includes(d);
                                return (
                                  <span
                                    key={d}
                                    className={`w-3.5 h-3.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                                      isActive
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-app-border/70 text-text-muted/60'
                                    }`}
                                  >
                                    {d[0]}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* Badges preview row (max 3 badges, priority sorted) */}
                          {f.badges.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5 pl-6">
                              {f.badges.slice(0, 3).map((b) => (
                                <Link
                                  key={b.id}
                                  href={`/faculty-directory?tab=badges&badge=${b.id}`}
                                  title={`${b.name}: ${b.description}`}
                                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.2 rounded border hover:scale-105 transition-transform ${b.badgeStyle}`}
                                >
                                  <BadgeIcon name={b.iconName} className="w-3 h-3" />
                                  <span>{b.name}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </section>

                {/* RIGHT PANE: Selected Faculty Full Details */}
                <div className="space-y-4">
                  {selectedFaculty ? (
                    <div className="space-y-4">
                      {/* Faculty Header Card */}
                      <div className="bg-surface rounded-card border border-app-border p-5 shadow-warm space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0 border-2 shadow-2xs"
                              style={{
                                backgroundColor: selectedFaculty.avatarColor.bg,
                                color: selectedFaculty.avatarColor.text,
                                borderColor: selectedFaculty.avatarColor.border,
                              }}
                            >
                              {selectedFaculty.initials}
                            </div>
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {selectedFaculty.programs.map((p) => (
                                  <span
                                    key={p}
                                    className="px-2 py-0.5 rounded text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200"
                                  >
                                    {p}
                                  </span>
                                ))}
                                <span className="text-xs text-text-muted">
                                  Dept. of CSE & Data Science
                                </span>
                              </div>
                              <h2 className="text-lg font-bold text-text-primary truncate" title={selectedFaculty.name}>
                                {selectedFaculty.name}
                              </h2>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => togglePin(selectedFaculty.id)}
                              className={`p-2 rounded-xl border transition-colors ${
                                isPinned(selectedFaculty.id)
                                  ? 'bg-amber-50 text-amber-500 border-amber-200'
                                  : 'bg-white text-stone-400 border-stone-200 hover:text-stone-700'
                              }`}
                              aria-label={isPinned(selectedFaculty.id) ? `Unpin ${selectedFaculty.name}` : `Pin ${selectedFaculty.name}`}
                              title={isPinned(selectedFaculty.id) ? 'Pinned faculty' : 'Pin faculty'}
                            >
                              <Star className={`w-4 h-4 ${isPinned(selectedFaculty.id) ? 'fill-current' : ''}`} />
                            </button>

                            <button
                              type="button"
                              onClick={handleCopyLink}
                              className="h-8 px-2.5 rounded-btn bg-surface hover:bg-orange-50 border border-app-border hover:border-orange-200 text-text-secondary hover:text-orange-600 font-medium text-xs inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                              title="Copy link to this faculty"
                            >
                              {copiedLink ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700 font-semibold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Share</span>
                                </>
                              )}
                            </button>

                            <Link
                              href={`/faculty-directory/${selectedFaculty.id}`}
                              className="h-8 px-3 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs inline-flex items-center gap-1 transition-colors shadow-2xs"
                              title="Open dedicated standalone schedule page"
                            >
                              <span>Full Page</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>

                        {/* Badges strip */}
                        {selectedFaculty.badges.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-app-border/60">
                            {selectedFaculty.badges.map((b) => (
                              <Link
                                key={b.id}
                                href={`/faculty-directory?tab=badges&badge=${b.id}`}
                                title={`${b.name}: ${b.description}`}
                                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs hover:scale-105 transition-transform ${b.badgeStyle}`}
                              >
                                <BadgeIcon name={b.iconName} className="w-3.5 h-3.5" />
                                <span>{b.name}</span>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* 4 Quick Stat Tiles */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-app-border/80 text-center">
                          <div className="bg-bg-page rounded-xl p-2.5 border border-app-border/70">
                            <span className="block text-base font-bold text-text-primary">
                              {selectedFaculty.distinctCourseCount}
                            </span>
                            <span className="text-[11px] text-text-muted">
                              Courses ({selectedFaculty.theoryCourseCount} Th, {selectedFaculty.labCourseCount} Lab)
                            </span>
                          </div>

                          <div className="bg-bg-page rounded-xl p-2.5 border border-app-border/70">
                            <span className="block text-base font-bold text-text-primary">
                              {selectedFaculty.totalSections}
                            </span>
                            <span className="text-[11px] text-text-muted">Total Sections</span>
                          </div>

                          <div className="bg-bg-page rounded-xl p-2.5 border border-app-border/70">
                            <span className="block text-base font-bold text-text-primary">
                              {selectedFaculty.totalCredits}
                            </span>
                            <span className="text-[11px] text-text-muted">Course Credits</span>
                          </div>

                          <div className="bg-bg-page rounded-xl p-2.5 border border-app-border/70">
                            <span className="block text-base font-bold text-text-primary">
                              {selectedFaculty.totalWeeklyHours}h
                            </span>
                            <span className="text-[11px] text-text-muted">Weekly Contact Hours</span>
                          </div>
                        </div>

                        {/* Info details row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-app-border/60">
                          <div>
                            <span className="text-text-muted block font-medium">Busiest Day:</span>
                            <span className="font-bold text-text-primary mt-0.5 block">
                              {selectedFaculty.busiestDay || 'None'}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block font-medium">Campus Days:</span>
                            <span className="font-bold text-text-primary mt-0.5 block">
                              {selectedFaculty.daysOnCampus} days ({selectedFaculty.activeDays.join(', ')})
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block font-medium">Earliest & Latest:</span>
                            <span className="font-bold text-text-primary mt-0.5 block">
                              {selectedFaculty.earliestStartTimeStr} – {selectedFaculty.latestEndTimeStr}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block font-medium">Campus Footprint:</span>
                            <span className="font-bold text-text-primary mt-0.5 block">
                              {selectedFaculty.distinctFloors} floors ({selectedFaculty.rooms.length} rooms)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Weekly Teaching Timetable */}
                      <div className="bg-surface rounded-card border border-app-border p-4 shadow-warm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-orange-500" />
                            <h3 className="text-sm font-bold text-text-primary">
                              Weekly Teaching Timetable
                            </h3>
                          </div>
                          <span className="text-xs text-text-muted">Sat – Wed · 08:30 AM – 04:30 PM</span>
                        </div>

                        <div className="overflow-x-auto pb-1">
                          <div className="min-w-[560px]">
                            {/* Grid Header: Days */}
                            <div className="grid grid-cols-[50px_repeat(5,1fr)] gap-2 mb-2 text-center text-xs font-bold text-text-secondary">
                              <div className="text-text-muted font-normal text-[11px] self-end pb-1">Time</div>
                              {DAYS_LIST.map((d) => {
                                const isActive = selectedFaculty.activeDays.includes(d);
                                const count = selectedFaculty.weeklyPattern[d].count;
                                return (
                                  <div
                                    key={d}
                                    className={`py-1 rounded border text-xs font-semibold ${
                                      isActive
                                        ? 'bg-orange-50 border-orange-200 text-orange-900 font-bold'
                                        : 'bg-bg-page border-app-border/80 text-text-muted'
                                    }`}
                                  >
                                    <span>{d}</span>
                                    {count > 0 && (
                                      <span className="ml-1 text-[11px] text-orange-600 font-normal">
                                        ({count})
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Grid Body */}
                            <div className="relative h-[360px] grid grid-cols-[50px_repeat(5,1fr)] gap-2 bg-bg-page rounded-xl border border-app-border p-2">
                              {/* Time Scale Column */}
                              <div className="relative h-full text-[11px] text-text-muted font-mono select-none">
                                {TIMETABLE_SLOTS.map((slot) => {
                                  const topPct = ((slot.min - 510) / 480) * 100;
                                  return (
                                    <div
                                      key={slot.min}
                                      style={{ top: `${topPct}%` }}
                                      className="absolute right-1 -translate-y-1/2"
                                    >
                                      {slot.label}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Day Columns */}
                              {DAYS_LIST.map((d) => {
                                const dayPattern = selectedFaculty.weeklyPattern[d];
                                return (
                                  <div
                                    key={d}
                                    className="relative h-full rounded-lg bg-surface/90 border border-app-border/60 overflow-hidden"
                                  >
                                    {TIMETABLE_SLOTS.map((slot) => {
                                      const topPct = ((slot.min - 510) / 480) * 100;
                                      return (
                                        <div
                                          key={slot.min}
                                          style={{ top: `${topPct}%` }}
                                          className="absolute left-0 right-0 border-t border-app-border/40 pointer-events-none"
                                        />
                                      );
                                    })}

                                    {dayPattern.meetings.map((m, idx) => {
                                      const topPct = ((m.start - 510) / 480) * 100;
                                      const heightPct = Math.max(((m.end - m.start) / 480) * 100, 8);
                                      const color = getCourseColor(m.courseCode);

                                      return (
                                        <div
                                          key={`${m.courseCode}-${m.section}-${m.start}-${idx}`}
                                          style={{
                                            top: `${topPct}%`,
                                            height: `${heightPct}%`,
                                          }}
                                          className={`absolute left-1 right-1 p-1 rounded-btn border-l-4 border shadow-xs overflow-hidden flex flex-col justify-between ${
                                            color.bg
                                          } ${color.border} ${m.tentative ? 'border-dashed' : ''}`}
                                          title={`${m.courseCode} Sec ${m.section} (${formatMinutesToTime(
                                            m.start
                                          )} - ${formatMinutesToTime(m.end)})${m.room ? ` Room ${m.room}` : ''}`}
                                        >
                                          <div className="flex items-center justify-between gap-1 leading-tight">
                                            <span className={`font-bold text-xs truncate ${color.text}`}>
                                              {m.courseCode}
                                            </span>
                                            <span className="text-[11px] font-bold px-1 rounded bg-surface/90 text-text-primary">
                                              {m.section}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-[11px] text-text-muted mt-0.5">
                                            <span>{formatMinutesToTime(m.start).replace(':00', '')}</span>
                                            {m.room && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedRoom(m.room);
                                                }}
                                                className="hover:underline hover:text-orange-600 font-medium cursor-pointer"
                                                title={`Click to view schedule for Room ${m.room}`}
                                              >
                                                Rm {m.room}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Courses & Assigned Sections */}
                      <div className="bg-surface rounded-card border border-app-border p-4 shadow-warm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-orange-500" />
                            <h3 className="text-sm font-bold text-text-primary">
                              Courses & Assigned Sections
                            </h3>
                          </div>
                          <span className="text-xs text-text-muted">
                            {selectedFaculty.courses.length} courses
                          </span>
                        </div>

                        <div className="space-y-3">
                          {selectedFaculty.courses.map((course) => (
                            <div
                              key={course.courseCode}
                              className="rounded-xl border border-app-border bg-bg-page overflow-hidden"
                            >
                              <div className="px-3.5 py-2.5 bg-surface border-b border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Link
                                    href={`/courses?q=${encodeURIComponent(course.courseCode)}`}
                                    className="font-bold text-xs sm:text-sm text-text-primary hover:text-orange-600 transition-colors inline-flex items-center gap-1"
                                    title="View this course in Course Directory"
                                  >
                                    <span>{course.courseCode}</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-orange-500" />
                                  </Link>
                                  <span className="text-text-muted">·</span>
                                  <span className="text-xs text-text-secondary truncate">
                                    {course.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 text-xs">
                                  <span className="px-2 py-0.5 rounded bg-bg-page border border-app-border text-text-muted font-medium">
                                    {course.credit} Credits
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-900 font-semibold">
                                    {course.sectionCount} {course.sectionCount === 1 ? 'section' : 'sections'}
                                  </span>
                                </div>
                              </div>

                              <div className="divide-y divide-app-border/60">
                                {course.sections.map((sec) => (
                                  <div
                                    key={sec.id}
                                    className="px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-orange-50/20 transition-colors"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className="w-6 h-6 rounded bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                                        {sec.section}
                                      </span>
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-text-primary">
                                            Section {sec.section}
                                          </span>
                                          <span className="text-[11px] font-semibold text-text-muted uppercase px-1.5 py-0.2 rounded bg-surface border border-app-border">
                                            {sec.kind}
                                          </span>
                                          {sec.tentative && (
                                            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                                              Tentative
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-text-muted text-[11px]">
                                          <span>Days: {sec.days.join(', ')}</span>
                                          {sec.room && (
                                            <>
                                              <span>·</span>
                                              <button
                                                type="button"
                                                onClick={() => setSelectedRoom(sec.room)}
                                                className="text-orange-600 hover:underline font-medium cursor-pointer"
                                                title={`Click to view schedule for Room ${sec.room}`}
                                              >
                                                Room {sec.room}
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="px-2 py-0.5 rounded-btn bg-surface border border-app-border text-text-secondary font-mono text-xs">
                                        {sec.timeRange}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Teaches With Strip */}
                      {selectedFaculty.teachesWith.length > 0 && (
                        <div className="bg-surface rounded-card border border-app-border p-4 shadow-warm space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-orange-500" />
                              <h3 className="text-sm font-bold text-text-primary">
                                Teaches With (Co-Instructors)
                              </h3>
                            </div>
                            <span className="text-xs text-text-muted">
                              Instructors sharing the same courses
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {selectedFaculty.teachesWith.map((co) => (
                              <button
                                key={co.facultyId}
                                type="button"
                                onClick={() => handleSelectFaculty(co.facultyId)}
                                className="bg-bg-page hover:bg-orange-50/50 rounded-xl border border-app-border hover:border-orange-300 p-2.5 transition-colors flex items-center justify-between gap-2 group text-left cursor-pointer"
                                title={co.facultyName}
                              >
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-text-primary group-hover:text-orange-600 truncate block transition-colors">
                                    {co.facultyName}
                                  </span>
                                  <span className="text-[11px] text-text-muted block truncate mt-0.5">
                                    Shares: {co.sharedCourses.join(', ')}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Mobile List Accordion (< 768px) */}
            <div className="md:hidden space-y-2.5">
              {filteredFaculty.map((f) => {
                const isExpanded = expandedMobileFacultyId === f.id;
                const isPinnedFaculty = isPinned(f.id);
                const isChecked = compareSelection.includes(f.id);

                return (
                  <div
                    key={f.id}
                    className="bg-surface border border-app-border rounded-card overflow-hidden shadow-warm"
                  >
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCompare(f.id)}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-stone-300 cursor-pointer shrink-0"
                          aria-label={`Select ${f.name} for compare`}
                        />

                        <button
                          type="button"
                          onClick={() => setExpandedMobileFacultyId(isExpanded ? null : f.id)}
                          className="flex items-center gap-2.5 min-w-0 text-left flex-1"
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs"
                            style={{
                              backgroundColor: f.avatarColor.bg,
                              color: f.avatarColor.text,
                              borderColor: f.avatarColor.border,
                            }}
                          >
                            {f.initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-text-primary block truncate" title={f.name}>
                              {f.name}
                            </span>
                            <span className="text-[11px] text-text-muted block truncate">
                              {f.totalSections} sections · {f.distinctCourseCount} courses · {f.totalWeeklyHours}h
                            </span>
                          </div>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePin(f.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isPinnedFaculty
                              ? 'bg-amber-50 text-amber-500 border-amber-200'
                              : 'bg-stone-50 text-stone-400 border-stone-200'
                          }`}
                          aria-label={isPinnedFaculty ? `Unpin ${f.name}` : `Pin ${f.name}`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isPinnedFaculty ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedMobileFacultyId(isExpanded ? null : f.id)}
                          className="p-1.5 text-stone-400 hover:text-stone-700"
                          aria-label={isExpanded ? 'Collapse schedule' : 'Expand schedule'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-orange-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-text-muted" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3.5 border-t border-app-border/80 bg-bg-page space-y-3.5">
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/faculty-directory/${f.id}`}
                            className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
                          >
                            <span>Open Dedicated Page</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {f.badges.map((b) => (
                            <Link
                              key={b.id}
                              href={`/faculty-directory?tab=badges&badge=${b.id}`}
                              title={`${b.name}: ${b.description}`}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border hover:scale-105 transition-transform ${b.badgeStyle}`}
                            >
                              <BadgeIcon name={b.iconName} className="w-3 h-3" />
                              <span>{b.name}</span>
                            </Link>
                          ))}
                        </div>

                        {/* Daily schedule */}
                        <div className="space-y-1.5 text-xs">
                          {DAYS_LIST.map((d) => {
                            const meetings = f.weeklyPattern[d].meetings;
                            if (meetings.length === 0) return null;
                            return (
                              <div key={d} className="space-y-0.5">
                                <span className="font-bold text-orange-700">{d}:</span>
                                <div className="space-y-1 pl-2">
                                  {meetings.map((m, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between bg-surface px-2 py-1 rounded border border-app-border text-[11px]"
                                    >
                                      <span className="font-bold text-text-primary">
                                        {m.courseCode} Sec {m.section}
                                      </span>
                                      <span className="text-text-muted font-mono">
                                        {formatMinutesToTime(m.start)}–{formatMinutesToTime(m.end)}
                                        {m.room ? (
                                          <button
                                            type="button"
                                            onClick={() => setSelectedRoom(m.room)}
                                            className="text-orange-600 hover:underline ml-1"
                                          >
                                            · Rm {m.room}
                                          </button>
                                        ) : (
                                          ''
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Sticky Comparison Bottom Bar */}
        {compareSelection.length > 0 && (
          <aside
            aria-label="Faculty comparison selection bar"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-stone-800 flex items-center justify-between gap-4 max-w-xl w-[92%] animate-in slide-in-from-bottom duration-200"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold flex items-center gap-2">
                <span>Compare ({compareSelection.length}/2):</span>
                <span className="text-orange-400 truncate">
                  {compareSelection
                    .map((id) => allFaculty.find((f) => f.id === id)?.name || id)
                    .join(' vs ')}
                </span>
              </p>
              {compareSelection.length === 1 && (
                <p className="text-[11px] text-stone-400">Select 1 more faculty member to compare.</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleClearCompare}
                className="px-3 py-1.5 text-xs text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
              >
                Clear
              </button>

              {compareSelection.length === 2 ? (
                <Link
                  href={`/faculty-directory/compare?a=${compareSelection[0]}&b=${compareSelection[1]}`}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Compare
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-4 py-1.5 bg-stone-700 text-stone-400 text-xs font-bold rounded-lg cursor-not-allowed"
                >
                  Compare
                </button>
              )}
            </div>
          </aside>
        )}

        {/* Badges Legend Modal */}
        <BadgesLegendModal
          isOpen={isBadgesModalOpen}
          onClose={() => setIsBadgesModalOpen(false)}
        />

        {/* Room Schedule Side Sheet */}
        <RoomScheduleSheet
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
        />

        {/* Footer Note */}
        <p className="text-[11px] text-text-muted text-center pt-2">
          Based on the Fall 2026 offering PDF, updated {DATA_UPDATED}. Assignments may change.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}

export default function FacultyDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-page flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-text-muted">Loading Faculty Directory...</p>
          </div>
        </div>
      }
    >
      <FacultyDirectoryContent />
    </Suspense>
  );
}
