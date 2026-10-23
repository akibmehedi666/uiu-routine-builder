import { describe, it, expect } from 'vitest';
import sectionsData from '../../../data/sections.json';
import {
  LANDING_COURSE_EXPLORER,
  LANDING_SCHEDULE_PREVIEW,
  getLandingCourseExplorer,
  getLandingSchedulePreview,
} from '../landingData';
import { Section } from '../../types';
import { solveSchedules } from '../../solver';
import { computeSectionMask, hasOverlap } from '../../solver/bitmask';

const allSections = sectionsData as Section[];

describe('Landing Page Real Data Samples', () => {
  describe('1. Course Explorer Card', () => {
    it('matches CSE 1111 real section count and metadata', () => {
      const cse1111InDataset = allSections.filter(
        (s) => s.courseCode === 'CSE 1111' && s.program === 'BSCSE'
      );
      expect(LANDING_COURSE_EXPLORER.courseCode).toBe('CSE 1111');
      expect(LANDING_COURSE_EXPLORER.program).toBe('BSCSE');
      expect(LANDING_COURSE_EXPLORER.totalSections).toBe(cse1111InDataset.length);
      expect(LANDING_COURSE_EXPLORER.totalSections).toBe(21);
      expect(LANDING_COURSE_EXPLORER.faculty.length).toBe(2);
    });

    it('every faculty name, section and room in the explorer exists in data/sections.json', () => {
      for (const fac of LANDING_COURSE_EXPLORER.faculty) {
        expect(fac.facultyName).not.toMatch(/^Dr\./); // no fake Dr. unless in data
        expect(fac.sections.length).toBeGreaterThan(0);

        for (const secItem of fac.sections) {
          // Find matching section in sectionsData
          const matchedSection = allSections.find(
            (s) =>
              s.courseCode === 'CSE 1111' &&
              s.program === 'BSCSE' &&
              s.section === secItem.section &&
              s.faculty.includes(fac.facultyName)
          );
          expect(
            matchedSection,
            `Expected section ${secItem.section} for ${fac.facultyName} to exist in data/sections.json`
          ).toBeDefined();

          // Room check: "Room 304" -> room "304" in dataset
          const roomNumber = secItem.room.replace(/^Room\s*/, '');
          const hasRoom = matchedSection!.meetings.some((m) => m.room === roomNumber);
          expect(
            hasRoom,
            `Expected room ${roomNumber} to exist in meetings of section ${secItem.section}`
          ).toBe(true);

          // Time format check (e.g. 09:51 not 09:50)
          expect(secItem.time).toMatch(/^\d{2}:\d{2}–\d{2}:\d{2}$/);
        }
      }
    });
  });

  describe('2. Schedule Preview', () => {
    it('has a real solver score and 4 sections', () => {
      expect(LANDING_SCHEDULE_PREVIEW.score).toBeGreaterThan(0);
      expect(LANDING_SCHEDULE_PREVIEW.score).toBeLessThanOrEqual(100);
      expect(LANDING_SCHEDULE_PREVIEW.sections.length).toBe(4);
    });

    it('has zero time conflicts / overlaps across all sections in the preview routine', () => {
      const sections = LANDING_SCHEDULE_PREVIEW.sections;
      const masks = sections.map((s) => computeSectionMask(s));

      for (let i = 0; i < masks.length; i++) {
        for (let j = i + 1; j < masks.length; j++) {
          const overlap = hasOverlap(masks[i], masks[j]);
          expect(
            overlap,
            `Expected no overlap between ${sections[i].courseCode} (${sections[i].section}) and ${sections[j].courseCode} (${sections[j].section})`
          ).toBe(false);
        }
      }
    });

    it('every faculty name, section letter, and room shown in the preview exists in data/sections.json', () => {
      for (const sec of LANDING_SCHEDULE_PREVIEW.sections) {
        const found = allSections.find((s) => s.id === sec.id);
        expect(found, `Section id ${sec.id} not found in sectionsData`).toBeDefined();
        expect(found!.section).toBe(sec.section);
        expect(found!.faculty).toEqual(sec.faculty);
        expect(found!.courseCode).toBe(sec.courseCode);

        // Check each slot in the preview schedule
        for (const [day, slots] of Object.entries(LANDING_SCHEDULE_PREVIEW.schedule)) {
          for (const slot of slots) {
            if (slot.courseCode === sec.courseCode && slot.section === sec.section) {
              // Real faculty name (no fake Dr.)
              expect(sec.faculty.join(', ')).toBe(slot.faculty);
              // Real room
              const roomRaw = slot.room.replace(/^R/, '');
              const meetingWithRoom = sec.meetings.find(
                (m) => m.day === day && (m.room === roomRaw || (!m.room && roomRaw === 'TBA'))
              );
              expect(meetingWithRoom).toBeDefined();

              // Real time format check (starts with 2 digits : 2 digits)
              expect(slot.time).toMatch(/^\d{2}:\d{2}–\d{2}:\d{2}$/);
            }
          }
        }
      }
    });

    it('has a balanced distribution with classes on Sat/Tue and Sun/Wed', () => {
      expect(LANDING_SCHEDULE_PREVIEW.schedule.Sat.length).toBe(2);
      expect(LANDING_SCHEDULE_PREVIEW.schedule.Tue.length).toBe(2);
      expect(LANDING_SCHEDULE_PREVIEW.schedule.Sun.length).toBe(2);
      expect(LANDING_SCHEDULE_PREVIEW.schedule.Wed.length).toBe(2);
      expect(LANDING_SCHEDULE_PREVIEW.schedule.Mon.length).toBe(0);
    });
  });
});
