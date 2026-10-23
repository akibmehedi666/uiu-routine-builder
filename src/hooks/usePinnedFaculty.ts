'use client';

import { useState, useEffect, useCallback } from 'react';
import { resolveFacultyId, migrateFacultyIdArray } from '../lib/facultyAliases';
import rawFaculty from '../../data/faculty.json';

const STORAGE_KEY = 'uiu-rb:pinned-faculty:v1';
const MAX_PINS = 30;

// Valid canonical faculty IDs set to filter stale entries
const VALID_FACULTY_IDS = new Set<string>(rawFaculty.map((f: { id: string }) => f.id));

function getStoredPins(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Migrate any legacy IDs and filter against valid dataset
    const migrated = migrateFacultyIdArray(parsed);
    return migrated.filter((id) => VALID_FACULTY_IDS.has(id)).slice(0, MAX_PINS);
  } catch {
    return [];
  }
}

function savePins(pins: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch {
    // ignore quota errors
  }
}

export function usePinnedFaculty() {
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial load
  useEffect(() => {
    setPinnedIds(getStoredPins());
    setIsLoaded(true);
  }, []);

  // Listen to cross-tab storage changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setPinnedIds(getStoredPins());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isPinned = useCallback(
    (id: string) => {
      const canonical = resolveFacultyId(id);
      return pinnedIds.includes(canonical);
    },
    [pinnedIds]
  );

  const togglePin = useCallback(
    (id: string) => {
      const canonical = resolveFacultyId(id);
      if (!canonical || !VALID_FACULTY_IDS.has(canonical)) return;

      setPinnedIds((prev) => {
        let updated: string[];
        if (prev.includes(canonical)) {
          updated = prev.filter((p) => p !== canonical);
        } else {
          if (prev.length >= MAX_PINS) return prev;
          updated = [...prev, canonical];
        }
        savePins(updated);
        return updated;
      });
    },
    []
  );

  const pinFaculty = useCallback(
    (id: string) => {
      const canonical = resolveFacultyId(id);
      if (!canonical || !VALID_FACULTY_IDS.has(canonical)) return;

      setPinnedIds((prev) => {
        if (prev.includes(canonical) || prev.length >= MAX_PINS) return prev;
        const updated = [...prev, canonical];
        savePins(updated);
        return updated;
      });
    },
    []
  );

  const unpinFaculty = useCallback(
    (id: string) => {
      const canonical = resolveFacultyId(id);
      setPinnedIds((prev) => {
        const updated = prev.filter((p) => p !== canonical);
        savePins(updated);
        return updated;
      });
    },
    []
  );

  const clearPinned = useCallback(() => {
    setPinnedIds([]);
    savePins([]);
  }, []);

  return {
    pinnedIds,
    isLoaded,
    isPinned,
    togglePin,
    pinFaculty,
    unpinFaculty,
    clearPinned,
    maxPins: MAX_PINS,
  };
}
