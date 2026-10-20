'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import sectionsJson from '../../../data/sections.json';
import coursesJson from '../../../data/courses.json';
import facultyJson from '../../../data/faculty.json';
import {
  Course,
  Faculty,
  ScheduleResult,
  Section,
  SolveRequest,
} from '../../types';
import { useSolver } from '../../hooks/useSolver';
import { Header } from '../../components/Header';
import { CourseSelector } from '../../components/CourseSelector';
import { Timetable } from '../../components/Timetable';
import { ScheduleComparison } from '../../components/ScheduleComparison';
import { EmptyState } from '../../components/EmptyState';
import { FacultyExplorer } from '../../components/FacultyExplorer';
import { HelpGuideModal, ShortcutsModal, FavoritesModal } from '../../components/Modals';
import { parseFromParams, serializeToParams } from '../../utils/urlSync';
import confetti from 'canvas-confetti';
import { Loader2 } from 'lucide-react';

const allSections = sectionsJson as unknown as Section[];
const allCourses = coursesJson as unknown as Course[];
const allFaculty = facultyJson as unknown as Faculty[];

interface SavedFavorite {
  id: string;
  name: string;
  schedule: ScheduleResult;
}

export default function BuilderPage() {
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

  // Faculty Explorer state
  const [explorerCourseCode, setExplorerCourseCode] = useState<string | null>(null);
  const [previewSection, setPreviewSection] = useState<Section | null>(null);

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
        const urlParams = new URLSearchParams(window.location.search);
        const openCourse = urlParams.get('course');
        if (openCourse) {
          setExplorerCourseCode(openCourse);
        }

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

  // Sync state to URL query string whenever request or explorer changes
  useEffect(() => {
    if (!hasInitialized.current) return;
    if (typeof window === 'undefined') return;

    const baseParams = serializeToParams(request);
    const params = new URLSearchParams(baseParams);

    if (explorerCourseCode) {
      params.set('course', explorerCourseCode);
    }

    const queryString = params.toString();
    const newRelativePath = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.replaceState(null, '', newRelativePath);
  }, [request, explorerCourseCode]);

  // Trigger solve on debounced request changes
  useEffect(() => {
    if (request.selectedCourses.length === 0) {
      cancel();
      return;
    }

    const timer = setTimeout(() => {
      solve(request, allSections);
    }, 120);

    return () => clearTimeout(timer);
  }, [request, solve, cancel]);

  // Helper to uniquely identify a schedule by its section IDs
  const getScheduleId = (schedule: ScheduleResult) =>
    schedule.sections.map((s) => s.id).sort().join('_');

  // Confetti on 100/100 score
  const hasCelebrated = useRef<string | null>(null);
  useEffect(() => {
    if (currentSchedule && currentSchedule.score === 100) {
      const schedId = getScheduleId(currentSchedule);
      if (hasCelebrated.current !== schedId) {
        hasCelebrated.current = schedId;
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F26B21', '#FF8A4C', '#F59E0B', '#FFFFFF'],
        });
      }
    }
  }, [currentSchedule]);

  // Course addition / removal helpers (synced with explorer)
  const handleAddCourse = useCallback((courseCode: string) => {
    setRequest((prev) => {
      if ((prev.selectedCourses || []).includes(courseCode)) return prev;
      return {
        ...prev,
        selectedCourses: [...(prev.selectedCourses || []), courseCode],
      };
    });
  }, []);

  const handleRemoveCourse = useCallback((courseCode: string) => {
    setRequest((prev) => {
      const newCourses = (prev.selectedCourses || []).filter((c) => c !== courseCode);
      const newPref = { ...prev.preferredFaculty };
      delete newPref[courseCode];
      const newAvoid = { ...prev.avoidFaculty };
      delete newAvoid[courseCode];
      const newLock = { ...prev.lockedSections };
      delete newLock[courseCode];

      return {
        ...prev,
        selectedCourses: newCourses,
        preferredFaculty: newPref,
        avoidFaculty: newAvoid,
        lockedSections: newLock,
      };
    });
  }, []);

  // Faculty preference toggles (synced with explorer and sidebar)
  const toggleFacultyPref = useCallback((courseCode: string, facultyId: string) => {
    setRequest((prev) => {
      const current = prev.preferredFaculty?.[courseCode] || [];
      const isSelected = current.includes(facultyId);
      const updated = isSelected
        ? current.filter((id) => id !== facultyId)
        : [...current, facultyId];

      const avoidCurrent = prev.avoidFaculty?.[courseCode] || [];
      const updatedAvoid = avoidCurrent.filter((id) => id !== facultyId);

      return {
        ...prev,
        preferredFaculty: {
          ...prev.preferredFaculty,
          [courseCode]: updated,
        },
        avoidFaculty: {
          ...prev.avoidFaculty,
          [courseCode]: updatedAvoid,
        },
      };
    });
  }, []);

  const toggleFacultyAvoid = useCallback((courseCode: string, facultyId: string) => {
    setRequest((prev) => {
      const current = prev.avoidFaculty?.[courseCode] || [];
      const isSelected = current.includes(facultyId);
      const updatedAvoid = isSelected
        ? current.filter((id) => id !== facultyId)
        : [...current, facultyId];

      const prefCurrent = prev.preferredFaculty?.[courseCode] || [];
      const updatedPref = prefCurrent.filter((id) => id !== facultyId);

      return {
        ...prev,
        preferredFaculty: {
          ...prev.preferredFaculty,
          [courseCode]: updatedPref,
        },
        avoidFaculty: {
          ...prev.avoidFaculty,
          [courseCode]: updatedAvoid,
        },
      };
    });
  }, []);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is inside an input/select/textarea
      if (
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(
          (e.target as HTMLElement)?.tagName || ''
        )
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
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[type="text"]'
        ) as HTMLInputElement | null;
        searchInput?.focus();
      } else if (e.key === 'Enter') {
        // Open explorer for first selected course if none open
        if (!explorerCourseCode && request.selectedCourses.length > 0) {
          e.preventDefault();
          setExplorerCourseCode(request.selectedCourses[0]);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (currentSchedule) {
          toggleFavorite(currentSchedule);
        }
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        window.print();
      } else if (e.key === 'Escape') {
        setExplorerCourseCode(null);
        setIsHelpOpen(false);
        setIsShortcutsOpen(false);
        setIsFavoritesOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRank, results, currentSchedule, setRank, explorerCourseCode, request.selectedCourses]);

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

  const isCurrentFavorite = Boolean(
    currentSchedule && favorites.some((f) => f.id === getScheduleId(currentSchedule))
  );

  const toggleFavorite = (schedule: ScheduleResult) => {
    const schedId = getScheduleId(schedule);
    const existingIdx = favorites.findIndex((f) => f.id === schedId);
    let updated: SavedFavorite[];

    if (existingIdx >= 0) {
      updated = favorites.filter((f) => f.id !== schedId);
    } else {
      const favName = `Variation #${favorites.length + 1} (${schedule.sections
        .map((s) => s.courseCode)
        .slice(0, 3)
        .join(', ')}...)`;
      const newFav: SavedFavorite = {
        id: schedId,
        name: favName,
        schedule,
      };
      updated = [...favorites, newFav];
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
    <div className="min-h-screen flex flex-col bg-page text-text-primary">
      {/* 1. Header */}
      <Header
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        totalSaved={favorites.length}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
      />

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar: Course & Faculty Selector */}
        <CourseSelector
          courses={allCourses}
          sections={allSections}
          faculty={allFaculty}
          request={request}
          onRequestChange={setRequest}
          onOpenExplorer={(code) => setExplorerCourseCode(code)}
        />

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 space-y-6">
          {/* Welcome Empty State */}
          {request.selectedCourses.length === 0 ? (
            <EmptyState
              type="welcome"
              request={request}
              onResetFilters={handleResetFilters}
            />
          ) : isSolving ? (
            /* Live Progress / Solving State */
            <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center bg-surface rounded-card border border-app-border shadow-warm">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-text-primary">
                Exploring Conflict-Free Combinations...
              </h3>
              <p className="text-xs text-text-muted mt-1 max-w-xs">
                Bitmask solver analyzing sections on a background worker thread.
              </p>
              {progress.checkedCount > 0 && (
                <div className="mt-4 px-3 py-1.5 rounded-btn bg-subtle border border-app-border text-xs font-mono text-orange-600 font-semibold">
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
                  previewSection={previewSection}
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

      {/* 3. Course-Wise Faculty Explorer Slide-Over Panel */}
      {explorerCourseCode && (
        <FacultyExplorer
          courseCode={explorerCourseCode}
          onClose={() => {
            setExplorerCourseCode(null);
            setPreviewSection(null);
          }}
          courses={allCourses}
          sections={allSections}
          selectedCourses={request.selectedCourses}
          preferredFaculty={request.preferredFaculty}
          avoidFaculty={request.avoidFaculty}
          onTogglePreferred={toggleFacultyPref}
          onToggleAvoid={toggleFacultyAvoid}
          onAddCourse={handleAddCourse}
          onRemoveCourse={handleRemoveCourse}
          activeScheduleSections={currentSchedule?.sections || []}
          onHoverSection={(sec) => setPreviewSection(sec)}
        />
      )}

      {/* 4. Modals */}
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
