'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { DEFAULT_FILTERS, SortKey, useFilters } from '@/hooks/useFilters';
import { useConfig, ConfigState } from '@/hooks/useConfig';
import { ContentType, ResultFilters } from '@/types';
import { detectContentType } from '@/lib/detection/contentType';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { StatusBar } from '@/components/dashboard/StatusBar';
import { MediaPanel } from '@/components/dashboard/MediaPanel';
import { TrackerRibbon } from '@/components/dashboard/TrackerRibbon';
import { FilterRail, computeFilterCounts } from '@/components/dashboard/FilterRail';
import { ResultsTable } from '@/components/dashboard/ResultsTable';
import { Inspector } from '@/components/dashboard/Inspector';

type Density = 'comfy' | 'compact' | 'dense';

function validContentType(v: string | null): ContentType {
  return v === 'tv' || v === 'movie' ? v : 'unknown';
}

function validSort(v: string | null): SortKey {
  const valid: SortKey[] = ['seeders', 'date', 'size', 'resolution', 'score', 'title', 'leechers', 'indexer'];
  return valid.includes(v as SortKey) ? (v as SortKey) : 'score';
}

function readCsv<T extends string>(v: string | null): T[] {
  return v ? (v.split(',').filter(Boolean) as T[]) : [];
}

function readInitialState() {
  if (typeof window === 'undefined') {
    return { query: '', contentType: 'unknown' as ContentType, sort: 'score' as SortKey, filters: DEFAULT_FILTERS };
  }
  const sp = new URLSearchParams(window.location.search);
  return {
    query: sp.get('q') ?? '',
    contentType: validContentType(sp.get('contentType')),
    sort: validSort(sp.get('sort')),
    filters: {
      ...DEFAULT_FILTERS,
      resolutions: readCsv(sp.get('res')),
      codecs: readCsv(sp.get('codec')),
      sources: readCsv(sp.get('source')),
      freeleechOnly: sp.get('freeleech') === 'true',
      minSeeders: parseInt(sp.get('seeders') ?? '0', 10) || 0,
    } as ResultFilters,
  };
}

function replaceUrl(query: string, contentType: ContentType, sort: SortKey, filters: ResultFilters) {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams();
  if (query.trim()) sp.set('q', query.trim());
  if (contentType !== 'unknown') sp.set('contentType', contentType);
  if (sort !== 'score') sp.set('sort', sort);
  if (filters.resolutions.length) sp.set('res', filters.resolutions.join(','));
  if (filters.codecs.length) sp.set('codec', filters.codecs.join(','));
  if (filters.sources.length) sp.set('source', filters.sources.join(','));
  if (filters.freeleechOnly) sp.set('freeleech', 'true');
  if (filters.minSeeders > 0) sp.set('seeders', String(filters.minSeeders));
  window.history.replaceState(null, '', sp.toString() ? `?${sp.toString()}` : window.location.pathname);
}

