# UIU Routine Builder - Project Context & Handoff

> Comprehensive repository handoff document. Built from the actual codebase and architecture decisions as of Fall 2026.

---

## 1. Project Snapshot
- **Application**: UIU Routine Builder (Fall 2026)
- **Target Audience**: Undergraduate students of United International University (UIU), Dhaka, Bangladesh enrolled in BSCSE (B.Sc. in Computer Science & Engineering) and BSDS (B.Sc. in Data Science).
- **Owner**: Md. Akib Mehedi (CSE, United International University).
- **Live Production URL**: [https://arekta-routine-builder.vercel.app](https://arekta-routine-builder.vercel.app) (also [https://uiu-routine-builder.vercel.app](https://uiu-routine-builder.vercel.app))
- **Repository**: [https://github.com/akibmehedi666/uiu-routine-builder](https://github.com/akibmehedi666/uiu-routine-builder)
- **Main Goal in 3 Lines**:
  1. Solve conflict-free class schedules across 791 course sections in under 50ms using client-side bitmask constraint satisfaction.
  2. Optimize section choices based on preferred/avoided faculty, minimal class gaps, balanced days, and fixed slots (FYDP).
  3. Offer a fast, searchable Course Directory and 1-click exports (copy to UCAM registration, Google/Apple iCal, clean print view).

---

## 2. Tech Stack & Commands
- **Framework & Core**: Next.js 14.2.23 (App Router), React 18.3.1, TypeScript 5.7.2.
- **Styling**: Tailwind CSS 3.4.16, Vanilla CSS custom properties (`globals.css`).
- **Icons & Visuals**: Lucide React 0.468.0, Canvas Confetti 1.9.4.
- **Testing**: Vitest 2.1.8.
- **Image/Asset Generation**: Sharp 0.35.5 (devDependency).
- **Analytics**: `@vercel/analytics` 2.0.1.
- **Runtime Requirements**: Node.js 18.x or 20 LTS (recommended); Python 3.9+ with `pdfplumber` (for data extraction only).
- **Environment Variables**: None required for development or build. `@vercel/analytics` runs automatically on Vercel.
- **Essential Commands**:
  - `npm install` : Install dependencies.
  - `npm run dev` : Start local Next.js dev server on `http://localhost:3000`.
  - `npm test` : Run all unit and static safety tests via Vitest (`vitest run`).
  - `npm run build` : Run Next.js production build (`next build`).
  - `python scripts/extract.py` : Re-extract course sections from raw PDF.
  - `node scripts/generate-icons.js` : Re-generate favicon.ico, apple-icon.png, and PWA icons from `icon.svg`.

---

## 3. Folder Map
```text
uiu-routine-builder/
├── Class_Routine_with_faculty_assign_Fall_2026.pdf # Source timetable PDF from UIU registrar
├── data/
│   ├── sections.json        # 791 parsed section records (canonical data)
│   ├── courses.json         # 107 course catalog entries
│   ├── faculty.json         # 207 faculty records with teaching assignments (full untruncated names)
│   ├── faculty-id-aliases.json # 14 legacy-to-canonical faculty ID alias mappings
│   └── anomalies.md         # Extraction audit trail (377 auto-resolved PDF anomalies)
├── docs/                    # Architecture logs, audit reports, user guide, investigation docs
│   ├── name-fix.md          # Complete audit of 14 restored faculty names & 48 long name reviews
│   ├── consistency-audit.md # Nav alignment, typography scale, BrandLogo audit
│   ├── solver-design.md     # Backtracking algorithm, bitmasks, scoring model
│   ├── user-guide.md        # Comprehensive student usage manual
│   ├── pdf-findings.md      # PDF structure and column quirks
│   ├── mobile-notes.md      # Mobile layout architecture and testing checklist
│   ├── width-investigation.md # Historical audit of page max-width
│   └── revert-notes.md      # Revert log for the mobile overflow task
├── public/
│   ├── icon-192.png         # PWA maskable icon (192x192)
│   └── icon-512.png         # PWA maskable icon (512x512)
├── scripts/
│   ├── extract.py           # MCID stream grouping PDF parser (preserves full faculty names)
│   └── generate-icons.js    # Sharp script to build favicon.ico, apple-icon, and PWA PNGs
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout rendering single persistent SiteNav & metadata
│   │   ├── globals.css      # Design tokens, CSS variables, --page-max-w knob
│   │   ├── page.tsx         # Landing page (Server Component)
│   │   ├── builder/         # /builder route (Routine Builder page)
│   │   ├── faculty/         # /faculty route (Course Directory page)
│   │   ├── faculty-directory/ # /faculty-directory route (Faculty Directory & Stats view)
│   │   │   ├── page.tsx     # Directory + Fall 2026 Stats view switcher
│   │   │   ├── [id]/        # Profile view with static generation for canonical + legacy IDs
│   │   │   └── compare/     # /faculty-directory/compare?a=...&b=... side-by-side comparison
│   │   ├── courses/         # /courses route (Redirects to /faculty)
│   │   ├── icon.svg         # Clean timetable blocks vector favicon
│   │   ├── favicon.ico      # Multi-resolution ICO (16, 32, 48)
│   │   ├── apple-icon.png   # 180x180 full-bleed Apple touch icon
│   │   └── manifest.ts      # Web App Manifest route handler
│   ├── components/          # Reusable UI components
│   │   ├── SiteNav.tsx      # Invariant 3-column grid nav bar
│   │   ├── SiteFooter.tsx   # Standardized footer with creator credit
│   │   ├── BrandLogo.tsx    # Unified logo component
│   │   ├── faculty/         # Faculty directory components
│   │   │   ├── BadgesLegendModal.tsx # Accessible modal documenting all 12 badges
│   │   │   ├── CampusStatsView.tsx   # "Fall 2026 by the Numbers" interactive view
│   │   │   └── RoomScheduleSheet.tsx # Slide sheet / bottom sheet for weekly room timetable
│   │   ├── CourseSelector.tsx # Left-panel course picker and mobile search sheet
│   │   ├── Timetable.tsx    # 5-day desktop timetable view
│   │   ├── DayListTimetable.tsx # Mobile Day-by-Day view
│   │   ├── ScheduleComparison.tsx # Side-by-side routine compare drawer
│   │   ├── SavedRoutinesDrawer.tsx # Drawer for saved routines & snapshot management
│   │   ├── SaveRoutinePopover.tsx # Quick save popover
│   │   ├── Modals.tsx       # Shortcuts, Guide, and UCAM copy dialogs
│   │   ├── ManualScheduleModal.tsx # FYDP / custom course schedule modal
│   │   ├── EmptyState.tsx   # Ghost timetable and zero-result cards
│   │   └── LandingContent.tsx # Client interactive content for landing page
│   ├── config/              # Central configuration
│   │   ├── site.ts          # Creator bio, links, and disclaimers
│   │   ├── layout.ts        # PAGE_MAX_W shared constant
│   │   ├── nav.ts           # Route-driven navigation configuration
│   │   ├── fixedCourses.ts  # Fixed courses configuration (FYDP)
│   │   └── facultyBadges.ts # 12 faculty badge thresholds and definitions
│   ├── hooks/
│   │   ├── usePinnedFaculty.ts # "uiu-rb:pinned-faculty:v1" localStorage hook with cross-tab sync
│   │   └── useSolver.ts     # Web Worker management, state machine, and cache
│   ├── lib/
│   │   ├── campusStats.ts   # Campus-wide section & meeting stats, heatmap data, histograms
│   │   ├── roomSchedule.ts  # Room schedule indexing and floor parser
│   │   ├── facultyAliases.ts # Legacy faculty ID backward compatibility resolution
│   │   ├── facultyStats.ts  # Pure faculty stats, badges, leaderboards, filters, search aliases
│   │   ├── courseSearch.ts  # Pure, tokenized course search index with alias support
│   │   ├── courseDirectory.ts # Course directory filtering, grouping, and natural sorting
│   │   ├── fixedCourses.ts  # FYDP overlay and conflict bitmask checks
│   │   ├── facultyIndex.ts  # Faculty normalization and deterministic slugs
│   │   ├── storage.ts       # LocalStorage safe helpers
│   │   └── __tests__/       # Vitest test suites (13 files, 153 tests)
│   ├── solver/              # Client-side solver engine
│   │   ├── bitmask.ts       # 5-day x 288-cell bitmask math (BigInt)
│   │   ├── solver.ts        # Backtracking search with MRV and branch-and-bound
│   │   ├── scorer.ts        # Multi-factor routine scoring algorithm
│   │   ├── types.ts         # Solver type definitions
│   │   └── validator.ts     # Input validation
│   ├── utils/               # Formatters, color palettes, export handlers
│   │   ├── colors.ts        # 12 distinct pastel course card tints (WCAG AA)
│   │   ├── time.ts          # Minute-to-time converters and UIU slot helpers
│   │   ├── export.ts        # UCAM copy string generator, iCal (.ics), print view
│   │   ├── exportFacultySchedule.ts # Faculty ics generator & HTML5 Canvas PNG card export
│   │   └── savedRoutines.ts # Saved routine serialization and storage
│   └── workers/
│       └── solver.worker.ts # Web Worker background execution thread
```

---

## 4. Data Pipeline
- **Source Document**: `Class_Routine_with_faculty_assign_Fall_2026.pdf`.
  - Pages 1 to 27 contain all 791 valid course sections across BSCSE and BSDS.
  - Pages 28 to 54 are discarded (empty repeated table headers and PDF footer artifacts).
- **Section Kinds**:
  - `theory` (505 sections): Strictly 2 meetings per week (Sat+Tue or Sun+Wed).
  - `lab` (206 sections): Strictly 1 meeting per week, title ends with `"Laboratory"`.
  - `single-day-theory` (80 sections): 1 meeting per week, non-lab (e.g. FYDP `CSE 4000A`, `CSE 4165`, `GED 1005`).
- **Co-requisite Lab Rule**: A course with numeric code $N$ pairs with $N+1$ (e.g. `CSE 3811` Artificial Intelligence pairs with `CSE 3812` Artificial Intelligence Laboratory).
- **PDF Extraction Anomalies & Fixes (`scripts/extract.py`)**:
  - Column overflow: Text like `(if required)` spilled across bounding boxes, mangling room numbers (e.g. `e3d0)2` for `302`). Repaired by extracting raw unclipped character streams or matching Room 2.
  - Lab room truncation: Wide titles clipped `(Computer Lab)` to `(Comp`. Recovered from character coordinates.
  - Corrupted faculty initials: Initials in the registrar PDF are frequently truncated or missing. Faculty identity is derived by slugifying normalized clean full names (`facultyId`).
  - 32 TBA faculty sections (initially 24 in PDF + 8 portal reassignments), 34 tentative sections.
- **Reproducible Dataset Overrides Pipeline (`scripts/apply_overrides.py`)**:
  - Keeps dataset in sync with UIU UCAM portal updates without manual editing of generated JSON.
  - Reads `data/overrides/2026-fall-faculty-changes.json` and strictly asserts `expectedOldFaculty` and `meetingsExpected` before applying updates.
  - Runs automatically as the final step of `python scripts/extract.py` and can also run standalone (`python scripts/apply_overrides.py`).
  - Recomputes `data/courses.json` and `data/faculty.json`, pruning faculty who end up with 0 active teaching sections (e.g. Rion and Sobur).
  - Appends audit trail to `data/anomalies.md` and maintains `docs/data-changes.md`.
  - Data updated date: `2026-10-23` (`DATA_UPDATED` in `src/config/site.ts`).
- **How to Add the Next Data Update**:
  1. Add a new overrides JSON file under `data/overrides/` (e.g. `YYYY-term-faculty-changes.json`) with keys: `{ program, courseCode, section, expectedOldFaculty, newFaculty, meetingsExpected }`.
  2. Run `python3 scripts/apply_overrides.py --overrides data/overrides/<file>.json`.
  3. The script validates against current data, applies changes, recomputes derived catalogs, removes zero-section faculty, and logs the change.
  4. Run `npm test && npm run build` to verify that all integrity and UI safety tests pass.
- **Updating for a Future Trimester**:
  1. Place the new routine PDF in the project root.
  2. Update filename in `scripts/extract.py`.
  3. Run `python scripts/extract.py`.
  4. Inspect `data/anomalies.md` and check that Sl 1 to N has zero gaps and zero duplicates.
  5. Run `npm test && npm run build` to verify compatibility.

---

## 5. Solver Engine
- **Representation**: Timetable represented as `ScheduleBitmask = [bigint, bigint, bigint, bigint, bigint]` (5 days from Saturday to Wednesday, each day divided into 288 five-minute slots from 00:00 to 24:00).
- **Conflict Check**: Instant bitwise AND: `(maskA[day] & maskB[day]) !== 0n`.
- **Search Strategy**: Depth-first backtracking with Static MRV (Minimum Remaining Values — courses with fewest candidate sections evaluated first). Sections sorted by faculty preference before branch exploration.
- **Branch and Bound Pruning**: Computes a theoretical maximum score ceiling at each step. If `maxPossibleScore <= lowestScoreInHeap`, the entire subtree is pruned without evaluating gap scores.
- **Execution Budget**: Hard cap of 200,000 nodes or 2,000ms timeout (benchmark executes 5 courses in ~49ms).
- **Web Worker**: Runs in `src/workers/solver.worker.ts` without freezing the UI. Emits throttled progress updates (~100ms). Synchronous fallback used for SSR or environments without Worker support.
- **Scoring Breakdown (Max 100)**:
  - Faculty preferences: +20 for preferred, -30 for avoided.
  - Gap score: penalizes long breaks between classes on the same day.
  - Day balance: rewards evenly distributed schedules or full requested days off.
  - Tentative penalty: penalizes unassigned or "(if required)" sections.
- **Fixed Course Injection**: FYDP and locked sections enter the solver with a single-candidate domain (`fixedSectionId`), ensuring every output contains the exact locked section.

---

## 6. Features List & Status
| Feature | Route / Component | Status | Notes |
|---|---|---|---|
| Landing Page | `/` (`page.tsx`) | Done | Live stats, hero, feature cards, timetable preview, FAQ |
| Routine Builder | `/builder` (`builder/page.tsx`) | Done | 2-column layout, course picker, filters, timetable, toolbar |
| Course Selection & Search | `CourseSelector.tsx` | Done | Dropdown on desktop, full-screen search sheet on mobile |
| Faculty Prefer / Avoid | `CourseSelector.tsx` | Done | Synced across Builder and Course Directory |
| Co-requisite Lab Button | `CourseSelector.tsx` | Done | 1-click "Add Co-requisite Lab" button |
| Lock / Unlock Sections | `builder/page.tsx` | Done | "Lock All" / "Unlock All" toggle + individual section locks |
| Fixed FYDP Section | `src/config/fixedCourses.ts` | Done | Section I (Sat 11:11-13:40) with clash alerts for other courses |
| Manual Schedule Modal | `ManualScheduleModal.tsx` | Done | For custom sections/FYDP not in standard registrar catalog |
| Schedule Timetable (5-Day) | `Timetable.tsx` | Done | Sat-Wed 08:00-17:00, pastel cards with 4px hue borders |
| Day-List Timetable (Mobile)| `DayListTimetable.tsx` | Done | Swipeable/selectable single-day view on narrow screens |
| Routine Comparison | `ScheduleComparison.tsx` | Done | Side-by-side comparison drawer for top routines |
| Saved Routines Drawer | `SavedRoutinesDrawer.tsx` | Done | LocalStorage snapshots, rename, restore, shareable URLs |
| Export UCAM Registration | `export.ts` / `Modals.tsx` | Done | Clean plain-text list formatted for UIU UCAM portal |
| Export iCal (.ics) | `export.ts` | Done | 12-week recurring schedule for Google/Apple Calendar |
| Print / PDF Output | `globals.css` (`@media print`)| Done | Strips nav, toolbar, and background for clean PDF printing |
| Course Directory | `/faculty` (`faculty/page.tsx`)| Done | Course-first directory, alias search (DSA, OS, etc.), UCAM cards |
| Faculty Directory | `/faculty-directory` (`faculty-directory/page.tsx`)| Done | Faculty-first directory: search, filters, card grid, daily spotlight, leaderboards, compare, TBA tracker |
| Faculty Detail Profile | `/faculty-directory/[id]` (`faculty-directory/[id]/page.tsx`)| Done | Static SSG (207 faculty), profile header, weekly timetable mini-grid, courses & sections, co-instructors |
| Invariant SiteNav | `SiteNav.tsx` | Done | Single instance in root layout, 3-column grid, 0px shift |
| Site Footer Credit | `SiteFooter.tsx` | Done | Compact creator credit (Md. Akib Mehedi) & feedback link |
| Favicon & Manifest | `icon.svg`, `manifest.ts` | Done | Letter-free timetable blocks mark, multi-res ICO, PWA ready |

---

## 7. Routes & Layout Rules
- **Routes**:
  - `/` : Landing page (Server Component).
  - `/builder` : Routine Builder app.
  - `/faculty` : Course Directory (UCAM-inspired course-first directory).
  - `/faculty-directory` : Faculty Directory (searchable instructor list, leaderboards, spotlight, compare).
  - `/faculty-directory/[id]` : Faculty detail profile with weekly teaching timetable and course sections (SSG for all 207 faculty).
  - `/courses` : Immediate redirect to `/faculty`.
- **Navigation Bar (`SiteNav`)**:
  - Rendered **once** from root `src/app/layout.tsx`. Never re-mounts on navigation.
  - Desktop height 64px (`h-16`), mobile height 52px (`h-[52px]`).
  - Layout: CSS Grid `grid-cols-[1fr_auto_1fr] items-center`.
    - Left (start): `<BrandLogo size="nav" />` and brand text.
    - Center: Nav links (`Home`, `Builder`, `Course Directory`, `Faculty Directory`) with reserved 2px transparent bottom border (`border-b-2 border-transparent`, active `border-orange-500 font-semibold text-orange-600`), ensuring mathematically invariant coordinates across routes.
    - Right (end): Route-driven action cluster configured in `src/config/nav.ts`.
- **Page Max-Width Knob**:
  - Single source of truth: `--page-max-w: 1440px;` in `src/app/globals.css`.
  - Exported as `PAGE_MAX_W = 'max-w-[var(--page-max-w,1440px)]'` in `src/config/layout.ts`.
  - Shared across SiteNav, SiteFooter, Builder `<main>`, Course Directory containers, and Landing sections.
  - **CRITICAL LAYOUT SAFETY**: Never use `max-w-full`, `w-screen`, `100vw`, or `overflow-x: clip`/`hidden` on page wrappers or `<main>`. These tricks previously broke desktop layouts by causing edge-to-edge stretching.

---

## 8. Design System
- **Color Palette (Warm UIU Theme)**:
  - Backgrounds: `--bg-page: #FFFBF7`, `--bg-surface: #FFFFFF`, `--bg-subtle: #FFF4EA`, `--bg-accent-soft: #FFE8D1`.
  - UIU Orange: `--orange-500: #F26B21` (primary), `--orange-600: #D9560F` (high-contrast text), `--orange-400: #FF8A4C`, `--orange-100: #FFEBDB`, `--orange-50: #FFF6EE`.
  - Text: `--text-primary: #1F2937`, `--text-secondary: #4B5563`, `--text-muted: #6B7280`, `--text-on-orange: #FFFFFF`.
  - Borders: `--border: #F1E4D6`, `--border-strong: #E8D2BC`.
  - Shadows: `boxShadow.warm`: `0 1px 2px rgba(242,107,33,0.06), 0 4px 16px rgba(31,41,55,0.05)`.
- **Typography Scale**: Strict scale defined in `tailwind.config.js` and `globals.css`:
  - `11px`, `12px`, `13px`, `14px`, `16px`, `18px`, `20px`, `24px`, `28px`, `32px`, `40px`.
  - Timetable cards and chips are strictly $\ge$ 11px. Page titles are 28px bold.
  - Font family: Inter via `next/font/google`. Tabular numbers used for times and credits.
- **Buttons & Touch Targets**:
  - Heights: `sm`: 32px, `md`: 40px, `lg`: 48px.
  - Mobile touch targets strictly enforce $\ge$ 44px (`min-h-[44px] min-w-[44px]`).
- **Favicon & App Icon**:
  - Vector timetable blocks design in `src/app/icon.svg` (viewBox 0 0 64 64, orange rounded square `rx="14"`, three solid white class blocks with 4px gaps, block B at 0.6 opacity, no letters or text).
  - Cache-busting suffix `?v=4` applied to manual icon declarations in `src/app/layout.tsx`.
  - Title template: `%s | UIU Routine Builder` (default: `Routine Builder | UIU`).

---

## 9. Mobile Notes
- **Breakpoints**:
  - Phone: `< 768px`.
  - Tablet: `768px - 1023px`.
  - Desktop: `\ge 1024px`.
- **Phone Top Bar (< 768px)**: Exactly 52px tall (`h-[52px]`). Single row with 32px logo, truncated title, and icon-only buttons for Saved, Help, and Menu ($\ge$ 44px touch targets). "Fall 2026" pill hidden on phones.
- **Course Search Sheet**: On phones, tapping search opens a full-screen sheet (`fixed inset-0 z-50 bg-white h-[100dvh]`) with 16px input font (prevents iOS auto-zoom) and hardware back-button listener (`popstate`).
- **Sticky Bottom Tab Bar**: 56px sticky bar on Builder with 3 tabs: Courses, Preferences, Results (with routine counter badge). Main content padded with `pb-[calc(56px+env(safe-area-inset-bottom,0px)+16px)]`.
- **Revert History**: The earlier mobile overflow task (`5054bb4`) introduced `max-w-full` and `100vw` which caused the desktop Builder to stretch edge-to-edge. It was completely reverted in `4606b4e`. Desktop layout (>= 1024px) must NEVER change during mobile work.

---

## 10. Decisions & History
- `fe7d7fe` : Phase 9A Builder layout widened to 1600px.
- `9ec6d84` : Phase 10B Course Directory introduced with 1400px container.
- `fff12aa` : Added creator credit footer on every page and centralized `site.ts`.
- `b0483b0` : High-affordance course removal button, clear-all confirmation, and 6-second undo toast.
- `9d85baf` : "My Saved Routines" feature with client-side snapshots and backup/restore.
- `68f482e` : Mobile UX redesign (bottom tab bar, search sheet, Day-list timetable).
- `56d00bc` : Made FYDP a fixed section (Section I, Sat 11:11-13:40) with conflict warnings.
- `5054bb4` : Attempted mobile overflow fix (introduced `max-w-full`).
- `4606b4e` : **REVERT**: Reverted `5054bb4` to restore desktop layout stability.
- `c3eb509` : Standardized desktop page width to 1400px across all routes.
- `f2c21e3` : "Lock All" / "Unlock All" toggle button with badges and undo feedback.
- `76495d3` : Experimental 1536px Builder width.
- `e3b3803` : **REVERT**: Reverted 1536px back to 1400px baseline per user request.
- `9e55d51` - `d4ca4bc` : UI consistency audit: `<BrandLogo />`, 11px+ typography scale, invariant 3-column SiteNav in root layout, and `--page-max-w: 1440px`.
- `c092f90` : Replaced letter-based favicon with letter-free "timetable blocks" mark across SVG, ICO, Apple touch icon, and maskable PWA icons (`?v=4`).

---

## 11. Git State
- **Current Work Branch**: `wip/handoff`.
- **Existing Branches**:
  - `main` : Production branch (matches `origin/main` at commit `c092f90`). Deployed to Vercel.
  - `wip/ui-consistency` : Local branch from consistency audit work.
  - `wip/handoff` : Current handoff branch containing this documentation and safety rules.
  - `backup-before-revert-HEAD` : Safety backup prior to mobile revert.
- **Commits Not in `main`**:
  - `wip/handoff` contains handoff documentation (`context.md`, `AGENTS.md`, `CLAUDE.md`) and `.gitignore` updates.
- **IMPORTANT**: `main` is production. **NEVER** push to or merge into `main` without explicit instruction from the project owner.

---

## 12. Known Issues & TODO
- **Build & Test Health**: Zero failing tests (`11 passed`, `111 passed`). Production build compiles cleanly (11 static pages generated).
- **Favicon Browser Cache**: Aggressive browser caches may take a hard refresh (Ctrl+F5) to show the new timetable blocks icon (cache-buster is set to `?v=4`).
- **Builder Width Tuning**: Currently set to 1440px via `--page-max-w`. If the owner prefers 1400px or 1480px, adjust `--page-max-w` in `src/app/globals.css`.
- **Future Ideas / Nice-to-Haves**:
  - Natural-language routine filtering box ("I want Sunday mornings free and at most 3 class days").
  - Horizontal swipe gesture between days on mobile DayListTimetable.
  - Direct PDF routine export in addition to print-to-PDF.

---

## 13. Working Agreements for Any AI Agent
*(Copied verbatim from owner requirements)*:
1. Never `git push`, never touch `main`, never deploy, unless the owner explicitly says so in that session. Work on a branch, commit locally.
2. Do not open a browser/Playwright/screenshots/dev server for visual checks unless asked (it is slow for the owner). Verify with `npm test && npm run build`.
3. Make focused changes; do not "improve" unrelated things. Don't change solver/data/theme tokens unless the task says so. When asked to revert, use git and verify with an empty `git diff`.
4. Owner prefers plain, direct, short answers in English; work autonomously, don't ask unnecessary questions, log decisions in DECISIONS.md.
5. Desktop (>= 1024px) layout must not change when doing mobile work.

---

## 14. How to Resume on a New Device
1. **Prerequisites**:
   - Install **Node.js 20 LTS** (or 18+) and **Git**.
   - (Optional) Install **Python 3.9+** if re-running data extraction.
2. **Clone & Switch Branch**:
   ```bash
   git clone https://github.com/akibmehedi666/uiu-routine-builder.git
   cd uiu-routine-builder
   git fetch --all
   git switch wip/handoff
   ```
3. **Install Dependencies & Verify**:
   ```bash
   npm install
   npm test
   npm run build
   ```
4. **Run Local Dev Server**:
   ```bash
   npm run dev
   # Open http://localhost:3000 in your browser
   ```
5. **Data Files Location**:
   - Raw PDF: `Class_Routine_with_faculty_assign_Fall_2026.pdf` (in repo root).
   - Extracted JSON: `data/sections.json`, `courses.json`, `faculty.json`.
6. **Git Authentication**:
   - Authenticate with GitHub CLI: `gh auth login`.
7. **Ready-to-Paste Prompt for Next AI Agent**:
   ```text
   Read /context.md fully first, then continue from section 12. Do not push or touch main. Verify with npm test && npm run build.
   ```

---

## 15. Prompt Library
Key prompts and tasks executed during development:
1. `extraction`: PDF parsing via pdfplumber, handling multi-column overflow, room truncation, and building clean JSON data.
2. `solver`: 5-day bitmask constraint solver with MRV heuristics, branch-and-bound pruning, and Web Worker integration.
3. `light-theme-landing`: Migration from dark slate to warm UIU brand theme and creation of the landing page at `/`.
4. `deploy`: Production deployment setup on Vercel with analytics and clean routing.
5. `saved-routines`: LocalStorage snapshot management, custom routine names, shareable URLs, and backup/restore drawer.
6. `fixed-fydp`: FYDP Section I (Sat 11:11-13:40) fixed schedule overlay with clashing section warnings.
7. `mobile-redesign`: Phone layout (< 768px) with bottom tab bar, full-screen search sheet, and DayListTimetable.
8. `width-standardization`: Desktop container max-width alignment between Builder and Course Directory.
9. `nav-consistency`: Invariant 3-column CSS grid navigation bar in root layout with 0px horizontal shift.
10. `favicon-redesign`: Clean letter-free timetable blocks vector icon, multi-resolution ICO, Apple icon, and PWA manifest.
11. `lock-unlock-toggle`: "Lock All" / "Unlock All" toggle state machine with badges and undo feedback.
12. `faculty-directory`: Faculty Directory page (`/faculty-directory`) with two-pane layout, weekly timetable, prominent multi-category leaderboards (theory courses, lab courses, sections, hours, early starts), daily faculty spotlight, strict natural A–Z alphabetical sorting with sticky letter dividers, and individual SSG faculty profiles (`/faculty-directory/[id]`).
13. `faculty-directory-upgrade`: Faculty Directory upgrade and data fix (truncated names extraction fix via MCID grouping, backward compatibility alias map, initials search, pinned faculty, compare view, 12 badges, campus stats heatmap/histograms, room sheet, PNG/ICS exports).
14. `faculty-badges-tab`: Dedicated Badges Tab in Faculty Directory:
    - Added "Badges" tab to segment control in `/faculty-directory` alongside "Directory" and "Stats & Heatmap".
    - URL Deep Linking: `?tab=badges&badge=<badgeId>&q=&program=` with history replacement (no full reload). Clicking any badge chip on cards, spotlight, detail pages, or comparison view opens the Badges tab with that badge selected.
    - Memoized Pure Module (`src/lib/facultyBadges.ts`): Computes badge holders, share percentages, rarity rankings (1..12), top holders with tie counts ("Highest: Dr. Alice (+1 more) (5 in a row)"), and top 5 multi-badge achievers. Guarantees 0 drift with `computeFacultyBadges()`.
    - Interactive Badge Grid: 3-column cards grid on desktop, 2-column on tablet, 1-column on mobile. Category filters (`All`, `Schedule`, `Courses`, `Rooms`, `Programs`), sort options (`Rarest first` default, `Most common`, `Priority`, `A-Z`), share progress bar, and "Rarest" badge highlights on the 3 rarest badges.
    - Holders List Panel: Rule definition, `howToEarn` description, search box, program filter chips (`ALL`, `BSCSE`, `BSDS`), sort select (`By metric high-to-low` default, `A-Z`), holder rows with metric value chip, other badges, star pin button, compare checkbox, and 30-row "Load more" pagination.
    - Multi-Badge Achievers Showcase: Highlights top 5 instructors earning the most badges with podium ranks and direct links.
    - Responsive & Accessible: Mobile bottom/full-screen sheet with body scroll lock, Esc dismissal, keyboard radio arrow navigation, visible focus rings, and ARIA live regions.
15. `faculty-badges-polish`: Badges tab polish & holders panel redesign:
    - Removed duplicate "Badges (12)" header button; kept "How badges work" and "Surprise me" in tab; renamed badge card rarity to "Rarity #N" with tooltip "1 = fewest faculty hold this badge".
    - Eye-catching category-tinted banner header: 48px icon tile, 20px bold badge title, category label, 3 mini stats (28px bold Holders, % of faculty, Rarity #N of 12), and single-line Rule + howToEarn info tooltip.
    - Redesigned holder rows: rank numbers with gold/silver/bronze medals for top 3 and "=N" prefix for ties; stable pastel avatar; 14px semibold name with tooltip + single program tag group (removed duplicate teal chip); prominent metric block (18px tabular bold + unit label + relative orange bar + muted detail); max 3 other icon badges; 32px pin/open buttons; orange compare checkbox; light orange hover tint with row clickability.
    - Extended `src/config/facultyBadges.ts` with `metricUnit` and `metricDetail(faculty)` across all 12 badges (Cross-Program: "BSCSE 5 · BSDS 3 sections", Course Hub: "CSE 2213 x4", Home Room: "78% in Room 530", Floor Hopper: "Floors 3, 4, 5, 6", Marathon: "5 in a row").
    - 3-factor deterministic sorting (`metricValue` desc -> `totalSections` desc -> `sortName` A-Z) applied to both holders list and top holder tie-break calculation.
16. `faculty-badges-holders-fixes`: 3 holders panel fixes:
    - Redundant metric suppression: `isMetricDetailRedundant` hides the detail line if it merely repeats value+unit; enriched badge details with course codes (Multi-Course, Lab Pro), meeting counts & rooms (Home Room), days (First Bell, Late Shift), and Marathon chain times + pairs.
    - Avatars: Replaced invalid Tailwind class interpolation with inline `style={{ backgroundColor, color, borderColor }}` using `faculty.avatarColor`, eliminating white circles and ensuring exact pastel avatar styling matching the main directory list.
    - Ties & Medals: When >3 holders share rank 1, suppressed medals in favor of neutral rank circles (`=1`) and rendered an informative toolbar note `"N faculty are tied at <value> <unit>"`; preserved medals when top 3 are distinct.
    - Marathon tie-breaker: Secondary sort key by total back-to-back pairs this week before total sections and name A-Z, displayed in the detail line as `"x pairs this week"`.



