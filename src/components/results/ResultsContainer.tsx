'use client';

import { TorrentResult } from '@/types';
import { TorrentCard } from './TorrentCard';
import { TorrentCardSkeleton } from './TorrentCardSkeleton';
import { SearchState } from '@/hooks/useSearch';
import { scoreTorrent } from '@/lib/results/scoring';

interface Props {
  results: TorrentResult[];
  state: SearchState;
}

export function ResultsContainer({ results, state }: Props) {
  const bestId = results.reduce<{ id: string; score: number } | null>((best, result) => {
    const score = scoreTorrent(result);
    if (!best || score > best.score) return { id: result.id, score };
    return best;
  }, null)?.id;

  if (state === 'searching' && results.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <TorrentCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if ((state === 'complete' || state === 'searching') && results.length === 0 && state === 'complete') {
    return (
      <div className="text-center py-16 text-zinc-500">
        <p className="text-lg mb-2">No results found</p>
        <p className="text-sm">Try a different search term or check your Jackett indexers</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {results.map((result) => (
        <TorrentCard
          key={result.id}
          result={result}
          isBest={result.id === bestId}
        />
      ))}
    </div>
  );
}
