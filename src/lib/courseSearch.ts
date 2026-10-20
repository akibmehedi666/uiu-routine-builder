/**
 * Course search engine: indexing, tokenization, stemming, abbreviation generation,
 * aliases, typo tolerance (edit distance <= 1), and relevance ranking.
 */

import { Course, Section } from '../types';

export interface CourseSearchIndexEntry {
  code: string;
  normalizedCode: string; // "cse4509"
  spacedCode: string; // "cse 4509"
  title: string;
  normalizedTitle: string;
  titleTokens: string[];
  stemmedTitleTokens: string[];
  abbreviations: string[];
  aliases: string[];
  facultyNames: string[];
  facultyTokens: string[];
  isLab: boolean;
  pairedCourseCode?: string;
  sectionCount: number;
}

export interface CourseSearchResult {
  code: string;
  score: number;
  matchType: 'code-exact' | 'alias-exact' | 'code-prefix' | 'title-prefix' | 'title-word' | 'faculty' | 'typo' | 'other';
  matchDetail?: string; // e.g. "Matches alias: OS" or "Matches faculty: Md. Sajjad Hossain"
}

const STOPWORDS = new Set(['and', 'of', 'the', 'to', 'in', 'for', 'a', 'an', 'on', 'with', 'by']);

/**
 * Normalizes text for search indexing and queries:
 * Replaces '&' with 'and', strips diacritics/accents, converts to lowercase,
 * replaces non-alphanumeric chars with spaces, collapses whitespace.
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, ' and ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes normalized text into words.
 */
export function tokenizeSearchText(text: string): string[] {
  const norm = normalizeSearchText(text);
  return norm ? norm.split(' ').filter(Boolean) : [];
}

/**
 * Lightweight deterministic stemmer for English course titles:
 * Strips trailing 's' (if length > 3 and not ending in 'ss'),
 * e.g. "systems" -> "system", "networks" -> "network", "algorithms" -> "algorithm".
 */
export function stemToken(token: string): string {
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }
  return token;
}

/**
 * Converts roman numerals at word boundaries to digits and vice versa.
 */
function normalizeRomanNumerals(token: string): string {
  if (token === 'i') return '1';
  if (token === 'ii') return '2';
  if (token === 'iii') return '3';
  if (token === 'iv') return '4';
  return token;
}

/**
 * Generates initialisms / abbreviations from course titles.
 * Examples:
 * - "Operating Systems" -> ["os"]
 * - "Operating Systems Laboratory" -> ["osl", "os"]
 * - "Data Structure and Algorithms I" -> ["dsa", "dsai", "dsa1"]
 * - "Object Oriented Programming" -> ["oop"]
 */
export function generateAbbreviations(title: string): string[] {
  const norm = normalizeSearchText(title);
  const words = norm.split(' ').filter(Boolean);
  if (words.length === 0) return [];

  const abbrSet = new Set<string>();

  // Words excluding stopwords
  const meaningfulWords = words.filter((w) => !STOPWORDS.has(w));
  if (meaningfulWords.length === 0) return [];

  // 1. Raw initials of all meaningful words
  const fullInitials = meaningfulWords.map((w) => w[0]).join('');
  if (fullInitials) abbrSet.add(fullInitials);

  // 2. If title ends in 'laboratory' or 'lab', also generate without lab
  const nonLabWords = meaningfulWords.filter(
    (w) => w !== 'laboratory' && w !== 'lab'
  );
  if (nonLabWords.length > 0 && nonLabWords.length < meaningfulWords.length) {
    const nonLabInitials = nonLabWords.map((w) => w[0]).join('');
    if (nonLabInitials) abbrSet.add(nonLabInitials);
  }

  // 3. Handle trailing numerals (e.g. "Data Structure and Algorithms I" or "II")
  const lastWord = words[words.length - 1];
  const lastMeaningful = meaningfulWords[meaningfulWords.length - 1];

  const checkNumeralWord = (w: string, baseWords: string[]) => {
    const num = normalizeRomanNumerals(w);
    if (num !== w && /^[0-9]+$/.test(num)) {
      // It's a roman numeral like I or II
      const baseInitials = baseWords.slice(0, -1).map((x) => x[0]).join('');
      if (baseInitials) {
        abbrSet.add(baseInitials); // e.g. "dsa"
        abbrSet.add(baseInitials + w); // e.g. "dsai"
        abbrSet.add(baseInitials + num); // e.g. "dsa1"
      }
    } else if (/^[0-9]+$/.test(w)) {
      const baseInitials = baseWords.slice(0, -1).map((x) => x[0]).join('');
      if (baseInitials) {
        abbrSet.add(baseInitials);
        abbrSet.add(baseInitials + w);
      }
    }
  };

  checkNumeralWord(lastMeaningful, meaningfulWords);
  if (nonLabWords.length > 0) {
    const lastNonLab = nonLabWords[nonLabWords.length - 1];
    checkNumeralWord(lastNonLab, nonLabWords);
  }

  return Array.from(abbrSet);
}

