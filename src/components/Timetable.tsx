'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Day, DAYS_LIST, Meeting, ScheduleResult, Section } from '../types';
import { getCourseColor } from '../utils/colors';
import { formatTime24, exportToText, exportToICS, downloadFile } from '../utils/export';
import { isFixedCourse } from '../lib/fixedCourses';
import { DayListTimetable } from './DayListTimetable';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Bookmark,
  CheckCircle2,
  Copy,
  Calendar as CalendarIcon,
  Printer,
  Lock,
  Pencil,
  AlertCircle,
  Clock,
  MapPin,
  User,
  Info,
  Check,
  X,
  CalendarDays,
  ListFilter,
  Unlock,
  ChevronDown,
} from 'lucide-react';
import { getLockStatus } from '../lib/lockUtils';

interface TimetableProps {
  schedule: ScheduleResult;
  currentRank: number; // 0-indexed
  totalSchedules: number;
  onSetRank: (rank: number) => void;
  onLockAllSections: (schedule: ScheduleResult) => void;
  lockedSections?: Record<string, string>;
  onUnlockAllSections?: () => void;
  onLockRemainingSections?: (schedule: ScheduleResult) => void;
  onUnlockCourse?: (courseCode: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (schedule: ScheduleResult) => void;
  isSaved?: boolean;
  onOpenSavePopover?: () => void;
  savePopoverContent?: React.ReactNode;
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
  lockedSections = {},
  onUnlockAllSections,
  onLockRemainingSections,
  onUnlockCourse,
  isFavorite,
  onToggleFavorite,
  isSaved,
  onOpenSavePopover,
  savePopoverContent,
  isTruncated,
  previewSection,
}: TimetableProps) {
  const [copied, setCopied] = useState(false);
  const [isLockMenuOpen, setIsLockMenuOpen] = useState(false);
  const lockMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (lockMenuRef.current && !lockMenuRef.current.contains(e.target as Node)) {
        setIsLockMenuOpen(false);
      }
    };
    if (isLockMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLockMenuOpen]);

  const lockStatus = React.useMemo(
    () => getLockStatus(schedule.sections, lockedSections),
    [schedule.sections, lockedSections]
  );
  const [hoveredSection, setHoveredSection] = useState<{
    section: Section;
    meeting: Meeting;
  } | null>(null);

  // Mobile segmented control: Day list vs Week view (defaults to Day list on mobile)
  const [mobileViewMode, setMobileViewMode] = useState<'daylist' | 'week'>('daylist');

  // Mobile bottom sheets for section details and score breakdown
  const [activeSheetSection, setActiveSheetSection] = useState<{
    section: Section;
    meeting: Meeting;
  } | null>(null);
  const [isScoreSheetOpen, setIsScoreSheetOpen] = useState(false);

  // Touch swipe gesture refs for switching routines
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Detect horizontal swipe with minimum 50px delta and 1.5:1 horizontal ratio to not block vertical scroll
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && currentRank < totalSchedules - 1) {
        onSetRank(currentRank + 1);
      } else if (dx > 0 && currentRank > 0) {
        onSetRank(currentRank - 1);
      }
    }
  };

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
    <div
      className="flex-1 flex flex-col space-y-3.5 select-none sm:select-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 0. Mobile Segmented View Toggle: Day list vs Week grid (< 768px only) */}
      <div className="md:hidden flex items-center justify-between bg-surface p-1 rounded-card border border-app-border shadow-2xs">
        <button
          type="button"
          onClick={() => setMobileViewMode('daylist')}
          className={`flex-1 min-h-[40px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-btn text-xs font-bold transition-all ${
            mobileViewMode === 'daylist'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Day list</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileViewMode('week')}
          className={`flex-1 min-h-[40px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-btn text-xs font-bold transition-all ${
            mobileViewMode === 'week'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Week grid</span>
        </button>
      </div>

      {/* 1. Timetable Toolbar & Navigation */}
      <div className="bg-surface p-3 sm:p-3.5 rounded-card border border-app-border shadow-warm flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Schedule Rank Navigation */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onSetRank(Math.max(0, currentRank - 1))}
            disabled={currentRank === 0}
            className="min-w-[40px] min-h-[40px] p-2 rounded-btn bg-surface hover:bg-subtle disabled:opacity-30 disabled:pointer-events-none text-text-primary border border-app-border transition-colors flex items-center justify-center"
            title="Previous Routine (Left Arrow / Swipe Right)"
            aria-label="Previous routine"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 bg-subtle rounded-btn border border-app-border text-xs font-semibold">
            <span className="text-text-muted">Routine</span>
            <span className="text-orange-600 font-bold">#{currentRank + 1}</span>
            <span className="text-text-muted">of</span>
            <span className="text-text-secondary">{totalSchedules}</span>
          </div>

          <button
            onClick={() => onSetRank(Math.min(totalSchedules - 1, currentRank + 1))}
            disabled={currentRank >= totalSchedules - 1}
            className="min-w-[40px] min-h-[40px] p-2 rounded-btn bg-surface hover:bg-subtle disabled:opacity-30 disabled:pointer-events-none text-text-primary border border-app-border transition-colors flex items-center justify-center"
            title="Next Routine (Right Arrow / Swipe Left)"
            aria-label="Next routine"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {isTruncated && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 font-medium hidden sm:inline"
              title="Search reached node/timeout limit. Showing top 50 discovered."
            >
              Top 50
            </span>
          )}
        </div>

        {/* Center: Overall Score Badge with Breakdown Popover / Bottom sheet */}
        <div className="relative group/score">
          <button
            type="button"
            onClick={() => setIsScoreSheetOpen(true)}
            className={`px-3 py-1.5 rounded-full border ${scoreBadgeBg} flex items-center gap-1.5 shadow-xs cursor-pointer font-semibold text-xs active:scale-[0.98] transition-transform`}
            title="Tap to see score breakdown"
          >
            <span>Score:</span>
            <span className="font-extrabold text-sm">{schedule.score}</span>
            <span className="text-[11px] opacity-75">/100</span>
            <Info className="w-3.5 h-3.5 opacity-70 ml-0.5" />
          </button>

          {/* Desktop Hover Tooltip Breakdown */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-surface border border-app-border rounded-card shadow-warm z-50 text-xs hidden md:group-hover/score:block animate-in fade-in pointer-events-none">
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
        <div className="relative flex items-center space-x-1.5">
          {/* Favorite */}
          <button
            onClick={() => onToggleFavorite(schedule)}
            className={`p-2 min-h-[38px] min-w-[38px] rounded-btn border text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
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

          {/* Save Routine */}
          {onOpenSavePopover && (
            <button
              onClick={onOpenSavePopover}
              className={`px-3 py-1.5 min-h-[38px] rounded-btn border text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs ${
                isSaved
                  ? 'bg-orange-50 text-orange-700 border-orange-500 hover:bg-orange-100 ring-1 ring-orange-500/20'
                  : 'bg-surface hover:bg-orange-50/80 text-orange-600 hover:text-orange-700 border-orange-400 hover:border-orange-500'
              }`}
              title={isSaved ? 'Routine saved in My Routines (Click to edit)' : 'Save routine to My Routines'}
              aria-label={isSaved ? 'Routine saved in My Routines' : 'Save routine to My Routines'}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${
                  isSaved ? 'fill-orange-500 text-orange-500' : 'text-orange-500'
                }`}
              />
              <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save routine'}</span>
            </button>
          )}

          {/* Lock / Unlock Toggle Button */}
          <div ref={lockMenuRef} className="relative flex items-center">
            {lockStatus.isNoneLocked ? (
              <button
                type="button"
                onClick={() => onLockAllSections(schedule)}
                className="px-2.5 py-1.5 min-h-[38px] rounded-btn bg-surface hover:bg-subtle text-text-secondary hover:text-text-primary border border-app-border text-xs font-medium transition-colors flex items-center gap-1 shadow-2xs active:scale-[0.98]"
                title="Lock this section combination"
                aria-label="Lock all sections"
              >
                <Lock className="w-3.5 h-3.5 text-orange-500" />
                <span className="hidden xl:inline">Lock All</span>
              </button>
            ) : lockStatus.isAllLocked ? (
              <button
                type="button"
                onClick={() => onUnlockAllSections?.()}
                className="px-2.5 py-1.5 min-h-[38px] rounded-btn bg-orange-500 hover:bg-orange-600 text-white border border-orange-600 text-xs font-semibold shadow-xs transition-colors flex items-center gap-1 active:scale-[0.98]"
                title="Unlock all sections"
                aria-label="Unlock all sections"
              >
                <Unlock className="w-3.5 h-3.5 text-white" />
                <span className="hidden xl:inline">Unlock All</span>
              </button>
            ) : (
              /* Partially locked */
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => onUnlockAllSections?.()}
                  className="px-2.5 py-1.5 min-h-[38px] rounded-l-btn bg-orange-50 hover:bg-orange-100 text-orange-700 border border-r-0 border-orange-300 text-xs font-semibold transition-colors flex items-center gap-1 active:scale-[0.98]"
                  title={`Unlock ${lockStatus.lockedCount} locked sections`}
                  aria-label={`Unlock ${lockStatus.lockedCount} locked sections`}
                >
                  <Unlock className="w-3.5 h-3.5 text-orange-600" />
                  <span>Unlock ({lockStatus.lockedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLockMenuOpen((prev) => !prev)}
                  className="px-1.5 py-1.5 min-h-[38px] rounded-r-btn bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-300 text-xs font-semibold transition-colors flex items-center justify-center active:scale-[0.98]"
                  title="More lock options"
                  aria-label="More lock options"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-orange-600" />
                </button>

                {isLockMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-app-border rounded-card shadow-warm py-1 z-50 text-xs animate-in fade-in slide-in-from-top-1">
                    <button
                      type="button"
                      onClick={() => {
                        onLockRemainingSections?.(schedule);
                        setIsLockMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-text-primary hover:bg-subtle flex items-center gap-2 font-medium transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5 text-orange-500" />
                      <span>Lock remaining ({lockStatus.remainingLockable.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUnlockAllSections?.();
                        setIsLockMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-text-primary hover:bg-subtle flex items-center gap-2 font-medium border-t border-app-border transition-colors"
                    >
                      <Unlock className="w-3.5 h-3.5 text-orange-500" />
                      <span>Unlock all</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

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

          {/* Save Routine Popover */}
          {savePopoverContent}
        </div>
      </div>

      {/* 2. Stats Chips & Conflict-Free Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-chip bg-emerald-50 text-emerald-800 border border-emerald-300 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Conflict-Free</span>
          </div>

          {lockStatus.lockedCount > 0 && (
            <div
              data-testid="locked-stats-chip"
              className="px-2.5 py-1 rounded-chip bg-orange-50 text-orange-800 border border-orange-300 font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <Lock className="w-3 h-3 text-orange-600 shrink-0" />
              <span>{lockStatus.lockedCount} locked</span>
              {onUnlockAllSections && (
                <button
                  type="button"
                  onClick={onUnlockAllSections}
                  className="text-orange-600 hover:text-orange-950 p-0.5 rounded-full hover:bg-orange-200 transition-colors"
                  title="Unlock all sections"
                  aria-label="Unlock all sections"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

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

      {/* 3. Mobile Day List View (when selected on < 768px) */}
      <div className={mobileViewMode === 'daylist' ? 'block md:hidden' : 'hidden'}>
        <DayListTimetable
          schedule={schedule}
          onSelectSection={(sec, m) => setActiveSheetSection({ section: sec, meeting: m })}
          previewSection={previewSection}
        />
      </div>

      {/* 4. Interactive Weekly Timetable Grid (shown when 'week' on mobile or always on desktop >= 768px) */}
      <div
        className={`bg-surface rounded-card border border-app-border p-3 sm:p-4 shadow-warm overflow-x-auto print:border-black print:p-0 ${
          mobileViewMode === 'week' ? 'block' : 'hidden md:block'
        }`}
      >
        <div className="min-w-[720px]">
          {/* Day Headers (Sticky) */}
          <div className="grid grid-cols-[56px_repeat(5,minmax(0,1fr))] gap-2 pb-2.5 border-b border-app-border text-center font-bold text-xs uppercase tracking-wider text-text-muted">
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
                    <span className="block text-[11px] font-normal text-text-secondary lowercase">
                      {meetingsByDay[day].length} class
                      {meetingsByDay[day].length > 1 ? 'es' : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Timetable Body (480 minutes total, from 510 to 990 min) */}
          <div className="relative grid grid-cols-[56px_repeat(5,minmax(0,1fr))] gap-2 h-[600px] mt-2 bg-white">
            {/* Left Time Axis */}
            <div className="relative h-full select-none text-[11px] font-mono text-text-muted">
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
            <div className="col-span-5 absolute inset-y-0 right-0 left-[56px] pointer-events-none">
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
                        onClick={() => setActiveSheetSection({ section, meeting })}
                        onMouseEnter={() => setHoveredSection({ section, meeting })}
                        onMouseLeave={() => setHoveredSection(null)}
                        className={`absolute left-1 right-1 p-2 rounded-btn border-l-4 border shadow-xs transition-all duration-150 cursor-pointer overflow-hidden z-10 flex flex-col justify-between ${
                          color.bg
                        } ${color.border} ${
                          section.tentative ? 'border-dashed' : ''
                        } hover:scale-[1.01] hover:z-20 hover:shadow-warm`}
                      >
                        {/* Top: Course Code + Section */}
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <span className={`font-extrabold text-xs tracking-tight truncate ${color.text}`}>
                            {section.courseCode}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {!isFixedCourse(section.courseCode) &&
                              !section.manual &&
                              lockedSections?.[section.courseCode] === section.id &&
                              onUnlockCourse && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUnlockCourse(section.courseCode);
                                  }}
                                  className="p-0.5 rounded hover:bg-black/10 text-orange-600 transition-colors"
                                  title="Locked - click to unlock"
                                  aria-label={`Unlock ${section.courseCode}`}
                                >
                                  <Lock className="w-3 h-3" />
                                </button>
                              )}
                            <span
                              className={`text-[11px] font-bold px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${
                                section.manual || section.fixed || isFixedCourse(section.courseCode)
                                  ? 'bg-amber-100/90 text-amber-900 border-amber-300'
                                  : color.badgeBg
                              }`}
                            >
                              {section.manual ? (
                                <Pencil className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                              ) : (section.fixed || isFixedCourse(section.courseCode)) ? (
                                <Lock className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                              ) : null}
                              <span>
                                {section.manual
                                  ? 'Manual • '
                                  : section.fixed || isFixedCourse(section.courseCode)
                                  ? 'Fixed • '
                                  : section.updated
                                  ? 'Updated • '
                                  : ''}Sec {section.section}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Middle: Title */}
                        <div
                          className={`text-[11px] font-medium line-clamp-2 leading-tight ${color.text} opacity-90`}
                          title={section.title}
                        >
                          {section.title}
                        </div>

                        {/* Bottom: Room + Faculty */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-black/10 text-text-secondary">
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
                            <div className="text-[11px] text-orange-950 font-bold">
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

      {/* 5. Desktop Hover Detail Card / Popover */}
      {hoveredSection && !activeSheetSection && (
        <div className="fixed bottom-6 right-6 max-w-sm p-4 bg-surface border border-border-strong rounded-card shadow-warm z-50 text-xs animate-in fade-in hidden sm:block pointer-events-none">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-app-border">
            <div>
              <span className="font-bold text-sm text-text-primary">
                {hoveredSection.section.courseCode}
              </span>
              <span className="ml-2 px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200 font-bold">
                Sec {hoveredSection.section.section}
              </span>
              {hoveredSection.section.updated && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-bold text-[11px]">
                  Updated
                </span>
              )}
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

      {/* 6. Mobile Bottom Sheet: Section Details */}
      {activeSheetSection && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActiveSheetSection(null)}
        >
          <div
            className="w-full max-w-lg bg-surface border-t sm:border border-app-border rounded-t-2xl sm:rounded-card p-4 sm:p-5 shadow-2xl space-y-4 max-h-[85dvh] overflow-y-auto safe-pb"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-app-border">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-lg text-text-primary">
                    {activeSheetSection.section.courseCode}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-bold text-xs border border-orange-200">
                    Sec {activeSheetSection.section.section}
                  </span>
                  {activeSheetSection.section.updated && (
                    <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold text-xs border border-sky-200">
                      Updated
                    </span>
                  )}
                  <span className="text-xs text-text-muted font-medium">
                    ({activeSheetSection.section.credit} cr • {activeSheetSection.section.kind})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSheetSection(null)}
                className="min-h-[44px] min-w-[44px] p-2 rounded-full hover:bg-subtle text-text-muted hover:text-text-primary flex items-center justify-center transition-colors shrink-0"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-text-muted block font-medium">Course Title</span>
                <span className="font-semibold text-text-primary text-base">
                  {activeSheetSection.section.title}
                </span>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 py-2 px-3 rounded-btn bg-subtle/70 border border-app-border">
                <div>
                  <span className="text-[11px] text-text-muted block">Class Time</span>
                  <span className="font-bold text-text-primary text-xs flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>
                      {activeSheetSection.meeting.day}{' '}
                      {formatTime24(activeSheetSection.meeting.start)} –{' '}
                      {formatTime24(activeSheetSection.meeting.end)}
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-text-muted block">Room</span>
                  <span className="font-bold text-text-primary text-xs flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{activeSheetSection.meeting.room || 'Room TBA'}</span>
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-text-muted block font-medium">Assigned Faculty</span>
                <span className="font-semibold text-text-primary text-sm flex items-center gap-1.5 mt-0.5">
                  <User className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>{activeSheetSection.section.faculty.join(', ') || 'Faculty TBA'}</span>
                </span>
              </div>

              {activeSheetSection.section.tentative && (
                <div className="p-3 rounded-btn bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Note: This is a tentative section that may be adjusted depending on student enrollment.</span>
                </div>
              )}

              {activeSheetSection.section.updated && (
                <div className="p-3 rounded-btn bg-sky-50 border border-sky-300 text-sky-800 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Updated section:</strong>{' '}
                    {activeSheetSection.section.updatedNote || 'Faculty assignment was updated in the UIU UCAM portal.'}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center gap-2 flex-wrap">
              {activeSheetSection &&
              !isFixedCourse(activeSheetSection.section.courseCode) &&
              !activeSheetSection.section.manual &&
              lockedSections?.[activeSheetSection.section.courseCode] === activeSheetSection.section.id ? (
                <button
                  type="button"
                  onClick={() => {
                    onUnlockCourse?.(activeSheetSection.section.courseCode);
                    setActiveSheetSection(null);
                  }}
                  className="flex-1 min-h-[44px] py-2.5 px-4 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors active:scale-[0.98]"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Unlock {activeSheetSection.section.courseCode}</span>
                </button>
              ) : lockStatus.isNoneLocked ? (
                <button
                  type="button"
                  onClick={() => {
                    onLockAllSections(schedule);
                    setActiveSheetSection(null);
                  }}
                  className="flex-1 min-h-[44px] py-2.5 px-4 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors active:scale-[0.98]"
                >
                  <Lock className="w-4 h-4" />
                  <span>Lock Routine Combination</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onUnlockAllSections?.();
                    setActiveSheetSection(null);
                  }}
                  className="flex-1 min-h-[44px] py-2.5 px-4 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors active:scale-[0.98]"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Unlock All Sections</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveSheetSection(null)}
                className="min-h-[44px] py-2.5 px-4 rounded-btn bg-subtle hover:bg-page text-text-secondary border border-app-border font-semibold text-xs sm:text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Mobile Bottom Sheet: Score Breakdown */}
      {isScoreSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsScoreSheetOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-surface border-t sm:border border-app-border rounded-t-2xl sm:rounded-card p-4 sm:p-5 shadow-2xl space-y-4 safe-pb"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-app-border">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-text-primary">Routine Score</span>
                <span className="font-black text-base text-orange-600">
                  {schedule.score}/100
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsScoreSheetOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2 rounded-full hover:bg-subtle text-text-muted hover:text-text-primary flex items-center justify-center"
                aria-label="Close score breakdown"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-text-secondary">
              <div className="flex justify-between items-center py-1 border-b border-app-border/40">
                <span>Faculty Preference:</span>
                <span className="font-mono font-bold text-emerald-600">{schedule.breakdown.facultyScore}%</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-app-border/40">
                <span>Gap Compactness:</span>
                <span className="font-mono font-bold text-sky-600">{schedule.breakdown.gapScore}%</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-app-border/40">
                <span>Day Compactness:</span>
                <span className="font-mono font-bold text-indigo-600">{schedule.breakdown.dayCompactScore}%</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-app-border/40">
                <span>Time Preference:</span>
                <span className="font-mono font-bold text-amber-600">{schedule.breakdown.timePreferenceScore}%</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Tentative Penalty:</span>
                <span className="font-mono font-bold text-rose-600">{schedule.breakdown.tentativePenalty}%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsScoreSheetOpen(false)}
              className="w-full min-h-[44px] py-2.5 rounded-btn bg-subtle hover:bg-page text-text-secondary border border-app-border font-bold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
