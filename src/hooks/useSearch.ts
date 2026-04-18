'use client';

import { useState, useRef, useCallback } from 'react';
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
  const seenHashes = new Map(
    existing.flatMap((r) => {
      const sources = r.duplicateSources ?? [];
      return [r, ...sources]
        .filter((source) => source.infoHash)
        .map((source) => [source.infoHash!, r.id] as const);
    })
  );
  const seenTitles = new Map(existing.map((r) => [normaliseTitle(r.title), r.id]));
  const merged = [...existing];

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
      const existingIdx = merged.findIndex((r) => r.id === existingId);
      if (existingIdx >= 0) appendSource(existingIdx, result, existingId);
      continue;
    }

    const normTitle = normaliseTitle(result.title);
    const existingId = seenTitles.get(normTitle);
    if (existingId) {
      const existingIdx = merged.findIndex((r) => r.id === existingId);
      if (existingIdx >= 0) appendSource(existingIdx, result, existingId);
    } else {
      merged.push(result);
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

  const reset = useCallback(() => {
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

  const search = useCallback(async (query: string, contentTypeOverride: ContentType = 'unknown') => {
    if (!query.trim()) return;

    // Clean up previous search
    eventSourceRef.current?.close();
    setResults([]);
    setTrackerStatuses([]);
    setTotalIndexers(0);
    setCompletedIndexers(0);
    setError(null);
    setState('resolving');

    const detected = detectContentType(query);
    const requestedContentType = contentTypeOverride !== 'unknown' ? contentTypeOverride : detected.type;

    // Resolve media info via TMDB
    let resolvedMediaInfo: MediaInfo | null = null;
    let resolvedContentType: ContentType = requestedContentType;

    try {
      const resolveRes = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, contentType: requestedContentType }),
      });
      if (!resolveRes.ok) {
        const body = (await resolveRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Resolve failed (${resolveRes.status})`);
      }
      const resolveData = (await resolveRes.json()) as {
        mediaInfo: MediaInfo | null;
        detected: { type: ContentType; season?: number; episode?: number };
      };
      resolvedMediaInfo = resolveData.mediaInfo;
      resolvedContentType = resolveData.mediaInfo?.contentType ?? requestedContentType;
      setMediaInfo(resolvedMediaInfo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Media lookup failed; searching by title only.');
    }

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
      let data: SSEEvent;
      try {
        data = JSON.parse(event.data) as SSEEvent;
      } catch {
        setState('error');
        setError('Search stream returned malformed data.');
        es.close();
        eventSourceRef.current = null;
        return;
      }

      switch (data.type) {
        case 'indexer_start':
          setTrackerStatuses((prev) => [
            ...prev,
            {
              indexerId: data.indexerId!,
              indexerName: data.indexerName!,
              state: 'loading',
            },
          ]);
          setTotalIndexers((n) => n + 1);
          break;

        case 'indexer_results':
          setResults((prev) => mergeResults(prev, data.results ?? []));
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
          // Update result count for this tracker
          setResults((prev) => {
            const count = prev.filter((r) => r.indexerId === data.indexerId).length;
            setTrackerStatuses((ts) =>
              ts.map((t) =>
                t.indexerId === data.indexerId ? { ...t, resultCount: count } : t
              )
            );
            return prev;
          });
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
            setState('complete');
          }
          es.close();
          eventSourceRef.current = null;
          break;
      }
    };

    es.onerror = () => {
      setError('Search stream disconnected. Check Jackett and try again.');
      setState('error');
      es.close();
      eventSourceRef.current = null;
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
