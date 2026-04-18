import { TorrentResult } from '@/types';

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

export function scoreTorrent(result: TorrentResult): number {
  const seedScore = Math.min(25, Math.log10(Math.max(result.seeders, 0) + 1) * 10);
  const sourceCount = result.duplicateSources ? result.duplicateSources.length + 1 : 1;
  const sourceBonus = Math.min(8, (sourceCount - 1) * 2);
  const freeleechBonus = result.releaseInfo.isFreeleech ? 8 : 0;
  const hdrBonus = result.releaseInfo.hdr || result.releaseInfo.dolbyVision ? 4 : 0;

  return Math.round(
    (RESOLUTION_SCORE[result.releaseInfo.resolution] ?? 0) +
      (SOURCE_SCORE[result.releaseInfo.source] ?? 0) +
      (CODEC_SCORE[result.releaseInfo.codec] ?? 0) +
      seedScore +
      sourceBonus +
      freeleechBonus +
      hdrBonus
  );
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Usable';
  return 'Low confidence';
}
