'use client';

import { TorrentResult, ResultFilters, Resolution, VideoCodec, Source, KNOWN_GOOD_GROUPS } from '@/types';
import { I, RES_BG, SRC_CLR } from './icons';

interface CountItem { v: string; n: number }

export interface FilterCounts {
  resolutions: CountItem[];
  sources: CountItem[];
  codecs: CountItem[];
  freeleech: number;
  hdr: number;
  known: number;
  sizeHist: number[];
}

export function computeFilterCounts(results: TorrentResult[]): FilterCounts {
  const resCounts: Record<string, number> = {};
  const srcCounts: Record<string, number> = {};
  const codCounts: Record<string, number> = {};
  let flCount = 0, hdrCount = 0, knownCount = 0;
  const sizeHist = Array.from({ length: 20 }, () => 0);

  for (const r of results) {
    const res = r.releaseInfo.resolution;
    const src = r.releaseInfo.source;
    const cod = r.releaseInfo.codec;
    if (res !== 'unknown') resCounts[res] = (resCounts[res] ?? 0) + 1;
    if (src !== 'unknown') srcCounts[src] = (srcCounts[src] ?? 0) + 1;
    if (cod !== 'unknown') codCounts[cod] = (codCounts[cod] ?? 0) + 1;
    if (r.releaseInfo.isFreeleech) flCount++;
    if (r.releaseInfo.hdr || r.releaseInfo.dolbyVision) hdrCount++;
    if (KNOWN_GOOD_GROUPS.has(r.releaseInfo.releaseGroup ?? '')) knownCount++;
    const gb = r.size / (1024 * 1024 * 1024);
    const bucket = Math.min(19, Math.floor(gb / 3));
    sizeHist[bucket]++;
  }

  const toItems = (obj: Record<string, number>): CountItem[] =>
    Object.entries(obj).map(([v, n]) => ({ v, n })).sort((a, b) => b.n - a.n);

  return {
    resolutions: toItems(resCounts),
    sources: toItems(srcCounts),
    codecs: toItems(codCounts),
    freeleech: flCount,
    hdr: hdrCount,
    known: knownCount,
    sizeHist,
  };
}

interface Props {
  filters: ResultFilters;
  setFilters: (fn: (f: ResultFilters) => ResultFilters) => void;
  counts: FilterCounts;
  onReset: () => void;
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

interface GroupProps {
  label: string;
  items: CountItem[];
  active: string[];
  onToggle: (v: string) => void;
  accent?: Record<string, string>;
}

function FilterGroup({ label, items, active, onToggle, accent }: GroupProps) {
  if (items.length === 0) return null;
  return (
    <div className="ts-fg">
      <div className="ts-fg-head">
        <span>{label}</span>
        <span className="ts-fg-count">{items.length}</span>
      </div>
      <div className="ts-fg-list">
        {items.map(({ v, n }) => {
          const on = active.includes(v);
          return (
            <button
              key={v}
              className={`ts-fg-row${on ? ' is-on' : ''}`}
              onClick={() => onToggle(v)}
            >
              <span className="ts-fg-check">{on ? I.check : null}</span>
              <span className="ts-fg-name">
                {accent && (
                  <span
                    className="ts-fg-swatch"
                    style={{ background: accent[v] ?? '#71717a' }}
                  />
                )}
                {v}
              </span>
              <span className="ts-fg-num">{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterRail({ filters, setFilters, counts, onReset }: Props) {
  return (
    <aside className="ts-filters">
      <div className="ts-filters-head">
        <span className="ts-filters-title">{I.filter} Filters</span>
        <button className="ts-linkbtn" onClick={onReset}>Reset</button>
      </div>

      {/* Min seeders */}
      <div className="ts-fg">
        <div className="ts-fg-head">
          <span>Min seeders</span>
          <span className="ts-fg-count">{filters.minSeeders}</span>
        </div>
        <input
          type="range"
          min="0"
          max="500"
          step="10"
          value={filters.minSeeders}
          onChange={(e) =>
            setFilters((f) => ({ ...f, minSeeders: Number(e.target.value) }))
          }
          className="ts-range"
        />
        <div className="ts-range-ticks">
          <span>0</span><span>100</span><span>250</span><span>500+</span>
        </div>
      </div>

      <FilterGroup
        label="Resolution"
        items={counts.resolutions}
        active={filters.resolutions}
        onToggle={(v) => setFilters((f) => ({ ...f, resolutions: toggle(f.resolutions, v as Resolution) }))}
        accent={RES_BG}
      />
      <FilterGroup
        label="Source"
        items={counts.sources}
        active={filters.sources}
        onToggle={(v) => setFilters((f) => ({ ...f, sources: toggle(f.sources, v as Source) }))}
        accent={SRC_CLR}
      />
      <FilterGroup
        label="Codec"
        items={counts.codecs}
        active={filters.codecs}
        onToggle={(v) => setFilters((f) => ({ ...f, codecs: toggle(f.codecs, v as VideoCodec) }))}
      />

      {/* Special filters */}
      <div className="ts-fg">
        <div className="ts-fg-head"><span>Special</span></div>
        <label className="ts-fg-check-row">
          <input
            type="checkbox"
            checked={filters.freeleechOnly}
            onChange={() => setFilters((f) => ({ ...f, freeleechOnly: !f.freeleechOnly }))}
          />
          <span style={{ flex: 1 }}>Freeleech only</span>
          <span className="ts-fg-num ts-pill-fl">{counts.freeleech}</span>
        </label>
        <label className="ts-fg-check-row">
          <input
            type="checkbox"
            checked={filters.hdrOnly}
            onChange={() => setFilters((f) => ({ ...f, hdrOnly: !f.hdrOnly }))}
          />
          <span style={{ flex: 1 }}>HDR / Dolby Vision</span>
          <span className="ts-fg-num">{counts.hdr}</span>
        </label>
        <label className="ts-fg-check-row">
          <input
            type="checkbox"
            checked={filters.knownGroupOnly}
            onChange={() => setFilters((f) => ({ ...f, knownGroupOnly: !f.knownGroupOnly }))}
          />
          <span style={{ flex: 1 }}>Trusted groups</span>
          <span className="ts-fg-num">{counts.known}</span>
        </label>
      </div>

      {/* Size distribution */}
      {counts.sizeHist.some((h) => h > 0) && (
        <div className="ts-fg">
          <div className="ts-fg-head"><span>Distribution</span></div>
          <div className="ts-hist">
            {counts.sizeHist.map((h, idx) => {
              const bucketKey = `size-hist-${idx}`;
              return (
                <div
                  key={bucketKey}
                className="ts-hist-bar"
                style={{ height: `${6 + h * 0.6}px` }}
                title={`${h} results`}
                />
              );
            })}
          </div>
          <div className="ts-hist-axis">
            <span>&lt;1GB</span><span>10GB</span><span>50GB+</span>
          </div>
        </div>
      )}
    </aside>
  );
}
