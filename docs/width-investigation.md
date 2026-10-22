# Container Width Investigation Report: Builder vs Course Directory

## Executive Summary
1. **Were they ever the same width?**
   **No, they were never equal.** When the Course Directory page (`/faculty`) was first introduced in commit `9ec6d84` (2026-10-20), it was built with `max-w-[1400px]`, whereas the Routine Builder (`/builder`) had already been set to `max-w-[1600px]` in commit `fe7d7fe` (2026-10-20). They have differed by 200px since the directory page was born.

2. **Why did the Builder stretch edge-to-edge (~1870px on a 1920px monitor)?**
   In commit `5054bb4` ("fix(mobile): resolve viewport overflow..."), the class `max-w-full` was added to `<main className="... max-w-[1600px] w-full max-w-full ...">`. In Tailwind CSS, `max-w-full` (`max-width: 100%`) overrode `max-w-[1600px]`, causing the container on wide displays to expand to 100% width (`1920px - 48px padding = 1872px`).

3. **Did the revert restore the Builder container?**
   **Yes, 100% byte-for-byte.** `git diff fd1c8eb HEAD -- src/app/builder/page.tsx` produces empty output. The Builder is back to its standard `max-w-[1600px]`.

---

## 1. Current Container Specifications (HEAD `4606b4e`)

| Page / Component | File & Line | Outer Max-Width | Horizontal Padding | Desktop Layout Grid / Style | Inner Content Width @ 1920px |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Builder Page** | `src/app/builder/page.tsx` (L1116) | `max-w-[1600px]` (`1600px`) | `px-3 sm:px-6` (24px at $\ge$640px) | `grid-cols-1 lg:grid-cols-[minmax(340px,400px)_1fr] gap-5` | **1552px** |
| **Course Directory** | `src/app/faculty/page.tsx` (L554, L583, L705) | `max-w-[1400px]` (`1400px`) | `px-4 sm:px-6` (24px at $\ge$640px) | `md:grid-cols-[300px_1fr] lg:grid-cols-[minmax(340px,400px)_1fr] gap-6` | **1352px** (~1350px) |
| **Top Nav (`SiteNav`)** | `src/components/SiteNav.tsx` (L38) | `max-w-[1600px]` (`1600px`) | `px-3 sm:px-6` (24px at $\ge$640px) | Flex row (`justify-between`) | **1552px** |
| **Footer (`SiteFooter`)** | `src/components/SiteFooter.tsx` (L21) | `max-w-[1400px]` (`1400px`) | `px-4 sm:px-6` (24px at $\ge$640px) | Flex row / Column stacked | **1352px** |

*Note: Neither `tailwind.config.js` nor `globals.css` specifies a global `--page-max-width` CSS variable.*

---

## 2. Chronological Timeline of Container Changes

