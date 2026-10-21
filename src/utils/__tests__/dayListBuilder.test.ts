import { describe, it, expect } from 'vitest';
import { buildDayAgendas, formatGapDuration } from '../dayListBuilder';
import { ScheduleResult } from '../../types';

describe('dayListBuilder', () => {
  it('formats gap durations properly', () => {
    expect(formatGapDuration(0)).toBe('0m (immediate)');
    expect(formatGapDuration(30)).toBe('30m break');
    expect(formatGapDuration(60)).toBe('1h break');
    expect(formatGapDuration(80)).toBe('1h 20m break');
  });

  it('correctly builds empty days and busy days with gaps and transitions', () => {
    const mockSchedule: ScheduleResult = {
      score: 95,
      sections: [
        {
          id: 's1',
          sl: 1,
          courseCode: 'CSE 1111',
          title: 'Structured Programming Language',
          section: 'A',
          program: 'BSCSE',
          kind: 'theory',
          faculty: ['IJ'],
          facultyIds: ['IJ'],
          tentative: false,
          credit: 3,
          meetings: [
            { day: 'Sat', start: 510, end: 590, room: '301' }, // 08:30 - 09:50
            { day: 'Tue', start: 510, end: 590, room: '301' },
          ],
        },
        {
          id: 's2',
          sl: 2,
          courseCode: 'MATH 1151',
          title: 'Differential Calculus',
          section: 'B',
          program: 'BSCSE',
          kind: 'theory',
          faculty: ['TI'],
          facultyIds: ['TI'],
          tentative: false,
          credit: 3,
          meetings: [
            { day: 'Sat', start: 590, end: 670, room: '402' }, // 09:50 - 11:10 (0m gap, room switch!)
          ],
        },
        {
          id: 's3',
          sl: 3,
          courseCode: 'CSE 2213',
          title: 'Discrete Mathematics',
          section: 'C',
          program: 'BSCSE',
          kind: 'theory',
          faculty: ['MI'],
          facultyIds: ['MI'],
          tentative: false,
          credit: 3,
          meetings: [
            { day: 'Sat', start: 750, end: 830, room: '402' }, // 12:30 - 01:50 (80m gap)
          ],
        },
      ],
      breakdown: {
        facultyScore: 30,
        gapScore: 25,
        dayCompactScore: 20,
        timePreferenceScore: 15,
        tentativePenalty: 0,
      },
      stats: {
        credits: 9,
        daysUsed: ['Sat', 'Tue'],
        totalGapMinutes: 80,
        tentativeCount: 0,
        earliestStart: 510,
        latestEnd: 830,
      },
    };

    const agendas = buildDayAgendas(mockSchedule);
    expect(agendas).toHaveLength(5);

    // Sat: 3 classes
    const sat = agendas.find((a) => a.day === 'Sat')!;
    expect(sat.hasClasses).toBe(true);
    expect(sat.classCount).toBe(3);
    expect(sat.timeSpanLabel).toBe('08:30 AM – 01:50 PM');
    expect(sat.classes[0].isTightTransition).toBe(true);
    expect(sat.classes[0].tightTransitionMessage).toContain('Tight 0m transition: 301 → 402');
    expect(sat.classes[1].gapAfterMinutes).toBe(80);
    expect(sat.classes[1].gapAfterLabel).toBe('1h 20m break');

    // Sun: 0 classes (free day)
    const sun = agendas.find((a) => a.day === 'Sun')!;
    expect(sun.hasClasses).toBe(false);
    expect(sun.classCount).toBe(0);

    // Mon: 0 classes (free day)
    const mon = agendas.find((a) => a.day === 'Mon')!;
    expect(mon.hasClasses).toBe(false);

    // Tue: 1 class
    const tue = agendas.find((a) => a.day === 'Tue')!;
    expect(tue.hasClasses).toBe(true);
    expect(tue.classCount).toBe(1);
    expect(tue.timeSpanLabel).toBe('08:30 AM – 09:50 AM');
  });
});
