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
    const tvSearchParams = indexer.supportedParams?.tvSearch ?? [];
    const movieSearchParams = indexer.supportedParams?.movieSearch ?? [];
    const searchModes = indexer.searchModes ?? { basic: true, 'tv-search': false, 'movie-search': false };
    const indexerCats = Array.isArray(indexer.categories) ? indexer.categories : [];

    if (contentType === 'tv' && searchModes['tv-search']) {
      qParams.t = 'tvsearch';

      // Build category list from indexer's supported TV categories
      const supportedTV = TV_CATS.filter((c) => indexerCats.includes(c));
      categories.push(...(supportedTV.length > 0 ? supportedTV : TV_CATS));

      // ID-based search params
      if (mediaInfo?.tvdbId && tvSearchParams.includes('tvdbid')) {
        qParams.tvdbid = String(mediaInfo.tvdbId);
      } else if (mediaInfo?.imdbId && tvSearchParams.includes('imdbid')) {
        qParams.imdbid = mediaInfo.imdbId;
      } else {
        qParams.q = query;
      }

      if (season !== undefined) qParams.season = String(season);
      // Some trackers reject ep without season.
      if (episode !== undefined && season !== undefined) qParams.ep = String(episode);
    } else if (contentType === 'movie' && searchModes['movie-search']) {
      qParams.t = 'movie';

      const supportedMovies = MOVIE_CATS.filter((c) => indexerCats.includes(c));
      categories.push(...(supportedMovies.length > 0 ? supportedMovies : MOVIE_CATS));

      if (mediaInfo?.imdbId && movieSearchParams.includes('imdbid')) {
        qParams.imdbid = mediaInfo.imdbId;
      } else if (mediaInfo?.tmdbId && movieSearchParams.includes('tmdbid')) {
        qParams.tmdbid = String(mediaInfo.tmdbId);
      } else {
        qParams.q = query;
      }
    } else {
      // Fallback: basic search
      qParams.t = 'search';
      qParams.q = query;

      if (contentType === 'tv') {
        const supportedTV = TV_CATS.filter((c) => indexerCats.includes(c));
        categories.push(...(supportedTV.length > 0 ? supportedTV : TV_CATS));
      } else if (contentType === 'movie') {
        const supportedMovies = MOVIE_CATS.filter((c) => indexerCats.includes(c));
        categories.push(...(supportedMovies.length > 0 ? supportedMovies : MOVIE_CATS));
      }
    }

    return {
      indexerId: indexer.indexerId,
      indexerName: indexer.displayName,
      params: qParams,
      // For unknown type omit cat (broad search) instead of 20-cat fan-out.
      categories,
    };
  });

  // ── Step 3: Affinity sort (codec preference) ────────────────────────────────
  if (wantedCodec) {
    const want = wantedCodec.toUpperCase();
    const affinityMap = new Map(affinityCache.map((a) => [a.indexerId, a]));
    const scoreFor = (id: string): number => {
      const entry = affinityMap.get(id);
      if (!entry) return 0;
      // Case-insensitive codec lookup.
      for (const [k, v] of Object.entries(entry.codecScores)) {
        if (k.toUpperCase() === want) return v;
      }
      return 0;
    };
    queries.sort((a, b) => scoreFor(b.indexerId) - scoreFor(a.indexerId));
  }

  return queries;
}
