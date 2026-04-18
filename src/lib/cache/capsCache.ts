import fs from 'fs/promises';
import path from 'path';
import { IndexerCapabilities } from '@/types';
import { fetchAllCapsFromTorznab } from '@/lib/jackett/caps';

const CACHE_FILE = path.join(process.cwd(), 'data', 'caps-cache.json');
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type CacheEntry = { caps: IndexerCapabilities[]; fetchedAt: number };

let memoryCache: CacheEntry | null = null;

async function loadFromDisk(): Promise<CacheEntry | null> {
  try {
    const text = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(text) as CacheEntry;
  } catch {
    return null;
  }
}

async function saveToDisk(entry: CacheEntry): Promise<void> {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(entry, null, 2), 'utf-8');
  } catch (e) {
    console.error('[caps-cache] Failed to persist to disk:', e);
  }
}

export async function getAllCaps(): Promise<IndexerCapabilities[]> {
  // Check memory cache
  if (memoryCache && Date.now() - memoryCache.fetchedAt < TTL_MS) {
    return memoryCache.caps;
  }

  // Check disk cache
  if (!memoryCache) {
    const disk = await loadFromDisk();
    if (disk && Date.now() - disk.fetchedAt < TTL_MS) {
      memoryCache = disk;
      return memoryCache.caps;
    }
  }

  // Fetch fresh from Jackett
  try {
    const caps = await fetchAllCapsFromTorznab();
    const entry: CacheEntry = { caps, fetchedAt: Date.now() };
    memoryCache = entry;
    await saveToDisk(entry);
    return caps;
  } catch (e) {
    console.error('[caps-cache] Failed to fetch caps:', e);
    // Return stale cache if available
    if (memoryCache) return memoryCache.caps;
    const disk = await loadFromDisk();
    if (disk) return disk.caps;
    return [];
  }
}

export async function refreshAllCaps(): Promise<IndexerCapabilities[]> {
  memoryCache = null;
  return getAllCaps();
}
