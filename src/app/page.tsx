'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { DEFAULT_FILTERS, SortKey, useFilters } from '@/hooks/useFilters';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { SearchBar } from '@/components/search/SearchBar';
import { MediaInfoCard } from '@/components/metadata/MediaInfoCard';
import { TrackerProgress } from '@/components/results/TrackerProgress';
import { ResultsHeader } from '@/components/results/ResultsHeader';
import { ResultsContainer } from '@/components/results/ResultsContainer';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentType, ResultFilters } from '@/types';
import { cn } from '@/lib/utils';
import { detectContentType } from '@/lib/detection/contentType';
import {
  Activity,
  Filter,
  HardDrive,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  X,
} from 'lucide-react';

type ConfigState = {
  services: Array<{ name: string; label: string; configured: boolean; missing: string[] }>;
  checks: Record<string, { state: 'ok' | 'missing-config' | 'error' | 'skipped'; message?: string }>;
  runtime: { mode: string; cache: string; writeProtection: string };
};

const EXAMPLES: Array<{ label: string; query: string; type: ContentType }> = [
  { label: 'TV episode', query: 'Breaking Bad S03E07', type: 'tv' },
  { label: 'Movie', query: 'Dune Part Two 2024', type: 'movie' },
  { label: 'Season pack', query: 'The Bear Season 2', type: 'tv' },
];

function validContentType(value: string | null): ContentType {
  return value === 'tv' || value === 'movie' || value === 'unknown' ? value : 'unknown';
}

function validSort(value: string | null): SortKey {
  return value === 'date' || value === 'size' || value === 'resolution' ? value : 'seeders';
}

function readCsv<T extends string>(value: string | null): T[] {
  return value ? (value.split(',').filter(Boolean) as T[]) : [];
}

function readInitialState(): { query: string; contentType: ContentType; sort: SortKey; filters: ResultFilters } {
  if (typeof window === 'undefined') {
    return { query: '', contentType: 'unknown', sort: 'seeders', filters: DEFAULT_FILTERS };
  }

  const sp = new URLSearchParams(window.location.search);
  return {
    query: sp.get('q') ?? '',
    contentType: validContentType(sp.get('contentType')),
    sort: validSort(sp.get('sort')),
    filters: {
      resolutions: readCsv(sp.get('res')),
      codecs: readCsv(sp.get('codec')),
      sources: readCsv(sp.get('source')),
      freeleechOnly: sp.get('freeleech') === 'true',
      minSeeders: Number.parseInt(sp.get('seeders') ?? '0', 10) || 0,
    },
  };
}

function replaceUrl(query: string, contentType: ContentType, sort: SortKey, filters: ResultFilters) {
  if (typeof window === 'undefined') return;

  const sp = new URLSearchParams();
  if (query.trim()) sp.set('q', query.trim());
  if (contentType !== 'unknown') sp.set('contentType', contentType);
  if (sort !== 'seeders') sp.set('sort', sort);
  if (filters.resolutions.length) sp.set('res', filters.resolutions.join(','));
  if (filters.codecs.length) sp.set('codec', filters.codecs.join(','));
  if (filters.sources.length) sp.set('source', filters.sources.join(','));
  if (filters.freeleechOnly) sp.set('freeleech', 'true');
  if (filters.minSeeders > 0) sp.set('seeders', String(filters.minSeeders));

  const next = sp.toString() ? `?${sp.toString()}` : window.location.pathname;
  window.history.replaceState(null, '', next);
}

function activeFilterCount(filters: ResultFilters): number {
  return (
    filters.resolutions.length +
    filters.codecs.length +
    filters.sources.length +
    (filters.freeleechOnly ? 1 : 0) +
    (filters.minSeeders > 0 ? 1 : 0)
  );
}

