'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  TorrentResult,
  SSEEvent,
  TrackerStatus,
  MediaInfo,
  ContentType,
  TorrentSource,
} from '@/types';
import { detectContentType } from '@/lib/detection/contentType';

export type SearchState = 'idle' | 'resolving' | 'searching' | 'complete' | 'error';

export interface UseSearchReturn {
  state: SearchState;
  mediaInfo: MediaInfo | null;
  results: TorrentResult[];
  trackerStatuses: TrackerStatus[];
  totalIndexers: number;
  completedIndexers: number;
  error: string | null;
  search: (query: string, contentType?: ContentType) => void;
  reset: () => void;
}

function normaliseTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mergeResults(existing: TorrentResult[], incoming: TorrentResult[]): TorrentResult[] {
  const seenHashes = new Map<string, string>();
  // Dedup key includes quality signals so different releases do not collapse.
  const keyFor = (r: TorrentResult): string =>
    [
      normaliseTitle(r.title),
      r.releaseInfo.resolution,
      r.releaseInfo.source,
      r.releaseInfo.codec,
      Math.round(r.size / (50 * 1024 * 1024)),
    ].join('|');
  const seenTitles = new Map(existing.map((r) => [keyFor(r), r.id]));
  const merged = [...existing];
  const idIndex = new Map(merged.map((r, i) => [r.id, i]));

  for (const r of existing) {
    if (r.infoHash) seenHashes.set(r.infoHash, r.id);
    for (const s of r.duplicateSources ?? []) {
      if (s.infoHash) seenHashes.set(s.infoHash, r.id);
    }
  }

  const appendSource = (idx: number, result: TorrentResult, duplicateGroup: string) => {
    const source = toTorrentSource(result);
    const current = merged[idx];
    const duplicateSources = current.duplicateSources ?? [];
    const alreadyStored = duplicateSources.some(
      (item) => item.indexerId === source.indexerId && item.guid === source.guid
    );

    merged[idx] = {
      ...current,
      duplicateGroup,
      duplicateSources: alreadyStored ? duplicateSources : [...duplicateSources, source],
      seeders: Math.max(current.seeders, result.seeders),
      leechers: Math.max(current.leechers, result.leechers),
    };
  };

  for (const result of incoming) {
    if (result.infoHash && seenHashes.has(result.infoHash)) {
      const existingId = seenHashes.get(result.infoHash)!;
      const existingIdx = idIndex.get(existingId);
      if (existingIdx !== undefined) appendSource(existingIdx, result, existingId);
      continue;
    }

    const normTitle = keyFor(result);
    const existingId = seenTitles.get(normTitle);
    if (existingId) {
      const existingIdx = idIndex.get(existingId);
      if (existingIdx !== undefined) appendSource(existingIdx, result, existingId);
    } else {
      const newIdx = merged.length;
      merged.push(result);
      idIndex.set(result.id, newIdx);
      if (result.infoHash) seenHashes.set(result.infoHash, result.id);
      seenTitles.set(normTitle, result.id);
    }
  }

  return merged;
}

function toTorrentSource(result: TorrentResult): TorrentSource {
  return {
    indexerId: result.indexerId,
    indexerName: result.indexerName,
    infoHash: result.infoHash,
    magnetUrl: result.magnetUrl,
    downloadUrl: result.downloadUrl,
    guid: result.guid,
    seeders: result.seeders,
    leechers: result.leechers,
  };
}

