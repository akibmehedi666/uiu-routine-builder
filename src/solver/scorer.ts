import { Day, Meeting, ScheduleResult, ScheduleStats, ScoreBreakdown, Section, SolveRequest } from '../types';
import { DAYS_LIST } from '../types';

export function calculateScheduleMetrics(
  sections: Section[],
  request: SolveRequest
): { breakdown: ScoreBreakdown; stats: ScheduleStats; totalScore: number } {
  // Preallocated day arrays to avoid object overhead
  const sat: Meeting[] = [];
  const sun: Meeting[] = [];
  const mon: Meeting[] = [];
  const tue: Meeting[] = [];
  const wed: Meeting[] = [];

  let earliestStart = 24 * 60;
  let latestEnd = 0;
  let totalCredits = 0;
  let tentativeCount = 0;

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    totalCredits += sec.credit;
    if (sec.tentative) {
      tentativeCount++;
    }
    for (let j = 0; j < sec.meetings.length; j++) {
      const m = sec.meetings[j];
      if (m.day === 'Sat') sat.push(m);
      else if (m.day === 'Sun') sun.push(m);
      else if (m.day === 'Mon') mon.push(m);
      else if (m.day === 'Tue') tue.push(m);
      else if (m.day === 'Wed') wed.push(m);

      if (m.start < earliestStart) earliestStart = m.start;
      if (m.end > latestEnd) latestEnd = m.end;
    }
  }

  // 1. Days used and Gaps
  const daysUsed: Day[] = [];
  let totalGapMinutes = 0;

  const dayBuckets: [Day, Meeting[]][] = [
    ['Sat', sat],
    ['Sun', sun],
    ['Mon', mon],
    ['Tue', tue],
    ['Wed', wed],
  ];

  for (let b = 0; b < 5; b++) {
    const day = dayBuckets[b][0];
    const list = dayBuckets[b][1];
    if (list.length > 0) {
      daysUsed.push(day);
      if (list.length > 1) {
        list.sort((a, b) => a.start - b.start);
        for (let i = 0; i < list.length - 1; i++) {
          const gap = list[i + 1].start - list[i].end;
          if (gap > 0) totalGapMinutes += gap;
        }
      }
    }
  }

  if (earliestStart > latestEnd) {
    earliestStart = 0;
    latestEnd = 0;
  }

  // 2. Faculty Score
  let facultyScore = 100;
  const prefEntries = Object.entries(request.preferredFaculty || {}).filter(
    ([, ids]) => ids && ids.length > 0
  );
  const avoidEntries = Object.entries(request.avoidFaculty || {}).filter(
    ([, ids]) => ids && ids.length > 0
  );

  if (prefEntries.length > 0 || avoidEntries.length > 0) {
    let prefMatches = 0;
    let avoidPenalties = 0;

    for (const sec of sections) {
      const prefs = request.preferredFaculty?.[sec.courseCode] || [];
      if (prefs.length > 0) {
        const hasPref = sec.facultyIds.some((fid) => prefs.includes(fid));
        if (hasPref) prefMatches++;
      }

      const avoids = request.avoidFaculty?.[sec.courseCode] || [];
      if (avoids.length > 0) {
        const hasAvoid = sec.facultyIds.some((fid) => avoids.includes(fid));
        if (hasAvoid) avoidPenalties++;
      }
    }

    const prefRatio = prefEntries.length > 0 ? prefMatches / prefEntries.length : 1;
    const penalty = avoidPenalties * 30;
    facultyScore = Math.max(0, Math.min(100, Math.round(prefRatio * 100 - penalty)));
  }

  // 3. Gap Score (100 if 0 gap, down to 0 at 300 mins)
  const gapScore = Math.max(0, 100 - Math.round(totalGapMinutes / 3));

  // 4. Day Compactness Score
  let dayCompactScore = 30;
  if (daysUsed.length <= 2) dayCompactScore = 100;
  else if (daysUsed.length === 3) dayCompactScore = 85;
  else if (daysUsed.length === 4) dayCompactScore = 60;
  else dayCompactScore = 30;

  // 5. Time Preference Score
  let earlyLatePenalty = 0;
  for (const sec of sections) {
    for (const m of sec.meetings) {
      if (m.start <= 510) earlyLatePenalty += 10; // 08:30 slot
      if (m.end >= 990) earlyLatePenalty += 10;   // 16:30 end
    }
  }
  const timePreferenceScore = Math.max(0, 100 - earlyLatePenalty);

  // 6. Tentative Penalty
  const tentativePenalty = Math.max(0, 100 - tentativeCount * 35);

  const w = request.weights || {
    facultyPreference: 30,
    minimizeGaps: 25,
    compactDays: 20,
    avoidEarlyLate: 15,
    avoidTentative: 10,
  };

  const totalWeight =
    (w.facultyPreference || 0) +
    (w.minimizeGaps || 0) +
    (w.compactDays || 0) +
    (w.avoidEarlyLate || 0) +
    (w.avoidTentative || 0) || 1;

  const totalScore = Math.round(
    ((facultyScore * (w.facultyPreference || 0)) +
      (gapScore * (w.minimizeGaps || 0)) +
      (dayCompactScore * (w.compactDays || 0)) +
      (timePreferenceScore * (w.avoidEarlyLate || 0)) +
      (tentativePenalty * (w.avoidTentative || 0))) /
      totalWeight
  );

  const breakdown: ScoreBreakdown = {
    facultyScore,
    gapScore,
    dayCompactScore,
    timePreferenceScore,
    tentativePenalty,
  };

  const stats: ScheduleStats = {
    daysUsed,
    totalGapMinutes,
    earliestStart,
    latestEnd,
    tentativeCount,
    credits: totalCredits,
  };

  return { breakdown, stats, totalScore };
}
