import { Day, DAYS_LIST, Section } from '../types';
import rawSections from '../../data/sections.json';
import { formatMinutesToTime } from './facultyStats';

export interface RoomMeeting {
  day: Day;
  start: number;
  end: number;
  timeRange: string;
  courseCode: string;
  courseTitle: string;
  section: string;
  kind: Section['kind'];
  faculty: { id: string; name: string }[];
  tentative: boolean;
}

export interface RoomSchedule {
  room: string;
  floor: number | null;
  totalMeetings: number;
  distinctCourses: number;
  byDay: Record<Day, RoomMeeting[]>;
}

export function parseFloorFromRoom(room: string | null | undefined): number | null {
  if (!room) return null;
  const match = room.trim().match(/^(\d+)/);
  if (!match) return null;
  const roomNum = parseInt(match[1], 10);
  if (isNaN(roomNum) || roomNum <= 0) return null;
  return Math.floor(roomNum / 100);
}

let cachedRoomIndex: Map<string, RoomSchedule> | null = null;

function buildRoomIndex(): Map<string, RoomSchedule> {
  if (cachedRoomIndex) return cachedRoomIndex;

  const sections = rawSections as Section[];
  const map = new Map<string, RoomSchedule>();

  for (const s of sections) {
    for (const m of s.meetings) {
      if (!m.room) continue;
      const room = m.room.trim();
      if (!room) continue;

      if (!map.has(room)) {
        map.set(room, {
          room,
          floor: parseFloorFromRoom(room),
          totalMeetings: 0,
          distinctCourses: 0,
          byDay: {
            Sat: [],
            Sun: [],
            Mon: [],
            Tue: [],
            Wed: [],
          },
        });
      }

      const schedule = map.get(room)!;
      schedule.totalMeetings++;

      const facultyList: { id: string; name: string }[] = [];
      const fNames = s.faculty || [];
      const fIds = s.facultyIds || [];
      for (let i = 0; i < fNames.length; i++) {
        facultyList.push({
          name: fNames[i],
          id: fIds[i] || '',
        });
      }

      schedule.byDay[m.day].push({
        day: m.day,
        start: m.start,
        end: m.end,
        timeRange: `${formatMinutesToTime(m.start)} - ${formatMinutesToTime(m.end)}`,
        courseCode: s.courseCode,
        courseTitle: s.title,
        section: s.section,
        kind: s.kind,
        faculty: facultyList,
        tentative: s.tentative,
      });
    }
  }

  // Sort meetings chronologically and compute distinct courses
  for (const schedule of map.values()) {
    const courses = new Set<string>();
    for (const day of DAYS_LIST) {
      schedule.byDay[day].sort((a, b) => a.start - b.start);
      schedule.byDay[day].forEach((m) => courses.add(m.courseCode));
    }
    schedule.distinctCourses = courses.size;
  }

  cachedRoomIndex = map;
  return map;
}

export function getRoomSchedule(room: string): RoomSchedule | null {
  if (!room) return null;
  const index = buildRoomIndex();
  return index.get(room.trim()) || null;
}

export function getAllRooms(): { room: string; meetingCount: number; floor: number | null }[] {
  const index = buildRoomIndex();
  return Array.from(index.values())
    .map((r) => ({
      room: r.room,
      meetingCount: r.totalMeetings,
      floor: r.floor,
    }))
    .sort((a, b) => b.meetingCount - a.meetingCount || a.room.localeCompare(b.room));
}
