# PDF Inspection Findings: UIU Fall 2026 Routine

## Overview
- **File**: `Class Routine with faculty assign Fall 2026.pdf` (also aliased as `Class_Routine_with_faculty_assign_Fall_2026.pdf`)
- **Total Pages**: 54
- **Data Range**: Pages 1 through 27 contain all section data.
- **Empty / Noise Pages**: Pages 28 through 54 contain only repeated headers and footer email (`monir@admin.uiu.ac.bd`), plus a stray string `"EEE"` on Page 45. All trailing pages after Page 27 are pure noise.
- **Total Rows**: Exactly 791 rows (Sl 1 through 791, with zero missing and zero duplicates).
  - **Sl 1 – 723**: BSCSE (723 sections)
  - **Sl 724 – 791**: BSDS (68 sections)

## Column Schema
The table header defines 14 columns across the 792 pt page width:
1. `Sl` (~x: 16-31) – Serial number 1 to 791
2. `Program` (~x: 34-57) – BSCSE or BSDS
3. `Course Code` (~x: 73-107) – e.g. `ACT 2111`, `CSE 1110`, `DS 1501`, `MATH 2107`
4. `Title` (~x: 123-275) – Course Title, e.g. `Financial and Managerial Accounting`
5. `Section` (~x: 278-305) – e.g. `A`, `B`, `AA`, `AK`, `BA`, `BB`
6. `Room1` (~x: 324-351) – e.g. `301`, `627 (Computer Lab)`
7. `Room2` (~x: 364-390) – Second room for theory, empty/`-` for single-day labs
8. `Day1` (~x: 399-418) – `Sat`, `Sun`, `Mon`, `Tue`, `Wed`
9. `Day2` (~x: 424-443) – `Tue`, `Wed`, or empty/`-`
10. `Time1` (~x: 452-530) – e.g. `08:30:AM - 09:50:AM`, `11:11:AM - 01:40:PM`
11. `Time2` (~x: 537-616) – e.g. `08:30:AM - 09:50:AM` or `-`
12. `Faculty Name` (~x: 622-715) – Full faculty name(s)
13. `Faculty Initial` (~x: 717-745) – Short initial (often noisy or wrong)
14. `Credit` (~x: 751-775) – 1, 2, or 3

## Verified Structural Facts
1. **Days**:
   - Only 5 active days: `Sat`, `Sun`, `Mon`, `Tue`, `Wed`. No Thursday or Friday classes.
2. **Theory Slots (80 min)**:
   - Days occur strictly in pairs: `Sat` + `Tue`, or `Sun` + `Wed`.
   - Both days share the exact same start and end times.
   - Standard intervals:
     - 08:30 - 09:50 (510 - 590 min)
     - 09:51 - 11:10 (591 - 670 min)
     - 11:11 - 12:30 (671 - 750 min)
     - 12:31 - 13:50 (751 - 830 min, printed as 12:31:PM - 01:50:PM)
     - 13:51 - 15:10 (831 - 910 min, printed as 01:51:PM - 03:10:PM)
     - 15:11 - 16:30 (911 - 990 min, printed as 03:11:PM - 04:30:PM)
3. **Lab / Single-Day Slots (150 min)**:
   - Only 1 day (`Day2` and `Time2` are empty or `"-"`).
   - Standard intervals:
     - 08:30 - 11:00 (510 - 660 min)
     - 11:11 - 13:40 (671 - 820 min, printed as 11:11:AM - 01:40:PM)
     - 14:00 - 16:30 (840 - 990 min, printed as 02:00:PM - 04:30:PM)
4. **Single-day Theory vs Lab Distinction**:
   - Real labs end in `"Laboratory"`.
   - Non-lab single-day courses (e.g. `CSE 4000A` FYDP-I, `CSE 4165`, `GED 1005`) have 1 meeting day but are single-day theory or project courses.
   - We classify sections as: `"theory"`, `"lab"`, or `"single-day-theory"`.

## Extraction Anomalies & Text Glue Analysis
1. **Title and Section Splillover**:
   - Long course titles overflow the Title column into the Section column.
   - Examples:
     - SL 197: `Data Structure and Algorithms I Laborator` in Title, `yL` in Section -> Title: `Data Structure and Algorithms I Laboratory`, Section: `L`.
     - SL 436: `Special Topics - Embedded Machine Learn` in Title, `iAng` in Section -> Title: `Special Topics - Embedded Machine Learning`, Section: `A`.
2. **Section Tentative Marker Spillover**:
   - Sections marked `(if required)` or `(If Required)` overflow into Room1.
   - Examples:
     - SL 56: Section `F (if required`, Room1 `3)05` -> Section `F (if required)`, Room1 `305`. Tentative = true.
     - SL 143: Section `AK (if requir`, Room1 `e3d0)7` -> Section `AK (if required)`, Room1 `307`. Tentative = true.
     - SL 750: Section `BB (If Requir`, Room1 `e7d0)8` -> Section `BB (If Required)`, Room1 `708`. Tentative = true.
3. **Ghost Print / Double Print in Lab Rows**:
   - In some lab rows (e.g. SL 197, SL 268), the lab room (e.g. `827 (Computer Lab)`) was printed in both Room1 and Room2 columns, overlapping with Day1 (`Wed`), resulting in OCR artifacts like `827 (Comp8u2te7r ( LCaobm)Wpuetder Lab)`.
   - When parsed with cell/coordinate boundaries, Room is `827 (Computer Lab)` and Day is `Wed`.
4. **Faculty Names & Split Faculty**:
   - SL 436 (`CSE 4399`): Multiple faculty split by `"/"`: `"Siddique Md. Lutful Kabir/Mr. Angkon Deb"`.
   - Multi-line faculty cells in PDF tables are cleanly handled by cell-based text aggregation.
   - TBA faculty: Sections with empty or `"TBA"` faculty are mapped to `faculty = ["TBA"]`, `facultyIds = []`, `tentative = true`.
5. **Missing Room**:
   - SL 723: `TEC 2499` has no assigned room (room is null or empty).