export function useSearch(): UseSearchReturn {
  const [state, setState] = useState<SearchState>('idle');
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [results, setResults] = useState<TorrentResult[]>([]);
  const [trackerStatuses, setTrackerStatuses] = useState<TrackerStatus[]>([]);
  const [totalIndexers, setTotalIndexers] = useState(0);
  const [completedIndexers, setCompletedIndexers] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const resolveAbortRef = useRef<AbortController | null>(null);
  const searchIdRef = useRef(0);
  const knownTrackersRef = useRef<Set<string>>(new Set());

  const reset = useCallback(() => {
    searchIdRef.current += 1;
    resolveAbortRef.current?.abort();
    resolveAbortRef.current = null;
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setState('idle');
    setMediaInfo(null);
    setResults([]);
    setTrackerStatuses([]);
    setTotalIndexers(0);
    setCompletedIndexers(0);
    setError(null);
  }, []);

  // Cleanup on unmount (EventSource + in-flight resolve).
  useEffect(() => {
    return () => {
      searchIdRef.current += 1;
      resolveAbortRef.current?.abort();
      eventSourceRef.current?.close();
    };
  }, []);

  const search = useCallback(async (query: string, contentTypeOverride: ContentType = 'unknown') => {
    if (!query.trim()) return;
    const searchId = ++searchIdRef.current;

    // Clean up previous search
    resolveAbortRef.current?.abort();
    const resolveController = new AbortController();
    resolveAbortRef.current = resolveController;
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    knownTrackersRef.current = new Set();
    setResults([]);
    setTrackerStatuses([]);
    setTotalIndexers(0);
    setCompletedIndexers(0);
    setError(null);
    setMediaInfo(null);
    setState('resolving');

    const detected = detectContentType(query);
    const requestedContentType = contentTypeOverride !== 'unknown' ? contentTypeOverride : detected.type;

    // Resolve media info via TMDB (abortable, race-safe)
    let resolvedMediaInfo: MediaInfo | null = null;
    let resolvedContentType: ContentType = requestedContentType;

    try {
      const resolveRes = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, contentType: requestedContentType }),
        signal: resolveController.signal,
      });
      if (searchId !== searchIdRef.current) return;
      if (!resolveRes.ok) {
        const body = (await resolveRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Resolve failed (${resolveRes.status})`);
      }
      const resolveData = (await resolveRes.json()) as {
        mediaInfo: MediaInfo | null;
        detected: { type: ContentType; season?: number; episode?: number };
      };
      if (searchId !== searchIdRef.current) return;
      resolvedMediaInfo = resolveData.mediaInfo;
      resolvedContentType = resolveData.mediaInfo?.contentType ?? requestedContentType;
      setMediaInfo(resolvedMediaInfo);
    } catch (e) {
      if (searchId !== searchIdRef.current) return;
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Media lookup failed; searching by title only.');
    }

    if (searchId !== searchIdRef.current) return;

    // Build SSE search URL
    const searchUrl = new URL('/api/search', window.location.origin);
    searchUrl.searchParams.set('q', detected.cleanQuery || query);
    searchUrl.searchParams.set('contentType', resolvedContentType);
    if (resolvedMediaInfo?.tmdbId) searchUrl.searchParams.set('tmdbId', String(resolvedMediaInfo.tmdbId));
    if (resolvedMediaInfo?.tvdbId) searchUrl.searchParams.set('tvdbId', String(resolvedMediaInfo.tvdbId));
    if (resolvedMediaInfo?.imdbId) searchUrl.searchParams.set('imdbId', resolvedMediaInfo.imdbId);
    if (resolvedMediaInfo?.title) searchUrl.searchParams.set('title', resolvedMediaInfo.title);
    if (resolvedMediaInfo?.year) searchUrl.searchParams.set('year', String(resolvedMediaInfo.year));
    if (detected.season !== undefined) searchUrl.searchParams.set('season', String(detected.season));
    if (detected.episode !== undefined) searchUrl.searchParams.set('episode', String(detected.episode));

    setState('searching');

    const es = new EventSource(searchUrl.toString());
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      if (searchId !== searchIdRef.current) {
        es.close();
        return;
      }
      let data: SSEEvent;
      try {
        data = JSON.parse(event.data) as SSEEvent;
      } catch {
        setState('error');
        setError('Search stream returned malformed data.');
        es.close();
        if (eventSourceRef.current === es) eventSourceRef.current = null;
        return;
      }

      switch (data.type) {
        case 'indexer_start': {
          const id = data.indexerId!;
          const isNew = !knownTrackersRef.current.has(id);
          if (isNew) {
            knownTrackersRef.current.add(id);
            setTotalIndexers((n) => n + 1);
          }
          setTrackerStatuses((prev) => {
            if (prev.some((t) => t.indexerId === id)) {
              return prev.map((t) =>
                t.indexerId === id
                  ? { ...t, indexerName: data.indexerName ?? t.indexerName, state: 'loading' as const }
                  : t
              );
            }
            return [
              ...prev,
              {
                indexerId: id,
                indexerName: data.indexerName!,
                state: 'loading',
              },
            ];
          });
          break;
        }

        case 'indexer_results':
          setResults((prev) => mergeResults(prev, data.results ?? []));
          // Attribute per-indexer hits including duplicates merged into primary.
          setTrackerStatuses((prev) =>
            prev.map((t) =>
              t.indexerId === data.indexerId
                ? { ...t, resultCount: (t.resultCount ?? 0) + (data.results?.length ?? 0) }
                : t
            )
          );
          break;

        case 'indexer_done':
          setTrackerStatuses((prev) =>
            prev.map((t) =>
              t.indexerId === data.indexerId
                ? { ...t, state: 'done', durationMs: data.durationMs }
                : t
            )
          );
          setCompletedIndexers((n) => n + 1);
          break;

        case 'indexer_error':
          setTrackerStatuses((prev) =>
            prev.map((t) =>
              t.indexerId === data.indexerId
                ? { ...t, state: 'error', error: data.error, durationMs: data.durationMs }
                : t
            )
          );
          setCompletedIndexers((n) => n + 1);
          break;

        case 'search_complete':
          if (data.error) {
            setError(data.error);
            setState('error');
          } else {
            // A prior resolve failure should not linger after a successful search.
            setError(null);
            setState('complete');
          }
          es.close();
          if (eventSourceRef.current === es) eventSourceRef.current = null;
          break;
      }
    };

    es.onerror = () => {
      if (searchId !== searchIdRef.current) return;
      // EventSource fires onerror on normal close after complete; only error if still searching.
      setError((prev) => prev ?? 'Search stream disconnected. Check Jackett and try again.');
      setState((prev) => (prev === 'searching' ? 'error' : prev));
      es.close();
      if (eventSourceRef.current === es) eventSourceRef.current = null;
    };
  }, []);

  return {
    state,
    mediaInfo,
    results,
    trackerStatuses,
    totalIndexers,
    completedIndexers,
    error,
    search,
    reset,
  };
}
