'use client';

import React, { useMemo } from 'react';
import {
  UniqueExam,
  TimeOfDayGroup,
  TIME_OF_DAY_META,
  countExamsAndSections,
  formatExamCountSummary,
  formatExamDayLabel,
  formatExamTimeRange,
} from '../../../lib/exams';
import { getCourseColor } from '../../../utils/colors';
import { ExamCard } from './ExamCard';
import { Sunrise, Sun, Sunset, BookmarkCheck, Calendar } from 'lucide-react';

interface ExamTimelineProps {
  exams: UniqueExam[];
  viewMode: 'date' | 'list';
  mode: 'mine' | 'all';
  userCourseSet: Set<string>;
  lockedSections: Record<string, string>;
}

function TimeOfDayIcon({ group }: { group: TimeOfDayGroup }) {
  if (group === 'morning') {
    return <Sunrise className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
  }
  if (group === 'midday') {
    return <Sun className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
  }
  return <Sunset className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
}

export function ExamTimeline({
  exams,
  viewMode,
  mode,
  userCourseSet,
  lockedSections,
}: ExamTimelineProps) {
  const isCourseSelected = (exam: UniqueExam) =>
    userCourseSet.has(exam.courseCode) ||
    exam.courseCodes.some((c) => userCourseSet.has(c));

  const getLockedLabel = (exam: UniqueExam): string | null => {
    const lockedId = lockedSections[exam.courseCode];
    const matchedLocked = lockedId
      ? exam.sections.find((s) => s.sectionId === lockedId)
      : null;
    return matchedLocked ? matchedLocked.section : null;
  };

  // Group into Date -> Time Slot -> UniqueExam[]
  const timelineDays = useMemo(() => {
    const dayMap = new Map<
      string,
      {
        date: string;
        dayLabel: string;
        exams: UniqueExam[];
        slots: {
          slotKey: string;
          startMin: number;
          endMin: number;
          timeGroup: TimeOfDayGroup;
          exams: UniqueExam[];
        }[];
      }
    >();

    for (const exam of exams) {
      let dayEntry = dayMap.get(exam.date);
      if (!dayEntry) {
        dayEntry = {
          date: exam.date,
          dayLabel: formatExamDayLabel(exam.date),
          exams: [],
          slots: [],
        };
        dayMap.set(exam.date, dayEntry);
      }
      dayEntry.exams.push(exam);

      const slotKey = `${exam.startMin}-${exam.endMin}`;
      let slotEntry = dayEntry.slots.find((s) => s.slotKey === slotKey);
      if (!slotEntry) {
        slotEntry = {
          slotKey,
          startMin: exam.startMin,
          endMin: exam.endMin,
          timeGroup: exam.timeOfDay,
          exams: [],
        };
        dayEntry.slots.push(slotEntry);
      }
      slotEntry.exams.push(exam);
    }

    for (const day of dayMap.values()) {
      day.slots.sort(
        (a, b) => a.startMin - b.startMin || a.endMin - b.endMin
      );
    }

    return Array.from(dayMap.values());
  }, [exams]);

  if (viewMode === 'list') {
    return (
      <div className="rounded-card bg-surface border border-app-border shadow-warm overflow-hidden">
        <div className="overflow-x-auto max-h-[70dvh] overflow-y-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-subtle border-b border-app-border text-xs uppercase tracking-wider text-text-muted">
              <tr>
                <th className="py-3 px-3.5 font-semibold whitespace-nowrap">Date</th>
                <th className="py-3 px-3.5 font-semibold whitespace-nowrap">Time</th>
                <th className="py-3 px-3.5 font-semibold">Course</th>
                <th className="py-3 px-3.5 font-semibold whitespace-nowrap">Programs</th>
                <th className="py-3 px-3.5 font-semibold whitespace-nowrap">Sections</th>
                <th className="py-3 px-3.5 font-semibold whitespace-nowrap">Rooms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border text-[13px]">
              {exams.map((exam) => {
                const isUser = isCourseSelected(exam);
                const dotColor = isUser
                  ? getCourseColor(exam.courseCode).accent
                  : '#9CA3AF';
                const roomCount = exam.roomsSummary.length;

                return (
                  <tr
                    key={exam.key}
                    className={
                      mode === 'all' && isUser
                        ? 'bg-orange-50/50 hover:bg-orange-50/80'
                        : 'hover:bg-subtle/50'
                    }
                  >
                    <td className="py-3 px-3.5 whitespace-nowrap font-medium text-text-primary">
                      {formatExamDayLabel(exam.date)}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-text-secondary">
                      <div className="inline-flex items-center gap-1.5">
                        <TimeOfDayIcon group={exam.timeOfDay} />
                        <span>{formatExamTimeRange(exam.startMin, exam.endMin)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: dotColor }}
                          aria-hidden="true"
                        />
                        <span className="font-semibold text-text-primary">
                          {exam.courseCode}
                        </span>
                        {mode === 'all' && isUser && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-chip bg-orange-100 text-orange-900 border border-orange-300 text-xs font-semibold">
                            <BookmarkCheck className="w-3 h-3 text-orange-600" />
                            <span>In your routine</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {exam.courseTitle}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {exam.programs.map((p) => (
                          <span
                            key={p.program}
                            className="px-1.5 py-0.5 rounded bg-page border border-app-border text-xs font-semibold text-text-secondary"
                          >
                            {p.program} ({p.sectionCount})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap font-medium text-text-primary">
                      {exam.sectionCount}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-text-secondary">
                      {roomCount === 0
                        ? 'TBA'
                        : `${roomCount} ${roomCount === 1 ? 'room' : 'rooms'}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // FULL-WIDTH AGENDA ROWS GROUPED BY DAY
  return (
    <div className="space-y-5">
      {timelineDays.map((day) => {
        const counts = countExamsAndSections(day.exams);
        const showSlotSubLabels = day.slots.length >= 2;

        return (
          <section
            key={day.date}
            aria-label={`Exams on ${day.dayLabel}`}
            className="rounded-card bg-surface border border-app-border shadow-warm overflow-hidden"
          >
            {/* Day Header */}
            <div className="px-4 py-3 bg-subtle border-b border-app-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
                <h3 className="text-lg font-semibold text-text-primary truncate">
                  {day.dayLabel}
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface border border-app-border text-xs font-semibold text-text-secondary shrink-0">
                {formatExamCountSummary(counts.examCount, counts.sectionCount)}
              </span>
            </div>

            {/* Agenda Rows (grouped by time slot only when a day has 2+ slots) */}
            {showSlotSubLabels ? (
              <div>
                {day.slots.map((slot, slotIdx) => (
                  <div
                    key={slot.slotKey}
                    className={slotIdx > 0 ? 'border-t border-app-border' : ''}
                  >
                    <div className="px-4 py-1.5 bg-page/80 border-b border-app-border flex items-center gap-2 text-xs font-semibold text-text-secondary">
                      <TimeOfDayIcon group={slot.timeGroup} />
                      <span>{TIME_OF_DAY_META[slot.timeGroup].label}</span>
                      <span className="text-text-muted font-normal tabular-nums">
                        · {formatExamTimeRange(slot.startMin, slot.endMin)}
                      </span>
                    </div>
                    <div className="divide-y divide-app-border">
                      {slot.exams.map((exam) => (
                        <ExamCard
                          key={exam.key}
                          exam={exam}
                          isUserCourse={isCourseSelected(exam)}
                          highlightUserCourse={mode === 'all'}
                          lockedSectionLabel={getLockedLabel(exam)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-app-border">
                {day.exams.map((exam) => (
                  <ExamCard
                    key={exam.key}
                    exam={exam}
                    isUserCourse={isCourseSelected(exam)}
                    highlightUserCourse={mode === 'all'}
                    lockedSectionLabel={getLockedLabel(exam)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