/**
 * Curated domain aliases mapped to course codes.
 * Hand-verified against data/courses.json.
 */
export const HANDWRITTEN_ALIASES: Record<string, string[]> = {
  os: ['CSE 4509', 'CSE 4510'],
  dsa: ['CSE 2215', 'CSE 2216', 'CSE 2217', 'CSE 2218'],
  algo: ['CSE 2215', 'CSE 2216', 'CSE 2217', 'CSE 2218'],
  oop: ['CSE 1115', 'CSE 1116', 'CSE 2118', 'DS 1115', 'DS 1116'],
  spl: ['CSE 1111', 'CSE 1112'],
  db: ['CSE 3521', 'CSE 3522'],
  dbms: ['CSE 3521', 'CSE 3522'],
  ai: ['CSE 3811', 'CSE 3812', 'GED 1005'],
  cn: ['CSE 3711', 'CSE 3712'],
  se: ['CSE 3421', 'CSE 3422'],
  dld: ['CSE 1325', 'CSE 1326'],
  coa: ['CSE 3313'],
  ca: ['CSE 3313'],
  toc: ['CSE 2233'],
  automata: ['CSE 2233'],
  compiler: ['CSE 4611'],
  fydp: ['CSE 4000A', 'CSE 4000B', 'CSE 4000C'],
  project: ['CSE 4000A', 'CSE 4000B', 'CSE 4000C', 'DS 4000A'],
  thesis: ['CSE 4000A', 'CSE 4000B', 'CSE 4000C', 'DS 4000A'],
  capstone: ['DS 4000A'],
  sqa: ['CSE 4495'],
  stqa: ['CSE 4495'],
  testing: ['CSE 4495'],
  vlsi: ['CSE 4327'],
  hci: ['CSE 4451', 'DS 4123'],
  nlp: ['CSE 4811', 'DS 4213'],
  ml: ['CSE 4889', 'DS 4889', 'DS 4491', 'CSE 4399'],
  dl: ['CSE 4813', 'DS 4211'],
  dip: ['CSE 4883'],
  graphics: ['CSE 4883'],
  security: ['CSE 4531', 'CSE 4777', 'CSE 4125'],
  network: ['CSE 3711', 'CSE 3712', 'CSE 4777', 'CSE 4125'],
  cloud: ['CSE 4587'],
  microprocessor: ['CSE 4325', 'CSE 4326'],
  microcontroller: ['CSE 4325', 'CSE 4326'],
  web: ['CSE 4165'],
  webdev: ['CSE 4165'],
  mobile: ['CSE 4181'],
  android: ['CSE 4181'],
  dm: ['CSE 2213', 'CSE 4891'],
  ds: ['CSE 2213'], // Discrete Mathematics
  discrete: ['CSE 2213'],
  bds: ['BDS 1201'],
  accounting: ['ACT 2111'],
  economics: ['ECO 4101'],
};

/**
 * Calculates Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val = row[j - 1];
      if (a[i - 1] !== b[j - 1]) {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

/**
 * Calculates Damerau-Levenshtein edit distance (allowing adjacent character transpositions).
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const la = a.length;
  const lb = b.length;
  const d: number[][] = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));

  for (let i = 0; i <= la; i++) d[i][0] = i;
  for (let j = 0; j <= lb; j++) d[0][j] = j;

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
      }
    }
  }

  return d[la][lb];
}

/**
 * Natural alphabetical and numeric sorting for course codes:
 * E.g. ACT 2111 < BDS 1201 < CSE 1110 < CSE 1111 < CSE 2215 < CSE 4509 < DS 1101
 */
