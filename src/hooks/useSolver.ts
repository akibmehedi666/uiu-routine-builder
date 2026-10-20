'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Section,
  SolveRequest,
  SolveResponse,
  ScheduleResult,
} from '../types';
import { WorkerIncomingMessage, WorkerOutgoingMessage } from '../workers/solver.worker';
import { solveSchedules } from '../solver';

export interface SolverProgress {
  checkedCount: number;
  validCount: number;
}

export interface UseSolverReturn {
  solve: (request: SolveRequest, sections: Section[]) => void;
  cancel: () => void;
  isSolving: boolean;
  progress: SolverProgress;
  results: SolveResponse | null;
  error: string | null;
  currentRank: number; // 0-indexed selected schedule index
  setRank: (rank: number) => void;
  currentSchedule: ScheduleResult | null;
}

// In-memory cache for fast repeated solves
const solveCache = new Map<string, SolveResponse>();

function hashRequest(req: SolveRequest): string {
  return JSON.stringify({
    courses: (req.selectedCourses || []).slice().sort(),
    pref: req.preferredFaculty,
    avoid: req.avoidFaculty,
    locked: req.lockedSections,
    dayOff: (req.filterDayOff || []).slice().sort(),
    time: req.filterTimeWindow,
    maxGap: req.maxGapMinutesPerDay,
    weights: req.weights,
    limit: req.limit,
  });
}

export function useSolver(): UseSolverReturn {
  const [isSolving, setIsSolving] = useState(false);
  const [progress, setProgress] = useState<SolverProgress>({ checkedCount: 0, validCount: 0 });
  const [results, setResults] = useState<SolveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentRank, setCurrentRank] = useState(0);

  const workerRef = useRef<Worker | null>(null);

  const initWorker = useCallback(() => {
    if (typeof window === 'undefined') return null;

    try {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      const worker = new Worker(
        new URL('../workers/solver.worker.ts', import.meta.url)
      );
      workerRef.current = worker;
      return worker;
    } catch (e) {
      console.warn('Web Worker creation failed, will use direct solver:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    initWorker();
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [initWorker]);

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      initWorker();
    }
    setIsSolving(false);
  }, [initWorker]);

  const solve = useCallback(
    (request: SolveRequest, sections: Section[]) => {
      if (!request.selectedCourses || request.selectedCourses.length === 0) {
        setResults({
          schedules: [],
          totalValidCombinations: 0,
          truncated: false,
          searchTimeMs: 0,
          nodesExplored: 0,
        });
        setCurrentRank(0);
        setError(null);
        setIsSolving(false);
        return;
      }

      // Check cache first
      const key = hashRequest(request);
      const cached = solveCache.get(key);
      if (cached) {
        setResults(cached);
        setCurrentRank(0);
        setError(cached.error || null);
        setIsSolving(false);
        return;
      }

      setIsSolving(true);
      setError(null);
      setProgress({ checkedCount: 0, validCount: 0 });

      // If worker available
      if (typeof window !== 'undefined' && window.Worker) {
        const worker = initWorker();
        if (worker) {
          worker.onmessage = (event: MessageEvent<WorkerOutgoingMessage>) => {
            const data = event.data;
            if (data.type === 'progress') {
              setProgress({
                checkedCount: data.checkedCount,
                validCount: data.validCount,
              });
            } else if (data.type === 'done') {
              setIsSolving(false);
              setResults(data.response);
              setCurrentRank(0);
              if (data.response.error) {
                setError(data.response.error);
              }
              solveCache.set(key, data.response);
            } else if (data.type === 'error') {
              setIsSolving(false);
              setError(data.message);
            }
          };

          worker.onerror = (e) => {
            setIsSolving(false);
            setError(`Worker error: ${e.message || 'unknown'}`);
          };

          const msg: WorkerIncomingMessage = {
            type: 'solve',
            request,
            sections,
          };
          worker.postMessage(msg);
          return;
        }
      }

      // Fallback: synchronous solver
      try {
        const res = solveSchedules(sections, request, (checkedCount, validCount) => {
          setProgress({ checkedCount, validCount });
        });
        setResults(res);
        setCurrentRank(0);
        if (res.error) setError(res.error);
        solveCache.set(key, res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Solve error');
      } finally {
        setIsSolving(false);
      }
    },
    [initWorker]
  );

  const currentSchedule =
    results && results.schedules.length > 0 && currentRank < results.schedules.length
      ? results.schedules[currentRank]
      : null;

  return {
    solve,
    cancel,
    isSolving,
    progress,
    results,
    error,
    currentRank,
    setRank: setCurrentRank,
    currentSchedule,
  };
}
