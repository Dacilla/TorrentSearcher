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
    const jackett = services.find((service) => service.name === 'jackett')!;
    const tmdb = services.find((service) => service.name === 'tmdb')!;
    const sonarr = services.find((service) => service.name === 'sonarr')!;
    const radarr = services.find((service) => service.name === 'radarr')!;

    checks.jackett = await checkFetch(
      jackett.configured,
      getEnv('JACKETT_URL') && getEnv('JACKETT_API_KEY')
        ? `${getEnv('JACKETT_URL')}/api/v2.0/indexers/all/results/torznab/api?t=indexers&configured=true&apikey=${getEnv('JACKETT_API_KEY')}`
        : undefined,
      { headers: { Accept: 'text/xml' } }
    );
    checks.tmdb = await checkFetch(
      tmdb.configured,
      getEnv('TMDB_API_KEY')
        ? `https://api.themoviedb.org/3/configuration?api_key=${getEnv('TMDB_API_KEY')}`
        : undefined
    );
    checks.sonarr = await checkFetch(
      sonarr.configured,
      getEnv('SONARR_URL') ? `${getEnv('SONARR_URL')}/api/v3/system/status` : undefined,
      { headers: { 'X-Api-Key': getEnv('SONARR_API_KEY') ?? '' } }
    );
    checks.radarr = await checkFetch(
      radarr.configured,
      getEnv('RADARR_URL') ? `${getEnv('RADARR_URL')}/api/v3/system/status` : undefined,
      { headers: { 'X-Api-Key': getEnv('RADARR_API_KEY') ?? '' } }
    );
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
