'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpDown,
  BookOpen,
  Calendar,
  Clock,
  FlaskConical,
  Layers,
  MapPin,
  Sparkles,
  Users,
  Star,
  Check,
} from 'lucide-react';
import { PAGE_MAX_W } from '../../../config/layout';
import { SiteFooter } from '../../../components/SiteFooter';
import { UpdatedSectionBadge } from '../../../components/UpdatedSectionBadge';
import {
  getAllFacultyStats,
  getFacultyStatsById,
  FacultyStats,
  formatMinutesToTime,
} from '../../../lib/facultyStats';
import { resolveFacultyId } from '../../../lib/facultyAliases';
import { usePinnedFaculty } from '../../../hooks/usePinnedFaculty';
import { BadgeIcon } from '../../../components/faculty/BadgesLegendModal';
import { RoomScheduleSheet } from '../../../components/faculty/RoomScheduleSheet';
import { DAYS_LIST, Day } from '../../../types';

function CompareContent() {
  const searchParams = useSearchParams();
  const rawA = searchParams?.get('a') || '';
  const rawB = searchParams?.get('b') || '';

  const idA = resolveFacultyId(rawA);
  const idB = resolveFacultyId(rawB);

  const facultyA = getFacultyStatsById(idA);
  const facultyB = getFacultyStatsById(idB);

  const allFaculty = getAllFacultyStats();
  const { isPinned, togglePin } = usePinnedFaculty();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // If one or both are missing, let user select from dropdown
  const [overrideA, setOverrideA] = useState<string>(idA || '');
  const [overrideB, setOverrideB] = useState<string>(idB || '');

  const activeA = facultyA || (overrideA ? getFacultyStatsById(overrideA) : undefined);
  const activeB = facultyB || (overrideB ? getFacultyStatsById(overrideB) : undefined);

  if (!activeA || !activeB) {
    return (
      <div className="py-12 text-center space-y-6">
        <div className="max-w-md mx-auto p-6 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Compare Faculty Schedules</h2>
            <p className="text-xs text-stone-500 mt-1">
              Select two instructors to compare workload, schedule distribution, and shared courses side by side.
            </p>
          </div>

          <div className="space-y-3 text-left">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">First Faculty Member</label>
              <select
                value={activeA?.id || overrideA}
                onChange={(e) => setOverrideA(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-900"
              >
                <option value="">Select Instructor A...</option>
                {allFaculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.totalSections} sections)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Second Faculty Member</label>
              <select
                value={activeB?.id || overrideB}
                onChange={(e) => setOverrideB(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-900"
              >
                <option value="">Select Instructor B...</option>
                {allFaculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.totalSections} sections)
                  </option>
                ))}
              </select>
            </div>

            {overrideA && overrideB && overrideA !== overrideB && (
              <Link
                href={`/faculty-directory/compare?a=${overrideA}&b=${overrideB}`}
                className="block text-center w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Compare Selected Faculty
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Find shared courses
  const codesA = new Set(activeA.courses.map((c) => c.courseCode));
  const sharedCourseCodes = activeB.courses.filter((c) => codesA.has(c.courseCode)).map((c) => c.courseCode);

  // Helper to determine subtle highlight for numerical comparisons
  const compareNumber = (valA: number, valB: number) => {
    if (valA > valB) return { aHighlight: true, bHighlight: false };
    if (valB > valA) return { aHighlight: false, bHighlight: true };
    return { aHighlight: false, bHighlight: false };
  };

  const sectionsComp = compareNumber(activeA.totalSections, activeB.totalSections);
  const creditsComp = compareNumber(activeA.totalCredits, activeB.totalCredits);
  const hoursComp = compareNumber(activeA.totalWeeklyMinutes, activeB.totalWeeklyMinutes);
  const daysComp = compareNumber(activeA.daysOnCampus, activeB.daysOnCampus);
  const coursesComp = compareNumber(activeA.distinctCourseCount, activeB.distinctCourseCount);
  const theoryComp = compareNumber(activeA.theoryCourseCount, activeB.theoryCourseCount);
  const labComp = compareNumber(activeA.labCourseCount, activeB.labCourseCount);
  const floorsComp = compareNumber(activeA.distinctFloors, activeB.distinctFloors);
  const roomsComp = compareNumber(activeA.rooms.length, activeB.rooms.length);

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/faculty-directory"
            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors"
            title="Back to Faculty Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Faculty Schedule Comparison</h1>
            <p className="text-xs text-stone-500">
              Side-by-side analysis of teaching allocations, room distribution, and timetable density.
            </p>
          </div>
        </div>

        <Link
          href={`/faculty-directory/compare?a=${activeB.id}&b=${activeA.id}`}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
          Swap Positions
        </Link>
      </div>

      {/* Two Header Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Faculty A Card */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-2xs shrink-0 border"
                style={{
                  backgroundColor: activeA.avatarColor.bg,
                  color: activeA.avatarColor.text,
                  borderColor: activeA.avatarColor.border,
                }}
              >
                {activeA.initials}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/faculty-directory/${activeA.id}`}
                  className="font-bold text-base text-stone-900 hover:text-orange-600 transition-colors line-clamp-1"
                  title={activeA.name}
                >
                  {activeA.name}
                </Link>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {activeA.programs.map((p) => (
                    <span key={p} className="text-[11px] font-semibold px-2 py-0.2 rounded bg-stone-100 text-stone-600">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => togglePin(activeA.id)}
              className={`p-2 rounded-xl border transition-colors ${
                isPinned(activeA.id)
                  ? 'bg-amber-50 text-amber-500 border-amber-200'
                  : 'bg-stone-50 text-stone-400 border-stone-200 hover:text-stone-700'
              }`}
              aria-label={isPinned(activeA.id) ? `Unpin ${activeA.name}` : `Pin ${activeA.name}`}
              title={isPinned(activeA.id) ? 'Pinned faculty' : 'Pin faculty'}
            >
              <Star className="w-4 h-4 fill-current" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {activeA.badges.map((b) => (
              <Link
                key={b.id}
                href={`/faculty-directory?tab=badges&badge=${b.id}`}
                title={`${b.name}: ${b.description}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border hover:scale-105 transition-transform ${b.badgeStyle}`}
              >
                <BadgeIcon name={b.iconName} className="w-3 h-3" />
                {b.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Faculty B Card */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-2xs shrink-0 border"
                style={{
                  backgroundColor: activeB.avatarColor.bg,
                  color: activeB.avatarColor.text,
                  borderColor: activeB.avatarColor.border,
                }}
              >
                {activeB.initials}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/faculty-directory/${activeB.id}`}
                  className="font-bold text-base text-stone-900 hover:text-orange-600 transition-colors line-clamp-1"
                  title={activeB.name}
                >
                  {activeB.name}
                </Link>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {activeB.programs.map((p) => (
                    <span key={p} className="text-[11px] font-semibold px-2 py-0.2 rounded bg-stone-100 text-stone-600">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => togglePin(activeB.id)}
              className={`p-2 rounded-xl border transition-colors ${
                isPinned(activeB.id)
                  ? 'bg-amber-50 text-amber-500 border-amber-200'
                  : 'bg-stone-50 text-stone-400 border-stone-200 hover:text-stone-700'
              }`}
              aria-label={isPinned(activeB.id) ? `Unpin ${activeB.name}` : `Pin ${activeB.name}`}
              title={isPinned(activeB.id) ? 'Pinned faculty' : 'Pin faculty'}
            >
              <Star className="w-4 h-4 fill-current" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {activeB.badges.map((b) => (
              <Link
                key={b.id}
                href={`/faculty-directory?tab=badges&badge=${b.id}`}
                title={`${b.name}: ${b.description}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border hover:scale-105 transition-transform ${b.badgeStyle}`}
              >
                <BadgeIcon name={b.iconName} className="w-3 h-3" />
                {b.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-Side Metrics Table */}
      <div className="rounded-2xl bg-white border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50/70">
          <h2 className="text-sm font-bold text-stone-900">Side-by-Side Comparison Metrics</h2>
          <p className="text-[11px] text-stone-500">
            Higher metrics highlighted with subtle orange tint (for informational comparison only).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-100/60 border-b border-stone-200 text-stone-700 font-semibold">
                <th className="p-3 w-1/3">Metric</th>
                <th className="p-3 w-1/3 text-center">{activeA.name}</th>
                <th className="p-3 w-1/3 text-center">{activeB.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr>
                <td className="p-3 font-medium text-stone-700">Total Sections Assigned</td>
                <td className={`p-3 text-center ${sectionsComp.aHighlight ? 'bg-orange-50/70 text-orange-950 font-bold' : 'text-stone-700'}`}>
                  {activeA.totalSections}
                </td>
                <td className={`p-3 text-center ${sectionsComp.bHighlight ? 'bg-orange-50/70 text-orange-950 font-bold' : 'text-stone-700'}`}>
                  {activeB.totalSections}
                </td>
              </tr>

              <tr>
                <td className="p-3 font-medium text-stone-700">Theory / Lab Section Split</td>
                <td className="p-3 text-center text-stone-700">
                  <span className={theoryComp.aHighlight ? 'font-bold text-orange-900' : ''}>{activeA.theoryCourseCount} theory</span> /{' '}
                  <span className={labComp.aHighlight ? 'font-bold text-orange-900' : ''}>{activeA.labCourseCount} lab</span>
                </td>
                <td className="p-3 text-center text-stone-700">
                  <span className={theoryComp.bHighlight ? 'font-bold text-orange-900' : ''}>{activeB.theoryCourseCount} theory</span> /{' '}
                  <span className={labComp.bHighlight ? 'font-bold text-orange-900' : ''}>{activeB.labCourseCount} lab</span>
                </td>
              </tr>

              <tr>
                <td className="p-3 font-medium text-stone-700">Distinct Courses Taught</td>
                <td className={`p-3 text-center ${coursesComp.aHighlight ? 'bg-orange-50/70 text-orange-950 font-bold' : 'text-stone-700'}`}>
                  {activeA.distinctCourseCount} courses
                </td>
                <td className={`p-3 text-center ${coursesComp.bHighlight ? 'bg-orange-50/70 text-orange-950 font-bold' : 'text-stone-700'}`}>
                  {activeB.distinctCourseCount} courses
                </td>
              </tr>

              <tr>
                <td className="p-3 font-medium text-stone-700">Total Credit Load</td>
                <td className={`p-3 text-center ${creditsComp.aHighlight ? 'bg-orange-50/70 text-orange-950 font-bold' : 'text-stone-700'}`}>
                  {activeA.totalCredits} credits
                </td>
                <td className={`p-3 text-center ${creditsComp.bHighlight ? 'bg-orange-50/70 text-orange-950 font-bold' : 'text-stone-700'}`}>
                  {activeB.totalCredits} credits
                </td>
              </tr>

              <tr>
                <td className="p-3 font-medium text-stone-700">Weekly Contact Hours</td>
                <td className={`p-3 text-center ${hoursComp.aHighlight ? 'bg-orange-50/70 text-orange-950 font-bold' : 'text-stone-700'}`}>
                  {activeA.totalWeeklyHours} hrs/week
                </td>
                <td className={`p-3 text-center ${hoursComp.bHighlight ? 'bg-orange-50/70 text-orange-950 font-bold' : 'text-stone-700'}`}>
                  {activeB.totalWeeklyHours} hrs/week
                </td>
              </tr>

              <tr>
                <td className="p-3 font-medium text-stone-700">Days on Campus</td>
                <td className={`p-3 text-center ${daysComp.aHighlight ? 'bg-orange-50/70 text-orange-950 font-bold' : 'text-stone-700'}`}>
                  {activeA.daysOnCampus} days ({activeA.activeDays.join(', ')})
                </td>
                <td className={`p-3 text-center ${daysComp.bHighlight ? 'bg-orange-50/70 text-orange-950 font-bold' : 'text-stone-700'}`}>
                  {activeB.daysOnCampus} days ({activeB.activeDays.join(', ')})
                </td>
              </tr>

              <tr>
                <td className="p-3 font-medium text-stone-700">Earliest Class Start</td>
                <td className="p-3 text-center text-stone-700">{activeA.earliestStartTimeStr}</td>
                <td className="p-3 text-center text-stone-700">{activeB.earliestStartTimeStr}</td>
              </tr>

              <tr>
                <td className="p-3 font-medium text-stone-700">Latest Class End</td>
                <td className="p-3 text-center text-stone-700">{activeA.latestEndTimeStr}</td>
                <td className="p-3 text-center text-stone-700">{activeB.latestEndTimeStr}</td>
              </tr>

              <tr>
                <td className="p-3 font-medium text-stone-700">Time Slot Split (Morn / Mid / Aft)</td>
                <td className="p-3 text-center text-stone-700">
                  {activeA.slotCounts.morning} / {activeA.slotCounts.midday} / {activeA.slotCounts.afternoon}
                </td>
                <td className="p-3 text-center text-stone-700">
                  {activeB.slotCounts.morning} / {activeB.slotCounts.midday} / {activeB.slotCounts.afternoon}
                </td>
              </tr>

              <tr>
                <td className="p-3 font-medium text-stone-700">Campus Footprint</td>
                <td className="p-3 text-center text-stone-700">
                  <span className={floorsComp.aHighlight ? 'font-bold text-orange-900' : ''}>{activeA.distinctFloors} floors</span> ({activeA.rooms.length} rooms)
                </td>
                <td className="p-3 text-center text-stone-700">
                  <span className={floorsComp.bHighlight ? 'font-bold text-orange-900' : ''}>{activeB.distinctFloors} floors</span> ({activeB.rooms.length} rooms)
                </td>
              </tr>

              <tr>
                <td className="p-3 font-medium text-stone-700">Badges Earned</td>
                <td className="p-3 text-center text-stone-700 font-semibold">{activeA.badges.length} badges</td>
                <td className="p-3 text-center text-stone-700 font-semibold">{activeB.badges.length} badges</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared Courses Section */}
      <div className="p-5 md:p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-orange-500" />
            Shared Courses ({sharedCourseCodes.length})
          </h2>
          <span className="text-xs text-stone-400 font-medium">Courses taught by both instructors</span>
        </div>

        {sharedCourseCodes.length === 0 ? (
          <p className="text-xs text-stone-500 italic py-3 text-center bg-stone-50 rounded-xl border border-stone-200/60">
            No overlapping courses taught by both instructors this trimester.
          </p>
        ) : (
          <div className="space-y-3">
            {sharedCourseCodes.map((code) => {
              const groupA = activeA.courses.find((c) => c.courseCode === code);
              const groupB = activeB.courses.find((c) => c.courseCode === code);
              return (
                <div key={code} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900">{code}</span>
                      <span className="text-xs text-stone-600 line-clamp-1">{groupA?.title}</span>
                    </div>
                    <Link
                      href={`/courses?q=${encodeURIComponent(code)}`}
                      className="text-xs text-orange-600 hover:underline font-medium shrink-0"
                    >
                      View in Course Directory
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    {/* Faculty A's sections */}
                    <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                      <p className="font-semibold text-stone-700 mb-1">{activeA.name}:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {groupA?.sections.map((sec) => (
                          <span
                            key={sec.id}
                            className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 font-medium border border-stone-200 inline-flex items-center gap-1.5"
                          >
                            <span>Sec {sec.section} ({sec.days.join(', ')} {sec.timeRange})</span>
                            <UpdatedSectionBadge updated={sec.updated} updatedOn={sec.updatedOn} />
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Faculty B's sections */}
                    <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                      <p className="font-semibold text-stone-700 mb-1">{activeB.name}:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {groupB?.sections.map((sec) => (
                          <span
                            key={sec.id}
                            className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 font-medium border border-stone-200 inline-flex items-center gap-1.5"
                          >
                            <span>Sec {sec.section} ({sec.days.join(', ')} {sec.timeRange})</span>
                            <UpdatedSectionBadge updated={sec.updated} updatedOn={sec.updatedOn} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mini Weekly Timetables Side-by-Side */}
      <div className="p-5 md:p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            Weekly Routine Comparison
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Side-by-side weekly class schedules for conflict analysis and overlap identification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Schedule A */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 pb-1 border-b border-stone-200">
              {activeA.name}&apos;s Weekly Schedule
            </h3>
            {DAYS_LIST.map((day) => {
              const meetings = activeA.weeklyPattern[day].meetings;
              return (
                <div key={day} className="p-2.5 rounded-xl border border-stone-200/80 bg-stone-50/50 space-y-1.5">
                  <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60 uppercase">
                    {day}
                  </span>
                  {meetings.length === 0 ? (
                    <p className="text-[11px] text-stone-400 italic pt-1">No classes scheduled</p>
                  ) : (
                    <div className="space-y-1 pt-1">
                      {meetings.map((m, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-white border border-stone-200 text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-stone-900">{m.courseCode}</span>
                            <span className="text-[11px] text-stone-500 ml-1">({m.section})</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-stone-500">
                            <span>{formatMinutesToTime(m.start)} - {formatMinutesToTime(m.end)}</span>
                            {m.room && (
                              <button
                                onClick={() => setSelectedRoom(m.room)}
                                className="text-orange-600 hover:underline font-medium"
                              >
                                {m.room}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Schedule B */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 pb-1 border-b border-stone-200">
              {activeB.name}&apos;s Weekly Schedule
            </h3>
            {DAYS_LIST.map((day) => {
              const meetings = activeB.weeklyPattern[day].meetings;
              return (
                <div key={day} className="p-2.5 rounded-xl border border-stone-200/80 bg-stone-50/50 space-y-1.5">
                  <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60 uppercase">
                    {day}
                  </span>
                  {meetings.length === 0 ? (
                    <p className="text-[11px] text-stone-400 italic pt-1">No classes scheduled</p>
                  ) : (
                    <div className="space-y-1 pt-1">
                      {meetings.map((m, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-white border border-stone-200 text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-stone-900">{m.courseCode}</span>
                            <span className="text-[11px] text-stone-500 ml-1">({m.section})</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-stone-500">
                            <span>{formatMinutesToTime(m.start)} - {formatMinutesToTime(m.end)}</span>
                            {m.room && (
                              <button
                                onClick={() => setSelectedRoom(m.room)}
                                className="text-orange-600 hover:underline font-medium"
                              >
                                {m.room}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Room Schedule Side Sheet */}
      <RoomScheduleSheet room={selectedRoom} onClose={() => setSelectedRoom(null)} />
    </div>
  );
}

export default function FacultyComparePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className={`mx-auto ${PAGE_MAX_W}`}>
          <Suspense
            fallback={
              <div className="py-20 text-center text-stone-400 text-xs">
                Loading faculty comparison...
              </div>
            }
          >
            <CompareContent />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
