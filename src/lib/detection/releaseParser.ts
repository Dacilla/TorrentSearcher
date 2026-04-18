import { ReleaseInfo, VideoCodec, Resolution, Source } from '@/types';

export function parseReleaseTitle(title: string): ReleaseInfo {
  const t = title;

  // ── Resolution ────────────────────────────────────────────────────────────
  let resolution: Resolution = 'unknown';
  if (/\b2160p\b/i.test(t) || /\b4K\b/.test(t) || /\bUHD\b/i.test(t)) resolution = '2160p';
  else if (/\b1080p\b/i.test(t) || /\bFull.?HD\b/i.test(t)) resolution = '1080p';
  else if (/\b720p\b/i.test(t)) resolution = '720p';
  else if (/\b480p\b/i.test(t) || /\b576p\b/i.test(t)) resolution = '480p';

  // ── Codec ─────────────────────────────────────────────────────────────────
  let codec: VideoCodec = 'unknown';
  if (/\bAV1\b/i.test(t)) codec = 'AV1';
  else if (/\bHEVC\b/i.test(t) || /\bx265\b/i.test(t) || /\bH\.265\b/i.test(t)) codec = 'HEVC';
  else if (/\bx264\b/i.test(t) || /\bH\.264\b/i.test(t) || /\bAVC\b/i.test(t)) codec = 'x264';
  else if (/\bVC-?1\b/i.test(t)) codec = 'VC1';

  // ── Source ────────────────────────────────────────────────────────────────
  let source: Source = 'unknown';
  if (/\bREMUX\b/i.test(t)) source = 'Remux';
  else if (/\bBlu-?Ray\b/i.test(t) || /\bBDRip\b/i.test(t) || /\bBDMV\b/i.test(t)) source = 'BluRay';
  else if (/\bWEB-?DL\b/i.test(t) || /\bWEBDL\b/i.test(t)) source = 'WEB-DL';
  else if (/\bWEB-?Rip\b/i.test(t)) source = 'WEBRip';
  else if (/\bHDTV\b/i.test(t) || /\bPDTV\b/i.test(t)) source = 'HDTV';
  else if (/\bDVDRip\b/i.test(t) || /\bDVD\b/i.test(t)) source = 'DVDRip';
  else if (/\bWEB\b/i.test(t)) source = 'WEB-DL';

  // ── HDR / Dolby Vision ────────────────────────────────────────────────────
  const hdr = /\bHDR\b/i.test(t) || /\bHDR10\b/i.test(t) || /\bHLG\b/i.test(t);
  const dolbyVision = /\bDV\b/.test(t) || /\bDoVi\b/i.test(t) || /\bDolby.?Vision\b/i.test(t);

  // ── Freeleech ─────────────────────────────────────────────────────────────
  const isFreeleech = /\bFreeleech\b/i.test(t) || /\bFL\b/.test(t);

  // ── Season / Episode ──────────────────────────────────────────────────────
  let season: number | undefined;
  let episode: number | undefined;
  const seMatch = /S(\d{1,2})E(\d{1,2})/i.exec(t);
  if (seMatch) {
    season = parseInt(seMatch[1], 10);
    episode = parseInt(seMatch[2], 10);
  } else {
    const sMatch = /Season\s+(\d{1,2})/i.exec(t);
    if (sMatch) season = parseInt(sMatch[1], 10);
  }

  // ── Release Group ─────────────────────────────────────────────────────────
  const parts = t.replace(/\[.*?\]/g, '').split('-');
  const lastPart = parts[parts.length - 1]?.trim();
  const releaseGroup =
    lastPart && /^[A-Za-z0-9]+$/.test(lastPart) && lastPart.length < 20
      ? lastPart
      : undefined;

  return { resolution, codec, source, hdr, dolbyVision, isFreeleech, season, episode, releaseGroup };
}
