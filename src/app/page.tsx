'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import sectionsJson from '../../data/sections.json';
import coursesJson from '../../data/courses.json';
import facultyJson from '../../data/faculty.json';
import {
  Course,
  Faculty,
  ScheduleResult,
  Section,
  SolveRequest,
} from '../types';
import { useSolver } from '../hooks/useSolver';
import { Header } from '../components/Header';
import { CourseSelector } from '../components/CourseSelector';
import { Timetable } from '../components/Timetable';
import { ScheduleComparison } from '../components/ScheduleComparison';
import { EmptyState } from '../components/EmptyState';
import { HelpGuideModal, ShortcutsModal, FavoritesModal } from '../components/Modals';
import { CoursePreset } from '../utils/presets';
import { parseFromParams, serializeToParams } from '../utils/urlSync';
import confetti from 'canvas-confetti';
import { Loader2, Sparkles } from 'lucide-react';

const allSections = sectionsJson as unknown as Section[];
const allCourses = coursesJson as unknown as Course[];
const allFaculty = facultyJson as unknown as Faculty[];

interface SavedFavorite {
  id: string;
  name: string;
  schedule: ScheduleResult;
}

export default function Home() {
  // Solver request state
  const [request, setRequest] = useState<SolveRequest>({
    selectedCourses: [],
    preferredFaculty: {},
    avoidFaculty: {},
    lockedSections: {},
    filterDayOff: [],
    weights: {
      facultyPreference: 30,
      minimizeGaps: 25,
      compactDays: 20,
      avoidEarlyLate: 15,
      avoidTentative: 10,
    },
    limit: 50,
  });

  // Modals state
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [favorites, setFavorites] = useState<SavedFavorite[]>([]);

  // Hook for solving
  const {
    solve,
    cancel,
    isSolving,
    progress,
    results,
    error,
    currentRank,
    setRank,
    currentSchedule,
  } = useSolver();

  // Load URL params & local storage on initial mount
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasInitialized.current) {
      hasInitialized.current = true;

      // 1. Read URL query
      if (window.location.search) {
        const fromUrl = parseFromParams(window.location.search);
        setRequest((prev) => ({
          ...prev,
          ...fromUrl,
          weights: prev.weights,
        }));
      }

      // 2. Read favorites
      try {
        const saved = localStorage.getItem('uiu_routine_favorites');
        if (saved) {
          setFavorites(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Failed to read favorites:', e);
      }
    }
  }, []);

  // Update URL search query whenever request changes
  useEffect(() => {
    if (typeof window !== 'undefined' && hasInitialized.current) {
      const qs = serializeToParams(request);
      const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
  }, [request]);

  // Trigger solver when request changes
  useEffect(() => {
    solve(request, allSections);
  }, [request, solve]);

  // Confetti celebration if rank 1 reaches 100/100
  const celebratedScore = useRef<number | null>(null);
  useEffect(() => {
    if (
      results &&
      results.schedules.length > 0 &&
      results.schedules[0].score === 100 &&
      celebratedScore.current !== 100
    ) {
      celebratedScore.current = 100;
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F26522', '#10B981', '#6366F1', '#F59E0B'],
        });
      } catch {
        // Confetti optional
      }
    }
  }, [results]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setRank(Math.max(0, currentRank - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (results && results.schedules.length > 0) {
          setRank(Math.min(results.schedules.length - 1, currentRank + 1));
        }
      } else if (e.key.toLowerCase() === 'f' && currentSchedule) {
        e.preventDefault();
        toggleFavorite(currentSchedule);
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.print();
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      } else if (e.key === 'Escape') {
        setIsHelpOpen(false);
        setIsShortcutsOpen(false);
        setIsFavoritesOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRank, results, currentSchedule, setRank]);

  // Apply preset
  const handleApplyPreset = (preset: CoursePreset) => {
    setRequest((prev) => ({
      ...prev,
      selectedCourses: [...preset.courses],
      preferredFaculty: {},
      avoidFaculty: {},
      lockedSections: {},
      filterDayOff: [],
    }));
  };

  // Reset filters
  const handleResetFilters = () => {
    setRequest((prev) => ({
      ...prev,
      filterDayOff: [],
      filterTimeWindow: undefined,
      maxGapMinutesPerDay: undefined,
      lockedSections: {},
    }));
  };

  // Lock all sections of a schedule
  const handleLockAllSections = (schedule: ScheduleResult) => {
    const newLocks: Record<string, string> = {};
    for (const sec of schedule.sections) {
      newLocks[sec.courseCode] = sec.id;
    }
    setRequest((prev) => ({
      ...prev,
      lockedSections: newLocks,
    }));
  };

  // Toggle favorite
  const isCurrentFavorite = Boolean(
    currentSchedule &&
      favorites.some(
        (f) =>
          f.schedule.sections.map((s) => s.id).sort().join(',') ===
          currentSchedule.sections.map((s) => s.id).sort().join(',')
      )
  );

  const toggleFavorite = (schedule: ScheduleResult) => {
    const key = schedule.sections.map((s) => s.id).sort().join(',');
    const existingIndex = favorites.findIndex(
      (f) => f.schedule.sections.map((s) => s.id).sort().join(',') === key
    );

    let updated: SavedFavorite[];
    if (existingIndex >= 0) {
      updated = favorites.filter((_, i) => i !== existingIndex);
    } else {
      const newFav: SavedFavorite = {
        id: `fav-${Date.now()}`,
        name: `Routine #${favorites.length + 1} (${schedule.stats.credits} cr)`,
        schedule,
      };
      updated = [newFav, ...favorites];
    }

    setFavorites(updated);
    try {
      localStorage.setItem('uiu_routine_favorites', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save favorite:', e);
    }
  };

  const handleRemoveFavorite = (id: string) => {
    const updated = favorites.filter((f) => f.id !== id);
    setFavorites(updated);
    try {
      localStorage.setItem('uiu_routine_favorites', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to remove favorite:', e);
    }
  };

  const handleSelectFavorite = (schedule: ScheduleResult) => {
    // Re-populate request courses and lock those sections
    const courses = schedule.sections.map((s) => s.courseCode);
    const locks: Record<string, string> = {};
    for (const s of schedule.sections) {
      locks[s.courseCode] = s.id;
    }

    setRequest((prev) => ({
      ...prev,
      selectedCourses: courses,
      lockedSections: locks,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100">
      {/* 1. Header */}
      <Header
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        totalSaved={favorites.length}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
      />

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar: Course & Faculty Selector */}
        <CourseSelector
          courses={allCourses}
          sections={allSections}
          faculty={allFaculty}
          request={request}
          onRequestChange={setRequest}
          onApplyPreset={handleApplyPreset}
        />

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 space-y-6">
          {/* Welcome Empty State */}
          {request.selectedCourses.length === 0 ? (
            <EmptyState
              type="welcome"
              request={request}
              onApplyPreset={handleApplyPreset}
              onResetFilters={handleResetFilters}
            />
          ) : isSolving ? (
            /* Live Progress / Solving State */
            <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-white">
                Exploring Conflict-Free Combinations...
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Bitmask solver analyzing sections on a background worker thread.
              </p>
              {progress.checkedCount > 0 && (
                <div className="mt-4 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-orange-400">
                  {progress.checkedCount.toLocaleString()} nodes checked •{' '}
                  {progress.validCount.toLocaleString()} valid combinations
                </div>
              )}
            </div>
          ) : !results || results.schedules.length === 0 ? (
            /* Conflict / 0 Combinations Found */
            <EmptyState
              type="conflict"
              request={request}
              errorMessage={error}
              onApplyPreset={handleApplyPreset}
              onResetFilters={handleResetFilters}
            />
          ) : (
            /* Timetable View & Multi-Schedule Comparison */
            <>
              {currentSchedule && (
                <Timetable
                  schedule={currentSchedule}
                  currentRank={currentRank}
                  totalSchedules={results.schedules.length}
                  onSetRank={setRank}
                  onLockAllSections={handleLockAllSections}
                  isFavorite={isCurrentFavorite}
                  onToggleFavorite={toggleFavorite}
                  isTruncated={results.truncated}
                />
              )}

              {/* Multi-Schedule Comparison & Diff */}
              <ScheduleComparison
                schedules={results.schedules}
                activeRank={currentRank}
                onSelectRank={setRank}
              />
            </>
          )}
        </div>
      </main>

      {/* 3. Modals */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <HelpGuideModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favorites}
        onSelectFavorite={handleSelectFavorite}
        onRemoveFavorite={handleRemoveFavorite}
      />
    </div>
  );
}
