'use client';

import Image from 'next/image';
import { MediaInfo } from '@/types';
import { ArrStatusBadge } from './ArrStatusBadge';
import { Star, Tv, Film, Calendar } from 'lucide-react';
import { TMDB_IMAGE_BASE } from '@/lib/tmdb/client';

interface Props {
  mediaInfo: MediaInfo;
}

export function MediaInfoCard({ mediaInfo }: Props) {
  const posterUrl = mediaInfo.posterPath
    ? `${TMDB_IMAGE_BASE}/w185${mediaInfo.posterPath}`
    : null;

  return (
    <div className="flex gap-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
      {/* Poster */}
      {posterUrl && (
        <div className="shrink-0">
          <Image
            src={posterUrl}
            alt={mediaInfo.title}
            width={80}
            height={120}
            className="rounded-lg object-cover"
          />
        </div>
      )}

      {/* Info */}
      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-white leading-tight">
            {mediaInfo.title}
            {mediaInfo.year && (
              <span className="ml-2 text-zinc-400 font-normal text-base">
                ({mediaInfo.year})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {mediaInfo.contentType === 'tv' ? (
              <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-600/15 px-2 py-0.5 rounded-full border border-blue-600/30">
                <Tv size={10} /> TV
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-600/15 px-2 py-0.5 rounded-full border border-purple-600/30">
                <Film size={10} /> Movie
              </span>
            )}
            {mediaInfo.rating !== undefined && mediaInfo.rating > 0 && (
              <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-600/15 px-2 py-0.5 rounded-full border border-yellow-600/30">
                <Star size={10} /> {mediaInfo.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Genres */}
        {mediaInfo.genres && mediaInfo.genres.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {mediaInfo.genres.slice(0, 4).map((g) => (
              <span key={g} className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* TV metadata */}
        {mediaInfo.contentType === 'tv' && mediaInfo.seasons && (
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <Calendar size={11} /> {mediaInfo.seasons} season{mediaInfo.seasons !== 1 ? 's' : ''}
            </span>
            {mediaInfo.episodeCount && (
              <span>{mediaInfo.episodeCount} episodes</span>
            )}
            {mediaInfo.status && (
              <span className={mediaInfo.status === 'Ended' ? 'text-zinc-500' : 'text-green-500'}>
                {mediaInfo.status}
              </span>
            )}
          </div>
        )}

        {/* Arr status */}
        <div className="mt-auto">
          <ArrStatusBadge mediaInfo={mediaInfo} />
        </div>
      </div>

      {/* Overview */}
      {mediaInfo.overview && (
        <p className="hidden md:block text-xs text-zinc-400 leading-relaxed line-clamp-4 max-w-md">
          {mediaInfo.overview}
        </p>
      )}
    </div>
  );
}