export function naturalCourseCodeSort(aCode: string, bCode: string): number {
  const parseCode = (str: string) => {
    const trimmed = str.trim();
    const match = trimmed.match(/^([A-Za-z]+)\s*(\d+)([A-Za-z]*)$/);
    if (match) {
      return {
        prefix: match[1].toUpperCase(),
        num: parseInt(match[2], 10),
        suffix: match[3].toUpperCase(),
      };
    }
    return { prefix: trimmed.toUpperCase(), num: 0, suffix: '' };
  };

  const a = parseCode(aCode);
  const b = parseCode(bCode);

  if (a.prefix !== b.prefix) {
    return a.prefix.localeCompare(b.prefix);
  }
  if (a.num !== b.num) {
    return a.num - b.num;
  }
  return a.suffix.localeCompare(b.suffix);
}

/**
 * Builds the course search index once.
 */
export function buildCourseSearchIndex(
  courses: Course[],
  sections: Section[]
): Map<string, CourseSearchIndexEntry> {
  // Collect faculty by courseCode
  const facultyByCourse = new Map<string, Set<string>>();
  const sectionCountByCourse = new Map<string, number>();

  for (const s of sections) {
    if (!facultyByCourse.has(s.courseCode)) {
      facultyByCourse.set(s.courseCode, new Set());
    }
    if (s.faculty) {
      for (const fac of s.faculty) {
        if (fac && fac !== 'TBA') {
          facultyByCourse.get(s.courseCode)!.add(fac);
        }
      }
    }
    sectionCountByCourse.set(
      s.courseCode,
      (sectionCountByCourse.get(s.courseCode) || 0) + 1
    );
  }

  // Invert handwritten aliases into courseCode -> alias list
  const aliasesByCourse = new Map<string, Set<string>>();
  for (const [alias, courseCodes] of Object.entries(HANDWRITTEN_ALIASES)) {
    for (const cCode of courseCodes) {
      if (!aliasesByCourse.has(cCode)) {
        aliasesByCourse.set(cCode, new Set());
      }
      aliasesByCourse.get(cCode)!.add(alias.toLowerCase());
    }
  }

  const index = new Map<string, CourseSearchIndexEntry>();

  for (const c of courses) {
    const normCode = c.code.toLowerCase().replace(/[^a-z0-9]/g, '');
    const spacedCode = c.code.toLowerCase().replace(/\s+/g, ' ').trim();
    const normTitle = normalizeSearchText(c.title);
    const titleTokens = normTitle.split(' ').filter(Boolean);
    const stemmedTitleTokens = titleTokens.map(stemToken);
    const abbreviations = generateAbbreviations(c.title);

    const facultySet = facultyByCourse.get(c.code) || new Set();
    const facultyNames = Array.from(facultySet);
    const facultyTokens = facultyNames.flatMap((name) =>
      normalizeSearchText(name).split(' ').filter(Boolean)
    );

    const aliases = Array.from(aliasesByCourse.get(c.code) || []);

    const isLab =
      c.credit <= 2 &&
      (normTitle.includes('laboratory') ||
        normTitle.includes('lab') ||
        c.code.endsWith('2') ||
        c.code.endsWith('4') ||
        c.code.endsWith('6') ||
        c.code.endsWith('8'));

    index.set(c.code, {
      code: c.code,
      normalizedCode: normCode,
      spacedCode,
      title: c.title,
      normalizedTitle: normTitle,
      titleTokens,
      stemmedTitleTokens,
      abbreviations,
      aliases,
      facultyNames,
      facultyTokens,
      isLab,
      pairedCourseCode: c.labCode || c.theoryCode,
      sectionCount: sectionCountByCourse.get(c.code) || 0,
    });
  }

  return index;
}

/**
 * Builds the course search index from CourseDirectoryItem objects.
 */
export function buildSearchIndexFromDirectory(
  courses: {
    code: string;
    title: string;
    isLab: boolean;
    facultyNames: string[];
    sectionCount: number;
    labCode?: string;
    theoryCode?: string;
  }[]
): Map<string, CourseSearchIndexEntry> {
  const aliasesByCourse = new Map<string, Set<string>>();
  for (const [alias, courseCodes] of Object.entries(HANDWRITTEN_ALIASES)) {
    for (const cCode of courseCodes) {
      if (!aliasesByCourse.has(cCode)) {
        aliasesByCourse.set(cCode, new Set());
      }
      aliasesByCourse.get(cCode)!.add(alias.toLowerCase());
    }
  }

  const index = new Map<string, CourseSearchIndexEntry>();

  for (const c of courses) {
    const normCode = c.code.toLowerCase().replace(/[^a-z0-9]/g, '');
    const spacedCode = c.code.toLowerCase().replace(/\s+/g, ' ').trim();
    const normTitle = normalizeSearchText(c.title);
    const titleTokens = normTitle.split(' ').filter(Boolean);
    const stemmedTitleTokens = titleTokens.map(stemToken);
    const abbreviations = generateAbbreviations(c.title);

    const facultyNames = c.facultyNames || [];
    const facultyTokens = facultyNames.flatMap((name) =>
      normalizeSearchText(name).split(' ').filter(Boolean)
    );

    const aliases = Array.from(aliasesByCourse.get(c.code) || []);

    index.set(c.code, {
      code: c.code,
      normalizedCode: normCode,
      spacedCode,
      title: c.title,
      normalizedTitle: normTitle,
      titleTokens,
      stemmedTitleTokens,
      abbreviations,
      aliases,
      facultyNames,
      facultyTokens,
      isLab: c.isLab,
      pairedCourseCode: c.labCode || c.theoryCode,
      sectionCount: c.sectionCount,
    });
  }

  return index;
}

