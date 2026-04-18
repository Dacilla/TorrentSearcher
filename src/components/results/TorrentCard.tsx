'use client';

import { useState } from 'react';
import { TorrentResult } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RELEASE_GROUP_SCORE } from '@/types';
import { scoreLabel, scoreTorrent } from '@/lib/results/scoring';
import {
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  Users,
  ArrowDown,
  HardDrive,
  Calendar,
  Layers,
} from 'lucide-react';

interface Props {
  result: TorrentResult;
  isBest?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

const CODEC_COLORS: Record<string, string> = {
  AV1: 'bg-cyan-600/20 text-cyan-400 border-cyan-600/40',
  HEVC: 'bg-indigo-600/20 text-indigo-400 border-indigo-600/40',
  x264: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40',
  x265: 'bg-indigo-600/20 text-indigo-400 border-indigo-600/40',
  VC1: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40',
  unknown: 'bg-zinc-700/40 text-zinc-500 border-zinc-700/40',
};

const SOURCE_COLORS: Record<string, string> = {
  Remux: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40',
  BluRay: 'bg-blue-600/20 text-blue-400 border-blue-600/40',
  'WEB-DL': 'bg-sky-600/20 text-sky-400 border-sky-600/40',
  WEBRip: 'bg-sky-600/15 text-sky-500 border-sky-600/30',
  HDTV: 'bg-orange-600/20 text-orange-400 border-orange-600/40',
  DVDRip: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40',
  unknown: '',
};

const RES_COLORS: Record<string, string> = {
  '2160p': 'bg-violet-600/20 text-violet-400 border-violet-600/40',
  '1080p': 'bg-blue-600/20 text-blue-400 border-blue-600/40',
  '720p': 'bg-teal-600/20 text-teal-400 border-teal-600/40',
  '480p': 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40',
  unknown: '',
};

export function TorrentCard({ result, isBest }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const { releaseInfo } = result;
  const qualityScore = scoreTorrent(result);
  const sourceCount = (result.duplicateSources?.length ?? 0) + 1;
  const groupScore = releaseInfo.releaseGroup
    ? (RELEASE_GROUP_SCORE[releaseInfo.releaseGroup.toUpperCase()] ?? 0)
    : 0;

  const copyHash = async () => {
    const text = result.infoHash ?? result.magnetUrl ?? result.downloadUrl;
    try {
      await navigator.clipboard.writeText(text);
      setCopyError(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError('Clipboard unavailable');
    }
  };

  return (
    <article className="content-visibility-auto overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/55 transition-colors hover:border-zinc-700">
      <div className="px-4 py-3">
        {(isBest || qualityScore > 0) && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            {isBest && (
              <span className="rounded-full border border-teal-400/40 bg-teal-400/15 px-2 py-0.5 font-medium text-teal-200">
                Best match
              </span>
            )}
            <span className="rounded-full border border-zinc-700 bg-zinc-950/50 px-2 py-0.5 text-zinc-300">
              {scoreLabel(qualityScore)} · {qualityScore}/100
            </span>
          </div>
        )}

        {/* Title row */}
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm text-zinc-200 leading-snug ${expanded ? '' : 'line-clamp-2'} font-mono`}
            >
              {result.title}
            </p>
          </div>

          {/* Freeleech badge — prominent */}
          {releaseInfo.isFreeleech && (
            <Badge className="shrink-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/40 font-semibold text-xs">
              FL
            </Badge>
          )}
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {releaseInfo.resolution !== 'unknown' && (
            <Badge className={`${RES_COLORS[releaseInfo.resolution]} text-xs`}>
              {releaseInfo.resolution}
            </Badge>
          )}
          {releaseInfo.codec !== 'unknown' && (
            <Badge className={`${CODEC_COLORS[releaseInfo.codec]} text-xs`}>
              {releaseInfo.codec}
            </Badge>
          )}
          {releaseInfo.source !== 'unknown' && (
            <Badge className={`${SOURCE_COLORS[releaseInfo.source]} text-xs`}>
              {releaseInfo.source}
            </Badge>
          )}
          {releaseInfo.hdr && (
            <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/40 text-xs">HDR</Badge>
          )}
          {releaseInfo.dolbyVision && (
            <Badge className="bg-amber-600/25 text-amber-300 border-amber-500/40 text-xs">DV</Badge>
          )}
          {releaseInfo.releaseGroup && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                groupScore >= 4
                  ? 'border-emerald-600/40 text-emerald-500 bg-emerald-600/10'
                  : 'border-zinc-700 text-zinc-500'
              }`}
            >
              {releaseInfo.releaseGroup}
            </span>
          )}
          {sourceCount > 1 && (
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Layers size={10} /> {sourceCount} sources
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-zinc-500 mb-3">
          <span className="flex items-center gap-1 text-green-500">
            <Users size={11} /> {result.seeders.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <ArrowDown size={11} /> {result.leechers.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <HardDrive size={11} /> {formatBytes(result.size)}
          </span>
          {result.publishDate && (
            <span className="flex items-center gap-1">
              <Calendar size={11} /> {formatDate(result.publishDate)}
            </span>
          )}
          <span className="ml-auto text-zinc-600 truncate max-w-28">{result.indexerName}</span>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2">
          <a
            href={result.magnetUrl ?? result.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-7 px-3 text-xs bg-zinc-100 text-zinc-900 hover:bg-white font-medium rounded-lg transition-colors"
          >
            <Download size={11} />
            {result.magnetUrl ? 'Magnet' : 'Download'}
          </a>

          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs border-zinc-700 hover:border-zinc-500 gap-1.5"
            onClick={copyHash}
            aria-live="polite"
          >
            <Copy size={11} />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <span className="sr-only" aria-live="polite">
            {copied ? 'Copied torrent link' : copyError ?? ''}
          </span>

          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide torrent details' : 'Show torrent details'}
            className="ml-auto text-zinc-600 transition-colors hover:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500 space-y-1">
            <p className="font-mono break-all text-zinc-400">{result.title}</p>
            {result.infoHash && <p>Hash: <span className="font-mono text-zinc-500">{result.infoHash}</span></p>}
            {result.guid && <p>GUID: <span className="font-mono text-zinc-600 break-all">{result.guid}</span></p>}
            {result.grabs !== undefined && <p>Grabs: {result.grabs}</p>}
            {result.duplicateSources && result.duplicateSources.length > 0 && (
              <div className="pt-2">
                <p className="mb-1 text-zinc-400">Available from</p>
                <div className="flex flex-wrap gap-1.5">
                  {[{ indexerName: result.indexerName, seeders: result.seeders }, ...result.duplicateSources].map((source) => (
                    <span
                      key={`${source.indexerName}-${source.seeders}`}
                      className="rounded-full border border-zinc-800 px-2 py-0.5 text-zinc-500"
                    >
                      {source.indexerName} · {source.seeders.toLocaleString()} seeders
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
