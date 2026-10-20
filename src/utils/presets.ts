export interface CoursePreset {
  id: string;
  name: string;
  description: string;
  program: 'BSCSE' | 'BSDS' | 'ALL';
  courses: string[];
}

export const COURSE_PRESETS: CoursePreset[] = [
  {
    id: 'freshman-cse',
    name: 'Freshman CSE (Trimester 1)',
    description: 'Structured Programming + Lab, Differential Calculus & English I (10 credits)',
    program: 'BSCSE',
    courses: ['CSE 1111', 'CSE 1112', 'MATH 1151', 'ENG 1011'],
  },
  {
    id: 'sophomore-cse',
    name: 'Sophomore CSE (Trimester 4)',
    description: 'Discrete Math, DSA I + Lab, Calculus & Linear Algebra (10 credits)',
    program: 'BSCSE',
    courses: ['CSE 2213', 'CSE 2215', 'CSE 2216', 'MATH 2183'],
  },
  {
    id: 'junior-cse',
    name: 'Junior AI & Systems',
    description: 'Artificial Intelligence + Lab, System Analysis & Design + Lab (8 credits)',
    program: 'BSCSE',
    courses: ['CSE 3811', 'CSE 3812', 'CSE 3411', 'CSE 3412'],
  },
  {
    id: 'ds-core',
    name: 'Data Science Core (BSDS)',
    description: 'Fundamentals of DS, Programming for DS + Lab, Calculus (10 credits)',
    program: 'BSDS',
    courses: ['DS 1101', 'DS 1501', 'DS 1502', 'MATH 1151'],
  },
];
