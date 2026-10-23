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

## Decision 9: Phase 12 Search fix and Directory UI polish
- **Search Root-Cause Analysis**:
  - The legacy search logic in `courseDirectory.ts` used unranked continuous substring checks (`includes(term)`) against title and concatenated faculty names.
  - For short queries like `"os"`, courses were matched against any faculty whose name contained `"os"` (e.g. `Hossain`, `Mostofa`, `Mosharraf`), flooding the results with almost all 107 courses in raw data order with zero relevance ranking.
  - Multi-word queries required rigid exact substrings, failing queries like `"operating system"` against `"Operating Systems"` due to missing token stemming and word-order flexibility.
- **Dedicated Pure Search Architecture (`src/lib/courseSearch.ts`)**:
  - Single-pass search index built once (`useMemo`) indexing:
    - Code forms: compact (`cse4509`), spaced (`cse 4509`), and raw code.
    - Title tokens & stemmed forms (stripping trailing `'s'` so singular and plural forms match symmetrically).
    - Auto-generated title abbreviations/initialisms (e.g., `"Operating Systems"` -> `"os"`; `"Operating Systems Laboratory"` -> `"os"`, `"osl"`; `"Data Structure and Algorithms I"` -> `"dsa"`, `"dsai"`, `"dsa1"`).
    - Verified handwritten domain aliases (`OS`, `DSA`, `OOP`, `DBMS`, `SE`, `DLD`, `COA`, `CN`, `DS`, `BDS`, `AI`, etc.) mapped only to verified real courses in `data/courses.json`.
    - Tokenized faculty names for each course.
  - Token-level query normalization and token-based AND evaluation (order of words does not matter; `"database management"` and `"management database"` return identical results).
  - Strict short-query guard: Queries of 1–3 characters only match code prefix, abbreviation/alias exact match, or title-word prefix. They explicitly forbid faculty substring or mid-word matches.
  - Typo tolerance: For queries of $\ge 4$ characters yielding zero matches, Damerau-Levenshtein distance $\le 1$ allows adjacent character transpositions (e.g., `"opertaing"` -> `"operating"`).
  - Relevance ranking hierarchy:
    1. Exact code match (score 1000)
    2. Exact alias or abbreviation match (score 800)
    3. Code prefix (score 650)
    4. Title prefix match (score 500)
    5. Title word-prefix matches (score 350+)
    6. Faculty name matches (score 200+)
    7. Typo match (score 180)
    - Tie-breaking defaults to natural course code order.
- **Natural Course Code Sorting**:
  - Replaced naive string sorting with `naturalCourseCodeSort` across directory creation, default sort, and tie-breakers. Correctly orders department prefix alphabetically (`ACT`, `BDS`, `BIO`, `CSE`), numeric parts as numbers (1110, 1111, 2215, 4509), and suffixes alphabetically.
- **Course Directory UI Bug Fixes**:
  - **Doubled Plus Icon**: Removed the literal `+` string inside `<span>+ Add course</span>`, rendering only the clean Lucide `Plus` SVG icon alongside `"Add course"`.
  - **Group-by-Faculty View Toggle**: Fixed active filter accounting via `getActiveSectionFilterCount`. `groupByFaculty` is a view mode and does not increment active filters; the `"sections match active filters"` badge only renders when genuine section filters (faculty search, day, time) are active. Toggle button updated with `type="button"`, `aria-pressed`, and clear outlined (off) vs filled orange (on) styling.
  - **Search Enhancements**: 120ms debouncing (instant on clear), match highlighting using `<mark>` elements, match reason badges (`Matches: OS`, `Matches faculty: <name>`), rich empty state with suggestion pills, inline clear button (`X`), `/` and `Escape` shortcuts, URL synchronization without resets, and preserved selected course with an out-of-results notice banner.

## Decision 10: Phase 13 FYDP fixed course overlay
- **Context & Problem**:
  - Final Year Design Project (FYDP) classes (`CSE 4000A`, `CSE 4000B`, `CSE 4000C`) are not scheduled like ordinary elective or core courses where students pick arbitrary sections.
  - At UIU, all students enrolling in FYDP attend Section I, held on Saturday from 11:11 AM to 01:40 PM (minutes 671 to 820 from midnight).
  - The routine builder must automatically schedule all other courses around this fixed slot and ensure every generated routine contains FYDP Section I.
- **Hard Architectural Constraints**:
  - The solver (`src/solver/*`), worker (`src/workers/*`), hook (`src/hooks/useSolver.ts`), and dataset files (`data/*`) are strictly immutable.
  - Solution: UI-layer overlay (`src/lib/fixedCourses.ts`) that supplies an in-memory view of courses and sections to the builder and directory where FYDP courses have exactly 1 candidate section (Section I, fixed schedule).
