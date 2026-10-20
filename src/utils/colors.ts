// Curated accessible, vibrant light pastel palette for courses on white backgrounds
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
    bg: 'bg-orange-50 hover:bg-orange-100/70',
    border: 'border-orange-500',
    text: 'text-orange-950',
    badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
    accent: '#F26B21',
    glow: 'shadow-orange-500/10',
  },
  {
    bg: 'bg-sky-50 hover:bg-sky-100/70',
    border: 'border-sky-500',
    text: 'text-sky-950',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
    accent: '#0284C7',
    glow: 'shadow-sky-500/10',
  },
  {
    bg: 'bg-emerald-50 hover:bg-emerald-100/70',
    border: 'border-emerald-600',
    text: 'text-emerald-950',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    accent: '#059669',
    glow: 'shadow-emerald-500/10',
  },
  {
    bg: 'bg-violet-50 hover:bg-violet-100/70',
    border: 'border-violet-500',
    text: 'text-violet-950',
    badgeBg: 'bg-violet-100 text-violet-900 border-violet-300',
    accent: '#7C3AED',
    glow: 'shadow-violet-500/10',
  },
  {
    bg: 'bg-rose-50 hover:bg-rose-100/70',
    border: 'border-rose-500',
    text: 'text-rose-950',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    accent: '#E11D48',
    glow: 'shadow-rose-500/10',
  },
  {
    bg: 'bg-amber-50 hover:bg-amber-100/70',
    border: 'border-amber-600',
    text: 'text-amber-950',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    accent: '#D97706',
    glow: 'shadow-amber-500/10',
  },
  {
    bg: 'bg-teal-50 hover:bg-teal-100/70',
    border: 'border-teal-600',
    text: 'text-teal-950',
    badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
    accent: '#0D9488',
    glow: 'shadow-teal-500/10',
  },
  {
    bg: 'bg-indigo-50 hover:bg-indigo-100/70',
    border: 'border-indigo-600',
    text: 'text-indigo-950',
    badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    accent: '#4F46E5',
    glow: 'shadow-indigo-500/10',
  },
  {
    bg: 'bg-lime-50 hover:bg-lime-100/70',
    border: 'border-lime-600',
    text: 'text-lime-950',
    badgeBg: 'bg-lime-100 text-lime-900 border-lime-300',
    accent: '#65A30D',
    glow: 'shadow-lime-500/10',
  },
  {
    bg: 'bg-fuchsia-50 hover:bg-fuchsia-100/70',
    border: 'border-fuchsia-500',
    text: 'text-fuchsia-950',
    badgeBg: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300',
    accent: '#C026D3',
    glow: 'shadow-fuchsia-500/10',
  },
  {
    bg: 'bg-cyan-50 hover:bg-cyan-100/70',
    border: 'border-cyan-600',
    text: 'text-cyan-950',
    badgeBg: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    accent: '#0891B2',
    glow: 'shadow-cyan-500/10',
  },
  {
    bg: 'bg-purple-50 hover:bg-purple-100/70',
    border: 'border-purple-600',
    text: 'text-purple-950',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    accent: '#9333EA',
    glow: 'shadow-purple-500/10',
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
