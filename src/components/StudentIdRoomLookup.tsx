'use client';

import React, { useState, useEffect } from 'react';
import {
  normalizeStudentId,
  loadStoredStudentId,
  saveStoredStudentId,
} from '../lib/exams';
import { Search, ShieldCheck, Trash2, AlertCircle } from 'lucide-react';

interface StudentIdRoomLookupProps {
  activeStudentId: string | null;
  onApplyStudentId: (normalizedId: string | null) => void;
}

export function StudentIdRoomLookup({
  activeStudentId,
  onApplyStudentId,
}: StudentIdRoomLookupProps) {
  const [inputValue, setInputValue] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStoredId, setHasStoredId] = useState(false);

  // Hydrate remembered ID only if user previously opted in
  useEffect(() => {
    const stored = loadStoredStudentId();
    if (stored) {
      const norm = normalizeStudentId(stored);
      if (norm) {
        setInputValue(stored);
        setRememberDevice(true);
        setHasStoredId(true);
        onApplyStudentId(norm);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const norm = normalizeStudentId(inputValue);
    if (!norm) {
      setError('Enter a valid 9- or 10-digit student ID (e.g. 0112230263).');
      return;
    }
    setError(null);
    onApplyStudentId(norm);

    if (rememberDevice) {
      saveStoredStudentId(norm);
      setHasStoredId(true);
    } else {
      saveStoredStudentId(null);
      setHasStoredId(false);
    }
  };

  const handleToggleRemember = (checked: boolean) => {
    setRememberDevice(checked);
    if (!checked) {
      saveStoredStudentId(null);
      setHasStoredId(false);
    } else if (activeStudentId) {
      saveStoredStudentId(activeStudentId);
      setHasStoredId(true);
    }
  };

  const handleForget = () => {
    setInputValue('');
    setError(null);
    setRememberDevice(false);
    setHasStoredId(false);
    saveStoredStudentId(null);
    onApplyStudentId(null);
  };

  return (
    <div className="p-3.5 sm:p-4 rounded-card bg-surface border border-app-border shadow-2xs space-y-2.5">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row sm:items-end gap-2.5"
      >
        <div className="flex-1 min-w-0 space-y-1">
          <label
            htmlFor="student-id-room-input"
            className="block text-xs font-semibold text-text-primary"
          >
            Your student ID
          </label>
          <input
            id="student-id-room-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 0112230263 or 011131140"
            className="w-full min-h-[44px] px-3 py-2 rounded-btn bg-subtle border border-app-border text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="submit"
            className="min-h-[44px] px-4 py-2 rounded-btn bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors flex-1 sm:flex-initial"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span>Find my room</span>
          </button>

          {(activeStudentId || hasStoredId || inputValue) && (
            <button
              type="button"
              onClick={handleForget}
              className="min-h-[44px] px-3 py-2 rounded-btn bg-subtle hover:bg-rose-50 text-text-secondary hover:text-rose-700 border border-app-border hover:border-rose-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              title="Clear student ID from this session and browser storage"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Forget</span>
            </button>
          )}
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-btn px-2.5 py-1.5 flex items-center gap-1.5 font-medium"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Your ID is used only in this browser to pick your room. It is not
            saved or shared.
          </span>
        </span>

        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-text-secondary font-medium shrink-0 min-h-[28px]">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => handleToggleRemember(e.target.checked)}
            className="rounded border-app-border text-orange-500 focus:ring-orange-400"
          />
          <span>Remember on this device</span>
        </label>
      </div>
    </div>
  );
}
