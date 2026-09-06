import { TorrentResult, RELEASE_GROUP_SCORE } from '@/types';

const RESOLUTION_SCORE: Record<string, number> = {
  '2160p': 35,
  '1080p': 28,
  '720p': 18,
  '480p': 8,
  unknown: 0,
};

const SOURCE_SCORE: Record<string, number> = {
  Remux: 18,
  BluRay: 16,
  'WEB-DL': 14,
  WEBRip: 10,
  HDTV: 8,
  DVDRip: 5,
  unknown: 0,
};

const CODEC_SCORE: Record<string, number> = {
  AV1: 10,
  HEVC: 9,
  x265: 9,
  x264: 7,
  VC1: 2,
  unknown: 0,
};

function safeInt(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

export function scoreTorrent(result: TorrentResult): number {
  const seeders = safeInt(result.seeders);
  const seedScore = Math.min(25, Math.log10(seeders + 1) * 10);
  const sourceCount = result.duplicateSources ? result.duplicateSources.length + 1 : 1;
  const sourceBonus = Math.min(8, (Math.max(1, sourceCount) - 1) * 2);
  const freeleechBonus = result.releaseInfo.isFreeleech ? 8 : 0;
  const hdrBonus = result.releaseInfo.hdr || result.releaseInfo.dolbyVision ? 4 : 0;
  const groupBonus = result.releaseInfo.releaseGroup
    ? (RELEASE_GROUP_SCORE[result.releaseInfo.releaseGroup] ?? RELEASE_GROUP_SCORE[result.releaseInfo.releaseGroup.toUpperCase()] ?? 0)
    : 0;
  // Unseeded releases are rarely usable: cap their total below a seeded 1080p.
  const unseededPenalty = seeders === 0 ? -25 : 0;

  const total =
    (RESOLUTION_SCORE[result.releaseInfo.resolution] ?? 0) +
    (SOURCE_SCORE[result.releaseInfo.source] ?? 0) +
    (CODEC_SCORE[result.releaseInfo.codec] ?? 0) +
    seedScore +
    sourceBonus +
    freeleechBonus +
    hdrBonus +
    groupBonus +
    unseededPenalty;
  if (!Number.isFinite(total)) return 0;
  return Math.round(Math.max(0, total));
}

export function scoreBreakdown(result: TorrentResult): Array<{ k: string; v: string; s: number; max: number }> {
  const seeders = safeInt(result.seeders);
  const group = result.releaseInfo.releaseGroup ?? '';
  const isKnown = group ? (RELEASE_GROUP_SCORE[group] ?? RELEASE_GROUP_SCORE[group.toUpperCase()] ?? 0) > 0 : false;
  return [
    { k: 'Resolution', v: result.releaseInfo.resolution, s: RESOLUTION_SCORE[result.releaseInfo.resolution] ?? 0, max: 35 },
    { k: 'Source', v: result.releaseInfo.source, s: SOURCE_SCORE[result.releaseInfo.source] ?? 0, max: 18 },
    { k: 'Codec', v: result.releaseInfo.codec, s: CODEC_SCORE[result.releaseInfo.codec] ?? 0, max: 10 },
    { k: 'Seeders', v: String(seeders), s: Math.round(Math.min(25, Math.log10(seeders + 1) * 10)), max: 25 },
    { k: 'Group', v: group || '—', s: isKnown ? (RELEASE_GROUP_SCORE[group] ?? RELEASE_GROUP_SCORE[group.toUpperCase()] ?? 0) : 0, max: 5 },
  ];
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Usable';
  return 'Low confidence';
}
