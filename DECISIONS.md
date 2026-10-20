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
