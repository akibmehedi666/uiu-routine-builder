import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Exam Schedule',
  description:
    'Mid-term exam schedule, time slots, and room-by-ID lookup for UIU Fall 2026 (Dept. of CSE & Data Science).',
};

export default function ExamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
