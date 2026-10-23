import { Day, DAYS_LIST, Section } from '../types';
import rawSections from '../../data/sections.json';
import rawFaculty from '../../data/faculty.json';

export interface HeatmapSlot {
  id: string;
  label: string;
  start: number;
  end: number;
  kind: 'theory' | 'single-day-theory' | 'lab';
  category: 'Standard Theory' | 'Single-Day Theory' | 'Laboratory';
}

export const HEATMAP_SLOTS: HeatmapSlot[] = [
  // Standard Theory (80 min)
  { id: 'th-1', label: '08:30 - 09:50', start: 510, end: 590, kind: 'theory', category: 'Standard Theory' },
  { id: 'th-2', label: '09:51 - 11:10', start: 591, end: 670, kind: 'theory', category: 'Standard Theory' },
  { id: 'th-3', label: '11:11 - 12:30', start: 671, end: 750, kind: 'theory', category: 'Standard Theory' },
  { id: 'th-4', label: '12:31 - 13:50', start: 751, end: 830, kind: 'theory', category: 'Standard Theory' },
  { id: 'th-5', label: '13:51 - 15:10', start: 831, end: 910, kind: 'theory', category: 'Standard Theory' },
  { id: 'th-6', label: '15:11 - 16:30', start: 911, end: 990, kind: 'theory', category: 'Standard Theory' },

  // Single-Day Theory (150 min)
  { id: 'sd-1', label: '08:30 - 11:00', start: 510, end: 660, kind: 'single-day-theory', category: 'Single-Day Theory' },
  { id: 'sd-2', label: '11:11 - 13:40', start: 671, end: 820, kind: 'single-day-theory', category: 'Single-Day Theory' },
  { id: 'sd-3', label: '14:00 - 16:30', start: 840, end: 990, kind: 'single-day-theory', category: 'Single-Day Theory' },

  // Laboratory (150 min)
  { id: 'lab-1', label: '08:30 - 11:00', start: 510, end: 660, kind: 'lab', category: 'Laboratory' },
  { id: 'lab-2', label: '11:11 - 13:40', start: 671, end: 820, kind: 'lab', category: 'Laboratory' },
  { id: 'lab-3', label: '14:00 - 16:30', start: 840, end: 990, kind: 'lab', category: 'Laboratory' },
];

export interface HeatmapCell {
  slotId: string;
  slotLabel: string;
  category: HeatmapSlot['category'];
  kind: HeatmapSlot['kind'];
  day: Day;
  count: number;
}

export interface CampusStats {
  totalSections: number;
  totalFaculty: number;
  totalMeetings: number;
  sectionsByKind: {
    theory: number;
    lab: number;
    singleDay: number;
  };
  sectionsByKindShare: {
    theoryPercent: number;
    labPercent: number;
    singleDayPercent: number;
  };
  meetingsByDay: Record<Day, number>;
  busiestDay: { day: Day; count: number };
  quietestDay: { day: Day; count: number };
  facultySectionHistogram: { bucket: string; count: number; percent: number }[];
  topCoursesBySections: { code: string; title: string; sections: number; program: string }[];
  topRoomsByMeetings: { room: string; count: number; floor: number | null }[];
  heatmapGrid: {
    all: HeatmapCell[];
    theory: HeatmapCell[];
    lab: HeatmapCell[];
    totalsByDay: {
      all: Record<Day, number>;
      theory: Record<Day, number>;
      lab: Record<Day, number>;
    };
    maxCellCount: number;
  };
}

let cachedStats: CampusStats | null = null;

