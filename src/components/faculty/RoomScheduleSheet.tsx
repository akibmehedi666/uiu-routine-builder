'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { X, MapPin, Calendar, Clock, BookOpen, Layers } from 'lucide-react';
import { getRoomSchedule } from '../../lib/roomSchedule';
import { DAYS_LIST, Day } from '../../types';

interface RoomScheduleSheetProps {
  room: string | null;
  onClose: () => void;
}

export function RoomScheduleSheet({ room, onClose }: RoomScheduleSheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (room) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [room, onClose]);

  if (!room) return null;

  const schedule = getRoomSchedule(room);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-sheet-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-full max-h-screen bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden sm:rounded-l-2xl border-l border-stone-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-50/70 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-orange-100 text-orange-600">
                <MapPin className="w-5 h-5" />
              </span>
              <div>
                <h2 id="room-sheet-title" className="text-xl font-bold text-stone-900">
                  Room {room}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500">
                  {schedule?.floor !== null && schedule?.floor !== undefined && (
                    <span className="flex items-center gap-1 font-medium text-stone-600 bg-stone-200/70 px-2 py-0.5 rounded-full">
                      <Layers className="w-3 h-3 text-stone-500" />
                      Floor {schedule.floor}
                    </span>
                  )}
                  <span>•</span>
                  <span>{schedule?.totalMeetings ?? 0} weekly classes</span>
                  <span>•</span>
                  <span>{schedule?.distinctCourses ?? 0} courses</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            aria-label="Close room schedule"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!schedule || schedule.totalMeetings === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <Calendar className="w-10 h-10 mx-auto text-stone-300 mb-2" />
              <p className="font-medium text-stone-700">No scheduled classes found</p>
              <p className="text-xs text-stone-400 mt-1">This room has no active class allocations in the routine.</p>
            </div>
          ) : (
            DAYS_LIST.map((day) => {
              const meetings = schedule.byDay[day];
              if (meetings.length === 0) return null;

              return (
                <div key={day} className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-stone-200/80">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200/60">
                      {day}
                    </span>
                    <span className="text-xs text-stone-400 font-medium">
                      {meetings.length} class{meetings.length > 1 ? 'es' : ''}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {meetings.map((m, idx) => (
                      <div
                        key={`${m.courseCode}-${m.section}-${idx}`}
                        className="p-3 rounded-xl border border-stone-200/80 bg-white hover:border-orange-200 transition-colors shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-stone-900">{m.courseCode}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                              Sec {m.section}
                            </span>
                            <span
                              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                                m.kind === 'lab'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {m.kind === 'lab' ? 'Lab' : 'Theory'}
                            </span>
                          </div>

                          <span className="text-xs font-medium text-stone-600 flex items-center gap-1 shrink-0 bg-stone-50 px-2 py-0.5 rounded border border-stone-200/60">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {m.timeRange}
                          </span>
                        </div>

                        <p className="text-xs text-stone-600 line-clamp-1">{m.courseTitle}</p>

                        <div className="pt-1 flex items-center gap-2 text-xs flex-wrap">
                          <span className="text-stone-400 font-medium">Faculty:</span>
                          {m.faculty.length === 0 ? (
                            <span className="text-amber-600 italic">TBA</span>
                          ) : (
                            m.faculty.map((f, fIdx) =>
                              f.id ? (
                                <Link
                                  key={fIdx}
                                  href={`/faculty-directory/${f.id}`}
                                  onClick={onClose}
                                  className="text-orange-600 hover:text-orange-700 hover:underline font-medium"
                                  title={f.name}
                                >
                                  {f.name}
                                </Link>
                              ) : (
                                <span key={fIdx} className="text-stone-700" title={f.name}>
                                  {f.name}
                                </span>
                              )
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
