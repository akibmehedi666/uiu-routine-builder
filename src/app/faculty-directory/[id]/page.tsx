import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Copy,
  Check,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  Sparkles,
  Users,
  ExternalLink,
  Flame,
  Moon,
  Bell,
  FlaskConical,
  Layers,
  Award,
} from 'lucide-react';

import { PAGE_MAX_W } from '../../../config/layout';
import { SiteFooter } from '../../../components/SiteFooter';
import {
  getAllFacultyStats,
  getFacultyStatsById,
  FacultyStats,
  formatMinutesToTime,
} from '../../../lib/facultyStats';
import { getCourseColor } from '../../../utils/colors';
import { Day, DAYS_LIST } from '../../../types';
import { CopyButton } from './CopyButton';

// Static params generation for all 207 faculty members
export function generateStaticParams() {
  const allFaculty = getAllFacultyStats();
  return allFaculty.map((f) => ({
    id: f.id,
  }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const faculty = getFacultyStatsById(params.id);
  if (!faculty) {
    return {
      title: 'Faculty Not Found',
    };
  }

  return {
    title: faculty.name,
    description: `Teaching timetable and course section assignments for ${faculty.name} (${faculty.programs.join(
      ', '
    )}) at UIU for Fall 2026.`,
  };
}

function BadgeIcon({ name, className = 'w-3.5 h-3.5' }: { name: string; className?: string }) {
  switch (name) {
    case 'Bell':
      return <Bell className={className} />;
    case 'Moon':
      return <Moon className={className} />;
    case 'FlaskConical':
      return <FlaskConical className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'Calendar':
      return <Calendar className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

const TIMETABLE_SLOTS = [
  { label: '08:30', min: 510 },
  { label: '09:50', min: 590 },
  { label: '11:10', min: 670 },
  { label: '12:30', min: 750 },
  { label: '13:50', min: 830 },
  { label: '15:10', min: 910 },
  { label: '16:30', min: 990 },
];

export default function FacultyDetailPage({ params }: { params: { id: string } }) {
  const faculty = getFacultyStatsById(params.id);

  if (!faculty) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg-page flex flex-col justify-between">
      <main className={`${PAGE_MAX_W} mx-auto w-full px-4 sm:px-6 py-6 md:py-8 space-y-6 flex-1`}>
        {/* Navigation Breadcrumb / Back Link */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/faculty-directory"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-orange-600 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-orange-500" />
            <span>Back to Faculty Directory</span>
          </Link>

          <CopyButton />
        </div>

        {/* Header Profile Card */}
        <div className="bg-surface rounded-2xl border border-app-border p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-bold text-xl sm:text-2xl shrink-0 border-2 shadow-xs"
                style={{
                  backgroundColor: faculty.avatarColor.bg,
                  color: faculty.avatarColor.text,
                  borderColor: faculty.avatarColor.border,
                }}
              >
                {faculty.initials}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {faculty.programs.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200"
                    >
                      {p}
                    </span>
                  ))}
                  <span className="text-xs text-text-muted">Dept. of CSE & Data Science</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                  {faculty.name}
                </h1>
                <p className="text-xs text-text-muted">
                  Teaching assignments for Fall 2026 trimester
                </p>
              </div>
            </div>

            {/* Badges Strip */}
            {faculty.badges.length > 0 && (
              <div className="flex flex-wrap sm:justify-end gap-1.5 shrink-0">
                {faculty.badges.map((b) => (
                  <span
                    key={b.id}
                    title={b.description}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border shadow-2xs ${b.badgeStyle}`}
                  >
                    <BadgeIcon name={b.iconName} className="w-3.5 h-3.5" />
                    <span>{b.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-app-border/80 text-center">
            <div className="bg-bg-page rounded-xl p-3 border border-app-border/70">
              <span className="block text-lg sm:text-xl font-bold text-text-primary">
                {faculty.distinctCourseCount}
              </span>
              <span className="text-xs text-text-muted">
                Courses ({faculty.theoryCourseCount} Theory, {faculty.labCourseCount} Lab)
              </span>
            </div>

            <div className="bg-bg-page rounded-xl p-3 border border-app-border/70">
              <span className="block text-lg sm:text-xl font-bold text-text-primary">
                {faculty.totalSections}
              </span>
              <span className="text-xs text-text-muted">Total Sections</span>
            </div>

            <div className="bg-bg-page rounded-xl p-3 border border-app-border/70">
              <span className="block text-lg sm:text-xl font-bold text-text-primary">
                {faculty.totalCredits}
              </span>
              <span className="text-xs text-text-muted">Course Credits</span>
            </div>

            <div className="bg-bg-page rounded-xl p-3 border border-app-border/70">
              <span className="block text-lg sm:text-xl font-bold text-text-primary">
                {faculty.totalWeeklyHours}h
              </span>
              <span className="text-xs text-text-muted">Weekly Contact Hours</span>
            </div>
          </div>
        </div>

        {/* Page-level Overview Stats Card */}
        <div className="bg-surface rounded-xl border border-app-border p-4 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-text-muted block font-medium">Busiest Day:</span>
              <span className="font-bold text-text-primary text-sm mt-0.5 block">
                {faculty.busiestDay ? faculty.busiestDay : 'None'}
              </span>
            </div>

            <div>
              <span className="text-text-muted block font-medium">Days on Campus:</span>
              <span className="font-bold text-text-primary text-sm mt-0.5 block">
                {faculty.daysOnCampus} days ({faculty.activeDays.join(', ')})
              </span>
            </div>

            <div>
              <span className="text-text-muted block font-medium">Earliest & Latest:</span>
              <span className="font-bold text-text-primary text-sm mt-0.5 block">
                {faculty.earliestStartTimeStr} – {faculty.latestEndTimeStr}
              </span>
            </div>

            <div>
              <span className="text-text-muted block font-medium">Time Slots Breakdown:</span>
              <span className="font-bold text-text-primary text-sm mt-0.5 block">
                {faculty.slotCounts.morning} Morning · {faculty.slotCounts.midday} Midday ·{' '}
                {faculty.slotCounts.afternoon} Afternoon
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Teaching Timetable Section */}
        <div className="bg-surface rounded-2xl border border-app-border p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              <h2 className="text-base font-bold text-text-primary">Weekly Teaching Timetable</h2>
            </div>
            <span className="text-xs text-text-muted">Sat – Wed · 08:30 AM – 04:30 PM</span>
          </div>

          {/* Mini Timetable Grid Container with horizontal scrolling on mobile */}
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[640px]">
              {/* Grid Header: Days */}
              <div className="grid grid-cols-[56px_repeat(5,1fr)] gap-2 mb-2 text-center text-xs font-bold text-text-secondary">
                <div className="text-text-muted font-normal text-[11px] self-end pb-1">Time</div>
                {DAYS_LIST.map((day) => {
                  const isActive = faculty.activeDays.includes(day);
                  const count = faculty.weeklyPattern[day].count;
                  return (
                    <div
                      key={day}
                      className={`py-1.5 rounded-lg border text-xs font-semibold ${
                        isActive
                          ? 'bg-orange-50 border-orange-200 text-orange-900 font-bold'
                          : 'bg-bg-page border-app-border/80 text-text-muted'
                      }`}
                    >
                      <span>{day}</span>
                      {count > 0 && (
                        <span className="ml-1 text-[11px] text-orange-600 font-normal">
                          ({count})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grid Body: 480 minutes (08:30 to 16:30) */}
              <div className="relative h-[400px] grid grid-cols-[56px_repeat(5,1fr)] gap-2 bg-bg-page rounded-xl border border-app-border p-2">
                {/* Time Scale Column */}
                <div className="relative h-full text-[11px] text-text-muted font-mono select-none">
                  {TIMETABLE_SLOTS.map((slot) => {
                    const topPct = ((slot.min - 510) / 480) * 100;
                    return (
                      <div
                        key={slot.min}
                        style={{ top: `${topPct}%` }}
                        className="absolute right-1 -translate-y-1/2"
                      >
                        {slot.label}
                      </div>
                    );
                  })}
                </div>

                {/* Day Columns */}
                {DAYS_LIST.map((day) => {
                  const dayPattern = faculty.weeklyPattern[day];
                  return (
                    <div
                      key={day}
                      className="relative h-full rounded-lg bg-surface/90 border border-app-border/60 overflow-hidden"
                    >
                      {/* Grid background lines */}
                      {TIMETABLE_SLOTS.map((slot) => {
                        const topPct = ((slot.min - 510) / 480) * 100;
                        return (
                          <div
                            key={slot.min}
                            style={{ top: `${topPct}%` }}
                            className="absolute left-0 right-0 border-t border-app-border/40 pointer-events-none"
                          />
                        );
                      })}

                      {/* Class Blocks */}
                      {dayPattern.meetings.map((m, idx) => {
                        const topPct = ((m.start - 510) / 480) * 100;
                        const heightPct = Math.max(((m.end - m.start) / 480) * 100, 8);
                        const color = getCourseColor(m.courseCode);

                        return (
                          <div
                            key={`${m.courseCode}-${m.section}-${m.start}-${idx}`}
                            style={{
                              top: `${topPct}%`,
                              height: `${heightPct}%`,
                            }}
                            className={`absolute left-1 right-1 p-1.5 rounded-btn border-l-4 border shadow-xs overflow-hidden flex flex-col justify-between ${
                              color.bg
                            } ${color.border} ${m.tentative ? 'border-dashed' : ''}`}
                            title={`${m.courseCode} Sec ${m.section} (${formatMinutesToTime(
                              m.start
                            )} - ${formatMinutesToTime(m.end)})${m.room ? ` Rm ${m.room}` : ''}`}
                          >
                            <div className="flex items-center justify-between gap-1 leading-tight">
                              <span className={`font-bold text-xs truncate ${color.text}`}>
                                {m.courseCode}
                              </span>
                              <span className="text-[11px] font-bold px-1 rounded bg-surface/90 text-text-primary">
                                {m.section}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-text-muted mt-0.5">
                              <span>{formatMinutesToTime(m.start).replace(':00', '')}</span>
                              {m.room && <span>Rm {m.room}</span>}
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

          {/* Accessible screen reader & text alternative */}
          <div className="pt-2 border-t border-app-border/60">
            <details className="text-xs text-text-muted group">
              <summary className="cursor-pointer font-medium hover:text-text-primary list-none flex items-center gap-1.5 select-none">
                <span className="underline underline-offset-2">
                  View accessible timetable text list
                </span>
              </summary>
              <div className="mt-2 space-y-2 bg-bg-page p-3 rounded-lg border border-app-border">
                {DAYS_LIST.map((day) => {
                  const meetings = faculty.weeklyPattern[day].meetings;
                  if (meetings.length === 0) return null;
                  return (
                    <div key={day} className="space-y-1">
                      <span className="font-bold text-text-primary">{day}:</span>
                      <ul className="list-disc list-inside space-y-0.5 pl-2">
                        {meetings.map((m, i) => (
                          <li key={i}>
                            <strong>{m.courseCode}</strong> Section {m.section} (
                            {formatMinutesToTime(m.start)} – {formatMinutesToTime(m.end)})
                            {m.room ? `, Room ${m.room}` : ''} [{m.kind}]
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        </div>

        {/* Courses & Sections Section */}
        <div className="bg-surface rounded-2xl border border-app-border p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-orange-500" />
              <h2 className="text-base font-bold text-text-primary">Courses & Assigned Sections</h2>
            </div>
            <span className="text-xs text-text-muted">{faculty.courses.length} courses</span>
          </div>

          <div className="space-y-4">
            {faculty.courses.map((course) => (
              <div
                key={course.courseCode}
                className="rounded-xl border border-app-border bg-bg-page overflow-hidden"
              >
                {/* Course Header with deep link to Course Directory */}
                <div className="px-4 py-3 bg-surface border-b border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Link
                      href={`/faculty?c=${encodeURIComponent(course.courseCode)}`}
                      className="font-bold text-sm text-text-primary hover:text-orange-600 transition-colors inline-flex items-center gap-1"
                      title="View all sections in Course Directory"
                    >
                      <span>{course.courseCode}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-orange-500" />
                    </Link>
                    <span className="text-text-muted">·</span>
                    <span className="text-xs text-text-secondary truncate">{course.title}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <span className="px-2 py-0.5 rounded bg-bg-page border border-app-border text-text-muted font-medium">
                      {course.credit} Credits
                    </span>
                    <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-900 font-semibold">
                      {course.sectionCount} {course.sectionCount === 1 ? 'section' : 'sections'}
                    </span>
                  </div>
                </div>

                {/* Section Rows (UCAM style, without prefer/avoid buttons) */}
                <div className="divide-y divide-app-border/60">
                  {course.sections.map((sec) => (
                    <div
                      key={sec.id}
                      className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-orange-50/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-orange-500 text-white font-bold flex items-center justify-center shrink-0">
                          {sec.section}
                        </span>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text-primary">
                              Section {sec.section}
                            </span>
                            <span className="text-[11px] font-semibold text-text-muted uppercase px-1.5 py-0.2 rounded bg-surface border border-app-border">
                              {sec.kind}
                            </span>
                            {sec.tentative && (
                              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                                Tentative
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-text-muted text-[11px]">
                            <span>Days: {sec.days.join(', ')}</span>
                            {sec.room && (
                              <>
                                <span>·</span>
                                <span>Room {sec.room}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-btn bg-surface border border-app-border text-text-secondary font-medium font-mono text-xs">
                          {sec.timeRange}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teaches With Strip */}
        {faculty.teachesWith.length > 0 && (
          <div className="bg-surface rounded-2xl border border-app-border p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-500" />
                <h2 className="text-base font-bold text-text-primary">
                  Teaches With (Co-Instructors)
                </h2>
              </div>
              <span className="text-xs text-text-muted">Faculty sharing the same courses</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {faculty.teachesWith.map((co) => (
                <Link
                  key={co.facultyId}
                  href={`/faculty-directory/${co.facultyId}`}
                  className="bg-bg-page hover:bg-orange-50/50 rounded-xl border border-app-border hover:border-orange-300 p-3 transition-colors flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-text-primary group-hover:text-orange-600 truncate block transition-colors">
                      {co.facultyName}
                    </span>
                    <span className="text-[11px] text-text-muted block truncate mt-0.5">
                      Shares: {co.sharedCourses.join(', ')}
                    </span>
                  </div>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-text-muted group-hover:text-orange-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer Note */}
        <p className="text-[11px] text-text-muted text-center pt-2">
          Based on the Fall 2026 offering PDF. Assignments may change.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
