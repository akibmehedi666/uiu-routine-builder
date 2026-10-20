# UIU Routine Builder: User Guide

Welcome to the **UIU Routine Builder** for the United International University (UIU) Fall 2026 trimester (Dept. of CSE & BSDS).

---

## Navigation & Architecture

- **Landing Page (`/`)**: Overview of features, "How It Works", live dataset statistics (791 sections, 107 courses, 207 faculty), sample schedule mock, and FAQ.
- **Routine Builder (`/builder`)**: The full workspace featuring real-time Web Worker solver, course search, faculty preferences, interactive weekly timetable, and section comparison.
- **Direct Query Links**: Any links with search parameters (e.g. `/?courses=CSE+1111`) automatically forward to `/builder` preserving all parameters.

---

## Getting Started in the Builder

1. **Searching & Adding Courses**:
   - Use the search bar in the left sidebar or the Course-wise Faculty Explorer.
   - Type course codes (`CSE 2215`, `1111`) or aliases (`DSA`, `OOP`, `AI`).
   - Click the course or the **"Sections"** button to open the Faculty Explorer.
   - When you select a theory course that requires a laboratory, an emerald button `+ Add Co-requisite Lab` appears automatically.

2. **Course-Wise Faculty Explorer**:
   - Click any course row in search or in your selected list to open the slide-over explorer.
   - View sections grouped by faculty member, meeting days, start–end times, room numbers, tentative status, and 5-day schedule distribution strips.
   - Filter sections by faculty name, day chips (Sat–Wed), or time of day (Morning, Midday, Afternoon).
   - Toggle **"Prefer"** or **"Avoid"** directly on any faculty card—synced live with solver weights.
   - Hover over any section to see a dashed preview block on the timetable. Real-time clash detection alerts you if a section conflicts with your currently viewed routine (`Clashes with CSE 2213`).
   - Click **"Copy faculty list"** to copy all faculty and section times to your clipboard.

3. **Setting Filters & Scoring Weights**:
   - **Faculty Preferences**: Set instructors you want to prioritize or avoid.
   - **Lock Section**: Lock specific sections if you need to stay with friends or a project partner.
   - **Day-Off Filter**: Enforce 0-class days (e.g., free Tuesdays).
   - **Time Restrictions & Max Gaps**: Restrict class hours or cap idle gaps.
   - **Weights Sliders**: Custom sliders allow you to tune priority percentages.

4. **Navigating Ranked Routines**:
   - Use the `◀ Previous` and `Next ▶` buttons (or `←` / `→` arrow keys) to cycle through the top 50 ranked conflict-free routines.
   - The score pill (e.g., `98/100`) reveals the weighted breakdown on hover.
   - Use the **Schedule Comparison & Diff** table to see exactly which sections change between Rank 1, 2, and 3.

---

## Exporting for UIU UCAM Registration

When your registration slot opens on UCAM:
1. Click the orange **"Copy UCAM"** button.
2. A neatly formatted plain-text summary is copied to your clipboard containing course codes, section letters, rooms, and meeting times.
3. Paste or keep it open beside your UCAM portal for seamless 1-minute course entry!

### Calendar Export (.ics)
- Click the calendar icon to download a standard `.ics` file.
- Import it into **Google Calendar**, **Apple Calendar**, or **Outlook** to have your recurring weekly schedule mapped across the entire 12-week trimester.

### Print / Save PDF
- Click the printer icon (or press `P`) to open a clean print view formatted specifically for physical printing or saving as a PDF without website clutter.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `←` (Left Arrow) | Previous ranked routine |
| `→` (Right Arrow) | Next ranked routine |
| `/` | Focus course search box |
| `Enter` | Open faculty explorer for course |
| `f` | Save current routine to Favorites |
| `p` | Print or Save PDF |
| `Esc` | Close modals or Faculty Explorer drawer |

---

## Shareable Routines
All selected courses, locked sections, preferred instructors, and day-off filters are automatically synced into the browser URL. Simply copy the link from your browser's address bar and send it to your friends or study group!
