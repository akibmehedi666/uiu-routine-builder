# Spot Check Verification Report (Phase 1)

This document verifies the manual spot-check rows against the original text in `Class_Routine_with_faculty_assign_Fall_2026.pdf` and confirms parser fidelity.

## Spot Check Comparison Table

| Sl | Program | Course Code | Title | Section | Credit | Kind | Days & Times | Room(s) | Faculty | Tentative | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **31** | BSCSE | CSE 1110 | Introduction to Computer Systems | A | 1 | single-day-theory | Sun 11:11 AM - 01:40 PM | 627 (Computer Lab) | Azizur Rahman Anik | No | **MATCH** |
| **56** | BSCSE | CSE 1111 | Structured Programming Language | F | 3 | theory | Sat+Tue 03:11 PM - 04:30 PM | 305 / 305 | TBA | Yes (`if required` + TBA) | **MATCH** |
| **143** | BSCSE | CSE 2213 | Discrete Mathematics | AK | 3 | theory | Sun+Wed 03:11 PM - 04:30 PM | 307 / 307 | TBA | Yes (`if required` + TBA) | **MATCH** |
| **197** | BSCSE | CSE 2216 | Data Structure and Algorithms I Laboratory | L | 1 | lab | Wed 11:11 AM - 01:40 PM | 827 (Computer Lab) | Abu Bakar Fahad | No | **MATCH** |
| **268** | BSCSE | CSE 3412 | System Analysis and Design Laboratory | O | 1 | lab | Wed 02:00 PM - 04:30 PM | 426 (Computer Lab) | Sidratul Muntaha | No | **MATCH** |
| **354** | BSCSE | CSE 3811 | Artificial Intelligence | A | 3 | theory | Sat+Tue 08:30 AM - 09:50 AM | 403 / 403 | Mr. Sheikh Mostofa Amir Foisol | No | **MATCH** |
| **436** | BSCSE | CSE 4399 | Special Topics - Embedded Machine Learning | A | 3 | theory | Sat+Tue 09:51 AM - 11:10 AM | 730 / 730 | Siddique Md. Lutful Kabir, Mr. Angkon Deb | No | **MATCH** |
| **486** | BSCSE | CSE 4813 | Deep Learning | A | 3 | theory | Sat+Tue 01:51 PM - 03:10 PM | 730 / 730 | Ohidujjaman | No | **MATCH** |
| **750** | BSDS | DS 1501 | Programming for Data Science | BB | 3 | theory | Sat+Tue 12:31 PM - 01:50 PM | 708 / 708 | TBA | Yes (`If Required` + TBA) | **MATCH** |
| **761** | BSDS | DS 3120 | Technical Report Writing and Presentation | BA | 2 | single-day-theory | Sat 08:30 AM - 11:00 AM | 927 (Computer Lab) | Jannatun Noor Mukta | No | **MATCH** |

## Notes on Specific Edge Cases Handled

1. **Sl 56, 143, 750 (Glued `(if required)` and Room Overflow)**:
   - In the raw PDF table, `(if required)` spilled across the Section and Room1 boundary (e.g. `F (if required)305`, `AK (if required)307`, `BB (If Required)708`).
   - The parser correctly extracts clean section tokens (`F`, `AK`, `BB`), flags `tentative: true`, and recovers clean room numbers (`305`, `307`, `708`).

2. **Sl 197 & 268 (Lab Room Ghost Print / Overlap)**:
   - The lab room `827 (Computer Lab)` and `426 (Computer Lab)` had horizontal coordinate overlaps with Days/Times in standard grid extraction.
   - The parser pulls character stream positions to recover the complete room string without truncation.

3. **Sl 354 (Split Faculty Name Across Columns)**:
   - Faculty name was printed across the Name and Initial columns (`Mr. Sheikh Mostofa Amir` + `Foisol`).
   - The parser resolved the canonical full name `Mr. Sheikh Mostofa Amir Foisol` and normalized slug `mr-sheikh-mostofa-amir-foisol`.

4. **Sl 436 (Dual Faculty Assignment)**:
   - Multiple faculty separated by slash `Siddique Md. Lutful Kabir/Mr. Angkon Deb`.
   - The parser splits and trims them into `["Siddique Md. Lutful Kabir", "Mr. Angkon Deb"]` and produces two normalized faculty IDs.
