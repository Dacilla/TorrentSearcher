'use client';

import { TorrentResult, KNOWN_GOOD_GROUPS } from '@/types';
import { SortKey } from '@/hooks/useFilters';
import { scoreTorrent } from '@/lib/results/scoring';
import { I, RES_BG, SRC_CLR } from './icons';
import { fmtBytes, fmtDate, fmtNum } from './helpers';

const COLS = [
  { k: 'score'   as SortKey, label: 'Score',   w: '44px'              },
  { k: 'title'   as SortKey, label: 'Release', w: 'minmax(0, 1fr)'    },
  { k: 'tags'    as const,   label: 'Quality', w: '140px', nosort: true },
  { k: 'size'    as SortKey, label: 'Size',    w: '64px'              },
  { k: 'seeders' as SortKey, label: 'Seed',    w: '56px'              },
  { k: 'leechers'as SortKey, label: 'Leech',   w: '44px'             },
  { k: 'date'    as SortKey, label: 'Age',     w: '52px'              },
  { k: 'indexer' as SortKey, label: 'Tracker', w: '96px'             },
] as const;

const COL_WIDTHS = COLS.map((c) => c.w).join(' ');

interface Props {
  results: TorrentResult[];
  sort: { key: SortKey; dir: 'asc' | 'desc' };
  setSort: (key: SortKey) => void;
  selected: string | null;
  setSelected: (id: string) => void;
  density: 'comfy' | 'compact' | 'dense';
}

export function ResultsTable({ results, sort, setSort, selected, setSelected, density }: Props) {
  const bestId = results.length > 0
    ? results.reduce((best, r) => scoreTorrent(r) > scoreTorrent(best) ? r : best, results[0]).id
    : null;

  const handleSort = (k: string) => {
    if (COLS.find((c) => c.k === k && 'nosort' in c && c.nosort)) return;
    setSort(k as SortKey);
  };

  if (results.length === 0) {
    return (
      <div className="ts-table">
        <div className="ts-table-empty">
          <div className="ts-table-empty-icon">{I.search}</div>
          <div style={{ fontWeight: 600, color: 'var(--fg-1)' }}>No results</div>
          <div style={{ fontSize: 12 }}>Search above or adjust filters</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`ts-table ts-table-${density}`}>
      <div className="ts-thead" style={{ gridTemplateColumns: COL_WIDTHS }}>
        {COLS.map((c) => (
          <button
            key={c.k}
            className={`ts-th${sort.key === c.k ? ' is-active' : ''}`}
            onClick={() => handleSort(c.k)}
          >
            {c.label}
            {sort.key === c.k && (
              <span className="ts-th-arrow">{sort.dir === 'desc' ? '↓' : '↑'}</span>
            )}
          </button>
        ))}
      </div>
      <div className="ts-tbody">
        {results.map((r) => {
          const score = Math.min(100, scoreTorrent(r));
          const ri = r.releaseInfo;
          const group = ri.releaseGroup ?? '';
          const isKnown = KNOWN_GOOD_GROUPS.has(group);
          const isBest = r.id === bestId;
          const resBg = RES_BG[ri.resolution] ?? '#71717a';
          const srcClr = SRC_CLR[ri.source] ?? '#71717a';

          return (
            <div
              key={r.id}
              role="row"
              tabIndex={0}
              className={[
                'ts-row',
                selected === r.id ? 'is-selected' : '',
                isBest ? 'is-best' : '',
              ].filter(Boolean).join(' ')}
              style={{ gridTemplateColumns: COL_WIDTHS }}
              onClick={() => setSelected(r.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(r.id);
                }
              }}
            >
              {/* Score */}
              <div className="ts-c-score">
                <div
                  className="ts-score-ring"
                  style={{ '--v': score } as React.CSSProperties}
                >
                  <span>{score}</span>
                </div>
              </div>

              {/* Title */}
              <div className="ts-c-title">
                <div className="ts-c-title-line">
                  {isBest && (
                    <span className="ts-best-pill">{I.flame}Best</span>
                  )}
                  {ri.isFreeleech && <span className="ts-fl-pill">FL</span>}
                  <span className="ts-c-title-text">{r.title}</span>
                </div>
                <div className="ts-c-title-meta">
                  {group && (
                    <span className="ts-c-group" data-known={isKnown ? '1' : '0'}>
                      {group}
                    </span>
                  )}
                  {(r.duplicateSources?.length ?? 0) > 0 && (
                    <span className="ts-c-dups">
                      {I.layers} {(r.duplicateSources?.length ?? 0) + 1} sources
                    </span>
                  )}
                  {r.grabs != null && (
                    <span className="ts-c-grabs">↓ {fmtNum(r.grabs)} grabs</span>
                  )}
                </div>
              </div>

              {/* Quality tags */}
              <div className="ts-c-tags">
                <span
                  className="ts-tag ts-tag-res"
                  style={{ '--c': resBg } as React.CSSProperties}
                >
                  {ri.resolution}
                </span>
                <span
                  className="ts-tag ts-tag-src"
                  style={{ '--c': srcClr } as React.CSSProperties}
                >
                  {ri.source}
                </span>
                <span className="ts-tag ts-tag-codec">{ri.codec}</span>
                {ri.hdr && <span className="ts-tag ts-tag-hdr">HDR</span>}
                {ri.dolbyVision && <span className="ts-tag ts-tag-dv">DV</span>}
              </div>

              {/* Size */}
              <div className="ts-c-size">{fmtBytes(r.size)}</div>

              {/* Seeders */}
              <div className="ts-c-seed">
                <div className="ts-seed-bar">
                  <div
                    className="ts-seed-bar-fill"
                    style={{ width: `${Math.min(100, r.seeders / 30)}%` }}
                  />
                </div>
                <span>{fmtNum(r.seeders)}</span>
              </div>

              {/* Leechers */}
              <div className="ts-c-leech">{fmtNum(r.leechers)}</div>

              {/* Age */}
              <div className="ts-c-date">{fmtDate(r.publishDate)}</div>

              {/* Indexer */}
              <div className="ts-c-indexer">{r.indexerName}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
