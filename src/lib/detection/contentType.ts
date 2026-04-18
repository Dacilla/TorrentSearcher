import { ContentType } from '@/types';

export interface DetectedContent {
  type: ContentType;
  season?: number;
  episode?: number;
  cleanQuery: string; // query with episode info stripped for TMDB search
}

export function detectContentType(query: string): DetectedContent {
  // S01E02 pattern
  const seMatch = query.match(/S(\d{1,2})E(\d{1,2})/i);
  if (seMatch) {
    return {
      type: 'tv',
      season: parseInt(seMatch[1], 10),
      episode: parseInt(seMatch[2], 10),
      cleanQuery: query.replace(seMatch[0], '').trim(),
    };
  }

  // NxNN pattern (e.g. 2x05)
  const epMatch = query.match(/\b(\d{1,2})x(\d{2})\b/);
  if (epMatch) {
    return {
      type: 'tv',
      season: parseInt(epMatch[1], 10),
      episode: parseInt(epMatch[2], 10),
      cleanQuery: query.replace(epMatch[0], '').trim(),
    };
  }

  // Season N pattern
  const seasonMatch = query.match(/Season\s+(\d{1,2})/i);
  if (seasonMatch) {
    return {
      type: 'tv',
      season: parseInt(seasonMatch[1], 10),
      cleanQuery: query.replace(seasonMatch[0], '').trim(),
    };
  }

  // Other TV indicators
  if (/\bComplete\s+Series\b/i.test(query) || /\bComplete\s+Season\b/i.test(query)) {
    return { type: 'tv', cleanQuery: query };
  }

  return { type: 'unknown', cleanQuery: query };
}
