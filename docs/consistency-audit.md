# UI Consistency Audit & Specification (UIU Routine Builder)

**Branch**: `wip/ui-consistency`  
**Status**: Completed & Verified  
**Scope**: UI Consistency, Navigation Alignment, Page Max-Width Standardization, Favicon & Metadata Overhaul.  
**Strict Rules**: Code-only. No deployment/publishing. No git pushes. 100% verified via `npm test && npm run build`.

---

## 1. Safety & Environment Audit

- **Git Status**: Working branch created and checked out: `wip/ui-consistency`.
- **Auto-push Mechanisms Check**:
  - `.git/hooks`: Only default `.sample` files present. Zero active git hooks.
  - `package.json`: Scripts audited (`dev`, `build`, `start`, `test`, `test:watch`). No `postcommit`, `prepush`, `deploy`, or automated release scripts found.
  - `.github/workflows`: Directory does not exist. No automated CI triggers on local actions.
  - **Verdict**: System is clean. Zero risk of automated deployment or pushing during local work. All work remains strictly local.

---

## 2. Findings & Resolution Table

| Area | Component / File | Initial Finding | Resolution / Target Value | Status |
| :--- | :--- | :--- | :--- | :--- |
| **A. Logo** | `SiteNav.tsx`, `EmptyState.tsx`, `Header.tsx` | Inline `<div>` with `UIU` text, varying rounded corners and paddings. Legacy `Header.tsx` duplicated logo markup. | Created `<BrandLogo size="sm\|md\|lg\|nav">` using standard tokens (`bg-gradient-to-br from-orange-500 to-orange-600`, white text, warm shadow). Nav logo is 36px square on desktop (`md:w-9 md:h-9`), 32px on mobile (`w-8 h-8`). Deleted unused `Header.tsx`. | **Fixed** |
| **A. Brand Text** | `SiteNav.tsx`, `BrandLogo.tsx` | Inconsistent font sizes, weights, and differing subtitles across pages. | Unified brand text: Title "Routine Builder" 16-18px semibold, "Fall 2026" pill 12px, subtitle "Dept. of CSE & Data Science" 12px muted. | **Fixed** |
| **B. Typography Scale** | `tailwind.config.js`, `globals.css` | No custom `fontSize` scale defined in Tailwind. Off-scale arbitrary font sizes present (`text-[8px]`, `text-[9px]`, `text-[10px]`). | Defined official scale (`11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40`) in Tailwind config and CSS variables. Mapped all off-scale values to scale. Guaranteed micro timetable and badge text never below 11px. | **Fixed** |
| **B. Page H1 Titles** | `faculty/page.tsx`, `builder/page.tsx` | `faculty/page.tsx` used `text-xl sm:text-2xl font-extrabold`. `builder/page.tsx` lacked an `<h1>`. | Standardized app page H1 to 28px bold (`text-24 sm:text-[28px] font-bold`). Added accessible `<h1 className="sr-only">UIU Routine Builder</h1>` to Builder page for semantic hierarchy. | **Fixed** |
| **C. Buttons & Badges** | `CourseSelector.tsx`, `FacultyExplorer.tsx`, `EmptyState.tsx` | Prefer/Avoid buttons were 24px high with 10px text. Button heights and variants lacked shared standards. | Elevated buttons to standard scale: desktop min-height $\ge$28px with $\ge$12px text, mobile touch targets $\ge$44px. Lucide icon sizes standardized to 14/16/20px. | **Fixed** |
| **D. Navigation Bar** | `RootLayout`, `SiteNav.tsx`, individual pages | Nav was rendered separately in each page, causing DOM remounts and horizontal link shift (e.g. Home at x~632 vs x~568). Nav height was 56px (`h-14`). | Render **ONE** `SiteNav` instance in `src/app/layout.tsx`. Removed `SiteNav` from individual pages. Height is 64px (`h-16`) on desktop, 52px on mobile. 3-column CSS Grid `grid-cols-[1fr_auto_1fr]` centers links (`Home`, `Builder`, `Course Directory`) with zero shift. Reserved 2px transparent bottom border prevents active-state layout shifts. | **Fixed** |
| **D. Nav Actions** | `src/config/nav.ts`, `builder/page.tsx` | Nav right cluster was hardcoded per page. | Centralized route action config in `src/config/nav.ts`. Builder displays Saved, Shortcuts, Guide; Directory displays Saved, Guide, CTA; Landing displays CTA. Dispatches custom events for drawer triggers. | **Fixed** |
| **D. Duplicate CTAs** | `faculty/page.tsx` | Header had "Go to Routine Builder" button while top nav has "Build routine". | Kept nav CTA; removed redundant sub-header CTA in `faculty/page.tsx`. | **Fixed** |
| **Phase 2: Max-Width** | `layout.ts`, `globals.css`, all containers | Hardcoded `max-w-[1400px]` in multiple files with no single knob. | Defined `--page-max-w: 1440px` in `globals.css` and `PAGE_MAX_W = 'max-w-[var(--page-max-w,1440px)]'` in `src/config/layout.ts`. Applied to `SiteNav`, `SiteFooter`, Builder `<main>`, Directory containers, Landing sections. | **Fixed** |
| **Phase 3: Favicon** | `icon.svg`, `favicon.ico`, `manifest.ts` | Inline SVG data URI with squeezed "U", no multi-resolution ICO, no manifest. | Created vector `src/app/icon.svg` (orange rounded square with bold centered white 'U'), generated `src/app/favicon.ico` (16/32/48), `src/app/apple-icon.png` (180x180), `public/icon-192.png`, `public/icon-512.png`, and `src/app/manifest.ts`. Added cache-busting `?v=2` query parameters. | **Fixed** |
| **Phase 3: Metadata Titles** | `layout.tsx`, `page.tsx`, `builder/layout.tsx`, `faculty/layout.tsx` | Inconsistent title formats without Next.js title template. | Configured `title.template: '%s \| UIU Routine Builder'` and `default: 'Routine Builder \| UIU'`. Landing uses absolute title `'UIU Routine Builder - Build conflict-free class routines'`. | **Fixed** |

