'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MediaInfo, ArrInfo } from '@/types';
import { TMDB_IMAGE_BASE } from '@/lib/tmdb/client';
import { useArrInfo } from '@/hooks/useArrInfo';
import { I } from './icons';

interface Props {
  media: MediaInfo;
}

function arrDotColor(status?: ArrInfo['status']): string {
  if (status === 'monitored') return '#10b981';
  if (status === 'unmonitored') return '#f59e0b';
  if (status === 'missing') return '#f59e0b';
  if (status === 'error') return '#ef4444';
  return '#71717a';
}

function arrLabel(info: ArrInfo, isTv: boolean): string {
  switch (info.status) {
    case 'monitored': return `In ${isTv ? 'Sonarr' : 'Radarr'} ✓`;
    case 'unmonitored': return `In ${isTv ? 'Sonarr' : 'Radarr'} (unmonitored)`;
    case 'not-in-library': return `Not in ${isTv ? 'Sonarr' : 'Radarr'}`;
    case 'error': return 'Service unavailable';
    default: return '—';
  }
}

function posterWords(title: string): string[] {
  return title.toUpperCase().split(/\s+/).slice(0, 3);
}

export function MediaPanel({ media }: Props) {
  const { arrInfo, setArrInfo } = useArrInfo(media);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const isTv = media.contentType === 'tv';
  const posterUrl = media.posterPath ? `${TMDB_IMAGE_BASE}/w185${media.posterPath}` : null;
  const words = posterWords(media.title);

  const handleAdd = async () => {
    setAdding(true);
    setAddError(null);
    try {
      const endpoint = isTv ? '/api/sonarr/add' : '/api/radarr/add';
      const body = isTv ? { tvdbId: media.tvdbId } : { tmdbId: media.tmdbId };
      const csrfRes = await fetch('/api/security/csrf', { cache: 'no-store' });
      if (!csrfRes.ok) throw new Error('Could not prepare write.');
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(d?.error ?? `Add failed (${res.status})`);
      }
      setArrInfo({ status: 'monitored' });
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Add failed.');
    } finally {
      setAdding(false);
    }
  };

  const titleWords = posterWords(media.title);
  const mainWord = titleWords[0] ?? '';
  const subWords = titleWords.slice(1).join(' ');

  return (
    <section className="ts-media">
      {/* Poster */}
      <div
        className="ts-poster"
        style={{
          background: posterUrl
            ? undefined
            : `linear-gradient(135deg, oklch(0.38 0.12 220) 0%, oklch(0.22 0.08 260) 100%)`,
        }}
      >
        {posterUrl ? (
          <Image src={posterUrl} alt={media.title} fill sizes="(max-width: 768px) 100vw, 300px" style={{ objectFit: 'cover' }} />
        ) : null}
        <div className="ts-poster-chrome">
          <div className="ts-poster-stripes" />
          <div className="ts-poster-title">{mainWord}</div>
          {subWords && <div className="ts-poster-sub">{subWords}</div>}
          <div className="ts-poster-foot">
            {media.year} · TMDB {media.tmdbId}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="ts-media-body">
        <div className="ts-media-head">
          <div>
            <div className="ts-media-kicker">
              <span className="ts-kicker-pill" data-kind={media.contentType}>
                {isTv ? I.tv : I.film}
                {isTv ? 'TV Series' : 'Movie'}
              </span>
              <span className="ts-kicker-dot">·</span>
              <span>{media.year ?? '—'}</span>
              {media.rating !== undefined && media.rating > 0 && (
                <>
                  <span className="ts-kicker-dot">·</span>
                  <span className="ts-rating">{I.star} {media.rating.toFixed(1)}</span>
                </>
              )}
            </div>
            <h1 className="ts-media-title">
              {media.title} {media.year && <span>({media.year})</span>}
            </h1>
            {media.genres && media.genres.length > 0 && (
              <div className="ts-media-genres">
                {media.genres.slice(0, 5).map((g) => (
                  <span key={g} className="ts-chip">{g}</span>
                ))}
              </div>
            )}
          </div>

          {/* Arr actions */}
          <div className="ts-media-arr">
            {arrInfo && arrInfo.status !== 'loading' && (
              <div className="ts-arr-status">
                <span className="ts-arr-dot" style={{ background: arrDotColor(arrInfo.status) }} />
                <span>{arrLabel(arrInfo, isTv)}</span>
              </div>
            )}
            {arrInfo?.status === 'not-in-library' && (
              <button
                className="ts-btn ts-btn-primary"
                onClick={handleAdd}
                disabled={adding}
              >
                {I.plus} Add to {isTv ? 'Sonarr' : 'Radarr'}
              </button>
            )}
            {addError && (
              <span style={{ fontSize: 12, color: 'var(--danger)' }}>{addError}</span>
            )}
            <div className="ts-arr-meta">
              {media.imdbId && (
                <div><span>IMDb</span><code>{media.imdbId}</code></div>
              )}
              <div><span>TMDB</span><code>{media.tmdbId}</code></div>
            </div>
          </div>
        </div>

        {media.overview && (
          <p className="ts-media-overview">{media.overview}</p>
        )}
      </div>
    </section>
  );
}
