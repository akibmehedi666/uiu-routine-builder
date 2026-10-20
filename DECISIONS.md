# Architectural & Design Decisions

This document tracks all design decisions, assumptions, and edge case resolutions made throughout the project.

## Decision 1: PDF Extraction Strategy (Phase 0 & 1)
- **Tool**: `pdfplumber` using table extraction (`extract_tables()`) supplemented with character/coordinate and heuristic repair for column overflow.
- **Pages**: Pages 1 to 27 contain all 791 course sections. Pages 28 to 54 are discarded (empty repeated headers and footer artifacts).
- **Time Parsing**: Time strings in the format `HH:MM:AM - HH:MM:PM` (with colons before AM/PM) are normalized by converting to total minutes since midnight (00:00).
- **Single-Day vs Lab Classification**:
  - `days.length === 2`: Classified as `theory` (strictly Sat+Tue or Sun+Wed).
  - `days.length === 1 && title.endsWith("Laboratory")`: Classified as `lab`.
  - `days.length === 1 && !title.endsWith("Laboratory")`: Classified as `single-day-theory` (e.g. CSE 4000A FYDP, CSE 4165 Web Programming, GED 1005).
- **Tentative Flag**:
  - Set to `true` if section text contains `(if required)` / `(If Required)` OR faculty is `TBA` / empty.
- **Faculty Identification**:
  - Because faculty initials in the PDF are frequently corrupted, truncated, or inconsistent, faculty identity is derived by normalizing the cleaned full name into a slugified ID (`facultyId`), e.g., `md-muhaiminul-islam-nafi`.
  - Split faculty (e.g., `CSE 4399` with `/`) are split into array `faculty: string[]` and `facultyIds: string[]`.
  - TBA / empty faculty gets `faculty: ["TBA"]` and `facultyIds: []`.
- **Theory & Lab Pairing**:
  - Derived programmatically: A course with code $N$ pairs with $N+1$ (e.g., `CSE 3811` and `CSE 3812`, `DS 1115` and `DS 1116`) when lab title === theory title + `" Laboratory"`.

## Decision 2: Phase 1 Extraction & Data Schema Results
- **Row Count**: Exactly 791 sections parsed (Sl 1..791, zero gaps, zero duplicates).
- **Program Breakdown**: BSCSE: 723 sections, BSDS: 68 sections.
- **Section Kinds**: Theory: 505 sections, Lab: 206 sections, Single-Day Theory: 80 sections.
- **TBA & Tentative**: 25 TBA faculty sections, 26 tentative sections.
- **Theory-Lab Pairs**: 21 programmatic pairs detected.
- **Room Overflow Resolution**: In 9 sections, `(if required)` spilled across column boundaries, causing mangled room cells (`3)05`, `e3d0)7`, `e7d0)8`, etc.). In theory courses, Room 1 and Room 2 are identical; room was repaired from Room 2 or raw character stream.
- **Lab Room Truncation**: Table cells truncated `(Computer Lab)` to `(Comp` in wide laboratory titles. Fully recovered by extracting bounding boxes from the unclipped PDF character stream.
- **Data Files Generated**:
  - `data/sections.json`: 791 Section records with `id`, `sl`, `program`, `courseCode`, `title`, `section`, `credit`, `kind`, `meetings`, `faculty`, `facultyIds`, `tentative`.
  - `data/courses.json`: 107 Course catalog entries with `code`, `title`, `program`, `credit`, `hasLab`, `labCode`, `theoryCode`.
  - `data/faculty.json`: 207 Faculty records with normalized slug ID, clean name, and teaching assignments.
  - `data/anomalies.md`: Complete audit trail of repaired rows and edge cases.
  - `docs/spotcheck.md`: Verification of Sl 31, 56, 143, 197, 268, 354, 436, 486, 750, 761.

## Decision 3: Solver Architecture & Benchmarking (Phase 2)
- **Zero Heavy Dependencies**: Pure TypeScript solver implemented without heavy libraries (no z3, no GLPK) for instant Web Worker execution.
- **Bitmask Representation**: 5 days $\times$ 288 5-minute cells per day represented as `ScheduleBitmask = [bigint, bigint, bigint, bigint, bigint]`. Overlap detection is a single bitwise AND operation `(a[d] & b[d]) !== 0n`.
- **Search Strategy**: Backtracking with Static MRV ordering (domains sorted by size ascending) and section sorting by faculty preference.
- **Branch and Bound Leaf Pruning**:
  - Incremental metrics tracking during recursion (day presence bitmask, tentative count, early/late class count, faculty preference matches).
  - Theoretical upper-bound score calculation (assuming ideal 0 gap, gapScore = 100).
  - If `maxPossibleScore <= lowestScoreInHeap`, the leaf is pruned immediately without sorting meetings or calculating gaps.
