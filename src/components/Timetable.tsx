'use client';

import React, { useState } from 'react';
import { Day, DAYS_LIST, Meeting, ScheduleResult, Section } from '../types';
import { getCourseColor } from '../utils/colors';
import { formatTime24, exportToText, exportToICS, downloadFile } from '../utils/export';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
  Copy,
  Calendar as CalendarIcon,
  Printer,
  Lock,
  AlertCircle,
  Clock,
  MapPin,
  User,
  Info,
  Check,
} from 'lucide-react';

interface TimetableProps {
  schedule: ScheduleResult;
  currentRank: number; // 0-indexed
  totalSchedules: number;
  onSetRank: (rank: number) => void;
  onLockAllSections: (schedule: ScheduleResult) => void;
  isFavorite: boolean;
  onToggleFavorite: (schedule: ScheduleResult) => void;
  isTruncated?: boolean;
}

// 8 slot markers from 08:30 to 16:30
const TIME_SLOTS = [
  { label: '08:30 AM', min: 510 },
  { label: '09:50 AM', min: 590 },
  { label: '11:10 AM', min: 670 },
  { label: '12:30 PM', min: 750 },
  { label: '01:50 PM', min: 830 },
  { label: '03:10 PM', min: 910 },
  { label: '04:30 PM', min: 990 },
];

