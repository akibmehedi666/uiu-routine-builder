import {
  ScheduleResult,
  Section,
  SolveRequest,
  SolveResponse,
} from '../types';
import {
  computeSectionMask,
  createEmptyMask,
  hasOverlap,
  mergeMasks,
  ScheduleBitmask,
} from './bitmask';
import { calculateScheduleMetrics } from './scorer';

interface PreparedSection {
  section: Section;
  mask: ScheduleBitmask;
  dayMask: number; // 5-bit day presence
  isTentative: boolean;
  earlyLatePenalty: number;
  prefBonus: number;
  avoidPenalty: number;
}

interface CourseDomain {
  courseCode: string;
  sections: PreparedSection[];
}

export function solveSchedules(
  allSections: Section[],
  request: SolveRequest
): SolveResponse {
  const startTime = Date.now();
  const limit = request.limit ?? 50;
  const maxNodes = 200000;
  const timeoutMs = 2000;

  // 1. Group candidate sections per selected course
  const selectedCourses = Array.from(new Set(request.selectedCourses || []));

  if (selectedCourses.length === 0) {
    return {
      schedules: [],
      totalValidCombinations: 0,
      truncated: false,
      searchTimeMs: 0,
      nodesExplored: 0,
    };
  }

  // Pre-filter sections based on hard constraints
  const dayOffSet = new Set(request.filterDayOff || []);
  const earliestStart = request.filterTimeWindow?.earliestStart;
  const latestEnd = request.filterTimeWindow?.latestEnd;

  const domains: CourseDomain[] = [];

  for (const courseCode of selectedCourses) {
    let matching = allSections.filter((s) => s.courseCode === courseCode);

    // If locked to a specific section
    const lockedSecId = request.lockedSections?.[courseCode];
    if (lockedSecId) {
      matching = matching.filter((s) => s.id === lockedSecId);
      if (matching.length === 0) {
        return {
          schedules: [],
          totalValidCombinations: 0,
          truncated: false,
          searchTimeMs: Date.now() - startTime,
          nodesExplored: 0,
          error: `Locked section ${lockedSecId} for ${courseCode} not found or unavailable.`,
        };
      }
    }

    // Apply Day-off and Time-window filters
    matching = matching.filter((sec) => {
      for (const m of sec.meetings) {
        if (dayOffSet.has(m.day)) return false;
        if (earliestStart !== undefined && m.start < earliestStart) return false;
        if (latestEnd !== undefined && m.end > latestEnd) return false;
      }
      return true;
    });

    if (matching.length === 0) {
      return {
        schedules: [],
        totalValidCombinations: 0,
        truncated: false,
        searchTimeMs: Date.now() - startTime,
        nodesExplored: 0,
        error: `No conflict-free sections available for ${courseCode} matching your filters.`,
      };
    }

    const prefIds = request.preferredFaculty?.[courseCode] || [];
    const avoidIds = request.avoidFaculty?.[courseCode] || [];

    const preparedSections: PreparedSection[] = matching.map((s) => {
      let dayMask = 0;
      let earlyLatePenalty = 0;
      for (const m of s.meetings) {
        if (m.day === 'Sat') dayMask |= 1;
        else if (m.day === 'Sun') dayMask |= 2;
        else if (m.day === 'Mon') dayMask |= 4;
        else if (m.day === 'Tue') dayMask |= 8;
        else if (m.day === 'Wed') dayMask |= 16;

        if (m.start <= 510) earlyLatePenalty += 10;
        if (m.end >= 990) earlyLatePenalty += 10;
      }

      const prefBonus = prefIds.length > 0 && s.facultyIds.some((id) => prefIds.includes(id)) ? 1 : 0;
      const avoidPenalty = avoidIds.length > 0 && s.facultyIds.some((id) => avoidIds.includes(id)) ? 1 : 0;

      return {
        section: s,
        mask: computeSectionMask(s),
        dayMask,
        isTentative: s.tentative,
        earlyLatePenalty,
        prefBonus,
        avoidPenalty,
      };
    });

    domains.push({
      courseCode,
      sections: preparedSections,
    });
  }

  // 2. Sort domains by domain size ascending (Static MRV ordering)
  domains.sort((a, b) => a.sections.length - b.sections.length);

  // Pre-sort each course's sections so preferred faculty appear first
  for (const d of domains) {
    d.sections.sort((a, b) => b.prefBonus - a.prefBonus);
  }

  // 3. Search variables
  let nodesExplored = 0;
  let truncated = false;
  let totalValidCombinations = 0;
  const results: ScheduleResult[] = [];
  const currentSchedule: Section[] = [];
  const numCourses = domains.length;

  // Weight constants
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

  const prefCourseCount = Object.keys(request.preferredFaculty || {}).filter(
    (k) => (request.preferredFaculty[k] || []).length > 0
  ).length;

  let currentDayMask = 0;
  let currentTentative = 0;
  let currentEarlyLate = 0;
  let currentPrefMatches = 0;
  let currentAvoidPenalties = 0;

  function search(depth: number, currentMask: ScheduleBitmask) {
    nodesExplored++;

    if (nodesExplored >= maxNodes || ((nodesExplored & 2047) === 0 && Date.now() - startTime >= timeoutMs)) {
      truncated = true;
      return;
    }

    // Base case: All courses assigned!
    if (depth === numCourses) {
      totalValidCombinations++;

      // Branch and bound: check if max possible score can beat lowestScore in results
      if (results.length >= limit) {
        const lowestScore = results[results.length - 1].score;

        // Faculty score
        let facultyScore = 100;
        if (prefCourseCount > 0 || currentAvoidPenalties > 0) {
          const prefRatio = prefCourseCount > 0 ? currentPrefMatches / prefCourseCount : 1;
          facultyScore = Math.max(0, Math.min(100, Math.round(prefRatio * 100 - currentAvoidPenalties * 30)));
        }

        // Day compact score
        let dayCount = 0;
        let dm = currentDayMask;
        while (dm > 0) {
          if ((dm & 1) === 1) dayCount++;
          dm >>= 1;
        }
        const dayCompactScore = dayCount <= 2 ? 100 : dayCount === 3 ? 85 : dayCount === 4 ? 60 : 30;

        // Time pref score
        const timePreferenceScore = Math.max(0, 100 - currentEarlyLate);

        // Tentative penalty
        const tentativePenalty = Math.max(0, 100 - currentTentative * 35);

        // Theoretical maximum score assumes gapScore = 100
        const maxPossibleScore = Math.round(
          (facultyScore * (w.facultyPreference || 0) +
            100 * (w.minimizeGaps || 0) +
            dayCompactScore * (w.compactDays || 0) +
            timePreferenceScore * (w.avoidEarlyLate || 0) +
            tentativePenalty * (w.avoidTentative || 0)) /
            totalWeight
        );

        if (maxPossibleScore <= lowestScore) {
          return; // Pruned by Branch & Bound!
        }
      }

      // Check maxGapMinutesPerDay constraint if specified
      if (request.maxGapMinutesPerDay !== undefined) {
        const meetingsByDay: Record<string, { start: number; end: number }[]> = {};
        for (let i = 0; i < currentSchedule.length; i++) {
          const sec = currentSchedule[i];
          for (let j = 0; j < sec.meetings.length; j++) {
            const m = sec.meetings[j];
            if (!meetingsByDay[m.day]) meetingsByDay[m.day] = [];
            meetingsByDay[m.day].push({ start: m.start, end: m.end });
          }
        }
        for (const day in meetingsByDay) {
          const list = meetingsByDay[day].sort((a, b) => a.start - b.start);
          let dayGap = 0;
          for (let i = 0; i < list.length - 1; i++) {
            const gap = list[i + 1].start - list[i].end;
            if (gap > 0) dayGap += gap;
          }
          if (dayGap > request.maxGapMinutesPerDay) {
            return;
          }
        }
      }

      // Full calculation
      const { breakdown, stats, totalScore } = calculateScheduleMetrics(
        currentSchedule,
        request
      );

      if (results.length < limit) {
        results.push({
          sections: [...currentSchedule],
          score: totalScore,
          breakdown,
          stats,
        });
        results.sort((a, b) => b.score - a.score);
      } else {
        const lowestScore = results[results.length - 1].score;
        if (totalScore > lowestScore) {
          results[results.length - 1] = {
            sections: [...currentSchedule],
            score: totalScore,
            breakdown,
            stats,
          };
          results.sort((a, b) => b.score - a.score);
        }
      }

      return;
    }

    // Try each compatible section for course at `depth`
    const course = domains[depth];
    const sections = course.sections;
    const len = sections.length;

    for (let i = 0; i < len; i++) {
      if (truncated) break;
      const p = sections[i];

      if (!hasOverlap(currentMask, p.mask)) {
        currentSchedule.push(p.section);
        const nextMask = mergeMasks(currentMask, p.mask);
        const prevDayMask = currentDayMask;
        currentDayMask |= p.dayMask;
        currentTentative += p.isTentative ? 1 : 0;
        currentEarlyLate += p.earlyLatePenalty;
        currentPrefMatches += p.prefBonus;
        currentAvoidPenalties += p.avoidPenalty;

        search(depth + 1, nextMask);

        currentAvoidPenalties -= p.avoidPenalty;
        currentPrefMatches -= p.prefBonus;
        currentEarlyLate -= p.earlyLatePenalty;
        currentTentative -= p.isTentative ? 1 : 0;
        currentDayMask = prevDayMask;
        currentSchedule.pop();
      }
    }
  }

  // Execute search starting at depth 0
  search(0, createEmptyMask());

  return {
    schedules: results,
    totalValidCombinations,
    truncated,
    searchTimeMs: Date.now() - startTime,
    nodesExplored,
  };
}
