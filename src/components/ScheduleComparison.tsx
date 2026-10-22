'use client';

import React from 'react';
import { ScheduleResult, Section } from '../types';
import { formatTime24 } from '../utils/export';
import { Check, ArrowRight, GitCompare, AlertCircle, Bookmark } from 'lucide-react';
import { getCourseColor } from '../utils/colors';
import { isFixedCourse } from '../config/fixedCourses';

interface ScheduleComparisonProps {
  schedules: ScheduleResult[];
  activeRank: number;
  onSelectRank: (rank: number) => void;
  onSaveSchedule?: (schedule: ScheduleResult) => void;
  savedSignatures?: Set<string>;
  titleText?: string;
  isSavedComparison?: boolean;
}

export function ScheduleComparison({
  schedules,
  activeRank,
  onSelectRank,
  onSaveSchedule,
  savedSignatures,
  titleText,
  isSavedComparison,
}: ScheduleComparisonProps) {
  const topSchedules = schedules.slice(0, 3);

  if (topSchedules.length <= 1) {
    return null;
  }

  const baseSchedule = topSchedules[0];

  return (
    <div className="bg-surface rounded-card border border-app-border p-4 sm:p-5 shadow-warm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitCompare className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-bold text-text-primary tracking-wide uppercase">
            {titleText || 'Top Schedule Comparison & Diff'}
          </h3>
        </div>
        <span className="text-xs text-text-muted">
          Comparing {topSchedules.length} Variations
        </span>
      </div>

      {/* Top Cards Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {topSchedules.map((sched, idx) => {
          const isActive = activeRank === idx;
          const diffCount =
            idx === 0
              ? 0
              : sched.sections.filter((sec) => {
                  const baseSec = baseSchedule.sections.find(
                    (s) => s.courseCode === sec.courseCode
                  );
                  return baseSec?.id !== sec.id;
                }).length;

          return (
            <div
              key={idx}
              onClick={() => onSelectRank(idx)}
              className={`p-4 rounded-card border cursor-pointer transition-all ${
                isActive
                  ? 'bg-orange-50/70 border-orange-500 shadow-warm ring-1 ring-orange-500'
                  : 'bg-subtle border-app-border hover:border-orange-300 hover:bg-orange-50/40'
              }`}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-app-border">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-text-primary">
                    Rank #{idx + 1}
                  </span>
                  {idx === 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-orange-500 text-white">
                      BEST
                    </span>
                  )}
                  {isActive && (
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-success-bg text-success border border-success/30">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="text-right">
                    <span className="text-sm font-black text-orange-600">
                      {sched.score}
                    </span>
                    <span className="text-[11px] text-text-muted">/100</span>
                  </div>
                  {onSaveSchedule && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSaveSchedule(sched);
                      }}
                      className="p-1 rounded hover:bg-orange-100/60 text-text-muted hover:text-orange-600 transition-colors"
                      title="Save this routine"
                      aria-label="Save this routine"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-orange-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="space-y-1.5 text-xs text-text-secondary">
                <div className="flex justify-between">
                  <span className="text-text-muted">Days with Classes:</span>
                  <span className="font-semibold text-text-primary">
                    {sched.stats.daysUsed.join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Gaps:</span>
                  <span className="font-semibold text-text-primary">
                    {sched.stats.totalGapMinutes === 0
                      ? '0m (Back-to-Back)'
                      : `${sched.stats.totalGapMinutes}m`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Sections Diff vs #1:</span>
                  <span className="font-semibold">
                    {idx === 0 ? (
                      <span className="text-orange-600 font-bold">Baseline</span>
                    ) : diffCount === 0 ? (
                      <span className="text-text-muted">Identical Sections</span>
                    ) : (
                      <span className="text-orange-600 font-bold">
                        {diffCount} sections changed
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-app-border flex items-center justify-between text-[11px]">
                <span className="text-text-muted">
                  {sched.sections.length} courses • {sched.stats.credits} credits
                </span>
                <span
                  className={`font-semibold flex items-center gap-1 ${
                    isActive ? 'text-orange-600' : 'text-text-muted hover:text-orange-600'
                  }`}
                >
                  {isActive ? 'Selected' : 'Switch →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Course-by-Course Section Matrix */}
      <div className="mt-4 border border-app-border rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-subtle border-b border-app-border text-text-muted font-bold">
                <th className="py-2.5 px-3">Course</th>
                {topSchedules.map((_, i) => (
                  <th
                    key={i}
                    className={`py-2.5 px-3 ${
                      activeRank === i
                        ? 'text-orange-600 font-extrabold bg-orange-50/50'
                        : ''
                    }`}
                  >
                    Rank #{i + 1} {i === 0 ? '(Best)' : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border bg-surface">
              {baseSchedule.sections.map((sec) => {
                const color = getCourseColor(sec.courseCode);
                return (
                  <tr key={sec.courseCode} className="hover:bg-subtle/60 transition-colors">
                    <td className="py-2 px-3 font-semibold text-text-primary whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: color.accent }}
                        />
                        <div>
                          <span className="font-bold">{sec.courseCode}</span>
                          <span className="text-[11px] text-text-muted ml-1 hidden sm:inline">
                            ({sec.kind})
                          </span>
                        </div>
                      </div>
                    </td>

                    {topSchedules.map((sched, rIdx) => {
                      const matchSec = sched.sections.find(
                        (s) => s.courseCode === sec.courseCode
                      );
                      const isDiffFromBase = rIdx > 0 && matchSec?.id !== sec.id;

                      if (!matchSec) {
                        return (
                          <td key={rIdx} className="py-2 px-3 text-text-muted italic">
                            —
                          </td>
                        );
                      }

                      return (
                        <td
                          key={rIdx}
                          className={`py-2 px-3 ${
                            activeRank === rIdx ? 'bg-orange-50/30' : ''
                          }`}
                        >
                          <div
                            className={`inline-flex flex-col p-1.5 rounded-btn border ${
                              isDiffFromBase
                                ? 'bg-orange-50 border-orange-400 text-orange-950 font-semibold'
                                : 'bg-surface border-app-border text-text-primary'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs">
                                Sec {matchSec.section}
                              </span>
                              {isFixedCourse(matchSec.courseCode) && (
                                <span className="px-1 py-0.2 rounded text-[11px] bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                                  Fixed
                                </span>
                              )}
                              {isDiffFromBase && (
                                <span className="px-1 py-0.2 rounded text-[11px] bg-orange-500 text-white font-bold">
                                  DIFF
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-text-muted line-clamp-1">
                              {matchSec.faculty.join(', ')}
                            </div>
                            <div className="text-[11px] text-text-secondary mt-0.5">
                              {matchSec.meetings
                                .map(
                                  (m) =>
                                    `${m.day} ${formatTime24(m.start)}-${formatTime24(m.end)}`
                                )
                                .join(' | ')}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
