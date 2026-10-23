'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NoticeData, NoticeCourseItem, getNoticeData } from '../lib/noticeCourses';

interface NoticeBannerProps {
  noticeData?: NoticeData;
}

// <!-- TEMP NOTICE START -->
export function NoticeBanner({ noticeData }: NoticeBannerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const data = noticeData || getNoticeData();
  const { facultyChangedCodes, scheduleChangedCodes, allChangedCourses } = data;

  // Dismiss active tapped tooltip when clicking outside or pressing Escape
  useEffect(() => {
    if (!activeCode) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setActiveCode(null);
      }
    }

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as HTMLElement;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        if (target.closest('button[data-notice-code]')) return;
        setActiveCode(null);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeCode]);

  if (!isOpen) return null;

  const MAX_INLINE = 10;
  const hasFacultyOverflow = facultyChangedCodes.length > MAX_INLINE;
  const inlineFacultyCourses = hasFacultyOverflow
    ? facultyChangedCodes.slice(0, MAX_INLINE)
    : facultyChangedCodes;
  const remainingCount = facultyChangedCodes.length - MAX_INLINE;

  const activeCourseItem = activeCode
    ? allChangedCourses.find((c) => c.code === activeCode) ||
      facultyChangedCodes.find((c) => c.code === activeCode) ||
      scheduleChangedCodes.find((c) => c.code === activeCode)
    : null;

  const handleCodeClick = (code: string) => {
    setActiveCode((prev) => (prev === code ? null : code));
  };

  const renderInlineCode = (item: NoticeCourseItem, index: number, total: number) => {
    const isSelected = activeCode === item.code;
    const fullName =
      item.title && item.title !== item.code ? `${item.code} - ${item.title}` : item.code;
    return (
      <span key={item.code} className="inline">
        <button
          type="button"
          data-notice-code={item.code}
          onClick={() => handleCodeClick(item.code)}
          aria-label={fullName}
          title={fullName}
          aria-expanded={isSelected}
          className={`font-semibold underline decoration-amber-400 hover:decoration-amber-900 underline-offset-2 hover:text-amber-950 rounded px-0.5 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer transition-colors ${
            isSelected ? 'bg-amber-200/90 text-amber-950 ring-1 ring-amber-400' : 'text-amber-900'
          }`}
        >
          {item.code}
        </button>
        {index < total - 1 ? ', ' : ''}
      </span>
    );
  };

  return (
    <aside
      role="alert"
      aria-label="Temporary site notice"
      className="temp-notice-banner w-full bg-amber-50 border-b border-amber-200/90 text-amber-950 text-[12px] py-2 px-10 sm:px-12 transition-colors relative z-20"
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
        {/* ONE compact 12px line */}
        <p className="temp-notice-line leading-relaxed text-center text-amber-900/90">
          <span className="font-semibold text-amber-950">Faculty list updated. </span>
          <span>Changed in: </span>
          {inlineFacultyCourses.map((item, idx) =>
            renderInlineCode(item, idx, inlineFacultyCourses.length)
          )}
          {hasFacultyOverflow && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              className="ml-1 inline-flex items-center justify-center text-amber-950 hover:text-amber-900 font-bold underline underline-offset-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 py-1 sm:py-0 px-1.5 text-[12px] focus:outline-hidden focus:ring-1 focus:ring-amber-500 rounded cursor-pointer"
            >
              {isExpanded ? 'show less' : `+${remainingCount} more`}
            </button>
          )}

          {scheduleChangedCodes.length > 0 && (
            <>
              <span className="mx-2 text-amber-400 select-none" aria-hidden="true">
                &bull;
              </span>
              <span>Schedule changed in: </span>
              {scheduleChangedCodes.map((item, idx) =>
                renderInlineCode(item, idx, scheduleChangedCodes.length)
              )}
            </>
          )}
        </p>

        {/* Tapped course title popover pill on touch / click */}
        {activeCourseItem && (
          <div
            ref={popoverRef}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-200/95 text-amber-950 text-[12px] font-medium border border-amber-300 shadow-xs animate-in fade-in"
            role="tooltip"
          >
            <span className="font-bold">{activeCourseItem.code}:</span>
            <span>{activeCourseItem.title}</span>
            <button
              type="button"
              onClick={() => setActiveCode(null)}
              className="ml-1 text-amber-800 hover:text-amber-950 font-bold p-1 min-w-[24px] min-h-[24px] flex items-center justify-center"
              aria-label="Dismiss course name tooltip"
            >
              &times;
            </button>
          </div>
        )}

        {/* Expanded full list panel under the line */}
        {isExpanded && (
          <div
            className="mt-2.5 w-full max-w-2xl bg-amber-100/70 border border-amber-300/80 rounded-md p-2 shadow-xs text-left text-[12px] sm:text-[13px] max-h-[240px] overflow-y-auto divide-y divide-amber-200/70"
            role="region"
            aria-label="All updated courses list"
          >
            {allChangedCourses.map((c) => (
              <div
                key={c.code}
                className="py-1.5 px-2 flex items-center justify-between gap-2 hover:bg-amber-200/40 rounded transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="font-semibold text-amber-950 shrink-0">{c.code}</span>
                  <span className="text-amber-700 select-none" aria-hidden="true">
                    &middot;
                  </span>
                  <span className="text-amber-900 truncate" title={c.title}>
                    {c.title}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded border border-amber-300 shrink-0">
                  {c.changeKind}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Dismiss close (x) button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="temp-notice-close-btn absolute right-2 sm:right-4 top-2 p-1.5 rounded-md text-amber-800 hover:text-amber-950 hover:bg-amber-100/80 transition-colors shrink-0 flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[28px] sm:min-h-[28px]"
          aria-label="Close notice"
          title="Dismiss notice"
        >
          <span className="text-lg font-bold leading-none select-none" aria-hidden="true">
            &times;
          </span>
        </button>
      </div>
    </aside>
  );
}
// <!-- TEMP NOTICE END -->
