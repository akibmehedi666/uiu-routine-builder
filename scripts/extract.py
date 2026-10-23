#!/usr/bin/env python3
"""
UIU Routine Builder - PDF Extraction and Cleaning Script
Extracts section, course, and faculty data from UIU Trimester Routine PDF into clean JSON.
"""

import sys
import os
import re
import json
import argparse
from typing import Dict, List, Optional, Tuple, Any
import pdfplumber

# TypeScript Day definition
DAYS_ORDER = ["Sat", "Sun", "Mon", "Tue", "Wed"]
VALID_THEORY_PAIRS = {("Sat", "Tue"), ("Sun", "Wed")}

def slugify(text: str) -> str:
    """Normalize faculty name into slug ID."""
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def parse_time_to_minutes(time_str: str) -> Optional[Tuple[int, int]]:
    """Parse time string like '08:30:AM - 09:50:AM' to (start_min, end_min) since 00:00."""
    if not time_str or time_str.strip() in ['-', '', 'None']:
        return None
    pattern = r'(\d{1,2}):(\d{2}):?\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2}):?\s*(AM|PM)'
    m = re.search(pattern, time_str, re.IGNORECASE)
    if not m:
        return None
    h1, m1, ap1, h2, m2, ap2 = m.groups()
    h1, m1, h2, m2 = int(h1), int(m1), int(h2), int(m2)
    def to_min(h: int, m: int, ap: str) -> int:
        if ap.upper() == 'PM' and h != 12:
            h += 12
        elif ap.upper() == 'AM' and h == 12:
            h = 0
        return h * 60 + m
    return to_min(h1, m1, ap1), to_min(h2, m2, ap2)

def clean_room(room_str: Optional[str]) -> Optional[str]:
    """Clean room string, returning None if empty or dash."""
    if not room_str:
        return None
    r = room_str.strip()
    # Normalize duplicate rooms, e.g. "827 (Computer Lab)827 (Computer Lab)"
    m_dup = re.match(r'^(.+?)\s*\1$', r)
    if m_dup:
        r = m_dup.group(1).strip()
    # Remove unwanted trailing/leading junk
    r = re.sub(r'\s+', ' ', r)
    if r in ['-', '', 'None']:
        return None
    return r