export default function HomePage() {
  const initial = useMemo(readInitialState, []);

  const { state, mediaInfo, results, trackerStatuses, totalIndexers, completedIndexers, error, search, reset } = useSearch();

  const { filters, setFilters, sort, setSort, filteredResults, resetFilters } = useFilters(
    results,
    initial.filters,
    initial.sort
  );

  const [query, setQuery] = useState(initial.query);
  const [contentType, setContentType] = useState<ContentType>(initial.contentType);
  const [selected, setSelected] = useState<string | null>(null);
  const [sidebar, dispatchSidebar] = useReducer(
    (s: { collapsed: boolean; density: Density }, a: { type: 'toggle' } | { type: 'setDensity'; density: Density }) => {
      if (a.type === 'toggle') return { ...s, collapsed: !s.collapsed };
      return { ...s, density: a.density };
    },
    { collapsed: false, density: 'comfy' as Density }
  );
  const sidebarCollapsed = sidebar.collapsed;
  const density = sidebar.density;
  const toggleSidebar = useCallback(() => dispatchSidebar({ type: 'toggle' }), []);
  const setDensity = useCallback((v: Density) => dispatchSidebar({ type: 'setDensity', density: v }), []);
  const config = useConfig();
  const hasAutoSearchedRef = useRef(false);

  const isSearching = state === 'searching' || state === 'resolving';
  const counts = useMemo(() => computeFilterCounts(results), [results]);

  const freeleechCount = useMemo(
    () => results.filter((r) => r.releaseInfo.isFreeleech).length,
    [results]
  );

  const trackersUp = trackerStatuses.filter((t) => t.state === 'done').length;
  const elapsed = trackerStatuses.reduce((m, t) => Math.max(m, t.durationMs ?? 0), 0) / 1000;

  const selectedResult = useMemo(
    () => filteredResults.find((r) => r.id === selected) ?? null,
    [filteredResults, selected]
  );

  // Keyboard shortcut: / to focus search
  const runSearch = useCallback(
    (nextQuery = query, nextType = contentType) => {
      const trimmed = nextQuery.trim();
      if (!trimmed) return;
      const detected = detectContentType(trimmed);
      const typeForSearch = nextType !== 'unknown' ? nextType : detected.type;
      setQuery(trimmed);
      setContentType(typeForSearch);
      setSelected(null);
      replaceUrl(trimmed, typeForSearch, sort, filters);
      search(trimmed, typeForSearch);
    },
    [contentType, filters, query, search, sort]
  );

  // Auto-search from URL on first load
  useEffect(() => {
    if (hasAutoSearchedRef.current || !initial.query) return;
    hasAutoSearchedRef.current = true;
    const t = window.setTimeout(() => runSearch(initial.query, initial.contentType), 0);
    return () => window.clearTimeout(t);
  }, [initial.contentType, initial.query, runSearch]);

  // Sync URL as filters/sort change
  useEffect(() => {
    if (state === 'idle' && !query.trim()) return;
    replaceUrl(query, contentType, sort, filters);
  }, [contentType, filters, query, sort, state]);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.ts-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const sortState = useMemo(
    () => ({ key: sort, dir: 'desc' as const }),
    [sort]
  );

  return (
    <div
      className={`ts-app${sidebarCollapsed ? ' is-collapsed' : ''}`}
      data-density={density}
      data-accent="teal"
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        checks={config?.checks}
      />

      <Topbar
        query={query}
        onQuery={setQuery}
        onSearch={runSearch}
        isSearching={isSearching}
        contentType={contentType}
        onContentType={setContentType}
        stats={{
          trackersUp,
          trackersTotal: totalIndexers,
          results: filteredResults.length,
          freeleech: freeleechCount,
          elapsed,
        }}
      />

      <div className="ts-main" data-layout="dashboard">
        {/* Left: filter rail */}
        <div className="ts-area-filters">
          <FilterRail
            filters={filters}
            setFilters={setFilters}
            counts={counts}
            onReset={resetFilters}
          />
        </div>

        {/* Center: media info */}
        <div className="ts-area-media">
          {mediaInfo && <MediaPanel media={mediaInfo} />}
        </div>

        {/* Center: tracker ribbon */}
        <div className="ts-area-tracker">
          <TrackerRibbon
            trackerStatuses={trackerStatuses}
            isSearching={isSearching}
            totalIndexers={totalIndexers}
          />
        </div>

        {/* Center: results table */}
        <div className="ts-area-results">
          <ResultsTable
            results={filteredResults}
            sort={sortState}
            setSort={setSort}
            selected={selected}
            setSelected={setSelected}
            density={density}
          />
        </div>

        {/* Right: inspector */}
        <div className="ts-area-inspector">
          <Inspector result={selectedResult} onClose={() => setSelected(null)} />
        </div>
      </div>

      <StatusBar
        trackerStatuses={trackerStatuses}
        totalIndexers={totalIndexers}
        config={config}
      />
    </div>
  );
}
