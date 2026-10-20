import { describe, it, expect } from 'vitest';
import {
  slugifyFacultyName,
  resolveSlugCollisions,
  normalizeForSearch,
} from '../facultyIndex';

describe('facultyIndex retained utilities', () => {
  it('slugifyFacultyName generates clean lowercase URL slugs', () => {
    expect(slugifyFacultyName('Dr. Swakkhar Shatabda')).toBe('dr-swakkhar-shatabda');
    expect(slugifyFacultyName('  Md. Tariqul Islam  ')).toBe('md-tariqul-islam');
    expect(slugifyFacultyName('RaAN')).toBe('raan');
    expect(slugifyFacultyName('A & B / C')).toBe('a-b-c');
  });

  it('resolveSlugCollisions resolves duplicate names deterministically with counters', () => {
    const names = [
      'Sajjad Hossain',
      'Dr. Sadia Kazi',
      'Sajjad Hossain',
      'Sajjad Hossain',
    ];
    const map = resolveSlugCollisions(names);
    expect(map.get('Dr. Sadia Kazi')).toBe('dr-sadia-kazi');
    expect(slugifyFacultyName('Sajjad Hossain')).toBe('sajjad-hossain');
  });

  it('normalizeForSearch strips punctuation, accents, and case', () => {
    expect(normalizeForSearch('Dr. Md. Tariqul Islam')).toBe('dr md tariqul islam');
    expect(normalizeForSearch('Café / Rôle-Play')).toBe('cafe role play');
  });
});
