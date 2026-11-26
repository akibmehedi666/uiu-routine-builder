'use client';

import React, { useState } from 'react';
import {
  UniqueExam,
  TimeOfDayGroup,
  formatExamTimeRange,
} from '../../../lib/exams';
import { getCourseColor } from '../../../utils/colors';
import {
  ChevronDown,
  BookmarkCheck,
  Sunrise,
  Sun,
  Sunset,
} from 'lucide-react';

interface ExamCardProps {
  exam: UniqueExam;
  isUserCourse: boolean;
  highlightUserCourse: boolean;
  lockedSectionLabel?: string | null;
}

function TimeIcon({ group }: { group: TimeOfDayGroup }) {
  if (group === 'morning') {
    return <Sunrise className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
  }
  if (group === 'midday') {
    return <Sun className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
  }
  return <Sunset className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
}

export function ExamCard({
  exam,
  isUserCourse,
  highlightUserCourse,
  lockedSectionLabel = null,
}: ExamCardProps) {
  const [expanded, setExpanded] = useState(false);

  const courseColor = isUserCourse ? getCourseColor(exam.courseCode) : null;
  const dotColor = courseColor ? courseColor.accent : '#9CA3AF';
  const roomCount = exam.roomsSummary.length;
  const roomsLabel =
    roomCount === 0
      ? 'Rooms TBA'
      : `${roomCount} ${roomCount === 1 ? 'room' : 'rooms'}`;

  return (
    <div
      className={`py-3 px-4 transition-colors ${
        highlightUserCourse && isUserCourse
          ? 'bg-orange-50/50 hover:bg-orange-50/80 border-l-4 border-l-orange-500'
          : 'bg-surface hover:bg-subtle/60'
      }`}
    >
      {/* Desktop (>= 768px): single-line flex agenda row; Mobile (< 768px): stacked 3 lines */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 min-h-[32px]">
        {/* Line 1 on mobile: Time chip + dot + course code + truncated title */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-subtle border border-app-border text-xs font-medium text-text-primary whitespace-nowrap shrink-0">
            <TimeIcon group={exam.timeOfDay} />
            <span className="tabular-nums">
              {formatExamTimeRange(exam.startMin, exam.endMin)}
            </span>
          </span>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: dotColor }}
              aria-hidden="true"
            />
            <span className="text-sm sm:text-base font-semibold text-text-primary whitespace-nowrap shrink-0">
              {exam.courseCode}
            </span>
            {lockedSectionLabel && (
              <span className="px-1.5 py-0.5 rounded bg-subtle border border-app-border text-xs font-semibold text-text-primary shrink-0">
                Sec {lockedSectionLabel}
              </span>
            )}
            <span
              className="text-sm text-text-secondary truncate min-w-0"
              title={exam.courseTitle}
            >
              {exam.courseTitle}
            </span>
          </div>
        </div>

        {/* Line 2 on mobile / inline on desktop: Routine tag + Program chips + Sections + Room count */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-xs text-text-secondary">
          {highlightUserCourse && isUserCourse && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-chip bg-orange-100 text-orange-900 border border-orange-300 font-semibold">
              <BookmarkCheck className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>In your routine</span>
            </span>
          )}

          {exam.programs.map((p) => (
            <span
              key={p.program}
              className="px-2 py-0.5 rounded bg-page border border-app-border font-semibold text-text-secondary"
            >
              {p.program} ({p.sectionCount})
            </span>
          ))}

          <span className="text-[13px] text-text-muted font-medium whitespace-nowrap">
            · {exam.sectionCount} {exam.sectionCount === 1 ? 'section' : 'sections'}
          </span>

          <span className="text-[13px] text-text-muted whitespace-nowrap">
            · {roomsLabel}
          </span>
        </div>

        {/* Line 3 on mobile / aligned right on desktop: Sections & rooms toggle */}
        <div className="flex items-center justify-start md:justify-end shrink-0 md:ml-1">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="min-h-[44px] md:min-h-[36px] px-2.5 py-1 rounded-btn text-xs font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            <span>Sections &amp; rooms ({exam.sectionCount})</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Expanded inline full-width multi-column sections & rooms */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-app-border/70 space-y-2">
          <p className="text-xs text-text-muted">
            Find your section&apos;s room by your ID range.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {exam.sections.map((sec) => (
              <div
                key={sec.id}
                className="p-2.5 rounded-btn bg-page border border-app-border text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-text-primary">
                    Sec {sec.section}
                    {exam.programs.length > 1 && (
                      <span className="ml-1 font-medium text-text-muted">
                        ({sec.program})
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-text-secondary">
                    {sec.rooms.length > 0
                      ? `Room ${sec.rooms.map((r) => r.room).join(', ')}`
                      : 'Room TBA'}
                  </span>
                </div>
                {sec.rooms.length > 0 && (
                  <div className="space-y-0.5 font-mono text-text-muted">
                    {sec.rooms.map((r, idx) => (
                      <div key={`${r.room}-${idx}`} className="flex items-center justify-between gap-2">
                        <span className="font-sans font-medium text-text-secondary">
                          {r.room}
                        </span>
                        <span>
                          {r.idFrom}–{r.idTo}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