function HealthBadge({ state }: { state?: ConfigState['checks'][string] }) {
  const label = state?.state ?? 'skipped';
  const classes =
    label === 'ok'
      ? 'border-teal-400/40 bg-teal-400/15 text-teal-200'
      : label === 'missing-config'
        ? 'border-amber-400/40 bg-amber-400/15 text-amber-200'
        : label === 'error'
          ? 'border-red-400/40 bg-red-400/15 text-red-200'
          : 'border-zinc-700 bg-zinc-900 text-zinc-400';

  return <span className={cn('rounded-full border px-2 py-0.5 text-xs', classes)}>{label}</span>;
}

export default function HomePage() {
  const initial = useMemo(() => readInitialState(), []);
  const [query, setQuery] = useState(initial.query);
  const [contentType, setContentType] = useState<ContentType>(initial.contentType);
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const hasAutoSearchedRef = useRef(false);

  const {
    state,
    mediaInfo,
    results,
    trackerStatuses,
    totalIndexers,
    completedIndexers,
    error,
    search,
    reset,
  } = useSearch();

  const {
    filters,
    sort,
    setSort,
    setFilters,
    filteredResults,
    toggleResolution,
    toggleCodec,
    toggleSource,
    availableResolutions,
    availableCodecs,
    availableSources,
    freeleechCount,
    resetFilters,
  } = useFilters(results, initial.filters, initial.sort);

  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();
  const isSearching = state === 'searching' || state === 'resolving';
  const hasActivity = state !== 'idle';
  const filterCount = activeFilterCount(filters);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/config?check=true', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Config check failed (${res.status})`);
        return res.json() as Promise<ConfigState>;
      })
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .catch((e) => {
        if (!cancelled) setConfigError(e instanceof Error ? e.message : 'Config check failed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runSearch = useCallback(
    (nextQuery = query, nextType = contentType) => {
      const trimmed = nextQuery.trim();
      if (!trimmed) return;
      const detectedType = detectContentType(trimmed).type;
      const typeForSearch = nextType !== 'unknown' ? nextType : detectedType;
      setQuery(trimmed);
      setContentType(typeForSearch);
      addToHistory(trimmed);
      replaceUrl(trimmed, typeForSearch, sort, filters);
      search(trimmed, typeForSearch);
    },
    [addToHistory, contentType, filters, query, search, sort]
  );

  useEffect(() => {
    if (hasAutoSearchedRef.current || !initial.query) return;
    hasAutoSearchedRef.current = true;
    const timer = window.setTimeout(() => runSearch(initial.query, initial.contentType), 0);
    return () => window.clearTimeout(timer);
  }, [initial.contentType, initial.query, runSearch]);

  useEffect(() => {
    if (!hasActivity && !query.trim()) return;
    replaceUrl(query, contentType, sort, filters);
  }, [contentType, filters, hasActivity, query, sort]);

  const handleReset = () => {
    reset();
    setQuery('');
    setContentType('unknown');
    resetFilters();
    replaceUrl('', 'unknown', 'seeders', DEFAULT_FILTERS);
  };

  const filterPanel = (
    <FilterPanel
      availableResolutions={availableResolutions}
      availableCodecs={availableCodecs}
      availableSources={availableSources}
      selectedResolutions={filters.resolutions}
      selectedCodecs={filters.codecs}
      selectedSources={filters.sources}
      freeleechOnly={filters.freeleechOnly}
      minSeeders={filters.minSeeders}
      freeleechCount={freeleechCount}
      sort={sort}
      onToggleResolution={toggleResolution}
      onToggleCodec={toggleCodec}
      onToggleSource={toggleSource}
      onFreeleechToggle={() => setFilters((f) => ({ ...f, freeleechOnly: !f.freeleechOnly }))}
      onMinSeedersChange={(n) => setFilters((f) => ({ ...f, minSeeders: n }))}
      onSortChange={setSort}
      onReset={resetFilters}
    />
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section
        className={cn(
          'border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur',
          hasActivity ? 'sticky top-0 z-40' : 'min-h-[55svh]'
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-teal-400/30 bg-teal-400/10 text-teal-200">
                <Search size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">Torrent Searcher</h1>
                <p className="text-sm text-zinc-400">Search Jackett, resolve metadata, then choose the strongest release.</p>
              </div>
            </div>

            {hasActivity && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-zinc-400">
                <RotateCcw size={13} />
                New Search
              </Button>
            )}
          </div>

          <SearchBar
            query={query}
            contentType={contentType}
            onQueryChange={setQuery}
            onContentTypeChange={setContentType}
            onSearch={() => runSearch()}
            isLoading={isSearching}
            history={history}
            onRemoveHistory={removeFromHistory}
          />

          {!hasActivity && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <Activity size={15} className="text-teal-300" />
                  Search Cockpit
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {EXAMPLES.map((example) => (
                    <button
                      type="button"
                      key={example.query}
                      onClick={() => runSearch(example.query, example.type)}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-left transition-colors hover:border-teal-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60"
                    >
                      <span className="block text-xs text-zinc-500">{example.label}</span>
                      <span className="mt-1 block truncate text-sm text-zinc-200">{example.query}</span>
                    </button>
                  ))}
                </div>

                {history.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Recent Searches</p>
                      <button
                        type="button"
                        onClick={clearHistory}
                        className="text-xs text-zinc-500 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {history.slice(0, 6).map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() => runSearch(item, 'unknown')}
                          className="rounded-full border border-zinc-800 px-3 py-1 text-sm text-zinc-300 transition-colors hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <aside className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <Server size={15} className="text-teal-300" />
                  Configuration
                </div>
                {configError && <p className="text-sm text-red-300">{configError}</p>}
                {config ? (
                  <>
                    <div className="flex flex-col gap-2">
                      {config.services.map((service) => (
                        <div key={service.name} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-zinc-300">{service.label}</span>
                          <HealthBadge state={config.checks[service.name]} />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-zinc-500">
                      <Badge variant="outline" className="justify-start gap-1 border-zinc-700 text-zinc-400">
                        <HardDrive size={11} /> {config.runtime.cache}
                      </Badge>
                      <Badge variant="outline" className="justify-start gap-1 border-zinc-700 text-zinc-400">
                        <ShieldCheck size={11} /> protected writes
                      </Badge>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">Checking services…</p>
                )}
              </aside>
            </div>
          )}
        </div>
      </section>

      {hasActivity && (
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
          {mediaInfo && <MediaInfoCard mediaInfo={mediaInfo} />}

          {trackerStatuses.length > 0 && (
            <TrackerProgress
              statuses={trackerStatuses}
              total={totalIndexers}
              completed={completedIndexers}
              isComplete={state === 'complete' || state === 'error'}
            />
          )}

          <div className="flex items-center justify-between gap-3 lg:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMobileFiltersOpen(true)}
              className="gap-2 border-zinc-700"
              disabled={results.length === 0}
            >
              <Filter size={14} />
              Filters
              {filterCount > 0 && <span className="text-teal-300">({filterCount})</span>}
            </Button>
            <ResultsHeader
              state={state}
              totalResults={results.length}
              filteredResults={filteredResults.length}
              error={error}
            />
          </div>

          {(results.length > 0 || state === 'searching' || state === 'error') && (
            <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
              {results.length > 0 && (
                <aside className="sticky top-28 hidden lg:block">
                  {filterPanel}
                </aside>
              )}

              <div className="min-w-0">
                <div className="mb-3 hidden lg:block">
                  <ResultsHeader
                    state={state}
                    totalResults={results.length}
                    filteredResults={filteredResults.length}
                    error={error}
                  />
                </div>
                <ResultsContainer results={filteredResults} state={state} />
              </div>
            </div>
          )}

          {state === 'complete' && results.length === 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-12 text-center text-zinc-500">
              <p className="mb-2 text-lg text-zinc-300">No Results Found</p>
              <p className="text-sm">Try a different title, choose TV/Movie manually, or check Jackett indexers.</p>
            </div>
          )}
        </section>
      )}

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 lg:hidden" role="dialog" aria-modal="true" aria-labelledby="filter-title">
          <div className="ml-auto flex h-full max-w-sm flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 id="filter-title" className="text-base font-semibold text-white">Filters</h2>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setMobileFiltersOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto">{filterPanel}</div>
          </div>
        </div>
      )}
    </main>
  );
}
