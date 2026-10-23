'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Search,
  Filter,
  Sliders,
  Share2,
  FileText,
  UserCheck,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { PAGE_MAX_W } from '../config/layout';
import { SiteFooter } from './SiteFooter';
import { DAYS_LIST } from '../types';
import { LANDING_COURSE_EXPLORER, LANDING_SCHEDULE_PREVIEW } from '../lib/landingData';

// Live metadata numbers directly from extracted datasets
const STATS = {
  sections: 791,
  courses: 107,
  faculty: 207,
  programs: 'BSCSE & BSDS',
};

export function LandingContent() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Redirect old shared links from /?... to /builder?... preserving query string
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      router.replace(`/builder${window.location.search}`);
    }
  }, [router]);

  const faqs = [
    {
      q: 'Is this an official UIU service?',
      a: 'No. UIU Routine Builder is an independent, open student project designed to assist peers during trimester planning. Always confirm your final course selections and section letters inside the official UIU UCAM portal.',
    },
    {
      q: 'Is my data stored on a server?',
      a: 'No, routines are saved in your own browser. Everything runs 100% locally with no login, no accounts, and no backend database. When you share a schedule, all details are encoded directly into the shareable URL parameters.',
    },
    {
      q: 'Does this register me for classes in UCAM automatically?',
      a: 'No. The app finds and ranks the optimal conflict-free combinations. Once you find your favorite routine, click "Copy UCAM" to instantly copy the exact course codes and section letters for easy copy-pasting during your registration slot.',
    },
    {
      q: 'How does the solver score and rank routines?',
      a: 'Routines are evaluated from 0 to 100 based on weighted metrics: matching preferred faculty (+30), minimizing idle gap minutes between classes (+25), compacting days into fewer weekly trips (+20), avoiding early/late slots (+15), and penalizing tentative sections (-10). You can customize each weight slider in the builder.',
    },
    {
      q: 'What if a course combination has no conflict-free section?',
      a: 'If hard clashes exist between your selected courses or restrictive day-off filters, the builder flags the conflict and suggests actionable fixes (e.g., relaxing day-off filters, unlocking locked sections, or swapping electives).',
    },
    {
      q: 'What is the data source and when was it updated?',
      a: 'Data is extracted from the official Fall 2026 class routine and faculty assignment PDF published by the Dept. of CSE, United International University (791 sections across BSCSE and BSDS).',
    },
  ];

  return (
    <div className="min-h-screen bg-page text-text-primary selection:bg-orange-500 selection:text-white flex flex-col">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-16 md:pb-24 bg-page">
        {/* Soft orange radial background glow */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-orange-400/10 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none"
        />

        <div className={`${PAGE_MAX_W} mx-auto px-4 sm:px-6 text-center relative z-10`}>
          {/* Term pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-chip bg-orange-50 text-orange-600 border border-orange-200 text-xs font-semibold mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Updated for Fall 2026 Trimester</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-text-primary tracking-tight max-w-4xl mx-auto leading-tight">
            Build your conflict-free class routine in seconds.
          </h1>

          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Pick your courses, set your faculty and time preferences, and get the best possible Fall 2026 routine, ready to copy into UCAM.
          </p>

          {/* Action CTAs: Full-width on phone (min-h 48px), neatly arranged on desktop */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
            <Link
              href="/builder"
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-warm flex items-center justify-center gap-2 text-base transition-transform active:scale-[0.98] hover:-translate-y-0.5"
            >
              <span>Start building</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-btn bg-surface hover:bg-subtle text-text-primary font-semibold border border-app-border shadow-xs flex items-center justify-center text-base transition-colors hover:border-orange-300"
            >
              See how it works
            </a>
          </div>

          {/* Live numbers trust strip: Clean 2x2 grid on mobile, flex strip on tablet/desktop */}
          <div className="mt-8 sm:mt-10 max-w-md sm:max-w-none mx-auto">
            <div className="grid grid-cols-2 sm:inline-flex sm:flex-wrap items-center justify-center gap-2 sm:gap-3 py-2 px-3 sm:px-4 rounded-card sm:rounded-chip bg-surface border border-app-border shadow-2xs text-xs sm:text-sm text-text-secondary font-medium">
              <span className="text-text-primary font-bold text-center sm:text-left py-1 sm:py-0">{STATS.sections} sections</span>
              <span className="hidden sm:inline text-border-strong">•</span>
              <span className="text-text-primary font-bold text-center sm:text-left py-1 sm:py-0">{STATS.courses} courses</span>
              <span className="hidden sm:inline text-border-strong">•</span>
              <span className="text-text-primary font-bold text-center sm:text-left py-1 sm:py-0">{STATS.faculty} faculty</span>
              <span className="hidden sm:inline text-border-strong">•</span>
              <span className="text-orange-600 font-semibold text-center sm:text-left py-1 sm:py-0 col-span-2 sm:col-span-1">{STATS.programs}</span>
            </div>
          </div>

          {/* Static polished mock of timetable grid using real data: Contained and horizontally scrollable on mobile */}
          <div className="mt-10 sm:mt-12 max-w-4xl mx-auto p-3 sm:p-5 rounded-card bg-surface border border-app-border shadow-warm text-left">
            <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-app-border text-xs gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-3 h-3 rounded-full bg-orange-500 inline-block shrink-0" />
                <span className="font-bold text-text-primary">Sample Optimal Schedule Preview</span>
                <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 font-semibold text-[11px]">
                  Example from Fall 2026 data
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px] shrink-0 font-mono">
                Score {LANDING_SCHEDULE_PREVIEW.score}/100
              </span>
            </div>

            <div className="overflow-x-auto -mx-1 px-1 pb-1">
              <div className="min-w-[580px] sm:min-w-0">
                {/* Timetable Header */}
                <div className="grid grid-cols-5 gap-2 pb-2 border-b border-app-border text-center font-bold text-xs uppercase text-text-muted">
                  {DAYS_LIST.map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>

                {/* Course blocks layout */}
                <div className="grid grid-cols-5 gap-2 mt-3 text-xs">
                  {DAYS_LIST.map((day) => {
                    const slots = LANDING_SCHEDULE_PREVIEW.schedule[day];
                    return (
                      <div key={day} className="space-y-2">
                        {slots.length === 0 ? (
                          <div className="h-full min-h-[72px] rounded-btn border border-dashed border-app-border/80 flex items-center justify-center text-[11px] text-text-muted/60 italic">
                            No classes
                          </div>
                        ) : (
                          slots.map((slot, idx) => (
                            <div
                              key={`${slot.courseCode}-${slot.section}-${idx}`}
                              className={`p-2.5 rounded-btn ${slot.colorClass.bg} ${slot.colorClass.border}`}
                            >
                              <div className={`font-bold ${slot.colorClass.text}`}>
                                {slot.courseCode} ({slot.section})
                              </div>
                              <div className={`text-[11px] ${slot.colorClass.subText} line-clamp-1`}>
                                {slot.faculty}
                              </div>
                              <div className="text-[11px] text-text-secondary mt-1 font-mono">
                                {slot.time} • {slot.room}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-app-border/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-text-muted gap-1">
              <span>Your routine will depend on your choices.</span>
              <span className="sm:hidden">Swipe horizontally to view full 5-day week &rarr;</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-surface border-y border-app-border">
        <div className={`${PAGE_MAX_W} mx-auto px-4 sm:px-6`}>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-orange-600 tracking-wider uppercase">
              Three Simple Steps
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight mt-1">
              How it works
            </h2>
            <p className="text-sm text-text-muted mt-2">
              From course selection to a clean UCAM schedule in less than 30 seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-card bg-page border border-app-border shadow-warm text-left space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white font-extrabold text-lg flex items-center justify-center shadow-xs">
                1
              </div>
              <h3 className="text-lg font-bold text-text-primary">
                Choose your courses
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Search by code (e.g. <code>CSE 1111</code>) or keyword (e.g. <code>DSA</code>, <code>OOP</code>). Add theory courses and one-click attach co-requisite labs.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-card bg-page border border-app-border shadow-warm text-left space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white font-extrabold text-lg flex items-center justify-center shadow-xs">
                2
              </div>
              <h3 className="text-lg font-bold text-text-primary">
                Browse faculty & preferences
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Explore sections per course, mark preferred or avoided professors, enforce day-offs (e.g., free Tuesdays), and set gap preferences.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-card bg-page border border-app-border shadow-warm text-left space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white font-extrabold text-lg flex items-center justify-center shadow-xs">
                3
              </div>
              <h3 className="text-lg font-bold text-text-primary">
                Get your best routines
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Review the top 50 conflict-free combinations scored from 0 to 100. Export immediately to UCAM clipboard, iCal (.ics), or clean PDF.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Grid (3x3) */}
      <section id="features" className="py-16 md:py-24 bg-page">
        <div className={`${PAGE_MAX_W} mx-auto px-4 sm:px-6`}>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-orange-600 tracking-wider uppercase">
              Engineered For UIU Students
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight mt-1">
              Everything you need for advising
            </h2>
            <p className="text-sm text-text-muted mt-2">
              Fast, private, and mathematically verified against all time clashes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: ShieldCheck,
                title: 'Zero-conflict guarantee',
                desc: 'Bitmask constraint checking eliminates every possible minute overlap across days, theory, and laboratories.',
              },
              {
                icon: Search,
                title: 'Course-wise faculty explorer',
                desc: 'Click any course to inspect every section, assigned faculty, scheduled day, time slot, and room.',
              },
              {
                icon: UserCheck,
                title: 'Faculty preferences',
                desc: 'Prioritize your favorite professors or avoid sections with heavy commutes or unfavorable teachers.',
              },
              {
                icon: Sliders,
                title: 'Smart scoring',
                desc: 'Evaluates gap lengths, compact class days, and preferred morning or afternoon hours.',
              },
              {
                icon: Layers,
                title: 'Theory + lab co-requisites',
                desc: 'Detects paired 3-credit theory and 1-credit lab courses and offers one-click bundle addition.',
              },
              {
                icon: Filter,
                title: 'Credit limit tracking',
                desc: 'Enforces UIU regulations (9 credits minimum, 18 credits maximum) with visible underload/overload alerts.',
              },
              {
                icon: FileText,
                title: 'Export: UCAM, iCal, Print/PDF',
                desc: 'One-click copy for quick UCAM pasting, standard recurring .ics calendar download, and printer stylesheet.',
              },
              {
                icon: Share2,
                title: 'Shareable links',
                desc: 'Every solve request is cleanly encoded in the URL query string so you can share your plan with friends.',
              },
              {
                icon: Zap,
                title: 'Runs 100% in browser',
                desc: 'High performance Web Worker solver computes millions of combinations locally without server delays or logins.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-5 rounded-card bg-surface border border-app-border shadow-warm space-y-2.5 text-left transition-all hover:border-orange-400"
              >
                <div className="w-9 h-9 rounded-btn bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-text-primary">{title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Faculty Explorer Teaser */}
      <section id="explorer" className="py-10 md:py-16 bg-surface border-y border-app-border">
        <div className={`${PAGE_MAX_W} mx-auto px-4 sm:px-6`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="text-left space-y-4">
              <span className="text-xs font-bold text-orange-600 tracking-wider uppercase">
                Faculty Explorer
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
                Course-Wise Faculty &amp; Section Explorer
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                See every faculty, section, and time for a course before you decide. Compare morning vs afternoon offerings, view 5-day distribution, and set your preferences in one unified view.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href="/builder"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-xs transition-colors"
                >
                  <span>Explore in builder</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/faculty"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-btn bg-surface hover:bg-subtle text-text-primary font-semibold text-sm border border-app-border shadow-2xs transition-colors hover:border-orange-300"
                >
                  <span>Browse course directory &rarr;</span>
                </Link>
              </div>
            </div>

            {/* Visual preview card built with real sections */}
            <div className="p-5 rounded-card bg-page border border-app-border shadow-warm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-app-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text-primary">
                      {LANDING_COURSE_EXPLORER.courseCode}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">
                      {LANDING_COURSE_EXPLORER.credit} Credits
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-subtle text-text-secondary border border-app-border">
                      {LANDING_COURSE_EXPLORER.program}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {LANDING_COURSE_EXPLORER.courseTitle} • {LANDING_COURSE_EXPLORER.totalSections} Sections
                  </div>
                </div>
              </div>

              {/* Sample Faculty Groups */}
              <div className="space-y-2 text-xs">
                {LANDING_COURSE_EXPLORER.faculty.map((fac) => (
                  <div key={fac.facultyName} className="p-3 rounded-btn bg-surface border border-app-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-primary">{fac.facultyName}</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-subtle text-text-muted">
                        {fac.sectionCount} {fac.sectionCount === 1 ? 'section' : 'sections'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {fac.sections.map((sec) => (
                        <div key={sec.section} className="p-1.5 rounded bg-subtle border border-app-border">
                          <div className="font-semibold text-text-primary">
                            Sec {sec.section} ({sec.days})
                          </div>
                          <div className="text-text-muted font-mono">
                            {sec.time} • {sec.room}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-text-muted text-center pt-1 italic">
                See every faculty, section and time for a course before you decide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ Section */}
      <section id="faq" className="py-16 md:py-24 bg-page">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-orange-600 tracking-wider uppercase">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight mt-1">
              Common questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-card bg-surface border border-app-border shadow-2xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full min-h-[48px] p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-text-primary hover:text-orange-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-text-muted transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180 text-orange-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-text-secondary leading-relaxed border-t border-app-border/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Final CTA Band */}
      <section className="py-12 md:py-16 bg-orange-100 border-y border-orange-200">
        <div className={`${PAGE_MAX_W} mx-auto px-4 sm:px-6 text-center space-y-4`}>
          <h2 className="text-2xl sm:text-4xl font-black text-text-primary tracking-tight">
            Ready to plan your trimester?
          </h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Build your Fall 2026 routine in seconds without manual paper clashing.
          </p>
          <div className="max-w-md sm:max-w-none mx-auto">
            <Link
              href="/builder"
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-bold text-base shadow-warm transition-transform active:scale-[0.98] hover:-translate-y-0.5"
            >
              <span>Build my routine now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <SiteFooter />
    </div>
  );
}
