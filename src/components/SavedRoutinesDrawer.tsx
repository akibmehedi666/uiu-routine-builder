'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SavedRoutine,
  SavedRoutineColor,
  SAVED_ROUTINE_COLORS,
  SavedRoutineValidation,
} from '../types/savedRoutine';
import { Section, Day, SolveRequest, ScheduleResult } from '../types';
import {
  validateSavedRoutine,
  exportRoutinesToJson,
  importRoutinesFromJson,
  mergeImportedRoutines,
  encodeSharedRoutineUrl,
  updateRoutineToLatestData,
} from '../utils/savedRoutinesStorage';
import { MiniTimetableThumbnail } from './MiniTimetableThumbnail';
import { exportToText, exportToICS, downloadFile } from '../utils/export';
import {
  Bookmark,
  X,
  Search,
  Star,
  Download,
  Upload,
  Trash2,
  Copy,
  Calendar as CalendarIcon,
  Printer,
  Share2,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Clock,
  Sparkles,
  GitCompare,
  Edit2,
  Check,
  RotateCcw,
  RefreshCw,
  Plus,
} from 'lucide-react';

interface SavedRoutinesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedRoutines: SavedRoutine[];
  liveSections: Section[];
  onOpenRoutine: (routine: SavedRoutine) => void;
  onLoadSettings: (inputs: SavedRoutine['inputs']) => void;
  onCompareRoutines: (routines: SavedRoutine[]) => void;
  onDeleteRoutine: (id: string) => void;
  onDeleteAll: () => void;
  onUpdateRoutine: (
    id: string,
    updates: Partial<Pick<SavedRoutine, 'name' | 'note' | 'colorTag' | 'isFavorite'>>
  ) => void;
  onDuplicateRoutine: (id: string) => void;
  onImportRoutines: (incoming: SavedRoutine[], mode: 'merge' | 'replace') => void;
  onAddUpdatedCopy: (newRoutine: SavedRoutine) => void;
  triggerButtonRef?: React.RefObject<HTMLButtonElement>;
}

