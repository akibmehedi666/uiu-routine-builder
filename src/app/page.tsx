'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  HelpCircle,
  Menu,
  X,
  Zap,
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
  BookOpen,
} from 'lucide-react';
import { formatTime24 } from '../utils/export';

import { SiteNav } from '../components/SiteNav';

// Live metadata numbers directly from extracted datasets
const STATS = {
  sections: 791,
  courses: 107,
  faculty: 207,
  programs: 'BSCSE & BSDS',
};

export default function LandingPage() {
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
      q: 'Is my schedule or personal data stored on a server?',
      a: 'No. Everything runs 100% locally in your web browser. No databases, accounts, or analytics track your course picks. When you share a schedule, all details are encoded directly into the shareable URL parameters.',
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
    <div className="min-h-screen bg-page text-text-primary selection:bg-orange-500 selection:text-white">
      {/* 1. Sticky SiteNav */}
      <SiteNav />

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-16 md:pb-24 bg-page">
        {/* Soft orange radial background glow */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-orange-400/10 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none"
        />

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 text-center relative z-10">
          {/* Term pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-chip bg-orange-50 text-orange-600 border border-orange-200 text-xs font-semibold mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Updated for Fall 2026 Trimester</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary tracking-tight max-w-4xl mx-auto leading-tight">
            Build your conflict-free class routine in seconds.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Pick your courses, set your faculty and time preferences, and get the best possible Fall 2026 routine, ready to copy into UCAM.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/builder"
              className="px-6 py-3 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-warm flex items-center gap-2 text-base transition-transform hover:-translate-y-0.5"
            >
              <span>Start building</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="px-6 py-3 rounded-btn bg-surface hover:bg-subtle text-text-primary font-semibold border border-app-border shadow-xs text-base transition-colors hover:border-orange-300"
            >
              See how it works
            </a>
          </div>

          {/* Live numbers trust strip */}
          <div className="mt-10 inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-2 px-4 rounded-chip bg-surface border border-app-border shadow-2xs text-xs sm:text-sm text-text-secondary font-medium">
            <span className="text-text-primary font-bold">{STATS.sections} sections</span>
            <span className="text-border-strong">•</span>
            <span className="text-text-primary font-bold">{STATS.courses} courses</span>
            <span className="text-border-strong">•</span>
            <span className="text-text-primary font-bold">{STATS.faculty} faculty</span>
            <span className="text-border-strong">•</span>
            <span className="text-orange-600 font-semibold">{STATS.programs}</span>
          </div>

          {/* Static polished mock of timetable grid using real data */}
          <div className="mt-12 max-w-4xl mx-auto p-3 sm:p-5 rounded-card bg-surface border border-app-border shadow-warm text-left">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-app-border text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
                <span className="font-bold text-text-primary">Sample Optimal Schedule Preview</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                Score 98/100 • Conflict-Free
              </span>
            </div>

            {/* Timetable Header */}
            <div className="grid grid-cols-5 gap-2 pb-2 border-b border-app-border text-center font-bold text-xs uppercase text-text-muted">
              <div>Sat</div>
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
            </div>

            {/* Course blocks layout */}
            <div className="grid grid-cols-5 gap-2 mt-3 text-xs">
              {/* Sat Column */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-btn bg-orange-50 border-l-4 border-orange-500 border border-orange-200">
                  <div className="font-bold text-orange-950">CSE 1111 (A)</div>
                  <div className="text-[11px] text-orange-900 line-clamp-1">Ishrat Jahan</div>
                  <div className="text-[10px] text-text-secondary mt-1">08:30–09:50 • R301</div>
                </div>
                <div className="p-2.5 rounded-btn bg-sky-50 border-l-4 border-sky-500 border border-sky-200">
                  <div className="font-bold text-sky-950">MATH 1151 (B)</div>
                  <div className="text-[11px] text-sky-900 line-clamp-1">Dr. Md. Tariqul Islam</div>
                  <div className="text-[10px] text-text-secondary mt-1">09:50–11:10 • R302</div>
                </div>
              </div>

              {/* Sun Column */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-btn bg-emerald-50 border-l-4 border-emerald-600 border border-emerald-200">
                  <div className="font-bold text-emerald-950">CSE 2213 (C)</div>
                  <div className="text-[11px] text-emerald-900 line-clamp-1">Md. Muhaiminul Islam</div>
                  <div className="text-[10px] text-text-secondary mt-1">11:10–12:30 • R303</div>
                </div>
                <div className="p-2.5 rounded-btn bg-violet-50 border-l-4 border-violet-500 border border-violet-200">
                  <div className="font-bold text-violet-950">CSE 2215 (D)</div>
                  <div className="text-[11px] text-violet-900 line-clamp-1">Dr. Swakkhar Shatabda</div>
                  <div className="text-[10px] text-text-secondary mt-1">12:30–01:50 • R405</div>
                </div>
              </div>

              {/* Mon Column */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-btn bg-rose-50 border-l-4 border-rose-500 border border-rose-200">
                  <div className="font-bold text-rose-950">CSE 2216 (AL)</div>
                  <div className="text-[11px] text-rose-900 line-clamp-1">Lab Section</div>
                  <div className="text-[10px] text-text-secondary mt-1">08:30–11:10 • Comp Lab 1</div>
                </div>
              </div>

              {/* Tue Column */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-btn bg-orange-50 border-l-4 border-orange-500 border border-orange-200">
                  <div className="font-bold text-orange-950">CSE 1111 (A)</div>
                  <div className="text-[11px] text-orange-900 line-clamp-1">Ishrat Jahan</div>
                  <div className="text-[10px] text-text-secondary mt-1">08:30–09:50 • R301</div>
                </div>
                <div className="p-2.5 rounded-btn bg-sky-50 border-l-4 border-sky-500 border border-sky-200">
                  <div className="font-bold text-sky-950">MATH 1151 (B)</div>
                  <div className="text-[11px] text-sky-900 line-clamp-1">Dr. Md. Tariqul Islam</div>
                  <div className="text-[10px] text-text-secondary mt-1">09:50–11:10 • R302</div>
                </div>
              </div>

              {/* Wed Column */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-btn bg-emerald-50 border-l-4 border-emerald-600 border border-emerald-200">
                  <div className="font-bold text-emerald-950">CSE 2213 (C)</div>
                  <div className="text-[11px] text-emerald-900 line-clamp-1">Md. Muhaiminul Islam</div>
                  <div className="text-[10px] text-text-secondary mt-1">11:10–12:30 • R303</div>
                </div>
                <div className="p-2.5 rounded-btn bg-violet-50 border-l-4 border-violet-500 border border-violet-200">
                  <div className="font-bold text-violet-950">CSE 2215 (D)</div>
                  <div className="text-[11px] text-violet-900 line-clamp-1">Dr. Swakkhar Shatabda</div>
                  <div className="text-[10px] text-text-secondary mt-1">12:30–01:50 • R405</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-surface border-y border-app-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
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

      {/* 4. Features Grid (3x3) */}
      <section id="features" className="py-16 md:py-24 bg-page">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
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

      {/* 5. Faculty Explorer Teaser */}
      <section id="explorer" className="py-10 md:py-16 bg-surface border-y border-app-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
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
                    <span className="font-bold text-sm text-text-primary">CSE 1111</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">
                      3 Credits
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-subtle text-text-secondary border border-app-border">
                      BSCSE
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    Structured Programming Language • 25 Sections
                  </div>
                </div>
              </div>

              {/* Sample Faculty Groups */}
              <div className="space-y-2 text-xs">
                {/* Faculty 1 */}
                <div className="p-3 rounded-btn bg-surface border border-app-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary">Ishrat Jahan</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-subtle text-text-muted">
                      2 sections
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-1.5 rounded bg-subtle border border-app-border">
                      <div className="font-semibold text-text-primary">Sec A (Sat/Tue)</div>
                      <div className="text-text-muted">08:30–09:50 • Room 301</div>
                    </div>
                    <div className="p-1.5 rounded bg-subtle border border-app-border">
                      <div className="font-semibold text-text-primary">Sec B (Sat/Tue)</div>
                      <div className="text-text-muted">09:50–11:10 • Room 301</div>
                    </div>
                  </div>
                </div>

                {/* Faculty 2 */}
                <div className="p-3 rounded-btn bg-surface border border-app-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary">Md. Mahfuzur Rahman</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-subtle text-text-muted">
                      2 sections
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-1.5 rounded bg-subtle border border-app-border">
                      <div className="font-semibold text-text-primary">Sec C (Sun/Wed)</div>
                      <div className="text-text-muted">08:30–09:50 • Room 304</div>
                    </div>
                    <div className="p-1.5 rounded bg-subtle border border-app-border">
                      <div className="font-semibold text-text-primary">Sec D (Sun/Wed)</div>
                      <div className="text-text-muted">09:50–11:10 • Room 304</div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-text-muted text-center pt-1 italic">
                See every faculty, section and time for a course before you decide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
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
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-text-primary hover:text-orange-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
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

      {/* 7. Final CTA Band */}
      <section className="py-12 md:py-16 bg-orange-100 border-y border-orange-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 text-center space-y-4">
          <h2 className="text-2xl sm:text-4xl font-black text-text-primary tracking-tight">
            Ready to plan your trimester?
          </h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Build your Fall 2026 routine in seconds without manual paper clashing.
          </p>
          <div>
            <Link
              href="/builder"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-bold text-base shadow-warm transition-transform hover:-translate-y-0.5"
            >
              <span>Build my routine now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="py-10 bg-surface border-t border-app-border text-center text-xs text-text-muted">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-2">
          <p className="font-medium text-text-secondary">
            Unofficial student project. Not affiliated with United International University. Always confirm sections in UCAM.
          </p>
          <div className="flex items-center justify-center space-x-4 pt-2">
            <Link href="/builder" className="hover:text-orange-600 transition-colors">
              Routine Builder
            </Link>
            <span>•</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
            >
              <span>User Guide</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-[11px] pt-2 text-text-muted">
            UIU Routine Builder • Fall 2026 Trimester • Dept. of CSE
          </p>
        </div>
      </footer>
    </div>
  );
}
