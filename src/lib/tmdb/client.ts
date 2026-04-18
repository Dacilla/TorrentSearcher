import { MediaInfo, ContentType } from '@/types';
import { requireEnv } from '@/lib/config/env';

const TMDB_BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const TMDB_KEY = requireEnv('TMDB_API_KEY', 'TMDB');
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', TMDB_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

interface TmdbMultiResult {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string;
  vote_average?: number;
  genre_ids?: number[];
}

interface TmdbExternalIds {
  imdb_id?: string;
  tvdb_id?: number;
}

interface TmdbTvDetails {
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  genres?: Array<{ id: number; name: string }>;
}

export async function searchMedia(
  query: string,
  hintType: ContentType = 'unknown'
): Promise<MediaInfo | null> {
  if (!query.trim()) return null;

  let results: TmdbMultiResult[] = [];

  if (hintType === 'tv') {
    const data = await tmdbFetch<{ results: TmdbMultiResult[] }>('/search/tv', { query });
    results = data.results.map((r) => ({ ...r, media_type: 'tv' }));
  } else if (hintType === 'movie') {
    const data = await tmdbFetch<{ results: TmdbMultiResult[] }>('/search/movie', { query });
    results = data.results.map((r) => ({ ...r, media_type: 'movie' }));
  } else {
    const data = await tmdbFetch<{ results: TmdbMultiResult[] }>('/search/multi', { query });
    results = data.results.filter((r) => r.media_type === 'movie' || r.media_type === 'tv');
  }

  if (results.length === 0) return null;
  const top = results[0];

  return buildMediaInfo(top);
}

async function buildMediaInfo(top: TmdbMultiResult): Promise<MediaInfo> {
  const contentType: ContentType = top.media_type === 'tv' ? 'tv' : 'movie';
  const title = top.title ?? top.name ?? '';
  const yearStr = top.release_date ?? top.first_air_date ?? '';
  const year = yearStr ? parseInt(yearStr.slice(0, 4), 10) : undefined;

  const extPath = contentType === 'tv' ? `/tv/${top.id}/external_ids` : `/movie/${top.id}/external_ids`;
  const detailsPath = contentType === 'tv' ? `/tv/${top.id}` : `/movie/${top.id}`;

  const [externalIds, details] = await Promise.all([
    tmdbFetch<TmdbExternalIds>(extPath).catch(() => ({} as TmdbExternalIds)),
    tmdbFetch<TmdbTvDetails & { genres?: Array<{ id: number; name: string }> }>(detailsPath).catch(
      () => ({} as TmdbTvDetails & { genres?: Array<{ id: number; name: string }> })
    ),
  ]);

  const genres = details.genres?.map((g) => g.name) ?? [];
  const tvDetails = contentType === 'tv' ? details : {};

  return {
    contentType,
    title,
    year,
    overview: top.overview,
    posterPath: top.poster_path ?? undefined,
    tmdbId: top.id,
    imdbId: externalIds.imdb_id ?? undefined,
    tvdbId: externalIds.tvdb_id ?? undefined,
    rating: top.vote_average,
    genres,
    seasons: tvDetails.number_of_seasons,
    episodeCount: tvDetails.number_of_episodes,
    status: tvDetails.status,
  };
}
