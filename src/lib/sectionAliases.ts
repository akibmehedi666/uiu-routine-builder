import rawAliases from '../../data/section-id-aliases.json';

export const sectionIdAliases: Record<string, string> = rawAliases;

/**
 * Resolves an old or legacy section ID to its canonical ID.
 * Returns the resolved ID, or the original ID if no alias exists.
 */
export function resolveSectionId(id: string | null | undefined): string {
  if (!id) return '';
  const trimmed = id.trim();
  return sectionIdAliases[trimmed] || trimmed;
}

/**
 * Migrates a record whose keys are section IDs or values are section IDs
 * (e.g. lockedSections map: { courseCode: sectionId })
 */
export function migrateLockedSections(
  lockedSections: Record<string, string> | undefined
): Record<string, string> {
  if (!lockedSections || typeof lockedSections !== 'object') return {};
  const migrated: Record<string, string> = {};
  for (const [code, secId] of Object.entries(lockedSections)) {
    migrated[code] = resolveSectionId(secId);
  }
  return migrated;
}
