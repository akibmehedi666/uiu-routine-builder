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

DEFAULT_OVERRIDES_PATH = os.path.join("data", "overrides", "2026-fall-faculty-changes-oct24.json")
DEFAULT_DROPPED_PATH = os.path.join("data", "overrides", "2026-fall-dropped-sections.json")
DEFAULT_DATA_DIR = "data"
DEFAULT_DATE = "2026-10-24"
DEFAULT_DROPPED_DATE = "2026-11-05"

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

    # Calculate activeSectionCount and allDropped
    for (prog, code), c_info in courses_map.items():
        c_sections = [s for s in sections if s["program"] == prog and s["courseCode"] == code]
        active_secs = [s for s in c_sections if s.get("status", "active") == "active"]
        c_info["activeSectionCount"] = len(active_secs)
        c_info["allDropped"] = (len(c_sections) > 0 and len(active_secs) == 0)

    courses_list = sorted(courses_map.values(), key=lambda c: (c["program"], c["code"]))

    faculty_map: Dict[str, Dict[str, Any]] = {}
    for sec in sections:
        is_dropped = (sec.get("status") == "dropped")
        for f_name, f_id in zip(sec["faculty"], sec["facultyIds"]):
            if f_name == "TBA" or not f_id:
                continue
            if f_id not in faculty_map:
                faculty_map[f_id] = {
                    "id": f_id,
                    "name": f_name,
                    "courses": [],
                    "droppedSections": []
                }
            
            c_data = {
                "program": sec["program"],
                "code": sec["courseCode"],
                "title": sec["title"],
                "section": sec["section"],
                "kind": sec["kind"],
                "days": [m["day"] for m in sec["meetings"]],
                "time": f"{sec['meetings'][0]['start']}..{sec['meetings'][0]['end']}" if sec.get("meetings") else ""
            }

            if is_dropped:
                existing_d = [c for c in faculty_map[f_id]["droppedSections"] if c["code"] == sec["courseCode"] and c["section"] == sec["section"] and c["program"] == sec["program"]]
                if not existing_d:
                    if sec.get("droppedAt"):
                        c_data["droppedAt"] = sec["droppedAt"]
                    faculty_map[f_id]["droppedSections"].append(c_data)
            else:
                existing_c = [c for c in faculty_map[f_id]["courses"] if c["code"] == sec["courseCode"] and c["section"] == sec["section"] and c["program"] == sec["program"]]
                if not existing_c:
                    if sec.get("updated"):
                        c_data["updated"] = True
                        if sec.get("updatedOn"):
                            c_data["updatedOn"] = sec["updatedOn"]
                        if sec.get("updatedNote"):
                            c_data["updatedNote"] = sec["updatedNote"]
                        if sec.get("updatedKind"):
                            c_data["updatedKind"] = sec["updatedKind"]
                    faculty_map[f_id]["courses"].append(c_data)

    # Keep only faculty with at least one active course section
    active_faculty = [f for f in faculty_map.values() if len(f["courses"]) > 0]
    faculty_list = sorted(active_faculty, key=lambda f: f["name"])
    return courses_list, faculty_list

