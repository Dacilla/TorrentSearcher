import fs from 'fs/promises';
import path from 'path';
import { IndexerAffinity, TorrentResult } from '@/types';

const CACHE_FILE = path.join(process.cwd(), 'data', 'affinity-cache.json');
type AffinityMap = Record<string, IndexerAffinity>;

let memoryCache: AffinityMap | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function loadFromDisk(): Promise<AffinityMap> {
  try {
    const text = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(text) as AffinityMap;
  } catch {
    return {};
  }
}

async function saveToDisk(): Promise<void> {
  if (!memoryCache) return;
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(memoryCache, null, 2), 'utf-8');
  } catch (e) {
    console.error('[affinity-cache] Failed to persist:', e);
  }
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveToDisk(), 5_000);
}

export async function getAffinityCache(): Promise<IndexerAffinity[]> {
  if (!memoryCache) memoryCache = await loadFromDisk();
  return Object.values(memoryCache);
}

export async function updateAffinity(indexerId: string, results: TorrentResult[]): Promise<void> {
  if (!memoryCache) memoryCache = await loadFromDisk();

  const entry = memoryCache[indexerId] ?? {
    indexerId,
    codecScores: {},
    totalResults: 0,
    lastQueried: 0,
  };

  // Tally codec occurrences
  for (const r of results) {
    const codec = r.releaseInfo.codec;
    if (codec && codec !== 'unknown') {
      entry.codecScores[codec] = (entry.codecScores[codec] ?? 0) + 1;
    }
  }

  entry.totalResults += results.length;
  entry.lastQueried = Date.now();
  memoryCache[indexerId] = entry;
  scheduleSave();
}

export async function getAffinityScore(indexerId: string, codec: string): Promise<number> {
  if (!memoryCache) memoryCache = await loadFromDisk();
  return memoryCache[indexerId]?.codecScores[codec] ?? 0;
}
