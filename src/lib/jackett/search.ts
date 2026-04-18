import { TorrentResult } from '@/types';
import { IndexerQuery } from '@/types';
import { parseTorznabXml } from './parser';
import { requireEnv } from '@/lib/config/env';

const TIMEOUT_MS = 15_000;

export async function searchIndexer(
  query: IndexerQuery,
  parentSignal?: AbortSignal
): Promise<TorrentResult[]> {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parentSignal?.reason);
  if (parentSignal?.aborted) controller.abort(parentSignal.reason);
  parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const params: Record<string, string> = {
    ...query.params,
    cat: query.categories.join(','),
  };

  try {
    const JACKETT_URL = requireEnv('JACKETT_URL', 'Jackett');
    const JACKETT_KEY = requireEnv('JACKETT_API_KEY', 'Jackett');

    const url = new URL(
      `${JACKETT_URL}/api/v2.0/indexers/${query.indexerId}/results/torznab/api`
    );
    url.searchParams.set('apikey', JACKETT_KEY);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseTorznabXml(xml, query.indexerId, query.indexerName);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abortFromParent);
  }
}
