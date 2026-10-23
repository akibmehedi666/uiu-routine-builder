'use client';

import React, { useState } from 'react';

interface NoticeCourseListProps {
  label: string;
  courses: string[];
  maxInline?: number;
}

export function NoticeCourseList({
  label,
  courses,
  maxInline = 10,
}: NoticeCourseListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!courses || courses.length === 0) return null;

  const hasOverflow = courses.length > maxInline;
  const visibleCourses = isExpanded || !hasOverflow ? courses : courses.slice(0, maxInline);
  const remainingCount = courses.length - maxInline;

  return (
    <span className="inline">
      <span className="font-semibold text-amber-950">{label}: </span>
      <span className="text-amber-900/90">{visibleCourses.join(', ')}</span>
      {hasOverflow && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="ml-1 inline-flex items-center text-amber-900 hover:text-amber-950 font-semibold underline underline-offset-2 min-h-[44px] sm:min-h-0 py-1 sm:py-0 px-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500 rounded cursor-pointer"
        >
          {isExpanded ? 'show less' : `+${remainingCount} more`}
        </button>
      )}
    </span>
  );
}
