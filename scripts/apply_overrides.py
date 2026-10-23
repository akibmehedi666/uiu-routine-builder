#!/usr/bin/env python3
"""
UIU Routine Builder - Apply Dataset Overrides
Applies validated faculty and section overrides to data/sections.json and rebuilds derived catalogs.
"""

import os
import sys
import json
import argparse
from typing import Dict, List, Any, Tuple

DEFAULT_OVERRIDES_PATH = os.path.join("data", "overrides", "2026-fall-faculty-changes.json")
DEFAULT_DATA_DIR = "data"
DEFAULT_DATE = "2026-10-23"

def slugify(text: str) -> str:
    import re
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def rebuild_courses_and_faculty(sections: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Rebuild courses.json and faculty.json from sections.json identically to extract.py."""
    courses_map: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for sec in sections:
        key = (sec["program"], sec["courseCode"])
        if key not in courses_map:
            courses_map[key] = {
                "code": sec["courseCode"],
                "title": sec["title"],
                "program": sec["program"],
                "credit": sec["credit"],
                "hasLab": False
            }
        else:
            if sec["kind"] == "theory" and courses_map[key]["credit"] < sec["credit"]:
                courses_map[key]["credit"] = sec["credit"]

    for (prog, code), c_info in list(courses_map.items()):
        theory_title = c_info["title"]
        expected_lab_title = f"{theory_title} Laboratory"
        for (p2, c2), c2_info in courses_map.items():
            if p2 == prog and c2_info["title"] == expected_lab_title:
                c_info["hasLab"] = True
                c_info["labCode"] = c2
                c2_info["theoryCode"] = code
                break

    courses_list = sorted(courses_map.values(), key=lambda c: (c["program"], c["code"]))

    faculty_map: Dict[str, Dict[str, Any]] = {}
    for sec in sections:
        for f_name, f_id in zip(sec["faculty"], sec["facultyIds"]):
            if f_name == "TBA" or not f_id:
                continue
            if f_id not in faculty_map:
                faculty_map[f_id] = {
                    "id": f_id,
                    "name": f_name,
                    "courses": []
                }
            existing_c = [c for c in faculty_map[f_id]["courses"] if c["code"] == sec["courseCode"] and c["section"] == sec["section"] and c["program"] == sec["program"]]
            if not existing_c:
                faculty_map[f_id]["courses"].append({
                    "program": sec["program"],
                    "code": sec["courseCode"],
                    "title": sec["title"],
                    "section": sec["section"],
                    "kind": sec["kind"],
                    "days": [m["day"] for m in sec["meetings"]],
                    "time": f"{sec['meetings'][0]['start']}..{sec['meetings'][0]['end']}"
                })

    faculty_list = sorted(faculty_map.values(), key=lambda f: f["name"])
    return courses_list, faculty_list

def apply_overrides(data_dir: str = DEFAULT_DATA_DIR, overrides_path: str = DEFAULT_OVERRIDES_PATH, date_str: str = DEFAULT_DATE) -> Dict[str, Any]:
    sections_path = os.path.join(data_dir, "sections.json")
    courses_path = os.path.join(data_dir, "courses.json")
    faculty_path = os.path.join(data_dir, "faculty.json")

    if not os.path.exists(sections_path):
        raise FileNotFoundError(f"Missing sections file: {sections_path}")
    if not os.path.exists(overrides_path):
        raise FileNotFoundError(f"Missing overrides file: {overrides_path}")

    with open(sections_path, "r", encoding="utf-8") as f:
        sections: List[Dict[str, Any]] = json.load(f)

    with open(overrides_path, "r", encoding="utf-8") as f:
        overrides: List[Dict[str, Any]] = json.load(f)

    old_faculty_list = []
    if os.path.exists(faculty_path):
        with open(faculty_path, "r", encoding="utf-8") as f:
            old_faculty_list = json.load(f)

    # Known faculty mapping for id lookup
    known_faculty_ids: Dict[str, str] = {f["name"]: f["id"] for f in old_faculty_list}
    for sec in sections:
        for f_name, f_id in zip(sec.get("faculty", []), sec.get("facultyIds", [])):
            if f_name != "TBA" and f_id:
                known_faculty_ids[f_name] = f_id

    applied_records = []

    # Map sections by key
    section_map: Dict[Tuple[str, str, str], Dict[str, Any]] = {
        (s["program"], s["courseCode"], s["section"]): s for s in sections
    }

    for idx, ov in enumerate(overrides):
        prog = ov.get("program")
        code = ov.get("courseCode")
        sec_letter = ov.get("section")
        expected_old_fac = ov.get("expectedOldFaculty")
        new_fac = ov.get("newFaculty")
        meetings_expected = ov.get("meetingsExpected")

        key = (prog, code, sec_letter)
        if key not in section_map:
            raise ValueError(
                f"[OVERRIDE ERROR] Section not found for key: program='{prog}', courseCode='{code}', section='{sec_letter}'"
            )

        target_sec = section_map[key]

        # 1. Strict validation of old faculty
        expected_old_list = [expected_old_fac] if isinstance(expected_old_fac, str) else list(expected_old_fac)
        if target_sec["faculty"] != expected_old_list:
            raise ValueError(
                f"[OVERRIDE MISMATCH] Faculty mismatch for {prog} {code} Sec {sec_letter}:\n"
                f"  Expected old faculty: {expected_old_list}\n"
                f"  Current section faculty: {target_sec['faculty']}\n"
                "Data has drifted! Aborting override application."
            )

        # 2. Strict validation of meetingsExpected (day, start, end, room)
        current_meetings_norm = [
            {"day": m["day"], "start": m["start"], "end": m["end"], "room": m["room"]}
            for m in target_sec["meetings"]
        ]
        expected_meetings_norm = [
            {"day": m["day"], "start": m["start"], "end": m["end"], "room": m["room"]}
            for m in meetings_expected
        ]

        if current_meetings_norm != expected_meetings_norm:
            raise ValueError(
                f"[OVERRIDE MISMATCH] Meetings mismatch for {prog} {code} Sec {sec_letter}:\n"
                f"  Expected meetings: {expected_meetings_norm}\n"
                f"  Current meetings:  {current_meetings_norm}\n"
                "Schedule day/time/room has drifted! Aborting override application."
            )

        # 3. Apply override
        old_faculty_desc = ", ".join(target_sec["faculty"])
        if new_fac == "TBA":
            target_sec["faculty"] = ["TBA"]
            target_sec["facultyIds"] = []
            target_sec["tentative"] = True
            new_faculty_desc = "TBA"
        else:
            # Named faculty
            target_sec["faculty"] = [new_fac]
            # Lookup or create id
            f_id = known_faculty_ids.get(new_fac)
            if not f_id:
                f_id = slugify(new_fac)
                known_faculty_ids[new_fac] = f_id
            target_sec["facultyIds"] = [f_id]
            new_faculty_desc = new_fac

        applied_records.append({
            "courseCode": code,
            "title": target_sec.get("title", ""),
            "section": sec_letter,
            "oldFaculty": old_faculty_desc,
            "newFaculty": new_faculty_desc,
            "meetings": target_sec["meetings"],
        })

    # Save updated sections.json
    with open(sections_path, "w", encoding="utf-8") as f:
        json.dump(sections, f, indent=2, ensure_ascii=False)
    print(f"Updated sections: {sections_path} ({len(sections)} sections, {len(applied_records)} overrides applied)")

    # Rebuild courses.json and faculty.json
    new_courses, new_faculty = rebuild_courses_and_faculty(sections)

    with open(courses_path, "w", encoding="utf-8") as f:
        json.dump(new_courses, f, indent=2, ensure_ascii=False)
    print(f"Rebuilt courses: {courses_path} ({len(new_courses)} courses)")

    with open(faculty_path, "w", encoding="utf-8") as f:
        json.dump(new_faculty, f, indent=2, ensure_ascii=False)
    print(f"Rebuilt faculty: {faculty_path} ({len(new_faculty)} faculty)")

    # Detect removed and added faculty
    old_faculty_ids = {f["id"]: f["name"] for f in old_faculty_list}
    new_faculty_ids = {f["id"]: f["name"] for f in new_faculty}

    removed_faculty = [
        {"id": fid, "name": name}
        for fid, name in old_faculty_ids.items()
        if fid not in new_faculty_ids
    ]
    added_faculty = [
        {"id": fid, "name": name}
        for fid, name in new_faculty_ids.items()
        if fid not in old_faculty_ids
    ]

    print(f"Faculty count: {len(old_faculty_list)} -> {len(new_faculty)} (removed: {len(removed_faculty)}, added: {len(added_faculty)})")
    for r in removed_faculty:
        print(f"  - REMOVED faculty (0 sections remaining): {r['name']} ({r['id']})")
    for a in added_faculty:
        print(f"  + ADDED faculty: {a['name']} ({a['id']})")

    # Update docs/data-changes.md
    docs_dir = "docs"
    os.makedirs(docs_dir, exist_ok=True)
    changes_md_path = os.path.join(docs_dir, "data-changes.md")
    
    table_rows = []
    for r in applied_records:
        day_str = "/".join(dict.fromkeys(m["day"] for m in r["meetings"]))
        start_min = r["meetings"][0]["start"]
        end_min = r["meetings"][0]["end"]
        time_str = f"{start_min//60:02d}:{start_min%60:02d}-{end_min//60:02d}:{end_min%60:02d}"
        room_str = r["meetings"][0].get("room", "TBA")
        table_rows.append(
            f"| {r['courseCode']} {r['title']} | {r['section']} | {day_str} {time_str} | {room_str} | {r['oldFaculty']} | {r['newFaculty']} | {date_str} |"
        )

    changes_content = f"""# Data Changes Log

Audit trail of manual, portal, and UCAM overrides applied to the Fall 2026 course and faculty dataset.

## Fall 2026 Faculty Updates ({date_str})
Synced with the UIU UCAM portal updates following the official registrar routine publication.

| Course | Section | Time | Room | Old Faculty | New Faculty | Date |
|---|---|---|---|---|---|---|
""" + "\n".join(table_rows) + f"""

### Faculty Impact Summary
- **Removed Faculty (0 sections remaining)**:
""" + "\n".join([f"  - `{r['id']}` ({r['name']}): All sections reassigned / set to TBA." for r in removed_faculty]) + f"""
- **Updated Faculty Count**:
  - Pre-update: {len(old_faculty_list)} faculty members
  - Post-update: {len(new_faculty)} faculty members ({len(removed_faculty)} removed)
- **Sections Count**: Total {len(sections)} sections (invariant).
- **TBA Sections**: Increased by {sum(1 for r in applied_records if r['newFaculty'] == 'TBA')}.
"""
    with open(changes_md_path, "w", encoding="utf-8") as f:
        f.write(changes_content)
    print(f"Updated audit log: {changes_md_path}")

    # Append to data/anomalies.md
    anomalies_path = os.path.join(data_dir, "anomalies.md")
    if os.path.exists(anomalies_path):
        with open(anomalies_path, "r", encoding="utf-8") as f:
            current_anomalies = f.read()

        override_marker = f"## Post-Extraction Overrides (Fall 2026 UCAM Sync - {date_str})"
        if override_marker not in current_anomalies:
            override_audit_text = f"\n\n{override_marker}\n"
            override_audit_text += f"Applied {len(applied_records)} faculty override assignments synced with the UIU UCAM portal:\n"
            for r in applied_records:
                override_audit_text += f"- BSCSE {r['courseCode']} {r['section']}: Replaced '{r['oldFaculty']}' with '{r['newFaculty']}'\n"
            if removed_faculty:
                override_audit_text += f"\nRemoved faculty with zero active teaching assignments ({len(removed_faculty)} total):\n"
                for rf in removed_faculty:
                    override_audit_text += f"- {rf['name']} (id: {rf['id']}) - 0 sections remaining\n"

            with open(anomalies_path, "a", encoding="utf-8") as f:
                f.write(override_audit_text)
            print(f"Appended override audit trail to {anomalies_path}")

    return {
        "applied": len(applied_records),
        "removed_faculty": removed_faculty,
        "new_faculty_count": len(new_faculty),
        "total_sections": len(sections)
    }

def main():
    parser = argparse.ArgumentParser(description="Apply routine data overrides and rebuild catalogs")
    parser.add_argument("--data_dir", default=DEFAULT_DATA_DIR, help="Directory containing dataset JSONs")
    parser.add_argument("--overrides", default=DEFAULT_OVERRIDES_PATH, help="Path to overrides JSON file")
    parser.add_argument("--date", default=DEFAULT_DATE, help="Date string for audit logs")
    args = parser.parse_args()

    try:
        res = apply_overrides(args.data_dir, args.overrides, args.date)
        print(f"Successfully applied {res['applied']} overrides.")
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