- **Inspection Findings**:
  - `data/courses.json` has `CSE 4000A` (2 credits, BSCSE) and `DS 4000A` (2 credits, BSDS). `CSE 4000B` and `CSE 4000C` were absent in raw data.
  - `data/sections.json` has 10 sections for `CSE 4000A` (`A`–`J`). Section `I` (`BSCSE-CSE 4000A-I`, sl: 388) already has the exact slot: Saturday 11:11 AM–01:40 PM (`start: 671, end: 820`).
  - No legacy half-built generic "busy" features existed in the codebase.
- **Config & Overlay Architecture (`src/lib/fixedCourses.ts`)**:
  - `FYDP_FIXED` configuration specifying `courseCodes: ['CSE 4000A', 'CSE 4000B', 'CSE 4000C']`, `sectionLabel: 'I'`, `meetings: [{ day: 'Saturday', start: '11:11', end: '13:40' }]`.
  - Extensible: additional meeting days (e.g. Sunday, Tuesday, Wednesday) can be added to `meetings` without modifying any other code.
  - `applyFixedCourseOverlay`: Injects synthetic courses for `CSE 4000B`/`CSE 4000C` if not present in the catalog, filters out non-fixed sections (A–H, J) for fixed courses, and returns exactly Section I with `fixed: true` and `synthetic: boolean`.
  - Pure read-only clash detection `computeFYDPClashes`: Computes union bitmask of active FYDP sections and identifies which sections of other courses clash (`availableSections`, `hiddenSections`, `allSectionsClash`).
- **UI Behaviors & UX Details**:
  - **Builder Course Selector**:
    - Chip autocomplete marks FYDP courses with an orange `Fixed` badge.
    - If multiple FYDP courses are selected (e.g. A and B), a gentle notice informs the user: *"FYDP courses usually run one at a time; check UCAM."*
    - The selected course card renders `"Fixed: Sat 11:11 AM-01:40 PM"`, detailed meeting info (`"Section I • Saturday 11:11 AM–01:40 PM | Fixed Schedule"`), and hides faculty prefer/avoid and section lock controls.
    - Other selected courses display `"N of M sections available"`, with an expandable muted accordion `"Hidden by FYDP (K)"` displaying the clashing section labels and times.
    - Courses where all sections clash display a warning banner: `"No section of <CODE> fits around FYDP (Sat 11:11 AM-01:40 PM)"`, and the solver gracefully yields 0 routines with a clear explanation without crashing.
  - **Timetable Card**:
    - Fixed course card renders with a lock icon and `"Fixed • Sec I"` badge in amber styling.
  - **Course Directory (`/faculty` & `/courses`)**:
    - Lists Section I with `"Fixed schedule"` badge and `"Faculty TBA"`. Prefer/Avoid controls are replaced with `"Fixed schedule"`.
  - **Exports & URL Sync**:
    - Copy UCAM includes FYDP with `[Fixed Schedule]`.
    - iCal export includes it as a recurring 12-week Saturday event.
    - Shareable URLs encode only the course code (e.g., `courses=CSE+4000A`), and the overlay dynamically injects the fixed schedule on load.
    - Header stat remains static at 791 sections from raw data.
- **Verification**:
  - 8 new Vitest tests covering bitmask alignment (matching `BSCSE-CSE 1110-J` lab slot), solver integration with `CSE 4509`, clashing warnings with real course `CSE 4817` and synthetic fixture, touching boundary time separation (0n mask overlap), multi-day extensibility, search indexing, and section count integrity.
  - Total test suite: 47 tests passing across 5 test suites.
  - Next.js production build (`npm run build`) compiles cleanly.

## Decision 11: Phase 14 Search List Deduplication & Manual FYDP Course Schedule
- **Part 1: Root Cause Analysis of Directory Search Duplicates & Full List Rendering**:
  - **109 vs 107 Courses**: `data/courses.json` contains 107 course records (101 unique codes + 6 courses dual-listed under both `BSCSE` and `BSDS`: `CSE 2215`, `CSE 2216`, `CSE 2217`, `CSE 2218`, `CSE 3521`, `CSE 3522`). In Phase 13, `applyFixedCourseOverlay` synthetically injected `CSE 4000B` and `CSE 4000C`, inflating catalog length to 109.
  - **Duplicate Course Rendering & Reconciler Desync**: React elements in `src/app/faculty/page.tsx` were keyed with `key={c.code}`. Because the 6 dual-listed courses had identical codes, React Fiber reconciler threw duplicate key warnings. When `filteredCourses` shrunk upon search query (e.g. searching "cse 4509"), React's reconciler failed to delete the orphan DOM elements with duplicate keys, leaving the initial duplicate-keyed sequence stuck on screen while the header correctly reported 1 result.
  - **Fixes Applied**:
    - Updated React keys to `key={`${c.code}-${c.program}`}` in both desktop list and mobile accordion.
    - Deduped search results by `courseCode` in `src/lib/courseSearch.ts` and `src/lib/courseDirectory.ts`.
    - **Relevance Cutoff**: Exact code matches (`matchType === 'code-exact'`, e.g. "cse 4509", "cse4509") return only the exact course. Code-prefix queries (e.g. "cse 45") return only code-prefix courses. Score threshold drops weak faculty or typo matches whenever strong matches exist.
    - Total catalog and directory index size strictly restored to 107 real courses.
