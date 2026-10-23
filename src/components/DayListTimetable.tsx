'use client';

import React from 'react';
import { ScheduleResult, Section, Meeting, Day } from '../types';
import { buildDayAgendas, DayAgenda } from '../utils/dayListBuilder';
import { getCourseColor } from '../utils/colors';
import { formatTime24 } from '../utils/export';
import { isFixedCourse } from '../lib/fixedCourses';
import {
  MapPin,
  Clock,
  User,
  Lock,
  Pencil,
  AlertTriangle,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface DayListTimetableProps {
  schedule: ScheduleResult;
  onSelectSection: (section: Section, meeting: Meeting) => void;
  previewSection?: Section | null;
}

const DAY_FULL_NAMES: Record<Day, string> = {
  Sat: 'Saturday',
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
};

export function DayListTimetable({
  schedule,
  onSelectSection,
  previewSection,
}: DayListTimetableProps) {
  const agendas: DayAgenda[] = React.useMemo(
    () => buildDayAgendas(schedule),
    [schedule]
  );

  return (
    <div className="space-y-3">
      {agendas.map((agenda) => {
        const fullDayName = DAY_FULL_NAMES[agenda.day];

        return (
          <div
            key={agenda.day}
            className="rounded-card bg-surface border border-app-border shadow-xs overflow-hidden transition-all"
          >
            {/* Day Header */}
            <div className="px-3.5 py-2.5 bg-subtle/70 border-b border-app-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-text-primary">
                  {fullDayName}
                </span>
                <span className="text-xs text-text-muted font-medium">
                  ({agenda.day})
                </span>
              </div>

              {agenda.hasClasses ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-semibold text-[11px]">
                    {agenda.classCount} {agenda.classCount === 1 ? 'class' : 'classes'}
                  </span>
                  {agenda.timeSpanLabel && (
                    <span className="hidden xs:inline text-[11px] text-text-muted font-mono">
                      {agenda.timeSpanLabel}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Off Day
                </span>
              )}
            </div>

            {/* Day Body */}
            <div className="p-3">
              {!agenda.hasClasses ? (
                <div className="py-4 text-center text-xs text-text-muted flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>No classes scheduled — campus-free day 🎉</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {agenda.classes.map((item, idx) => {
                    const color = getCourseColor(item.section.courseCode);
                    const isManual = item.section.manual;
                    const isFixed =
                      item.section.fixed || isFixedCourse(item.section.courseCode);

                    return (
                      <React.Fragment key={`${item.section.id}-${item.meeting.start}-${idx}`}>
                        {/* Class Card */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectSection(item.section, item.meeting)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectSection(item.section, item.meeting);
                            }
                          }}
                          className={`w-full text-left p-3 rounded-btn border-l-4 border transition-all active:scale-[0.99] cursor-pointer hover:shadow-xs ${
                            color.bg
                          } ${color.border} ${
                            item.section.tentative ? 'border-dashed' : ''
                          }`}
                        >
                          {/* Row 1: Time range + Room Badge */}
                          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-black/5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                              <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                              <span>
                                {formatTime24(item.meeting.start)} – {formatTime24(item.meeting.end)}
                              </span>
                            </div>

                            <span className="px-2 py-0.5 rounded-md bg-surface text-text-primary font-bold text-xs border border-app-border flex items-center gap-1 shadow-2xs">
                              <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                              <span>{item.meeting.room || 'Room TBA'}</span>
                            </span>
                          </div>

                          {/* Row 2: Course Code, Section, Badges */}
                          <div className="flex items-center justify-between gap-2 pt-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-black text-sm tracking-tight ${color.text}`}>
                                {item.section.courseCode}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 shrink-0 ${
                                  isManual || isFixed
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : color.badgeBg
                                }`}
                              >
                                {isManual ? (
                                  <Pencil className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                                ) : isFixed ? (
                                  <Lock className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                                ) : null}
                                <span>
                                  {isManual
                                    ? 'Manual • '
                                    : isFixed
                                    ? 'Fixed • '
                                    : item.section.updated
                                    ? 'Updated • '
                                    : ''}Sec {item.section.section}
                                </span>
                              </span>
                            </div>

                            <span className="text-[11px] text-text-muted font-medium shrink-0">
                              {item.section.credit} cr
                            </span>
                          </div>

                          {/* Row 3: Title */}
                          <div className="text-xs text-text-secondary font-medium pt-1 line-clamp-1">
                            {item.section.title}
                          </div>

                          {/* Row 4: Faculty + Tap hint */}
                          <div className="flex items-center justify-between text-[11px] pt-1.5 text-text-muted">
                            <span className="flex items-center gap-1 truncate font-medium">
                              <User className="w-3 h-3 text-sky-600 shrink-0" />
                              <span className="truncate">{item.section.faculty.join(', ') || 'TBA'}</span>
                            </span>
                            <span className="text-[11px] text-orange-600 font-semibold flex items-center shrink-0">
                              Details <ChevronRight className="w-3 h-3 ml-0.5" />
                            </span>
                          </div>
                        </div>

                        {/* Gap Chip or Tight Transition Warning between classes */}
                        {item.gapAfterMinutes !== undefined && (
                          <div className="py-0.5 flex flex-col items-center justify-center">
                            {item.isTightTransition ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-semibold shadow-2xs">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{item.tightTransitionMessage}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-subtle text-text-muted border border-app-border text-[11px] font-medium">
                                <Clock className="w-2.5 h-2.5 text-text-muted" />
                                <span>{item.gapAfterLabel}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