export function getCampusStats(): CampusStats {
  if (cachedStats) return cachedStats;

  const sections = rawSections as Section[];
  const faculty = rawFaculty as { id: string; name: string; courses: any[] }[];

  const totalSections = sections.length;
  const totalFaculty = faculty.length;

  let theorySections = 0;
  let labSections = 0;
  let singleDaySections = 0;

  const meetingsByDay: Record<Day, number> = {
    Sat: 0,
    Sun: 0,
    Mon: 0,
    Tue: 0,
    Wed: 0,
  };

  const courseCountMap = new Map<string, { title: string; count: number; program: string }>();
  const roomCountMap = new Map<string, number>();

  // Slot cell counts: key = `${slotId}_${day}`
  const cellCounts = new Map<string, number>();

  let totalMeetings = 0;

  for (const s of sections) {
    if (s.kind === 'theory') theorySections++;
    else if (s.kind === 'lab') labSections++;
    else if (s.kind === 'single-day-theory') singleDaySections++;

    if (!courseCountMap.has(s.courseCode)) {
      courseCountMap.set(s.courseCode, { title: s.title, count: 0, program: s.program });
    }
    courseCountMap.get(s.courseCode)!.count++;

    for (const m of s.meetings) {
      totalMeetings++;
      meetingsByDay[m.day]++;

      if (m.room) {
        const r = m.room.trim();
        if (r) {
          roomCountMap.set(r, (roomCountMap.get(r) || 0) + 1);
        }
      }

      // Find matching heatmap slot
      // Notice: Single-day theory and Lab share start 510/671/840, so differentiate by section kind!
      const targetKind = s.kind;
      const matchedSlot = HEATMAP_SLOTS.find(
        (slot) => slot.kind === targetKind && slot.start === m.start && slot.end === m.end
      );

      if (matchedSlot) {
        const key = `${matchedSlot.id}_${m.day}`;
        cellCounts.set(key, (cellCounts.get(key) || 0) + 1);
      }
    }
  }

  // Busiest and quietest day
  let busiestDay: { day: Day; count: number } = { day: 'Sat', count: -1 };
  let quietestDay: { day: Day; count: number } = { day: 'Sat', count: Infinity };

  for (const day of DAYS_LIST) {
    const c = meetingsByDay[day];
    if (c > busiestDay.count) busiestDay = { day, count: c };
    if (c < quietestDay.count) quietestDay = { day, count: c };
  }

  // Faculty sections histogram
  const histMap: Record<string, number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
    '6': 0,
    '7': 0,
    '8+': 0,
  };

  for (const f of faculty) {
    const count = f.courses.length;
    const bucket = count >= 8 ? '8+' : String(count);
    if (histMap[bucket] !== undefined) {
      histMap[bucket]++;
    }
  }

  const facultySectionHistogram = Object.entries(histMap).map(([bucket, count]) => ({
    bucket,
    count,
    percent: Math.round((count / totalFaculty) * 1000) / 10,
  }));

  // Top 10 courses by sections
  const topCoursesBySections = Array.from(courseCountMap.entries())
    .map(([code, data]) => ({
      code,
      title: data.title,
      sections: data.count,
      program: data.program,
    }))
    .sort((a, b) => b.sections - a.sections || a.code.localeCompare(b.code))
    .slice(0, 10);

  // Top 10 rooms by meetings
  const topRoomsByMeetings = Array.from(roomCountMap.entries())
    .map(([room, count]) => {
      const match = room.match(/^(\d+)/);
      const floor = match ? Math.floor(parseInt(match[1], 10) / 100) : null;
      return { room, count, floor };
    })
    .sort((a, b) => b.count - a.count || a.room.localeCompare(b.room))
    .slice(0, 10);

  // Build heatmap cells
  const buildCells = (slots: HeatmapSlot[]): HeatmapCell[] => {
    const cells: HeatmapCell[] = [];
    for (const slot of slots) {
      for (const day of DAYS_LIST) {
        const count = cellCounts.get(`${slot.id}_${day}`) || 0;
        cells.push({
          slotId: slot.id,
          slotLabel: slot.label,
          category: slot.category,
          kind: slot.kind,
          day,
          count,
        });
      }
    }
    return cells;
  };

  const theorySlots = HEATMAP_SLOTS.filter((s) => s.kind === 'theory' || s.kind === 'single-day-theory');
  const labSlots = HEATMAP_SLOTS.filter((s) => s.kind === 'lab');

  const allCells = buildCells(HEATMAP_SLOTS);
  const theoryCells = buildCells(theorySlots);
  const labCells = buildCells(labSlots);

  let maxCellCount = 0;
  for (const c of allCells) {
    if (c.count > maxCellCount) maxCellCount = c.count;
  }

  const computeTotalsByDay = (cells: HeatmapCell[]): Record<Day, number> => {
    const res: Record<Day, number> = { Sat: 0, Sun: 0, Mon: 0, Tue: 0, Wed: 0 };
    for (const c of cells) {
      res[c.day] += c.count;
    }
    return res;
  };

  cachedStats = {
    totalSections,
    totalFaculty,
    totalMeetings,
    sectionsByKind: {
      theory: theorySections,
      lab: labSections,
      singleDay: singleDaySections,
    },
    sectionsByKindShare: {
      theoryPercent: Math.round((theorySections / totalSections) * 1000) / 10,
      labPercent: Math.round((labSections / totalSections) * 1000) / 10,
      singleDayPercent: Math.round((singleDaySections / totalSections) * 1000) / 10,
    },
    meetingsByDay,
    busiestDay,
    quietestDay,
    facultySectionHistogram,
    topCoursesBySections,
    topRoomsByMeetings,
    heatmapGrid: {
      all: allCells,
      theory: theoryCells,
      lab: labCells,
      totalsByDay: {
        all: computeTotalsByDay(allCells),
        theory: computeTotalsByDay(theoryCells),
        lab: computeTotalsByDay(labCells),
      },
      maxCellCount,
    },
  };

  return cachedStats;
}
