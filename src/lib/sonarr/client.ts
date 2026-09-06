import { ArrInfo } from '@/types';
import { requireEnv } from '@/lib/config/env';
import { fetchWithTimeout, normalizeBaseUrl } from '@/lib/http/fetch';

async function sonarrFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const SONARR_URL = normalizeBaseUrl(requireEnv('SONARR_URL', 'Sonarr'));
  const SONARR_KEY = requireEnv('SONARR_API_KEY', 'Sonarr');
  const url = new URL(`${SONARR_URL}/api/v3${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetchWithTimeout(url.toString(), {
    headers: { 'X-Api-Key': SONARR_KEY },
  });
  if (!res.ok) throw new Error(`Sonarr ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

interface SonarrSeries {
  tvdbId?: number;
  title: string;
  monitored: boolean;
  qualityProfileId?: number;
  rootFolderPath?: string;
  statistics?: {
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
    previousAiring?: string;
    nextAiring?: string;
  };
}

export async function getSeriesStatus(tvdbId: number): Promise<ArrInfo> {
  try {
    const series = await sonarrFetch<SonarrSeries[]>('/series', { tvdbId: String(tvdbId) });
    if (!series || series.length === 0) {
      return { status: 'not-in-library' };
    }
    const s = series[0];
    const stats = s.statistics;
    const missing = stats ? stats.totalEpisodeCount - stats.episodeFileCount : undefined;

    return {
      status: s.monitored ? 'monitored' : 'unmonitored',
      missingEpisodes: missing && missing > 0 ? missing : undefined,
    };
  } catch (e) {
    console.error('[sonarr] getSeriesStatus failed:', e);
    return { status: 'error' };
  }
}

export async function lookupSeries(term: string): Promise<SonarrSeries[]> {
  return sonarrFetch<SonarrSeries[]>('/series/lookup', { term });
}

export async function addSeries(tvdbId: number, qualityProfileId: number, rootFolderPath: string): Promise<void> {
  const SONARR_URL = normalizeBaseUrl(requireEnv('SONARR_URL', 'Sonarr'));
  const SONARR_KEY = requireEnv('SONARR_API_KEY', 'Sonarr');
  const lookup = await sonarrFetch<SonarrSeries[]>('/series/lookup', {
    term: `tvdb:${tvdbId}`,
  });
  if (!lookup[0]) throw new Error('Series not found in Sonarr lookup');

  const body = {
    ...lookup[0],
    tvdbId,
    qualityProfileId,
    rootFolderPath,
    monitored: true,
    addOptions: { searchForMissingEpisodes: true },
  };

  const res = await fetchWithTimeout(`${SONARR_URL}/api/v3/series`, {
    method: 'POST',
    headers: { 'X-Api-Key': SONARR_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to add series: ${res.status}`);
}

export async function getQualityProfiles(): Promise<Array<{ id: number; name: string }>> {
  return sonarrFetch<Array<{ id: number; name: string }>>('/qualityprofile');
}

export async function getRootFolders(): Promise<Array<{ path: string }>> {
  return sonarrFetch<Array<{ path: string }>>('/rootfolder');
}
