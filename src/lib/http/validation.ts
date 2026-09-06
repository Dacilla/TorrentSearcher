import { ContentType } from '@/types';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; status: number };

const CONTENT_TYPES = new Set<ContentType>(['movie', 'tv', 'unknown']);

const MAX_QUERY_LEN = 200;
const MAX_TITLE_LEN = 300;
const MAX_CODEC_LEN = 16;
const VALID_CODECS = new Set(['AV1', 'HEVC', 'x264', 'x265', 'VC1', 'unknown']);
const IMDB_RE = /^tt\d{7,9}$/;

function parseStrictInt(value: string): number | undefined {
  const t = value.trim();
  if (!/^-?\d+$/.test(t)) return undefined;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : undefined;
}

function parseBoundedInt(
  value: string | null,
  min: number,
  max: number
): number | undefined {
  if (!value) return undefined;
  const n = parseStrictInt(value);
  if (n === undefined || n < min || n > max) return undefined;
  return n;
}

export function parseContentType(value: string | null | undefined): ContentType {
  return value && CONTENT_TYPES.has(value as ContentType) ? (value as ContentType) : 'unknown';
}

export function parseOptionalInt(value: string | null): number | undefined {
  if (!value) return undefined;
  return parseStrictInt(value);
}

export function parseRequiredPositiveInt(
  value: unknown,
  field: string
): ValidationResult<number> {
  const raw = typeof value === 'number' ? String(value) : String(value ?? '');
  // Numbers must be integers; strings must be strict integer text (no trailing garbage/floats).
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value <= 0) {
      return { ok: false, error: `${field} must be a positive integer`, status: 400 };
    }
    return { ok: true, value };
  }
  const parsed = parseStrictInt(raw);
  if (parsed === undefined || parsed <= 0) {
    return { ok: false, error: `${field} must be a positive integer`, status: 400 };
  }
  return { ok: true, value: parsed };
}

export function parseSearchParams(sp: URLSearchParams): ValidationResult<{
  query: string;
  contentType: ContentType;
  season?: number;
  episode?: number;
  wantedCodec?: string;
  tmdbId?: number;
  imdbId?: string;
  tvdbId?: number;
  title?: string;
  year?: number;
}> {
  const query = (sp.get('q') ?? '').trim();
  if (!query) return { ok: false, error: 'Search query is required', status: 400 };
  if (query.length > MAX_QUERY_LEN) return { ok: false, error: `Search query must be ≤ ${MAX_QUERY_LEN} chars`, status: 400 };

  const tmdbId = parseBoundedInt(sp.get('tmdbId'), 1, 999_999_999);
  const tvdbId = parseBoundedInt(sp.get('tvdbId'), 1, 999_999_999);
  const year = parseBoundedInt(sp.get('year'), 1880, 2100);
  const season = parseBoundedInt(sp.get('season'), 0, 100);
  const episode = parseBoundedInt(sp.get('episode'), 0, 366);

  const rawCodec = sp.get('codec') ?? undefined;
  const wantedCodec = rawCodec && rawCodec.length <= MAX_CODEC_LEN && VALID_CODECS.has(rawCodec)
    ? rawCodec
    : rawCodec ? undefined : undefined;

  const rawImdb = sp.get('imdbId') ?? undefined;
  const imdbId = rawImdb && IMDB_RE.test(rawImdb.trim()) ? rawImdb.trim() : rawImdb ? undefined : undefined;

  const rawTitle = sp.get('title') ?? undefined;
  const title = rawTitle && rawTitle.length > MAX_TITLE_LEN ? rawTitle.slice(0, MAX_TITLE_LEN) : rawTitle;

  return {
    ok: true,
    value: {
      query,
      contentType: parseContentType(sp.get('contentType')),
      season,
      episode,
      wantedCodec,
      tmdbId,
      imdbId,
      tvdbId,
      title,
      year,
    },
  };
}

