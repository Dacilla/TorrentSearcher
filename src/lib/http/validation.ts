import { ContentType } from '@/types';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; status: number };

const CONTENT_TYPES = new Set<ContentType>(['movie', 'tv', 'unknown']);

export function parseContentType(value: string | null | undefined): ContentType {
  return value && CONTENT_TYPES.has(value as ContentType) ? (value as ContentType) : 'unknown';
}

export function parseOptionalInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseRequiredPositiveInt(
  value: unknown,
  field: string
): ValidationResult<number> {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
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

  const tmdbId = parseOptionalInt(sp.get('tmdbId'));
  const tvdbId = parseOptionalInt(sp.get('tvdbId'));
  const year = parseOptionalInt(sp.get('year'));

  return {
    ok: true,
    value: {
      query,
      contentType: parseContentType(sp.get('contentType')),
      season: parseOptionalInt(sp.get('season')),
      episode: parseOptionalInt(sp.get('episode')),
      wantedCodec: sp.get('codec') ?? undefined,
      tmdbId,
      imdbId: sp.get('imdbId') ?? undefined,
      tvdbId,
      title: sp.get('title') ?? undefined,
      year,
    },
  };
}

