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

## Decision 2: Solver Architecture (Phase 2)
- Pure TypeScript implementation with zero external heavy solver libraries to ensure fast client-side execution in a Web Worker.
- Bitmask representation: 5 days $\times$ 288 5-minute cells per day for $O(1)$ overlap detection.
- Minimum Remaining Values (MRV) heuristic with Branch and Bound and top-K heap.
- Hard limits: 200,000 node iterations or 2-second timeout to maintain responsive 60fps UI.
