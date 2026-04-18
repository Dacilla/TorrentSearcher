'use client';

import { SearchState } from '@/hooks/useSearch';
import { Loader2 } from 'lucide-react';

interface Props {
  state: SearchState;
  totalResults: number;
  filteredResults: number;
  error?: string | null;
}

export function ResultsHeader({ state, totalResults, filteredResults, error }: Props) {
  if (state === 'idle') return null;

  const isFiltered = filteredResults < totalResults;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400" aria-live="polite">
      {state === 'error' && error && (
        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-300">
          {error}
        </span>
      )}
      {state === 'searching' && (
        <Loader2 size={14} className="animate-spin text-zinc-500" />
      )}
      {totalResults > 0 && (
        <span>
          {isFiltered ? (
            <>
              <span className="text-white font-medium">{filteredResults.toLocaleString()}</span>
              <span className="text-zinc-600"> / {totalResults.toLocaleString()} results</span>
            </>
          ) : (
            <>
              <span className="text-white font-medium">{totalResults.toLocaleString()}</span>
              {' '}result{totalResults !== 1 ? 's' : ''}
            </>
          )}
          {state === 'searching' && <span className="text-zinc-600"> (streaming…)</span>}
        </span>
      )}
      {state === 'searching' && totalResults === 0 && (
        <span className="text-zinc-500">Waiting for trackers…</span>
      )}
    </div>
  );
}
