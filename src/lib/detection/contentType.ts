import { ContentType } from '@/types';

export interface DetectedContent {
  type: ContentType;
  season?: number;
  episode?: number;
  cleanQuery: string; // query with episode info stripped for TMDB search
}

export function normalizeQueryText(query: string): string {
  return query
    .replace(/[._\-+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .trim();
}

export function detectContentType(query: string): DetectedContent {
  const normalized = normalizeQueryText(query);
  // S01E02 pattern (allow S100+, spaced/dashed variants, S2 shorthand handled below)
  const seMatch = normalized.match(/\bS(\d{1,3})[\s\-_]?E(\d{1,3})\b/i)
    ?? query.match(/S(\d{1,3})E(\d{1,3})/i);
  if (seMatch) {
    return {
      type: 'tv',
      season: parseInt(seMatch[1], 10),
      episode: parseInt(seMatch[2], 10),
      cleanQuery: normalizeQueryText(query.replace(seMatch[0], ' ')),
    };
  }

  // NxNN pattern (e.g. 2x05, 1x1, 1x123 for anime)
  const epMatch = normalized.match(/\b(\d{1,3})x(\d{1,3})\b/i) ?? query.match(/\b(\d{1,2})x(\d{2})\b/);
  if (epMatch) {
    return {
      type: 'tv',
      season: parseInt(epMatch[1], 10),
      episode: parseInt(epMatch[2], 10),
      cleanQuery: normalizeQueryText(query.replace(epMatch[0], ' ')),
    };
  }

  // Season N pattern (Season 2, Season:2, Season02, S2)
  const seasonMatch = normalized.match(/\bSeason\s*:?\s*(\d{1,3})\b/i)
    ?? normalized.match(/\bS(\d{1,2})\b/i);
  if (seasonMatch) {
    const num = seasonMatch[1] ?? seasonMatch[0].replace(/\D/g, '');
    return {
      type: 'tv',
      season: parseInt(num, 10),
      cleanQuery: normalizeQueryText(query.replace(seasonMatch[0], ' ')),
    };
  }

  // Other TV indicators — extract season when present (Complete Season 2)
  const packMatch = normalized.match(/\bComplete\s+(?:Season\s*(\d{1,3})\s*)?(?:Series)?\b/i);
  if (packMatch || /\bComplete\s+Series\b/i.test(query) || /\bComplete\s+Season\b/i.test(query)) {
    const season = packMatch?.[1] ? parseInt(packMatch[1], 10) : undefined;
    return { type: 'tv', season, cleanQuery: normalizeQueryText(query.replace(/complete\s+(season|series)/gi, ' ')) };
  }

  return { type: 'unknown', cleanQuery: normalized || query.trim() };
}
