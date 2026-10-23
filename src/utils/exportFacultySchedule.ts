import { FacultyStats } from '../lib/facultyStats';
import { Day, DAYS_LIST } from '../types';

const DAY_DATE_MAP: Record<Day, string> = {
  Sat: '20261024',
  Sun: '20261025',
  Mon: '20261026',
  Tue: '20261027',
  Wed: '20261028',
};

function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

function dayToIcsCode(day: Day): string {
  switch (day) {
    case 'Sat':
      return 'SA';
    case 'Sun':
      return 'SU';
    case 'Mon':
      return 'MO';
    case 'Tue':
      return 'TU';
    case 'Wed':
      return 'WE';
  }
}

/**
 * Exports faculty weekly schedule to standard iCal format (.ics).
 * Recurring weekly for 12 weeks with Asia/Dhaka timezone.
 */
export function exportFacultyToICS(faculty: FacultyStats): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UIU Routine Builder//Faculty Schedule//Fall 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${faculty.name} - UIU Fall 2026 Schedule`,
    'X-WR-TIMEZONE:Asia/Dhaka',
  ];

  for (const group of faculty.courses) {
    for (const sec of group.sections) {
      for (const m of sec.meetings) {
        const baseDate = DAY_DATE_MAP[m.day];
        const startH = Math.floor(m.start / 60);
        const startM = m.start % 60;
        const endH = Math.floor(m.end / 60);
        const endM = m.end % 60;

        const dtStart = `${baseDate}T${pad(startH)}${pad(startM)}00`;
        const dtEnd = `${baseDate}T${pad(endH)}${pad(endM)}00`;
        const uid = `${faculty.id}-${sec.id}-${m.day}-${m.start}@uiu.ac.bd`;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${baseDate}T000000Z`);
        lines.push(`DTSTART;TZID=Asia/Dhaka:${dtStart}`);
        lines.push(`DTEND;TZID=Asia/Dhaka:${dtEnd}`);
        lines.push(`RRULE:FREQ=WEEKLY;COUNT=12;BYDAY=${dayToIcsCode(m.day)}`);
        lines.push(`SUMMARY:${group.courseCode} (${sec.section}) - ${group.title}`);
        lines.push(`LOCATION:Room ${m.room || 'TBA'}, UIU Campus`);
        lines.push(
          `DESCRIPTION:Faculty: ${faculty.name}\\nCourse: ${group.title}\\nSection: ${sec.section}\\nKind: ${sec.kind}\\nCredits: ${sec.credit}`
        );
        lines.push('STATUS:CONFIRMED');
        lines.push('END:VEVENT');
      }
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Downloads a string content as a client-side file.
 */
export function downloadTextFile(content: string, filename: string, mimeType: string) {
  if (typeof window === 'undefined') return;
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

/**
 * Generates and downloads a clean high-resolution PNG timetable card
 * for a faculty member using native HTML5 Canvas 2D.
 */
export function exportFacultyToPNG(faculty: FacultyStats) {
  if (typeof window === 'undefined') return;

  const width = 1200;
  const height = 750;
  const scale = 2; // high-dpi retina

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Decorative header background banner
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, '#FFF7ED');
  grad.addColorStop(1, '#FFEDD5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, 120);

  // Header border
  ctx.strokeStyle = '#FDBA74';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 120);
  ctx.lineTo(width, 120);
  ctx.stroke();

  // Branding text
  ctx.fillStyle = '#EA580C';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('UNITED INTERNATIONAL UNIVERSITY  •  FALL 2026 ROUTINE', 40, 38);

  // Faculty Name
  ctx.fillStyle = '#1C1917';
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillText(faculty.name, 40, 72);

  // Subtitle / badges summary
  ctx.fillStyle = '#78716C';
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  const subtitle = `${faculty.programs.join(' & ')}  |  ${faculty.totalSections} Sections  |  ${faculty.totalCredits} Credits  |  ${faculty.totalWeeklyHours} hrs/week`;
  ctx.fillText(subtitle, 40, 98);

  // Timetable Grid Layout
  const gridX = 40;
  const gridY = 150;
  const gridW = width - 80;
  const gridH = height - 190;

  const days = DAYS_LIST;
  const colW = gridW / days.length;

  // Day columns header
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(gridX, gridY, gridW, 36);
  ctx.strokeStyle = '#E2E8F0';
  ctx.strokeRect(gridX, gridY, gridW, 36);

  days.forEach((day, idx) => {
    const x = gridX + idx * colW;
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(day.toUpperCase(), x + colW / 2, gridY + 23);

    // Column border
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x, gridY + gridH);
    ctx.stroke();
  });

  // Rightmost column border
  ctx.beginPath();
  ctx.moveTo(gridX + gridW, gridY);
  ctx.lineTo(gridX + gridW, gridY + gridH);
  ctx.stroke();

  // Bottom border
  ctx.beginPath();
  ctx.moveTo(gridX, gridY + gridH);
  ctx.lineTo(gridX + gridW, gridY + gridH);
  ctx.stroke();

  // Draw meetings inside columns
  const contentY = gridY + 45;
  const contentH = gridH - 55;

  days.forEach((day, idx) => {
    const x = gridX + idx * colW + 8;
    const w = colW - 16;
    const meetings = faculty.weeklyPattern[day].meetings;

    if (meetings.length === 0) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'italic 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No classes', x + w / 2, contentY + 30);
      return;
    }

    let curY = contentY;
    const cardH = Math.min(100, Math.floor(contentH / Math.max(meetings.length, 1)) - 8);

    meetings.forEach((m) => {
      // Meeting card background
      const isLab = m.kind === 'lab';
      ctx.fillStyle = isLab ? '#F0FDF4' : '#EFF6FF';
      ctx.strokeStyle = isLab ? '#86EFAC' : '#93C5FD';
      ctx.lineWidth = 1;

      // Rounded rect card
      ctx.beginPath();
      ctx.roundRect(x, curY, w, cardH, 6);
      ctx.fill();
      ctx.stroke();

      // Course code and section
      ctx.textAlign = 'left';
      ctx.fillStyle = isLab ? '#15803D' : '#1D4ED8';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${m.courseCode} (${m.section})`, x + 10, curY + 22);

      // Time range
      const timeStr = `${formatTimeMinutes(m.start)} - ${formatTimeMinutes(m.end)}`;
      ctx.fillStyle = '#475569';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText(timeStr, x + 10, curY + 40);

      // Room
      ctx.fillStyle = '#64748B';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Room: ${m.room || 'TBA'}`, x + 10, curY + 58);

      curY += cardH + 8;
    });
  });

  // Footer note
  ctx.textAlign = 'left';
  ctx.fillStyle = '#A8A29E';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillText('Generated via UIU Routine Builder • uiu-routine-builder.vercel.app', 40, height - 15);

  // Trigger download
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${faculty.id}-schedule.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function formatTimeMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}