def extract_pdf_data(pdf_path: str):
    """Extract and parse all rows from the given PDF file."""
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    anomalies: List[str] = []
    
    # Pass 1: Extract table data from pdfplumber
    table_rows_by_sl: Dict[int, List[str]] = {}
    with pdfplumber.open(pdf_path) as pdf:
        num_pages = len(pdf.pages)
        for page_idx in range(num_pages):
            page = pdf.pages[page_idx]
            tables = page.extract_tables()
            for t in tables:
                for r in t:
                    if r and r[0] and str(r[0]).strip().isdigit():
                        sl = int(str(r[0]).strip())
                        table_rows_by_sl[sl] = [str(c or '').strip() for c in r]

    # Pass 2: Extract raw character streams per line to bypass column-boundary clipping
    char_streams_by_sl: Dict[int, Tuple[str, float, int]] = {}
    faculty_text_by_sl: Dict[int, str] = {}
    with pdfplumber.open(pdf_path) as pdf:
        for page_idx in range(num_pages):
            page = pdf.pages[page_idx]
            words = page.extract_words()
            sl_words = [w for w in words if w['x0'] < 33 and w['text'].isdigit() and w['top'] > 90]
            sl_words.sort(key=lambda w: w['top'])
            for sw in sl_words:
                sl = int(sw['text'])
                top = sw['top']
                # Collect characters for this row
                row_chars = [c for c in page.chars if abs(c['top'] - top) < 4.5]
                text = "".join([c['text'] for c in row_chars])
                char_streams_by_sl[sl] = (text, top, page_idx + 1)

                # Row 436 is special: multi-line cell in table extraction
                if sl == 436:
                    t11 = table_rows_by_sl.get(436, ['', '', '', '', '', '', '', '', '', '', '', ''])[11]
                    faculty_text_by_sl[sl] = ' '.join(t11.split())
                    continue

                # Faculty column characters (x0 >= 615 and x0 < 775)
                # Group by MCID in stream order to cleanly isolate the full faculty name
                fac_chars = [c for c in page.chars if abs(c['top'] - top) < 4.5 and c['x0'] >= 615 and c['x0'] < 775]
                if not fac_chars:
                    faculty_text_by_sl[sl] = "TBA"
                    continue

                mcid_order = []
                mcid_chars = {}
                for c in fac_chars:
                    m = c.get('mcid')
                    if m not in mcid_chars:
                        mcid_chars[m] = []
                        mcid_order.append(m)
                    mcid_chars[m].append(c['text'])

                groups = [''.join(mcid_chars[m]).strip() for m in mcid_order if ''.join(mcid_chars[m]).strip()]
                if not groups or groups[0].upper() in ['TBA', '-', 'NONE', '', '1', '2', '3']:
                    faculty_text_by_sl[sl] = "TBA"
                else:
                    faculty_text_by_sl[sl] = groups[0]

    all_sls = sorted(set(table_rows_by_sl.keys()) | set(char_streams_by_sl.keys()))
    if not all_sls:
        raise ValueError("No section rows found in PDF!")

    # Check continuity of SL
    min_sl, max_sl = min(all_sls), max(all_sls)
    if len(all_sls) != (max_sl - min_sl + 1):
        missing = set(range(min_sl, max_sl + 1)) - set(all_sls)
        raise AssertionError(f"SL sequence has gaps! Missing: {missing}")

    # Build Course Master Catalog to establish canonical titles
    # 1. First collect canonical titles from clean char stream patterns
    course_canonical_titles: Dict[str, str] = {}
    
    # We will parse each section
    sections: List[Dict[str, Any]] = []
    
    for sl in all_sls:
        t_row = table_rows_by_sl.get(sl, [])
        stream_tuple = char_streams_by_sl.get(sl)
        raw_stream = stream_tuple[0] if stream_tuple else ""

        # Determine Program
        prog = "BSCSE" if sl <= 723 else "BSDS"
        if len(t_row) > 1 and t_row[1] in ["BSCSE", "BSDS"]:
            prog = t_row[1]

        # Determine Course Code
        # Usually cleanly in t_row[2]
        course_code = t_row[2].strip() if len(t_row) > 2 and t_row[2].strip() else ""
        if not course_code:
            m_code = re.search(r'(?:BSCSE|BSDS)\s*([A-Z]{2,5}\s+\d{4}[A-Z]?)', raw_stream)
            if m_code:
                course_code = m_code.group(1).strip()
            else:
                raise ValueError(f"SL {sl}: Cannot determine course code")

        # Determine Credit
        # Last character in raw_stream or t_row[13]
        credit = 3
        if raw_stream and raw_stream.strip()[-1] in ['1', '2', '3']:
            credit = int(raw_stream.strip()[-1])
        elif len(t_row) > 13 and t_row[13] and t_row[13].strip()[-1] in ['1', '2', '3']:
            credit = int(t_row[13].strip()[-1])
        else:
            anomalies.append(f"Sl {sl}: Credit could not be read cleanly, defaulted to 3")

        # Determine Times and Days
        # Try table row first, fall back to char stream
        time1_str = t_row[9] if len(t_row) > 9 else ""
        time2_str = t_row[10] if len(t_row) > 10 else ""
        day1_str = t_row[7] if len(t_row) > 7 else ""
        day2_str = t_row[8] if len(t_row) > 8 else ""
        room1_str = t_row[5] if len(t_row) > 5 else ""
        room2_str = t_row[6] if len(t_row) > 6 else ""

        # Validate / recover Days from char stream if table extraction had overflow (e.g. SL 197, 268)
        time_pat = r'(\d{1,2}:\d{2}:?(?:AM|PM)\s*-\s*\d{1,2}:\d{2}:?(?:AM|PM))'
        stream_times = list(re.finditer(time_pat, raw_stream))
        
        days: List[str] = []
        if day1_str in DAYS_ORDER and day2_str in DAYS_ORDER:
            days = [day1_str, day2_str]
        elif day1_str in DAYS_ORDER and (not day2_str or day2_str in ['-', '']):
            days = [day1_str]
        else:
            # Recover from char stream
            if stream_times:
                first_time_start = stream_times[0].start()
                pre_time = raw_stream[:first_time_start].strip()
                m2 = re.search(r'(Sat|Sun|Mon|Tue|Wed)\s*(Sat|Sun|Mon|Tue|Wed)$', pre_time)
                if m2:
                    days = [m2.group(1), m2.group(2)]
                else:
                    m1 = re.search(r'(Sat|Sun|Mon|Tue|Wed)$', pre_time)
                    if m1:
                        days = [m1.group(1)]
            if not days:
                raise ValueError(f"SL {sl}: Unable to parse days! day1='{day1_str}', day2='{day2_str}'")

        # Parse Times
        t1_parsed = parse_time_to_minutes(time1_str)
        t2_parsed = parse_time_to_minutes(time2_str)
        if not t1_parsed and stream_times:
            t1_parsed = parse_time_to_minutes(stream_times[0].group(0))
        if len(days) == 2 and not t2_parsed:
            if len(stream_times) >= 2:
                t2_parsed = parse_time_to_minutes(stream_times[1].group(0))
            else:
                t2_parsed = t1_parsed  # Theory slots always use identical time on both days

        if not t1_parsed:
            raise ValueError(f"SL {sl}: Unable to parse start/end time")

        # Clean Rooms
        # In SL 197/268, room was truncated in table to e.g. '827 (Comp'
        # Check raw_stream for full lab room first if table room is truncated or mangled
        m_lab_room = re.search(r'(\d{3}\s*\([^)]+\))', raw_stream)
        if m_lab_room and ('(Comp' in room1_str or 't8o2ry' in room1_str or 't5o2ry' in room1_str or 't9o2ry' in room1_str or not room1_str):
            room1 = m_lab_room.group(1).strip()
            anomalies.append(f"Sl {sl}: Recovered complete lab room from stream -> '{room1}'")
        else:
            room1 = clean_room(room1_str)

        room2 = clean_room(room2_str) if len(days) == 2 else None

        # For theory rows, if room1 was polluted by '(if required)' (e.g. '3)05', 'e3d0)7', 'e7d0)8')
        if len(days) == 2 and room2 and re.match(r'^\d{3}$', room2):
            if not room1 or not re.match(r'^\d{3}$', room1):
                anomalies.append(f"Sl {sl}: Repaired polluted theory room1 '{room1}' using room2 '{room2}'")
                room1 = room2

        # For theory rows, if room2 is missing or dash, copy room1
        if len(days) == 2 and not room2 and room1:
            room2 = room1

        # Check Title and Section
        raw_sec = t_row[4] if len(t_row) > 4 else ""
        raw_title = t_row[3] if len(t_row) > 3 else ""
        
        # Check tentative marker in section or raw_stream
        tentative = False
        if '(if required' in raw_sec.lower() or '(if required' in raw_stream.lower():
            tentative = True

        # Clean Section letter (A, B, AA, AK, BA, BB, etc.)
        # Remove '(if required)' or junk
        clean_sec = re.sub(r'\(.*?\)', '', raw_sec).strip()
        # In overflow cases like SL 422 'oAratory' or SL 197 'yL' or SL 436 'iAng':
        if len(clean_sec) > 2 or any(c.islower() for c in clean_sec):
            # Extract section from raw_stream
            # Find title ending, section is next 1-2 uppercase letters
            m_s = re.search(r'(?:Laboratory|Systems|Accounting|Language|Mathematics|Engineering|Intelligence|Ethics|Learning|Management|Networks|Architecture|Calculus|Algebra|Physics|Biology|Design|Science)\s*([A-Z]{1,2})', raw_stream)
            if m_s:
                clean_sec = m_s.group(1)
                anomalies.append(f"Sl {sl}: Repaired glued section from '{raw_sec}' to '{clean_sec}'")
            else:
                # Try finding uppercase letters before room or day
                m_s2 = re.search(r'([A-Z]{1,2})\s*(?:\(if required\))?\s*(?:\d{3}|Sat|Sun|Mon|Tue|Wed)', raw_stream)
                if m_s2:
                    clean_sec = m_s2.group(1)
                    anomalies.append(f"Sl {sl}: Inferred section from stream '{raw_sec}' -> '{clean_sec}'")

        # Clean Title
        # Known titles repair
        title = raw_title.strip()
        # Fix truncated lab titles
        if title.endswith('Laborato') or title.endswith('Laborator') or title.endswith('Labora') or title.endswith('Lab'):
            title = re.sub(r'\s*Lab.*$', ' Laboratory', title)
        elif title.endswith('Engineering Eth'):
            title = 'Society, Environment and Engineering Ethics'
        elif title.endswith('Embedded Machine Learn'):
            title = 'Special Topics - Embedded Machine Learning'
        elif title.endswith('Programming for Data Sc'):
            if credit == 1:
                title = 'Object Oriented Programming for Data Science Laboratory'
            else:
                title = 'Object Oriented Programming for Data Science'

        # Update Course canonical catalog
        if course_code not in course_canonical_titles or len(title) > len(course_canonical_titles[course_code]):
            course_canonical_titles[course_code] = title

        # Parse Faculty Name
        raw_fac = faculty_text_by_sl.get(sl, "")
        if not raw_fac or raw_fac.upper() in ['TBA', 'NONE', '-', '', '1', '2', '3']:
            raw_fac_table = t_row[11] if len(t_row) > 11 else ""
            if raw_fac_table and raw_fac_table.upper() not in ['TBA', 'NONE', '-']:
                raw_fac = raw_fac_table

        raw_fac = raw_fac.replace('\n', ' ').strip()
        
        # Clean faculty
        if not raw_fac or raw_fac.upper() in ['TBA', 'NONE', '-', '1', '2', '3']:
            faculty = ["TBA"]
            faculty_ids = []
            tentative = True
        else:
            # Check for multiple faculty split by '/'
            fac_parts = [p.strip() for p in raw_fac.split('/') if p.strip()]
            faculty = []
            faculty_ids = []
            for fp in fac_parts:
                clean_f = re.sub(r'\s+', ' ', fp).strip()
                # Remove repeated initials artifact from rendering
                if clean_f.startswith("Ms. Sumaiya Ahmed RaniMs"):
                    clean_f = "Ms. Sumaiya Ahmed Rani"
                elif clean_f.startswith("Mr. Mabsur Fatin Bin HoMssra"):
                    clean_f = "Mr. Mabsur Fatin Bin Hossain"
                elif clean_f.startswith("Md. Saiful Islam MSIs"):
                    clean_f = "Md. Saiful Islam"

                faculty.append(clean_f)
                faculty_ids.append(slugify(clean_f))

        # Meetings construction
        meetings: List[Dict[str, Any]] = []
        if len(days) == 2:
            kind = "theory"
            # Sat+Tue or Sun+Wed
            meetings.append({
                "day": days[0],
                "start": t1_parsed[0],
                "end": t1_parsed[1],
                "room": room1
            })
            meetings.append({
                "day": days[1],
                "start": t2_parsed[0] if t2_parsed else t1_parsed[0],
                "end": t2_parsed[1] if t2_parsed else t1_parsed[1],
                "room": room2
            })
        else:
            # 1 day meeting
            if title.endswith("Laboratory"):
                kind = "lab"
            else:
                kind = "single-day-theory"
            meetings.append({
                "day": days[0],
                "start": t1_parsed[0],
                "end": t1_parsed[1],
                "room": room1
            })

        sec_id = f"{prog}-{course_code}-{clean_sec}"
        
        section_obj = {
            "id": sec_id,
            "sl": sl,
            "program": prog,
            "courseCode": course_code,
            "title": title,
            "section": clean_sec,
            "credit": credit,
            "kind": kind,
            "meetings": meetings,
            "faculty": faculty,
            "facultyIds": faculty_ids,
            "tentative": tentative
        }
        sections.append(section_obj)

    # Post-process canonical titles onto all sections
    for sec in sections:
        code = sec["courseCode"]
        if code in course_canonical_titles:
            sec["title"] = course_canonical_titles[code]

    # Build Courses catalog
    # Key by (program, courseCode)
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
            # If we see a theory credit (e.g. 3) vs lab, update credit
            if sec["kind"] == "theory" and courses_map[key]["credit"] < sec["credit"]:
                courses_map[key]["credit"] = sec["credit"]

    # Detect Theory-Lab pairs programmatically
    # A theory course pairs with a lab course when lab's title === theory title + " Laboratory"
    # and both share the same program
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

    # Build Faculty catalog
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
            # Record course offering if not already present
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

    return sections, courses_list, faculty_list, anomalies

