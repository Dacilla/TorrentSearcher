import { describe, expect, it } from 'vitest';
import { parseTorznabXml } from './parser';

describe('parseTorznabXml', () => {
  it('parses torznab attrs into torrent results', () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel><item>
        <title>Example.2024.1080p.WEB-DL.x264-GROUP</title>
        <guid>abc</guid>
        <link>https://example.test/download</link>
        <pubDate>Mon, 01 Jan 2024 00:00:00 +0000</pubDate>
        <torznab:attr name="seeders" value="42" />
        <torznab:attr name="leechers" value="5" />
        <torznab:attr name="size" value="1073741824" />
        <torznab:attr name="infohash" value="ABC123" />
        <torznab:attr name="downloadvolumefactor" value="0" />
      </item></channel></rss>`;

    const [result] = parseTorznabXml(xml, 'idx', 'Indexer');
    expect(result).toMatchObject({
      infoHash: 'ABC123',
      indexerName: 'Indexer',
      seeders: 42,
      leechers: 5,
      size: 1073741824,
      releaseInfo: {
        resolution: '1080p',
        source: 'WEB-DL',
        codec: 'x264',
        isFreeleech: true,
      },
    });
  });
});

