'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  TrendingUp,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getCampusStats, HeatmapCell } from '../../lib/campusStats';
import { DAYS_LIST, Day } from '../../types';

interface CampusStatsViewProps {
  onSelectRoom: (room: string) => void;
}

export function CampusStatsView({ onSelectRoom }: CampusStatsViewProps) {
  const stats = getCampusStats();
  const [heatmapMode, setHeatmapMode] = useState<'all' | 'theory' | 'lab'>('all');
  const [showAccessibleTable, setShowAccessibleTable] = useState(false);

  const cells = stats.heatmapGrid[heatmapMode];
  const totalsByDay = stats.heatmapGrid.totalsByDay[heatmapMode];

  // Distinct slots in current mode
  const currentSlots = Array.from(
    new Map(cells.map((c) => [c.slotId, { id: c.slotId, label: c.slotLabel, category: c.category }])).values()
  );

  // Intensity color generator based on cell count
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-stone-50 text-stone-300 border-stone-100';
    const max = stats.heatmapGrid.maxCellCount || 40;
    const ratio = count / max;
    if (ratio < 0.2) return 'bg-orange-50 text-orange-800 border-orange-100';
    if (ratio < 0.4) return 'bg-orange-100 text-orange-900 border-orange-200';
    if (ratio < 0.6) return 'bg-orange-200 text-orange-950 border-orange-300 font-semibold';
    if (ratio < 0.8) return 'bg-orange-400 text-white border-orange-500 font-bold';
    return 'bg-orange-600 text-white border-orange-700 font-bold';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Faculty Body</p>
          <p className="text-2xl font-black text-stone-900 mt-1">{stats.totalFaculty}</p>
          <p className="text-[11px] text-stone-400 mt-0.5">Active instructors</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Sections</p>
          <p className="text-2xl font-black text-stone-900 mt-1">{stats.totalSections}</p>
          <p className="text-[11px] text-stone-400 mt-0.5">BSCSE & BSDS programs</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Weekly Classes</p>
          <p className="text-2xl font-black text-orange-600 mt-1">{stats.totalMeetings}</p>
          <p className="text-[11px] text-stone-400 mt-0.5">Total room slots occupied</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Peak Campus Day</p>
          <p className="text-2xl font-black text-stone-900 mt-1">{stats.busiestDay.day}</p>
          <p className="text-[11px] text-stone-400 mt-0.5">{stats.busiestDay.count} sections running</p>
        </div>
      </div>

      {/* 1. Campus Heatmap */}
      <div className="p-5 md:p-6 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Campus Activity Heatmap
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Density of active classes by weekday and time slot across the UIU campus.
            </p>
          </div>

          {/* Heatmap filter toggle */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200/80 self-start sm:self-auto">
            {(['all', 'theory', 'lab'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setHeatmapMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  heatmapMode === mode
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {mode === 'all' ? 'All Classes' : mode === 'theory' ? 'Theory Only' : 'Lab Only'}
              </button>
            ))}
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[620px]">
            {/* Column Headers */}
            <div className="grid grid-cols-6 gap-1.5 pb-2 border-b border-stone-200/80 text-xs font-bold text-stone-500">
              <div className="text-left font-semibold">Time Slot</div>
              {DAYS_LIST.map((day) => (
                <div key={day} className="text-center font-bold">
                  {day}
                  <div className="text-[11px] font-normal text-stone-400">{totalsByDay[day]} classes</div>
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-stone-100">
              {currentSlots.map((slot) => (
                <div key={slot.id} className="grid grid-cols-6 gap-1.5 py-2 items-center">
                  <div className="text-xs text-stone-700 font-medium pr-2">
                    <p className="font-semibold">{slot.label}</p>
                    <p className="text-[11px] text-stone-400">{slot.category}</p>
                  </div>

                  {DAYS_LIST.map((day) => {
                    const cell = cells.find((c) => c.slotId === slot.id && c.day === day);
                    const count = cell?.count || 0;
                    return (
                      <div
                        key={day}
                        tabIndex={0}
                        aria-label={`${day} ${slot.label}: ${count} sections running`}
                        title={`${day} ${slot.label}: ${count} sections running`}
                        className={`h-11 rounded-xl border flex items-center justify-center text-xs transition-transform hover:scale-105 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-orange-500 ${getCellColor(
                          count
                        )}`}
                      >
                        {count > 0 ? count : '-'}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-stone-500 border-t border-stone-100">
          <div className="flex items-center gap-1.5">
            <span>Fewer classes</span>
            <div className="flex gap-1">
              <span className="w-3.5 h-3.5 rounded bg-orange-50 border border-orange-100" />
              <span className="w-3.5 h-3.5 rounded bg-orange-100 border border-orange-200" />
              <span className="w-3.5 h-3.5 rounded bg-orange-200 border border-orange-300" />
              <span className="w-3.5 h-3.5 rounded bg-orange-400 border border-orange-500" />
              <span className="w-3.5 h-3.5 rounded bg-orange-600 border border-orange-700" />
            </div>
            <span>Peak capacity</span>
          </div>

          <button
            onClick={() => setShowAccessibleTable(!showAccessibleTable)}
            className="text-xs text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 font-medium"
          >
            {showAccessibleTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showAccessibleTable ? 'Hide Table View' : 'Accessible Table View'}
          </button>
        </div>

        {/* Accessible Table View */}
        {showAccessibleTable && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100/70 border-b border-stone-200 text-stone-700 font-semibold">
                  <th className="p-2.5">Time Slot</th>
                  <th className="p-2.5">Category</th>
                  {DAYS_LIST.map((d) => (
                    <th key={d} className="p-2.5 text-center">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {currentSlots.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-50">
                    <td className="p-2.5 font-medium text-stone-900">{s.label}</td>
                    <td className="p-2.5 text-stone-500">{s.category}</td>
                    {DAYS_LIST.map((day) => {
                      const count = cells.find((c) => c.slotId === s.id && c.day === day)?.count || 0;
                      return (
                        <td key={day} className="p-2.5 text-center text-stone-700">
                          {count}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Histogram & 3. Kind Share Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Faculty Load Histogram */}
        <div className="p-5 md:p-6 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              Faculty by Section Count
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Distribution of teaching workload across the 207 faculty members.
            </p>
          </div>

          <div className="space-y-2.5">
            {stats.facultySectionHistogram.map((item) => (
              <div key={item.bucket} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700">
                    {item.bucket} section{item.bucket !== '1' ? 's' : ''}
                  </span>
                  <span className="text-stone-500 font-medium">
                    {item.count} faculty <span className="text-stone-400">({item.percent}%)</span>
                  </span>
                </div>
                <div className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(item.percent * 2.5, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section Kind Breakdown & Day Activity */}
        <div className="space-y-5">
          {/* Section Kind Share */}
          <div className="p-5 md:p-6 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-500" />
                Curriculum Structure Breakdown
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Proportion of Theory, Laboratory, and Single-Day courses.
              </p>
            </div>

            {/* Stacked Bar */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-stone-100 rounded-full overflow-hidden flex shadow-2xs">
                <div
                  className="h-full bg-blue-500 hover:opacity-90 transition-opacity"
                  style={{ width: `${stats.sectionsByKindShare.theoryPercent}%` }}
                  title={`Theory: ${stats.sectionsByKind.theory} (${stats.sectionsByKindShare.theoryPercent}%)`}
                />
                <div
                  className="h-full bg-emerald-500 hover:opacity-90 transition-opacity"
                  style={{ width: `${stats.sectionsByKindShare.labPercent}%` }}
                  title={`Lab: ${stats.sectionsByKind.lab} (${stats.sectionsByKindShare.labPercent}%)`}
                />
                <div
                  className="h-full bg-amber-500 hover:opacity-90 transition-opacity"
                  style={{ width: `${stats.sectionsByKindShare.singleDayPercent}%` }}
                  title={`Single-Day: ${stats.sectionsByKind.singleDay} (${stats.sectionsByKindShare.singleDayPercent}%)`}
                />
              </div>

              {/* Legend & Stats */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60">
                  <p className="font-semibold text-blue-900">Theory</p>
                  <p className="text-base font-bold text-blue-950 mt-0.5">{stats.sectionsByKind.theory}</p>
                  <p className="text-[11px] text-blue-600 font-medium">{stats.sectionsByKindShare.theoryPercent}%</p>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                  <p className="font-semibold text-emerald-900">Laboratory</p>
                  <p className="text-base font-bold text-emerald-950 mt-0.5">{stats.sectionsByKind.lab}</p>
                  <p className="text-[11px] text-emerald-600 font-medium">{stats.sectionsByKindShare.labPercent}%</p>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60">
                  <p className="font-semibold text-amber-900">Single-Day</p>
                  <p className="text-base font-bold text-amber-950 mt-0.5">{stats.sectionsByKind.singleDay}</p>
                  <p className="text-[11px] text-amber-600 font-medium">{stats.sectionsByKindShare.singleDayPercent}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Weekday Section Distribution */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-3">
            <h4 className="text-sm font-bold text-stone-900 flex items-center justify-between">
              <span>Weekday Class Allocation</span>
              <span className="text-xs text-stone-400 font-normal">
                Busiest: <span className="font-semibold text-stone-700">{stats.busiestDay.day}</span> | Quietest:{' '}
                <span className="font-semibold text-stone-700">{stats.quietestDay.day}</span>
              </span>
            </h4>

            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {DAYS_LIST.map((d) => (
                <div
                  key={d}
                  className={`p-2.5 rounded-xl border ${
                    d === stats.busiestDay.day
                      ? 'bg-orange-50/80 border-orange-200 text-orange-950'
                      : d === stats.quietestDay.day
                      ? 'bg-stone-50 border-stone-200 text-stone-600'
                      : 'bg-white border-stone-200 text-stone-800'
                  }`}
                >
                  <p className="font-bold">{d}</p>
                  <p className="text-sm font-black mt-0.5">{stats.meetingsByDay[d]}</p>
                  <p className="text-[11px] text-stone-400">classes</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Top 10 Courses & 6. Top 10 Rooms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top 10 Courses */}
        <div className="p-5 md:p-6 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-orange-500" />
              Top 10 Courses by Sections
            </h3>
            <span className="text-xs text-stone-400 font-medium">Click to view course</span>
          </div>

          <div className="divide-y divide-stone-100">
            {stats.topCoursesBySections.map((c, idx) => (
              <Link
                key={c.code}
                href={`/courses?q=${encodeURIComponent(c.code)}`}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group hover:bg-stone-50/80 px-1 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 text-center text-xs font-bold text-stone-400 group-hover:text-orange-600">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900 group-hover:text-orange-600 transition-colors">
                        {c.code}
                      </span>
                      <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                        {c.program}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 truncate">{c.title}</p>
                  </div>
                </div>

                <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full shrink-0 group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors">
                  {c.sections} sections
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Top 10 Rooms */}
        <div className="p-5 md:p-6 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              Top 10 Most-Utilized Rooms
            </h3>
            <span className="text-xs text-stone-400 font-medium">Click to view schedule</span>
          </div>

          <div className="divide-y divide-stone-100">
            {stats.topRoomsByMeetings.map((r, idx) => (
              <button
                key={r.room}
                onClick={() => onSelectRoom(r.room)}
                className="w-full text-left py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group hover:bg-stone-50/80 px-1 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 text-center text-xs font-bold text-stone-400 group-hover:text-orange-600">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-900 group-hover:text-orange-600 transition-colors truncate">
                      Room {r.room}
                    </p>
                    {r.floor !== null && (
                      <p className="text-[11px] text-stone-400">Floor {r.floor}</p>
                    )}
                  </div>
                </div>

                <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full shrink-0 group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors">
                  {r.count} classes
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
