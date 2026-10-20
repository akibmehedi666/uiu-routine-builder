# Faculty Name Consistency & Near-Duplicate Notes

This document lists suspicious near-duplicate or inconsistent faculty names detected in `data/faculty.json` and `data/sections.json` extracted from the Fall 2026 course offerings PDF.

> **Policy**: In accordance with project rules, data files are never modified directly. Search handles normalization (ignoring punctuation, case, and extra spacing), while URLs use deterministic unique slugs from `data/faculty.json`.

---

## 1. Potential Duplicate Faculty Entities

### `Md. Sajjad Hossain` vs `Sajjad Hossain`
- **Entries in `data/faculty.json`**:
  - `id: md-sajjad-hossain` — `Md. Sajjad Hossain`
  - `id: sajjad-hossain` — `Sajjad Hossain`
- **Sections Assigned**:
  - `Md. Sajjad Hossain` teaches BSCSE courses.
  - `Sajjad Hossain` teaches BSCSE/BSDS courses.
- **Note**: These appear to be the same faculty member listed with and without the "Md." prefix in the source PDF schedule tables. Both entries are preserved independently to match official routine assignments.

---

## 2. Phonetic Variants or Common Bangladeshi Name Transliterations

### `Md. Asadujjaman` vs `Md. Asaduzzaman`
- **Entries in `data/faculty.json`**:
  - `id: md-asadujjaman` — `Md. Asadujjaman`
  - `id: md-asaduzzaman` — `Md. Asaduzzaman`
- **Note**: Bengali "জ" is often transliterated as either "j" or "z". If these refer to two distinct faculty members or one member entered with different spellings in different department sheets, they remain distinct in the dataset.

---

## 3. Atypical Name Formats & Placeholders

### `RaAN`
- **Entry**: `id: raan` — `RaAN`
- **Note**: Appears to be an acronym or four-letter faculty code (e.g., initial abbreviation) rather than a full English name. Preserved as-is from the PDF.

### `TBA` (To Be Announced)
- **Presence**: Listed in `data/sections.json` under `faculty: ["TBA"]` for unassigned sections.
- **Handling**: Excluded from the dedicated faculty directory since it represents an unassigned slot rather than a teacher.

---

## 4. Normalization for Search
In `src/lib/facultyIndex.ts`, search queries are normalized:
- Converted to lower-case
- Stripped of punctuation (`.`, `,`, `-`)
- Collapsed multiple whitespace
- Accents/special symbols stripped

This allows searching "sajjad hossain" to find both `Md. Sajjad Hossain` and `Sajjad Hossain`, without mutating the underlying dataset.