def generate_csv_diff_groups(sections: List[Dict[str, Any]], faculty_list: List[Dict[str, Any]], csv_path: str = "faculty-timings.csv"):
    import csv
    import re

    if not os.path.exists(csv_path):
        return None

    with open(csv_path, "r", encoding="utf-8-sig") as f:
        csv_rows = list(csv.DictReader(f))

    day_map = {
        'Saturday': 'Sat',
        'Sunday': 'Sun',
        'Monday': 'Mon',
        'Tuesday': 'Tue',
        'Wednesday': 'Wed',
        'Thursday': 'Thu',
        'Friday': 'Fri'
    }

    def parse_time_12h(t_str):
        t_str = t_str.strip()
        m = re.match(r'(\d{1,2}):(\d{2})\s*(AM|PM)', t_str, re.IGNORECASE)
        if not m:
            return None
        hr, mn, meridiem = int(m.group(1)), int(m.group(2)), m.group(3).upper()
        if meridiem == 'PM' and hr != 12:
            hr += 12
        elif meridiem == 'AM' and hr == 12:
            hr = 0
        return hr * 60 + mn

    def clean_room(r):
        if not r:
            return ''
        r = r.strip()
        r = re.sub(r'\s*[-–—]\s*([A-Za-z\s]+Lab)', r' (\1)', r, flags=re.I)
        r = re.sub(r'\s+', ' ', r)
        return r

    def parse_csv_meetings(timing_str, room_str):
        if not timing_str or not timing_str.strip():
            return []
        norm_room = clean_room(room_str)
        parts = [p.strip() for p in timing_str.split(';') if p.strip()]
        meetings = []
        for part in parts:
            m = re.match(r'([A-Za-z]+)\s+([0-9:]+\s*[APap][Mm])\s*[–\-—]\s*([0-9:]+\s*[APap][Mm])', part)
            if m:
                day_full = m.group(1)
                day = day_map.get(day_full, day_full[:3])
                start = parse_time_12h(m.group(2))
                end = parse_time_12h(m.group(3))
                meetings.append({'day': day, 'start': start, 'end': end, 'room': norm_room})
        meetings.sort(key=lambda x: (x['day'], x['start']))
        return meetings

    def norm_name(n):
        n = n.lower().strip()
        n = re.sub(r'^(dr|prof|md|mst|mr|mrs|engr)\.?\s+', '', n)
        n = re.sub(r'[^a-z0-9]', '', n)
        return n

    faculty_by_norm = {norm_name(f['name']): f for f in faculty_list}

    dataset_by_cs = {}
    for s in sections:
        key = (s['courseCode'], s['section'])
        dataset_by_cs.setdefault(key, []).append(s)

    matched_dataset_sec_ids = set()
    group_b = []
    group_c = []

    for idx, r in enumerate(csv_rows):
        course_raw = r['Course'].strip()
        code = course_raw.split(' — ', 1)[0].strip()
        sec_letter = r['Section'].strip()

        csv_meetings = parse_csv_meetings(r['Class timing'], r['Room'])
        csv_room = clean_room(r['Room'])
        csv_fac_raw = r['Faculty'].strip()
        is_csv_tba = csv_fac_raw.startswith('TBA') or not csv_fac_raw or csv_fac_raw == 'TBA / Not assigned'

        if is_csv_tba:
            csv_canonical_fac = 'TBA'
        else:
            f_match = faculty_by_norm.get(norm_name(csv_fac_raw))
            csv_canonical_fac = f_match['name'] if f_match else csv_fac_raw

        candidates = dataset_by_cs.get((code, sec_letter), [])
        if not candidates:
            group_c.append({
                'code': code,
                'title': course_raw.split(' — ', 1)[1].strip() if ' — ' in course_raw else '',
                'section': sec_letter,
                'timing': r['Class timing'],
                'room': r['Room'],
                'faculty': csv_canonical_fac
            })
            continue

        chosen = None
        if len(candidates) == 1:
            chosen = candidates[0]
        else:
            for cand in candidates:
                cand_meetings = [{'day': m['day'], 'start': m['start'], 'end': m['end'], 'room': clean_room(m.get('room'))} for m in cand['meetings']]
                cand_meetings.sort(key=lambda x: (x['day'], x['start']))
                if cand_meetings == csv_meetings:
                    chosen = cand
                    break
            if not chosen:
                chosen = candidates[0]

        matched_dataset_sec_ids.add(chosen['id'])

        cand_meetings = [{'day': m['day'], 'start': m['start'], 'end': m['end'], 'room': clean_room(m.get('room'))} for m in chosen['meetings']]
        cand_meetings.sort(key=lambda x: (x['day'], x['start']))

        timing_room_matches = (cand_meetings == csv_meetings) if csv_meetings else True

        dataset_fac_list = chosen['faculty']
        is_fac_same = False
        if is_csv_tba:
            is_fac_same = ('TBA' in dataset_fac_list)
        else:
            is_fac_same = any(norm_name(f) == norm_name(csv_canonical_fac) for f in dataset_fac_list)

        if not timing_room_matches:
            d_times = "/".join(dict.fromkeys(m["day"] for m in chosen["meetings"])) + " " + f"{chosen['meetings'][0]['start']//60:02d}:{chosen['meetings'][0]['start']%60:02d}-{chosen['meetings'][0]['end']//60:02d}:{chosen['meetings'][0]['end']%60:02d}"
            d_room = chosen['meetings'][0].get('room', 'TBA') if chosen['meetings'] else 'TBA'
            group_b.append({
                'code': code,
                'title': chosen['title'],
                'section': sec_letter,
                'dataset_schedule': f"{d_times} ({d_room})",
                'csv_schedule': f"{r['Class timing']} ({r['Room']})",
                'dataset_faculty': ", ".join(chosen['faculty']),
                'csv_faculty': csv_canonical_fac
            })

    group_d = []
    for s in sections:
        if s['id'] not in matched_dataset_sec_ids:
            d_times = "/".join(dict.fromkeys(m["day"] for m in s["meetings"])) + " " + f"{s['meetings'][0]['start']//60:02d}:{s['meetings'][0]['start']%60:02d}-{s['meetings'][0]['end']//60:02d}:{s['meetings'][0]['end']%60:02d}" if s.get('meetings') else 'TBA'
            d_room = s['meetings'][0].get('room', 'TBA') if s.get('meetings') else 'TBA'
            group_d.append({
                'program': s['program'],
                'code': s['courseCode'],
                'title': s['title'],
                'section': s['section'],
                'schedule': f"{d_times} ({d_room})",
                'faculty': ", ".join(s.get('faculty', []))
            })

    return {
        'group_b': group_b,
        'group_c': group_c,
        'group_d': group_d
    }