- **Hard Limits**: Search halts at 200,000 nodes or 2,000ms timeout, returning best combinations with `truncated: true`.
- **Benchmark Performance**: In heavy 5-course combinations with over 50,000,000 naive combinations (evaluating 200,000 nodes and 190,774 valid combinations), the solver finishes in **~49ms** (far exceeding the < 200ms target).
- **Unit Tests**: All 7 Vitest test cases pass:
  1. Synthetic no-conflict baseline
  2. Direct conflict detection & empty result
  3. Locked section enforcement
  4. Day-off constraint (Tuesday)
  5. Scorer ordering with preferred faculty
  6. Theory/Lab co-requisite validation without internal collision
  7. 5-course heavy benchmark (< 200ms)

## Decision 4: Web Worker Integration & Hook State Machine (Phase 3)
- **Worker File**: Dedicated `src/workers/solver.worker.ts` executing the solver on a background thread.
- **Progress Reporting**: Emits progress events (`{ type: 'progress', checkedCount, validCount }`) throttled to ~100ms intervals, allowing fluid UI progress updates without thread blocking.
- **Worker Lifecycle & Abort**: `useSolver` hook handles worker spawning, message routing, error capture, termination on unmount, and immediate worker cancellation/respawn when a new solve request arrives.
- **In-Memory Cache**: Deterministic hashing of `SolveRequest` in memory ensures repeated solves with the same course selection/filters resolve instantaneously with 0ms overhead.
- **SSR & Fallback Resilience**: If Web Worker is unavailable (e.g. during SSR or specific environments), the hook falls back seamlessly to the synchronous solver function.

## Decision 5: UI/UX, Exports & Verification (Phases 4-8)
- **Aesthetic Theme**: Dark slate palette (`#060913`, `#111827`) with UIU brand orange (`#F26522`), glassmorphic panels, and saturated pastel course cards.
- **Credit Limits**: Enforces UIU standard limits (9 credits minimum, 18 credits maximum) with visible color-coded warnings for overload and underload.
- **Co-requisite Lab Automation**: Theory courses with paired labs automatically display an animated one-click "Add Co-requisite Lab" button.
- **Export Standards**:
  - Plain-text summary custom-formatted for immediate copy-pasting into UIU UCAM registration.
  - RFC 5545 iCalendar (`.ics`) file download with 12-week recurring schedule for Google/Apple Calendar.
  - Print stylesheet stripping navigation bars and controls for clean PDF generation.
- **State Synchronization**: Complete solve request (courses, preferences, filters, section locks) encoded in URL query parameters for shareability.
- **Celebration Micro-interactions**: Confetti burst on achieving a 100/100 rated routine.
- **Documentation**: Comprehensive `docs/solver-design.md`, `docs/user-guide.md`, and automated browser subagent test recorded in `uiu_routine_builder_test_*.webp`.

## Decision 6: Phase 9 UI Redesign
- **Light Theme Migration**:
  - Full removal of dark theme (`slate-900`, `slate-950`, dark gradients, neon glows).
  - Strict UIU-inspired warm palette:
    - Backgrounds: `--bg-page: #FFFBF7`, `--bg-surface: #FFFFFF`, `--bg-subtle: #FFF4EA`, `--bg-accent-soft: #FFE8D1`
    - Brand orange: `--orange-500: #F26B21`, `--orange-600: #D9560F`, `--orange-400: #FF8A4C`, `--orange-100: #FFEBDB`, `--orange-50: #FFF6EE`
    - Text: `--text-primary: #1F2937`, `--text-secondary: #4B5563`, `--text-muted: #6B7280`, `--text-on-orange: #FFFFFF`
    - Borders: `--border: #F1E4D6`, `--border-strong: #E8D2BC`
    - Soft warm box-shadow: `0 1px 2px rgba(242,107,33,0.06), 0 4px 16px rgba(31,41,55,0.05)`
  - Contrast adherence: WCAG AA contrast (≥ 4.5:1 body text), using `orange-600` for small text and `orange-500` for primary button fills and large highlights.
  - Saturated pastel course palette in `src/utils/colors.ts`: 12 distinguishable light tints with 4px darker left border and high-contrast text within the same hue family on a white background.
