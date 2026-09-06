import fs from 'fs/promises';
import path from 'path';
import { IndexerCapabilities } from '@/types';
import { fetchAllCapsFromTorznab } from '@/lib/jackett/caps';

const CACHE_FILE = path.join(process.cwd(), 'data', 'caps-cache.json');
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type CacheEntry = { caps: IndexerCapabilities[]; fetchedAt: number };

let memoryCache: CacheEntry | null = null;
let inFlight: Promise<IndexerCapabilities[]> | null = null;

function isValidEntry(v: unknown): v is CacheEntry {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return Array.isArray(e.caps) && typeof e.fetchedAt === 'number';
}

async function loadFromDisk(): Promise<CacheEntry | null> {
  try {
    const text = await fs.readFile(CACHE_FILE, 'utf-8');
    const parsed: unknown = JSON.parse(text);
    return isValidEntry(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function saveToDisk(entry: CacheEntry): Promise<void> {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    const tmp = `${CACHE_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(entry, null, 2), 'utf-8');
    await fs.rename(tmp, CACHE_FILE);
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

  // Deduplicate concurrent cold-cache fetches (thundering herd).
  if (inFlight) return inFlight;
  inFlight = (async () => {
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
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export async function refreshAllCaps(): Promise<IndexerCapabilities[]> {
  memoryCache = null;
  return getAllCaps();
}
