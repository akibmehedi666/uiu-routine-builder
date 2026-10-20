import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Course Directory — UIU Routine Builder',
  description:
    'Browse courses, faculty assignments, and section meeting times for UIU Fall 2026 trimester (Dept. of CSE & Data Science).',
};

export default function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
