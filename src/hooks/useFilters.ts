'use client';

import { useState, useMemo } from 'react';
import { TorrentResult, ResultFilters, Resolution, VideoCodec, Source } from '@/types';

const DEFAULT_FILTERS: ResultFilters = {
  resolutions: [],
  codecs: [],
  sources: [],
  freeleechOnly: false,
  minSeeders: 0,
};

export type SortKey = 'seeders' | 'date' | 'size' | 'resolution';

const RESOLUTION_ORDER: Resolution[] = ['2160p', '1080p', '720p', '480p', 'unknown'];
const resolutionRank = (r: Resolution) => RESOLUTION_ORDER.indexOf(r);

export function filterAndSortResults(
  results: TorrentResult[],
  filters: ResultFilters,
  sort: SortKey
): TorrentResult[] {
  let list = results;

  if (filters.resolutions.length > 0) {
    list = list.filter((r) => filters.resolutions.includes(r.releaseInfo.resolution));
  }
  if (filters.codecs.length > 0) {
    list = list.filter((r) => filters.codecs.includes(r.releaseInfo.codec));
  }
  if (filters.sources.length > 0) {
    list = list.filter((r) => filters.sources.includes(r.releaseInfo.source));
  }
  if (filters.freeleechOnly) {
    list = list.filter((r) => r.releaseInfo.isFreeleech);
  }
  if (filters.minSeeders > 0) {
    list = list.filter((r) => r.seeders >= filters.minSeeders);
  }

  return [...list].sort((a, b) => {
    switch (sort) {
      case 'seeders':
        return b.seeders - a.seeders;
      case 'date':
        return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
      case 'size':
        return b.size - a.size;
      case 'resolution':
        return resolutionRank(a.releaseInfo.resolution) - resolutionRank(b.releaseInfo.resolution);
      default:
        return 0;
    }
  });
}

export function useFilters(
  results: TorrentResult[],
  initialFilters: ResultFilters = DEFAULT_FILTERS,
  initialSort: SortKey = 'seeders'
) {
  const [filters, setFilters] = useState<ResultFilters>(initialFilters);
  const [sort, setSort] = useState<SortKey>(initialSort);

  const toggleResolution = (r: Resolution) =>
    setFilters((f) => ({
      ...f,
      resolutions: f.resolutions.includes(r)
        ? f.resolutions.filter((x) => x !== r)
        : [...f.resolutions, r],
    }));

  const toggleCodec = (c: VideoCodec) =>
    setFilters((f) => ({
      ...f,
      codecs: f.codecs.includes(c)
        ? f.codecs.filter((x) => x !== c)
        : [...f.codecs, c],
    }));

  const toggleSource = (s: Source) =>
    setFilters((f) => ({
      ...f,
      sources: f.sources.includes(s)
        ? f.sources.filter((x) => x !== s)
        : [...f.sources, s],
    }));

  const filteredResults = useMemo(() => {
    return filterAndSortResults(results, filters, sort);
  }, [results, filters, sort]);

  // Compute available filter options from current results
  const availableResolutions = useMemo(
    () => [...new Set(results.map((r) => r.releaseInfo.resolution))].filter((r) => r !== 'unknown'),
    [results]
  );
  const availableCodecs = useMemo(
    () => [...new Set(results.map((r) => r.releaseInfo.codec))].filter((c) => c !== 'unknown'),
    [results]
  );
  const availableSources = useMemo(
    () => [...new Set(results.map((r) => r.releaseInfo.source))].filter((s) => s !== 'unknown'),
    [results]
  );

  const freeleechCount = useMemo(
    () => results.filter((r) => r.releaseInfo.isFreeleech).length,
    [results]
  );

  return {
    filters,
    setFilters,
    sort,
    setSort,
    filteredResults,
    toggleResolution,
    toggleCodec,
    toggleSource,
    availableResolutions,
    availableCodecs,
    availableSources,
    freeleechCount,
    resetFilters: () => setFilters(DEFAULT_FILTERS),
  };
}

export { DEFAULT_FILTERS };
