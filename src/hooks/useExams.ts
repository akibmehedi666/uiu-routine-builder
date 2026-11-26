'use client';

import { useState, useEffect } from 'react';
import { ExamRow, loadExamsData } from '../lib/exams';

/**
 * Lazily loads data/exams.json on the client so Builder's initial bundle size
 * does not increase. Silently returns empty array if data is missing.
 */
export function useExams(enabled = true): { exams: ExamRow[]; loaded: boolean } {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadExamsData().then((data) => {
      if (!active) return;
      setExams(data);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { exams, loaded };
}
