/**
 * Formats a count with singular/plural noun (e.g. plural(1, 'section') -> '1 section').
 */
export function plural(n: number, singular: string, pluralForm?: string): string {
  const word = n === 1 ? singular : pluralForm || `${singular}s`;
  return `${n} ${word}`;
}
