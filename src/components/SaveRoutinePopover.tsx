'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ScheduleResult, SolveRequest } from '../types';
import {
  SavedRoutine,
  SavedRoutineColor,
  SAVED_ROUTINE_COLORS,
} from '../types/savedRoutine';
import {
  findDuplicateSavedRoutine,
  generateDefaultRoutineName,
  SAVED_ROUTINES_MAX_LIMIT,
} from '../utils/savedRoutinesStorage';
import { Bookmark, Star, AlertCircle, X, Trash2, Check, Copy } from 'lucide-react';

interface SaveRoutinePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleResult;
  request: SolveRequest;
  savedRoutines: SavedRoutine[];
  existingSavedRoutine?: SavedRoutine | null;
  onSave: (
    data: {
      name: string;
      note?: string;
      colorTag?: SavedRoutineColor;
      isFavorite?: boolean;
    },
    existingIdToUpdate?: string
  ) => void;
  onRemove?: (id: string) => void;
  onOpenSavedDrawer: () => void;
}

export function SaveRoutinePopover({
  isOpen,
  onClose,
  schedule,
  request,
  savedRoutines,
  existingSavedRoutine,
  onSave,
  onRemove,
  onOpenSavedDrawer,
}: SaveRoutinePopoverProps) {
  const isEditing = Boolean(existingSavedRoutine);
  const duplicate = existingSavedRoutine
    ? null
    : findDuplicateSavedRoutine(schedule.sections, savedRoutines);
  const isAtLimit = savedRoutines.length >= SAVED_ROUTINES_MAX_LIMIT && !isEditing;

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [colorTag, setColorTag] = useState<SavedRoutineColor | undefined>(undefined);
  const [isFavorite, setIsFavorite] = useState(false);
  const [forceNewCopy, setForceNewCopy] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize form state when opened or schedule changes
  useEffect(() => {
    if (isOpen) {
      if (existingSavedRoutine) {
        setName(existingSavedRoutine.name);
        setNote(existingSavedRoutine.note || '');
        setColorTag(existingSavedRoutine.colorTag);
        setIsFavorite(Boolean(existingSavedRoutine.isFavorite));
        setForceNewCopy(false);
      } else {
        const defaultName = generateDefaultRoutineName(schedule, savedRoutines.length);
        setName(defaultName);
        setNote('');
        setColorTag(undefined);
        setIsFavorite(false);
        setForceNewCopy(false);
      }

      // Auto-focus name input
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 50);
    }
  }, [isOpen, existingSavedRoutine, schedule, savedRoutines.length]);

  // Handle Escape key & outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    if (existingSavedRoutine && !forceNewCopy) {
      onSave(
        {
          name: name.trim(),
          note: note.trim() || undefined,
          colorTag,
          isFavorite,
        },
        existingSavedRoutine.id
      );
    } else {
      onSave({
        name: name.trim(),
        note: note.trim() || undefined,
        colorTag,
        isFavorite,
      });
    }
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface border border-app-border rounded-card shadow-warm-lg p-4 z-50 text-xs text-text-primary animate-in fade-in zoom-in-95"
      role="dialog"
      aria-label="Save routine popover"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-app-border">
        <div className="flex items-center gap-1.5 font-bold text-sm text-text-primary">
          <Bookmark className="w-4 h-4 text-orange-500 fill-orange-500" />
          <span>{isEditing ? 'Saved Routine Settings' : 'Save Routine'}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-text-muted hover:text-text-primary rounded-btn hover:bg-subtle transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Duplicate warning (if not already editing and not forcing new copy) */}
      {duplicate && !forceNewCopy && !isEditing ? (
        <div className="space-y-3 py-1">
          <div className="p-2.5 rounded-btn bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Already saved</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                This exact section combination is already saved as{' '}
                <span className="font-bold underline">{duplicate.name}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSavedDrawer();
              }}
              className="px-3 py-1.5 rounded-btn bg-subtle hover:bg-orange-50 text-text-secondary border border-app-border transition-colors font-medium text-xs"
            >
              View in Saved
            </button>
            <button
              type="button"
              onClick={() => {
                setForceNewCopy(true);
                setName(`${duplicate.name} (Copy)`);
              }}
              className="px-3 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-xs transition-colors text-xs"
            >
              Save as new copy
            </button>
          </div>
        </div>
      ) : isAtLimit ? (
        /* Limit reached banner */
        <div className="space-y-3 py-1">
          <div className="p-3 rounded-btn bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Limit reached (50/50)</p>
              <p className="text-[11px] text-rose-800 mt-0.5">
                You have reached the maximum of 50 saved routines. Open My Routines to export
                a backup or remove an older routine first.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSavedDrawer();
              }}
              className="px-3 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-xs text-xs"
            >
              Manage Saved Routines
            </button>
          </div>
        </div>
      ) : (
        /* Regular Form */
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Routine Name Input */}
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary mb-1">
              Routine Name <span className="text-rose-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 3 Days - Best Faculty"
              maxLength={120}
              required
              className="w-full px-2.5 py-1.5 rounded-btn border border-app-border bg-page text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs font-medium"
            />
          </div>

          {/* Color Tag Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary mb-1">
              Color Tag (Optional)
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setColorTag(undefined)}
                className={`px-2 py-1 rounded-btn text-[10px] font-medium border transition-colors ${
                  colorTag === undefined
                    ? 'bg-subtle text-text-primary border-orange-500 ring-1 ring-orange-500'
                    : 'bg-page text-text-muted border-app-border hover:border-orange-300'
                }`}
              >
                None
              </button>
              {SAVED_ROUTINE_COLORS.map((c) => {
                const isSelected = colorTag === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColorTag(c.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-btn text-[10px] font-medium border transition-all ${
                      isSelected
                        ? `${c.bgClass} ${c.textClass} border-orange-500 ring-1 ring-orange-500`
                        : `${c.bgClass} ${c.textClass} border-app-border hover:border-orange-300`
                    }`}
                    title={c.label}
                  >
                    <span className={`w-2 h-2 rounded-full ${c.dotClass}`} />
                    <span>{c.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-text-secondary">
                Personal Note (Optional)
              </label>
              <span className="text-[10px] text-text-muted">{note.length}/300</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              placeholder="e.g. Section B has good lab timings with Siam sir..."
              rows={2}
              className="w-full px-2.5 py-1.5 rounded-btn border border-app-border bg-page text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs resize-none"
            />
          </div>

          {/* Favorite Toggle */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-text-secondary">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="rounded border-app-border text-orange-500 focus:ring-orange-500/30"
              />
              <Star
                className={`w-3.5 h-3.5 ${
                  isFavorite ? 'text-amber-500 fill-amber-500' : 'text-text-muted'
                }`}
              />
              <span>Mark as Starred / Favorite</span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-app-border flex items-center justify-between gap-2">
            <div>
              {existingSavedRoutine && onRemove && (
                <button
                  type="button"
                  onClick={() => {
                    onRemove(existingSavedRoutine.id);
                    onClose();
                  }}
                  className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-btn transition-colors text-[11px] font-medium flex items-center gap-1"
                  title="Remove from saved routines"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-btn bg-subtle hover:bg-surface text-text-secondary border border-app-border transition-colors text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-3.5 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Save changes' : 'Save routine'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