export function Timetable({
  schedule,
  currentRank,
  totalSchedules,
  onSetRank,
  onLockAllSections,
  isFavorite,
  onToggleFavorite,
  isTruncated,
}: TimetableProps) {
  const [copied, setCopied] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<{
    section: Section;
    meeting: Meeting;
  } | null>(null);

  const handleCopyUCAM = async () => {
    const text = exportToText(schedule);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Unable to copy to clipboard.');
    }
  };

  const handleExportICS = () => {
    const icsData = exportToICS(schedule);
    downloadFile(icsData, `UIU_Routine_Rank_${currentRank + 1}.ics`, 'text/calendar');
  };

  const handlePrint = () => {
    window.print();
  };

  // Group meetings by day with section reference
  const meetingsByDay: Record<Day, { section: Section; meeting: Meeting }[]> = {
    Sat: [],
    Sun: [],
    Mon: [],
    Tue: [],
    Wed: [],
  };

  for (const sec of schedule.sections) {
    for (const m of sec.meetings) {
      if (meetingsByDay[m.day]) {
        meetingsByDay[m.day].push({ section: sec, meeting: m });
      }
    }
  }

  // Score color
  const scoreColor =
    schedule.score >= 90
      ? 'from-emerald-500 to-teal-500 border-emerald-500/40 text-emerald-300'
      : schedule.score >= 75
      ? 'from-amber-500 to-orange-500 border-amber-500/40 text-amber-300'
      : 'from-rose-500 to-pink-500 border-rose-500/40 text-rose-300';

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* 1. Timetable Action Bar & Navigation */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        {/* Left: Schedule Rank Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onSetRank(Math.max(0, currentRank - 1))}
            disabled={currentRank === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-white transition-colors"
            title="Previous Routine (Left Arrow)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-semibold">
            <span className="text-slate-400">Rank</span>
            <span className="text-white font-bold">{currentRank + 1}</span>
            <span className="text-slate-500">of</span>
            <span className="text-slate-300">{totalSchedules}</span>
          </div>

          <button
            onClick={() => onSetRank(Math.min(totalSchedules - 1, currentRank + 1))}
            disabled={currentRank >= totalSchedules - 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-white transition-colors"
            title="Next Routine (Right Arrow)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {isTruncated && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30"
              title="Search reached node/timeout limit. Showing top 50 discovered."
            >
              Top 50 Shown
            </span>
          )}
        </div>

        {/* Center: Overall Score Badge with Breakdown Tooltip */}
        <div className="relative group/score">
          <div
            className={`px-3 py-1 rounded-xl bg-gradient-to-r ${scoreColor} border flex items-center gap-1.5 shadow-sm cursor-pointer`}
          >
            <span className="text-xs font-medium text-slate-300">Score</span>
            <span className="text-sm font-black text-white">{schedule.score}</span>
            <span className="text-xs text-white/70">/100</span>
            <Info className="w-3.5 h-3.5 text-white/70 ml-0.5" />
          </div>

          {/* Hover Tooltip Breakdown */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 text-xs hidden group-hover/score:block animate-in fade-in zoom-in-95">
            <div className="font-semibold text-white mb-2 pb-1 border-b border-slate-800 flex justify-between">
              <span>Score Breakdown</span>
              <span className="text-orange-400 font-bold">{schedule.score}/100</span>
            </div>
            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span>Faculty Preference:</span>
                <span className="font-mono text-emerald-400">
                  {schedule.breakdown.facultyScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Gap Compactness:</span>
                <span className="font-mono text-sky-400">
                  {schedule.breakdown.gapScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Day Compactness:</span>
                <span className="font-mono text-indigo-400">
                  {schedule.breakdown.dayCompactScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Time Preference:</span>
                <span className="font-mono text-amber-400">
                  {schedule.breakdown.timePreferenceScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tentative Penalty:</span>
                <span className="font-mono text-rose-400">
                  {schedule.breakdown.tentativePenalty}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center space-x-1.5">
          {/* Favorite */}
          <button
            onClick={() => onToggleFavorite(schedule)}
            className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 ${
              isFavorite
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Save to favorites (Key: F)"
          >
            <Star
              className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`}
            />
          </button>

          {/* Lock all */}
          <button
            onClick={() => onLockAllSections(schedule)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors hidden sm:flex items-center gap-1"
            title="Lock this section combination"
          >
            <Lock className="w-4 h-4 text-orange-400" />
            <span className="hidden xl:inline">Lock All</span>
          </button>

          {/* Copy for UCAM */}
          <button
            onClick={handleCopyUCAM}
            className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all"
            title="Copy formatted text to enter into UIU UCAM"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy UCAM'}</span>
          </button>

          {/* Export iCal */}
          <button
            onClick={handleExportICS}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
            title="Download iCal (.ics) Calendar"
          >
            <CalendarIcon className="w-4 h-4" />
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors hidden sm:block"
            title="Print or Save PDF (Key: P)"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Stats Chips & Conflict-Free Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Conflict-Free</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700 font-medium">
            {schedule.stats.credits} Credits
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700 font-medium">
            {schedule.stats.daysUsed.length} Days/Week ({schedule.stats.daysUsed.join(', ')})
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700 font-medium">
            {schedule.stats.totalGapMinutes === 0
              ? 'Zero Gaps (Back-to-Back)'
              : `${schedule.stats.totalGapMinutes}m Gaps`}
          </div>

          {schedule.stats.tentativeCount > 0 ? (
            <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{schedule.stats.tentativeCount} Tentative Section(s)</span>
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-400 border border-slate-700 font-medium">
              0 Tentative
            </div>
          )}
        </div>
      </div>

      {/* 3. Interactive Weekly Timetable Grid */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-3 sm:p-5 backdrop-blur-md overflow-x-auto print:bg-white print:border-black print:p-0">
        <div className="min-w-[700px]">
          {/* Day Headers */}
          <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-2 pb-3 border-b border-slate-800 text-center font-bold text-xs uppercase tracking-wider text-slate-400">
            <div>Time</div>
            {DAYS_LIST.map((day) => {
              const hasClasses = meetingsByDay[day].length > 0;
              return (
                <div
                  key={day}
                  className={`py-1.5 rounded-lg border transition-colors ${
                    hasClasses
                      ? 'bg-slate-800/60 text-slate-200 border-slate-700/60'
                      : 'bg-slate-950/40 text-slate-600 border-transparent'
                  }`}
                >
                  <span>{day}</span>
                  {hasClasses && (
                    <span className="block text-[10px] font-normal text-slate-400 lowercase">
                      {meetingsByDay[day].length} class
                      {meetingsByDay[day].length > 1 ? 'es' : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Timetable Body (480 minutes total, from 510 to 990 min) */}
          <div className="relative grid grid-cols-[64px_repeat(5,1fr)] gap-2 h-[600px] mt-2">
            {/* Left Time Axis */}
            <div className="relative h-full select-none text-[10px] font-mono text-slate-500">
              {TIME_SLOTS.map((slot) => {
                const topPct = ((slot.min - 510) / 480) * 100;
                return (
                  <div
                    key={slot.min}
                    style={{ top: `${topPct}%` }}
                    className="absolute -translate-y-1/2 right-2 text-right"
                  >
                    {slot.label}
                  </div>
                );
              })}
            </div>

            {/* Horizontal Grid Slot Lines across all days */}
            <div className="col-span-5 absolute inset-y-0 right-0 left-[64px] pointer-events-none">
              {TIME_SLOTS.map((slot) => {
                const topPct = ((slot.min - 510) / 480) * 100;
                return (
                  <div
                    key={slot.min}
                    style={{ top: `${topPct}%` }}
                    className="absolute left-0 right-0 border-t border-slate-800/60"
                  />
                );
              })}
            </div>

            {/* 5 Day Columns */}
            {DAYS_LIST.map((day) => {
              const dayMeetings = meetingsByDay[day];
              return (
                <div
                  key={day}
                  className="relative h-full rounded-xl bg-slate-950/30 border border-slate-800/40"
                >
                  {dayMeetings.map(({ section, meeting }) => {
                    const topPct = ((meeting.start - 510) / 480) * 100;
                    const heightPct = ((meeting.end - meeting.start) / 480) * 100;
                    const color = getCourseColor(section.courseCode);

                    return (
                      <div
                        key={`${section.id}-${meeting.day}-${meeting.start}`}
                        style={{
                          top: `${topPct}%`,
                          height: `${heightPct}%`,
                        }}
                        onMouseEnter={() => setHoveredSection({ section, meeting })}
                        onMouseLeave={() => setHoveredSection(null)}
                        className={`absolute left-1 right-1 p-2 rounded-xl border backdrop-blur-md transition-all duration-150 cursor-pointer overflow-hidden z-10 flex flex-col justify-between ${
                          color.bg
                        } ${color.border} ${
                          section.tentative ? 'border-dashed' : ''
                        } hover:scale-[1.02] hover:z-20 hover:shadow-xl`}
                      >
                        {/* Top: Course Code + Section */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-xs text-white tracking-tight truncate">
                            {section.courseCode}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${color.badgeBg}`}
                          >
                            Sec {section.section}
                          </span>
                        </div>

                        {/* Middle: Title */}
                        <div
                          className="text-[11px] font-medium text-slate-200 line-clamp-2 leading-tight"
                          title={section.title}
                        >
                          {section.title}
                        </div>

                        {/* Bottom: Room + Faculty */}
                        <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1 border-t border-white/10">
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            {meeting.room || 'TBA'}
                          </span>
                          <span className="truncate max-w-[80px]" title={section.faculty.join(', ')}>
                            {section.faculty[0] || 'TBA'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Hover Detail Card / Popover */}
      {hoveredSection && (
        <div className="fixed bottom-6 right-6 max-w-sm p-4 bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl z-50 text-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div>
              <span className="font-bold text-sm text-white">
                {hoveredSection.section.courseCode}
              </span>
              <span className="ml-2 px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
                Sec {hoveredSection.section.section}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
              {hoveredSection.section.credit} Credit(s)
            </span>
          </div>

          <div className="space-y-1.5 text-slate-300">
            <div className="font-medium text-white">
              {hoveredSection.section.title}
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>
                {hoveredSection.meeting.day}{' '}
                {formatTime24(hoveredSection.meeting.start)} –{' '}
                {formatTime24(hoveredSection.meeting.end)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Room: {hoveredSection.meeting.room || 'TBA'}</span>
            </div>

            <div className="flex items-start gap-1.5 text-slate-400">
              <User className="w-3.5 h-3.5 text-sky-400 mt-0.5 flex-shrink-0" />
              <span>Faculty: {hoveredSection.section.faculty.join(', ')}</span>
            </div>

            {hoveredSection.section.tentative && (
              <div className="text-[11px] p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Note: Tentative section / subject to enrollment.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
