'use client';

import { I } from './icons';
import { ContentType } from '@/types';

interface Stats {
  trackersUp: number;
  trackersTotal: number;
  results: number;
  freeleech: number;
  elapsed: number;
}

interface Props {
  query: string;
  onQuery: (q: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  contentType: ContentType;
  onContentType: (t: ContentType) => void;
  stats: Stats;
}

export function Topbar({ query, onQuery, onSearch, isSearching, contentType, onContentType, stats }: Props) {
  return (
    <header className="ts-topbar">
      <div className="ts-search">
        <span className="ts-search-icon" aria-hidden="true">{I.search}</span>
        <input
          className="ts-search-input"
          aria-label="Search movies and shows"
          placeholder="Search movies, shows, anime… e.g. 'Dune Part Two 2024' or 'Breaking Bad S03E07'"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
        />
        <div className="ts-type-seg" role="group" aria-label="Content type">
          {(['auto', 'movie', 'tv'] as const).map((t) => {
            const ct = t === 'auto' ? 'unknown' : t;
            const active = (ct === contentType) || (t === 'auto' && contentType === 'unknown');
            return (
              <button
                key={t}
                type="button"
                className={active ? 'is-on' : ''}
                aria-pressed={active}
                onClick={() => onContentType(ct)}
              >
                {t === 'auto' ? 'Auto' : t === 'movie' ? 'Movie' : 'TV'}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="ts-search-btn"
          onClick={onSearch}
          disabled={!query.trim() || isSearching}
        >
          {isSearching
            ? <span className="ts-spin">{I.spin}</span>
            : I.search}
          {isSearching ? 'Searching…' : 'Search'}
          <kbd>↵</kbd>
        </button>
      </div>

      <div className="ts-top-stats" role="status" aria-live="polite">
        <div className="ts-stat">
          <div className="ts-stat-dot" style={{ background: '#10b981' }} />
          <div className="ts-stat-val">
            {stats.trackersUp}<span>/{stats.trackersTotal}</span>
          </div>
          <div className="ts-stat-lbl">trackers</div>
        </div>
        <div className="ts-stat">
          <div className="ts-stat-dot" style={{ background: '#14b8a6' }} />
          <div className="ts-stat-val">{stats.results}</div>
          <div className="ts-stat-lbl">results</div>
        </div>
        <div className="ts-stat">
          <div className="ts-stat-dot" style={{ background: '#f59e0b' }} />
          <div className="ts-stat-val">{stats.freeleech}</div>
          <div className="ts-stat-lbl">freeleech</div>
        </div>
        {stats.trackersTotal > 0 && (
          <div className="ts-stat">
            <div className="ts-stat-val">
              {stats.elapsed.toFixed(1)}<span>s</span>
            </div>
            <div className="ts-stat-lbl">elapsed</div>
          </div>
        )}
      </div>
    </header>
  );
}
