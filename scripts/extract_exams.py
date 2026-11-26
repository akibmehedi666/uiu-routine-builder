#!/usr/bin/env python3
"""
Extract mid-term exam schedule from SoSE notice board Excel file into data/exams.json,
data/exam-meta.json, and docs/exams-import.md.

Usage:
  python scripts/extract_exams.py
  npm run extract:exams
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SOURCE_FILENAME = "mid-term-exam-schedule_sose_notice-board_263.xlsx"
SECTIONS_PATH = ROOT / "data" / "sections.json"
COURSES_PATH = ROOT / "data" / "courses.json"
EXAMS_OUT_PATH = ROOT / "data" / "exams.json"
META_OUT_PATH = ROOT / "data" / "exam-meta.json"
REPORT_OUT_PATH = ROOT / "docs" / "exams-import.md"

KEEP_PROGRAMS = {"BSCSE", "BSDS"}
ROOM_RANGE_RE = re.compile(r"(\d+(?:\s*\([^)]+\))?)\s*\((\d+)\s*-\s*(\d+)\)")
TIME_RANGE_RE = re.compile(
    r"^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$",
    re.IGNORECASE,
)


def find_source_file() -> Path:
    direct = ROOT / SOURCE_FILENAME
    if direct.exists():
        return direct
    matches = list(ROOT.rglob(SOURCE_FILENAME))
    if not matches:
        raise FileNotFoundError(f"Could not find {SOURCE_FILENAME} under {ROOT}")
    return matches[0]


def normalize_code(code: str) -> str:
    return re.sub(r"\s+", "", code).upper()


def normalize_section(sec: str) -> str:
    return re.sub(r"\s+", "", sec).upper()


def normalize_student_id(raw: str) -> str:
    cleaned = re.sub(r"[\s-]", "", str(raw).strip())
    if not cleaned.isdigit():
        raise ValueError(f"Non-numeric student ID in range: {raw!r}")
    if len(cleaned) == 9:
        return cleaned[:-3] + "0" + cleaned[-3:]
    if len(cleaned) == 10:
        return cleaned
    raise ValueError(f"Expected 9 or 10 digit student ID, got {len(cleaned)}: {raw!r}")


def parse_exam_date(val: Any) -> tuple[str, str]:
    """Return (YYYY-MM-DD, 3-letter weekday e.g. 'Sat'). Fail hard on unparseable dates."""
    if isinstance(val, datetime):
        dt = val
    else:
        text = str(val or "").strip()
        dt = None
        for fmt in ("%B %d, %Y", "%b %d, %Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                dt = datetime.strptime(text, fmt)
                break
            except ValueError:
                continue
        if dt is None:
            raise ValueError(f"Unparseable exam date: {val!r}")
    return dt.strftime("%Y-%m-%d"), dt.strftime("%a")


def _to_minutes(hour: int, minute: int, ampm: str) -> int:
    if not (1 <= hour <= 12) or not (0 <= minute <= 59):
        raise ValueError(f"Invalid clock time: {hour}:{minute} {ampm}")
    h = hour % 12
    if ampm.upper() == "PM":
        h += 12
    return h * 60 + minute


def parse_exam_time(val: Any) -> tuple[int, int]:
    """Return (startMin, endMin). Fail hard on unparseable times."""
    text = str(val or "").strip()
    m = TIME_RANGE_RE.match(text)
    if not m:
        raise ValueError(f"Unparseable exam time: {val!r}")
    h1, m1, ap1, h2, m2, ap2 = m.groups()
    start_min = _to_minutes(int(h1), int(m1), ap1)
    end_min = _to_minutes(int(h2), int(m2), ap2)
    if end_min <= start_min:
        raise ValueError(f"Exam end time <= start time: {val!r}")
    return start_min, end_min


def get_faculty_initials_2(name: str) -> str:
    """Matches getFacultyInitials in src/lib/courseDirectory.ts."""
    if not name or name == "TBA":
        return "TBA"
    clean = name.strip()
    prefix_re = re.compile(r"^(?:dr|prof|md|mst|mr|mrs|engr|m)\.?\s+", re.IGNORECASE)
    while prefix_re.match(clean):
        clean = prefix_re.sub("", clean, count=1).strip()
    parts = [p for p in clean.split() if p]
    if not parts:
        return name[:2].upper()
    if len(parts) == 1:
        uppers = re.sub(r"[^A-Z]", "", clean)
        if len(uppers) >= 2:
            return (uppers[0] + uppers[-1]).upper()
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def generate_faculty_aliases(name: str) -> set[str]:
    """Matches generateSearchAliases in src/lib/facultyStats.ts plus 2-letter getFacultyInitials."""
    if not name or name == "TBA":
        return set()
    raw_words = [re.sub(r"[.,()]", "", w) for w in name.strip().split()]
    raw_words = [w for w in raw_words if w]
    if not raw_words:
        return set()

    aliases: set[str] = set()
    aliases.add(get_faculty_initials_2(name))
    aliases.add("".join(w[0].upper() for w in raw_words))

    title_words = {"MR", "MS", "MRS", "DR", "PROF"}
    non_title = [w for w in raw_words if w.upper() not in title_words]
    if non_title:
        aliases.add("".join(w[0].upper() for w in non_title))

    prefix_words = {"MD", "MOHAMMAD", "MOHAMMED"}
    no_prefix = [w for w in (non_title or raw_words) if w.upper() not in prefix_words]
    if no_prefix:
        aliases.add("".join(w[0].upper() for w in no_prefix))

    raw_no_prefix = [w for w in raw_words if w.upper() not in prefix_words]
    if raw_no_prefix:
        aliases.add("".join(w[0].upper() for w in raw_no_prefix))

    if len(raw_words) >= 2:
        aliases.add((raw_words[0][0] + raw_words[1][0]).upper())
    if len(non_title) >= 2:
        aliases.add((non_title[0][0] + non_title[1][0]).upper())

    return aliases


def format_min_12h(minutes: int) -> str:
    h = minutes // 60
    m = minutes % 60
    ap = "PM" if h >= 12 else "AM"
    dh = 12 if h % 12 == 0 else h % 12
    return f"{dh:02d}:{m:02d} {ap}"


def main() -> int:
    source_path = find_source_file()

    with open(SECTIONS_PATH, encoding="utf-8") as f:
        sections: list[dict[str, Any]] = json.load(f)
    with open(COURSES_PATH, encoding="utf-8") as f:
        courses: list[dict[str, Any]] = json.load(f)

    # Build section lookup by (PROGRAM, CODE_NO_SPACE, SECTION_NO_SPACE)
    section_lookup: dict[tuple[str, str, str], dict[str, Any]] = {}
    for sec in sections:
        key = (
            sec["program"].strip().upper(),
            normalize_code(sec["courseCode"]),
            normalize_section(sec["section"]),
        )
        section_lookup[key] = sec

    # Build course lookup by (PROGRAM, CODE_NO_SPACE)
    course_lookup: dict[tuple[str, str], dict[str, Any]] = {}
    for c in courses:
        key = (c["program"].strip().upper(), normalize_code(c["code"]))
        course_lookup[key] = c

    wb = openpyxl.load_workbook(source_path, read_only=True)
    ws = wb.active
    raw_rows = list(ws.iter_rows(values_only=True))
    wb.close()

    if not raw_rows:
        raise RuntimeError("Workbook is empty")

    header = [str(h or "").strip() for h in raw_rows[0]]
    data_rows = [r for r in raw_rows[1:] if any(cell is not None and str(cell).strip() for cell in r)]

    dropped_depts: Counter[str] = Counter()
    exams: list[dict[str, Any]] = []
    seen_ids: Counter[str] = Counter()

    matched_section_ids: set[str] = set()
    unmatched_rows: list[dict[str, Any]] = []
    dropped_section_exams: list[dict[str, Any]] = []
    range_anomalies: list[dict[str, Any]] = []
    initials_mismatches: list[dict[str, Any]] = []
    course_slots: dict[tuple[str, str], set[tuple[str, int, int]]] = defaultdict(set)

    for row_idx, row in enumerate(data_rows, start=2):
        program = str(row[1] or "").strip().upper()
        if program not in KEEP_PROGRAMS:
            dropped_depts[program or "(empty)"] += 1
            continue

        raw_codes = str(row[2] or "").strip()
        course_codes = [re.sub(r"\s+", " ", c.strip()) for c in raw_codes.split("/") if c.strip()]
        raw_title = re.sub(r"\s+", " ", str(row[3] or "").strip())
        section_str = re.sub(r"\s+", " ", str(row[4] or "").strip())
        teacher_initials = re.sub(r"\s+", " ", str(row[5] or "").strip())

        date_iso, day_of_week = parse_exam_date(row[6])
        start_min, end_min = parse_exam_time(row[7])

        # Parse rooms + student ID ranges
        room_cell = str(row[8] or "")
        parsed_rooms: list[dict[str, str]] = []
        for rm_raw, id_a_raw, id_b_raw in ROOM_RANGE_RE.findall(room_cell):
            room_name = re.sub(r"\s+", " ", rm_raw).strip()
            id_from = normalize_student_id(id_a_raw)
            id_to = normalize_student_id(id_b_raw)
            if id_from > id_to:
                range_anomalies.append({
                    "type": "start>end",
                    "row": row_idx,
                    "program": program,
                    "codes": course_codes,
                    "section": section_str,
                    "room": room_name,
                    "idFrom": id_from,
                    "idTo": id_to,
                })
            parsed_rooms.append({
                "room": room_name,
                "idFrom": id_from,
                "idTo": id_to,
            })

        # Check overlaps within row
        sorted_rooms = sorted(parsed_rooms, key=lambda r: (r["idFrom"], r["idTo"]))
        for idx in range(len(sorted_rooms) - 1):
            cur = sorted_rooms[idx]
            nxt = sorted_rooms[idx + 1]
            if cur["idTo"] >= nxt["idFrom"]:
                range_anomalies.append({
                    "type": "overlap",
                    "row": row_idx,
                    "program": program,
                    "codes": course_codes,
                    "section": section_str,
                    "roomA": cur,
                    "roomB": nxt,
                })

        # Match to data/sections.json
        sec_norm = normalize_section(section_str)
        matched_sec = None
        for code in course_codes:
            key = (program, normalize_code(code), sec_norm)
            if key in section_lookup:
                matched_sec = section_lookup[key]
                break

        if matched_sec is not None:
            section_id = matched_sec["id"]
            canonical_code = matched_sec["courseCode"]
            canonical_title = matched_sec["title"]
            section_status = matched_sec.get("status", "active")
            matched_section_ids.add(section_id)
            if section_status == "dropped":
                dropped_section_exams.append({
                    "sectionId": section_id,
                    "courseCode": canonical_code,
                    "section": section_str,
                    "date": date_iso,
                })
            # Check teacher initials against faculty data (REPORT ONLY)
            fac_names = [f for f in matched_sec.get("faculty", []) if f and f != "TBA"]
            if fac_names and teacher_initials and teacher_initials.upper() != "TBA":
                all_aliases: set[str] = set()
                for fname in fac_names:
                    all_aliases |= generate_faculty_aliases(fname)
                norm_excel_init = re.sub(r"[^A-Za-z0-9]", "", teacher_initials).upper()
                if norm_excel_init not in all_aliases:
                    initials_mismatches.append({
                        "sectionId": section_id,
                        "courseCode": canonical_code,
                        "section": matched_sec["section"],
                        "excelInitials": teacher_initials,
                        "facultyNames": fac_names,
                        "expectedAliases": sorted(all_aliases),
                    })
        else:
            section_id = None
            section_status = None
            # Try canonical code/title from courses.json if code exists
            matched_course = None
            for code in course_codes:
                ckey = (program, normalize_code(code))
                if ckey in course_lookup:
                    matched_course = course_lookup[ckey]
                    break
            canonical_code = matched_course["code"] if matched_course else (course_codes[0] if course_codes else "")
            canonical_title = matched_course["title"] if matched_course else raw_title
            unmatched_rows.append({
                "row": row_idx,
                "program": program,
                "courseCodes": course_codes,
                "section": section_str,
                "rawTitle": raw_title,
                "date": date_iso,
            })

        base_id = f"{program}-{canonical_code}-{section_str}"
        seen_ids[base_id] += 1
        exam_id = base_id if seen_ids[base_id] == 1 else f"{base_id}#{seen_ids[base_id]}"

        course_slots[(program, canonical_code)].add((date_iso, start_min, end_min))

        exams.append({
            "id": exam_id,
            "program": program,
            "courseCodes": course_codes,
            "sectionId": section_id,
            "sectionStatus": section_status,
            "courseCode": canonical_code,
            "courseTitle": canonical_title,
            "section": section_str,
            "teacherInitials": teacher_initials,
            "date": date_iso,
            "dayOfWeek": day_of_week,
            "startMin": start_min,
            "endMin": end_min,
            "rooms": parsed_rooms,
        })

    # Sort deterministically for idempotency
    exams.sort(key=lambda e: (e["date"], e["startMin"], e["program"], e["courseCode"], e["section"], e["id"]))

    # Find active theory / single-day-theory sections (not labs, not FYDP) without an exam row
    active_theory_no_exam: list[dict[str, Any]] = []
    active_single_day_no_exam: list[dict[str, Any]] = []
    for sec in sections:
        if sec.get("status") == "dropped":
            continue
        if sec.get("kind") == "lab":
            continue
        if "4000" in sec["courseCode"]:
            continue
        if sec["id"] not in matched_section_ids:
            entry = {
                "id": sec["id"],
                "program": sec["program"],
                "courseCode": sec["courseCode"],
                "title": sec["title"],
                "section": sec["section"],
                "kind": sec["kind"],
            }
            if sec["kind"] == "theory":
                active_theory_no_exam.append(entry)
            else:
                active_single_day_no_exam.append(entry)

    multi_slot_courses = {
        f"{prog} {code}": sorted(
            [{"date": d, "startMin": s, "endMin": e, "label": f"{d} {format_min_12h(s)} - {format_min_12h(e)}"} for d, s, e in slots],
            key=lambda x: (x["date"], x["startMin"]),
        )
        for (prog, code), slots in sorted(course_slots.items())
        if len(slots) > 1
    }

    imported_at = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")

    counts = {
        "totalRows": len(data_rows),
        "keptRows": len(exams),
        "droppedDeptRows": sum(dropped_depts.values()),
        "droppedDeptBreakdown": dict(sorted(dropped_depts.items())),
        "matchedRows": sum(1 for e in exams if e["sectionId"] is not None),
        "unmatchedRows": len(unmatched_rows),
        "droppedSectionRows": len(dropped_section_exams),
        "activeTheoryWithoutExam": len(active_theory_no_exam),
        "activeSingleDayWithoutExam": len(active_single_day_no_exam),
        "multiSlotCourses": len(multi_slot_courses),
        "rangeAnomalies": len(range_anomalies),
        "initialsMismatches": len(initials_mismatches),
    }

    meta = {
        "sourceFile": source_path.name,
        "importedAt": imported_at,
        "counts": counts,
    }

    EXAMS_OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(EXAMS_OUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        json.dump(exams, f, indent=2, ensure_ascii=False)
        f.write("\n")

    with open(META_OUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
        f.write("\n")

    # Build docs/exams-import.md
    lines: list[str] = [
        "# Mid-Term Exam Schedule Import Report",
        "",
        f"- **Source file**: `{source_path.name}`",
        f"- **Excel columns**: `{' | '.join(header)}`",
        f"- **Total data rows**: {counts['totalRows']}",
        f"- **Rows kept (BSCSE + BSDS)**: {counts['keptRows']}",
        f"- **Rows dropped (other departments)**: {counts['droppedDeptRows']} ({', '.join(f'{k}: {v}' for k, v in counts['droppedDeptBreakdown'].items())})",
        f"- **Matched to `data/sections.json`**: {counts['matchedRows']}",
        f"- **Unmatched exam rows (`sectionId: null`)**: {counts['unmatchedRows']}",
        f"- **Exam rows for dropped sections**: {counts['droppedSectionRows']}",
        f"- **Active `theory` sections (non-lab, non-FYDP) without exam row**: {counts['activeTheoryWithoutExam']}",
        f"- **Active `single-day-theory` sections (non-lab, non-FYDP) without exam row**: {counts['activeSingleDayWithoutExam']}",
        f"- **Courses with >1 exam slot**: {counts['multiSlotCourses']}",
        f"- **Student ID range anomalies**: {counts['rangeAnomalies']}",
        f"- **Teacher initials mismatches vs `data/sections.json`**: {counts['initialsMismatches']}",
        "",
        "## Unmatched Exam Rows (Warnings)",
        "",
    ]

    if not unmatched_rows:
        lines.append("None.")
    else:
        lines.append("| Row | Program | Codes | Section | Title | Date |")
        lines.append("|---|---|---|---|---|---|")
        for u in unmatched_rows:
            lines.append(
                f"| {u['row']} | {u['program']} | {' / '.join(u['courseCodes'])} | {u['section']} | {u['rawTitle']} | {u['date']} |"
            )

    lines += ["", "## Exam Rows for Dropped Sections", ""]
    if not dropped_section_exams:
        lines.append("None.")
    else:
        for d in dropped_section_exams:
            lines.append(f"- `{d['sectionId']}` ({d['courseCode']} Sec {d['section']}) on {d['date']}")

    lines += ["", "## Active Theory Sections Without an Exam Row", ""]
    if not active_theory_no_exam:
        lines.append("None.")
    else:
        lines.append("| Section ID | Course Code | Title | Section |")
        lines.append("|---|---|---|---|")
        for s in active_theory_no_exam:
            lines.append(f"| `{s['id']}` | {s['courseCode']} | {s['title']} | {s['section']} |")

    lines += ["", "## Active Single-Day Theory Sections Without an Exam Row (Non-FYDP)", ""]
    if not active_single_day_no_exam:
        lines.append("None.")
    else:
        lines.append("| Section ID | Course Code | Title | Section |")
        lines.append("|---|---|---|---|")
        for s in active_single_day_no_exam:
            lines.append(f"| `{s['id']}` | {s['courseCode']} | {s['title']} | {s['section']} |")

    lines += ["", "## Courses with More Than One Exam Slot", ""]
    if not multi_slot_courses:
        lines.append("None.")
    else:
        for cname, slots in multi_slot_courses.items():
            lines.append(f"- **{cname}**: " + "; ".join(sl["label"] for sl in slots))

    lines += ["", "## Student ID Range Anomalies", ""]
    if not range_anomalies:
        lines.append("None (all normalized 10-digit ranges satisfy `idFrom <= idTo` with zero within-row overlaps).")
    else:
        for a in range_anomalies:
            lines.append(f"- {a}")

    lines += ["", "## Teacher Initials Mismatches (Report Only — Faculty Data Unchanged)", ""]
    if not initials_mismatches:
        lines.append("None.")
    else:
        lines.append("| Section ID | Excel Teacher | Faculty in `sections.json` | Generated Initials Aliases |")
        lines.append("|---|---|---|---|")
        for m in initials_mismatches:
            lines.append(
                f"| `{m['sectionId']}` | `{m['excelInitials']}` | {', '.join(m['facultyNames'])} | {', '.join(m['expectedAliases'])} |"
            )

    lines.append("")
    with open(REPORT_OUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))

    print(
        f"Extracted {counts['keptRows']}/{counts['totalRows']} rows "
        f"(dropped {counts['droppedDeptRows']} other depts: {counts['droppedDeptBreakdown']}). "
        f"Matched: {counts['matchedRows']}, Unmatched: {counts['unmatchedRows']}, "
        f"Dropped-section exams: {counts['droppedSectionRows']}, "
        f"Active theory w/o exam: {counts['activeTheoryWithoutExam']}, "
        f"Range anomalies: {counts['rangeAnomalies']}, "
        f"Initials mismatches: {counts['initialsMismatches']}."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
