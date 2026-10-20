// Curated accessible, vibrant palette for courses
export interface CourseColor {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  accent: string;
  glow: string;
}

const PALETTES: CourseColor[] = [
  {
    bg: 'bg-emerald-950/60 hover:bg-emerald-950/80',
    border: 'border-emerald-500/50 hover:border-emerald-400',
    text: 'text-emerald-200',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    accent: '#10B981',
    glow: 'shadow-emerald-500/20',
  },
  {
    bg: 'bg-indigo-950/60 hover:bg-indigo-950/80',
    border: 'border-indigo-500/50 hover:border-indigo-400',
    text: 'text-indigo-200',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    accent: '#6366F1',
    glow: 'shadow-indigo-500/20',
  },
  {
    bg: 'bg-amber-950/60 hover:bg-amber-950/80',
    border: 'border-amber-500/50 hover:border-amber-400',
    text: 'text-amber-200',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accent: '#F59E0B',
    glow: 'shadow-amber-500/20',
  },
  {
    bg: 'bg-sky-950/60 hover:bg-sky-950/80',
    border: 'border-sky-500/50 hover:border-sky-400',
    text: 'text-sky-200',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    accent: '#0EA5E9',
    glow: 'shadow-sky-500/20',
  },
  {
    bg: 'bg-purple-950/60 hover:bg-purple-950/80',
    border: 'border-purple-500/50 hover:border-purple-400',
    text: 'text-purple-200',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    accent: '#A855F7',
    glow: 'shadow-purple-500/20',
  },
  {
    bg: 'bg-rose-950/60 hover:bg-rose-950/80',
    border: 'border-rose-500/50 hover:border-rose-400',
    text: 'text-rose-200',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    accent: '#F43F5E',
    glow: 'shadow-rose-500/20',
  },
  {
    bg: 'bg-cyan-950/60 hover:bg-cyan-950/80',
    border: 'border-cyan-500/50 hover:border-cyan-400',
    text: 'text-cyan-200',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    accent: '#06B6D4',
    glow: 'shadow-cyan-500/20',
  },
  {
    bg: 'bg-orange-950/60 hover:bg-orange-950/80',
    border: 'border-orange-500/50 hover:border-orange-400',
    text: 'text-orange-200',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    accent: '#F97316',
    glow: 'shadow-orange-500/20',
  },
  {
    bg: 'bg-teal-950/60 hover:bg-teal-950/80',
    border: 'border-teal-500/50 hover:border-teal-400',
    text: 'text-teal-200',
    badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    accent: '#14B8A6',
    glow: 'shadow-teal-500/20',
  },
  {
    bg: 'bg-fuchsia-950/60 hover:bg-fuchsia-950/80',
    border: 'border-fuchsia-500/50 hover:border-fuchsia-400',
    text: 'text-fuchsia-200',
    badgeBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    accent: '#D946EF',
    glow: 'shadow-fuchsia-500/20',
  },
];

export function getCourseColor(courseCode: string): CourseColor {
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTES.length;
  return PALETTES[index];
}