export function SavedRoutinesDrawer({
  isOpen,
  onClose,
  savedRoutines,
  liveSections,
  onOpenRoutine,
  onLoadSettings,
  onCompareRoutines,
  onDeleteRoutine,
  onDeleteAll,
  onUpdateRoutine,
  onDuplicateRoutine,
  onImportRoutines,
  onAddUpdatedCopy,
  triggerButtonRef,
}: SavedRoutinesDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<
    'newest' | 'name' | 'days' | 'credits' | 'starred'
  >('newest');
  const [filterStarredOnly, setFilterStarredOnly] = useState(false);
  const [selectedColor, setSelectedColor] = useState<SavedRoutineColor | 'all'>('all');

  // Compare selection (2-3 routines)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  // Editing state (rename/edit note inline)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editColor, setEditColor] = useState<SavedRoutineColor | undefined>(undefined);

  // Undo delete toast state
  const [deletedRoutine, setDeletedRoutine] = useState<SavedRoutine | null>(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importParsedRoutines, setImportParsedRoutines] = useState<SavedRoutine[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);

  const drawerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus trap & Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (triggerButtonRef?.current) {
        triggerButtonRef.current.focus();
      }
    };
  }, [isOpen, onClose, triggerButtonRef]);

  // Validation cache for each saved routine against live catalog
  const validationMap = useMemo(() => {
    const map = new Map<string, SavedRoutineValidation>();
    for (const r of savedRoutines) {
      map.set(r.id, validateSavedRoutine(r, liveSections));
    }
    return map;
  }, [savedRoutines, liveSections]);

  // Filter & sort routines
  const filteredRoutines = useMemo(() => {
    return savedRoutines
      .filter((r) => {
        // Star filter
        if (filterStarredOnly && !r.isFavorite) return false;

        // Color filter
        if (selectedColor !== 'all' && r.colorTag !== selectedColor) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = r.name.toLowerCase().includes(q);
          const matchNote = r.note?.toLowerCase().includes(q);
          const matchCourses = r.sections.some(
            (s) =>
              s.courseCode.toLowerCase().includes(q) ||
              s.title.toLowerCase().includes(q) ||
              s.section.toLowerCase().includes(q)
          );
          const matchFaculty = r.sections.some((s) =>
            s.faculty.some((f) => f.toLowerCase().includes(q))
          );
          if (!matchName && !matchNote && !matchCourses && !matchFaculty) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'starred') {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return b.createdAt - a.createdAt;
        }
        if (sortOption === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortOption === 'days') {
          return a.totals.daysOnCampus - b.totals.daysOnCampus;
        }
        if (sortOption === 'credits') {
          return b.totals.credits - a.totals.credits;
        }
        // default newest
        return b.createdAt - a.createdAt;
      });
  }, [savedRoutines, searchQuery, sortOption, filterStarredOnly, selectedColor]);

  // Export all routines as backup
  const handleExportAll = () => {
    const json = exportRoutinesToJson(savedRoutines);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(json, `uiu-routines-fall-2026-${dateStr}.json`, 'application/json');
  };

  // Export selected
  const handleExportSelected = () => {
    const toExport = savedRoutines.filter((r) => selectedForCompare.includes(r.id));
    const json = exportRoutinesToJson(toExport);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(json, `uiu-routines-selected-${dateStr}.json`, 'application/json');
  };

  // Start editing inline
  const handleStartEdit = (routine: SavedRoutine) => {
    setEditingId(routine.id);
    setEditName(routine.name);
    setEditNote(routine.note || '');
    setEditColor(routine.colorTag);
  };

  // Save inline edit
  const handleSaveEdit = (id: string) => {
    onUpdateRoutine(id, {
      name: editName.trim() || 'Untitled Routine',
      note: editNote.trim() || undefined,
      colorTag: editColor,
    });
    setEditingId(null);
  };

  // Delete with Undo
  const handleDeleteWithUndo = (routine: SavedRoutine) => {
    setDeletedRoutine(routine);
    onDeleteRoutine(routine.id);

    // Clear any previous timeout
    if (undoTimeoutId) clearTimeout(undoTimeoutId);

    const timeout = setTimeout(() => {
      setDeletedRoutine(null);
    }, 6000);
    setUndoTimeoutId(timeout);
  };

  const handleUndo = () => {
    if (deletedRoutine) {
      onImportRoutines([deletedRoutine], 'merge');
      setDeletedRoutine(null);
      if (undoTimeoutId) clearTimeout(undoTimeoutId);
    }
  };

  // Copy UCAM
  const handleCopyUCAM = async (routine: SavedRoutine) => {
    // Construct fake ScheduleResult for export
    const fakeSchedule: ScheduleResult = {
      sections: routine.sections as unknown as Section[],
      score: routine.totals.score,
      breakdown: {
        facultyScore: 0,
        gapScore: 0,
        dayCompactScore: 0,
        timePreferenceScore: 0,
        tentativePenalty: 0,
      },
      stats: {
        daysUsed: Array.from(
          new Set(routine.sections.flatMap((s) => s.meetings.map((m) => m.day)))
        ) as Day[],
        totalGapMinutes: 0,
        earliestStart: 510,
        latestEnd: 990,
        tentativeCount: 0,
        credits: routine.totals.credits,
      },
    };
    const text = exportToText(fakeSchedule);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(routine.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert('Failed to copy to clipboard.');
    }
  };

  // Export iCal
  const handleExportICS = (routine: SavedRoutine) => {
    const fakeSchedule: ScheduleResult = {
      sections: routine.sections as unknown as Section[],
      score: routine.totals.score,
      breakdown: {
        facultyScore: 0,
        gapScore: 0,
        dayCompactScore: 0,
        timePreferenceScore: 0,
        tentativePenalty: 0,
      },
      stats: {
        daysUsed: [],
        totalGapMinutes: 0,
        earliestStart: 510,
        latestEnd: 990,
        tentativeCount: 0,
        credits: routine.totals.credits,
      },
    };
    const ics = exportToICS(fakeSchedule);
    const safeName = routine.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadFile(ics, `${safeName}.ics`, 'text/calendar');
  };

  // Copy share link
  const handleCopyShareLink = async (routine: SavedRoutine) => {
    const token = encodeSharedRoutineUrl(routine);
    if (!token) return;
    const url = `${window.location.origin}/builder?sr=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setSharedId(routine.id);
      setTimeout(() => setSharedId(null), 2000);
    } catch {
      alert('Failed to copy share link.');
    }
  };

  // Toggle compare selection
  const handleToggleCompare = (id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        alert('You can compare a maximum of 3 routines side-by-side.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleLaunchCompare = () => {
    const toCompare = savedRoutines.filter((r) => selectedForCompare.includes(r.id));
    if (toCompare.length < 2) {
      alert('Please select at least 2 saved routines to compare.');
      return;
    }
    onCompareRoutines(toCompare);
    onClose();
  };

  // File import handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportFileContent(text);
      const res = importRoutinesFromJson(text);
      if (res.success && res.routines) {
        setImportParsedRoutines(res.routines);
        setImportError(null);
      } else {
        setImportParsedRoutines(null);
        setImportError(res.error || 'Failed to parse JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = (mode: 'merge' | 'replace') => {
    if (!importParsedRoutines) return;
    onImportRoutines(importParsedRoutines, mode);
    setIsImportModalOpen(false);
    setImportFileContent(null);
    setImportParsedRoutines(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-routines-title"
    >
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div
          ref={drawerRef}
          className="w-screen max-w-[480px] bg-surface border-l border-app-border shadow-warm-lg flex flex-col h-full text-xs text-text-primary animate-in slide-in-from-right duration-200"
        >
          {/* 1. Header */}
          <div className="p-4 border-b border-app-border flex items-center justify-between shrink-0 bg-surface">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-btn bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                <Bookmark className="w-4 h-4 fill-orange-500 text-orange-500" />
              </div>
              <div>
                <h2 id="saved-routines-title" className="text-sm font-bold text-text-primary">
                  My Saved Routines
                </h2>
                <p className="text-[11px] text-text-muted">
                  {savedRoutines.length} saved (Max 50) • Stored in this browser
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Export backup button */}
              {savedRoutines.length > 0 && (
                <button
                  onClick={handleExportAll}
                  className="p-1.5 rounded-btn text-text-secondary hover:text-text-primary hover:bg-subtle border border-transparent hover:border-app-border transition-colors"
                  title="Export all saved routines (.json)"
                  aria-label="Export all"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}

              {/* Import backup button */}
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="p-1.5 rounded-btn text-text-secondary hover:text-text-primary hover:bg-subtle border border-transparent hover:border-app-border transition-colors"
                title="Import routines from .json"
                aria-label="Import routines"
              >
                <Upload className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-btn text-text-muted hover:text-text-primary hover:bg-subtle transition-colors ml-1"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. Search, Sort & Filters Bar */}
          <div className="p-3 border-b border-app-border bg-page space-y-2.5 shrink-0">
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by routine name, course (e.g. CSE 4509), or faculty..."
                className="w-full pl-8 pr-7 py-1.5 rounded-btn border border-app-border bg-surface text-text-primary placeholder:text-text-muted text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort & Filter Chips Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Sort selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-text-muted">Sort:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="px-2 py-1 rounded-btn border border-app-border bg-surface text-text-primary text-[11px] focus:outline-none focus:ring-2 focus:ring-orange-500/30 font-medium"
                >
                  <option value="newest">Newest first</option>
                  <option value="starred">Starred first</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="days">Fewest days</option>
                  <option value="credits">Most credits</option>
                </select>
              </div>

              {/* Star toggle chip */}
              <button
                type="button"
                onClick={() => setFilterStarredOnly(!filterStarredOnly)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  filterStarredOnly
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-surface text-text-secondary border-app-border hover:border-orange-300'
                }`}
              >
                <Star
                  className={`w-3 h-3 ${
                    filterStarredOnly ? 'text-amber-500 fill-amber-500' : 'text-text-muted'
                  }`}
                />
                <span>Starred</span>
              </button>

              {/* Color filter dots */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedColor('all')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                    selectedColor === 'all'
                      ? 'bg-orange-500 text-white border-orange-500 font-bold'
                      : 'bg-surface text-text-muted border-app-border hover:text-text-primary'
                  }`}
                  title="Show all colors"
                >
                  All
                </button>
                {SAVED_ROUTINE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setSelectedColor(selectedColor === c.id ? 'all' : c.id)
                    }
                    className={`w-4 h-4 rounded-full ${c.dotClass} border transition-all ${
                      selectedColor === c.id
                        ? 'ring-2 ring-orange-500 ring-offset-1 scale-110'
                        : 'opacity-70 hover:opacity-100 border-white/50'
                    }`}
                    title={`Filter by ${c.label}`}
                    aria-label={`Filter by ${c.label}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 3. Compare Selection Bar (Active when 1 or more selected) */}
          {selectedForCompare.length > 0 && (
            <div className="bg-orange-50/90 border-b border-orange-200 px-4 py-2 flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-orange-950 font-semibold text-xs">
                <GitCompare className="w-4 h-4 text-orange-600" />
                <span>
                  {selectedForCompare.length} selected for comparison (Max 3)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedForCompare([])}
                  className="px-2 py-1 rounded-btn text-text-muted hover:text-text-primary text-[11px]"
                >
                  Clear
                </button>
                {selectedForCompare.length >= 2 ? (
                  <button
                    onClick={handleLaunchCompare}
                    className="px-3 py-1 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1"
                  >
                    <span>Compare Now</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-orange-700 italic">
                    Pick 1 more to compare
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 4. Scrollable List of Saved Routines */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {filteredRoutines.length === 0 ? (
              <div className="p-8 text-center bg-subtle rounded-card border border-app-border space-y-3 mt-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto">
                  <Bookmark className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary">
                    {savedRoutines.length === 0
                      ? 'No saved routines yet'
                      : 'No routines match your search'}
                  </h3>
                  <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
                    {savedRoutines.length === 0
                      ? 'Click the "Save routine" bookmark button on any generated routine to keep it here for quick access.'
                      : 'Try clearing your search query or removing the star/color filters above.'}
                  </p>
                </div>
              </div>
            ) : (
              filteredRoutines.map((routine) => {
                const validation = validationMap.get(routine.id);
                const isSelectedForCompare = selectedForCompare.includes(routine.id);
                const isEditing = editingId === routine.id;
                const colorMeta = routine.colorTag
                  ? SAVED_ROUTINE_COLORS.find((c) => c.id === routine.colorTag)
                  : null;

                return (
                  <div
                    key={routine.id}
                    className={`bg-surface rounded-card border transition-all space-y-2.5 p-3.5 shadow-warm ${
                      isSelectedForCompare
                        ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50/20'
                        : 'border-app-border hover:border-orange-300'
                    }`}
                  >
                    {/* Header Row: Color dot, Name, Star, Compare Checkbox */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Compare checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelectedForCompare}
                          onChange={() => handleToggleCompare(routine.id)}
                          title="Select to compare"
                          className="rounded border-app-border text-orange-500 focus:ring-orange-500/30 w-3.5 h-3.5 shrink-0"
                          aria-label={`Select ${routine.name} for comparison`}
                        />

                        {/* Color tag dot */}
                        {colorMeta && (
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${colorMeta.dotClass} shrink-0`}
                            title={colorMeta.label}
                          />
                        )}

                        {/* Name or inline editing */}
                        {isEditing ? (
                          <div className="flex-1 space-y-2 py-1">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Routine Name"
                              maxLength={120}
                              className="w-full px-2 py-1 rounded-btn border border-app-border bg-page text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                            />
                            <textarea
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value.slice(0, 300))}
                              placeholder="Personal Note (optional, max 300 chars)"
                              rows={2}
                              className="w-full px-2 py-1 rounded-btn border border-app-border bg-page text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                            />
                            {/* Color Tag Picker */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-text-muted">Tag:</span>
                              <button
                                type="button"
                                onClick={() => setEditColor(undefined)}
                                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                  editColor === undefined
                                    ? 'bg-subtle border-orange-500 font-bold'
                                    : 'border-app-border'
                                }`}
                              >
                                None
                              </button>
                              {SAVED_ROUTINE_COLORS.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setEditColor(c.id)}
                                  className={`w-3.5 h-3.5 rounded-full ${c.dotClass} border ${
                                    editColor === c.id ? 'ring-2 ring-orange-500' : ''
                                  }`}
                                  title={c.label}
                                />
                              ))}
                            </div>
                            <div className="flex items-center justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="px-2 py-1 rounded-btn bg-subtle text-text-secondary text-[11px]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(routine.id)}
                                className="px-2.5 py-1 rounded-btn bg-orange-500 text-white font-semibold text-[11px]"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="min-w-0 flex-1">
                            <h4
                              onClick={() => handleStartEdit(routine)}
                              className="font-bold text-xs text-text-primary hover:text-orange-600 truncate cursor-pointer flex items-center gap-1"
                              title="Click to rename"
                            >
                              <span>{routine.name}</span>
                              <Edit2 className="w-2.5 h-2.5 text-text-muted opacity-0 hover:opacity-100 group-hover:opacity-100" />
                            </h4>
                            <span className="text-[10px] text-text-muted">
                              Saved {new Date(routine.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Star & Duplicate */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() =>
                              onUpdateRoutine(routine.id, {
                                isFavorite: !routine.isFavorite,
                              })
                            }
                            className="p-1 rounded-btn text-text-muted hover:text-amber-500 transition-colors"
                            title={routine.isFavorite ? 'Unstar' : 'Star this routine'}
                            aria-label="Star routine"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                routine.isFavorite
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-text-muted'
                              }`}
                            />
                          </button>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <>
                        {/* Metrics Badges Row */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span className="px-2 py-0.5 rounded-full bg-subtle border border-app-border font-semibold text-text-secondary">
                            {routine.totals.credits} Credits
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-subtle border border-app-border font-semibold text-text-secondary">
                            {routine.totals.daysOnCampus} Days
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 font-extrabold text-orange-700">
                            Score: {routine.totals.score}
                          </span>
                        </div>

                        {/* Mini Timetable Thumbnail Preview */}
                        <MiniTimetableThumbnail sections={routine.sections} />

                        {/* Course List Single-Line Pill Summary */}
                        <div className="text-[11px] text-text-secondary font-mono bg-subtle/60 px-2 py-1 rounded-btn border border-app-border/80 truncate">
                          {routine.sections
                            .map((s) => `${s.courseCode}-${s.section}`)
                            .join(', ')}
                        </div>

                        {/* Note if present */}
                        {routine.note && (
                          <p className="text-[11px] text-text-muted italic bg-page p-2 rounded-btn border border-app-border/60">
                            &ldquo;{routine.note}&rdquo;
                          </p>
                        )}

                        {/* Warnings if data changed or invalid */}
                        {validation && !validation.isFullyValid && (
                          <div className="p-2 rounded-btn bg-amber-50 border border-amber-300 text-amber-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Data changed since you saved this routine</span>
                            </div>
                            <ul className="text-[10px] text-amber-800 list-disc list-inside space-y-0.5">
                              {validation.diffs.map((d, idx) => (
                                <li key={idx}>
                                  <span className="font-semibold">
                                    {d.courseCode}-{d.section}:
                                  </span>{' '}
                                  {d.details}
                                </li>
                              ))}
                            </ul>
                            <button
                              onClick={() => {
                                const { updatedRoutine } = updateRoutineToLatestData(
                                  routine,
                                  liveSections
                                );
                                onAddUpdatedCopy(updatedRoutine);
                              }}
                              className="mt-1 px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-950 font-semibold text-[10px] transition-colors"
                            >
                              Update to latest data (keep copy)
                            </button>
                          </div>
                        )}

                        {/* Action Buttons Row */}
                        <div className="pt-2 border-t border-app-border flex items-center justify-between gap-1.5 flex-wrap">
                          {/* Primary: Open */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                onOpenRoutine(routine);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1"
                            >
                              <Bookmark className="w-3.5 h-3.5 fill-white text-white" />
                              <span>Open</span>
                            </button>

                            <button
                              onClick={() => {
                                onLoadSettings(routine.inputs);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 rounded-btn bg-subtle hover:bg-orange-50 text-text-primary hover:text-orange-600 border border-app-border hover:border-orange-200 font-medium text-xs transition-colors"
                              title="Restore courses, faculty preferences and filters into solver"
                            >
                              Load settings
                            </button>
                          </div>

                          {/* Secondary utility icons */}
                          <div className="flex items-center gap-1 text-text-muted">
                            {/* Copy UCAM */}
                            <button
                              onClick={() => handleCopyUCAM(routine)}
                              className="p-1.5 rounded-btn hover:text-text-primary hover:bg-subtle transition-colors"
                              title="Copy UCAM registration text"
                              aria-label="Copy UCAM text"
                            >
                              {copiedId === routine.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Share Link */}
                            <button
                              onClick={() => handleCopyShareLink(routine)}
                              className="p-1.5 rounded-btn hover:text-text-primary hover:bg-subtle transition-colors"
                              title="Copy share link"
                              aria-label="Copy share link"
                            >
                              {sharedId === routine.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* iCal */}
                            <button
                              onClick={() => handleExportICS(routine)}
                              className="p-1.5 rounded-btn hover:text-text-primary hover:bg-subtle transition-colors"
                              title="Download iCal (.ics)"
                              aria-label="Download iCal"
                            >
                              <CalendarIcon className="w-3.5 h-3.5" />
                            </button>

                            {/* Duplicate */}
                            <button
                              onClick={() => onDuplicateRoutine(routine.id)}
                              className="p-1.5 rounded-btn hover:text-text-primary hover:bg-subtle transition-colors"
                              title="Duplicate routine"
                              aria-label="Duplicate routine"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete with Undo */}
                            <button
                              onClick={() => handleDeleteWithUndo(routine)}
                              className="p-1.5 rounded-btn hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete routine"
                              aria-label="Delete routine"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 5. Undo Toast Notification (Floating at bottom of drawer) */}
          {deletedRoutine && (
            <div className="mx-4 mb-2 p-2.5 rounded-card bg-slate-900 text-white text-xs flex items-center justify-between shadow-warm-lg animate-in fade-in slide-in-from-bottom-2">
              <span className="truncate pr-2">
                Deleted &ldquo;{deletedRoutine.name}&rdquo;
              </span>
              <button
                onClick={handleUndo}
                className="px-2 py-1 rounded bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
            </div>
          )}

          {/* 6. Drawer Footer (Privacy notice & Delete All) */}
          <div className="p-3 border-t border-app-border bg-page flex items-center justify-between text-[11px] text-text-muted shrink-0">
            <span className="leading-tight">
              Saved routines live only in this browser. Export a backup if you switch device.
            </span>
            {savedRoutines.length > 0 && (
              <button
                onClick={() => setIsConfirmDeleteAllOpen(true)}
                className="text-rose-600 hover:underline shrink-0 ml-2"
              >
                Delete all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface border border-app-border rounded-card max-w-md w-full p-5 shadow-warm-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-app-border">
              <div className="flex items-center gap-1.5 font-bold text-sm text-text-primary">
                <Upload className="w-4 h-4 text-orange-500" />
                <span>Import Saved Routines</span>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFileContent(null);
                  setImportParsedRoutines(null);
                  setImportError(null);
                }}
                className="p-1 text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-text-muted">
                Select a JSON backup file exported previously (e.g.{' '}
                <code>uiu-routines-fall-2026-*.json</code>).
              </p>

              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-btn file:border file:border-app-border file:text-xs file:font-semibold file:bg-subtle file:text-text-primary hover:file:bg-orange-50 cursor-pointer"
              />

              {importError && (
                <div className="p-2.5 rounded-btn bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importParsedRoutines && (
                <div className="p-3 rounded-btn bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{importParsedRoutines.length} routine(s) found in file</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Choose how to import these routines into your browser:
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleConfirmImport('merge')}
                      className="px-3 py-1.5 rounded-btn bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                    >
                      Merge (skip duplicates)
                    </button>
                    <button
                      onClick={() => handleConfirmImport('replace')}
                      className="px-3 py-1.5 rounded-btn bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors"
                    >
                      Replace all current
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete All Modal */}
      {isConfirmDeleteAllOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface border border-app-border rounded-card max-w-sm w-full p-5 shadow-warm-lg space-y-3">
            <h3 className="font-bold text-sm text-text-primary">
              Delete all saved routines?
            </h3>
            <p className="text-xs text-text-muted">
              This will remove all {savedRoutines.length} saved routines from your browser.
              This action cannot be undone unless you have exported a JSON backup.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmDeleteAllOpen(false)}
                className="px-3 py-1.5 rounded-btn bg-subtle text-text-secondary text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteAll();
                  setIsConfirmDeleteAllOpen(false);
                }}
                className="px-3 py-1.5 rounded-btn bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
              >
                Yes, delete all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
