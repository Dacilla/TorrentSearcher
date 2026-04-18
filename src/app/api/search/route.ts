import { NextRequest } from 'next/server';
import { getAllCaps } from '@/lib/cache/capsCache';
import { getAffinityCache, updateAffinity } from '@/lib/cache/affinityCache';
import { selectIndexers } from '@/lib/routing/queryRouter';
import { searchIndexer } from '@/lib/jackett/search';
import { SSEEvent, MediaInfo, IndexerQuery } from '@/types';
import { parseSearchParams } from '@/lib/http/validation';

const MAX_CONCURRENT = 10; // max parallel Jackett requests

function sseChunk(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Run tasks with a concurrency limit, streaming results as they complete. */
async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<void> {
  const queue = [...tasks];
  const running = new Set<Promise<void>>();

  const start = () => {
    if (queue.length === 0) return;
    const task = queue.shift()!;
    const p: Promise<void> = task().then(() => { running.delete(p); }).catch(() => { running.delete(p); });
    running.add(p);
  };

  // Fill initial slots
  for (let i = 0; i < Math.min(limit, tasks.length); i++) start();

  while (running.size > 0) {
    await Promise.race(running);
    // After any task finishes, start the next one
    while (running.size < limit && queue.length > 0) start();
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  const parsed = parseSearchParams(req.nextUrl.searchParams);
  const params = parsed.ok ? parsed.value : null;
  const parseError = parsed.ok ? null : parsed.error;
  const query = params?.query ?? '';
  const contentType = params?.contentType ?? 'unknown';

  const mediaInfo: MediaInfo | undefined = params?.tmdbId
    ? {
        contentType,
        title: params.title ?? query,
        tmdbId: params.tmdbId,
        imdbId: params.imdbId,
        tvdbId: params.tvdbId,
        year: params.year,
      }
    : undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: SSEEvent) => {
        try {
          controller.enqueue(encoder.encode(sseChunk(event)));
        } catch {
          // client disconnected
        }
      };

      req.signal.addEventListener('abort', () => {
        try { controller.close(); } catch { /* already closed */ }
      });

      try {
        if (!params) {
          enqueue({ type: 'search_complete', totalIndexers: 0, completedIndexers: 0, error: parseError ?? 'Invalid search' });
          controller.close();
          return;
        }

        const [caps, affinity] = await Promise.all([getAllCaps(), getAffinityCache()]);

        const indexerQueries = selectIndexers(
          caps,
          {
            query,
            contentType,
            mediaInfo,
            season: params.season,
            episode: params.episode,
            wantedCodec: params.wantedCodec,
          },
          affinity
        );

        const total = indexerQueries.length;

        if (total === 0) {
          enqueue({ type: 'search_complete', totalIndexers: 0, completedIndexers: 0 });
          controller.close();
          return;
        }

        let completed = 0;

        const makeTask = (indexerQuery: IndexerQuery) => async () => {
          if (req.signal.aborted) return;

          enqueue({
            type: 'indexer_start',
            indexerId: indexerQuery.indexerId,
            indexerName: indexerQuery.indexerName,
          });

          const start = Date.now();
          try {
            const results = await searchIndexer(indexerQuery, req.signal);
            if (req.signal.aborted) return;
            const durationMs = Date.now() - start;
            updateAffinity(indexerQuery.indexerId, results).catch(() => {});
            enqueue({
              type: 'indexer_results',
              indexerId: indexerQuery.indexerId,
              indexerName: indexerQuery.indexerName,
              results,
            });
            enqueue({
              type: 'indexer_done',
              indexerId: indexerQuery.indexerId,
              indexerName: indexerQuery.indexerName,
              durationMs,
            });
          } catch (e) {
            if (req.signal.aborted) return;
            enqueue({
              type: 'indexer_error',
              indexerId: indexerQuery.indexerId,
              indexerName: indexerQuery.indexerName,
              error: e instanceof Error ? e.message : 'Unknown error',
              durationMs: Date.now() - start,
            });
          } finally {
            completed++;
          }
        };

        await runWithConcurrency(indexerQueries.map(makeTask), MAX_CONCURRENT);

        if (!req.signal.aborted) {
          enqueue({ type: 'search_complete', totalIndexers: total, completedIndexers: completed });
        }
      } catch (e) {
        if (!req.signal.aborted) {
          enqueue({
            type: 'search_complete',
            totalIndexers: 0,
            completedIndexers: 0,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      try { controller.close(); } catch { /* already closed */ }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
