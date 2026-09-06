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
  const lower = name.toLowerCase();
  const found = attrs.find((a) => {
    const n = a['@_name'] ?? a.name;
    return typeof n === 'string' && n.toLowerCase() === lower;
  });
  if (!found) return undefined;
  const val = found['@_value'] ?? found.value;
  return val != null ? String(val) : undefined;
}

function parseFiniteInt(raw: unknown, fallback = 0): number {
  if (raw == null || raw === '') return fallback;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  return i < 0 ? fallback : i;
}

function extractGuid(guidRaw: unknown): string {
  if (typeof guidRaw === 'string') return guidRaw;
  if (guidRaw && typeof guidRaw === 'object') {
    const o = guidRaw as Record<string, unknown>;
    const text = o['#text'];
    if (typeof text === 'string') return text;
    if (text != null) return String(text);
    return '';
  }
  return guidRaw != null ? String(guidRaw) : '';
}

function extractLink(item: Record<string, unknown>): string {
  const link = item.link;
  if (typeof link === 'string') return link;
  if (link && typeof link === 'object') {
    const o = link as Record<string, unknown>;
    const text = o['#text'];
    if (typeof text === 'string') return text;
  }
  return '';
}

function toIsoDate(raw: unknown): string {
  if (!raw) return '';
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
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

      const title = String(item.title ?? '').trim();
      // Skip untitled items: they produce colliding IDs and unusable rows.
      if (!title) continue;
      const guidRaw = item.guid as Record<string, unknown> | string | undefined;
      const guid = extractGuid(guidRaw);
      const magnetFromAttr = attr(torznabAttrs, 'magneturl');
      const linkText = extractLink(item);
      const downloadUrl = String(linkText || magnetFromAttr || '');
      // Unusable result: nowhere to download from.
      if (!downloadUrl) continue;
      const magnetUrl = magnetFromAttr ?? undefined;
      const infoHash = attr(torznabAttrs, 'infohash') ?? undefined;
      const publishDate = toIsoDate(item.pubDate);

      const sizeRaw = attr(torznabAttrs, 'size') ?? item.size;
      const size = parseFiniteInt(sizeRaw, 0);

      const seeders = parseFiniteInt(attr(torznabAttrs, 'seeders'), 0);
      const leechers = parseFiniteInt(attr(torznabAttrs, 'leechers'), 0);
      const grabsRaw = attr(torznabAttrs, 'grabs');
      const grabs = grabsRaw == null || grabsRaw === '' ? undefined : parseFiniteInt(grabsRaw, 0);

      const categoryRaw = attr(torznabAttrs, 'category') ?? item.category;
      const category = Array.isArray(categoryRaw)
        ? parseFiniteInt(categoryRaw[0], 0)
        : parseFiniteInt(categoryRaw, 0);

      // Freeleech from download volume factor
      const dfRaw = attr(torznabAttrs, 'downloadvolumefactor') ?? '1';
      const downloadFactor = Number(String(dfRaw).trim());
      const isFreeleechFromAttr = downloadFactor === 0;

      const parsedRelease = parseReleaseTitle(title);
      const releaseInfo: ReleaseInfo = {
        ...parsedRelease,
        isFreeleech: isFreeleechFromAttr || parsedRelease.isFreeleech,
      };

      const id = crypto
        .createHash('sha1')
        .update(`${indexerId}:${infoHash ?? `${title.toLowerCase()}|${guid}|${size}`}`)
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
