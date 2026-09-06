import { NextRequest, NextResponse } from 'next/server';
import { getEnv, getServiceConfigStatus } from '@/lib/config/env';

type CheckState = 'ok' | 'missing-config' | 'error' | 'skipped';

async function checkFetch(
  configured: boolean,
  url: string | undefined,
  init?: RequestInit
): Promise<{ state: CheckState; message?: string }> {
  if (!configured) return { state: 'missing-config' };
  if (!url) return { state: 'skipped' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    if (!res.ok) return { state: 'error', message: `HTTP ${res.status}` };
    return { state: 'ok' };
  } catch (error) {
    return { state: 'error', message: error instanceof Error ? error.message : 'Request failed' };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const services = getServiceConfigStatus();
  const shouldCheck = req.nextUrl.searchParams.get('check') === 'true';

  const checks: Record<string, { state: CheckState; message?: string }> = {};

  if (shouldCheck) {
    const byName = new Map(services.map((s) => [s.name, s]));
    const jackett = byName.get('jackett');
    const tmdb = byName.get('tmdb');
    const sonarr = byName.get('sonarr');
    const radarr = byName.get('radarr');
    if (!jackett || !tmdb || !sonarr || !radarr) {
      return NextResponse.json({ error: 'Service registry misconfigured' }, { status: 500 });
    }

    const [j, t, s, r] = await Promise.all([
      checkFetch(
        jackett.configured,
        getEnv('JACKETT_URL') && getEnv('JACKETT_API_KEY')
          ? `${getEnv('JACKETT_URL')}/api/v2.0/indexers/all/results/torznab/api?t=indexers&configured=true&apikey=${getEnv('JACKETT_API_KEY')}`
          : undefined,
        { headers: { Accept: 'text/xml' } }
      ),
      checkFetch(
        tmdb.configured,
        getEnv('TMDB_API_KEY')
          ? `https://api.themoviedb.org/3/configuration?api_key=${getEnv('TMDB_API_KEY')}`
          : undefined
      ),
      checkFetch(
        sonarr.configured,
        getEnv('SONARR_URL') ? `${getEnv('SONARR_URL')}/api/v3/system/status` : undefined,
        { headers: { 'X-Api-Key': getEnv('SONARR_API_KEY') ?? '' } }
      ),
      checkFetch(
        radarr.configured,
        getEnv('RADARR_URL') ? `${getEnv('RADARR_URL')}/api/v3/system/status` : undefined,
        { headers: { 'X-Api-Key': getEnv('RADARR_API_KEY') ?? '' } }
      ),
    ]);
    checks.jackett = j;
    checks.tmdb = t;
    checks.sonarr = s;
    checks.radarr = r;
  }

  return NextResponse.json({
    services,
    checks,
    runtime: {
      mode: 'self-hosted',
      cache: 'local-json',
      writeProtection: 'same-origin-csrf',
    },
  });
}
