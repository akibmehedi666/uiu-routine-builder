# Mobile Layout Fixes & Testing Checklist

## Summary of Changes

This update addresses mobile layout issues on phones (< 768px), specifically tailored for iOS Safari, Android Chrome, and in-app webviews (Instagram, Facebook, Messenger) that have dynamic address bars and home indicator notches.

### 1. Files Modified
- [`src/components/SiteNav.tsx`](file:///c:/Users/USER/Desktop/section%20selection/src/components/SiteNav.tsx):
  - Mobile top bar reduced to a single row, 52px tall (`h-[52px] md:h-14`).
  - Logo scaled to 32px (`w-8 h-8 md:w-9 md:h-9`).
  - Title "Routine Builder" stays on one line and truncates gracefully with ellipsis.
  - "Fall 2026" badge hidden on phones (`hidden sm:inline-block`).
  - Icon-only buttons for Saved (Bookmark icon + count badge), Help (`HelpCircle`), and Hamburger Menu (`Menu`/`X`), all with $\ge$ 44px tap targets.
- [`src/components/CourseSelector.tsx`](file:///c:/Users/USER/Desktop/section%20selection/src/components/CourseSelector.tsx):
  - On mobile, tapping the search field opens a dedicated full-screen search sheet (`fixed inset-0 z-50 bg-white h-[100dvh]`).
  - Sticky header with 16px search input (prevents iOS Safari auto-zoom), "Done" button, program filter pills (`ALL`, `BSCSE`, `BSDS`), and a live `N added` counter badge.
  - Single scroll container with 44px+ tap targets. Tapping courses adds/removes immediately with visual feedback (checkmark + "Added" badge) while keeping the sheet open for multi-selection.
  - Sheet closes via "Done", Escape, or device/browser hardware back button (tracked via `window.history.pushState` and `popstate` event listeners). Body scroll is locked (`overflow: hidden`) while open.
  - Mobile selected courses list now flows naturally in the page (`overflow-visible lg:overflow-y-auto`) to eliminate nested scroll trapping.
  - Compact empty state card when 0 courses are selected.
  - Credit overload/underload warning rendered as a compact single row with tap-to-expand explanation.
  - Desktop retains the existing absolute autocomplete dropdown without changes.
- [`src/app/builder/page.tsx`](file:///c:/Users/USER/Desktop/section%20selection/src/app/builder/page.tsx):
  - Completely removed the redundant floating orange bar (`fixed bottom-16` "View N Generated Routines").
  - Clean 56px sticky bottom tab bar (`h-14`) with solid white background, top border, and `env(safe-area-inset-bottom, 0px)` padding.
  - Results tab displays a count badge when routines are generated.
  - Main container has bottom padding `pb-[calc(56px+env(safe-area-inset-bottom,0px)+16px)]` so content and toasts never get obscured by the tab bar.
  - Repositioned saved routine notification toast above the tab bar.
  - Converted root layout to `min-h-[100dvh]`.
- [`src/app/layout.tsx`](file:///c:/Users/USER/Desktop/section%20selection/src/app/layout.tsx):
  - Converted body container to `min-h-[100dvh]`.
- [`src/lib/__tests__/mobileLayoutSafety.test.ts`](file:///c:/Users/USER/Desktop/section%20selection/src/lib/__tests__/mobileLayoutSafety.test.ts):
  - Automated static analysis safety net tests verifying header height, full-screen search sheet, history state, no floating bottom-16 button, and safe-area padding.

---

## Real Phone Testing Checklist

### A. Header (< 768px)
- [ ] Header is exactly 52px tall and stays on a single line.
- [ ] UIU logo is 32px $\times$ 32px.
- [ ] "Routine Builder" does not wrap to a second line.
- [ ] "Fall 2026" badge is hidden on phone screens.
- [ ] Right side displays icon-only Saved button (with badge if saved routines $> 0$), Help button, and Menu button.
- [ ] All icon buttons have at least 44px $\times$ 44px touch targets.

### B. Search & Sheet Workflow (< 768px)
- [ ] Tapping the search trigger opens the full-screen sheet immediately.
- [ ] Page underneath cannot be scrolled while search sheet is open.
- [ ] Typing in search does NOT trigger iOS Safari auto-zoom (input font size is 16px).
- [ ] Tapping a course adds it immediately, displays a green "Added" checkmark, and keeps the sheet open.
- [ ] Tapping an added course removes it and updates the counter badge.
- [ ] Tapping the device hardware back button (Android back or iOS swipe back) closes the search sheet without navigating away from the page.
- [ ] Tapping the "Done" button closes the search sheet.

### C. Selected Courses & Page Flow (< 768px)
- [ ] With 0 courses, a clean "Get started with your routine" card is shown.
- [ ] When courses are added, the course list scrolls naturally with the entire page; no nested "scroll trapped" box.
- [ ] If credits are $< 9$ or $> 18$, the credit banner is a compact single line; tapping it expands the description.

### D. Bottom Navigation & Safe Areas (< 768px)
- [ ] No floating orange bar is shown.
- [ ] Bottom tab bar is solid white with Courses, Preferences, and Results tabs.
- [ ] Results tab shows routine count badge when schedules are solved.
- [ ] Content at the bottom of the page (and toasts) is fully visible above the bottom tab bar and home indicator notch.

### E. Desktop Regression Check ($\ge$ 1024px)
- [ ] Header shows full navigation links, term badge, and standard button labels.
- [ ] CourseSelector shows the classic inline autocomplete dropdown.
- [ ] Selected courses box maintains its sticky, scrollable panel.
- [ ] Timetable and Results grid display identically to previous versions.
