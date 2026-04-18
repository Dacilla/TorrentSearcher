import { describe, expect, it } from 'vitest';
import { TorrentResult } from '@/types';
import { DEFAULT_FILTERS, filterAndSortResults } from './useFilters';

function result(id: string, seeders: number, resolution: TorrentResult['releaseInfo']['resolution']): TorrentResult {
  return {
    id,
    downloadUrl: 'https://example.test',
    guid: id,
    title: id,
    indexerId: 'idx',
    indexerName: 'Indexer',
    category: 2000,
    size: seeders,
    seeders,
    leechers: 0,
    publishDate: `2024-01-0${seeders > 10 ? 2 : 1}T00:00:00.000Z`,
    releaseInfo: {
      resolution,
      codec: 'x264',
      source: 'WEB-DL',
      hdr: false,
      dolbyVision: false,
      isFreeleech: false,
    },
  };
}

describe('filterAndSortResults', () => {
  it('filters by resolution and sorts by seeders', () => {
    const filtered = filterAndSortResults(
      [result('a', 10, '720p'), result('b', 50, '1080p'), result('c', 5, '1080p')],
      { ...DEFAULT_FILTERS, resolutions: ['1080p'] },
      'seeders'
    );

    expect(filtered.map((item) => item.id)).toEqual(['b', 'c']);
  });
});
