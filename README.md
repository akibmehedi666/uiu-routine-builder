# 📅 UIU Routine Builder (Fall 2026)

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-FCC72B?style=for-the-badge&logo=vitest&logoColor=black)](https://vitest.dev/)
[![UIU](https://img.shields.io/badge/UIU-Fall_2026-F97316?style=for-the-badge)](https://www.uiu.ac.bd/)

A fast, client-side class routine builder and course directory built specifically for **United International University (UIU)** students (Department of CSE & Data Science). 

Generate 100% conflict-free routines in milliseconds, customize faculty preferences, manage manual FYDP timings, inspect sections with UCAM-inspired directory views, and export routines directly to UCAM text, Google Calendar, or PDF.

---

## ✨ Key Features

### ⚡ Bitmask Backtracking Solver in Web Worker
- **Non-blocking Architecture**: Runs an optimized 64-bit bitmask backtracking search algorithm inside a dedicated background Web Worker, keeping the user interface buttery-smooth at 60 FPS.
- **Instant Generation**: Explores thousands of section combinations in milliseconds to produce valid, clash-free routine options.
- **Multi-Criteria Scoring Engine**: Ranks generated routines by weighted criteria:
  - 👨‍🏫 **Faculty Preferences**: Prioritize preferred instructors and deprioritize avoided faculty.
  - ⏱️ **Minimize Free Gaps**: Reduce idle hours waiting on campus between classes.
  - 🗓️ **Compact Class Days**: Cluster classes to secure free days off (e.g., completely class-free Tuesdays).
  - 🌅 **Early / Late Class Balancing**: Avoid unwanted 8:30 AM starts or late evening departures.
  - ⚠️ **Tentative Section Deprioritization**: Avoid sections marked tentative in the department routine.

### 🔍 Smart Course Search & Directory (`/faculty` or `/courses`)
- **Fast Fuzzy & Token Search**: Search by course code (`CSE 4509`, `cse4509`), course title, faculty name, or common acronyms/aliases (`DSA`, `OOP`, `OS`, `DBMS`, `AI`, `SPL`, `FYDP`).
- **Relevance Cutoff & Deduplication**: Exact code queries show exact results; noise from partial faculty names is filtered out.
- **Theory & Lab Co-Requisite Pairing**: 1-click `+ Add Co-requisite Lab` button ensures theory and companion labs are added together seamlessly.
- **Faculty Cross-Reference Popover**: Click any instructor name to see all other courses and sections taught by them this trimester.
- **UCAM-Style Section Rows**: View instructors, avatar initials, meeting timings, room allocations, tentative indicators, and 5-day occupancy strips.

### 🎓 Final Year Design Project (FYDP) Manual Scheduling
- **Custom Schedule Input**: Since FYDP schedules vary per student, an interactive modal allows you to define your custom section label (e.g. `I`), days (`Sat`, `Sun`, `Tue`), and times.
- **Dynamic UIU Lab Slots**: Quick-fill standard UIU lab periods (e.g. 08:30–11:00 AM, 11:11 AM–01:40 PM, 02:00–04:30 PM) extracted dynamically from real routine data.
- **Clash Diagnostics**: The solver locks your manual FYDP slot and schedules all other courses around it. If another course has no clash-free sections, clear warnings (`"Hidden by FYDP"`) explain the conflict.

### 📋 Seamless UCAM & Calendar Exports
- **Copy UCAM**: Copies a clean plain-text summary formatted specifically for fast, error-free copy-pasting during high-stakes UCAM registration.
- **iCal Calendar Export (`.ics`)**: Download a complete 12-week recurring calendar file compatible with Google Calendar, Apple Calendar, and Microsoft Outlook.
- **Print / PDF Export**: Clean, high-contrast, distraction-free printable timetable layout (press `P` or click the printer icon).

### 🔗 State Synchronization & Shareable Links
- All selected courses, section locks, faculty preferences, and manual FYDP schedules are encoded into compact, shareable URLs (e.g. `mx=CSE4000A.I.Sat-Tue.1111-1340`). Share your routine link with friends or team members!
- Safely saved in `localStorage` so your routine work is never lost on refresh.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Static Exports, React 18)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode, full type-safety)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with a custom UIU-inspired warm light theme palette
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/) (Comprehensive unit and integration test coverage)
- **Solver**: Pure TypeScript bitmask bitwise overlap detection (`BigInt` day masks) executed within a Web Worker

---

## 📐 Layout & Page Max-Width

The desktop container max-width across all pages (`SiteNav`, `SiteFooter`, Builder `<main>`, Course Directory, Landing sections) is standardized via a single CSS variable:
- Change `--page-max-w` in `src/app/globals.css` to try another width (1360, 1400, 1440, 1480...). Default is `1440px`.

---

## 📊 Dataset Overview

Extracted from the official United International University Fall 2026 Class Schedule (Dept. of CSE & BSDS):
- **791 Sections** across theory, 2-day single theories, and 2.5-hour laboratory slots.
- **107 Courses** covering all undergraduate BSCSE and BSDS offerings.
- **207 Faculty Members** mapped with names, departmental initials, and section allocations.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.17.0 or higher recommended)
- `npm` (comes with Node.js)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/akibmehedi666/uiu-routine-builder.git
   cd uiu-routine-builder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Quality Assurance

Run the Vitest test suite covering the solver, bitmask math, search indexing, manual FYDP overlay, and directory filtering:

```bash
npm test
```

Run a production build check:
```bash
npm run build
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `/` | Focus the search input |
| `Escape` | Close modals, clear active search, or dismiss popovers |
| `←` / `→` | Navigate through ranked routine solutions |
| `P` | Open clean Print / Save PDF view |

---

## 📂 Project Structure

```
├── data/
│   ├── courses.json       # 107 courses with theory-lab pairing data
│   ├── sections.json      # 791 sections with days, times, and faculty
│   └── faculty.json       # 207 faculty members directory
├── docs/
│   ├── solver-design.md   # Architectural design of bitmask solver
│   └── user-guide.md      # Detailed student user guide
├── src/
│   ├── app/
│   │   ├── layout.tsx     # Root Next.js layout and font setup
│   │   ├── page.tsx       # Landing page with feature teasers
│   │   ├── builder/       # Routine Builder interface
│   │   └── faculty/       # Course Directory & Faculty Explorer
│   ├── components/
│   │   ├── Timetable.tsx           # Weekly timetable grid
│   │   ├── CourseSelector.tsx      # Course chips & selection drawer
│   │   ├── ManualScheduleModal.tsx # FYDP manual entry modal
│   │   └── FacultyExplorer.tsx     # Slide-over faculty section comparison
│   ├── lib/
│   │   ├── courseDirectory.ts      # Directory indexing and sorting
│   │   ├── courseSearch.ts         # Token search, aliases, Levenshtein
│   │   └── fixedCourses.ts         # Manual schedule configuration & bitmasks
│   ├── solver/
│   │   ├── bitmask.ts     # BigInt day/interval bitmask operations
│   │   ├── scorer.ts      # Multi-criteria scoring algorithm
│   │   └── index.ts       # Backtracking solver engine
│   └── workers/
│       └── solver.worker.ts # Web Worker background execution thread
├── DECISIONS.md           # Engineering decision log across all phases
└── vitest.config.ts       # Test configuration
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/akibmehedi666/uiu-routine-builder/issues).

---

## 📄 License

This project is open-source and created to help United International University students craft their trimester routines with ease.
