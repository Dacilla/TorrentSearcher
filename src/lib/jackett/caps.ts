import { XMLParser } from 'fast-xml-parser';
import { IndexerCapabilities } from '@/types';
import { requireEnv } from '@/lib/config/env';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'indexer' || name === 'category' || name === 'subcat',
});

/**
 * Fetches all configured indexers AND their caps in a single call via
 * the Torznab ?t=indexers endpoint (avoids the cookie-locked REST API).
 */
export async function fetchAllCapsFromTorznab(): Promise<IndexerCapabilities[]> {
  const JACKETT_URL = requireEnv('JACKETT_URL', 'Jackett');
  const JACKETT_KEY = requireEnv('JACKETT_API_KEY', 'Jackett');
  const url = new URL(`${JACKETT_URL}/api/v2.0/indexers/all/results/torznab/api`);
  url.searchParams.set('apikey', JACKETT_KEY);
  url.searchParams.set('t', 'indexers');
  url.searchParams.set('configured', 'true');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Jackett indexers → ${res.status}`);
  const xml = await res.text();
  return parseTorznabIndexers(xml);
}

function parseTorznabIndexers(xml: string): IndexerCapabilities[] {
  const doc = parser.parse(xml);
  const rawIndexers: unknown[] = doc?.indexers?.indexer ?? [];
  if (!Array.isArray(rawIndexers) || rawIndexers.length === 0) return [];

  const results: IndexerCapabilities[] = [];

  for (const raw of rawIndexers) {
    const idx = raw as Record<string, unknown>;

    const indexerId = String(idx['@_id'] ?? '');
    const configured = idx['@_configured'] === 'true' || idx['@_configured'] === true;
    if (!indexerId || !configured) continue;

    const displayName = String(idx.title ?? indexerId);
    const caps = idx.caps as Record<string, unknown> | undefined;
    const result = parseInlineCaps(indexerId, displayName, caps);
    results.push(result);
  }

  return results;
}

function parseInlineCaps(
  indexerId: string,
  displayName: string,
  caps: Record<string, unknown> | undefined
): IndexerCapabilities {
  const searching = caps?.searching as Record<string, unknown> | undefined;

  const getMode = (name: string): boolean => {
    const m = searching?.[name] as Record<string, unknown> | undefined;
    if (!m) return false;
    return m['@_available'] === 'yes' || m['@_available'] === true;
  };

  const getSupportedParams = (name: string): string[] => {
    const m = searching?.[name] as Record<string, unknown> | undefined;
    if (!m) return [];
    const p = m['@_supportedParams'] ?? '';
    return typeof p === 'string' ? p.split(',').map((s) => s.trim()).filter(Boolean) : [];
  };

  const tvRawParams = getSupportedParams('tv-search');
  const movieRawParams = getSupportedParams('movie-search');

  const tvValidParams = ['q', 'season', 'ep', 'tvdbid', 'imdbid', 'tmdbid'] as const;
  const movieValidParams = ['q', 'imdbid', 'tmdbid'] as const;

  // Parse categories
  const categoriesRaw = (caps?.categories as Record<string, unknown>)?.category ?? [];
  const categoryArray = Array.isArray(categoriesRaw) ? categoriesRaw : [categoriesRaw];
  const categories: number[] = [];

  for (const cat of categoryArray as Record<string, unknown>[]) {
    const id = parseInt(String(cat?.['@_id'] ?? ''), 10);
    if (!isNaN(id)) categories.push(id);

    const subCats = cat?.subcat ?? [];
    const subArray = Array.isArray(subCats) ? subCats : [subCats];
    for (const sub of subArray as Record<string, unknown>[]) {
      const subId = parseInt(String(sub?.['@_id'] ?? ''), 10);
      if (!isNaN(subId)) categories.push(subId);
    }
  }

  const supportsTV = categories.some((c) => c >= 5000 && c <= 5099);
  const supportsMovies = categories.some((c) => c >= 2000 && c <= 2099);

  return {
    indexerId,
    displayName,
    searchModes: {
      basic: getMode('search'),
      'tv-search': getMode('tv-search'),
      'movie-search': getMode('movie-search'),
    },
    supportedParams: {
      tvSearch: tvRawParams.filter((p) =>
        (tvValidParams as readonly string[]).includes(p)
      ) as IndexerCapabilities['supportedParams']['tvSearch'],
      movieSearch: movieRawParams.filter((p) =>
        (movieValidParams as readonly string[]).includes(p)
      ) as IndexerCapabilities['supportedParams']['movieSearch'],
    },
    categories,
    supportsTV,
    supportsMovies,
    lastUpdated: Date.now(),
  };
}
