/**
 * Fixed courses configuration for UIU Routine Builder.
 * FYDP courses = CSE 4000A "Final Year Design Project - I" (BSCSE)
 * and DS 4000A "Capstone Project - I" (BSDS).
 *
 * More courses can be added to this config list as needed (e.g. CSE 4000B, CSE 4000C).
 */

export const FIXED_COURSE_CODES: readonly string[] = [
  'CSE 4000A', // Final Year Design Project - I (BSCSE)
  'DS 4000A',  // Capstone Project - I (BSDS)
];

/**
 * Checks whether a given course code is configured as a fixed course.
 */
export function isFixedCourse(courseCode: string): boolean {
  return FIXED_COURSE_CODES.includes(courseCode);
}

/**
 * Returns a copy of the fixed course codes list.
 */
export function getFixedCourseCodes(): string[] {
  return [...FIXED_COURSE_CODES];
}
