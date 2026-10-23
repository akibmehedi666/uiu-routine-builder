import rawAliases from '../../data/faculty-id-aliases.json';

export const facultyIdAliases: Record<string, string> = rawAliases;

/**
 * Resolves an old or existing faculty ID to its canonical ID.
 * Returns the resolved ID, or the original ID if no alias exists.
 */
export function resolveFacultyId(id: string | null | undefined): string {
  if (!id) return '';
  const trimmed = id.trim();
  return facultyIdAliases[trimmed] || trimmed;
}

/**
 * Migrates an array of faculty IDs (e.g., pinned faculty, filter lists)
 * mapping any old IDs to canonical IDs and deduplicating.
 */
export function migrateFacultyIdArray(ids: string[]): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const migrated: string[] = [];
  for (const id of ids) {
    const resolved = resolveFacultyId(id);
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved);
      migrated.push(resolved);
    }
  }
  return migrated;
}

/**
 * Migrates a record whose keys are faculty IDs (e.g. preferences map)
 * remapping any old keys to the new canonical keys.
 */
export function migrateFacultyIdRecord<T>(record: Record<string, T>): Record<string, T> {
  if (!record || typeof record !== 'object') return {};
  const migrated: Record<string, T> = {};
  for (const [key, value] of Object.entries(record)) {
    const resolved = resolveFacultyId(key);
    migrated[resolved] = value;
  }
  return migrated;
}
