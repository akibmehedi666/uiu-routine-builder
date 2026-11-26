'use client';

import React, { useState } from 'react';
import {
  UniqueExam,
  StudentRoomLookupResult,
  formatExamTimeRange,
} from '../../../lib/exams';
import { getCourseColor } from '../../../utils/colors';
import {
  ChevronDown,
  MapPin,
  AlertTriangle,
  BookmarkCheck,
  Clock,
} from 'lucide-react';

interface ExamCardProps {
  exam: UniqueExam;
  isUserCourse: boolean;
  highlightUserCourse: boolean; // true in All exams mode, or show badge in My exams
  studentLookup?: StudentRoomLookupResult | null;
  lockedSectionLabel?: string | null;
  constrainWidth?: boolean;
}

export function ExamCard({
  exam,
  isUserCourse,
  highlightUserCourse,
  studentLookup = null,
  lockedSectionLabel = null,
  constrainWidth = false,
}: ExamCardProps) {
  const [expanded, setExpanded] = useState(false);

  const courseColor = isUserCourse ? getCourseColor(exam.courseCode) : null;
  const dotColor = courseColor ? courseColor.accent : '#9CA3AF';

  const visibleRooms = exam.roomsSummary.slice(0, 2);
  const extraRoomsCount = Math.max(0, exam.roomsSummary.length - 2);
  const roomsText =
    exam.roomsSummary.length === 0
      ? 'Rooms TBA'
      : `Rooms ${visibleRooms.join(', ')}${
          extraRoomsCount > 0 ? ` +${extraRoomsCount}` : ''
        }`;

  return (
    <article
      className={`rounded-card border p-4 space-y-3 transition-all duration-150 hover:-translate-y-[1px] hover:shadow-warm motion-reduce:hover:translate-y-0 ${
        constrainWidth ? 'max-w-[480px] w-full' : 'w-full'
      } ${
        highlightUserCourse && isUserCourse
          ? 'bg-orange-50/50 border-orange-300 border-l-4 border-l-orange-500 shadow-2xs'
          : 'bg-surface border-app-border shadow-2xs'
      }`}
    >
      {/* Top Row: Course Code + Dot + Routine Tag / Found Room */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: dotColor }}
              aria-hidden="true"
            />
            <h4 className="text-base font-semibold text-text-primary tracking-tight">
              {exam.courseCode}
            </h4>
            {lockedSectionLabel && (
              <span className="px-2 py-0.5 rounded bg-subtle border border-app-border text-xs font-semibold text-text-primary">
                Sec {lockedSectionLabel}
              </span>
            )}
            {highlightUserCourse && isUserCourse && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-chip bg-orange-100 text-orange-900 border border-orange-300 text-xs font-semibold">
                <BookmarkCheck className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <span>In your routine</span>
              </span>
            )}
          </div>

          <p className="text-sm font-medium text-text-secondary leading-snug">
            {exam.courseTitle}
          </p>
        </div>

        {studentLookup?.status === 'found-own' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold shrink-0">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Room {studentLookup.room}</span>
          </span>
        )}
      </div>

      {/* Meta Row: Time, Program chips, Sections count, Rooms summary */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-subtle border border-app-border font-medium text-text-primary">
          <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span>{formatExamTimeRange(exam.startMin, exam.endMin)}</span>
        </span>

        {exam.programs.map((p) => (
          <span
            key={p.program}
            className="px-2 py-0.5 rounded bg-page border border-app-border font-semibold text-text-secondary"
          >
            {p.program} ({p.sectionCount})
          </span>
        ))}

        <span className="text-[13px] text-text-muted font-medium">
          · {exam.sectionCount} {exam.sectionCount === 1 ? 'section' : 'sections'}
        </span>

        <span className="text-[13px] text-text-muted">· {roomsText}</span>
      </div>

      {/* Student ID Lookup Notices */}
      {studentLookup?.status === 'found-other' && (
        <div className="p-2.5 rounded-btn bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-1.5 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Your ID is listed under section <strong>{studentLookup.section}</strong>{' '}
            (Room <strong>{studentLookup.room}</strong>)
          </span>
        </div>
      )}

      {studentLookup?.status === 'not-found' && (
        <div className="p-2.5 rounded-btn bg-subtle border border-app-border text-text-secondary text-xs flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Your ID isn&apos;t in any room range for this course. Check the notice
            board.
          </span>
        </div>
      )}

      {/* Sections & rooms expandable table */}
      <div className="pt-1 border-t border-app-border/70">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="min-h-[36px] text-xs font-semibold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 transition-colors"
        >
          <span>Sections &amp; rooms ({exam.sectionCount})</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {expanded && (
          <div className="mt-2 rounded-btn border border-app-border bg-page overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-subtle border-b border-app-border text-text-muted">
                  <th className="py-1.5 px-2.5 font-semibold">Sec</th>
                  <th className="py-1.5 px-2.5 font-semibold">Room(s)</th>
                  <th className="py-1.5 px-2.5 font-semibold">ID ranges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {exam.sections.map((sec) => (
                  <tr key={sec.id}>
                    <td className="py-1.5 px-2.5 whitespace-nowrap font-bold text-text-primary">
                      {sec.section}
                      {exam.programs.length > 1 && (
                        <span className="ml-1 text-text-muted font-medium">
                          ({sec.program})
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-text-secondary font-medium">
                      {sec.rooms.map((r) => r.room).join(', ') || 'TBA'}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-text-muted">
                      {sec.rooms.length > 0
                        ? sec.rooms
                            .map((r) => `${r.room}: ${r.idFrom}–${r.idTo}`)
                            .join(' | ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </article>
  );
}
