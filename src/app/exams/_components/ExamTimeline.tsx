'use client';

import React, { useMemo } from 'react';
import {
  UniqueExam,
  ExamRow,
  TimeOfDayGroup,
  TIME_OF_DAY_META,
  StudentRoomLookupResult,
  countExamsAndSections,
  formatExamCountSummary,
  formatExamDayLabel,
  formatExamTimeRange,
  getExamsForCourse,
  lookupStudentRoomForCourse,
} from '../../../lib/exams';
import { getCourseColor } from '../../../utils/colors';
import { ExamCard } from './ExamCard';
import { Sunrise, Sun, Sunset, BookmarkCheck } from 'lucide-react';

interface ExamTimelineProps {
  exams: UniqueExam[];
  allActiveRows: ExamRow[];
  viewMode: 'date' | 'list';
  mode: 'mine' | 'all';
  userCourseSet: Set<string>;
  lockedSections: Record<string, string>;
  activeStudentId: string | null;
}

function TimeOfDayIcon({ group }: { group: TimeOfDayGroup }) {
  if (group === 'morning') {
    return <Sunrise className="w-4 h-4 text-amber-600 shrink-0" />;
  }
  if (group === 'midday') {
    return <Sun className="w-4 h-4 text-orange-500 shrink-0" />;
  }
  return <Sunset className="w-4 h-4 text-rose-500 shrink-0" />;
}

export function ExamTimeline({
  exams,
  allActiveRows,
  viewMode,
  mode,
  userCourseSet,
  lockedSections,
  activeStudentId,
}: ExamTimelineProps) {
  const isCourseSelected = (exam: UniqueExam) =>
    userCourseSet.has(exam.courseCode) ||
    exam.courseCodes.some((c) => userCourseSet.has(c));

  const getLookupForExam = (
    exam: UniqueExam
  ): { lookup: StudentRoomLookupResult | null; lockedLabel: string | null } => {
    const lockedId = lockedSections[exam.courseCode];
    const matchedLocked = lockedId
      ? exam.sections.find((s) => s.sectionId === lockedId)
      : null;
    const lockedLabel = matchedLocked ? matchedLocked.section : null;

    if (mode !== 'mine' || !activeStudentId) {
      return { lookup: null, lockedLabel };
    }

    const courseRows = getExamsForCourse(null, exam.courseCode, allActiveRows);
    const ownRow = matchedLocked
      ? courseRows.find((r) => r.id === matchedLocked.id) || null
      : courseRows[0] || null;
    const lookup = lookupStudentRoomForCourse(ownRow, courseRows, activeStudentId);
    return { lookup, lockedLabel };
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
                <th className="py-3 px-3.5 font-semibold">Rooms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border text-[13px]">
              {exams.map((exam) => {
                const isUser = isCourseSelected(exam);
                const { lookup } = getLookupForExam(exam);
                const dotColor = isUser
                  ? getCourseColor(exam.courseCode).accent
                  : '#9CA3AF';
                const visibleRooms = exam.roomsSummary.slice(0, 3);
                const extra = Math.max(0, exam.roomsSummary.length - 3);

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
                    <td className="py-3 px-3.5 text-text-secondary">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {lookup?.status === 'found-own' && (
                          <span className="px-2 py-0.5 rounded-chip bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold">
                            Room {lookup.room}
                          </span>
                        )}
                        {lookup?.status === 'found-other' && (
                          <span className="px-2 py-0.5 rounded-chip bg-amber-50 text-amber-900 border border-amber-300 text-xs font-semibold">
                            Sec {lookup.section} (Room {lookup.room})
                          </span>
                        )}
                        <span>
                          {exam.roomsSummary.length === 0
                            ? 'TBA'
                            : `${visibleRooms.join(', ')}${extra > 0 ? ` +${extra}` : ''}`}
                        </span>
                      </div>
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

  // TIMELINE VIEW ("By date")
  return (
    <div className="space-y-6">
      {timelineDays.map((day) => {
        const counts = countExamsAndSections(day.exams);
        return (
          <section
            key={day.date}
            aria-label={`Exams on ${day.dayLabel}`}
            className="space-y-3"
          >
            {/* Day Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-app-border">
              <h3 className="text-lg font-semibold text-text-primary">
                {day.dayLabel}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-subtle border border-app-border text-xs font-semibold text-text-secondary">
                {formatExamCountSummary(counts.examCount, counts.sectionCount)}
              </span>
            </div>

            {/* Time Slot Rows */}
            <div className="space-y-4">
              {day.slots.map((slot) => {
                const constrainCards = slot.exams.length <= 2;
                return (
                  <div
                    key={slot.slotKey}
                    className="grid grid-cols-1 md:grid-cols-[176px_1fr] gap-3 items-start"
                  >
                    {/* Left Time Label */}
                    <div className="md:pt-2 flex md:flex-col items-center md:items-start gap-2 md:gap-0.5">
                      <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                        <TimeOfDayIcon group={slot.timeGroup} />
                        <span>{TIME_OF_DAY_META[slot.timeGroup].label}</span>
                      </div>
                      <span className="text-xs font-medium text-text-muted tabular-nums">
                        {formatExamTimeRange(slot.startMin, slot.endMin)}
                      </span>
                    </div>

                    {/* Right Responsive Card Grid */}
                    <div
                      className="grid gap-3 min-w-0"
                      style={{
                        gridTemplateColumns:
                          'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                      }}
                    >
                      {slot.exams.map((exam) => {
                        const isUser = isCourseSelected(exam);
                        const { lookup, lockedLabel } = getLookupForExam(exam);
                        return (
                          <ExamCard
                            key={exam.key}
                            exam={exam}
                            isUserCourse={isUser}
                            highlightUserCourse={mode === 'all'}
                            studentLookup={lookup}
                            lockedSectionLabel={lockedLabel}
                            constrainWidth={constrainCards}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
