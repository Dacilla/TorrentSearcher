'use client';

import { useMemo, useRef, useEffect, useState, KeyboardEvent, FormEvent } from 'react';
import { Search, X, Clock, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ContentTypeBadge } from './ContentTypeBadge';
import { detectContentType } from '@/lib/detection/contentType';
import { ContentType } from '@/types';

interface Props {
  query: string;
  contentType: ContentType;
  onQueryChange: (query: string) => void;
  onContentTypeChange: (contentType: ContentType) => void;
  onSearch: () => void;
  isLoading?: boolean;
  history: string[];
  onRemoveHistory: (q: string) => void;
}

export function SearchBar({
  query,
  contentType,
  onQueryChange,
  onContentTypeChange,
  onSearch,
  isLoading,
  history,
  onRemoveHistory,
}: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close history dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const detected = useMemo(() => detectContentType(query), [query]);
  const effectiveContentType = contentType !== 'unknown' ? contentType : detected.type;

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!query.trim() || isLoading) return;
    setShowHistory(false);
    onSearch();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') setShowHistory(false);
  };

  const selectHistory = (q: string) => {
    onQueryChange(q);
    setShowHistory(false);
    onContentTypeChange('unknown');
  };

  const filteredHistory = history.filter((h) =>
    query ? h.toLowerCase().includes(query.toLowerCase()) : true
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl">
      <form className="relative flex items-center gap-2" onSubmit={handleSubmit}>
        <div className="relative flex-1">
          <label htmlFor="torrent-search" className="sr-only">
            Search movies, TV shows, seasons, or episodes
          </label>
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
          />
          <Input
            ref={inputRef}
            id="torrent-search"
            name="query"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setShowHistory(true);
            }}
            onFocus={() => setShowHistory(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search movies, TV shows… (e.g. Breaking Bad S03E07)"
            className="pl-10 pr-10 h-12 text-base bg-zinc-900 border-zinc-700 focus-visible:border-zinc-500 rounded-xl"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => { onQueryChange(''); onContentTypeChange('unknown'); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="flex h-12 items-center gap-2 rounded-lg bg-teal-300 px-5 font-semibold text-zinc-950 transition-colors hover:bg-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
          Search
        </button>
      </form>

      {/* Content type badge */}
      {query && (
        <div className="mt-2 flex items-center gap-2 ml-1">
          <span className="text-xs text-zinc-500">Detected:</span>
          <ContentTypeBadge
            type={effectiveContentType}
            onOverride={onContentTypeChange}
          />
        </div>
      )}

      {/* History dropdown */}
      {showHistory && filteredHistory.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
          role="listbox"
          aria-label="Recent searches"
        >
          {filteredHistory.map((h) => (
            <div
              key={h}
              className="group flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800"
              role="presentation"
            >
              <Clock size={14} className="text-zinc-600 shrink-0" />
              <button
                type="button"
                onClick={() => selectHistory(h)}
                className="min-w-0 flex-1 truncate text-left text-sm text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60"
                role="option"
                aria-selected={false}
              >
                {h}
              </button>
              <button
                type="button"
                aria-label={`Remove ${h} from search history`}
                onClick={(e) => { e.stopPropagation(); onRemoveHistory(h); }}
                className="text-zinc-600 opacity-0 transition-opacity hover:text-zinc-400 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60 group-hover:opacity-100"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
