import { describe, expect, it } from 'vitest';
import { TorrentResult } from '@/types';
import { scoreLabel, scoreTorrent } from './scoring';

const base: TorrentResult = {
  id: '1',
  downloadUrl: 'https://example.test',
  guid: 'g',
  title: 'Example',
  indexerId: 'idx',
  indexerName: 'Indexer',
  category: 2000,
  size: 1,
  seeders: 10,
  leechers: 0,
  publishDate: '2024-01-01T00:00:00.000Z',
  releaseInfo: {
    resolution: '1080p',
    codec: 'x264',
    source: 'WEB-DL',
    hdr: false,
    dolbyVision: false,
    isFreeleech: false,
  },
};

describe('scoreTorrent', () => {
  it('rewards quality, seeders, freeleech, and duplicate sources', () => {
    const strong = {
      ...base,
      seeders: 500,
      duplicateSources: [{ ...base, indexerId: 'idx2', indexerName: 'Second' }],
      releaseInfo: { ...base.releaseInfo, resolution: '2160p' as const, isFreeleech: true },
    };

    expect(scoreTorrent(strong)).toBeGreaterThan(scoreTorrent(base));
    expect(scoreLabel(scoreTorrent(strong))).toMatch(/Strong|Excellent/);
  });
});

