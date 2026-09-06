import { requireEnv } from '@/lib/config/env';
import { fetchWithTimeout, normalizeBaseUrl } from '@/lib/http/fetch';

export async function jackettFetch(path: string, params: Record<string, string> = {}): Promise<string> {
  const JACKETT_URL = normalizeBaseUrl(requireEnv('JACKETT_URL', 'Jackett'));
  const JACKETT_KEY = requireEnv('JACKETT_API_KEY', 'Jackett');
  const url = new URL(`${JACKETT_URL}${path}`);
  url.searchParams.set('apikey', JACKETT_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetchWithTimeout(url.toString(), {
    headers: { Accept: 'application/json, text/xml' },
  });
  if (!res.ok) throw new Error(`Jackett ${path} → ${res.status} ${res.statusText}`);
  return res.text();
}
