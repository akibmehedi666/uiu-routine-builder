'use client';

import React from 'react';
import { ScheduleResult, Section } from '../types';
import { formatTime24 } from '../utils/export';
import { Check, ArrowRight, GitCompare, Sparkles, AlertCircle } from 'lucide-react';
import { getCourseColor } from '../utils/colors';

interface ScheduleComparisonProps {
  schedules: ScheduleResult[];
  activeRank: number;
  onSelectRank: (rank: number) => void;
}

export function ScheduleComparison({
  schedules,
  activeRank,
  onSelectRank,
}: ScheduleComparisonProps) {
  const topSchedules = schedules.slice(0, 3);

  if (topSchedules.length <= 1) {
    return null;
  }

  const baseSchedule = topSchedules[0];

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 sm:p-6 backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitCompare className="w-5 h-5 text-orange-400" />
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
            Top Schedule Comparison & Diff
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          Comparing Top {topSchedules.length} Variations
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
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isActive
                  ? 'bg-slate-800/90 border-orange-500 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-white">
                    Rank #{idx + 1}
                  </span>
                  {idx === 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">
                      BEST
                    </span>
                  )}
                  {isActive && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-orange-400">
                    {sched.score}
                  </span>
                  <span className="text-[10px] text-slate-400">/100</span>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Days with Classes:</span>
                  <span className="font-semibold">{sched.stats.daysUsed.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Gaps:</span>
                  <span className="font-semibold">
                    {sched.stats.totalGapMinutes === 0
                      ? '0m (Back-to-Back)'
                      : `${sched.stats.totalGapMinutes} mins`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Class Hours:</span>
                  <span className="font-semibold">
                    {formatTime24(sched.stats.earliestStart)} –{' '}
                    {formatTime24(sched.stats.latestEnd)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tentative Sections:</span>
                  <span
                    className={
                      sched.stats.tentativeCount > 0 ? 'text-amber-400 font-semibold' : ''
                    }
                  >
                    {sched.stats.tentativeCount}
                  </span>
                </div>

                {idx > 0 && (
                  <div className="pt-2 mt-2 border-t border-slate-800/80 text-[11px] text-orange-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {diffCount} section{diffCount !== 1 ? 's' : ''} differ from Rank #1
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Diff Table: Showing Section Changes across Courses */}
      <div className="pt-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Section-by-Section Variation Diff
        </h4>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Course</th>
                <th className="p-3">Rank #1 (Best)</th>
                {topSchedules.slice(1).map((_, i) => (
                  <th key={i} className="p-3">
                    Rank #{i + 2}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
              {baseSchedule.sections.map((baseSec) => {
                const color = getCourseColor(baseSec.courseCode);
                return (
                  <tr key={baseSec.courseCode} className="hover:bg-slate-800/20">
                    <td className="p-3">
                      <span className="font-bold text-white block">
                        {baseSec.courseCode}
                      </span>
                      <span className="text-[11px] text-slate-400 line-clamp-1">
                        {baseSec.title}
                      </span>
                    </td>

                    {/* Rank 1 Cell */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded font-bold bg-slate-800 text-white">
                          Sec {baseSec.section}
                        </span>
                        <span className="text-slate-400 truncate max-w-[120px]">
                          {baseSec.faculty[0] || 'TBA'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {baseSec.meetings.map((m) => `${m.day} ${formatTime24(m.start)}`).join(', ')}
                      </div>
                    </td>

                    {/* Other Ranks Cells with Diff Highlights */}
                    {topSchedules.slice(1).map((sched, sIdx) => {
                      const otherSec = sched.sections.find(
                        (s) => s.courseCode === baseSec.courseCode
                      );
                      const isDifferent = otherSec && otherSec.id !== baseSec.id;

                      return (
                        <td key={sIdx} className="p-3">
                          {otherSec ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                                    isDifferent
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  Sec {otherSec.section}
                                </span>
                                <span className="text-slate-400 truncate max-w-[120px]">
                                  {otherSec.faculty[0] || 'TBA'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {otherSec.meetings
                                  .map((m) => `${m.day} ${formatTime24(m.start)}`)
                                  .join(', ')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
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
