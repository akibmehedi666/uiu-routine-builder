import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Faculty & Sections | UIU Routine Builder',
  description:
    'Search faculty schedules, sections, and teaching timetables for UIU Fall 2026 trimester (Dept. of CSE & Data Science).',
};

export default function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
