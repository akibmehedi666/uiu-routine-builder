import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Faculty Directory',
  description:
    'See who teaches what this trimester. Browse UIU faculty profiles, teaching schedules, and course sections (Dept. of CSE & Data Science).',
};

export default function FacultyDirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