---

## 3. Decisions & Justifications

1. **Root Layout Nav Rendering**:  
   Previously, each page imported `<SiteNav />` independently. Moving `<SiteNav />` to `src/app/layout.tsx` guarantees that the component never remounts or recalculates dimensions during client-side navigation. Route-dependent actions (Saved, Shortcuts, Guide, and CTA) are coordinated cleanly via `src/config/nav.ts` and standard window custom events (`nav:open-saved`, `nav:open-shortcuts`, `nav:open-guide`, `saved-routines-updated`), allowing complete interactivity with Builder drawers while keeping the nav bar 100% positionally invariant.

2. **Removal of Duplicate Page CTA on Course Directory**:  
   The Course Directory header previously featured a secondary button labeled "Go to Routine Builder" directly underneath the top navigation bar's primary "Build routine" CTA. Because both navigate to `/builder`, having two identical buttons within 80px vertically created redundancy. The page-level button was removed, keeping the nav-level CTA as the single prominent action.

3. **Typography 11px Micro Floor**:  
   Micro badges and timetable headers were previously set to `text-[8px]`, `text-[9px]`, or `text-[10px]`. These were elevated to `11px` (`font-mono` / `tabular-nums` where applicable) to guarantee minimum readability and touch/visual clarity while preserving compact timetable density.

4. **Landing Page Server Component with Client Child**:  
   To allow the landing page to declare its exact metadata title (`UIU Routine Builder - Build conflict-free class routines`) while retaining interactive features (FAQ accordion and URL query redirect), `src/app/page.tsx` was converted to a Server Component that renders `<LandingContent />`.

---

## 4. What Was Intentionally Left As Is

1. **Solver, Scoring & Bitmask Core**:  
   Untouched. No logic changes were made to `src/solver/`, `src/types.ts`, or scoring weights.
2. **Fixed Courses & FYDP Logic**:  
   Untouched. FYDP manual schedule overlays, clash diagnostics, and section locking remain identical.
3. **Mobile Screen Rules Under 768px**:  
   The existing 52px single-row mobile top bar (`h-[52px]`) with logo, title, and actions was preserved exactly as designed.
4. **Color Tokens & Theme Meaning**:  
   All semantic token mappings (`--orange-500`, `--bg-page`, `--bg-surface`, `--bg-subtle`, `--text-primary`, `--border`) retain their exact hexadecimal values and purposes.

---

## 5. Verification Results

- **Vitest Static Tests (`npm test`)**:  
  `11 passed (11 files, 109 tests)` — 100% pass rate.
  - Verified `SiteNav` rendered only from RootLayout.
  - Verified 3-column CSS Grid with centered links and reserved borders.
  - Verified zero hardcoded max-widths (1400/1536/1600px) outside `layout.ts`.
  - Verified all `text-[Npx]` are strictly on scale (`[11, 12, 13, 28]`), zero below 11px.
  - Verified `BrandLogo` unified across components.
  - Verified vector `icon.svg`, multi-size `favicon.ico`, `apple-icon.png`, `manifest.ts`, and PWA icons exist.
- **Production Build (`npm run build`)**:  
  Successfully compiled and statically generated all routes (`/`, `/_not-found`, `/apple-icon.png`, `/builder`, `/courses`, `/faculty`, `/icon.svg`, `/manifest.webmanifest`).
