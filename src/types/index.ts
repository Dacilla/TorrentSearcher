// ── Content Type ──────────────────────────────────────────────────────────────
export type ContentType = 'movie' | 'tv' | 'unknown';

// ── Jackett Caps ──────────────────────────────────────────────────────────────
export interface IndexerCapabilities {
  indexerId: string;
  displayName: string;
  searchModes: {
    basic: boolean;
    'tv-search': boolean;
    'movie-search': boolean;
  };
  supportedParams: {
    tvSearch: Array<'q' | 'season' | 'ep' | 'tvdbid' | 'imdbid' | 'tmdbid'>;
    movieSearch: Array<'q' | 'imdbid' | 'tmdbid'>;
  };
  categories: number[];
  supportsTV: boolean;     // derived: has cat 5000–5080
  supportsMovies: boolean; // derived: has cat 2000–2080
  lastUpdated: number;     // epoch ms
  responseTimeMs?: number;
}

// ── Affinity Cache ─────────────────────────────────────────────────────────────
export interface IndexerAffinity {
  indexerId: string;
  codecScores: Record<string, number>; // e.g. { AV1: 12, HEVC: 45 }
  totalResults: number;
  lastQueried: number;
}

// ── TMDB / Media Metadata ──────────────────────────────────────────────────────
export interface MediaInfo {
  contentType: ContentType;
  title: string;
  year?: number;
  overview?: string;
  posterPath?: string; // TMDB path, not full URL
  tmdbId: number;
  imdbId?: string;     // e.g. "tt1234567"
  tvdbId?: number;     // TV only
  rating?: number;
  genres?: string[];
  seasons?: number;
  episodeCount?: number;
  status?: string;
}

// ── Arr Status ─────────────────────────────────────────────────────────────────
export type ArrStatus = 'monitored' | 'unmonitored' | 'missing' | 'not-in-library' | 'loading' | 'error';

export interface ArrInfo {
  status: ArrStatus;
  qualityProfile?: string;
  path?: string;
  missingEpisodes?: number; // Sonarr only
}

// ── Release Parsing ────────────────────────────────────────────────────────────
export type VideoCodec = 'AV1' | 'HEVC' | 'x264' | 'x265' | 'VC1' | 'unknown';
export type Resolution = '2160p' | '1080p' | '720p' | '480p' | 'unknown';
export type Source = 'BluRay' | 'Remux' | 'WEB-DL' | 'WEBRip' | 'HDTV' | 'DVDRip' | 'unknown';

export interface ReleaseInfo {
  resolution: Resolution;
  codec: VideoCodec;
  source: Source;
  hdr: boolean;
  dolbyVision: boolean;
  releaseGroup?: string;
  isFreeleech: boolean;
  season?: number;
  episode?: number;
}

// ── Torrent Result ─────────────────────────────────────────────────────────────
export interface TorrentResult {
  id: string;
  infoHash?: string;
  magnetUrl?: string;
  downloadUrl: string;
  guid: string;
  title: string;
  indexerId: string;
  indexerName: string;
  category: number;
  size: number; // bytes
  seeders: number;
  leechers: number;
  grabs?: number;
  releaseInfo: ReleaseInfo;
  publishDate: string; // ISO8601
  duplicateGroup?: string;
  duplicateSources?: TorrentSource[];
}

export interface TorrentSource {
  indexerId: string;
  indexerName: string;
  infoHash?: string;
  magnetUrl?: string;
  downloadUrl: string;
  guid: string;
  seeders: number;
  leechers: number;
}

// ── SSE Event Types ────────────────────────────────────────────────────────────
export type SSEEventType =
  | 'indexer_start'
  | 'indexer_results'
  | 'indexer_error'
  | 'indexer_done'
  | 'search_complete';

export interface SSEEvent {
  type: SSEEventType;
  indexerId?: string;
  indexerName?: string;
  results?: TorrentResult[];
  error?: string;
  totalIndexers?: number;
  completedIndexers?: number;
  durationMs?: number;
}

// ── Search Parameters ──────────────────────────────────────────────────────────
export interface SearchParams {
  query: string;
  contentType: ContentType;
  mediaInfo?: MediaInfo;
  season?: number;
  episode?: number;
  filters?: ResultFilters;
}

export interface ResultFilters {
  resolutions: Resolution[];
  codecs: VideoCodec[];
  sources: Source[];
  freeleechOnly: boolean;
  minSeeders: number;
}

// ── Tracker Status (for UI progress) ──────────────────────────────────────────
export type TrackerState = 'loading' | 'done' | 'error' | 'skipped';

export interface TrackerStatus {
  indexerId: string;
  indexerName: string;
  state: TrackerState;
  resultCount?: number;
  durationMs?: number;
  error?: string;
}

// ── Query Router Output ────────────────────────────────────────────────────────
export interface IndexerQuery {
  indexerId: string;
  indexerName: string;
  params: Record<string, string>;
  categories: number[];
}

// ── Known Good Release Groups ──────────────────────────────────────────────────
export const KNOWN_GOOD_GROUPS = new Set([
  'YIFY', 'YTS', 'SPARKS', 'FGT', 'AMIABLE', 'GECKOS', 'NTG',
  'FLUX', 'CMRG', 'DEFLATE', 'NTb', 'KiNGS', 'TOMMY', 'HONE',
  'playWEB', 'SMURF', 'MZABI', 'PATHE', 'TEPES', 'BYNDR',
]);

export const RELEASE_GROUP_SCORE: Record<string, number> = {
  YIFY: 2, YTS: 2, SPARKS: 5, FGT: 3, AMIABLE: 4, GECKOS: 4,
  NTG: 4, FLUX: 4, CMRG: 5, DEFLATE: 4, NTb: 5, KiNGS: 4,
  TOMMY: 4, HONE: 4, playWEB: 5, SMURF: 4, MZABI: 5, PATHE: 4,
  TEPES: 4, BYNDR: 4,
};
