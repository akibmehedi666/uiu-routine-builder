'use client';

import React from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { getMostDroppedFacultyLeaderboard } from '../../lib/facultyStats';

interface MostDroppedCardProps {
  onSelectFaculty?: (facultyId: string) => void;
}

export function MostDroppedCard({ onSelectFaculty }: MostDroppedCardProps) {
  const ranking = getMostDroppedFacultyLeaderboard();

  if (!ranking || ranking.entries.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface rounded-xl p-3 border border-rose-200 shadow-2xs space-y-2 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-rose-100">
          <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4 text-rose-600" /> Most dropped sections
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
            Portal update
          </span>
        </div>
        <ol className="space-y-2.5 text-xs pt-2">
          {ranking.entries.map((item) => (
            <li key={item.facultyId} className="space-y-1">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                      item.rank.startsWith('=1') || item.rank === '1'
                        ? 'bg-amber-400 text-amber-950 shadow-2xs'
                        : item.rank === '2'
                        ? 'bg-slate-300 text-slate-800'
                        : item.rank === '3'
                        ? 'bg-amber-200 text-amber-900'
                        : 'text-text-muted bg-subtle'
                    }`}
                  >
                    {item.rank}
                  </span>

                  {/* Soft pastel Avatar circle matching directory list */}
                  <div
                    style={{
                      backgroundColor: item.avatarColor.bg,
                      color: item.avatarColor.text,
                      borderColor: item.avatarColor.border,
                    }}
                    className="w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[11px] shrink-0 select-none"
                    title={item.name}
                  >
                    {item.initials}
                  </div>

                  {item.hasActiveSections ? (
                    onSelectFaculty ? (
                      <button
                        type="button"
                        onClick={() => onSelectFaculty(item.facultyId)}
                        className="truncate font-medium text-text-primary hover:text-rose-700 cursor-pointer text-left transition-colors"
                        title={item.name}
                      >
                        {item.name}
                      </button>
                    ) : (
                      <Link
                        href={`/faculty-directory/${item.facultyId}`}
                        className="truncate font-medium text-text-primary hover:text-rose-700 cursor-pointer text-left transition-colors"
                        title={item.name}
                      >
                        {item.name}
                      </Link>
                    )
                  ) : (
                    <span className="truncate font-medium text-text-muted flex items-center gap-1.5">
                      <span className="truncate">{item.name}</span>
                      <span className="text-[11px] px-1 py-0.2 rounded bg-subtle text-text-muted border border-app-border shrink-0">
                        No active sections
                      </span>
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[18px] font-bold tabular-nums text-text-primary">
                    {item.droppedCount}
                  </span>
                  <span className="text-[11px] text-text-muted ml-1">dropped</span>
                </div>
              </div>

              {/* Muted detail line */}
              <div className="text-[11px] text-text-muted truncate pl-6">
                {item.sectionsDetail}
              </div>

              {/* Thin orange bar relative to max (max = 100%) */}
              <div className="w-full bg-subtle rounded-full h-1 overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full transition-all"
                  style={{ width: `${item.barPercentage}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      </div>

      {ranking.tbaDroppedCount > 0 && (
        <div className="pt-2 border-t border-rose-100 text-[11px] text-text-muted italic">
          {ranking.tbaDroppedCount} dropped sections had no faculty assigned (TBA)
        </div>
      )}
    </div>
  );
}
