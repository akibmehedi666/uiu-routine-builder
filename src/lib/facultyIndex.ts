/**
 * Faculty index helper utilities retained for slugification, normalization, and collision resolution.
 */

/**
 * Deterministically generates a URL-safe slug from a faculty name.
 */
export function slugifyFacultyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolves duplicate slug collisions deterministically by appending a counter (-2, -3, etc.).
 */
export function resolveSlugCollisions(names: string[]): Map<string, string> {
  const result = new Map<string, string>();
  const counts = new Map<string, number>();

  for (const name of names) {
    const baseSlug = slugifyFacultyName(name) || 'faculty';
    const count = counts.get(baseSlug) || 0;
    counts.set(baseSlug, count + 1);

    if (count === 0) {
      result.set(name, baseSlug);
    } else {
      result.set(name, `${baseSlug}-${count + 1}`);
    }
  }

  return result;
}

/**
 * Normalizes text for search indexing by stripping accents, punctuation, and excess spaces.
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