def validate_extracted_data(sections: List[Dict[str, Any]], courses: List[Dict[str, Any]]):
    """Run strict assertions as defined in Phase 1 specification."""
    # 1. Exactly 791 rows parsed, Sl 1..791 with no gaps or duplicates
    assert len(sections) == 791, f"Expected exactly 791 sections, found {len(sections)}"
    sls = [s["sl"] for s in sections]
    assert sls == list(range(1, 792)), f"Sl sequence is invalid! Min={min(sls)}, Max={max(sls)}, Len={len(sls)}"
    
    # 2. Check no empty courseCode/title/section
    for s in sections:
        assert s["courseCode"], f"Empty courseCode at Sl {s['sl']}"
        assert s["title"], f"Empty title at Sl {s['sl']}"
        assert s["section"], f"Empty section at Sl {s['sl']}"
        assert s["id"], f"Empty id at Sl {s['sl']}"

    # 3. Theory rows validation
    for s in sections:
        if s["kind"] == "theory":
            assert len(s["meetings"]) == 2, f"Sl {s['sl']} ({s['id']}): theory must have exactly 2 meetings"
            pair = (s["meetings"][0]["day"], s["meetings"][1]["day"])
            assert pair in VALID_THEORY_PAIRS, f"Sl {s['sl']} ({s['id']}): invalid theory pair {pair}"
            m0, m1 = s["meetings"][0], s["meetings"][1]
            assert m0["start"] == m1["start"] and m0["end"] == m1["end"], f"Sl {s['sl']}: theory meetings time mismatch ({m0['start']} vs {m1['start']})"

    # 4. Check time boundaries: start < end, between 08:30 (510 min) and 16:30 (990 min)
    for s in sections:
        for m in s["meetings"]:
            assert m["start"] < m["end"], f"Sl {s['sl']}: start >= end ({m['start']} >= {m['end']})"
            assert 510 <= m["start"] <= 990, f"Sl {s['sl']}: start time out of range 08:30..16:30 ({m['start']})"
            assert 510 <= m["end"] <= 990, f"Sl {s['sl']}: end time out of range 08:30..16:30 ({m['end']})"

    print("All validation assertions PASSED successfully!")

