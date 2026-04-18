'use client';

import { ContentType } from '@/types';
import { Tv, Film } from 'lucide-react';

interface Props {
  type: ContentType;
  onOverride?: (type: ContentType) => void;
}

export function ContentTypeBadge({ type, onOverride }: Props) {
  if (type === 'unknown') {
    return (
      <div className="flex gap-1.5" role="group" aria-label="Content type">
        <button
          type="button"
          onClick={() => onOverride?.('tv')}
          className="flex items-center gap-1 rounded-full border border-sky-800/70 px-2 py-0.5 text-xs text-sky-300 transition-colors hover:border-sky-400 hover:text-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          aria-pressed={false}
        >
          <Tv size={11} /> TV
        </button>
        <button
          type="button"
          onClick={() => onOverride?.('movie')}
          className="flex items-center gap-1 rounded-full border border-rose-800/70 px-2 py-0.5 text-xs text-rose-300 transition-colors hover:border-rose-400 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
          aria-pressed={false}
        >
          <Film size={11} /> Movie
        </button>
      </div>
    );
  }

  if (type === 'tv') {
    return (
      <button
        type="button"
        onClick={() => onOverride?.('unknown')}
        className="inline-flex h-5 items-center justify-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        aria-pressed
        aria-label="Content type set to TV. Click to use automatic detection."
      >
        <Tv size={11} /> TV Show
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOverride?.('unknown')}
      className="inline-flex h-5 items-center justify-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
      aria-pressed
      aria-label="Content type set to Movie. Click to use automatic detection."
    >
      <Film size={11} /> Movie
    </button>
  );
}
