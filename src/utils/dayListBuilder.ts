import { Day, DAYS_LIST, Meeting, ScheduleResult, Section } from '../types';
import { formatTime24 } from './export';

export interface DayClassItem {
  section: Section;
  meeting: Meeting;
  gapAfterMinutes?: number;
  gapAfterLabel?: string;
  isTightTransition?: boolean;
  tightTransitionMessage?: string;
}

export interface DayAgenda {
  day: Day;
  hasClasses: boolean;
  classCount: number;
  timeSpanLabel?: string;
  classes: DayClassItem[];
}

/**
 * Format gap minutes into human readable text (e.g., "1h 20m break", "40m break", "0m break")
 */
export function formatGapDuration(minutes: number): string {
  if (minutes <= 0) return '0m (immediate)';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours > 0 && remaining > 0) {
    return `${hours}h ${remaining}m break`;
  }
  if (hours > 0) {
    return `${hours}h break`;
  }
  return `${remaining}m break`;
}

/**
 * Builds a chronological day agenda for each day in DAYS_LIST.
 * Computes gaps and detects tight transitions between consecutive classes.
 */
export function buildDayAgendas(schedule: ScheduleResult): DayAgenda[] {
  return DAYS_LIST.map((day) => {
    const dayMeetings: { section: Section; meeting: Meeting }[] = [];

    for (const sec of schedule.sections) {
      for (const m of sec.meetings) {
        if (m.day === day) {
          dayMeetings.push({ section: sec, meeting: m });
        }
      }
    }

    if (dayMeetings.length === 0) {
      return {
        day,
        hasClasses: false,
        classCount: 0,
        classes: [],
      };
    }

    // Sort chronologically by start time
    dayMeetings.sort((a, b) => a.meeting.start - b.meeting.start);

    const minStart = dayMeetings[0].meeting.start;
    const maxEnd = Math.max(...dayMeetings.map((d) => d.meeting.end));
    const timeSpanLabel = `${formatTime24(minStart)} – ${formatTime24(maxEnd)}`;

    const items: DayClassItem[] = [];

    for (let i = 0; i < dayMeetings.length; i++) {
      const current = dayMeetings[i];
      let gapAfterMinutes: number | undefined;
      let gapAfterLabel: string | undefined;
      let isTightTransition: boolean | undefined;
      let tightTransitionMessage: string | undefined;

      if (i < dayMeetings.length - 1) {
        const next = dayMeetings[i + 1];
        const gap = next.meeting.start - current.meeting.end;
        gapAfterMinutes = Math.max(0, gap);
        gapAfterLabel = formatGapDuration(gapAfterMinutes);

        // Flag tight transitions (<= 10 mins)
        if (gapAfterMinutes <= 10) {
          isTightTransition = true;
          const currRoom = current.meeting.room || 'Room TBA';
          const nextRoom = next.meeting.room || 'Room TBA';
          tightTransitionMessage =
            currRoom !== nextRoom
              ? `Tight ${gapAfterMinutes}m transition: ${currRoom} → ${nextRoom}`
              : `Back-to-back in ${currRoom} (${gapAfterMinutes}m)`;
        }
      }

      items.push({
        section: current.section,
        meeting: current.meeting,
        gapAfterMinutes,
        gapAfterLabel,
        isTightTransition,
        tightTransitionMessage,
      });
    }

    return {
      day,
      hasClasses: true,
      classCount: items.length,
      timeSpanLabel,
      classes: items,
    };
  });
}
