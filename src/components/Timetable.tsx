'use client';

import React, { useState } from 'react';
import { Day, DAYS_LIST, Meeting, ScheduleResult, Section } from '../types';
import { getCourseColor } from '../utils/colors';
import { formatTime24, exportToText, exportToICS, downloadFile } from '../utils/export';
import { isFixedCourse } from '../lib/fixedCourses';
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
  previewSection?: Section | null;
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
  previewSection,
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

  const scoreBadgeBg =
    schedule.score >= 90
      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
      : schedule.score >= 75
      ? 'bg-amber-50 text-amber-700 border-amber-300'
      : 'bg-rose-50 text-rose-700 border-rose-300';

  return (
    <div className="flex-1 flex flex-col space-y-3.5">
      {/* 1. Timetable Toolbar & Navigation */}
      <div className="bg-surface p-3.5 rounded-card border border-app-border shadow-warm flex flex-wrap items-center justify-between gap-3">
        {/* Left: Schedule Rank Navigation */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onSetRank(Math.max(0, currentRank - 1))}
            disabled={currentRank === 0}
            className="p-1.5 rounded-btn bg-surface hover:bg-subtle disabled:opacity-30 disabled:pointer-events-none text-text-primary border border-app-border transition-colors"
            title="Previous Routine (Left Arrow)"
            aria-label="Previous routine"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1.5 px-3 py-1 bg-subtle rounded-btn border border-app-border text-xs font-semibold">
            <span className="text-text-muted">Routine</span>
            <span className="text-orange-600 font-bold">#{currentRank + 1}</span>
            <span className="text-text-muted">of</span>
            <span className="text-text-secondary">{totalSchedules}</span>
          </div>

          <button
            onClick={() => onSetRank(Math.min(totalSchedules - 1, currentRank + 1))}
            disabled={currentRank >= totalSchedules - 1}
            className="p-1.5 rounded-btn bg-surface hover:bg-subtle disabled:opacity-30 disabled:pointer-events-none text-text-primary border border-app-border transition-colors"
            title="Next Routine (Right Arrow)"
            aria-label="Next routine"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {isTruncated && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 font-medium"
              title="Search reached node/timeout limit. Showing top 50 discovered."
            >
              Top 50 Shown
            </span>
          )}
        </div>

        {/* Center: Overall Score Badge with Breakdown Popover */}
        <div className="relative group/score">
          <div
            className={`px-3 py-1 rounded-full border ${scoreBadgeBg} flex items-center gap-1.5 shadow-xs cursor-pointer font-semibold text-xs`}
          >
            <span>Score:</span>
            <span className="font-extrabold text-sm">{schedule.score}</span>
            <span className="text-[11px] opacity-75">/100</span>
            <Info className="w-3.5 h-3.5 opacity-70 ml-0.5" />
          </div>

          {/* Hover Tooltip Breakdown */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-surface border border-app-border rounded-card shadow-warm z-50 text-xs hidden group-hover/score:block animate-in fade-in">
            <div className="font-semibold text-text-primary mb-2 pb-1 border-b border-app-border flex justify-between">
              <span>Score Breakdown</span>
              <span className="text-orange-600 font-bold">{schedule.score}/100</span>
            </div>
            <div className="space-y-1.5 text-text-secondary">
              <div className="flex justify-between">
                <span>Faculty Preference:</span>
                <span className="font-mono font-semibold text-emerald-600">
                  {schedule.breakdown.facultyScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Gap Compactness:</span>
                <span className="font-mono font-semibold text-sky-600">
                  {schedule.breakdown.gapScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Day Compactness:</span>
                <span className="font-mono font-semibold text-indigo-600">
                  {schedule.breakdown.dayCompactScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Time Preference:</span>
                <span className="font-mono font-semibold text-amber-600">
                  {schedule.breakdown.timePreferenceScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tentative Penalty:</span>
                <span className="font-mono font-semibold text-rose-600">
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
            className={`p-2 rounded-btn border text-xs font-medium transition-colors flex items-center gap-1 ${
              isFavorite
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-surface hover:bg-subtle text-text-secondary border-app-border'
            }`}
            title="Save to favorites (Key: F)"
            aria-label="Save to favorites"
          >
            <Star
              className={`w-4 h-4 ${isFavorite ? 'fill-amber-500 text-amber-500' : ''}`}
            />
          </button>

          {/* Lock all */}
          <button
            onClick={() => onLockAllSections(schedule)}
            className="px-2.5 py-1.5 rounded-btn bg-surface hover:bg-subtle text-text-secondary hover:text-text-primary border border-app-border text-xs font-medium transition-colors hidden sm:flex items-center gap-1"
            title="Lock this section combination"
          >
            <Lock className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden xl:inline">Lock All</span>
          </button>

          {/* Copy for UCAM */}
          <button
            onClick={handleCopyUCAM}
            className="px-3 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            title="Copy formatted text to enter into UIU UCAM"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy UCAM'}</span>
          </button>

          {/* Export iCal */}
          <button
            onClick={handleExportICS}
            className="p-2 rounded-btn bg-surface hover:bg-subtle text-text-secondary hover:text-text-primary border border-app-border text-xs font-medium transition-colors"
            title="Download iCal (.ics) Calendar"
            aria-label="Export iCal"
          >
            <CalendarIcon className="w-4 h-4" />
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="p-2 rounded-btn bg-surface hover:bg-subtle text-text-secondary hover:text-text-primary border border-app-border text-xs font-medium transition-colors hidden sm:block"
            title="Print or Save PDF (Key: P)"
            aria-label="Print timetable"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Stats Chips & Conflict-Free Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-chip bg-emerald-50 text-emerald-800 border border-emerald-300 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Conflict-Free</span>
          </div>

          <div className="px-2.5 py-1 rounded-chip bg-surface text-text-secondary border border-app-border font-medium shadow-2xs">
            {schedule.stats.credits} Credits
          </div>

          <div className="px-2.5 py-1 rounded-chip bg-surface text-text-secondary border border-app-border font-medium shadow-2xs">
            {schedule.stats.daysUsed.length} Days/Week ({schedule.stats.daysUsed.join(', ')})
          </div>

          <div className="px-2.5 py-1 rounded-chip bg-surface text-text-secondary border border-app-border font-medium shadow-2xs">
            {schedule.stats.totalGapMinutes === 0
              ? 'Zero Gaps (Back-to-Back)'
              : `${schedule.stats.totalGapMinutes}m Gaps`}
          </div>

          {schedule.stats.tentativeCount > 0 ? (
            <div className="px-2.5 py-1 rounded-chip bg-amber-50 text-amber-800 border border-amber-300 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{schedule.stats.tentativeCount} Tentative Section(s)</span>
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-chip bg-surface text-text-muted border border-app-border font-medium">
              0 Tentative
            </div>
          )}
        </div>
      </div>

      {/* 3. Interactive Weekly Timetable Grid */}
      <div className="bg-surface rounded-card border border-app-border p-3 sm:p-4 shadow-warm overflow-x-auto print:border-black print:p-0">
        <div className="min-w-[720px]">
          {/* Day Headers (Sticky) */}
          <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-2 pb-2.5 border-b border-app-border text-center font-bold text-xs uppercase tracking-wider text-text-muted">
            <div className="py-1">Time</div>
            {DAYS_LIST.map((day) => {
              const hasClasses = meetingsByDay[day].length > 0;
              return (
                <div
                  key={day}
                  className={`py-1.5 rounded-btn border transition-colors ${
                    hasClasses
                      ? 'bg-subtle text-text-primary border-app-border font-bold'
                      : 'bg-page text-text-muted border-transparent'
                  }`}
                >
                  <span>{day}</span>
                  {hasClasses && (
                    <span className="block text-[10px] font-normal text-text-secondary lowercase">
                      {meetingsByDay[day].length} class
                      {meetingsByDay[day].length > 1 ? 'es' : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Timetable Body (480 minutes total, from 510 to 990 min) */}
          <div className="relative grid grid-cols-[64px_repeat(5,1fr)] gap-2 h-[600px] mt-2 bg-white">
            {/* Left Time Axis */}
            <div className="relative h-full select-none text-[10px] font-mono text-text-muted">
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
                    className="absolute left-0 right-0 border-t border-app-border/80"
                  />
                );
              })}
            </div>

            {/* 5 Day Columns with light row banding (#FFFCF9) */}
            {DAYS_LIST.map((day, dIdx) => {
              const dayMeetings = meetingsByDay[day];
              return (
                <div
                  key={day}
                  className={`relative h-full rounded-btn border border-app-border ${
                    dIdx % 2 === 0 ? 'bg-[#FFFFFF]' : 'bg-[#FFFCF9]'
                  }`}
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
                        className={`absolute left-1 right-1 p-2 rounded-btn border-l-4 border shadow-xs transition-all duration-150 cursor-pointer overflow-hidden z-10 flex flex-col justify-between ${
                          color.bg
                        } ${color.border} ${
                          section.tentative ? 'border-dashed' : ''
                        } hover:scale-[1.01] hover:z-20 hover:shadow-warm`}
                      >
                        {/* Top: Course Code + Section */}
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-extrabold text-xs tracking-tight truncate ${color.text}`}>
                            {section.courseCode}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${
                              section.fixed || isFixedCourse(section.courseCode)
                                ? 'bg-amber-100/90 text-amber-900 border-amber-300'
                                : color.badgeBg
                            }`}
                          >
                            {(section.fixed || isFixedCourse(section.courseCode)) && (
                              <Lock className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                            )}
                            <span>
                              {section.fixed || isFixedCourse(section.courseCode) ? 'Fixed • ' : ''}Sec {section.section}
                            </span>
                          </span>
                        </div>

                        {/* Middle: Title */}
                        <div
                          className={`text-[11px] font-medium line-clamp-2 leading-tight ${color.text} opacity-90`}
                          title={section.title}
                        >
                          {section.title}
                        </div>

                        {/* Bottom: Room + Faculty */}
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-black/10 text-text-secondary">
                          <span className="flex items-center gap-0.5 truncate font-medium">
                            <MapPin className="w-3 h-3 text-text-muted flex-shrink-0" />
                            {meeting.room || 'TBA'}
                          </span>
                          <span className="truncate max-w-[85px] font-medium" title={section.faculty.join(', ')}>
                            {section.faculty[0] || 'TBA'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {/* Faint dashed ghost block for explorer section preview */}
                  {previewSection &&
                    previewSection.meetings
                      .filter((m) => m.day === day)
                      .map((m, mIdx) => {
                        const topPct = ((m.start - 510) / 480) * 100;
                        const heightPct = ((m.end - m.start) / 480) * 100;
                        return (
                          <div
                            key={`preview-${mIdx}`}
                            style={{ top: `${topPct}%`, height: `${heightPct}%` }}
                            className="absolute left-1 right-1 p-2 rounded-btn border-2 border-dashed border-orange-500 bg-orange-500/20 pointer-events-none z-30 flex flex-col justify-between shadow-warm"
                          >
                            <div className="font-extrabold text-xs text-orange-900">
                              {previewSection.courseCode} (Sec {previewSection.section})
                            </div>
                            <div className="text-[10px] text-orange-950 font-bold">
                              Previewing slot
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
        <div className="fixed bottom-6 right-6 max-w-sm p-4 bg-surface border border-border-strong rounded-card shadow-warm z-50 text-xs animate-in fade-in">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-app-border">
            <div>
              <span className="font-bold text-sm text-text-primary">
                {hoveredSection.section.courseCode}
              </span>
              <span className="ml-2 px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200 font-bold">
                Sec {hoveredSection.section.section}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-subtle text-text-secondary border border-app-border font-semibold">
              {hoveredSection.section.credit} Credit(s)
            </span>
          </div>

          <div className="space-y-1.5 text-text-secondary">
            <div className="font-medium text-text-primary">
              {hoveredSection.section.title}
            </div>

            <div className="flex items-center gap-1.5 text-text-muted">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-text-secondary">
                {hoveredSection.meeting.day}{' '}
                {formatTime24(hoveredSection.meeting.start)} –{' '}
                {formatTime24(hoveredSection.meeting.end)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-text-muted">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-text-secondary">Room: {hoveredSection.meeting.room || 'TBA'}</span>
            </div>

            <div className="flex items-start gap-1.5 text-text-muted">
              <User className="w-3.5 h-3.5 text-sky-600 mt-0.5 flex-shrink-0" />
              <span className="text-text-secondary">Faculty: {hoveredSection.section.faculty.join(', ')}</span>
            </div>

            {hoveredSection.section.tentative && (
              <div className="text-[11px] p-1.5 rounded bg-amber-50 border border-amber-300 text-amber-800 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Note: Tentative section / subject to enrollment.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
