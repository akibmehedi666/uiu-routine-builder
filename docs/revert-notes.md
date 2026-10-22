# Revert Notes: Mobile Layout Task Reversal

## 1. Safety & Branch Status
- Current HEAD before revert: `5054bb481a983e3aff58e9418a02c54a6529de56`
- Backup branch created: `backup-before-revert-HEAD` (pointing at `5054bb4`)
- Target pre-task baseline commit: `fd1c8ebb4274cfbb9e964bcbd7eff943378a9b73` ("fix(mobile): improve mobile layout, full-screen search sheet, and safe area spacing")

---

## 2. Commit & File Audit

### Reverted Commit
- **Commit hash**: `5054bb481a983e3aff58e9418a02c54a6529de56`
- **Commit message**: `fix(mobile): resolve viewport overflow, isolate tab content, and collapse faculty accordion`
- **Reason for revert**: The task introduced global and container-level CSS modifications (`overflow-x: clip`, `max-width: 100vw`, `w-full max-w-full min-w-0` across `html`, `body`, main page wrapper, and `CourseSelector`) that altered desktop layout calculations and caused the desktop view (>= 1024px) to render too wide.

### Files Touched by the Reverted Task
The following 7 files were modified in `5054bb4` and have been reverted to their exact state at `fd1c8eb`:
1. `src/app/globals.css`: Reverted `overflow-x: clip; max-width: 100vw; width: 100%` on `html, body` and global `select` styling.
2. `src/app/layout.tsx`: Reverted `overflow-x-clip` on `<html>` and `<body>`.
3. `src/app/builder/page.tsx`: Reverted `overflow-x-clip`, `min-w-0`, and bottom padding overrides.
4. `src/components/CourseSelector.tsx`: Reverted `w-full max-w-full min-w-0` additions on `<aside>` and flex children; reverted tab isolation logic (`hidden lg:block`); reverted single-accordion faculty preference and search input.
5. `src/components/SiteNav.tsx`: Reverted solid `bg-surface` header back to `backdrop-blur-md bg-surface/90`.
6. `src/lib/__tests__/mobileLayoutSafety.test.ts`: Reverted static assertions that expected the reverted CSS rules.
7. `docs/mobile-notes.md`: Reverted checklist and notes corresponding to the reverted task.

### Files Kept Intact from Earlier Tasks
All prior features and fixes are preserved intact at `fd1c8eb`:
- Compact footer and creator credit (`src/components/SiteFooter.tsx`)
- Course removal button, undo toast, and clear-all functionality (`src/components/CourseSelector.tsx`)
- "My Saved Routines" feature with client-side snapshots and drawer (`src/components/SavedRoutinesDrawer.tsx`, etc.)
- Fixed FYDP section selector and config (`src/config/fixedCourses.ts`, `src/lib/fixedCourses.ts`)
- Mobile full-screen search sheet and first mobile pass (`src/components/CourseSelector.tsx`)

---

## 3. Code-Level Diff Verification Against Baseline (`fd1c8eb`)

Running `git diff fd1c8eb --` across the reverted files produces:
```
(empty output - 100% byte-for-byte match)
```

---

## 4. Desktop Layout Guarantee (>= 1024px)

Desktop styling is verified identical to the pre-task baseline (`fd1c8eb`):

| Container / Component | Pre-Task Baseline (`fd1c8eb`) | Reverted State (Current) | Desktop Behavior Verified |
| :--- | :--- | :--- | :--- |
| **`html, body`** | Normal box sizing, standard overflow behavior | Normal box sizing, standard overflow behavior | No `100vw` or `overflow-x: clip` altering desktop scrollbars |
| **App Container (`src/app/builder/page.tsx`)** | `max-w-[1600px] mx-auto px-4 lg:px-6` | `max-w-[1600px] mx-auto px-4 lg:px-6` | Fixed max-width on wide screens, centered container |
| **Left Panel Width** | `w-full lg:w-[420px] lg:flex-shrink-0` | `w-full lg:w-[420px] lg:flex-shrink-0` | Left sidebar fixed at 420px width on `lg:` viewports |
| **App Layout Grid** | `lg:grid-cols-[420px_1fr]` | `lg:grid-cols-[420px_1fr]` | 2-column desktop split layout intact |
| **Top Nav Bar (`SiteNav.tsx`)** | `sticky top-0 z-40 w-full border-b border-border bg-surface/90 backdrop-blur-md` | `sticky top-0 z-40 w-full border-b border-border bg-surface/90 backdrop-blur-md` | Translucent glassmorphism restored |
| **Faculty Preferences** | Native `<details className="group">` | Native `<details className="group">` | Desktop accordion operates natively without JS state coupling |

---

## 5. Verification Results
- **Unit Tests**: `npm test` -> 8 test files passed (74 tests passed).
- **Production Build**: `npm run build` -> Next.js 14.2.35 compiled successfully, 7/7 static pages generated with 0 errors.
