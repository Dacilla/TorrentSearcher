'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrInfo, ArrStatus, MediaInfo } from '@/types';
import { CheckCircle, AlertCircle, Circle, Plus, Loader2 } from 'lucide-react';

interface Props {
  mediaInfo: MediaInfo;
}

function statusLabel(info: ArrInfo, contentType: 'tv' | 'movie'): string {
  switch (info.status) {
    case 'monitored':
      return contentType === 'tv'
        ? info.missingEpisodes
          ? `In Sonarr (${info.missingEpisodes} missing)`
          : 'In Sonarr ✓'
        : 'In Radarr ✓';
    case 'unmonitored':
      return contentType === 'tv' ? 'In Sonarr (unmonitored)' : 'In Radarr (unmonitored)';
    case 'not-in-library':
      return contentType === 'tv' ? 'Not in Sonarr' : 'Not in Radarr';
    case 'error':
      return 'Arr unavailable';
    default:
      return '';
  }
}

function statusVariant(status: ArrStatus): string {
  switch (status) {
    case 'monitored': return 'bg-green-600/20 text-green-400 border-green-600/40';
    case 'unmonitored': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40';
    case 'not-in-library': return 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40';
    case 'error': return 'bg-red-600/20 text-red-400 border-red-600/40';
    default: return 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40';
  }
}

export function ArrStatusBadge({ mediaInfo }: Props) {
  const [arrInfo, setArrInfo] = useState<ArrInfo | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setArrInfo(null);
    setError(null);
    setConfirming(false);
    const isTv = mediaInfo.contentType === 'tv';

    if (isTv && mediaInfo.tvdbId) {
      fetch(`/api/sonarr/status?tvdbId=${mediaInfo.tvdbId}`)
        .then((r) => r.json())
        .then((d) => setArrInfo(d as ArrInfo))
        .catch(() => setArrInfo({ status: 'error' }));
    } else if (!isTv && mediaInfo.tmdbId) {
      fetch(`/api/radarr/status?tmdbId=${mediaInfo.tmdbId}`)
        .then((r) => r.json())
        .then((d) => setArrInfo(d as ArrInfo))
        .catch(() => setArrInfo({ status: 'error' }));
    }
  }, [mediaInfo]);

  const handleAdd = async () => {
    setAdding(true);
    setError(null);
    try {
      const isTv = mediaInfo.contentType === 'tv';
      const endpoint = isTv ? '/api/sonarr/add' : '/api/radarr/add';
      const body = isTv
        ? { tvdbId: mediaInfo.tvdbId }
        : { tmdbId: mediaInfo.tmdbId };

      const csrfRes = await fetch('/api/security/csrf', { cache: 'no-store' });
      if (!csrfRes.ok) throw new Error('Could not prepare protected write.');
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(body),
      }).then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Add failed (${res.status})`);
        }
      });
      setArrInfo({ status: 'monitored' });
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add failed.');
    } finally {
      setAdding(false);
    }
  };

  if (!arrInfo) {
    return (
      <Badge className="bg-zinc-700/40 text-zinc-500 border-zinc-600/40 gap-1">
        <Loader2 size={10} className="animate-spin" /> Checking…
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${statusVariant(arrInfo.status)} gap-1`}>
        {arrInfo.status === 'monitored' && <CheckCircle size={11} />}
        {arrInfo.status === 'unmonitored' && <AlertCircle size={11} />}
        {(arrInfo.status === 'not-in-library' || arrInfo.status === 'error') && <Circle size={11} />}
        {statusLabel(arrInfo, mediaInfo.contentType === 'tv' ? 'tv' : 'movie')}
      </Badge>

      {arrInfo.status === 'not-in-library' && (
        confirming ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs" aria-live="polite">
            <span className="text-zinc-400">
              Add to {mediaInfo.contentType === 'tv' ? 'Sonarr' : 'Radarr'}?
            </span>
            <Button
              size="xs"
              variant="outline"
              className="h-6 border-zinc-700"
              onClick={handleAdd}
              disabled={adding}
            >
              {adding ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
              Confirm
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="h-6 text-zinc-500"
              onClick={() => setConfirming(false)}
              disabled={adding}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs border-zinc-700 hover:border-zinc-500"
            onClick={() => setConfirming(true)}
            disabled={adding}
          >
            <Plus size={10} />
            Add
          </Button>
        )
      )}

      {error && (
        <span className="text-xs text-red-400" aria-live="polite">
          {error}
        </span>
      )}
    </div>
  );
}
