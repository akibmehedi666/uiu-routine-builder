# Mobile Layout Fixes & Testing Checklist

## Summary of Changes

This update addresses mobile layout bugs on phones (< 768px, ~412px Android Brave/Chrome, iOS Safari, and in-app browsers):

### 1. Files Modified
- [`src/components/SiteNav.tsx`](file:///c:/Users/USER/Desktop/section%20selection/src/components/SiteNav.tsx):
  - Made the mobile top bar SOLID background (`bg-surface`), removing all `backdrop-blur` smudging on phones.
  - 52px single-row height (`h-[52px] md:h-14`) with 32px UIU logo, truncated single-line title, and icon-only buttons.
- [`src/components/CourseSelector.tsx`](file:///c:/Users/USER/Desktop/section%20selection/src/components/CourseSelector.tsx):
  - **No Width Overflow**: Fixed all `<select>` dropdowns (`Lock:`, FYDP section picker, Earliest/Latest) and flex/grid children with `w-full max-w-full min-w-0 truncate`. Selects cannot expand beyond their parent card to their longest `<option>` text.
  - **Clean Tab Content Isolation**:
    - **Courses tab**: Credits summary, search (opens full-screen sheet), selected course cards with lock section picker and faculty accordion, and footer.
    - **Preferences tab**: ONLY "Filters & Scoring Weights" (day off, earliest/latest, max gap, ranking weights) and "Blocked time slots". Zero course cards or tip banners.
    - Switching tabs keeps all state and scroll position.
  - **Collapsed-by-Default Faculty Preference Accordion**:
    - Each course card's faculty preferences are collapsed by default on mobile.
    - Header shows one summary line: `"Faculty Preference · N faculty · X preferred, Y avoided"`.
    - Accordion allows only one course's faculty list open at a time.
    - Courses with $> 8$ faculty display an inline faculty filter input.
    - Faculty row has Prefer/Avoid buttons $\ge$ 36px tall with 8px gap that wrap below the name if the row is narrow.
  - **Consistent Form Control Sizing**:
    - Earliest Start & Latest End selects sit in a 2-column grid using `minmax(0, 1fr)`.
    - Consistent 44px (`h-11`) touch heights for selects and inputs, matching label typography (13px label, 12px helper).
- [`src/app/builder/page.tsx`](file:///c:/Users/USER/Desktop/section%20selection/src/app/builder/page.tsx):
  - Enforced `w-full max-w-full min-w-0 overflow-x-clip` across the page hierarchy.
  - Added bottom padding `pb-[calc(56px+env(safe-area-inset-bottom,0px)+24px)]` so controls, sliders, and footers scroll completely above the bottom tab bar.
  - Repositioned toasts above the bottom tab bar (+ 24px).
  - Maintained 56px solid white bottom tab bar with results badge.
- [`src/app/globals.css`](file:///c:/Users/USER/Desktop/section%20selection/src/app/globals.css) & [`src/app/layout.tsx`](file:///c:/Users/USER/Desktop/section%20selection/src/app/layout.tsx):
  - Enforced `overflow-x: clip`, `max-width: 100vw`, and `width: 100%` on `html` and `body`.
  - Added global `select { max-width: 100%; text-overflow: ellipsis; }`.
- [`src/lib/__tests__/mobileLayoutSafety.test.ts`](file:///c:/Users/USER/Desktop/section%20selection/src/lib/__tests__/mobileLayoutSafety.test.ts):
  - Static analysis safety net tests verifying no backdrop blur, select constraints, grid minmax, tab isolation, faculty accordion, and safe-area padding.

---

## Real Phone Testing Checklist (~412px wide)

### A. Viewport & Layout Width (Problem 1)
- [ ] Content fills 100% of the screen width with no blank white gutter on the right.
- [ ] Top bar and bottom tab bar span exactly 100% of the screen width.
- [ ] "Lock: Any Section (8 available)" select stays inside the card boundary and does not stick out past the screen edge.
- [ ] Page cannot be horizontally scrolled or swiped sideways.

### B. Tab Content Isolation (Problem 2)
- [ ] On the **Courses** tab:
  - [ ] Search field is visible.
  - [ ] Selected course cards are visible, each with its Lock dropdown and Faculty accordion.
  - [ ] "Filters & Scoring Weights" is NOT visible on this tab.
- [ ] On the **Preferences** tab:
  - [ ] "Filters & Scoring Weights" (Day Off, Earliest/Latest, Max Gap, Ranking Weights) is directly visible.
  - [ ] "Blocked Time Slots" section is visible.
  - [ ] NO course cards or tip banners are shown.
- [ ] On the **Results** tab:
  - [ ] Timetable / routine results are shown without course cards or filters.
- [ ] Switching between tabs preserves selected courses, chosen sections, and preferences without resetting.

### C. Faculty Preferences Accordion (Problem 3)
- [ ] On mobile course cards, "Faculty Preference" is collapsed by default.
- [ ] Shows summary line (e.g. `Faculty Preference · 5 faculty`).
- [ ] Tapping to expand opens the faculty list; expanding a second course's list automatically collapses the first.
- [ ] In courses with $> 8$ faculty, a filter search box appears at the top of the list.
- [ ] Prefer/Avoid buttons are at least 36px tall with comfortable 8px spacing; wrap below faculty name cleanly if narrow.

### D. Bottom Navigation & Spacing (Problem 4)
- [ ] Content at the bottom of the page (Earliest/Latest, sliders, footer) can be scrolled completely clear of the 56px bottom tab bar.
- [ ] Bottom tab bar has solid white background and safe-area padding for the home indicator bar.
- [ ] Notification toasts pop up above the bottom tab bar.

### E. Header (Problem 5)
- [ ] Sticky top bar is solid white/soft background without backdrop-blur artifacts.
- [ ] Title "Routine Builder" stays on one line and truncates with ellipsis if needed.
- [ ] Logo is 32px; Saved, Help, and Menu buttons have touch targets $\ge$ 44px.

### F. Form Controls (Problem 6)
- [ ] "Earliest Start" and "Latest End" selects sit side-by-side in equal columns without squishing.
- [ ] Inputs and selects are 44px tall with matching border-radius and consistent typography.

### G. Desktop Regression Check ($\ge$ 1024px)
- [ ] Desktop sidebar retains all controls (course selection, open faculty lists, expandable filters) in the left panel.
- [ ] Desktop layout, sticky timetable, and routine results remain identical.