- **Part 2: Manual-Input FYDP Schedule Architecture**:
  - **Context**: Students taking FYDP are assigned distinct sections and meeting times; hardcoding Saturday 11:11–13:40 was inaccurate as a universal default.
  - **Configuration (`src/lib/fixedCourses.ts`)**:
    - Replaced hardcoded slot with configurable `MANUAL_SCHEDULE_COURSES = ['CSE 4000A', 'CSE 4000B', 'CSE 4000C']`.
    - Preserved catalog length at 107; removed synthetic course catalog injection.
  - **Modal & UI Input (`src/components/ManualScheduleModal.tsx`)**:
    - Accessible dialog with focus trap and `Escape` support.
    - Free-text section label (1–4 characters, e.g. "I").
    - Day chips (Sat, Sun, Mon, Tue, Wed) multi-select.
    - Start and end time inputs with 5-minute step validation (end > start, within 08:00–21:00).
    - Dynamic UIU lab slots quick-fill dropdown derived dynamically from `data/sections.json` via `extractLabSlotsFromSections` (e.g. 08:30–11:00, 11:11–13:40, 14:00–16:30) without hardcoding.
    - Optional room and faculty text fields.
    - Form cancellation on first addition safely removes the unconfigured course from selection.
  - **Solver & Clash Detection**:
    - `buildManualSection` converts input into an in-memory `Section` with `manual: true`, `fixed: true`, and `synthetic: true`.
    - Solver receives the course with exactly 1 candidate section, locking it into every generated routine.
    - `computeManualClashes` calculates clashing sections of other courses using bitmasks read-only, rendering `"Hidden by FYDP"` accordions and `"No section of <CODE> fits around FYDP (<Schedule>)"` warnings when all sections conflict.
  - **Timetable & Course Cards**:
    - Timetable card displays `"Manual • Sec <Label>"` with a `Pencil` icon.
    - Course row displays `"Manual: <Schedule>, Sec <Label>"` with an `Edit` button and credits intact.
  - **Persistence & URL Sharing**:
    - Saved to `localStorage` under `uiu_manual_schedules` with `try/catch`.
    - Compact shareable URL parameter `mx=CSE4000A.I.Sat-Tue.1111-1340` deserialized via `decodeManualScheduleUrl`.
  - **Exports**:
    - Copy UCAM text export, iCal, and print/PDF output include manual sections labeled with `[Manual Schedule]`.
  - **Course Directory (`/faculty`)**:
    - Displays `"Schedule set manually"` with builder CTA when data has 0 sections for a manual course.
    - Displays real sections with a manual schedule callout banner when data has departmental sections.
## Decision 12: Course Removal Discoverability & Undo System (Phase 15)
- **Problem**: Users found it difficult to discover and trigger the course removal action due to low visual affordance and small tap targets on course rows.
- **What Changed**:
  - **High-Affordance Remove Button**: Each selected course row features a visible, high-contrast button with a `Trash2` icon and "Remove" text on desktop (>= 768px), styled with `text-danger`, subtle hover red background (`bg-danger-bg`), and visible focus rings.
  - **"Clear All" with Confirmation Popover**: When 2 or more courses are selected, a "Clear all" ghost button appears in the course selection header. Clicking opens a non-modal confirmation popover with an optional checkbox to also reset day-off/time filters and preferences.
  - **Search Dropdown Toggle**: Courses already selected remain in the search autocomplete results instead of being hidden. They show an `"Added"` badge with a `Check` icon that transitions to `"Added · click to remove"` with a `Trash2` icon on hover and focus. Clicking removes the course directly from the search dropdown.
  - **Undo Toast**: A floating notification appears at bottom-center (desktop) or above the bottom bar (mobile) upon single course removal or clear-all, auto-dismissing after 6 seconds. It completely restores previous state, including locked sections, preferred/avoided faculty, and paired co-requisites.
  - **Theory-Lab Co-requisite Removal Prompt**: Removing a theory course with an active lab triggers an inline prompt asking whether to remove both or keep the lab only.
  - **First-Time Tip**: A small muted, dismissible tip is shown under the selected course list on first use ("Tip: click Remove or press Delete to drop a course."), persisted in `localStorage` (`uiu_routine_dismiss_remove_hint`) with `try/catch`.
- **Keyboard Shortcuts & Navigation**:
  - Selected course cards are focusable (`tabIndex={0}`, `role="listitem"`).
  - Pressing `Delete` or `Backspace` on a focused course card removes it immediately.
  - Tab order flows logically: `row card > sections explorer > locked section select > faculty preferences > lab toggle > remove button`.
  - Pressing `u`, `U`, or `Ctrl+Z` / `Cmd+Z` triggers the undo action when the toast is active.