- **Preset Removal**: Removed completely (deleted preset file, sidebar quick bar, empty state cards, and all code references).
- **Route Restructuring & Landing Page**:
  - Landing page placed at `/` with high-impact hero, static timetable mock using real sections, live metric chips (791 sections, 107 courses, 207 faculty), "How it works", 3×3 features grid, interactive faculty teaser, FAQ accordion, and footer.
  - Routine Builder moved to `/builder`.
  - Seamless redirection from `/?...` query strings to `/builder?...` preserving all selection parameters.
- **Course-Wise Faculty Explorer**:
  - Read-only data presentation built on top of `data/sections.json` and `data/faculty.json`.
  - Desktop view: Slide-over drawer on the right side (~520px) overlaying the content without shifting the timetable layout.
  - Mobile view (<768px): Bottom sheet with drag handle.
  - Features: Faculty-grouped sections with section code, days, time, room, tentative flag, 5-day mini schedule strip, clash warning with current active routine, prefer/avoid quick toggles synced with solver preference state, copy plain-text faculty list, and filters (faculty search, day chips, time of day).
  - Strict data integrity: Only true schema fields are shown (`id`, `sl`, `program`, `courseCode`, `title`, `section`, `credit`, `kind`, `meetings`, `faculty`, `facultyIds`, `tentative`). No seat counts or unverified metrics.
- **Builder Layout Refactoring**:
  - App shell expanded to max-width 1600px with 2-column grid (`minmax(340px, 400px) 1fr`).
  - Left sidebar sized to content (`position: sticky`, `max-height: calc(100vh - 88px)`, thin custom scrollbar).
  - Ghost timetable empty state replacing large marketing hero when 0 courses are selected.
  - Timetable elevated as the primary visual hero in the right pane with compact routine toolbar and collapsible analysis drawer.

## Decision 7: Phase 10 Dedicated Faculty Directory & Cross-Navigation
- **Shared Site Navigation (`<SiteNav />`)**:
  - Unified across `/`, `/builder`, and `/faculty` with brand mark, term badge, active item highlight (orange text with 2px underline), and responsive hamburger drawer.
  - Landing navbar includes "Faculty" between "Features" and "FAQ", replacing the former anchor jump to the teaser section.
  - Builder navbar incorporates the "Faculty" link while preserving its compact 56px (`h-14`) bar, shortcuts, guide, and saved favorites.
  - Header subtitles standardized to `"Dept. of CSE & Data Science"` across all pages.
- **Dedicated Faculty Directory (`/faculty`)**:
  - Two-pane layout on desktop (max 1400px): left sticky searchable/filterable faculty list with letter jump bar (A–Z) for >60 entries; right pane for selected faculty details.
  - Mobile layout: List-first presentation with animated full-screen sheet for faculty details, complete with back button and Escape key dismissal.
  - Real fields only: Relies exclusively on fields present in `sections.json`, `courses.json`, and `faculty.json`. No seat counts, ratings, emails, photos, or invented initials are displayed.
  - Faculty details view:
    - Weekly timetable (Sat–Wed, 08:30–16:30) with course color coding matching the builder.
    - Overlapping section detection: Checks for self-overlapping meeting slots for the same instructor on the same day and displays an alert notice with warning indicators.
    - Sections grouped by course with room numbers, meeting times, credit counts, and tentative badges.
    - "Add course" button, "Prefer" / "Avoid" toggles, "Copy schedule" plain text export, and "Course explorer" linking to `/builder?course=<code>`.
    - "Open in builder" button linking to `/builder?courses=...&pref=...` using the existing URL query string format.
- **Routing & Slug Collision Resolution**:
  - URLs support shareable deep-linking via `/faculty?f=<slug>`.
  - Deterministic slugs are generated via `slugifyFacultyName` (lowercase, alphanumeric characters and hyphens).
  - Collisions are resolved deterministically by tracking occurrences and appending counters (`-2`, `-3`), ensuring persistent, collision-free URLs.
  - Browser back and forward buttons update selected faculty seamlessly via Next.js router and `useSearchParams`.