def apply_dropped_sections(
    sections: List[Dict[str, Any]],
    dropped_path: str = DEFAULT_DROPPED_PATH,
    date_str: str = DEFAULT_DROPPED_DATE
) -> Dict[str, Any]:
    """Marks dropped sections from portal updates as status='dropped' with droppedAt date."""
    if not os.path.exists(dropped_path):
        return {"applied": [], "not_found": [], "skipped_title": []}

    with open(dropped_path, "r", encoding="utf-8") as f:
        dropped_list: List[Dict[str, Any]] = json.load(f)

    # Ensure every section defaults to status="active"
    for s in sections:
        if "status" not in s:
            s["status"] = "active"

    section_map = {
        (s["program"], s["courseCode"], s["section"]): s for s in sections
    }

    applied = []
    not_found = []
    skipped_title = []

    for item in dropped_list:
        prog = item["program"]
        code = item["courseCode"]
        sec_letter = item["section"]
        key = (prog, code, sec_letter)

        if key not in section_map:
            not_found.append(item)
            continue

        target = section_map[key]
        expected_title = item.get("title")
        if expected_title and target.get("title") != expected_title:
            skipped_title.append(item)
            continue

        target["status"] = "dropped"
        target["droppedAt"] = date_str
        applied.append(target)

    return {
        "applied": applied,
        "not_found": not_found,
        "skipped_title": skipped_title
    }

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

    # Note: Keep existing updated flags on sections

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

        # 1. Strict validation of old faculty (allow if already applied for idempotency)
        expected_old_list = [expected_old_fac] if isinstance(expected_old_fac, str) else list(expected_old_fac)
        expected_new_list = [new_fac] if isinstance(new_fac, str) else list(new_fac)
        already_applied = (target_sec["faculty"] == expected_new_list)
        if target_sec["faculty"] != expected_old_list and not already_applied:
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

        target_sec["updated"] = True
        target_sec["updatedOn"] = date_str
        target_sec["updatedNote"] = "Faculty updated in UCAM"

        applied_records.append({
            "courseCode": code,
            "title": target_sec.get("title", ""),
            "section": sec_letter,
            "oldFaculty": old_faculty_desc,
            "newFaculty": new_faculty_desc,
            "meetings": target_sec["meetings"],
        })

    # Apply dropped sections
    dropped_info = apply_dropped_sections(sections, dropped_path=DEFAULT_DROPPED_PATH, date_str=DEFAULT_DROPPED_DATE)
    print(f"Applied dropped sections: {len(dropped_info['applied'])} marked dropped, {len(dropped_info['not_found'])} not found")

    # Save updated sections.json
    with open(sections_path, "w", encoding="utf-8") as f:
        json.dump(sections, f, indent=2, ensure_ascii=False)
    print(f"Updated sections: {sections_path} ({len(sections)} sections, {len(applied_records)} overrides applied, {len(dropped_info['applied'])} dropped)")

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

    # Generate CSV diff reports if faculty-timings.csv is present
    diff_groups = generate_csv_diff_groups(sections, new_faculty)

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

    section_header = f"## Fall 2026 Faculty & Schedule Sync ({date_str})"
    new_section_content = f"""
{section_header}
Synced with `faculty-timings.csv` (737 rows) against the dataset (791 sections).

### Group a: Applied Faculty Changes ({len(applied_records)} sections)
Faculty reassigned; meeting days, times, and rooms matched exactly.

| Course | Section | Time | Room | Old Faculty | New Faculty | Date |
|---|---|---|---|---|---|---|
""" + "\n".join(table_rows)

    if diff_groups:
        gb = diff_groups['group_b']
        gc = diff_groups['group_c']
        gd = diff_groups['group_d']

        new_section_content += f"""

### Group b: Schedule / Room Differences ({len(gb)} sections, Report Only)
Differences in room or timing between dataset and CSV; left untouched in dataset.

| Course | Section | Dataset Time & Room | CSV Time & Room | Dataset Faculty | CSV Faculty |
|---|---|---|---|---|---|
""" + "\n".join([
            f"| {b['code']} {b['title']} | {b['section']} | {b['dataset_schedule']} | {b['csv_schedule']} | {b['dataset_faculty']} | {b['csv_faculty']} |"
            for b in gb
        ])

        new_section_content += f"""

### Group c: In CSV but Not in Dataset ({len(gc)} rows, Report Only)
Courses/sections present in `faculty-timings.csv` but not found by `(courseCode, section)` in `sections.json` (e.g. lab sections where registration used alternate suffixes).

| Course Code | Title | Section | CSV Timing | CSV Room | CSV Faculty |
|---|---|---|---|---|---|
""" + "\n".join([
            f"| {c['code']} | {c['title']} | {c['section']} | {c['timing']} | {c['room']} | {c['faculty']} |"
            for c in gc
        ])

        new_section_content += f"""

### Group d: In Dataset but Not in CSV ({len(gd)} sections, Report Only)
Sections present in `sections.json` without matching entries in `faculty-timings.csv`.

| Program | Course | Section | Schedule | Current Faculty |
|---|---|---|---|---|
""" + "\n".join([
            f"| {d['program']} | {d['code']} {d['title']} | {d['section']} | {d['schedule']} | {d['faculty']} |"
            for d in gd
        ])

    new_section_content += f"""

### Faculty Impact Summary
- **Removed Faculty (0 sections remaining)**:
""" + "\n".join([f"  - `{r['id']}` ({r['name']}): All sections reassigned / set to TBA." for r in removed_faculty]) + f"""
- **Updated Faculty Count**:
  - Pre-update: {len(old_faculty_list)} faculty members
  - Post-update: {len(new_faculty)} faculty members ({len(removed_faculty)} removed)
- **Sections Count**: Total {len(sections)} sections (invariant).
- **TBA Sections**: {sum(1 for s in sections if 'TBA' in s.get('faculty', []))} ({sum(1 for r in applied_records if r['newFaculty'] == 'TBA')} newly set to TBA).
"""

    existing_changes = ""
    if os.path.exists(changes_md_path):
        with open(changes_md_path, "r", encoding="utf-8") as f:
            existing_changes = f.read()

    if section_header in existing_changes:
        # Replace existing section
        parts = existing_changes.split(section_header)
        prefix = parts[0]
        rest = parts[1]
        next_sec_idx = rest.find("\n## ")
        suffix = rest[next_sec_idx:] if next_sec_idx != -1 else ""
        updated_content = prefix.rstrip() + "\n" + new_section_content.strip() + "\n" + suffix.lstrip()
    else:
        if not existing_changes.strip():
            existing_changes = "# Data Changes Log\n\nAudit trail of manual, portal, and UCAM overrides applied to the Fall 2026 course and faculty dataset.\n"
        updated_content = existing_changes.rstrip() + "\n" + new_section_content

    with open(changes_md_path, "w", encoding="utf-8") as f:
        f.write(updated_content)
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

    # Append/Update Dropped Sections in docs/data-changes.md
    dropped_header = f"## Fall 2026 Dropped Sections Sync ({DEFAULT_DROPPED_DATE})"
    dropped_applied = dropped_info["applied"]
    dropped_not_found = dropped_info["not_found"]

    dropped_rows = []
    for s in dropped_applied:
        day_str = "/".join(dict.fromkeys(m["day"] for m in s.get("meetings", []))) if s.get("meetings") else "TBA"
        if s.get("meetings"):
            s_min = s["meetings"][0]["start"]
            e_min = s["meetings"][0]["end"]
            time_str = f"{s_min//60:02d}:{s_min%60:02d}-{e_min//60:02d}:{e_min%60:02d}"
            r_str = s["meetings"][0].get("room", "TBA") or "TBA"
        else:
            time_str = "TBA"
            r_str = "TBA"
        fac_str = ", ".join(s.get("faculty", [])) if s.get("faculty") else "TBA"
        dropped_rows.append(
            f"| {s['program']} | {s['courseCode']} {s['title']} | {s['section']} | {day_str} {time_str} | {r_str} | {fac_str} |"
        )

    fully_dropped_courses = [c["code"] for c in new_courses if c.get("allDropped")]

    dropped_content = f"""
{dropped_header}
Synced dropped sections from the Fall 2026 portal update.

### Summary
- Input entries: {len(dropped_applied) + len(dropped_not_found)}
- Applied dropped sections: {len(dropped_applied)}
- Not found in dataset: {len(dropped_not_found)} ({', '.join([f"{nf['courseCode']} {nf['section']}" for nf in dropped_not_found])})
- Fully dropped courses: {len(fully_dropped_courses)} ({', '.join(fully_dropped_courses)})
- Faculty removed with 0 active sections remaining: {len(removed_faculty)}
""" + "\n".join([f"  - `{rf['id']}` ({rf['name']})" for rf in removed_faculty]) + f"""
- Total sections: {len(sections)} ({len(dropped_applied)} dropped, {len(sections) - len(dropped_applied)} active)
- Total courses: {len(new_courses)} ({len(fully_dropped_courses)} fully dropped, {len(new_courses) - len(fully_dropped_courses)} with active sections)
- Total faculty with active sections: {len(new_faculty)}

### Applied Dropped Sections ({len(dropped_applied)} sections)
| Program | Course | Section | Time | Room | Faculty |
|---|---|---|---|---|---|
""" + "\n".join(dropped_rows) + "\n"

    with open(changes_md_path, "r", encoding="utf-8") as f:
        existing_doc = f.read()

    if dropped_header in existing_doc:
        parts = existing_doc.split(dropped_header)
        prefix = parts[0]
        rest = parts[1]
        next_sec_idx = rest.find("\n## ")
        suffix = rest[next_sec_idx:] if next_sec_idx != -1 else ""
        final_doc = prefix.rstrip() + "\n" + dropped_content.strip() + "\n" + suffix.lstrip()
    else:
        final_doc = existing_doc.rstrip() + "\n" + dropped_content

    with open(changes_md_path, "w", encoding="utf-8") as f:
        f.write(final_doc)

    # Append dropped sections to data/anomalies.md
    if os.path.exists(anomalies_path):
        with open(anomalies_path, "r", encoding="utf-8") as f:
            current_anom = f.read()
        dropped_marker = f"## Post-Extraction Dropped Sections (Fall 2026 Portal Sync - {DEFAULT_DROPPED_DATE})"
        if dropped_marker not in current_anom:
            dropped_anom_text = f"\n\n{dropped_marker}\n"
            dropped_anom_text += f"Applied {len(dropped_applied)} dropped sections from Fall 2026 portal update:\n"
            for s in dropped_applied:
                dropped_anom_text += f"- {s['program']} {s['courseCode']} {s['section']}: Marked status='dropped'\n"
            if dropped_not_found:
                dropped_anom_text += f"\nSections not found in dataset ({len(dropped_not_found)} total, not created):\n"
                for nf in dropped_not_found:
                    dropped_anom_text += f"- {nf['program']} {nf['courseCode']} {nf['section']}\n"
            if fully_dropped_courses:
                dropped_anom_text += f"\nCourses with all sections dropped ({len(fully_dropped_courses)} total):\n"
                for c in fully_dropped_courses:
                    dropped_anom_text += f"- {c}\n"
            if removed_faculty:
                dropped_anom_text += f"\nRemoved faculty with zero active teaching assignments ({len(removed_faculty)} total):\n"
                for rf in removed_faculty:
                    dropped_anom_text += f"- {rf['name']} (id: {rf['id']}) - 0 active sections remaining\n"

            with open(anomalies_path, "a", encoding="utf-8") as f:
                f.write(dropped_anom_text)
            print(f"Appended dropped sections audit trail to {anomalies_path}")

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