- **Mobile Hit Area Considerations**:
  - The remove button enforces a minimum `44x44px` hit target on touch viewports (`min-w-[44px] min-h-[44px]` on mobile) per WCAG 2.5.5, while maintaining a compact visual size without overflowing on 320px screens. On desktop, it transitions to a compact `32x32px` minimum button with clear label text.
- **Verification**:
  - All 48 Vitest test suites pass (`npm test`).
  - Next.js production build (`npm run build`) compiles cleanly without lint or type errors.

## Decision 13: Dedicated Faculty Directory Page & Teaching Profiles (Phase 16)
- **Context & Problem**:
  - While `/faculty` serves as the UCAM-inspired Course Directory, students and faculty lacked an instructor-first directory to browse who teaches what, view full weekly schedules, and inspect teaching loads across departments.
- **Route Choice & Compatibility**:
  - Existing `/faculty` remains untouched as the Course Directory (with `/courses` redirecting to `/faculty`).
  - Dedicated Faculty Directory placed at `/faculty-directory` (list) and `/faculty-directory/[id]` (detail profile).
  - Uses Next.js App Router `generateStaticParams()` to pre-render all 207 faculty detail pages statically at build time (100% static-export and Vercel compatible).
  - Nav config updated in `src/config/nav.ts` with prefix match for `/faculty-directory` evaluated before `/faculty`.
- **Pure Data Layer (`src/lib/facultyStats.ts`)**:
  - Precomputes all instructor metrics from `data/sections.json` and `data/faculty.json`.
  - Multi-faculty section `CSE 4399 A` credited to both instructors (`Siddique Md. Lutful Kabir` and `Mr. Angkon Deb`).
  - TBA sections (25 sections) excluded from the instructor list and tracked in a dedicated TBA panel.
  - Total section count sanity verified: 767 faculty assigned + 25 TBA = 792 (791 raw sections + 1 shared section).
  - Accurate UIU time slot classification:
    - Morning: start < 11:11 (< 671 minutes)
    - Midday: 11:11 – 13:50 (671 <= minutes <= 830)
    - Afternoon: start >= 13:51 (>= 831 minutes)
  - Title-insensitive sorting (`stripFacultyTitle`) ignoring prefixes (`Mr.`, `Ms.`, `Mrs.`, `Dr.`, `Prof.`, `Md.`, `Mst.`, `Engr.`).
- **Badge Rules & Tuning (`src/config/facultyBadges.ts`)**:
  - Centralized thresholds config:
    - "First Bell": 3+ sections starting at 08:30 AM (top ~6-10%).
    - "Late Shift": 3+ sections starting at 01:51 PM or later (top ~11%).
    - "Lab Pro": 3+ lab sections.
    - "Multi-Course": 5+ distinct courses taught.
    - "Busiest": 6+ sections (top 10 tier).
    - "Weekend Starter": >= 70% of sections scheduled on Sat/Tue (with min 2 sections).
  - Rendered with warm theme tokens, small icons, and descriptive tooltips. Max 3 badges per card; all shown on detail profiles.
