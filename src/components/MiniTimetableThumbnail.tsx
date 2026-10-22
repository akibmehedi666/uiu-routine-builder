'use client';

import React from 'react';
import { SavedSectionSnapshot } from '../types/savedRoutine';
import { DAYS_LIST, Day } from '../types';
import { getCourseColor } from '../utils/colors';

interface MiniTimetableThumbnailProps {
  sections: SavedSectionSnapshot[];
  className?: string;
}

const START_MIN = 510; // 08:30
const TOTAL_SPAN = 570; // until 18:00 (1080 - 510)

export function MiniTimetableThumbnail({
  sections,
  className = '',
}: MiniTimetableThumbnailProps) {
  // Collect all meetings with course code
  const meetingsByDay: Record<Day, { courseCode: string; start: number; end: number }[]> = {
    Sat: [],
    Sun: [],
    Mon: [],
    Tue: [],
    Wed: [],
  };

  for (const sec of sections) {
    for (const m of sec.meetings) {
      if (meetingsByDay[m.day]) {
        meetingsByDay[m.day].push({
          courseCode: sec.courseCode,
          start: m.start,
          end: m.end,
        });
      }
    }
  }

  return (
    <div
      className={`w-full h-16 bg-page rounded-btn border border-app-border/80 p-1 flex gap-1 select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {DAYS_LIST.map((day) => {
        const dayMeetings = meetingsByDay[day] || [];
        const hasClasses = dayMeetings.length > 0;

        return (
          <div
            key={day}
            className={`flex-1 flex flex-col h-full rounded-[4px] relative ${
              hasClasses ? 'bg-surface/90' : 'bg-subtle/50'
            }`}
          >
            {/* Tiny day header */}
            <div className="text-[11px] font-mono font-medium text-text-muted text-center leading-none pt-0.5 pb-0.5">
              {day[0]}
            </div>

            {/* Timetable slot column */}
            <div className="flex-1 relative mx-0.5 mb-0.5 rounded-[2px] bg-subtle/30 overflow-hidden">
              {dayMeetings.map((dm, idx) => {
                const color = getCourseColor(dm.courseCode);
                const topPct = Math.max(0, Math.min(100, ((dm.start - START_MIN) / TOTAL_SPAN) * 100));
                const heightPct = Math.max(12, Math.min(100, ((dm.end - dm.start) / TOTAL_SPAN) * 100));

                return (
                  <div
                    key={`${dm.courseCode}-${idx}`}
                    style={{
                      top: `${topPct}%`,
                      height: `${heightPct}%`,
                      backgroundColor: color.accent,
                    }}
                    className="absolute inset-x-0 rounded-[2px] opacity-85 shadow-2xs"
                    title={`${dm.courseCode} (${day})`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
