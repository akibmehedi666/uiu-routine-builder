/**
 * Shared page layout constants.
 * Single source of truth for desktop page max-width across all pages.
 * Controlled by --page-max-w CSS variable in src/app/globals.css (default 1440px).
 * Change --page-max-w in globals.css to try another width (1360, 1400, 1440, 1480...).
 */
export const PAGE_MAX_W = 'max-w-[var(--page-max-w,1440px)]';