- **Two-Pane Directory UI (`/faculty-directory`)**:
  - Exact layout architecture from the Course Directory (`/faculty`):
    - **Faculty Spotlight Banner (Daily Highlight)**: Prominently featured banner at the top displaying a daily instructor highlight deterministically chosen by date, featuring avatar, earned badges, teaching load metrics (sections, theory vs lab, weekly contact hours, busiest day), and a direct "View Schedule" action button.
    - **Prominent Teaching Load Leaderboards Showcase**: Collapsible showcase featuring 5 distinct top-5 ranking categories:
      1. 📚 Most Theory Courses (distinct theory courses taught)
      2. 🔬 Most Lab Courses (distinct lab courses taught)
      3. 🔥 Most Sections Overall (total assigned sections)
      4. ⏰ Most Weekly Hours (contact hours per week)
      5. 🔔 08:30 AM Starts (early morning sections)
      - Includes podium rank badges (🥇 #1 gold, 🥈 #2 silver, 🥉 #3 bronze), colored metric badges, and interactive click-to-select functionality that immediately jumps to and activates that instructor.
    - **Left Sticky Pane** (`md:grid-cols-[300px_1fr] lg:grid-cols-[minmax(340px,380px)_1fr]`):
      - Strictly organized in natural alphabetical order (`a.name.localeCompare(b.name)`), matching `data/faculty.json`.
      - Displays sticky alphabetical letter dividers (`A`, `B`, ..., `M`, ...) with instructor counts per letter group when sorted A–Z.
      - Each item includes avatar initials, name with search query match highlighting, program tags, section/course/hour metrics, badges, and Sat–Wed day dots. Selecting any faculty immediately activates them with the reserved orange indicator (`border-l-[3px] border-l-orange-500`).
    - **Right Details Pane**: Displays the active instructor's full profile: header banner with avatar, stats, badges, and "Copy link"; compact Sat–Wed 08:30–16:30 weekly teaching timetable mini-grid; UCAM-inspired course & section rows (with code, title, credits, section count, meeting times, room, and tentative flag, strictly **WITHOUT** prefer/avoid buttons); and "Teaches with" co-instructors strip (clicking any co-instructor selects them in the left pane).
    - **Mobile Accordion** (`< 768px`): In-place accordion expansion where tapping an instructor reveals their weekly timetable and assigned sections, complete with alphabetical letter dividers.
  - Interactive toolbar with live search (press `/` to focus, `Esc` to clear), program chips (ALL/BSCSE/BSDS), day chips (Sat–Wed), time slot chips, course kind chips, and sort dropdown (A–Z default).
  - Collapsible panels for Top-5 Teaching Load Leaderboards and Unassigned (TBA) section tracker.
- **Detail Profile UI (`/faculty-directory/[id]`)**:
  - Header profile card with pastel avatar, name, programs, badges, stats row, "Copy link" action, and breadcrumb back link.
  - Page-level stats card: busiest day, days on campus, earliest start, latest end, and slot breakdown.
  - Compact Sat–Wed 08:30–16:30 weekly teaching timetable mini-grid with course pastel color coding and accessible screen reader text alternative.
  - Courses & sections list grouped by course with deep links to Course Directory (`/faculty?c=...`).
  - "Teaches With" strip displaying top 6 co-instructors sharing the same courses.
- **Navigation & Layout Consistency**:
  - SiteNav updated with 4 centered links (`Home`, `Builder`, `Course Directory`, `Faculty Directory`) with reserved 2px border and reduced gap on 768–1024px tablet viewports to prevent wrapping.
  - Added link to SiteFooter navigation and mobile drawer menu.
  - Adheres strictly to `--page-max-w` (1440px) and typography scale [11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40].
- **Verification**:
  - 12 Vitest test files passing (130 tests total, including 19 new facultyStats tests).
  - Next.js production build (`npm run build`) generates 219 static pages (all 207 faculty SSG pages + directory) with zero errors.

## Decision 10: Phase 12 Faculty Directory Upgrade (Full Names & Enhanced Features)
- **Phase 0: Truncated Faculty Names Extraction Bug Fix & Backward Compatibility**:
  - Root cause: Column boundary splitting and character stream chunking in `scripts/extract.py` truncated instructor names ending near column boundaries (e.g. "Abdullah Ibne Masud Ma" for "Abdullah Ibne Masud Mahi").
  - Solution: Switched to MCID character stream grouping in `scripts/extract.py`, which gathers all glyph characters within the Faculty Name column with a safe right margin before separating attached initial tokens.
  - Result: All 207 faculty members now have their full, un-truncated legal names. Zero names are strict prefixes of another name.
  - Legacy ID Backward Compatibility: Created `data/faculty-id-aliases.json` mapping 14 legacy IDs to canonical IDs (e.g. `abdullah-ibne-masud-ma` -> `abdullah-ibne-masud-mahi`). Implemented `src/lib/facultyAliases.ts` (`resolveFacultyId`, `migrateFacultyIdArray`, `migrateFacultyIdRecord`) so old URLs, bookmarks, and local storage keys continue resolving transparently. Static generation in `generateStaticParams()` includes both canonical IDs and legacy alias paths.
- **Phase 1: Feature Additions (Independent from Builder)**:
  - **Search by Initials**: Generated initials per faculty stored in `searchAliases` (all words, without titles, without Md./Mohammad prefix, first-two-letters). Instant search matches name, course code/title, or initials with helper tip.
  - **Pinned Faculty ("My faculty")**: Stored in LocalStorage key `"uiu-rb:pinned-faculty:v1"` with cross-tab sync via `window.addEventListener('storage')`. Capped at 30 pins. Filter chip "Pinned only", pinned avatars strip, and star buttons on cards/detail views.
  - **Faculty Comparison (`/faculty-directory/compare?a=...&b=...`)**:
    - Select up to 2 instructors with checkbox selection and sticky bottom bar.
    - Side-by-side metrics table with subtle neutral tint on the higher value (no red/green, no winner text).
    - Highlights shared courses and provides side-by-side weekly timetables.
  - **Extended Badge System (`src/config/facultyBadges.ts`)**:
    - Added 6 new badges (Marathon, Floor Hopper, Home Room, Course Hub, Cross-Program, Monday Special) for 12 total badges.
    - Priority-sorted with max 3 on cards and all on profile details.
    - Accessible Badge Legend Modal (`BadgesLegendModal.tsx`) with plain-English definitions.
  - **Campus Stats ("Fall 2026 by the Numbers")**:
    - Interactive campus heatmap (Sat–Wed x standard theory, single-day theory, and lab time slots) with All/Theory/Lab filter and ARIA labels.
    - Faculty section load histogram (1, 2, 3, ... 8+ sections), curriculum stacked bar, busiest/quietest day summaries, top 10 courses, and top 10 rooms.
  - **Room Schedule Sheet (`RoomScheduleSheet.tsx`)**:
    - Accessible desktop drawer / mobile bottom sheet showing complete weekly timetable for any classroom or lab with direct links to instructor profiles.
  - **Schedule Exports & Surprise Me**:
    - Client-side 2x retina Canvas PNG timetable card export and standard 12-week recurring `.ics` iCal export.
    - "Surprise me" random faculty selection button on click.
## Decision 11: Phase 13 Dedicated Badges Tab in Faculty Directory
- **Architecture & Pure Memoized Computations (`src/lib/facultyBadges.ts`)**:
  - Computed once per session at module load without drift from `computeFacultyBadges()`.
  - For each of the 12 badges in `src/config/facultyBadges.ts`:
    - Evaluates all holders, their exact metric value and human-readable label (`metricLabel(faculty)`, e.g. "5 in a row", "6 floors", "78% in Room 530").
    - Calculates total holders, campus share percentage, and rarity rank (1 = rarest to 12 = most common).
    - Identifies the top 3 rarest badges (`isRarest: true`).
    - Finds top holder with tie detection ("Highest: Dr. Alice (+1 more) (5 in a row)").
    - Calculates top 5 instructors with the most badges ("Multi-Badge Achievers").
  - Ensures clean RSC serialization: separated function properties (`metricValue`, `metricLabel`) on `BadgeDefinition` from runtime `FacultyBadge` instances on `FacultyStats` to prevent Next.js client-boundary serialization errors.
- **Interactive UI (`src/components/faculty/FacultyBadgesView.tsx`)**:
  - Main segmented view switcher updated with 3 tabs: `Directory`, `Stats & Heatmap`, and `Badges`.
  - 3-column badge card grid (responsive down to 2-col tablet and 1-col mobile).
  - Category filtering (`All`, `Schedule`, `Courses`, `Rooms`, `Programs`) and sorting (`Rarest first` default, `Most common`, `Priority`, `A-Z`).
  - Selected Badge Faculty List Panel:
    - Rule description, `howToEarn` guidance, live search input, program chips (`ALL`, `BSCSE`, `BSDS`), and sort select (`By metric high-to-low` default, `A-Z`).
    - Row items with avatar initials, program tags, metric value badge chip, other badges (max 2), star (pin) button, compare checkbox, and 30-row "Load more" pagination.
    - Deep linking & sharing: `?tab=badges&badge=<badgeId>` with shareable "Copy link" button.
    - Clicking any badge chip throughout the application (faculty cards, detail profiles, spotlight, compare view) navigates directly to the Badges tab with that badge active.
- **Responsive & Accessibility Safeguards**:
  - Mobile (<768px): Opens selected badge holders in full-screen/bottom sheet with locked body scroll, visible close button, and Esc dismissibility.
  - Keyboard navigation: Card buttons support arrow keys navigation (`ArrowRight`, `ArrowLeft`, `ArrowDown`, `ArrowUp`), Enter/Space selection, `aria-pressed`, and `aria-live` count regions.
  - Strict compliance with UI typography scale (zero fonts below 11px) and `--page-max-w` (1440px) container.
- **Verification**:
  - 14 Vitest test files passing (164 tests total, 11 new tests in `facultyBadgesTab.test.ts`).
  - Next.js production build (`npm run build`) generates 234 static pages with 0 errors.

## Decision 12: Badges Tab Polish & Holders Panel Redesign
- **Remove Duplicate Control**:
  - Removed duplicate "Badges (12)" header button in `src/app/faculty-directory/page.tsx` since the Badges tab is already present in the primary segment control.
  - Kept "How badges work" and "Surprise me" intact.
  - Renamed corner rarity label on badge cards from "#N" to "Rarity #N" with informative tooltip: "1 = fewest faculty hold this badge".
- **Holders Panel Header Redesign**:
  - Replaced the flat gray header with a soft category-tinted banner: 48px icon tile, 20px bold badge title, category label, and a stat strip with 3 mini stats (Holders 28px bold number, % of faculty, Rarity #N of 12).
  - Merged Rule and "How to earn" into one line with an Info tooltip/popover containing the full criteria.
- **Holder Rows Redesign**:
  - Ranks at left: 1, 2, 3... with gold/silver/bronze soft badges for top 3; ties share ranks with standard "=" prefix (e.g. "=1", "=2").
  - Stable pastel avatar from `faculty.avatarColor`.
  - 14px semibold name with tooltip for long names, single program tag group (removed duplicate teal chip).
  - Prominent METRIC BLOCK on right: 18px bold tabular number + small unit label (`metricUnit`), relative orange bar (max = 100%), and muted `metricDetail` line.
  - Up to 3 icon-only other badge chips with tooltips under the name.
  - 32px Pin (star) and open page buttons with `stopPropagation`; orange compare checkbox visible on hover/focus/checked/touch.
  - Entire row clickable to view faculty detail page.
- **Meta Per Badge & 3-Factor Tie-Breaking (`src/config/facultyBadges.ts` & `src/lib/facultyBadges.ts`)**:
  - Extended all 12 badge definitions with `metricUnit` and `metricDetail(faculty)`.
  - Deterministic 3-factor sorting: `metricValue` desc -> `totalSections` desc -> `sortName` A-Z.
  - Applied the same tie-breakers to the `topHolder` calculation.
- **Toolbar & Sticky Layout**:
  - Pinned sticky panel layout (`sticky top-20 h-[calc(100vh-6.5rem)]`) with internal scrolling and zero bottom gap.
  - Program filter chips use standard orange active styling (removed black "ALL"). Sort select matches main directory styling.
  - Selected badge card uses stronger orange border/ring + checkmark and smooth scroll-into-view.
  - Mobile (<768px): full-screen/bottom sheet with body scroll locked, 44px tap targets, 16px inputs.
- **Verification**:
  - 169 Vitest tests passing across 14 test suites (`facultyBadgesTab.test.ts` expanded to 16 comprehensive tests).
  - Production build clean across 234 static pages.

## Decision 13: Holders Panel Bug Fixes (Duplicate Metric, Pastel Avatars, Tie Notes & Marathon Tie-Breaker)
- **Duplicate Metric Suppression & Enriched Details**:
  - Implemented `isMetricDetailRedundant(detail, value, unit)` in `src/lib/facultyBadges.ts` to hide the second detail line whenever it merely repeats the value and unit without providing new info (e.g. "5 courses", "3 laboratory sections", "3 in a row").
  - Enriched all 12 badge definitions in `src/config/facultyBadges.ts` to provide new informative detail lines:
    - Marathon: `computeMarathonDetail` formats the day and exact time window of the longest back-to-back chain (e.g. `"Sun 09:51-01:40 PM"`), appends `"(+1 more day)"` if chains exist across multiple days, and includes `"x pairs this week"`.
    - Multi-Course & Lab Pro: lists distinct course codes taught (e.g. `"CSE 1111, CSE 2215 +2"`).
    - First Bell & Late Shift: lists days taught (e.g. `"Sat, Sun, Tue at 08:30 AM"`).
    - Home Room: lists room name and meetings count (e.g. `"Room 530 (8 meetings)"`).
- **Pastel Stable-Color Avatars**:
  - Replaced invalid Tailwind class interpolation (`${faculty.avatarColor.bg}`) in `FacultyBadgesView.tsx` with proper React inline `style={{ backgroundColor: faculty.avatarColor.bg, color: faculty.avatarColor.text, borderColor: faculty.avatarColor.border }}`.
  - Fixes white circle regression and restores deterministic pastel avatar colors matching the main directory list 1:1.
- **Tie Notes & Medal Suppression**:
  - When more than 3 holders share rank 1 (`rank1Holders.length > 3`), gold/silver/bronze medals are suppressed in favor of neutral rank circles with `"="` prefix (`=1`), avoiding arbitrary medals when everyone is tied.
  - Renders an informative one-line banner under the toolbar: `"N faculty are tied at <value> <unit>"`.
  - When the top 3 are distinct (or rank 1 ties are <= 3), standard gold, silver, and bronze medals are retained.
- **Marathon Secondary Tie-Breaker**:
  - Added `countBackToBackPairs(f)` calculating total back-to-back pairs across all days in the week.
  - Integrated into `sortHoldersByMetric`: when `badgeId === 'marathon'`, holders tied in `maxMarathonChain` are sorted by total back-to-back pairs (higher first) before total sections and name A-Z.
- **Verification**:
  - 174 Vitest tests passing across 14 test suites (`facultyBadgesTab.test.ts` expanded to 21 tests).
  - Production build clean across 234 static pages.

## Decision 14: Fall 2026 Faculty Updates & Reproducible Overrides Pipeline
- **Context & Problem**:
  - Following the registrar's initial routine PDF release, UIU published updated faculty section assignments on the official UCAM portal.
  - 9 course sections in BSCSE were updated: 8 reassignments to `TBA` (CSE 4509 E, CSE 4510 B, MATH 2205 A, F, H, I, K, L) and 1 reassignment to `Nazmul Hasan` (MATH 2205 D, formerly Sobur).
  - Two instructors (Rion and Sobur) had all their course assignments transferred to TBA / Nazmul Hasan, leaving them with 0 active teaching assignments.
- **Reproducible Overrides Architecture (`scripts/apply_overrides.py` & `data/overrides/`)**:
  - Avoided manual edits to generated JSON. Created `data/overrides/2026-fall-faculty-changes.json` containing exact matching criteria: `program`, `courseCode`, `section`, `expectedOldFaculty`, `newFaculty`, and `meetingsExpected` (days, start/end minutes, room).
  - `scripts/apply_overrides.py` runs standalone or as the last step of `scripts/extract.py`, ensuring re-extraction from raw PDF never loses portal overrides.
  - **Fail-Loudly Drift Protection**:
    - Aborts with non-zero exit code if a section is missing.
    - Aborts if `expectedOldFaculty` does not match the active section's faculty.
    - Aborts if `meetingsExpected` (day, time, room) does not match the active section.
  - Automatically rebuilds `courses.json` and `faculty.json`, recomputing sections and removing faculty who end up with zero sections (Rion and Sobur).
  - Reuses existing faculty ID `nazmul-hasan` for Nazmul Hasan; sets `faculty: ["TBA"]`, `facultyIds: []`, and `tentative: true` for TBA sections.
  - Logs all applied changes to `data/anomalies.md` and generates structured audit document `docs/data-changes.md`.
- **Consumer Safeguards & Stale User State**:
  - Pinned faculty hook (`usePinnedFaculty`) validates against `rawFaculty`, cleanly filtering out stale IDs (`rion`, `sobur`) without runtime errors.
  - Solver and Builder gracefully ignore stale preferred or avoided faculty IDs without crashing or skewing scores.
  - Saved routines: `validateSavedRoutine` checks live section faculty against saved snapshots; snapshots containing pre-update sections (e.g. CSE 4509 E with old faculty) trigger `hasChangedSections: true` and flag a `faculty_changed` diff informing the user that faculty has been reassigned to TBA.
  - Derived stats: `LandingContent.tsx` derives stats from live JSON (`LANDING_STATS`) rather than hardcoded 207/791 constants.
- **Data Version Note**:
  - Exported `DATA_UPDATED` ('2026-10-23') and `DATA_NOTE` ('Faculty assignments synced with the UCAM portal.') in `src/config/site.ts`.
  - Displayed in the landing page FAQ, site footer disclaimer, and Faculty Directory footer note.
- **How to add the next data update**:
  1. Add a new overrides JSON file under `data/overrides/` (e.g. `YYYY-term-faculty-changes.json`).
  2. Run `python3 scripts/apply_overrides.py --overrides data/overrides/<file>.json`.
  3. The script validates expected faculty and meetings, applies updates, rebuilds `courses.json` and `faculty.json`, prunes zero-section faculty, and logs changes.
  4. Run `npm test && npm run build` to verify tests catch any drift or regressions.
- **Verification**:
  - 16 new comprehensive tests in `src/lib/__tests__/dataOverrides.test.ts`.
  - All 196 tests passing across 16 test files.
  - Next.js production build (`npm run build`) generates 234 static pages with 0 errors.

## Decision 15: Fall 2026 Faculty & Schedule Sync from CSV (2026-10-24)
- **Context & Source of Truth**:
  - Synced faculty assignments against `faculty-timings.csv` (737 rows) published by the department.
  - Four diff groups categorized:
    - **Group a** (74 sections): Faculty reassigned, schedule days/times/rooms matched exactly. Overrides applied via `data/overrides/2026-fall-faculty-changes-oct24.json`.
    - **Group b** (7 sections): Room/timing differed between CSV and dataset (e.g. room shifts in CSE 3712 I, CSE 3422 K, CSE 4165 A/B/L/M, CSE 3812 D); kept untouched in dataset, reported only.
    - **Group c** (58 rows): In CSV but not in dataset (e.g. lab sections where registrar PDF used alternate suffix letters); reported only.
    - **Group d** (81 sections): In dataset but not in CSV; reported only.
- **Data Invariants**:
  - Total section count strictly maintained at 791 (zero sections added or deleted).
  - Post-update faculty count updated from 205 to 193 (12 zero-section faculty pruned).
  - TBA sections count updated to 95 (64 newly set to TBA).
  - Unaffected courses such as ECO 4101 and CSE 4883 remain 100% untouched.
  - Only Group a sections receive `updated: true`, `updatedOn: "2026-10-24"`, and `updatedNote: "Faculty updated in UCAM"`.
- **UI & Badge Design**:
  - Created shared component `src/components/UpdatedSectionBadge.tsx` with soft orange styling (`bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-semibold`) and tooltip "Faculty updated on 24 Oct 2026".
  - Integrated badge next to faculty names and section headers across Course Directory, Faculty Profile, Directory, Comparison, and Routine Builder.
- **Site Configuration**:
  - Updated `DATA_UPDATED` to `'2026-10-24'` in `src/config/site.ts`.
- **Verification**:
  - All 199 Vitest tests passing across 16 test files.
  - Next.js production build (`npm run build`) generates 220 static pages with 0 errors.

## Decision 16: Final Sync for Groups B, C, D & Notice Update (2026-10-24)
- Applied Group b (7 room updates) and Group c-d paired (50 section letter/schedule updates), keeping 791 sections strictly invariant and pruning 1 zero-section faculty (total 192 faculty, 96 TBA sections).
- Added `updatedKind` ("faculty" | "schedule" | "both" | "new") with contextual tooltips on `UpdatedSectionBadge` and mapped legacy section IDs in `data/section-id-aliases.json`.
- Updated landing notice banner with naturally sorted course lists (showing 10 inline with an accessible +N more toggle).




