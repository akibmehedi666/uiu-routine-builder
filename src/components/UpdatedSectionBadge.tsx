import React from 'react';

interface UpdatedSectionBadgeProps {
  updated?: boolean;
  updatedOn?: string;
  tooltip?: string;
  className?: string;
}

/**
 * Shared tiny badge indicating a section whose faculty assignment was updated.
 * Follows UIU orange-soft tokens with 11px text and informative tooltip.
 */
export function UpdatedSectionBadge({
  updated,
  updatedOn = '2026-10-24',
  tooltip,
  className = '',
}: UpdatedSectionBadgeProps) {
  if (!updated) return null;

  const defaultTooltip =
    updatedOn === '2026-10-24'
      ? 'Faculty updated on 24 Oct 2026'
      : updatedOn
      ? `Faculty updated on ${updatedOn}`
      : 'Faculty assignment updated';

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 select-none shrink-0 ${className}`}
      title={tooltip || defaultTooltip}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
      Updated
    </span>
  );
}
