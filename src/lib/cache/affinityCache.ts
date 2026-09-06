import fs from 'fs/promises';
import path from 'path';
import { IndexerAffinity, TorrentResult } from '@/types';

const CACHE_FILE = path.join(process.cwd(), 'data', 'affinity-cache.json');
type AffinityMap = Record<string, IndexerAffinity>;

const MAX_INDEXERS = 200;
const MAX_CODECS_PER_INDEXER = 50;

let memoryCache: AffinityMap | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function isValidMap(v: unknown): v is AffinityMap {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

async function loadFromDisk(): Promise<AffinityMap> {
  try {
    const text = await fs.readFile(CACHE_FILE, 'utf-8');
    const parsed: unknown = JSON.parse(text);
    return isValidMap(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function saveToDisk(): Promise<void> {
  if (!memoryCache) return;
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    const tmp = `${CACHE_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(memoryCache, null, 2), 'utf-8');
    await fs.rename(tmp, CACHE_FILE);
  } catch (e) {
    console.error('[affinity-cache] Failed to persist:', e);
  }
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveToDisk(), 5_000);
  // Do not keep the process alive for a cache flush.
  if (typeof (saveTimer as unknown as { unref?: () => void }).unref === 'function') {
    (saveTimer as unknown as { unref: () => void }).unref();
  }
}

export async function getAffinityCache(): Promise<IndexerAffinity[]> {
  if (!memoryCache) memoryCache = await loadFromDisk();
  return Object.values(memoryCache);
}

export async function updateAffinity(indexerId: string, results: TorrentResult[]): Promise<void> {
  if (!memoryCache) memoryCache = await loadFromDisk();

  // Bound growth: rogue indexers cannot grow the JSON file unboundedly.
  if (!memoryCache[indexerId] && Object.keys(memoryCache).length >= MAX_INDEXERS) return;

  const entry = memoryCache[indexerId] ?? {
    indexerId,
    codecScores: {},
    totalResults: 0,
    lastQueried: 0,
  };

  // Tally codec occurrences (normalize case; cap distinct codecs)
  for (const r of results) {
    const raw = r.releaseInfo.codec;
    if (!raw || raw === 'unknown') continue;
    const codec = raw.toUpperCase();
    if (!(codec in entry.codecScores) && Object.keys(entry.codecScores).length >= MAX_CODECS_PER_INDEXER) continue;
    entry.codecScores[codec] = (entry.codecScores[codec] ?? entry.codecScores[raw] ?? 0) + 1;
    // Keep canonical key as sent by parser; also mirror uppercase for case-insensitive lookup.
    if (codec !== raw) entry.codecScores[raw] = entry.codecScores[codec];
  }

  entry.totalResults += results.length;
  entry.lastQueried = Date.now();
  memoryCache[indexerId] = entry;
  scheduleSave();
}

export async function getAffinityScore(indexerId: string, codec: string): Promise<number> {
  if (!memoryCache) memoryCache = await loadFromDisk();
  const scores = memoryCache[indexerId]?.codecScores;
  if (!scores) return 0;
  return scores[codec] ?? scores[codec.toUpperCase()] ?? scores[codec.toLowerCase()] ?? 0;
}
