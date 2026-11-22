# UIU Routine Builder (Fall 2026)
### High-Performance Bitmask Backtracking Schedule Solver

> **A fast, client-side class schedule solver and course directory engineered with a 64-bit bitmask backtracking Web Worker for United International University students.**

[![Next.js](https://img.shields.io/badge/Next.js-14.2.23-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.16-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-FCC72B?style=for-the-badge&logo=vitest&logoColor=black)](https://vitest.dev/)
[![UIU](https://img.shields.io/badge/UIU-Department_of_CSE-F97316?style=for-the-badge)](https://www.uiu.ac.bd/)

---

## 📌 Problem It Solves

Every academic trimester, university students must assemble a valid semester timetable from hundreds of course sections. Balancing personal faculty preferences, minimizing awkward multi-hour gaps waiting on campus, coordinating mandatory companion lab co-requisites, and avoiding early 8:30 AM starts while preventing time clashes is an exhausting combinatorial puzzle. During high-stakes course pre-registration, errors frequently lead to missed sections or conflicting enrollments.

Existing web planners often execute recursive constraint satisfaction searches directly on the browser's main JavaScript thread, locking up the interface, freezing input controls, and providing no guidance on conflict diagnostics when a desired combination is unachievable.

**UIU Routine Builder** solves this by running an optimized **64-bit bitmask backtracking search algorithm** inside a dedicated background **Web Worker**. The solver tests thousands of course-section permutations in milliseconds without dropping a single frame from the UI (steady 60 FPS), and ranks valid timetables using a multi-criteria weighted scoring engine.

---

## ✨ Features

- **64-Bit Bitmask Backtracking Solver in Web Worker:**
  - *Non-Blocking Architecture:* Executes constraint satisfaction inside a dedicated HTML5 Web Worker, keeping the interface fluid at 60 FPS during heavy combinatorial searches.
  - *Bitwise Conflict Checking:* Encodes class periods and days into compact 64-bit integers; overlapping section detection completes in a single CPU instruction (`mask_A & mask_B === 0`).
  - *Instant Generation:* Explores thousands of section combinations in milliseconds to produce clash-free schedule options.
- **Multi-Criteria Weighted Scoring Engine:**
  - 👨‍🏫 **Faculty Preferences:** Prioritizes preferred instructors and down-ranks avoided faculty.
  - ⏱️ **Minimize Free Gaps:** Quantifies and minimizes idle waiting hours between classes.
  - 🗓️ **Compact Class Days:** Clusters lectures to secure completely free days off (e.g., class-free Tuesdays).
  - 🌅 **Time Balancing:** Balances early 08:30 AM starts against late evening departures.
  - ⚠️ **Tentative Deprioritization:** Identifies and deprioritizes sections marked tentative in department schedules.
- **Smart Course Search & Directory (`/faculty` & `/courses`):**
  - Instant search across course codes (`CSE 4509`, `cse4509`), course titles, faculty initials, and common abbreviations (`DSA`, `OOP`, `OS`, `DBMS`, `AI`, `SPL`, `FYDP`).
  - 1-click **Add Co-requisite Lab** button linking companion theory and laboratory sections seamlessly.
  - Faculty cross-reference drawers showing all courses and sections assigned to an instructor for the trimester.
- **Final Year Design Project (FYDP) Slot Locking:**
  - Interactive modal to input custom FYDP section labels, days (`Sat`, `Sun`, `Tue`), and times.
  - Dynamic slot suggestions matching official UIU laboratory periods (e.g., 08:30–11:00 AM, 11:11 AM–01:40 PM, 02:00–04:30 PM).
  - Clash diagnostics that lock the FYDP slot and automatically route all other course choices around it.
- **1-Click UCAM & Calendar Exports:**
  - *Copy UCAM:* Copies a clean plain-text summary formatted for rapid copy-pasting during official university registration.
  - *iCal Export (`.ics`):* Generates a 12-week recurring calendar file compatible with Google Calendar, Apple Calendar, and Microsoft Outlook.
  - *Printable PDF Layout:* High-contrast, clean timetable layout formatted for printing (press `P` or click print icon).

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14.2.23 (App Router)
- **Library:** React 18.3.1
- **Language:** TypeScript 5.7.2 (Strict Mode)
- **Concurrency & Multithreading:** HTML5 Dedicated Web Workers
- **Styling:** Tailwind CSS 3.4.16, PostCSS, Autoprefixer
- **Testing & Quality Assurance:** Vitest 2.1.8 (unit test suite)
- **Data Validation & UI Components:** Zod 4, Lucide React, Canvas Confetti

---

## 📸 Screenshots

> _Visual demonstration of the routine builder solver, interactive weekly timetable, and course search directory._

| Bitmask Solver & Clash-Free Routine Selector | Interactive Weekly Timetable & Occupancy Strips |
| :---: | :---: |
| ![Routine Solver Placeholder](docs/screenshots/solver_placeholder.png)<br>_Placeholder: Web Worker solver interface with scoring ranking controls_ | ![Weekly Timetable Placeholder](docs/screenshots/timetable_placeholder.png)<br>_Placeholder: Visual 5-day class schedule with faculty color badges_ |

| Course Search Directory & Faculty Popover | FYDP Slot Locking Modal & Diagnostics |
| :---: | :---: |
| ![Course Directory Placeholder](docs/screenshots/directory_placeholder.png)<br>_Placeholder: Searchable course catalog with co-requisite lab pairing_ | ![FYDP Modal Placeholder](docs/screenshots/fydp_modal_placeholder.png)<br>_Placeholder: Final Year Design Project custom timing modal_ |

---

## 🚀 How to Run

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- npm, yarn, or pnpm

### 2. Clone Repository & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/akibmehedi666/uiu-routine-builder.git
cd uiu-routine-builder

# Install dependencies
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Open your browser and navigate to: **`http://localhost:3000`**

### 4. Run Test Suite

```bash
# Run unit tests with Vitest
npm test

# Run tests in watch mode
npm run test:watch
```

### 5. Build for Production

```bash
npm run build
npm run start
```

---

## 📂 Project Structure

```
uiu-routine-builder/
├── app/
│   ├── layout.tsx                 # Root layout with analytics and font setup
│   ├── page.tsx                   # Main routine builder page with solver UI
│   ├── courses/                   # Course directory and section views
│   └── faculty/                   # Faculty directory and assignment schedules
├── components/                    # Timetable grid, search bar, FYDP modal, and filters
├── data/
│   ├── courses.json               # Department of CSE & Data Science course catalog
│   ├── faculty.json               # Faculty directories and contact aliases
│   └── overrides/                 # Trimester routine change overrides
├── lib/
│   ├── bitmask.ts                 # 64-bit integer bitmask encoder and collision logic
│   ├── solver.worker.ts           # Dedicated Web Worker running backtracking solver
│   ├── scorer.ts                  # Multi-criteria scoring engine
│   └── ical.ts                    # RFC 5545 iCalendar generator
├── public/                        # Static icons and routine assets
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # Documentation
```
