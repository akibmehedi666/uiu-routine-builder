import { Day, SolveRequest } from '../types';

export function serializeToParams(request: Partial<SolveRequest>): string {
  const params = new URLSearchParams();

  if (request.selectedCourses && request.selectedCourses.length > 0) {
    params.set('courses', request.selectedCourses.join(','));
  }

  if (request.filterDayOff && request.filterDayOff.length > 0) {
    params.set('dayOff', request.filterDayOff.join(','));
  }

  if (request.filterTimeWindow) {
    if (request.filterTimeWindow.earliestStart) {
      params.set('start', request.filterTimeWindow.earliestStart.toString());
    }
    if (request.filterTimeWindow.latestEnd) {
      params.set('end', request.filterTimeWindow.latestEnd.toString());
    }
  }

  if (request.maxGapMinutesPerDay !== undefined) {
    params.set('maxGap', request.maxGapMinutesPerDay.toString());
  }

  // Preferred faculty
  if (request.preferredFaculty && Object.keys(request.preferredFaculty).length > 0) {
    const pairs: string[] = [];
    for (const [code, fids] of Object.entries(request.preferredFaculty)) {
      if (fids && fids.length > 0) {
        pairs.push(`${code}:${fids.join(';')}`);
      }
    }
    if (pairs.length > 0) params.set('pref', pairs.join('|'));
  }

  // Locked sections
  if (request.lockedSections && Object.keys(request.lockedSections).length > 0) {
    const pairs: string[] = [];
    for (const [code, secId] of Object.entries(request.lockedSections)) {
      if (secId) pairs.push(`${code}:${secId}`);
    }
    if (pairs.length > 0) params.set('lock', pairs.join('|'));
  }

  return params.toString();
}

export function parseFromParams(search: string): Partial<SolveRequest> {
  const params = new URLSearchParams(search);
  const req: Partial<SolveRequest> = {};

  const courses = params.get('courses');
  if (courses) {
    req.selectedCourses = courses.split(',').filter(Boolean);
  }

  const dayOff = params.get('dayOff');
  if (dayOff) {
    req.filterDayOff = dayOff.split(',').map((d) => d.trim() as Day);
  }

  const start = params.get('start');
  const end = params.get('end');
  if (start || end) {
    req.filterTimeWindow = {
      earliestStart: start ? parseInt(start, 10) : undefined,
      latestEnd: end ? parseInt(end, 10) : undefined,
    };
  }

  const maxGap = params.get('maxGap');
  if (maxGap) {
    req.maxGapMinutesPerDay = parseInt(maxGap, 10);
  }

  const pref = params.get('pref');
  if (pref) {
    req.preferredFaculty = {};
    for (const part of pref.split('|')) {
      const [code, ids] = part.split(':');
      if (code && ids) {
        req.preferredFaculty[code] = ids.split(';').filter(Boolean);
      }
    }
  }

  const lock = params.get('lock');
  if (lock) {
    req.lockedSections = {};
    for (const part of lock.split('|')) {
      const [code, secId] = part.split(':');
      if (code && secId) {
        req.lockedSections[code] = secId;
      }
    }
  }

  return req;
}