/**
 * Searches and ranks courses matching a query using the search index.
 */
export function searchCourses(
  query: string,
  index: Map<string, CourseSearchIndexEntry>
): CourseSearchResult[] {
  if (!query || !query.trim()) return [];

  const rawQuery = query.trim();
  const qNorm = normalizeSearchText(rawQuery);
  const qCompact = rawQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
  const qTokens = qNorm.split(' ').filter(Boolean);

  if (qTokens.length === 0 && !qCompact) return [];

  let results: CourseSearchResult[] = [];
  const isShortQuery = rawQuery.length <= 3 && qTokens.length <= 1;

  for (const [code, entry] of index.entries()) {
    let score = 0;
    let matchType: CourseSearchResult['matchType'] = 'other';
    let matchDetail: string | undefined;

    // 1. Exact code match (e.g. "cse4509", "cse 4509", "cse-4509")
    if (
      entry.normalizedCode === qCompact ||
      entry.spacedCode === qNorm ||
      entry.code.toLowerCase() === rawQuery.toLowerCase()
    ) {
      score = 1000;
      matchType = 'code-exact';
    }
    // 2. Exact alias or abbreviation match (e.g. "os", "dsa", "oop")
    else if (
      entry.aliases.includes(qCompact) ||
      entry.abbreviations.includes(qCompact)
    ) {
      score = 800;
      matchType = 'alias-exact';
      const aliasLabel = entry.aliases.includes(qCompact)
        ? qCompact.toUpperCase()
        : entry.abbreviations.find((a) => a === qCompact)?.toUpperCase() || qCompact.toUpperCase();
      matchDetail = `Matches: ${aliasLabel}`;
    }
    // 3. Code prefix match (e.g. "cse 45", "cse45", "4509")
    else if (
      entry.normalizedCode.startsWith(qCompact) ||
      entry.spacedCode.startsWith(qNorm) ||
      entry.normalizedCode.includes(qCompact)
    ) {
      score = 650;
      matchType = 'code-prefix';
    }
    // 4. Exact full title match or title starts with query
    else if (entry.normalizedTitle.startsWith(qNorm)) {
      score = 500;
      matchType = 'title-prefix';
    } else {
      // Token-level evaluation (AND logic: every query token must match something)
      let allTokensMatched = true;
      let matchedViaFaculty = false;
      let matchedFacultyName = '';
      let matchedTitleWords = 0;

      for (const qToken of qTokens) {
        const qStem = stemToken(qToken);
        let tokenMatched = false;

        // Code prefix
        if (entry.normalizedCode.includes(qToken)) {
          tokenMatched = true;
        }

        // Title token prefix or stemmed equality
        if (!tokenMatched) {
          for (let i = 0; i < entry.titleTokens.length; i++) {
            const tToken = entry.titleTokens[i];
            const tStem = entry.stemmedTitleTokens[i];

            if (tToken.startsWith(qToken) || tStem === qStem || tStem.startsWith(qStem)) {
              tokenMatched = true;
              matchedTitleWords++;
              break;
            }
          }
        }

        // Abbreviation prefix (only for >= 3 chars or exact 2 chars)
        if (!tokenMatched) {
          for (const abbr of entry.abbreviations) {
            if (abbr === qToken || (qToken.length >= 3 && abbr.startsWith(qToken))) {
              tokenMatched = true;
              break;
            }
          }
        }

        // Alias equality or prefix
        if (!tokenMatched) {
          for (const alias of entry.aliases) {
            if (alias === qToken || (qToken.length >= 3 && alias.startsWith(qToken))) {
              tokenMatched = true;
              break;
            }
          }
        }

        // Faculty prefix (STRICT: only if query token >= 3 chars to avoid noise like "os" matching "Hossain")
        if (!tokenMatched && !isShortQuery) {
          for (let i = 0; i < entry.facultyTokens.length; i++) {
            const fToken = entry.facultyTokens[i];
            if (fToken.startsWith(qToken)) {
              tokenMatched = true;
              matchedViaFaculty = true;
              // Find full faculty name
              const foundFac = entry.facultyNames.find((name) =>
                normalizeSearchText(name).includes(fToken)
              );
              if (foundFac) matchedFacultyName = foundFac;
              break;
            }
          }
        }

        if (!tokenMatched) {
          allTokensMatched = false;
          break;
        }
      }

      if (allTokensMatched) {
        if (matchedViaFaculty) {
          score = 200 + matchedTitleWords * 20;
          matchType = 'faculty';
          matchDetail = matchedFacultyName
            ? `Matches faculty: ${matchedFacultyName}`
            : 'Matches faculty';
        } else {
          score = 350 + matchedTitleWords * 30;
          matchType = 'title-word';
        }
      }
    }

    // Theory course slight priority over paired lab course on same score
    if (score > 0) {
      if (!entry.isLab) {
        score += 5;
      }
      results.push({
        code,
        score,
        matchType,
        matchDetail,
      });
    }
  }

  // Typo tolerance: If no results found and query length >= 4, retry with edit distance <= 1
  if (results.length === 0 && rawQuery.length >= 4) {
    for (const [code, entry] of index.entries()) {
      let typoMatched = false;
      for (const tToken of entry.titleTokens) {
        if (Math.abs(tToken.length - qNorm.length) <= 1) {
          const dist = Math.min(
            levenshteinDistance(qNorm, tToken),
            damerauLevenshteinDistance(qNorm, tToken)
          );
          if (dist <= 1) {
            typoMatched = true;
            break;
          }
        }
      }

      if (!typoMatched && qTokens.length > 1) {
        // Test token-by-token distance
        let allClose = true;
        for (const qTok of qTokens) {
          if (qTok.length < 4) continue;
          let close = false;
          for (const tTok of entry.titleTokens) {
            const dist = Math.min(
              levenshteinDistance(qTok, tTok),
              damerauLevenshteinDistance(qTok, tTok)
            );
            if (Math.abs(tTok.length - qTok.length) <= 1 && dist <= 1) {
              close = true;
              break;
            }
          }
          if (!close) {
            allClose = false;
            break;
          }
        }
        if (allClose) typoMatched = true;
      }

      if (typoMatched) {
        results.push({
          code,
          score: 180,
          matchType: 'typo',
          matchDetail: 'Typo match',
        });
      }
    }
  }

  // Sort by score descending, tie-break by natural course code
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return naturalCourseCodeSort(a.code, b.code);
  });

  // Relevance cutoff:
  // 1. Exact code match: if any course matches exactly (e.g. "cse 4509", "cse4509"), return ONLY exact code matches
  const exactCodeMatches = results.filter((r) => r.matchType === 'code-exact');
  if (exactCodeMatches.length > 0) {
    return exactCodeMatches;
  }

  // 2. Code prefix match: if query looks like a course code prefix (e.g. "cse 45", "cse45", "cse") and code-prefix matches exist
  const isCodeLikeQuery =
    /^[a-z]{2,4}\s*[0-9]*$/i.test(rawQuery) || /^[0-9]+$/.test(rawQuery);
  const codePrefixMatches = results.filter((r) => r.matchType === 'code-prefix');
  if (isCodeLikeQuery && codePrefixMatches.length > 0) {
    results = codePrefixMatches;
  } else {
    // 3. Score threshold: drop weak matches (faculty-only or typo hits) when at least one strong match exists
    const hasStrongMatch = results.some(
      (r) =>
        r.matchType === 'alias-exact' ||
        r.matchType === 'code-prefix' ||
        r.matchType === 'title-prefix' ||
        r.matchType === 'title-word'
    );
    if (hasStrongMatch) {
      results = results.filter(
        (r) => r.matchType !== 'faculty' && r.matchType !== 'typo' && r.score >= 350
      );
    }
  }

  // Deduplicate results by course code
  const seenCodes = new Set<string>();
  const dedupedResults: CourseSearchResult[] = [];
  for (const r of results) {
    if (!seenCodes.has(r.code)) {
      seenCodes.add(r.code);
      dedupedResults.push(r);
    }
  }

  return dedupedResults;
}
