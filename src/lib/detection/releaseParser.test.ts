import { describe, expect, it } from 'vitest';
import { parseReleaseTitle } from './releaseParser';

describe('parseReleaseTitle', () => {
  it('extracts quality markers and release metadata', () => {
    expect(parseReleaseTitle('Movie.2024.2160p.UHD.BluRay.HEVC.HDR-NTb')).toMatchObject({
      resolution: '2160p',
      source: 'BluRay',
      codec: 'HEVC',
      hdr: true,
      releaseGroup: 'NTb',
    });
  });

  it('detects freeleech and TV episode information', () => {
    expect(parseReleaseTitle('Show.S02E05.1080p.WEB-DL.x264.FL-GROUP')).toMatchObject({
      resolution: '1080p',
      source: 'WEB-DL',
      codec: 'x264',
      isFreeleech: true,
      season: 2,
      episode: 5,
    });
  });
});

