import { TorrentResult } from '@/types';
import { IndexerQuery } from '@/types';
import { parseTorznabXml } from './parser';
import { requireEnv } from '@/lib/config/env';
import { normalizeBaseUrl } from '@/lib/http/fetch';

const TIMEOUT_MS = 15_000;

export async function searchIndexer(
  query: IndexerQuery,
  parentSignal?: AbortSignal
): Promise<TorrentResult[]> {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parentSignal?.reason ?? new Error('parent aborted'));
  if (parentSignal?.aborted) {
    controller.abort(parentSignal.reason ?? new Error('parent aborted'));
  } else {
    parentSignal?.addEventListener('abort', abortFromParent, { once: true });
    // Re-check: abort may have fired between check and listener attach.
    if (parentSignal?.aborted) controller.abort(parentSignal.reason ?? new Error('parent aborted'));
  }
  const timer = setTimeout(() => controller.abort(new Error('Jackett search timeout')), TIMEOUT_MS);

  const params: Record<string, string> = { ...query.params };
  // Never let caller-supplied params overwrite auth/type.
  delete params.apikey;
  delete params.api_key;
  if (query.categories.length > 0) {
    params.cat = query.categories.join(',');
  }

  try {
    const JACKETT_URL = normalizeBaseUrl(requireEnv('JACKETT_URL', 'Jackett'));
    const JACKETT_KEY = requireEnv('JACKETT_API_KEY', 'Jackett');

    const url = new URL(
      `${JACKETT_URL}/api/v2.0/indexers/${encodeURIComponent(query.indexerId)}/results/torznab/api`
    );
    url.searchParams.set('apikey', JACKETT_KEY);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'text/xml', 'User-Agent': 'TorrentSearcher/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (xml.length > 5 * 1024 * 1024) throw new Error('Jackett response too large');
    return parseTorznabXml(xml, query.indexerId, query.indexerName);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abortFromParent);
  }
}
