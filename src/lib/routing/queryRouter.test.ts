import { describe, expect, it } from 'vitest';
import { IndexerCapabilities } from '@/types';
import { selectIndexers } from './queryRouter';

const baseIndexer: IndexerCapabilities = {
  indexerId: 'idx',
  displayName: 'Indexer',
  searchModes: { basic: true, 'tv-search': true, 'movie-search': true },
  supportedParams: { tvSearch: ['q', 'tvdbid', 'season', 'ep'], movieSearch: ['q', 'tmdbid'] },
  categories: [2000, 2010, 5000, 5030],
  supportsTV: true,
  supportsMovies: true,
  lastUpdated: 0,
};

describe('selectIndexers', () => {
  it('uses TV IDs and episode params when available', () => {
    const [query] = selectIndexers(
      [baseIndexer],
      {
        query: 'Breaking Bad',
        contentType: 'tv',
        mediaInfo: { contentType: 'tv', title: 'Breaking Bad', tmdbId: 1, tvdbId: 81189 },
        season: 3,
        episode: 7,
      },
      []
    );

    expect(query.params).toMatchObject({ t: 'tvsearch', tvdbid: '81189', season: '3', ep: '7' });
    expect(query.categories).toEqual([5000, 5030]);
  });

  it('uses movie IDs for movie searches', () => {
    const [query] = selectIndexers(
      [baseIndexer],
      {
        query: 'Dune',
        contentType: 'movie',
        mediaInfo: { contentType: 'movie', title: 'Dune', tmdbId: 438631 },
      },
      []
    );

    expect(query.params).toMatchObject({ t: 'movie', tmdbid: '438631' });
    expect(query.categories).toEqual([2000, 2010]);
  });
});

