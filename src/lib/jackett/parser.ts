import { XMLParser } from 'fast-xml-parser';
import crypto from 'crypto';
import { TorrentResult, ReleaseInfo } from '@/types';
import { parseReleaseTitle } from '@/lib/detection/releaseParser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'item',
});

function attr(attrs: Record<string, unknown>[], name: string): string | undefined {
  const found = attrs.find((a) => a['@_name'] === name || a.name === name);
  if (!found) return undefined;
  const val = found['@_value'] ?? found.value;
  return val != null ? String(val) : undefined;
}

export function parseTorznabXml(
  xml: string,
  indexerId: string,
  indexerName: string
): TorrentResult[] {
  let doc: ReturnType<typeof parser.parse>;
  try {
    doc = parser.parse(xml);
  } catch (e) {
    console.error(`[parser] XML parse error for ${indexerId}:`, e);
    return [];
  }

  const items: unknown[] = doc?.rss?.channel?.item ?? [];
  if (!Array.isArray(items)) return [];

  const results: TorrentResult[] = [];

  for (const raw of items) {
    const item = raw as Record<string, unknown>;

    try {
      // Torznab attributes come as <torznab:attr> elements
      const torznabAttrs: Record<string, unknown>[] = (() => {
        const a = item['torznab:attr'] ?? item['attr'];
        if (!a) return [];
        return Array.isArray(a) ? a : [a];
      })();

      const title = String(item.title ?? '');
      const guidRaw = item.guid as Record<string, unknown> | string | undefined;
      const guid = String(
        (typeof guidRaw === 'object' && guidRaw?.['#text']) ?? guidRaw ?? ''
      );
      const downloadUrl = String(
        item.link ??
          attr(torznabAttrs, 'magneturl') ??
          ''
      );
      const magnetUrl = attr(torznabAttrs, 'magneturl') ?? undefined;
      const infoHash = attr(torznabAttrs, 'infohash') ?? undefined;
      const publishDate = String(item.pubDate ?? '');

      const sizeRaw = attr(torznabAttrs, 'size') ?? item.size;
      const size = parseInt(String(sizeRaw ?? '0'), 10) || 0;

      const seeders = parseInt(attr(torznabAttrs, 'seeders') ?? '0', 10) || 0;
      const leechers = parseInt(attr(torznabAttrs, 'leechers') ?? '0', 10) || 0;
      const grabs = parseInt(attr(torznabAttrs, 'grabs') ?? '0', 10) || undefined;

      const categoryRaw =
        attr(torznabAttrs, 'category') ?? item.category;
      const category = parseInt(String(categoryRaw ?? '0'), 10) || 0;

      // Freeleech from download volume factor
      const downloadFactor = parseFloat(attr(torznabAttrs, 'downloadvolumefactor') ?? '1');
      const isFreeleechFromAttr = downloadFactor === 0;

      const parsedRelease = parseReleaseTitle(title);
      const releaseInfo: ReleaseInfo = {
        ...parsedRelease,
        isFreeleech: isFreeleechFromAttr || parsedRelease.isFreeleech,
      };

      const id = crypto
        .createHash('sha1')
        .update(`${indexerId}:${infoHash ?? title}`)
        .digest('hex');

      results.push({
        id,
        infoHash,
        magnetUrl,
        downloadUrl,
        guid,
        title,
        indexerId,
        indexerName,
        category,
        size,
        seeders,
        leechers,
        grabs,
        releaseInfo,
        publishDate,
      });
    } catch (e) {
      console.error(`[parser] Failed to parse item in ${indexerId}:`, e);
    }
  }

  return results;
}
