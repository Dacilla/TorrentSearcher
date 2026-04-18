import { ArrInfo } from '@/types';
import { requireEnv } from '@/lib/config/env';

async function radarrFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const RADARR_URL = requireEnv('RADARR_URL', 'Radarr');
  const RADARR_KEY = requireEnv('RADARR_API_KEY', 'Radarr');
  const url = new URL(`${RADARR_URL}/api/v3${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { 'X-Api-Key': RADARR_KEY },
  });
  if (!res.ok) throw new Error(`Radarr ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

interface RadarrMovie {
  tmdbId?: number;
  title: string;
  monitored: boolean;
  hasFile?: boolean;
  qualityProfileId?: number;
  rootFolderPath?: string;
}

export async function getMovieStatus(tmdbId: number): Promise<ArrInfo> {
  try {
    const movies = await radarrFetch<RadarrMovie[]>('/movie', { tmdbId: String(tmdbId) });
    if (!movies || movies.length === 0) {
      return { status: 'not-in-library' };
    }
    const m = movies[0];
    return { status: m.monitored ? 'monitored' : 'unmonitored' };
  } catch {
    return { status: 'error' };
  }
}

export async function lookupMovie(term: string): Promise<RadarrMovie[]> {
  return radarrFetch<RadarrMovie[]>('/movie/lookup', { term });
}

export async function addMovie(tmdbId: number, qualityProfileId: number, rootFolderPath: string): Promise<void> {
  const RADARR_URL = requireEnv('RADARR_URL', 'Radarr');
  const RADARR_KEY = requireEnv('RADARR_API_KEY', 'Radarr');
  const lookup = await radarrFetch<RadarrMovie[]>('/movie/lookup', {
    term: `tmdb:${tmdbId}`,
  });
  if (!lookup[0]) throw new Error('Movie not found in Radarr lookup');

  const body = {
    ...lookup[0],
    tmdbId,
    qualityProfileId,
    rootFolderPath,
    monitored: true,
    addOptions: { searchForMovie: true },
  };

  const res = await fetch(`${RADARR_URL}/api/v3/movie`, {
    method: 'POST',
    headers: { 'X-Api-Key': RADARR_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to add movie: ${res.status}`);
}

export async function getQualityProfiles(): Promise<Array<{ id: number; name: string }>> {
  return radarrFetch<Array<{ id: number; name: string }>>('/qualityprofile');
}

export async function getRootFolders(): Promise<Array<{ path: string }>> {
  return radarrFetch<Array<{ path: string }>>('/rootfolder');
}