- **Faculty Name Normalization & Quality Review**:
  - Search queries normalize text by stripping accents, punctuation, and extra whitespace, allowing queries like "sajjad hossain" to match both "Md. Sajjad Hossain" and "Sajjad Hossain".
  - Data files (`data/faculty.json`, `data/sections.json`) remain strictly untouched.
  - Anomalies and near-duplicates (e.g. `Md. Sajjad Hossain` vs `Sajjad Hossain`, `Md. Asadujjaman` vs `Md. Asaduzzaman`, acronym `RaAN`, unassigned `TBA`) are documented in [`docs/faculty-name-notes.md`](file:///c:/Users/USER/Desktop/section%20selection/docs/faculty-name-notes.md).
- **Single Source of Truth Preference Synchronization**:
  - Prefer/Avoid toggles on `/faculty` update a shared storage cache (`sessionStorage` and `localStorage`).
  - When returning to `/builder` or opening the slide-over Course Explorer, changes are immediately reflected without desynchronization.
  - Toggling preference on an unselected course auto-adds the course with an informative toast notification.
- **Cross-Linking Course Explorer Panel**:
  - The existing slide-over Faculty Explorer panel remains completely unchanged in layout and behavior, with faculty names now linking to `/faculty?f=<slug>`.
## Decision 8: Phase 11 Course-First Directory Refactoring
- **Architectural Shift: Course-First instead of Faculty-First**:
  - Completely replaced the faculty-first design (faculty list on left, timetable on right) with a course-first directory modelled after the UCAM mobile portal experience.
  - Page heading renamed to "Course Directory" with subtitle: "Pick a course to see which faculty teach which section, and when."
  - Maintained route `/faculty` for compatibility and added seamless redirect `/courses -> /faculty`.
  - Updated navbar label to "Course Directory" across landing, builder, and directory headers for clarity and consistency.
- **Course List & Filtering**:
  - Toolbar features live search matching course codes, titles, faculty names, and common aliases (`DSA`, `OOP`, `AI`, `DB`, `OS`, `FYDP`, `Compiler`, etc.).
  - Program chips (`All`, `BSCSE`, `BSDS`), credit filter chips (`All`, `1 Cr`, `2 Cr`, `3 Cr`), type filter (`All`, `Theory`, `Lab`), and sorting (`Code A–Z`, `Title A–Z`, `Most sections`).
  - Desktop (≥1024px) features two panes: left sticky scrollable course list, right selected course sections. Tablet (768–1023px) uses 300px left pane. Mobile (<768px) uses inline accordion expansion matching UCAM mobile.
  - Theory/Lab co-requisite link chips allow 1-click jumping between paired courses.
- **Section Rows (UCAM-Inspired Clean Design)**:
  - Each section row ordered by natural alphabetical sort (`A, B, ... Z, AA, AB, ... A1, A2`).
  - Faculty avatar circle with initials and deterministic soft light-theme color palette (WCAG AA compliant, avoiding harsh gradients).
  - Meeting chips with clock icon showing day and times (full day names on desktop, 3-letter on narrow screens to prevent horizontal overflow).
  - Room text separated by divider, tentative badges, and desktop-only mini 5-day occupancy strip.
  - "Prefer" / "Avoid" toggles write directly to the shared solver preference state with auto-add toast notification.
- **Within-Course Features**:
  - Filter by faculty name, day chips, time-of-day chips, and section sorting (`By section`, `By faculty`, `By time`).
  - "Group by faculty" toggle displays sections grouped under each instructor.
  - "Add course" button and "Copy list" plain-text summary.
- **Faculty Cross-Reference Popover**:
  - Clicking any faculty name opens a compact popover detailing other courses and sections taught by that instructor this trimester.
  - Includes "Show this faculty's courses" action to quickly filter the directory by that faculty member.
- **Dead Code Cleanup**:
  - Removed faculty weekly timetables, A–Z letter jump bar, and faculty-first helpers.
  - Retained `slugifyFacultyName`, `resolveSlugCollisions`, and `normalizeForSearch` in `src/lib/facultyIndex.ts`.
  - Pure course directory indexing, filtering, sorting, natural sorting, and cross-reference logic isolated in `src/lib/courseDirectory.ts`.

### Phase 11 recovery notes
Following a session interruption audit:
- All uncommitted code was inspected and verified.
- Fixed `getFacultyInitials` in `src/lib/courseDirectory.ts` to cleanly handle multiple chained honorific prefixes (`Prof. Dr. M.`) and uppercase initials from acronyms (`RaAN` -> `RN`).
- Added accessible `aria-label` speech text on `SectionRowItem` matching the accessibility specification.
- Sub-phases status audit:

| Sub-phase | Description | Status |
|---|---|---|
| **11A** | Page structure, layout, navbar label, dead code removal | Done |
| **11B** | Course rows, credit/program chips, theory-lab jump chips, selected styles | Done |
| **11C** | Section list, UCAM-style rows, avatar initials, time chips, prefer/avoid, within-course filters, group-by-faculty | Done |
| **11D** | Faculty cross-reference popover and "Show this faculty's courses" action | Done |
| **11E** | URL routing (?c=...), shared builder state sync, pure helpers in courseDirectory.ts, accessibility & unit tests | Done |
| **11F** | Metadata, landing page teaser update, user guide documentation, tests and build verification | Done |