def main():
    parser = argparse.ArgumentParser(description="Extract and clean UIU Routine PDF")
    parser.add_argument("pdf_path", nargs="?", default="Class_Routine_with_faculty_assign_Fall_2026.pdf",
                        help="Path to the PDF routine file")
    parser.add_argument("--out_dir", default="data", help="Output directory for JSON data")
    args = parser.parse_args()

    pdf_path = args.pdf_path
    if not os.path.exists(pdf_path) and os.path.exists("Class Routine with faculty assign Fall 2026.pdf"):
        pdf_path = "Class Routine with faculty assign Fall 2026.pdf"

    print(f"Opening PDF: {pdf_path}")
    sections, courses, faculty, anomalies = extract_pdf_data(pdf_path)

    print("Running validation checks...")
    validate_extracted_data(sections, courses)

    # Save output files
    os.makedirs(args.out_dir, exist_ok=True)
    
    sections_path = os.path.join(args.out_dir, "sections.json")
    with open(sections_path, "w", encoding="utf-8") as f:
        json.dump(sections, f, indent=2, ensure_ascii=False)
    print(f"Saved: {sections_path} ({len(sections)} sections)")

    courses_path = os.path.join(args.out_dir, "courses.json")
    with open(courses_path, "w", encoding="utf-8") as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)
    print(f"Saved: {courses_path} ({len(courses)} courses)")

    faculty_path = os.path.join(args.out_dir, "faculty.json")
    with open(faculty_path, "w", encoding="utf-8") as f:
        json.dump(faculty, f, indent=2, ensure_ascii=False)
    print(f"Saved: {faculty_path} ({len(faculty)} faculty)")

    anomalies_path = os.path.join(args.out_dir, "anomalies.md")
    with open(anomalies_path, "w", encoding="utf-8") as f:
        f.write("# Extraction Anomalies and Fixes Log\n\n")
        f.write(f"Total anomalies resolved during parsing: {len(anomalies)}\n\n")
        f.write("| Sl | Issue & Resolution |\n|---|---|\n")
        for a in anomalies:
            parts = a.split(":", 1)
            sl_part = parts[0]
            desc_part = parts[1].strip() if len(parts) > 1 else a
            f.write(f"| {sl_part} | {desc_part} |\n")
    print(f"Saved: {anomalies_path}")

    # Print summary as requested by user prompt
    bscse_count = sum(1 for s in sections if s["program"] == "BSCSE")
    bsds_count = sum(1 for s in sections if s["program"] == "BSDS")
    theory_count = sum(1 for s in sections if s["kind"] == "theory")
    lab_count = sum(1 for s in sections if s["kind"] == "lab")
    single_theory_count = sum(1 for s in sections if s["kind"] == "single-day-theory")
    
    day_counts = {d: 0 for d in DAYS_ORDER}
    for s in sections:
        for m in s["meetings"]:
            day_counts[m["day"]] += 1

    tba_count = sum(1 for s in sections if "TBA" in s["faculty"])
    tentative_count = sum(1 for s in sections if s["tentative"])
    pairs_count = sum(1 for c in courses if c.get("hasLab"))

    print("\n" + "="*50)
    print("EXTRACTION SUMMARY:")
    print(f"  Total sections parsed: {len(sections)}")
    print(f"  Program breakdown: BSCSE={bscse_count}, BSDS={bsds_count}")
    print(f"  Kind breakdown: Theory={theory_count}, Lab={lab_count}, Single-Day Theory={single_theory_count}")
    print(f"  Meeting count by day: {day_counts}")
    print(f"  TBA faculty sections: {tba_count}")
    print(f"  Tentative sections: {tentative_count}")
    print(f"  Detected Theory-Lab pairs: {pairs_count}")
    print("="*50 + "\n")

    # Apply dataset overrides as the final step
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from apply_overrides import apply_overrides, DEFAULT_OVERRIDES_PATH
    if os.path.exists(DEFAULT_OVERRIDES_PATH):
        print("Applying post-extraction overrides...")
        apply_overrides(args.out_dir, DEFAULT_OVERRIDES_PATH)

if __name__ == "__main__":
    main()