| Commit | Date (ISO) | Commit Message | Page Affected | Builder Container (Before $\to$ After) | Directory Container (Before $\to$ After) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `94b5072` | 2026-10-20 02:44 | Phases 4-8: Complete UI, timetable... | Builder (then at `/`) | Initial: `max-w-7xl` (1280px) | *(Page did not exist)* |
| `fe7d7fe` | 2026-10-20 07:11 | Phase 9A: Implement UIU light theme design tokens... | Builder (then at `/`) | `max-w-7xl` $\to$ `max-w-[1600px]` | *(Page did not exist)* |
| `301ba19` | 2026-10-20 08:35 | Phase 9C: Add landing page and route builder to /builder | Builder (`/builder`) | Preserved `max-w-[1600px]` in new `src/app/builder/page.tsx` | *(Page did not exist)* |
| `16745dc` | 2026-10-20 10:04 | Phase 9E: Fix excess space in builder UI with 2-column grid... | Builder (`/builder`) | Flex row $\to$ `grid-cols-[minmax(340px,400px)_1fr]`, kept `max-w-[1600px]` | *(Page did not exist)* |
| `32f798d` | 2026-10-20 12:48 | Phase 10A: Shared SiteNav component with Faculty navigation | Navigation bar | Created `SiteNav` with `max-w-[1600px]` | *(Page did not exist)* |
| `9ec6d84` | 2026-10-20 13:06 | Phase 10B: Dedicated faculty directory page and indexing helpers | **Course Directory (`/faculty`)** | Unchanged: `max-w-[1600px]` | **Created with `max-w-[1400px]`** |
| `ae140d9` | 2026-10-21 00:05 | Phase 11C & 11D: UCAM-inspired section rows... | Course Directory | Unchanged: `max-w-[1600px]` | Added sticky toolbar at `max-w-[1400px]` |
| `fff12aa` | 2026-10-21 03:41 | feat: add creator credit footer on every page... | Shared Footer | Unchanged: `max-w-[1600px]` | Added `SiteFooter` at `max-w-[1400px]` |
| `fd1c8eb` | 2026-10-22 10:12 | fix(mobile): improve mobile layout... | Builder (`/builder`) | `px-4 sm:px-6` $\to$ `px-3 sm:px-6`, kept `max-w-[1600px]` | Unchanged: `max-w-[1400px]` |
| `5054bb4` | 2026-10-22 10:38 | fix(mobile): resolve viewport overflow, isolate tab content... | Builder (`/builder`) & Globals | Added `max-w-full` to `<main>` (`1600px` $\to$ `100%` width / 1872px on 1080p); added `100vw` / `overflow-x: clip` | Unchanged: `max-w-[1400px]` |
| `4606b4e` | 2026-10-22 12:37 | Revert last mobile layout task (desktop was too wide) | Builder (`/builder`) & Globals | **Reverted `max-w-full` $\to$ restored exact `max-w-[1600px]`** | Unchanged: `max-w-[1400px]` |

---

## 3. Analysis & Answers to Specific Questions

### Were the two widths ever equal?
**No.** The Course Directory page was created in `9ec6d84` (Phase 10B) with `max-w-[1400px]`, while the Builder had already transitioned from `max-w-7xl` (1280px) to `max-w-[1600px]` in `fe7d7fe` (Phase 9A). There was no point in the repository's history where both were set to the same `max-width`.

### Why did the Builder look edge-to-edge (~1870px)?
In commit `5054bb4`, in an attempt to prevent horizontal overflow on mobile screens (<768px), the author appended `max-w-full` directly onto `<main>` in `src/app/builder/page.tsx`:
```tsx
<main className="flex-1 max-w-[1600px] w-full max-w-full mx-auto ...">
```
Because `max-w-full` evaluates to `max-width: 100%`, it overrode `max-width: 1600px` on desktop displays. On a 1920px screen with `sm:px-6` (24px left and right), the content stretched to `1920 - 48 = 1872px`.

### Verification of the Revert Commit (`4606b4e`)
Comparing the pre-task baseline (`fd1c8eb`) against `HEAD` (`4606b4e`) across all container files:
- `git diff fd1c8eb HEAD -- src/app/builder/page.tsx`: **Empty**
- `git diff fd1c8eb HEAD -- src/app/globals.css`: **Empty**
- `git diff fd1c8eb HEAD -- src/app/layout.tsx`: **Empty**
- `git diff fd1c8eb HEAD -- src/components/CourseSelector.tsx`: **Empty**
- `git diff fd1c8eb HEAD -- src/components/SiteNav.tsx`: **Empty**

The revert was 100% complete and cleanly removed `max-w-full`. The Builder container is now back to its historical desktop max-width of `1600px`.

---

## 4. Root Cause & Recommendation

### Root Cause
1. **Historical Mismatch**: In Phase 9A (`fe7d7fe`), Builder was widened to `1600px` to fit a multi-column timetable and sidebar. In Phase 10B (`9ec6d84`), Course Directory was built with `1400px`.
2. **Edge-to-Edge Glitch**: In commit `5054bb4`, the addition of `max-w-full` removed the `1600px` desktop cap entirely, stretching Builder to 1872px.

### Smallest Safe Fix (If user wants both pages identical at 1400px)
To align both pages to the centered ~1350px content box:
1. In `src/app/builder/page.tsx` (line 1116):
   Change `max-w-[1600px]` to `max-w-[1400px] px-4 sm:px-6`.
2. In `src/components/SiteNav.tsx` (line 38):
   Change `max-w-[1600px]` to `max-w-[1400px] px-4 sm:px-6`.

*(Note: Per task instructions, no implementation edits have been made.)*
