import { Day, ScheduleResult, Section } from '../types';

export function formatTime24(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function exportToText(schedule: ScheduleResult): string {
  const lines: string[] = [];
  lines.push('============================================================');
  lines.push('UNITED INTERNATIONAL UNIVERSITY (UIU)');
  lines.push('CLASS ROUTINE & SECTION SELECTION — FALL 2026');
  lines.push(`Total Credits: ${schedule.stats.credits} | Rank Score: ${schedule.score}/100`);
  lines.push(`Days with Classes: ${schedule.stats.daysUsed.join(', ')} | Total Gap: ${schedule.stats.totalGapMinutes} mins`);
  lines.push('============================================================\n');

  schedule.sections.forEach((sec, idx) => {
    const fixedLabel = sec.manual
      ? ' [Manual Schedule]'
      : sec.fixed
      ? ' [Fixed Schedule]'
      : '';
    lines.push(`[${idx + 1}] ${sec.courseCode} (Section: ${sec.section}) — ${sec.credit} Credit(s)${fixedLabel}`);
    lines.push(`    Title:   ${sec.title}`);
    lines.push(`    Faculty: ${sec.faculty.join(', ')}`);
    sec.meetings.forEach((m) => {
      lines.push(`    Meeting: ${m.day} ${formatTime24(m.start)} – ${formatTime24(m.end)} | Room: ${m.room || 'TBA'}`);
    });
    if (sec.tentative) {
      lines.push('    * Note: Section is tentative / pending enrollment');
    }
    lines.push('');
  });

  lines.push('------------------------------------------------------------');
  lines.push('Generated with UIU Routine Builder');
  lines.push('Ready to enter into UCAM during course registration.');
  return lines.join('\n');
}

// Map day of week to Fall 2026 start dates (Trimester starting week: Oct 10, 2026)
const DAY_DATE_MAP: Record<Day, string> = {
  Sat: '20261010',
  Sun: '20261011',
  Mon: '20261012',
  Tue: '20261013',
  Wed: '20261014',
};

function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

export function exportToICS(schedule: ScheduleResult): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UIU Routine Builder//Fall 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:UIU Fall 2026 Class Schedule',
    'X-WR-TIMEZONE:Asia/Dhaka',
  ];

  for (const sec of schedule.sections) {
    for (const m of sec.meetings) {
      const baseDate = DAY_DATE_MAP[m.day];
      const startH = Math.floor(m.start / 60);
      const startM = m.start % 60;
      const endH = Math.floor(m.end / 60);
      const endM = m.end % 60;

      const dtStart = `${baseDate}T${pad(startH)}${pad(startM)}00`;
      const dtEnd = `${baseDate}T${pad(endH)}${pad(endM)}00`;
      const uid = `${sec.id}-${m.day}-${m.start}@uiu.ac.bd`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${baseDate}T000000Z`);
      lines.push(`DTSTART;TZID=Asia/Dhaka:${dtStart}`);
      lines.push(`DTEND;TZID=Asia/Dhaka:${dtEnd}`);
      lines.push(`RRULE:FREQ=WEEKLY;COUNT=12;BYDAY=${dayToIcsCode(m.day)}`);
      lines.push(`SUMMARY:${sec.courseCode} (${sec.section}) - ${sec.title}`);
      lines.push(`LOCATION:Room ${m.room || 'TBA'}, UIU Campus`);
      lines.push(
        `DESCRIPTION:Course: ${sec.title}\\nSection: ${sec.section}\\nFaculty: ${sec.faculty.join(
          ', '
        )}\\nCredits: ${sec.credit}`
      );
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function dayToIcsCode(day: Day): string {
  switch (day) {
    case 'Sat': return 'SA';
    case 'Sun': return 'SU';
    case 'Mon': return 'MO';
    case 'Tue': return 'TU';
    case 'Wed': return 'WE';
  }
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
