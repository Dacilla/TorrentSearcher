import { IndexerCapabilities, IndexerQuery, MediaInfo, ContentType, IndexerAffinity } from '@/types';

interface RouteParams {
  query: string;
  contentType: ContentType;
  mediaInfo?: MediaInfo;
  season?: number;
  episode?: number;
  wantedCodec?: string; // e.g. 'AV1' — used for affinity sorting
}

const TV_CATS = [5000, 5010, 5020, 5030, 5040, 5045, 5050, 5060, 5070, 5080];
const MOVIE_CATS = [2000, 2010, 2020, 2030, 2040, 2045, 2050, 2060, 2070, 2080];

export function selectIndexers(
  caps: IndexerCapabilities[],
  params: RouteParams,
  affinityCache: IndexerAffinity[] = []
): IndexerQuery[] {
  const { query, contentType, mediaInfo, season, episode, wantedCodec } = params;

  // ── Step 1: Filter by content type ─────────────────────────────────────────
  const eligible = caps.filter((c) => {
    if (contentType === 'tv') return c.supportsTV;
    if (contentType === 'movie') return c.supportsMovies;
    return true; // unknown — include all
  });

  // ── Step 2: Build per-indexer query params ──────────────────────────────────
  const queries: IndexerQuery[] = eligible.map((indexer) => {
    const qParams: Record<string, string> = {};
    const categories: number[] = [];

    if (contentType === 'tv' && indexer.searchModes['tv-search']) {
      qParams.t = 'tvsearch';

      // Build category list from indexer's supported TV categories
      const supportedTV = TV_CATS.filter((c) => indexer.categories.includes(c));
      categories.push(...(supportedTV.length > 0 ? supportedTV : TV_CATS));

      // ID-based search params
      if (mediaInfo?.tvdbId && indexer.supportedParams.tvSearch.includes('tvdbid')) {
        qParams.tvdbid = String(mediaInfo.tvdbId);
      } else if (mediaInfo?.imdbId && indexer.supportedParams.tvSearch.includes('imdbid')) {
        qParams.imdbid = mediaInfo.imdbId;
      } else {
        qParams.q = query;
      }

      if (season !== undefined) qParams.season = String(season);
      if (episode !== undefined) qParams.ep = String(episode);
    } else if (contentType === 'movie' && indexer.searchModes['movie-search']) {
      qParams.t = 'movie';

      const supportedMovies = MOVIE_CATS.filter((c) => indexer.categories.includes(c));
      categories.push(...(supportedMovies.length > 0 ? supportedMovies : MOVIE_CATS));

      if (mediaInfo?.imdbId && indexer.supportedParams.movieSearch.includes('imdbid')) {
        qParams.imdbid = mediaInfo.imdbId;
      } else if (mediaInfo?.tmdbId && indexer.supportedParams.movieSearch.includes('tmdbid')) {
        qParams.tmdbid = String(mediaInfo.tmdbId);
      } else {
        qParams.q = query;
      }
    } else {
      // Fallback: basic search
      qParams.t = 'search';
      qParams.q = query;

      if (contentType === 'tv') {
        const supportedTV = TV_CATS.filter((c) => indexer.categories.includes(c));
        categories.push(...(supportedTV.length > 0 ? supportedTV : TV_CATS));
      } else if (contentType === 'movie') {
        const supportedMovies = MOVIE_CATS.filter((c) => indexer.categories.includes(c));
        categories.push(...(supportedMovies.length > 0 ? supportedMovies : MOVIE_CATS));
      }
    }

    return {
      indexerId: indexer.indexerId,
      indexerName: indexer.displayName,
      params: qParams,
      categories: categories.length > 0 ? categories : [...TV_CATS, ...MOVIE_CATS],
    };
  });

  // ── Step 3: Affinity sort (codec preference) ────────────────────────────────
  if (wantedCodec) {
    const affinityMap = new Map(affinityCache.map((a) => [a.indexerId, a]));
    queries.sort((a, b) => {
      const scoreA = affinityMap.get(a.indexerId)?.codecScores[wantedCodec] ?? 0;
      const scoreB = affinityMap.get(b.indexerId)?.codecScores[wantedCodec] ?? 0;
      return scoreB - scoreA;
    });
  }

  return queries;
}
